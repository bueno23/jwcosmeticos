'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { Prisma } from '@/generated/prisma'
import { abrirCaixa, fecharCaixa, movimentarCaixa } from '@/lib/services/caixa'
import { money } from '@/lib/format'
import { ehNumero, paraNumero } from '@/lib/num'
import type { EstadoCaixa } from './tipos'

const valor = (rotulo: string, aceitaZero: boolean) =>
  z.string().trim()
    .min(1, `Informe ${rotulo}`)
    .refine((v) => ehNumero(v) && (aceitaZero ? paraNumero(v) >= 0 : paraNumero(v) > 0), 'Valor inválido')
    .transform(paraNumero)

const schemaAbertura = z.object({
  valor: valor('o valor inicial', true),
  observacao: z.string().trim().max(200, 'Observação muito longa'),
})

const schemaMovimento = z.object({
  tipo: z.enum(['SANGRIA', 'SUPRIMENTO']),
  valor: valor('o valor', false),
  motivo: z.string().trim().min(3, 'Informe o motivo').max(200, 'Motivo muito longo'),
})

const schemaFechamento = z.object({
  contado: valor('o valor contado', true),
  motivo: z.string().trim().max(200, 'Motivo muito longo'),
})

function errosDoZod(e: ZodError): EstadoCaixa {
  const erros: Record<string, string> = {}
  for (const issue of e.issues) {
    const chave = String(issue.path[0] ?? '')
    if (chave && !erros[chave]) erros[chave] = issue.message
  }
  return { ok: false, mensagem: 'Revise os campos destacados.', erros }
}

async function executar(passo: () => Promise<string>): Promise<EstadoCaixa> {
  try {
    const mensagem = await passo()
    revalidatePath('/financeiro/caixa')
    revalidatePath('/')
    return { ok: true, mensagem }
  } catch (e) {
    if (e instanceof ZodError) return errosDoZod(e)
    if (e instanceof Prisma.PrismaClientKnownRequestError) throw e
    if (e instanceof Error) return { ok: false, mensagem: e.message }
    throw e
  }
}

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? '')

export async function abrirCaixaAction(_estado: EstadoCaixa, formData: FormData): Promise<EstadoCaixa> {
  return executar(async () => {
    const dados = schemaAbertura.parse({ valor: texto(formData, 'valor'), observacao: texto(formData, 'observacao') })
    await abrirCaixa(dados.valor, dados.observacao || null)
    return `Caixa aberto com ${money(dados.valor)}.`
  })
}

export async function movimentarCaixaAction(_estado: EstadoCaixa, formData: FormData): Promise<EstadoCaixa> {
  return executar(async () => {
    const dados = schemaMovimento.parse({
      tipo: texto(formData, 'tipo'),
      valor: texto(formData, 'valor'),
      motivo: texto(formData, 'motivo'),
    })
    const r = await movimentarCaixa(dados.tipo, dados.valor, dados.motivo)
    const rotulo = dados.tipo === 'SANGRIA' ? 'Sangria' : 'Suprimento'
    return `${rotulo} de ${money(dados.valor)} registrado. Saldo esperado: ${money(r.esperado)}.`
  })
}

export async function fecharCaixaAction(_estado: EstadoCaixa, formData: FormData): Promise<EstadoCaixa> {
  return executar(async () => {
    const dados = schemaFechamento.parse({ contado: texto(formData, 'contado'), motivo: texto(formData, 'motivo') })
    const r = await fecharCaixa(dados.contado, dados.motivo || null)
    if (r.diferenca === 0) return 'Caixa fechado sem diferença.'
    return `Caixa fechado com ${r.diferenca > 0 ? 'sobra' : 'falta'} de ${money(Math.abs(r.diferenca))}.`
  })
}
