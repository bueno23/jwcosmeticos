// Tipos e conversões compartilhados entre a página de lista e a ficha do produto.
// Não leva 'use client': os componentes de cliente importam só os tipos, com `import type`.

export type ProdutoLinha = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  brand: string | null
  description: string | null
  unit: string
  costPrice: number
  salePrice: number
  stock: number
  minStock: number
  trackStock: boolean
  active: boolean
  categoria: { id: string; name: string; color: string } | null
  fornecedor: { id: string; nome: string } | null
}

export type Opcao = { valor: string; label: string }

type Entrada = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  brand: string | null
  description: string | null
  unit: string
  costPrice: { toString(): string }
  salePrice: { toString(): string }
  stock: number
  minStock: number
  trackStock: boolean
  active: boolean
  category: { id: string; name: string; color: string } | null
  supplier: { id: string; legalName: string; tradeName: string | null } | null
}

/**
 * Prisma devolve Decimal, que não atravessa a fronteira do Server Component.
 * Converter para number aqui evita a surpresa em toda página com tabela editável.
 */
export function paraLinha(p: Entrada): ProdutoLinha {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    brand: p.brand,
    description: p.description,
    unit: p.unit,
    costPrice: Number(p.costPrice),
    salePrice: Number(p.salePrice),
    stock: p.stock,
    minStock: p.minStock,
    trackStock: p.trackStock,
    active: p.active,
    categoria: p.category ? { id: p.category.id, name: p.category.name, color: p.category.color } : null,
    fornecedor: p.supplier ? { id: p.supplier.id, nome: p.supplier.tradeName || p.supplier.legalName } : null,
  }
}

/** O operador não recebe o custo nem no payload do cliente, não basta esconder a coluna. */
export function semCusto(p: ProdutoLinha): ProdutoLinha {
  return { ...p, costPrice: 0 }
}
