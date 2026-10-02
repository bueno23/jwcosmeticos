// Tipos compartilhados entre /estoque/entradas e /estoque/ajustes.
// Sem 'use client': os formulários importam só os tipos.

export type ProdutoEstoque = {
  id: string
  name: string
  sku: string | null
  unit: string
  stock: number
  minStock: number
  costPrice: number
  salePrice: number
}

type Entrada = {
  id: string
  name: string
  sku: string | null
  unit: string
  stock: number
  minStock: number
  costPrice: { toString(): string }
  salePrice: { toString(): string }
}

export function paraProdutoEstoque(p: Entrada): ProdutoEstoque {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    stock: p.stock,
    minStock: p.minStock,
    costPrice: Number(p.costPrice),
    salePrice: Number(p.salePrice),
  }
}

export type MovimentoLista = {
  id: string
  type: string
  quantity: number
  unitCost: number | null
  balance: number
  reason: string | null
  origin: string | null
  createdAt: Date
  produto: { name: string; unit: string }
  user: { name: string } | null
}

type EntradaMovimento = {
  id: string
  type: string
  quantity: number
  unitCost: { toString(): string } | null
  balance: number
  reason: string | null
  origin: string | null
  createdAt: Date
  product: { name: string; unit: string }
  user: { name: string } | null
}

export function paraMovimento(m: EntradaMovimento): MovimentoLista {
  return {
    id: m.id,
    type: m.type,
    quantity: m.quantity,
    unitCost: m.unitCost === null ? null : Number(m.unitCost),
    balance: m.balance,
    reason: m.reason,
    origin: m.origin,
    createdAt: m.createdAt,
    // montado na mão: repassar m.product inteiro vazaria Decimal para o client
    produto: { name: m.product.name, unit: m.product.unit },
    user: m.user ? { name: m.user.name } : null,
  }
}
