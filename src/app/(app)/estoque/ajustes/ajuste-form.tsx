'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ClipboardCheck, Loader2, PackageMinus, TriangleAlert } from 'lucide-react'
import { Botao, Campo, CampoSelecao, inputClass } from '@/components/ui/form'
import { cn } from '@/lib/cn'
import { number } from '@/lib/format'
import { paraNumero } from '@/lib/num'
import type { ProdutoEstoque } from '../produto-estoque'
import { registrarAjusteAction, type EstadoMovimento } from './actions'

type Tipo = 'AJUSTE' | 'PERDA'

type Rascunho = {
  tipo: Tipo
  productId: string
  quantidade: string
  motivo: string
}

const VAZIO: Rascunho = { tipo: 'AJUSTE', productId: '', quantidade: '', motivo: '' }

const MOTIVOS_SUGERIDOS = [
  'Contagem periódica',
  'Embalagem danificada',
  'Vaso quebrado',
  'Produto vencido',
  'Embalagem violada',
  'Erro de sistema',
]

export function AjusteForm({ produtos }: { produtos: ProdutoEstoque[] }) {
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO)
  const [estado, enviar, pendente] = useActionState<EstadoMovimento, FormData>(registrarAjusteAction, { ok: false })
  const tratado = useRef<string | null>(null)

  const produto = useMemo(
    () => produtos.find((p) => p.id === rascunho.productId),
    [produtos, rascunho.productId],
  )

  useEffect(() => {
    if (pendente) tratado.current = null
  }, [pendente])

  useEffect(() => {
    if (estado.ok && tratado.current !== estado.mensagem) {
      tratado.current = estado.mensagem ?? ''
      setRascunho(VAZIO)
    }
  }, [estado])

  const mudar = <C extends keyof Rascunho>(campo: C, valor: Rascunho[C]) =>
    setRascunho((r) => ({ ...r, [campo]: valor }))

  const informado = Math.max(Math.trunc(paraNumero(rascunho.quantidade)), 0)
  const perda = rascunho.tipo === 'PERDA'
  // Ajuste informa o saldo contado; perda informa quantas unidades saem
  const diferenca = perda ? -informado : produto ? informado - produto.stock : 0
  const novoSaldo = produto ? produto.stock + diferenca : 0
  const semDiferenca = produto && !perda && informado === produto.stock
  const perdaMaiorQueEstoque = perda && produto && informado > produto.stock

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="tipo" value={rascunho.tipo} />

      <div className="grid gap-2 sm:grid-cols-2">
        {([
          { tipo: 'AJUSTE' as const, titulo: 'Ajuste de contagem', desc: 'Você conta o estoque e o sistema corrige para o número contado.' },
          { tipo: 'PERDA' as const, titulo: 'Registro de perda', desc: 'Embalagem quebrada, produto vencido, amostra. Sai do estoque.' },
        ]).map(({ tipo, titulo, desc }) => (
          <button
            key={tipo}
            type="button"
            onClick={() => mudar('tipo', tipo)}
            aria-pressed={rascunho.tipo === tipo}
            className={cn(
              'rounded-lg border p-4 text-left transition-colors',
              rascunho.tipo === tipo
                ? 'border-dourado/50 bg-dourado/10'
                : 'border-borda bg-superficie-2 hover:border-borda-clara',
            )}
          >
            <div className="flex items-center gap-2 text-[13.5px] font-semibold">
              {tipo === 'AJUSTE'
                ? <ClipboardCheck size={15} className="text-dourado" />
                : <PackageMinus size={15} className="text-laranja" />}
              {titulo}
            </div>
            <div className="mt-1 text-[12px] leading-snug text-texto-3">{desc}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelecao
          label="Produto"
          name="productId"
          erro={estado.erros?.productId}
          placeholder="Escolha o produto"
          value={rascunho.productId}
          onChange={(v) => mudar('productId', v)}
          className="sm:col-span-2"
        >
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.stock} {p.unit} no sistema
            </option>
          ))}
        </CampoSelecao>

        <Campo
          label={perda ? 'Quantidade perdida' : 'Saldo contado'}
          erro={estado.erros?.quantidade}
          hint={
            perda
              ? 'Quantas unidades saíram do estoque.'
              : produto
                ? `O sistema tem ${number(produto.stock)} ${produto.unit}.`
                : 'Informe o que você contou no estoque.'
          }
        >
          <input
            name="quantidade"
            value={rascunho.quantidade}
            onChange={(e) => mudar('quantidade', e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className={inputClass}
          />
        </Campo>

        <Campo label="Motivo" erro={estado.erros?.motivo} className="sm:col-span-2">
          <input
            name="motivo"
            value={rascunho.motivo}
            onChange={(e) => mudar('motivo', e.target.value)}
            placeholder="Obrigatório: fica registrado no histórico do produto"
            className={inputClass}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MOTIVOS_SUGERIDOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => mudar('motivo', m)}
                className="rounded-md border border-borda px-2 py-1 text-[11.5px] text-texto-2 transition-colors hover:border-borda-clara hover:text-texto"
              >
                {m}
              </button>
            ))}
          </div>
        </Campo>
      </div>

      {produto && informado > 0 && (
        <div className="grid gap-4 rounded-lg border border-borda bg-superficie-2 p-4 sm:grid-cols-3">
          <div>
            <div className="text-[12px] text-texto-3">Saldo no sistema</div>
            <div className="num mt-0.5 text-[15px] font-semibold">{number(produto.stock)}</div>
          </div>
          <div>
            <div className="text-[12px] text-texto-3">Diferença</div>
            <div className={`num mt-0.5 text-[15px] font-semibold ${diferenca < 0 ? 'text-negativo' : 'text-positivo'}`}>
              {diferenca > 0 ? '+' : ''}{number(diferenca)} {produto.unit}
            </div>
          </div>
          <div>
            <div className="text-[12px] text-texto-3">Saldo depois</div>
            <div className="num mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold">
              <span>{number(produto.stock)}</span>
              <ArrowRight size={11} className="text-texto-3" />
              <span className={novoSaldo <= produto.minStock ? 'text-laranja' : undefined}>{number(novoSaldo)}</span>
            </div>
          </div>
        </div>
      )}

      {semDiferenca && (
        <p className="rounded-lg border border-borda bg-superficie-2 px-3.5 py-2.5 text-[13px] text-texto-2">
          O saldo contado é igual ao do sistema. Não há o que ajustar.
        </p>
      )}

      {perdaMaiorQueEstoque && (
        <p className="flex items-start gap-2 rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          <TriangleAlert size={15} className="mt-px shrink-0" />
          <span>O sistema tem {number(produto!.stock)} {produto!.unit} em estoque. A perda não pode ser maior que isso.</span>
        </p>
      )}

      {estado.mensagem && (
        <p
          role="status"
          className={`rounded-lg border px-3.5 py-2.5 text-[13px] ${
            estado.ok ? 'border-positivo/40 bg-positivo/10 text-positivo' : 'border-negativo/40 bg-negativo/10 text-negativo'
          }`}
        >
          {estado.mensagem}
        </p>
      )}

      <div className="flex justify-end border-t border-borda pt-5">
        <Botao type="submit" disabled={pendente || semDiferenca || perdaMaiorQueEstoque}>
          {pendente && <Loader2 size={15} className="animate-spin" />}
          {perda ? 'Registrar perda' : 'Registrar ajuste'}
        </Botao>
      </div>
    </form>
  )
}
