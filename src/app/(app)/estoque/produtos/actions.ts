'use server'

import { revalidatePath } from 'next/cache'
import { ZodError, z } from 'zod'
import { Prisma } from '@/generated/prisma'
import { ehNumero, paraNumero } from '@/lib/num'
import {
  alternarStatusProduto, atualizarProduto, criarProduto, type DadosProduto,
} from '@/lib/services/produtos'

export type EstadoFormulario = {
  ok: boolean
  mensagem?: string
  erros?: Record<string, string>
}

const dinheiro = (rotulo: string) =>
  z.string().trim()
    .min(1, `Informe ${rotulo}`)
    .refine((v) => ehNumero(v) && paraNumero(v) >= 0, `${rotulo} inválido`)
    .transform(paraNumero)

const inteiro = (rotulo: string) =>
  z.string().trim()
    .refine(
      (v) => v === '' || (ehNumero(v) && Number.isInteger(paraNumero(v)) && paraNumero(v) >= 0),
      `${rotulo} inválido`,
    )
    .transform((v) => (v === '' ? 0 : paraNumero(v)))

const textoOpcional = z.string().trim().max(200).optional()

const schemaProduto = z.object({
  name: z.string().trim().min(2, 'Informe o nome do produto').max(120, 'Nome muito longo'),
  unit: z.string().trim().min(1, 'Informe a unidade').max(10),
  sku: z.string().trim().max(40, 'SKU muito longo').optional(),
  barcode: textoOpcional,
  brand: textoOpcional,
  description: z.string().trim().max(600, 'Descrição muito longa').optional(),
  categoryId: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  costPrice: dinheiro('o custo'),
  salePrice: dinheiro('o preço de venda'),
  minStock: inteiro('o estoque mínimo'),
  estoqueInicial: inteiro('o estoque inicial'),
  trackStock: z.boolean(),
  active: z.boolean(),
})

function errosDoZod(e: unknown): Record<string, string> {
  const campos: Record<string, string> = {}
  if (e instanceof ZodError) {
    for (const issue of e.issues) {
      const chave = String(issue.path[0] ?? '')
      if (chave && !campos[chave]) campos[chave] = issue.message
    }
  }
  return campos
}

function mensagemDoPrisma(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return 'Já existe um produto com este SKU.'
    if (e.code === 'P2025') return 'Produto não encontrado.'
  }
  return null
}

function paraFormulario(fd: FormData): DadosProduto {
  const v = schemaProduto.parse({
    name: fd.get('name') ?? '',
    unit: fd.get('unit') ?? '',
    sku: fd.get('sku') ?? '',
    barcode: fd.get('barcode') ?? '',
    brand: fd.get('brand') ?? '',
    description: fd.get('description') ?? '',
    categoryId: fd.get('categoryId') ?? '',
    supplierId: fd.get('supplierId') ?? '',
    costPrice: fd.get('costPrice') ?? '',
    salePrice: fd.get('salePrice') ?? '',
    minStock: fd.get('minStock') ?? '',
    estoqueInicial: fd.get('estoqueInicial') ?? '',
    trackStock: fd.get('trackStock') === 'on',
    active: fd.get('active') === 'on',
  })

  const vazioParaNull = (s: string | undefined) => {
    const t = s?.trim()
    return t ? t : null
  }

  return {
    ...v,
    sku: vazioParaNull(v.sku),
    barcode: vazioParaNull(v.barcode),
    brand: vazioParaNull(v.brand),
    description: vazioParaNull(v.description),
    categoryId: vazioParaNull(v.categoryId),
    supplierId: vazioParaNull(v.supplierId),
  }
}

export async function salvarProduto(
  _estado: EstadoFormulario, formData: FormData,
): Promise<EstadoFormulario> {
  const id = String(formData.get('id') ?? '')

  let dados: DadosProduto
  try {
    dados = paraFormulario(formData)
  } catch (e) {
    if (e instanceof ZodError) {
      return { ok: false, mensagem: 'Revise os campos destacados.', erros: errosDoZod(e) }
    }
    throw e
  }

  try {
    if (id) await atualizarProduto(id, dados)
    else await criarProduto(dados)
  } catch (e) {
    const mensagem = mensagemDoPrisma(e)
    if (mensagem) return { ok: false, mensagem, erros: id ? {} : { sku: mensagem } }
    throw e
  }

  revalidatePath('/estoque/produtos')
  revalidatePath('/estoque/categorias')
  return { ok: true, mensagem: id ? 'Produto atualizado.' : 'Produto cadastrado.' }
}

export async function alternarStatus(id: string, ativo: boolean): Promise<EstadoFormulario> {
  try {
    await alternarStatusProduto(id, ativo)
  } catch (e) {
    const mensagem = mensagemDoPrisma(e)
    if (mensagem) return { ok: false, mensagem }
    throw e
  }

  revalidatePath('/estoque/produtos')
  return { ok: true, mensagem: ativo ? 'Produto reativado.' : 'Produto desativado.' }
}
