'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, Loader2, Search, TriangleAlert } from 'lucide-react'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { cn } from '@/lib/cn'
import { number } from '@/lib/format'
import { ehNumero, paraNumero } from '@/lib/num'
import type { ProdutoEstoque } from '../produto-estoque'
import { registrarInventarioAction, type EstadoMovimento } from './actions'

/** Só o que o usuário preencheu é enviado — produto em branco não vira ajuste. */
type Contagem = Record<string, string>

/**
 * Campo vazio, campo válido e campo inválido são três estados diferentes.
 * Não dá para usar paraNumero direto: ela devolve 0 para "abc", e um zero
 * acidental aqui zeraria o estoque do produto.
 */
function lerCampo(texto: string): { preenchido: boolean; valido: boolean; valor: number } {
  if (!texto.trim()) return { preenchido: false, valido: true, valor: 0 }
  if (!ehNumero(texto)) return { preenchido: true, valido: false, valor: 0 }
  const n = paraNumero(texto)
  return { preenchido: true, valido: Number.isInteger(n) && n >= 0, valor: Math.trunc(n) }
}

export function InventarioForm({ produtos }: { produtos: ProdutoEstoque[] }) {
  const [contagem, setContagem] = useState<Contagem>({})
  const [motivo, setMotivo] = useState('')
  const [busca, setBusca] = useState('')
  const [estado, enviar, pendente] = useActionState<EstadoMovimento, FormData>(registrarInventarioAction, { ok: false })
  const tratado = useRef<string | null>(null)

  useEffect(() => {
    if (pendente) tratado.current = null
  }, [pendente])

  useEffect(() => {
    if (estado.ok && tratado.current !== estado.mensagem) {
      tratado.current = estado.mensagem ?? ''
      setContagem({})
      setMotivo('')
    }
  }, [estado])

  const visiveis = useMemo(() => {
    const alvo = busca.trim().toLowerCase()
    if (!alvo) return produtos
    return produtos.filter(
      (p) => p.name.toLowerCase().includes(alvo) || (p.sku ?? '').toLowerCase().includes(alvo),
    )
  }, [produtos, busca])

  const validos = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const [id, texto] of Object.entries(contagem)) {
      const lido = lerCampo(texto)
      if (lido.preenchido && lido.valido) mapa.set(id, lido.valor)
    }
    return mapa
  }, [contagem])

  const invalidos = useMemo(
    () => Object.entries(contagem).filter(([, texto]) => !lerCampo(texto).valido).map(([id]) => id),
    [contagem],
  )

  const divergentes = useMemo(() => {
    return produtos
      .filter((p) => validos.has(p.id))
      .map((p) => {
        const contado = validos.get(p.id)!
        return { produto: p, contado, diferenca: contado - p.stock }
      })
  }, [produtos, validos])

  const comDiferenca = divergentes.filter((d) => d.diferenca !== 0)
  const payload = divergentes.map((d) => `${d.produto.id}:${d.contado}`).join(',')
  const invalidosSet = new Set(invalidos)

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="itens" value={payload} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-3" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar produto ou SKU..."
            className={cn(inputClass, 'pl-10')}
          />
        </label>
        <span className="text-[12.5px] text-texto-3">
          {visiveis.length} de {produtos.length} produtos
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-borda">
        <table className="w-full text-sm">
          <thead className="bg-superficie-2 text-[11.5px] uppercase tracking-wide text-texto-3">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold">Produto</th>
              <th className="px-3 py-2.5 text-right font-semibold">Sistema</th>
              <th className="px-3 py-2.5 text-right font-semibold">Contado</th>
              <th className="px-3 py-2.5 text-right font-semibold">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((p) => {
              const preenchido = validos.has(p.id)
              const contado = validos.get(p.id)
              const diferenca = preenchido ? contado! - p.stock : null
              const invalido = invalidosSet.has(p.id)
              return (
                <tr key={p.id} className={cn('border-t border-borda', diferenca ? 'bg-laranja/5' : undefined)}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-[11.5px] text-texto-3">{p.sku}</div>}
                  </td>
                  <td className="num px-3 py-2 text-right text-texto-2">{number(p.stock)}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      value={contagem[p.id] ?? ''}
                      onChange={(e) => setContagem((c) => ({ ...c, [p.id]: e.target.value }))}
                      inputMode="numeric"
                      placeholder="—"
                      aria-label={`Saldo contado de ${p.name}`}
                      className={cn(
                        inputClass,
                        'num w-20 py-1.5 text-right',
                        invalido && 'border-negativo text-negativo',
                      )}
                    />
                  </td>
                  <td className="num px-3 py-2 text-right">
                    {diferenca === null ? (
                      <span className="text-texto-3">—</span>
                    ) : diferenca === 0 ? (
                      <span className="text-positivo">confere</span>
                    ) : (
                      <span className={cn('font-semibold', diferenca < 0 ? 'text-negativo' : 'text-positivo')}>
                        {diferenca > 0 ? '+' : ''}{number(diferenca)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Campo
        label="Motivo da contagem"
        erro={estado.erros?.motivo}
        hint="Fica em todos os movimentos gerados por esta contagem."
      >
        <input
          name="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: inventário mensal de dezembro"
          className={inputClass}
        />
      </Campo>

      {invalidos.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          <TriangleAlert size={15} className="mt-px shrink-0" />
          <span>Há {invalidos.length} campo(s) inválido(s). Use números inteiros, sem sinal.</span>
        </p>
      )}

      {divergentes.length > 0 && (
        <div className="rounded-lg border border-borda bg-superficie-2 px-4 py-3 text-[13px] text-texto-2">
          {comDiferenca.length > 0
            ? `${comDiferenca.length} produto(s) vão gerar movimento de AJUSTE.`
            : 'Tudo confere com o sistema — nada será gravado.'}
        </div>
      )}

      {estado.mensagem && (
        <p
          role="status"
          className={cn(
            'rounded-lg border px-3.5 py-2.5 text-[13px]',
            estado.ok
              ? 'border-positivo/40 bg-positivo/10 text-positivo'
              : 'border-negativo/40 bg-negativo/10 text-negativo',
          )}
        >
          {estado.mensagem}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-borda pt-5">
        <span className="text-[12.5px] text-texto-3">{divergentes.length} produto(s) conferido(s)</span>
        <Botao
          type="submit"
          disabled={pendente || comDiferenca.length === 0 || invalidos.length > 0 || !motivo.trim()}
        >
          {pendente ? <Loader2 size={15} className="animate-spin" /> : <ClipboardList size={15} />}
          {pendente ? 'Gravando...' : 'Fechar contagem'}
        </Botao>
      </div>
    </form>
  )
}
