import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * Hash de senha com scrypt (node:crypto), sem dependência nativa.
 *
 * Formato: scrypt$<N>$<r>$<p>$<salt>$<hash>, tudo base64url.
 * Os parâmetros ficam no próprio hash para poder endurecer sem quebrar
 * as senhas já gravadas — a verificação lê os parâmetros de cada senha.
 */
const N = 16384
const R = 8
const P = 1
const TAMANHO = 64

const scryptAsync = promisify(scrypt) as (
  senha: string | Buffer, salt: string | Buffer, keylen: number, options: { N: number; r: number; p: number },
) => Promise<Buffer>

export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(senha.normalize('NFKC'), salt, TAMANHO, { N, r: R, p: P })
  return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('$')
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const partes = guardado.split('$')
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false

  const n = Number(partes[1])
  const r = Number(partes[2])
  const p = Number(partes[3])
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false

  const salt = Buffer.from(partes[4], 'base64url')
  const esperado = Buffer.from(partes[5], 'base64url')
  if (salt.length === 0 || esperado.length === 0) return false

  try {
    const calculado = await scryptAsync(senha.normalize('NFKC'), salt, esperado.length, { N: n, r, p })
    return timingSafeEqual(calculado, esperado)
  } catch {
    return false
  }
}
