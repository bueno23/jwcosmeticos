import { getCompanyId } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'

/** Empresa do usuário logado — os dados de apresentação dela moram aqui, não na sessão. */
export async function getEmpresa() {
  const companyId = await getCompanyId()
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new Error('Empresa do usuário não encontrada.')
  return company
}
