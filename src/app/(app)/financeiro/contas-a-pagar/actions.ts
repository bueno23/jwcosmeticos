'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { Prisma } from '@/generated/prisma'
import { ErroDePermissao, ErroDeSessao } from '@/lib/auth/dal'
import { ehNumero, paraNumero } from '@/lib/num'
import {
  ErroDeConta, atualizarContaAPagar, cancelarContaAPagar, criarContaAPagar, ehDia, pagarContaAPagar, reabrirContaAPagar,
} from '@/lib/services/contas-a-pagar'

export type EstadoFormulario = {
  ok: boolean
  mensagem?: string
  erros?: Record<string, string>
}

const ROTA = '/financeiro/contas-a-pagar'

const dia = (rotulo: string) =>
  z.string().trim().min(1, `Informe ${rotulo}`).refine(ehDia, `${rotulo} inválida`)

const schemaConta = z.object({
  description: z.string().trim().min(2, 'Descreva a conta').max(200, 'Descrição muito longa'),
  amount: z.string().trim()
    .min(1, 'Informe o valor')
    .refine((v) => ehNumero(v) && paraNumero(v) > 0, 'Valor inválido')
    .transform(paraNumero),
  vencimento: dia('a data de vencimento'),
  supplierId: z.string().trim().optional(),
})

function errosDoZod(e: ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const issue of e.issues) {
    const chave = String(issue.path[0] ?? '')
    if (chave && !campos[chave]) campos[chave] = issue.message
  }
  return campos
}

/** Regra de negócio violada volta como mensagem; erro de banco inesperado continua subindo. */
function mensagemDeErro(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.code === 'P2025' ? 'Conta não encontrada.' : null
  }
  if (e instanceof ErroDeConta || e instanceof ErroDePermissao || e instanceof ErroDeSessao) return e.message
  return null
}

export async function salvarConta(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const id = String(formData.get('id') ?? '')

  let dados: z.infer<typeof schemaConta>
  try {
    dados = schemaConta.parse({
      description: formData.get('description') ?? '',
      amount: formData.get('amount') ?? '',
      vencimento: formData.get('vencimento') ?? '',
      supplierId: formData.get('supplierId') ?? '',
    })
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, mensagem: 'Revise os campos destacados.', erros: errosDoZod(e) }
    throw e
  }

  const conta = { ...dados, supplierId: dados.supplierId || null }
  try {
    if (id) await atualizarContaAPagar(id, conta)
    else await criarContaAPagar(conta)
  } catch (e) {
    const mensagem = mensagemDeErro(e)
    if (mensagem) return { ok: false, mensagem }
    throw e
  }

  revalidatePath(ROTA)
  return { ok: true, mensagem: id ? 'Conta atualizada.' : 'Conta cadastrada.' }
}

async function executar(acao: () => Promise<unknown>, sucesso: string): Promise<EstadoFormulario> {
  try {
    await acao()
  } catch (e) {
    const mensagem = mensagemDeErro(e)
    if (mensagem) return { ok: false, mensagem }
    throw e
  }
  revalidatePath(ROTA)
  return { ok: true, mensagem: sucesso }
}

export async function pagarConta(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const id = String(formData.get('id') ?? '')
  const data = String(formData.get('dataPagamento') ?? '').trim()
  if (!ehDia(data)) return { ok: false, mensagem: 'Informe a data do pagamento.', erros: { dataPagamento: 'Data inválida' } }
  return executar(() => pagarContaAPagar(id, data), 'Conta marcada como paga.')
}

export async function reabrirConta(id: string): Promise<EstadoFormulario> {
  return executar(() => reabrirContaAPagar(String(id)), 'Conta reaberta.')
}

export async function cancelarConta(id: string): Promise<EstadoFormulario> {
  return executar(() => cancelarContaAPagar(String(id)), 'Conta cancelada.')
}
