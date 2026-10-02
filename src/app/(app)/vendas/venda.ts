// Rótulos e tipos compartilhados pelas telas de vendas. Sem 'use client' nem servidor: importável dos dois lados.

export type Pagamento = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'FIADO'

export const ROTULO_PAGAMENTO: Record<Pagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  FIADO: 'Fiado',
}

export const OPCOES_PAGAMENTO = (Object.keys(ROTULO_PAGAMENTO) as Pagamento[]).map((valor) => ({
  valor,
  label: ROTULO_PAGAMENTO[valor],
}))

export type ProdutoPdv = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  unit: string
  salePrice: number
  stock: number
  trackStock: boolean
  categoria: string | null
}

export type ClientePdv = { id: string; name: string; phone: string | null; criadoEm: number }
