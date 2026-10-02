import type { Role } from '@/generated/prisma'

/**
 * Regras de papel. A regra do projeto: o operador não vê custo, lucro,
 * relatório nem financeiro, e não mexe no estoque.
 *
 * DONO e GERENTE veem o negócio inteiro; só o DONO entra em configuração.
 */
export function podeVerCusto(role: Role): boolean {
  return role !== 'OPERADOR'
}

export function podeVerFinanceiro(role: Role): boolean {
  return role === 'DONO' || role === 'GERENTE'
}

export function podeVerRelatorios(role: Role): boolean {
  return role === 'DONO' || role === 'GERENTE'
}

/** Entrada, ajuste e inventário mudam o estoque e gravam movimento. */
export function podeGerenciarEstoque(role: Role): boolean {
  return role !== 'OPERADOR'
}

export function podeEditarCadastros(role: Role): boolean {
  return role === 'DONO' || role === 'GERENTE'
}

export function podeConfigurar(role: Role): boolean {
  return role === 'DONO'
}

export const ROTULO_PAPEL: Record<Role, string> = {
  DONO: 'Dono',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
}
