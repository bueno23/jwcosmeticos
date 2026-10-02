'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { ErroDePermissao, ErroDeSessao } from '@/lib/auth/dal'
import { cnpjValido, limparCnpj } from '@/lib/cnpj'
import {
  ErroDeCadastro, removerFornecedor, salvarFornecedor, type DadosFornecedor,
} from '@/lib/services/fornecedores'
import type { EstadoFormulario } from '@/app/(app)/estoque/produtos/actions'

export type { EstadoFormulario }

const opcional = (max: number, rotulo: string) =>
  z.string().trim().max(max, `${rotulo} muito longo`)

const schemaFornecedor = z.object({
  legalName: z.string().trim().min(2, 'Informe a razão social').max(120, 'Razão social muito longa'),
  tradeName: opcional(120, 'Nome fantasia'),
  document: z.string().trim()
    .refine((v) => v === '' || cnpjValido(v), 'CNPJ inválido: confira os números digitados'),
  phone: z.string().trim()
    .refine((v) => v === '' || /^\d{10,11}$/.test(v.replace(/\D/g, '')), 'Telefone deve ter DDD e 8 ou 9 dígitos'),
  email: z.string().trim().max(120, 'E-mail muito longo')
    .refine((v) => v === '' || z.email().safeParse(v).success, 'E-mail inválido'),
  address: opcional(200, 'Endereço'),
  contactName: opcional(80, 'Nome do contato'),
})

function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '')
  return d.length === 11
    ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
}

function paraDados(fd: FormData): DadosFornecedor {
  const v = schemaFornecedor.parse({
    legalName: fd.get('legalName') ?? '',
    tradeName: fd.get('tradeName') ?? '',
    document: fd.get('document') ?? '',
    phone: fd.get('phone') ?? '',
    email: fd.get('email') ?? '',
    address: fd.get('address') ?? '',
    contactName: fd.get('contactName') ?? '',
  })
  const ouNull = (s: string) => (s ? s : null)

  return {
    legalName: v.legalName,
    tradeName: ouNull(v.tradeName),
    document: v.document ? limparCnpj(v.document) : null,
    phone: v.phone ? formatarTelefone(v.phone) : null,
    email: v.email ? v.email.toLowerCase() : null,
    address: ouNull(v.address),
    contactName: ouNull(v.contactName),
  }
}

function erroConhecido(e: unknown): string | null {
  if (e instanceof ErroDeCadastro || e instanceof ErroDePermissao || e instanceof ErroDeSessao) return e.message
  return null
}

export async function salvarFornecedorAction(
  _estado: EstadoFormulario, formData: FormData,
): Promise<EstadoFormulario> {
  const id = String(formData.get('id') ?? '')

  let dados: DadosFornecedor
  try {
    dados = paraDados(formData)
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

  let salvo: { id: string }
  try {
    salvo = await salvarFornecedor(id || null, dados)
  } catch (e) {
    const mensagem = erroConhecido(e)
    if (!mensagem) throw e
    const campo = e instanceof ErroDeCadastro ? e.campo : undefined
    return { ok: false, mensagem, erros: campo ? { [campo]: mensagem } : {} }
  }

  revalidatePath('/fornecedores')
  revalidatePath(`/fornecedores/${salvo.id}`)
  revalidatePath('/estoque/produtos')
  return { ok: true, mensagem: id ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.' }
}

export async function removerFornecedorAction(id: string): Promise<EstadoFormulario> {
  let resultado: Awaited<ReturnType<typeof removerFornecedor>>
  try {
    resultado = await removerFornecedor(id)
  } catch (e) {
    const mensagem = erroConhecido(e)
    if (mensagem) return { ok: false, mensagem }
    throw e
  }

  if (!resultado.removido) {
    const partes = [
      resultado.produtos > 0 && `${resultado.produtos} produto(s)`,
      resultado.contas > 0 && `${resultado.contas} conta(s) a pagar`,
    ].filter(Boolean)
    return { ok: false, mensagem: `Não dá para remover: o fornecedor tem ${partes.join(' e ')} vinculados.` }
  }

  revalidatePath('/fornecedores')
  return { ok: true, mensagem: 'Fornecedor removido.' }
}
