'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { Prisma } from '@/generated/prisma'
import { ErroDePermissao, ErroDeSessao } from '@/lib/auth/dal'
import { ehNumero, paraNumero } from '@/lib/num'
import {
  ErroDeLancamento, atualizarLancamento, criarLancamento, excluirLancamento,
  removerCategoriaFinanceira, salvarCategoriaFinanceira, type TipoLancamento,
} from '@/lib/services/lancamentos'
import { ehDiaValido } from './datas'

export type EstadoLancamento = {
  ok: boolean
  mensagem?: string
  erros?: Record<string, string>
}

export type EstadoCategoria = EstadoLancamento & { categoria?: { id: string; nome: string } }

const schemaTipo = z.enum(['despesa', 'receita'])

const schemaLancamento = z.object({
  descricao: z.string().trim().min(2, 'Descreva o lançamento').max(160, 'Descrição muito longa'),
  valor: z.string().trim()
    .min(1, 'Informe o valor')
    .refine(ehNumero, 'Valor inválido')
    .transform(paraNumero)
    .refine((v) => v > 0, 'O valor precisa ser maior que zero')
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use no máximo duas casas decimais'),
  dia: z.string().trim().min(1, 'Informe a data').refine(ehDiaValido, 'Data inválida'),
  categoriaId: z.string().trim().transform((v) => v || null),
})

const schemaNomeCategoria = z.string().trim().min(2, 'Informe o nome da categoria').max(60, 'Nome muito longo')

function errosDoZod(e: ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const issue of e.issues) {
    const chave = String(issue.path[0] ?? '')
    if (chave && !campos[chave]) campos[chave] = issue.message
  }
  return campos
}

/** Erros que a pessoa consegue entender e corrigir viram mensagem; o resto continua estourando. */
function mensagemConhecida(e: unknown): EstadoLancamento | null {
  if (e instanceof ErroDeLancamento) {
    return { ok: false, mensagem: e.message, erros: e.campo ? { [e.campo]: e.message } : {} }
  }
  if (e instanceof ErroDePermissao || e instanceof ErroDeSessao) return { ok: false, mensagem: e.message }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
    return { ok: false, mensagem: 'Registro não encontrado.' }
  }
  return null
}

function revalidar(tipo: TipoLancamento) {
  revalidatePath(tipo === 'despesa' ? '/financeiro/despesas' : '/financeiro/receitas')
  revalidatePath('/financeiro')
  revalidatePath('/')
}

export async function salvarLancamentoAction(
  _estado: EstadoLancamento, formData: FormData,
): Promise<EstadoLancamento> {
  const tipo = schemaTipo.parse(formData.get('tipo'))
  const id = String(formData.get('id') ?? '')

  let dados: z.infer<typeof schemaLancamento>
  try {
    dados = schemaLancamento.parse({
      descricao: formData.get('descricao') ?? '',
      valor: formData.get('valor') ?? '',
      dia: formData.get('dia') ?? '',
      categoriaId: formData.get('categoriaId') ?? '',
    })
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, mensagem: 'Revise os campos destacados.', erros: errosDoZod(e) }
    throw e
  }

  try {
    if (id) await atualizarLancamento(tipo, id, dados)
    else await criarLancamento(tipo, dados)
  } catch (e) {
    const conhecida = mensagemConhecida(e)
    if (conhecida) return conhecida
    throw e
  }

  revalidar(tipo)
  const nome = tipo === 'despesa' ? 'Despesa' : 'Receita'
  return { ok: true, mensagem: id ? `${nome} atualizada.` : `${nome} lançada.` }
}

export async function excluirLancamentoAction(tipo: TipoLancamento, id: string): Promise<EstadoLancamento> {
  const t = schemaTipo.parse(tipo)
  try {
    await excluirLancamento(t, z.string().min(1).parse(id))
  } catch (e) {
    const conhecida = mensagemConhecida(e)
    if (conhecida) return conhecida
    throw e
  }
  revalidar(t)
  return { ok: true, mensagem: t === 'despesa' ? 'Despesa excluída.' : 'Receita excluída.' }
}

export async function salvarCategoriaAction(
  tipo: TipoLancamento, id: string | null, nome: string,
): Promise<EstadoCategoria> {
  const t = schemaTipo.parse(tipo)
  const lido = schemaNomeCategoria.safeParse(nome)
  if (!lido.success) {
    const mensagem = lido.error.issues[0]?.message ?? 'Nome inválido'
    return { ok: false, mensagem, erros: { nome: mensagem } }
  }

  let categoria: { id: string; nome: string }
  try {
    categoria = await salvarCategoriaFinanceira(t, id, lido.data)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, mensagem: 'Já existe uma categoria com este nome.', erros: { nome: 'Nome já usado.' } }
    }
    const conhecida = mensagemConhecida(e)
    if (conhecida) return conhecida
    throw e
  }

  revalidar(t)
  return { ok: true, mensagem: id ? 'Categoria renomeada.' : 'Categoria criada.', categoria }
}

export async function removerCategoriaAction(tipo: TipoLancamento, id: string): Promise<EstadoLancamento> {
  const t = schemaTipo.parse(tipo)
  let semCategoria: number
  try {
    semCategoria = (await removerCategoriaFinanceira(t, id)).semCategoria
  } catch (e) {
    const conhecida = mensagemConhecida(e)
    if (conhecida) return conhecida
    throw e
  }

  revalidar(t)
  return {
    ok: true,
    mensagem: semCategoria > 0
      ? `Categoria removida. ${semCategoria} lançamento(s) ficaram sem categoria.`
      : 'Categoria removida.',
  }
}
