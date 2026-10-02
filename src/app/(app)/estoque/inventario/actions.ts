'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { Prisma } from '@/generated/prisma'
import { registrarInventario } from '@/lib/services/estoque'
import type { EstadoMovimento } from '@/app/(app)/estoque/entradas/actions'

export type { EstadoMovimento }

/** "id:quantidade" por produto; só o que o usuário preencheu chega aqui. */
const schema = z.object({
  itens: z.string().trim().min(1, 'Informe ao menos um produto'),
  motivo: z.string().trim().min(3, 'Informe o motivo da contagem').max(200, 'Motivo muito longo'),
})

function parseItens(texto: string): { productId: string; saldoContado: number }[] {
  return texto
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const [id, qtd] = parte.split(':')
      // Number('') é 0: sem o regex, "id:" vazio zeraria o estoque
      if (!id || !/^\d+$/.test(qtd?.trim() ?? '')) throw new Error('Contagem inválida.')
      return { productId: id, saldoContado: Number(qtd) }
    })
}

export async function registrarInventarioAction(
  _estado: EstadoMovimento, formData: FormData,
): Promise<EstadoMovimento> {
  let dados: z.infer<typeof schema>
  try {
    dados = schema.parse({
      itens: formData.get('itens') ?? '',
      motivo: formData.get('motivo') ?? '',
    })
  } catch (e) {
    if (e instanceof ZodError) {
      const erros: Record<string, string> = {}
      for (const issue of e.issues) {
        const chave = String(issue.path[0] ?? '')
        if (chave && !erros[chave]) erros[chave] = issue.message
      }
      return { ok: false, mensagem: 'Revise os campos destacados.', erros }
    }
    throw e
  }

  let itens: { productId: string; saldoContado: number }[]
  try {
    itens = parseItens(dados.itens)
  } catch {
    return { ok: false, mensagem: 'Contagem inválida. Recarregue a página e tente de novo.' }
  }

  try {
    const r = await registrarInventario(itens, dados.motivo)

    revalidatePath('/estoque/inventario')
    revalidatePath('/estoque/produtos')

    const detalhe = r.linhas.length
      ? r.linhas.map((l) => `${l.nome}: ${l.de} → ${l.para}`).join(' · ')
      : 'Nenhuma linha divergiu do sistema.'
    const ignorar = r.ignorados ? ` ${r.ignorados} produto(s) sem controle de estoque foram ignorados.` : ''

    return {
      ok: true,
      mensagem: `Contagem registrada. ${r.ajustados} ajuste(s) gravado(s), ${r.semDivergencia} conferido(s). ${detalhe}${ignorar}`,
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) throw e
    if (e instanceof Error) return { ok: false, mensagem: e.message }
    throw e
  }
}
