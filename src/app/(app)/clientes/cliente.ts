// Tipos e regras de CPF/telefone sem dependência de servidor: usados pela tela e pelo serviço.

export type ClienteLinha = {
  id: string
  name: string
  phone: string | null
  document: string | null
  birthDate: string | null
  notes: string | null
  totalComprado: number
  compras: number
  /** Já formatada no servidor, para o fuso do servidor e do navegador não divergirem na hidratação. */
  ultimaCompra: string | null
  fiadoAberto: number
  vendasOuFiado: number
}

export const soDigitos = (texto: string | null | undefined) => (texto ?? '').replace(/\D/g, '')

export function cpfValido(texto: string): boolean {
  const cpf = soDigitos(texto)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (base: string) => {
    const soma = [...base].reduce((n, d, i) => n + Number(d) * (base.length + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(cpf.slice(0, 9)) === Number(cpf[9]) && digito(cpf.slice(0, 10)) === Number(cpf[10])
}

/** Telefone brasileiro com DDD: fixo tem 10 dígitos, celular 11. */
export const telefoneValido = (texto: string) => [10, 11].includes(soDigitos(texto).length)

export function mascararCpf(texto: string | null | undefined): string {
  const d = soDigitos(texto).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function mascararTelefone(texto: string | null | undefined): string {
  const d = soDigitos(texto).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Nascimento é guardado à meia-noite UTC; ler em UTC evita mostrar o dia anterior. */
export const dataIso = (d: Date | null) =>
  d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null

export function dataNascimento(iso: string | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function idade(iso: string | null, hoje = new Date()): number | null {
  if (!iso) return null
  const [a, m, d] = iso.split('-').map(Number)
  let anos = hoje.getFullYear() - a
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--
  return anos
}

/** Fuso fixo da loja: no servidor da Vercel o relógio é UTC e a venda das 22h viraria o dia seguinte. */
export const dataCurta = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })

export const dataHora = (d: Date) =>
  d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
