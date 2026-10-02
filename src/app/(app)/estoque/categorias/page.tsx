import { usuarioObrigatorio } from '@/lib/auth/dal'
import { podeEditarCadastros } from '@/lib/auth/papeis'
import { listarCategorias } from '@/lib/services/produtos'
import { CategoriasTabela, type Categoria } from './categorias-tabela'

// Sem isso o Next gera a página estática e congela o resultado do primeiro build
export const dynamic = 'force-dynamic'

export default async function CategoriasPage() {
  const [{ role }, categorias] = await Promise.all([usuarioObrigatorio(), listarCategorias()])

  const linhas: Categoria[] = categorias.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    produtos: c._count.products,
  }))

  return <CategoriasTabela categorias={linhas} podeEditar={podeEditarCadastros(role)} />
}
