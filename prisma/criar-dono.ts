import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'
import { gerarHashSenha } from '../src/lib/auth/senha'

// Cria o dono (e a empresa, se não existir); nunca apaga nada, recusa se o e-mail já existe
const { DATABASE_URL, DONO_NOME, DONO_EMAIL, EMPRESA, ARQUIVO_SENHA, SENHA } = process.env
if (!DATABASE_URL || !DONO_NOME || !DONO_EMAIL || !EMPRESA || (!ARQUIVO_SENHA && !SENHA)) {
  throw new Error('Defina DATABASE_URL, DONO_NOME, DONO_EMAIL, EMPRESA e ARQUIVO_SENHA (ou SENHA)')
}

const schema = new URL(DATABASE_URL).searchParams.get('schema') ?? undefined
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }, { schema }),
})

async function main() {
  if (await prisma.user.findUnique({ where: { email: DONO_EMAIL! } })) throw new Error('Já existe usuário com este e-mail.')

  const senha = SENHA ?? randomBytes(9).toString('base64url')
  const company = (await prisma.company.findFirst({ where: { name: EMPRESA! } })) ?? (await prisma.company.create({ data: { name: EMPRESA! } }))
  await prisma.user.create({
    data: {
      companyId: company.id, name: DONO_NOME!, email: DONO_EMAIL!,
      passwordHash: await gerarHashSenha(senha), role: 'DONO',
    },
  })
  if (ARQUIVO_SENHA && !SENHA) writeFileSync(ARQUIVO_SENHA, `${DONO_EMAIL}\n${senha}\n`, { mode: 0o600 })
  console.log(`Criado: ${DONO_NOME} (DONO) em ${EMPRESA}`)
}

main().finally(() => prisma.$disconnect())
