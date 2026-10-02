import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Boxes, Building2, Mail, MapPin, Phone, Receipt, ShoppingBag, User } from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StockBadge } from '@/components/ui/stock-badge'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { podeEditarCadastros, podeVerCusto, podeVerFinanceiro } from '@/lib/auth/papeis'
import { mascararCnpj } from '@/lib/cnpj'
import { dataLonga, hora, money, number } from '@/lib/format'
import { getFornecedor } from '@/lib/services/fornecedores'
import { AcoesFornecedor } from '../acoes-fornecedor'
import { paraDados } from '../fornecedor'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

function Dado({ icone: Icone, rotulo, children }: { icone: React.ElementType; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icone size={15} className="mt-0.5 shrink-0 text-texto-3" />
      <div className="min-w-0">
        <div className="text-[12px] text-texto-3">{rotulo}</div>
        <div className="mt-0.5 break-words text-[13.5px]">{children}</div>
      </div>
    </div>
  )
}

export default async function FornecedorPage({ params }: Props) {
  const { id } = await params
  const { role } = await usuarioObrigatorio()
  const verCusto = podeVerCusto(role)
  const verFinanceiro = podeVerFinanceiro(role)

  const ficha = await getFornecedor(id, { comFinanceiro: verFinanceiro })
  if (!ficha) notFound()

  const { fornecedor: f, produtos, compras, resumoCompras, contas, vinculos } = ficha
  const nome = f.tradeName || f.legalName
  const hoje = new Date()
  const totalAberto = contas.reduce((n, c) => n + Number(c.amount), 0)

  return (
    <div className="space-y-5">
      <Link
        href="/fornecedores"
        className="inline-flex items-center gap-1.5 text-[13px] text-texto-2 transition-colors hover:text-dourado"
      >
        <ArrowLeft size={14} />
        Fornecedores
      </Link>

      <PageHeader
        titulo={nome}
        descricao={[f.tradeName ? f.legalName : null, mascararCnpj(f.document) || 'CNPJ não informado'].filter(Boolean).join(' · ')}
        acao={podeEditarCadastros(role) && (
          <AcoesFornecedor
            fornecedor={paraDados(f)}
            alvo={{ id: f.id, nome, produtos: vinculos.produtos, contas: vinculos.contas }}
          />
        )}
      />

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${verFinanceiro ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        <Card className="p-5">
          <div className="text-sm text-texto-2">Produtos fornecidos</div>
          <div className="num mt-3 text-[26px] font-bold leading-none">{number(produtos.length)}</div>
          <div className="mt-3 text-[12.5px] text-texto-3">{number(produtos.filter((p) => p.active).length)} ativos</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-texto-2">Entradas registradas</div>
          <div className="num mt-3 text-[26px] font-bold leading-none">{number(resumoCompras.entradas)}</div>
          <div className="mt-3 text-[12.5px] text-texto-3">{number(resumoCompras.unidades)} unidades recebidas</div>
        </Card>
        {verCusto && (
          <Card className="p-5">
            <div className="text-sm text-texto-2">Total comprado</div>
            <div className="num mt-3 text-[26px] font-bold leading-none">{money(resumoCompras.total)}</div>
            <div className="mt-3 text-[12.5px] text-texto-3">soma das entradas</div>
          </Card>
        )}
        <Card className="p-5">
          <div className="text-sm text-texto-2">Última compra</div>
          <div className="mt-3 text-[20px] font-bold leading-tight">
            {resumoCompras.ultima ? dataLonga(resumoCompras.ultima) : '—'}
          </div>
          <div className="mt-3 text-[12.5px] text-texto-3">{resumoCompras.ultima ? 'data da entrada mais recente' : 'nenhuma entrada ainda'}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader titulo="Produtos fornecidos" icone={Boxes} />
            {produtos.length === 0 ? (
              <EmptyState titulo="Nenhum produto" descricao="Escolha este fornecedor no cadastro do produto para ligá-los." />
            ) : (
              <ul className="divide-y divide-borda">
                {produtos.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.category?.color ?? '#71717A' }} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/estoque/produtos/${p.id}`} className="text-[13.5px] font-medium hover:text-dourado">
                        {p.name}
                      </Link>
                      {!p.active && <span className="ml-2 rounded bg-superficie-2 px-1.5 py-0.5 text-[11px] text-texto-3">inativo</span>}
                      <div className="text-[12px] text-texto-3">
                        {[p.sku, p.category?.name].filter(Boolean).join(' · ') || 'sem categoria'}
                        {verCusto && <> · custo <span className="num">{money(p.costPrice)}</span></>}
                      </div>
                    </div>
                    {p.trackStock ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="num text-[13px] font-semibold">
                          {number(p.stock)} <span className="text-[11.5px] font-normal text-texto-3">{p.unit}</span>
                        </span>
                        <StockBadge estoque={p.stock} minimo={p.minStock} />
                      </div>
                    ) : (
                      <span className="shrink-0 text-[12.5px] text-texto-3">sem controle</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader titulo="Histórico de compras" icone={ShoppingBag} />
            {compras.length === 0 ? (
              <EmptyState titulo="Nenhuma compra" descricao="As entradas de estoque dos produtos deste fornecedor aparecem aqui." />
            ) : (
              <ul className="divide-y divide-borda">
                {compras.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/estoque/produtos/${c.product.id}`} className="text-[13.5px] font-medium hover:text-dourado">
                        {c.product.name}
                      </Link>
                      <div className="text-[12px] text-texto-3">
                        {dataLonga(c.createdAt)} {hora(c.createdAt)}
                        {c.user && ` · ${c.user.name}`}
                        {c.origin && ` · ${c.origin}`}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num text-[13.5px] font-semibold text-positivo">
                        +{number(c.quantity)} <span className="text-[11.5px] font-normal text-texto-3">{c.product.unit}</span>
                      </div>
                      {verCusto && c.unitCost !== null && (
                        <div className="num text-[11.5px] text-texto-3">
                          {money(c.unitCost)} un · {money(c.totalCost ?? Number(c.unitCost) * c.quantity)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-borda px-5 py-3 text-[12px] text-texto-3">
              Mostra as entradas dos produtos que hoje estão ligados a este fornecedor{compras.length === 50 ? ' (últimas 50)' : ''}.
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader titulo="Dados do fornecedor" icone={Building2} />
            <dl className="grid gap-4 p-5">
              <Dado icone={Building2} rotulo="Razão social">{f.legalName}</Dado>
              <Dado icone={Building2} rotulo="CNPJ"><span className="num">{mascararCnpj(f.document) || '—'}</span></Dado>
              <Dado icone={User} rotulo="Contato">{f.contactName ?? '—'}</Dado>
              <Dado icone={Phone} rotulo="Telefone">{f.phone ?? '—'}</Dado>
              <Dado icone={Mail} rotulo="E-mail">
                {f.email ? <a href={`mailto:${f.email}`} className="hover:text-dourado">{f.email}</a> : '—'}
              </Dado>
              <Dado icone={MapPin} rotulo="Endereço">{f.address ?? '—'}</Dado>
            </dl>
          </Card>

          {verFinanceiro && (
            <Card>
              <CardHeader titulo="Contas a pagar em aberto" icone={Receipt} />
              {contas.length === 0 ? (
                <EmptyState titulo="Nada em aberto" descricao="Nenhuma conta pendente com este fornecedor." />
              ) : (
                <>
                  <ul className="divide-y divide-borda">
                    {contas.map((c) => {
                      const vencida = c.status === 'VENCIDA' || c.dueDate < hoje
                      return (
                        <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px]">{c.description}</div>
                            <div className={`text-[12px] ${vencida ? 'text-negativo' : 'text-texto-3'}`}>
                              {vencida ? 'venceu em ' : 'vence em '}{dataLonga(c.dueDate)}
                            </div>
                          </div>
                          <span className="num shrink-0 text-[13.5px] font-semibold">{money(c.amount)}</span>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="flex justify-between border-t border-borda px-5 py-3 text-[13px]">
                    <span className="text-texto-2">Total em aberto</span>
                    <span className="num font-bold text-laranja">{money(totalAberto)}</span>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
