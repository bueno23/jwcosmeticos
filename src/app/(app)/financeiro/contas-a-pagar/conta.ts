// Tipos e conversão da conta a pagar; o cliente importa só os tipos, com `import type`.
import { diaEmSaoPaulo, somarDias } from '@/lib/services/contas-a-pagar'

export type Situacao = 'aberta' | 'vence-logo' | 'vencida' | 'paga' | 'cancelada'

export type ContaLinha = {
  id: string
  description: string
  amount: number
  /** "AAAA-MM-DD" no calendário de São Paulo. */
  vencimento: string
  pagamento: string | null
  situacao: Situacao
  /** Negativo quando já venceu. */
  dias: number
  fornecedor: { id: string; nome: string } | null
}

type Entrada = {
  id: string
  description: string
  amount: { toString(): string }
  dueDate: Date
  paidAt: Date | null
  status: 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA'
  supplier: { id: string; legalName: string; tradeName: string | null } | null
}

const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000)

export function paraConta(c: Entrada, hoje: string): ContaLinha {
  const vencimento = diaEmSaoPaulo(c.dueDate)
  const dias = diasEntre(hoje, vencimento)
  const situacao: Situacao =
    c.status === 'PAGA' ? 'paga'
      : c.status === 'CANCELADA' ? 'cancelada'
        : vencimento < hoje ? 'vencida'
          : vencimento <= somarDias(hoje, 7) ? 'vence-logo'
            : 'aberta'

  return {
    id: c.id,
    description: c.description,
    amount: Number(c.amount),
    vencimento,
    pagamento: c.paidAt ? diaEmSaoPaulo(c.paidAt) : null,
    situacao,
    dias,
    fornecedor: c.supplier ? { id: c.supplier.id, nome: c.supplier.tradeName || c.supplier.legalName } : null,
  }
}
