import type { PaymentMethod } from '@/generated/prisma'

// Fora do serviço para o Client Component importar sem puxar o Prisma para o navegador
export const FORMAS_PAGAMENTO: PaymentMethod[] = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'FIADO']

export const ROTULO_PAGAMENTO: Record<PaymentMethod, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  FIADO: 'Fiado',
}
