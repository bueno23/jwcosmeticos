'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { Prisma } from '@/generated/prisma'
import { registrarAjuste } from '@/lib/services/estoque'
import { ehNumero, paraNumero } from '@/lib/num'
import type { EstadoMovimento } from '@/app/(app)/estoque/entradas/actions'

export type { EstadoMovimento }

const schemaAjuste = z.object({
  productId: z.string().trim().min(1, 'Escolha o produto'),
  tipo: z.enum(['AJUSTE', 'PERDA']),
  quantidade: z.string().trim()
    .min(1, 'Informe a quantidade')
    .refine((v) => ehNumero(v) && Number.isInteger(paraNumero(v)) && paraNumero(v) >= 0, 'Quantidade inválida')
    .transform(paraNumero),
  motivo: z.string().trim().min(3, 'Informe o motivo').max(200, 'Motivo muito longo'),
})

export async function registrarAjusteAction(
  _estado: EstadoMovimento, formData: FormData,
): Promise<EstadoMovimento> {
  let dados: z.infer<typeof schemaAjuste>
  try {
    dados = schemaAjuste.parse({
      productId: formData.get('productId') ?? '',
      tipo: formData.get('tipo') ?? '',
      quantidade: formData.get('quantidade') ?? '',
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

  try {
    const r = await registrarAjuste({
      productId: dados.productId,
      tipo: dados.tipo,
      quantidade: dados.quantidade,
      motivo: dados.motivo,
    })

    const plural = (n: number) => (Math.abs(n) === 1 ? 'unidade' : 'unidades')
    // "Ajuste" e "Perda" concordam diferente: registrado / registrada
    const rotulo = dados.tipo === 'AJUSTE' ? 'Ajuste registrado' : 'Perda registrada'
    const detalhe = dados.tipo === 'AJUSTE'
      ? `Diferença de ${r.diferenca > 0 ? '+' : ''}${r.diferenca} ${plural(r.diferenca)}`
      : `Baixa de ${Math.abs(r.diferenca)} ${plural(r.diferenca)}`

    revalidatePath('/estoque/ajustes')
    revalidatePath('/estoque/produtos')

    return { ok: true, mensagem: `${rotulo}. Novo saldo: ${r.novoSaldo}. ${detalhe}.` }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) throw e
    if (e instanceof Error) return { ok: false, mensagem: e.message }
    throw e
  }
}
