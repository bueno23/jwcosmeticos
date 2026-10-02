'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ZodError, z } from 'zod'
import { ErroDePermissao, ErroDeSessao } from '@/lib/auth/dal'
import { ErroDeCliente, removerCliente, salvarCliente, type DadosCliente } from '@/lib/services/clientes'
import type { EstadoFormulario } from '@/app/(app)/estoque/produtos/actions'
import { dataIso } from './cliente'

export type { EstadoFormulario }

const opcional = (max: number, mensagem: string) =>
  z.string().trim().max(max, mensagem).transform((v) => v || null)

const schemaCliente = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cliente').max(120, 'Nome muito longo'),
  phone: opcional(30, 'Telefone muito longo'),
  document: opcional(20, 'CPF muito longo'),
  birthDate: z.string().trim()
    .refine((v) => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && dataIso(new Date(`${v}T00:00:00.000Z`)) === v), 'Data inválida')
    .refine((v) => v === '' || v >= '1900-01-01', 'Data inválida')
    .transform((v) => (v ? new Date(`${v}T00:00:00.000Z`) : null)),
  notes: opcional(600, 'Observação muito longa'),
})

function errosDoZod(e: ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const issue of e.issues) {
    const chave = String(issue.path[0] ?? '')
    if (chave && !campos[chave]) campos[chave] = issue.message
  }
  return campos
}

function erroEsperado(e: unknown): EstadoFormulario | null {
  if (e instanceof ErroDeCliente) return { ok: false, mensagem: e.message, erros: e.campo ? { [e.campo]: e.message } : {} }
  if (e instanceof ErroDePermissao || e instanceof ErroDeSessao) return { ok: false, mensagem: e.message }
  return null
}

function revalidar(id?: string) {
  revalidatePath('/clientes')
  if (id) revalidatePath(`/clientes/${id}`)
}

export async function salvarClienteAction(
  _estado: EstadoFormulario, formData: FormData,
): Promise<EstadoFormulario> {
  const id = String(formData.get('id') ?? '')

  let dados: DadosCliente
  try {
    dados = schemaCliente.parse({
      name: formData.get('name') ?? '',
      phone: formData.get('phone') ?? '',
      document: formData.get('document') ?? '',
      birthDate: formData.get('birthDate') ?? '',
      notes: formData.get('notes') ?? '',
    })
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, mensagem: 'Revise os campos destacados.', erros: errosDoZod(e) }
    throw e
  }

  let salvo: { id: string }
  try {
    salvo = await salvarCliente(id || null, dados)
  } catch (e) {
    const esperado = erroEsperado(e)
    if (esperado) return esperado
    throw e
  }

  revalidar(salvo.id)
  return { ok: true, mensagem: id ? 'Cliente atualizado.' : 'Cliente cadastrado.' }
}

export async function removerClienteAction(id: string, voltarParaLista = false): Promise<EstadoFormulario> {
  let nome: string
  try {
    nome = (await removerCliente(id)).nome
  } catch (e) {
    const esperado = erroEsperado(e)
    if (esperado) return esperado
    throw e
  }

  revalidar()
  // Da ficha, recarregar a própria página daria 404: o cliente acabou de sair
  if (voltarParaLista) redirect('/clientes')
  return { ok: true, mensagem: `${nome} removido do cadastro.` }
}
