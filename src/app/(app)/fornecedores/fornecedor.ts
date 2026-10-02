// Tipos da lista e da ficha; os componentes de cliente importam só com `import type`.

export type FornecedorDados = {
  id: string
  legalName: string
  tradeName: string | null
  document: string | null
  phone: string | null
  email: string | null
  address: string | null
  contactName: string | null
}

export type FornecedorLinha = FornecedorDados & {
  produtos: number
  /** Zerado para quem não vê financeiro, para não ir no payload. */
  contasAbertas: number
  valorAberto: number
}

export function paraDados(f: FornecedorDados): FornecedorDados {
  return {
    id: f.id,
    legalName: f.legalName,
    tradeName: f.tradeName,
    document: f.document,
    phone: f.phone,
    email: f.email,
    address: f.address,
    contactName: f.contactName,
  }
}
