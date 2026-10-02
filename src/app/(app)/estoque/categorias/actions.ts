'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { Prisma } from '@/generated/prisma'
import { removerCategoria, salvarCategoria } from '@/lib/services/produtos'
import type { EstadoFormulario } from '@/app/(app)/estoque/produtos/actions'

export type { EstadoFormulario }

const schemaCategoria = z.object({
  name: z.string().trim().min(2, 'Informe o nome da categoria').max(60, 'Nome muito longo'),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
})

export async function salvarCategoriaAction(
  _estado: EstadoFormulario, formData: FormData,
): Promise<EstadoFormulario> {
  const id = String(formData.get('id') ?? '')

  let dados: { name: string; color: string }
  try {
    dados = schemaCategoria.parse({
      name: formData.get('name') ?? '',
      color: formData.get('color') ?? '',
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
    await salvarCategoria(id || null, dados)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, mensagem: 'Já existe uma categoria com este nome.', erros: { name: 'Nome já usado.' } }
    }
    throw e
  }

  revalidatePath('/estoque/categorias')
  revalidatePath('/estoque/produtos')
  revalidatePath('/')
  return { ok: true, mensagem: id ? 'Categoria atualizada.' : 'Categoria criada.' }
}

export async function removerCategoriaAction(id: string): Promise<EstadoFormulario> {
  let desvinculados: number
  try {
    desvinculados = (await removerCategoria(id)).produtosSemCategoria
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, mensagem: 'Categoria não encontrada.' }
    }
    throw e
  }

  revalidatePath('/estoque/categorias')
  revalidatePath('/estoque/produtos')
  revalidatePath('/')
  return {
    ok: true,
    mensagem: desvinculados > 0
      ? `Categoria removida. ${desvinculados} produto(s) ficaram sem categoria.`
      : 'Categoria removida.',
  }
}
