import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@/generated/prisma'

// Uma instância só entre recargas do dev server
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const schemaDaUrl = () => new URL(process.env.DATABASE_URL ?? 'postgresql://x/x').searchParams.get('schema') ?? 'public'

/** Em SQL puro o adaptador não aplica o schema: qualificar a tabela com isto. */
export const tabela = (nome: string) => Prisma.raw(`"${schemaDaUrl()}"."${nome}"`)

/** Versão em texto para $queryRawUnsafe: em dev o client em cache recusa o Prisma.raw de outra camada do bundle. */
export const nomeTabela = (nome: string) => `"${schemaDaUrl()}"."${nome}"`

function createClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não configurada')

  const { hostname, searchParams } = new URL(url)
  const local = hostname === 'localhost' || hostname === '127.0.0.1'
  // O pg ignora ?schema=; sem passar ao adaptador as tabelas seriam buscadas no public
  const schema = searchParams.get('schema') ?? undefined
  const ssl = local ? undefined : { rejectUnauthorized: false }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url, ssl }, { schema }) })
}

export const prisma = globalForPrisma.prisma ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
