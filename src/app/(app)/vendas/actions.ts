'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ErroDePermissao, ErroDeSessao } from '@/lib/auth/dal'
import { ehNumero, paraNumero } from '@/lib/num'
import {
  cancelarVenda, finalizarVenda, listarClientesPdv,
  type ReciboVenda,
} from '@/lib/services/vendas'

export type EstadoVenda = { ok: true; venda: ReciboVenda } | { ok: false; mensagem: string }

const dinheiroOpcional = z.string().trim().refine((v) => v === '' || (ehNumero(v) && paraNumero(v) >= 0), 'inválido')

const schemaVenda = z.object({
  itens: z.array(z.object({
    productId: z.string().min(1),
    quantidade: z.number().int().positive().max(100000),
  })).min(1, 'O carrinho está vazio.').max(200),
  desconto: dinheiroOpcional,
  pagamento: z.enum(['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'FIADO']),
  recebido: dinheiroOpcional,
  customerId: z.string().nullable(),
  vencimento: z.string().nullable(),
})

export type EntradaVenda = z.input<typeof schemaVenda>

function erroEsperado(e: unknown): string | null {
  if (e instanceof ErroDePermissao || e instanceof ErroDeSessao) return e.message
  return null
}

function revalidarVendas() {
  for (const rota of ['/vendas/nova', '/vendas', '/vendas/cancelamentos', '/', '/financeiro/caixa', '/estoque/produtos', '/financeiro/contas-a-receber']) {
    revalidatePath(rota)
  }
}

export async function finalizarVendaAction(entrada: EntradaVenda): Promise<EstadoVenda> {
  const lido = schemaVenda.safeParse(entrada)
  if (!lido.success) {
    const campos = lido.error.issues.map((i) => i.path[0])
    const mensagem = campos.includes('desconto') ? 'Desconto inválido.'
      : campos.includes('recebido') ? 'Valor recebido inválido.'
      : (lido.error.issues[0]?.message ?? 'Venda inválida.')
    return { ok: false, mensagem }
  }
  const d = lido.data

  try {
    const r = await finalizarVenda({
      itens: d.itens,
      desconto: paraNumero(d.desconto),
      pagamento: d.pagamento,
      recebido: d.pagamento === 'DINHEIRO' ? (d.recebido === '' ? null : paraNumero(d.recebido)) : null,
      customerId: d.customerId || null,
      vencimento: d.pagamento === 'FIADO' ? d.vencimento : null,
    })
    if (r.ok) revalidarVendas()
    return r
  } catch (e) {
    const mensagem = erroEsperado(e)
    if (mensagem) return { ok: false, mensagem }
    throw e
  }
}

export async function cancelarVendaAction(id: string, motivo: string): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const r = await cancelarVenda(id, motivo)
    if (!r.ok) return r
    revalidarVendas()
    return { ok: true, mensagem: `Venda #${r.numero} cancelada.` }
  } catch (e) {
    const mensagem = erroEsperado(e)
    if (mensagem) return { ok: false, mensagem }
    throw e
  }
}

/** Depois de cadastrar um cliente no meio da venda, o PDV precisa da lista nova. */
export async function listarClientesPdvAction() {
  try {
    return await listarClientesPdv()
  } catch (e) {
    if (erroEsperado(e)) return []
    throw e
  }
}
