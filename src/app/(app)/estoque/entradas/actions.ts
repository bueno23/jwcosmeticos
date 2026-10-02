'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { Prisma } from '@/generated/prisma'
import { registrarEntrada } from '@/lib/services/estoque'
import { ehNumero, paraNumero } from '@/lib/num'

export type EstadoMovimento = {
  ok: boolean
  mensagem?: string
  erros?: Record<string, string>
  /** Números confirmados da regra 6, para o formulário mostrar o custo médio antes e depois. */
  custo?: { anterior: number; novo: number; mudou: boolean }
}

const dinheiro = (rotulo: string) =>
  z.string().trim()
    .min(1, `Informe ${rotulo}`)
    .refine((v) => ehNumero(v) && paraNumero(v) >= 0, `${rotulo} inválido`)
    .transform(paraNumero)

const quantidade = z.string().trim()
  .min(1, 'Informe a quantidade')
  .refine((v) => ehNumero(v) && Number.isInteger(paraNumero(v)) && paraNumero(v) > 0, 'Quantidade inválida')
  .transform(paraNumero)

const schemaEntrada = z.object({
  productId: z.string().trim().min(1, 'Escolha o produto'),
  quantidade,
  custoUnitario: dinheiro('o custo unitário'),
  supplierId: z.string().trim().optional(),
  nota: z.string().trim().max(60, 'Nota muito longa').optional(),
  motivo: z.string().trim().max(200, 'Motivo muito longo').optional(),
  gerarContaPagar: z.boolean(),
  descricaoConta: z.string().trim().max(200).optional(),
  vencimento: z.string().trim().optional(),
})

const vazioParaNull = (s: string | undefined) => (s?.trim() ? s.trim() : null)

export async function registrarEntradaAction(
  _estado: EstadoMovimento, formData: FormData,
): Promise<EstadoMovimento> {
  let dados: z.infer<typeof schemaEntrada>
  try {
    dados = schemaEntrada.parse({
      productId: formData.get('productId') ?? '',
      quantidade: formData.get('quantidade') ?? '',
      custoUnitario: formData.get('custoUnitario') ?? '',
      supplierId: formData.get('supplierId') ?? '',
      nota: formData.get('nota') ?? '',
      motivo: formData.get('motivo') ?? '',
      gerarContaPagar: formData.get('gerarContaPagar') === 'on',
      descricaoConta: formData.get('descricaoConta') ?? '',
      vencimento: formData.get('vencimento') ?? '',
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

  // A conta a pagar só faz sentido com vencimento; sem ele, o produto entra e pronto
  const vencimento = dados.gerarContaPagar && dados.vencimento ? new Date(`${dados.vencimento}T12:00:00-03:00`) : null
  if (dados.gerarContaPagar && !vencimento) {
    return { ok: false, mensagem: 'Informe o vencimento da conta a pagar.', erros: { vencimento: 'Informe a data' } }
  }

  try {
    const r = await registrarEntrada({
      productId: dados.productId,
      quantidade: dados.quantidade,
      custoUnitario: dados.custoUnitario,
      supplierId: vazioParaNull(dados.supplierId),
      nota: vazioParaNull(dados.nota),
      motivo: vazioParaNull(dados.motivo),
      gerarContaPagar: Boolean(vencimento),
      descricaoConta: vazioParaNull(dados.descricaoConta),
      vencimento,
    })

    revalidatePath('/estoque/entradas')
    revalidatePath('/estoque/produtos')
    revalidatePath('/financeiro/contas-a-pagar')

    return {
      ok: true,
      mensagem: `Entrada registrada. ${r.novoSaldo} em estoque.`,
      custo: { anterior: r.custoAnterior, novo: r.custoNovo, mudou: r.custoMudou },
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) throw e
    if (e instanceof Error) return { ok: false, mensagem: e.message }
    throw e
  }
}
