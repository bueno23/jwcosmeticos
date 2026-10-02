'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Banknote, Check, CreditCard, HandCoins, Loader2, Minus, Plus, Printer, QrCode, Search,
  ShoppingCart, Trash2, UserPlus, Wallet,
} from 'lucide-react'
import { Botao, inputClass } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { money } from '@/lib/format'
import { ehNumero, paraNumero } from '@/lib/num'
import type { ReciboVenda } from '@/lib/services/vendas'
import { ClienteForm } from '@/app/(app)/clientes/cliente-form'
import { finalizarVendaAction, listarClientesPdvAction } from '../actions'
import { OPCOES_PAGAMENTO, ROTULO_PAGAMENTO, type ClientePdv, type Pagamento, type ProdutoPdv } from '../venda'
import { imprimirRecibo } from './recibo'

const ICONES: Record<Pagamento, React.ElementType> = {
  DINHEIRO: Banknote, PIX: QrCode, DEBITO: CreditCard, CREDITO: CreditCard, FIADO: HandCoins,
}

type ItemCarrinho = { productId: string; qtd: string }

const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const centavos = (n: number) => Math.round(n * 100)

export function Pdv({
  produtos, clientes: clientesIniciais, caixaAberto, vencimentoPadrao, empresa,
}: {
  produtos: ProdutoPdv[]
  clientes: ClientePdv[]
  caixaAberto: boolean
  vencimentoPadrao: string
  empresa: string
}) {
  const router = useRouter()
  const aviso = useToast()
  const buscaRef = useRef<HTMLInputElement>(null)
  const [enviando, iniciar] = useTransition()

  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [desconto, setDesconto] = useState('')
  const [pagamento, setPagamento] = useState<Pagamento>('DINHEIRO')
  const [recebido, setRecebido] = useState('')
  const [clientes, setClientes] = useState(clientesIniciais)
  const [customerId, setCustomerId] = useState('')
  const [vencimento, setVencimento] = useState(vencimentoPadrao)
  const [erro, setErro] = useState<string | null>(null)
  const [recibo, setRecibo] = useState<ReciboVenda | null>(null)
  const [novoCliente, setNovoCliente] = useState(false)

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])
  const categorias = useMemo(
    () => [...new Set(produtos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))].sort(),
    [produtos],
  )

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim())
    return produtos.filter((p) => {
      if (categoria && p.categoria !== categoria) return false
      if (!termo) return true
      return semAcento(p.name).includes(termo)
        || semAcento(p.sku ?? '').includes(termo)
        || (p.barcode ?? '').includes(busca.trim())
    })
  }, [produtos, busca, categoria])

  const disponivel = (p: ProdutoPdv) => !p.trackStock || p.stock > 0

  function adicionar(p: ProdutoPdv) {
    if (!disponivel(p)) {
      aviso(`${p.name} está sem estoque.`, 'erro')
      return
    }
    setErro(null)
    setCarrinho((atual) => {
      const item = atual.find((i) => i.productId === p.id)
      if (!item) return [...atual, { productId: p.id, qtd: '1' }]
      const proxima = (parseInt(item.qtd, 10) || 0) + 1
      if (p.trackStock && proxima > p.stock) {
        aviso(`Só há ${p.stock} ${p.unit} de ${p.name} em estoque.`, 'erro')
        return atual
      }
      return atual.map((i) => (i === item ? { ...i, qtd: String(proxima) } : i))
    })
  }

  function aoDigitarBusca(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const termo = busca.trim()
    if (!termo) return
    const exato = produtos.find((p) => p.barcode === termo || semAcento(p.sku ?? '') === semAcento(termo))
    const alvo = exato ?? (visiveis.length === 1 ? visiveis[0] : null)
    if (!alvo) {
      aviso(visiveis.length === 0 ? 'Nenhum produto encontrado.' : 'Mais de um produto na busca: toque no que deseja.', 'erro')
      return
    }
    adicionar(alvo)
    setBusca('')
  }

  function mudarQtd(id: string, qtd: string) {
    if (!/^\d*$/.test(qtd)) return
    setCarrinho((atual) => atual.map((i) => (i.productId === id ? { ...i, qtd } : i)))
  }

  function passo(id: string, delta: number) {
    const p = porId.get(id)
    setCarrinho((atual) => atual.map((i) => {
      if (i.productId !== id) return i
      const nova = Math.max(1, (parseInt(i.qtd, 10) || 0) + delta)
      if (p?.trackStock && nova > p.stock) return i
      return { ...i, qtd: String(nova) }
    }))
  }

  const linhas = carrinho.flatMap((i) => {
    const p = porId.get(i.productId)
    if (!p) return []
    const qtd = /^\d+$/.test(i.qtd) ? parseInt(i.qtd, 10) : 0
    const excede = p.trackStock && qtd > p.stock
    return [{ item: i, p, qtd, excede, total: centavos(p.salePrice) * qtd }]
  })

  const subtotal = linhas.reduce((n, l) => n + l.total, 0)
  const descontoValido = desconto.trim() === '' || (ehNumero(desconto) && paraNumero(desconto) >= 0)
  const descontoCent = descontoValido && desconto.trim() ? centavos(paraNumero(desconto)) : 0
  const descontoAlto = descontoCent > subtotal
  const total = Math.max(0, subtotal - descontoCent)
  const recebidoValido = ehNumero(recebido) && paraNumero(recebido) >= 0
  const recebidoCent = recebidoValido ? centavos(paraNumero(recebido)) : 0
  const troco = pagamento === 'DINHEIRO' ? recebidoCent - total : 0

  const problema = (() => {
    if (linhas.length === 0) return 'Adicione produtos ao carrinho.'
    if (linhas.some((l) => l.qtd <= 0)) return 'Há item com quantidade inválida.'
    const sem = linhas.find((l) => l.excede)
    if (sem) return `Estoque insuficiente: ${sem.p.name} (máx. ${sem.p.stock}).`
    if (!descontoValido) return 'Desconto inválido.'
    if (descontoAlto) return 'O desconto não pode passar do subtotal.'
    if (total <= 0) return 'O total precisa ser maior que zero.'
    if (pagamento === 'DINHEIRO' && (!recebidoValido || recebidoCent < total)) return 'Informe o valor recebido (não pode ser menor que o total).'
    if (pagamento === 'FIADO' && !customerId) return 'Escolha o cliente do fiado.'
    if (pagamento === 'FIADO' && !vencimento) return 'Informe o vencimento do fiado.'
    return null
  })()

  function limpar() {
    setCarrinho([])
    setDesconto('')
    setRecebido('')
    setCustomerId('')
    setVencimento(vencimentoPadrao)
    setErro(null)
  }

  function finalizar() {
    if (problema || enviando) return
    setErro(null)
    iniciar(async () => {
      const r = await finalizarVendaAction({
        itens: linhas.map((l) => ({ productId: l.p.id, quantidade: l.qtd })),
        desconto,
        pagamento,
        recebido,
        customerId: pagamento === 'FIADO' ? customerId : null,
        vencimento: pagamento === 'FIADO' ? vencimento : null,
      })
      if (!r.ok) {
        setErro(r.mensagem)
        router.refresh()
        return
      }
      limpar()
      setRecibo(r.venda)
    })
  }

  async function aoCadastrarCliente(mensagem: string) {
    const antes = new Set(clientes.map((c) => c.id))
    const lista = await listarClientesPdvAction()
    const novo = lista.filter((c) => !antes.has(c.id)).sort((a, b) => b.criadoEm - a.criadoEm)[0]
    setClientes(lista)
    if (novo) setCustomerId(novo.id)
    setNovoCliente(false)
    aviso(mensagem)
  }

  function novaVenda() {
    setRecibo(null)
    buscaRef.current?.focus()
  }

  const itensNoCarrinho = linhas.reduce((n, l) => n + l.qtd, 0)

  return (
    <div className="space-y-4">
      {!caixaAberto && (
        <div role="status" className="flex items-center gap-2.5 rounded-lg border border-laranja/50 bg-laranja/10 px-4 py-3 text-[13.5px] text-laranja">
          <AlertTriangle size={17} className="shrink-0" />
          Nenhum caixa aberto: vendas em dinheiro não entram no caixa.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_410px]">
        {/* Produtos */}
        <section className="min-w-0 space-y-3">
          <label className="relative block">
            <Search size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-3" />
            <input
              ref={buscaRef}
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={aoDigitarBusca}
              placeholder="Buscar por nome, SKU ou código de barras (Enter adiciona)"
              aria-label="Buscar produto"
              className="focus-dourado h-12 w-full rounded-xl border border-borda bg-superficie pl-11 pr-3 text-[15px] placeholder:text-texto-3"
            />
          </label>

          {categorias.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['', ...categorias].map((c) => (
                <button
                  key={c || 'todas'}
                  type="button"
                  onClick={() => setCategoria(c)}
                  className={cn(
                    'h-9 shrink-0 rounded-full border px-3.5 text-[13px] transition-colors',
                    categoria === c ? 'border-dourado bg-dourado/15 text-dourado' : 'border-borda bg-superficie text-texto-2 hover:border-borda-clara',
                  )}
                >
                  {c || 'Todas'}
                </button>
              ))}
            </div>
          )}

          {visiveis.length === 0 ? (
            <div className="card px-5 py-10 text-center text-sm text-texto-3">Nenhum produto ativo encontrado.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
              {visiveis.map((p) => {
                const ok = disponivel(p)
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!ok}
                    onClick={() => adicionar(p)}
                    className={cn(
                      'card card-hover focus-dourado flex min-h-[92px] flex-col justify-between p-3 text-left',
                      !ok && 'cursor-not-allowed opacity-45',
                    )}
                  >
                    <span className="line-clamp-2 text-[13.5px] font-medium leading-snug">{p.name}</span>
                    <span className="mt-2 flex items-end justify-between gap-2">
                      <span className="num text-[15px] font-bold text-dourado">{money(p.salePrice)}</span>
                      <span className={cn('text-[11.5px]', ok ? 'text-texto-3' : 'font-semibold text-negativo')}>
                        {!ok ? 'Sem estoque' : p.trackStock ? `${p.stock} ${p.unit}` : 'sem limite'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Carrinho */}
        <aside className="card flex flex-col md:sticky md:top-20 md:max-h-[calc(100vh-6rem)]">
          <div className="flex items-center gap-2.5 border-b border-borda px-4 py-3.5">
            <ShoppingCart size={17} className="text-dourado" />
            <h2 className="text-[15px] font-semibold">Carrinho</h2>
            <span className="num ml-auto text-[12.5px] text-texto-3">{itensNoCarrinho} {itensNoCarrinho === 1 ? 'item' : 'itens'}</span>
            {carrinho.length > 0 && (
              <button type="button" onClick={limpar} className="text-[12.5px] text-texto-3 hover:text-negativo">Limpar</button>
            )}
          </div>

          <div className="min-h-[120px] flex-1 overflow-y-auto">
            {linhas.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-texto-3">Toque num produto ou leia o código de barras.</p>
            ) : (
              <ul className="divide-y divide-borda">
                {linhas.map(({ item, p, total: t, excede, qtd }) => (
                  <li key={p.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13.5px] font-medium leading-snug">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => setCarrinho((a) => a.filter((i) => i.productId !== p.id))}
                        aria-label={`Remover ${p.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-texto-3 hover:bg-negativo/10 hover:text-negativo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => passo(p.id, -1)} aria-label="Diminuir" className="flex h-10 w-10 items-center justify-center rounded-lg border border-borda bg-superficie-2 hover:border-borda-clara">
                        <Minus size={16} />
                      </button>
                      <input
                        value={item.qtd}
                        onChange={(e) => mudarQtd(p.id, e.target.value)}
                        inputMode="numeric"
                        aria-label={`Quantidade de ${p.name}`}
                        className={cn(inputClass, 'num h-10 w-16 px-2 text-center', (excede || qtd <= 0) && 'border-negativo')}
                      />
                      <button type="button" onClick={() => passo(p.id, 1)} aria-label="Aumentar" className="flex h-10 w-10 items-center justify-center rounded-lg border border-borda bg-superficie-2 hover:border-borda-clara">
                        <Plus size={16} />
                      </button>
                      <span className="num ml-auto text-right">
                        <span className="block text-[11.5px] text-texto-3">{money(p.salePrice)} cada</span>
                        <span className="block text-[15px] font-semibold">{money(t / 100)}</span>
                      </span>
                    </div>
                    {excede && <p className="mt-1 text-[12px] text-negativo">Só há {p.stock} {p.unit} em estoque.</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3.5 border-t border-borda p-4">
            <div className="flex items-center justify-between gap-3 text-[13px] text-texto-2">
              <span>Subtotal</span>
              <span className="num">{money(subtotal / 100)}</span>
            </div>
            <label className="flex items-center justify-between gap-3 text-[13px] text-texto-2">
              <span>Desconto (R$)</span>
              <input
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                aria-label="Desconto em reais"
                className={cn(inputClass, 'num h-10 w-28 text-right', (!descontoValido || descontoAlto) && 'border-negativo')}
              />
            </label>

            <div className="flex items-end justify-between gap-3 border-t border-borda pt-3">
              <span className="text-sm font-medium text-texto-2">Total</span>
              <span data-testid="total" className="num text-[34px] font-bold leading-none tracking-tight text-dourado">{money(total / 100)}</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Forma de pagamento">
              {OPCOES_PAGAMENTO.map((o) => {
                const Icone = ICONES[o.valor]
                const ativo = pagamento === o.valor
                return (
                  <button
                    key={o.valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => { setPagamento(o.valor); setErro(null) }}
                    className={cn(
                      'flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border text-[11.5px] font-medium transition-colors',
                      ativo ? 'border-dourado bg-dourado/15 text-dourado' : 'border-borda bg-superficie-2 text-texto-2 hover:border-borda-clara',
                    )}
                  >
                    <Icone size={17} />
                    {o.label}
                  </button>
                )
              })}
            </div>

            {pagamento === 'DINHEIRO' && (
              <div className="space-y-2">
                <label className="flex items-center justify-between gap-3 text-[13px] text-texto-2">
                  <span>Valor recebido</span>
                  <input
                    value={recebido}
                    onChange={(e) => setRecebido(e.target.value)}
                    inputMode="decimal"
                    placeholder="0,00"
                    aria-label="Valor recebido"
                    className={cn(inputClass, 'num h-11 w-32 text-right text-base')}
                  />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setRecebido((total / 100).toFixed(2).replace('.', ','))} className="h-8 rounded-md border border-borda bg-superficie-2 px-2.5 text-[12px] text-texto-2 hover:border-borda-clara">Exato</button>
                  {[20, 50, 100].filter((n) => n * 100 >= total && total > 0).slice(0, 3).map((n) => (
                    <button key={n} type="button" onClick={() => setRecebido(`${n},00`)} className="h-8 rounded-md border border-borda bg-superficie-2 px-2.5 text-[12px] text-texto-2 hover:border-borda-clara">R$ {n}</button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-texto-2">Troco</span>
                  <span data-testid="troco" className={cn('num text-xl font-bold', troco < 0 ? 'text-negativo' : 'text-positivo')}>
                    {recebidoValido && recebido.trim() ? (troco < 0 ? `faltam ${money(-troco / 100)}` : money(troco / 100)) : '—'}
                  </span>
                </div>
              </div>
            )}

            {pagamento === 'FIADO' && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    aria-label="Cliente do fiado"
                    className={cn(inputClass, 'h-11 min-w-0 flex-1 appearance-none')}
                  >
                    <option value="">Escolha o cliente…</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setNovoCliente(true)}
                    aria-label="Cadastrar cliente novo"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-borda bg-superficie-2 text-dourado hover:border-dourado"
                  >
                    <UserPlus size={18} />
                  </button>
                </div>
                <label className="flex items-center justify-between gap-3 text-[13px] text-texto-2">
                  <span>Vencimento</span>
                  <input
                    type="date"
                    value={vencimento}
                    min={vencimentoPadrao}
                    onChange={(e) => setVencimento(e.target.value)}
                    aria-label="Vencimento do fiado"
                    className={cn(inputClass, 'h-11 w-44 [color-scheme:dark]')}
                  />
                </label>
              </div>
            )}

            {erro && (
              <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3 py-2 text-[13px] text-negativo">{erro}</p>
            )}
            {!erro && problema && linhas.length > 0 && <p className="text-[12px] text-texto-3">{problema}</p>}

            <Botao type="button" onClick={finalizar} disabled={Boolean(problema) || enviando} className="h-14 w-full text-base">
              {enviando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Finalizar venda
            </Botao>
          </div>
        </aside>
      </div>

      {recibo && (
        <Modal titulo={`Venda #${recibo.numero} finalizada`} onFechar={novaVenda} largura="max-w-md">
          <div className="space-y-4 text-center">
            <div>
              <p className="text-[13px] text-texto-3">Total</p>
              <p data-testid="recibo-total" className="num text-[38px] font-bold leading-tight text-dourado">{money(recibo.total)}</p>
              <p className="text-[13px] text-texto-2">{ROTULO_PAGAMENTO[recibo.pagamento]}{recibo.cliente ? ` — ${recibo.cliente}` : ''}</p>
            </div>
            {recibo.recebido != null && (
              <div className="rounded-lg border border-borda bg-superficie-2 p-3">
                <p className="text-[12.5px] text-texto-3">Recebido {money(recibo.recebido)}</p>
                <p className="text-[13px] text-texto-2">Troco</p>
                <p data-testid="recibo-troco" className="num text-3xl font-bold text-positivo">{money(recibo.troco)}</p>
              </div>
            )}
            {recibo.pagamento === 'DINHEIRO' && !recibo.noCaixa && (
              <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-laranja">
                <Wallet size={14} /> Sem caixa aberto: este dinheiro não entrou no caixa.
              </p>
            )}
            <div className="flex gap-2.5">
              <Botao type="button" variante="secundario" className="flex-1" onClick={() => { if (!imprimirRecibo(recibo, empresa)) aviso('O navegador bloqueou a janela do recibo.', 'erro') }}>
                <Printer size={16} /> Imprimir recibo
              </Botao>
              <Botao type="button" className="flex-1" onClick={novaVenda} autoFocus>Nova venda</Botao>
            </div>
          </div>
        </Modal>
      )}

      {novoCliente && (
        <Modal titulo="Cadastrar cliente" descricao="O cliente fica selecionado nesta venda." onFechar={() => setNovoCliente(false)}>
          <ClienteForm onCancelar={() => setNovoCliente(false)} onSalvo={aoCadastrarCliente} />
        </Modal>
      )}
    </div>
  )
}
