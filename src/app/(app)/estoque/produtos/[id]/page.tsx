import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, ArrowDownCircle, ArrowUpCircle, CalendarClock, Coins, Package, PencilRuler,
  ShoppingCart, Tag, TrendingUp, TriangleAlert, Undo2, Warehouse,
} from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StockBadge } from '@/components/ui/stock-badge'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { podeEditarCadastros, podeVerCusto } from '@/lib/auth/papeis'
import { dataLonga, money, number, percent } from '@/lib/format'
import { corMargem, margem, markup } from '@/lib/margem'
import { getGiroProduto, getProduto, listarCategorias, listarFornecedores } from '@/lib/services/produtos'
import { EditarProduto } from '../editar-produto'
import { paraLinha, type Opcao } from '../produto'

type Props = { params: Promise<{ id: string }> }

const MOVIMENTOS: Record<string, { rotulo: string; icone: React.ElementType; classe: string }> = {
  ENTRADA: { rotulo: 'Entrada', icone: ArrowUpCircle, classe: 'text-dourado bg-dourado/12' },
  SAIDA: { rotulo: 'Saída', icone: ArrowDownCircle, classe: 'text-negativo bg-negativo/12' },
  VENDA: { rotulo: 'Venda', icone: ShoppingCart, classe: 'text-positivo bg-positivo/12' },
  AJUSTE: { rotulo: 'Ajuste', icone: PencilRuler, classe: 'text-laranja bg-laranja/12' },
  CANCELAMENTO: { rotulo: 'Cancelamento', icone: Undo2, classe: 'text-texto-2 bg-superficie-2' },
  PERDA: { rotulo: 'Perda', icone: TriangleAlert, classe: 'text-negativo bg-negativo/12' },
}

function Dado({ icone: Icone, rotulo, children }: { icone: React.ElementType; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icone size={15} className="mt-0.5 shrink-0 text-texto-3" />
      <div className="min-w-0">
        <div className="text-[12px] text-texto-3">{rotulo}</div>
        <div className="mt-0.5 truncate text-[13.5px]">{children}</div>
      </div>
    </div>
  )
}

export default async function ProdutoPage({ params }: Props) {
  const { id } = await params
  const [{ role }, bruto, giro, categorias, fornecedores] = await Promise.all([
    usuarioObrigatorio(),
    getProduto(id),
    getGiroProduto(id),
    listarCategorias(),
    listarFornecedores(),
  ])

  if (!bruto) notFound()

  const verCusto = podeVerCusto(role)
  const p = paraLinha(bruto)
  const movimentos = bruto.movements
  const m = margem(p.costPrice, p.salePrice)
  const valorEmEstoque = p.stock * p.costPrice
  const duracao = giro.mediaDiaria > 0 ? p.stock / giro.mediaDiaria : null

  const opcoesCategorias: Opcao[] = categorias.map((c) => ({ valor: c.id, label: c.name }))
  const opcoesFornecedores: Opcao[] = fornecedores.map((f) => ({
    valor: f.id,
    label: f.tradeName || f.legalName,
  }))

  return (
    <div className="space-y-5">
      <Link
        href="/estoque/produtos"
        className="inline-flex items-center gap-1.5 text-[13px] text-texto-2 transition-colors hover:text-dourado"
      >
        <ArrowLeft size={14} />
        Produtos
      </Link>

      <PageHeader
        titulo={p.name}
        descricao={[p.brand, p.categoria?.name].filter(Boolean).join(' · ') || 'Produto sem categoria'}
        acao={podeEditarCadastros(role) && (
          <EditarProduto produto={p} categorias={opcoesCategorias} fornecedores={opcoesFornecedores} />
        )}
      />

      {!p.active && (
        <p className="rounded-lg border border-borda bg-superficie-2 px-4 py-2.5 text-[13px] text-texto-2">
          Produto inativo: aparece no histórico, mas não entra no PDV nem nos relatórios.
        </p>
      )}

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${verCusto ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dourado/12 text-dourado">
              <Tag size={19} />
            </span>
            <span className="text-sm text-texto-2">Preço de venda</span>
          </div>
          <div className="num mt-3 text-[26px] font-bold leading-none">{money(p.salePrice)}</div>
          <div className="mt-3 text-[12.5px] text-texto-3">
            por <span className="num">{p.unit}</span>
          </div>
        </Card>

        {verCusto && <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dourado/12 text-dourado">
              <Coins size={19} />
            </span>
            <span className="text-sm text-texto-2">Custo e margem</span>
          </div>
          <div className="num mt-3 text-[26px] font-bold leading-none">{money(p.costPrice)}</div>
          <div className={`mt-3 text-[12.5px] font-semibold ${corMargem(m)}`}>
            margem de {percent(m, 1)} · markup de {percent(markup(p.costPrice, p.salePrice), 1)}
          </div>
        </Card>}

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dourado/12 text-dourado">
              <Warehouse size={19} />
            </span>
            <span className="text-sm text-texto-2">Estoque</span>
          </div>
          {p.trackStock ? (
            <>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="num text-[26px] font-bold leading-none">{number(p.stock)}</span>
                <StockBadge estoque={p.stock} minimo={p.minStock} />
              </div>
              <div className="mt-3 text-[12.5px] text-texto-3">
                mínimo de {number(p.minStock)}{verCusto && ` · ${money(valorEmEstoque)} em compras`}
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 text-[26px] font-bold leading-none text-texto-3">—</div>
              <div className="mt-3 text-[12.5px] text-texto-3">não controla unidades</div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dourado/12 text-dourado">
              <TrendingUp size={19} />
            </span>
            <span className="text-sm text-texto-2">Giro em {giro.dias} dias</span>
          </div>
          <div className="num mt-3 text-[26px] font-bold leading-none">{number(giro.unidades)}</div>
          <div className="mt-3 text-[12.5px] text-texto-3">
            {giro.unidades === 0
              ? 'sem vendas no período'
              : `${number(giro.mediaDiaria)}/dia · ${duracao !== null ? `estoque dura ~${Math.round(duracao)} dias` : '—'}`}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader titulo="Histórico de estoque" icone={Package} />
          {movimentos.length === 0 ? (
            <EmptyState titulo="Nenhuma movimentação" descricao="O histórico começa na primeira entrada de mercadoria." />
          ) : (
            <ul className="divide-y divide-borda">
              {movimentos.map((mov) => {
                const info = MOVIMENTOS[mov.type] ?? { rotulo: mov.type, icone: Package, classe: 'text-texto-2 bg-superficie-2' }
                const Icone = info.icone
                const negativo = mov.quantity < 0
                return (
                  <li key={mov.id} className="flex items-start gap-3.5 px-5 py-3.5">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${info.classe}`}>
                      <Icone size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2.5">
                        <span className="text-[13.5px] font-medium">{info.rotulo}</span>
                        <span className="text-[12px] text-texto-3">
                          {dataLonga(mov.createdAt)}
                          {mov.user && ` · ${mov.user.name}`}
                        </span>
                      </div>
                      <div className="truncate text-[12.5px] text-texto-3">
                        {mov.reason ?? 'sem motivo informado'}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`num text-[13.5px] font-semibold ${negativo ? 'text-negativo' : 'text-positivo'}`}>
                        {negativo ? '' : '+'}{mov.quantity}
                      </div>
                      <div className="num text-[11.5px] text-texto-3">saldo {number(mov.balance)}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader titulo="Ficha do produto" icone={Package} />
          <dl className="grid gap-4 p-5">
            <Dado icone={Tag} rotulo="SKU">{p.sku ?? '—'}</Dado>
            <Dado icone={Package} rotulo="Código de barras">{p.barcode ?? '—'}</Dado>
            <Dado icone={Package} rotulo="Unidade">{p.unit}</Dado>
            <Dado icone={Tag} rotulo="Categoria">
              {p.categoria ? (
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.categoria.color }} />
                  {p.categoria.name}
                </span>
              ) : (
                'sem categoria'
              )}
            </Dado>
            <Dado icone={Coins} rotulo="Fornecedor">{p.fornecedor?.nome ?? '—'}</Dado>
            <Dado icone={CalendarClock} rotulo="Cadastrado em">{dataLonga(bruto.createdAt)}</Dado>
            <Dado icone={Package} rotulo="Entradas registradas">{number(giro.entradas)}</Dado>
            {p.description && (
              <div className="border-t border-borda pt-3.5">
                <div className="text-[12px] text-texto-3">Descrição</div>
                <p className="mt-1 text-[13px] leading-relaxed text-texto-2">{p.description}</p>
              </div>
            )}
          </dl>
        </Card>
      </div>
    </div>
  )
}
