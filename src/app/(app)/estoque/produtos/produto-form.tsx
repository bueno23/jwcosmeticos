'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Botao, Caixa, Campo, CampoSelecao, inputClass } from '@/components/ui/form'
import { money, percent } from '@/lib/format'
import { paraNumero } from '@/lib/num'
import { corMargem, margem, markup } from '@/lib/margem'
import { salvarProduto, type EstadoFormulario } from './actions'
import type { Opcao, ProdutoLinha } from './produto'

type Rascunho = {
  name: string
  sku: string
  barcode: string
  brand: string
  description: string
  unit: string
  categoryId: string
  supplierId: string
  costPrice: string
  salePrice: string
  minStock: string
  estoqueInicial: string
  trackStock: boolean
  active: boolean
}

const UNIDADES = ['un', 'cx', 'kit', 'pct', 'ml', 'g']

const NOVO: Rascunho = {
  name: '', sku: '', barcode: '', brand: '', description: '', unit: 'un',
  categoryId: '', supplierId: '', costPrice: '', salePrice: '',
  minStock: '0', estoqueInicial: '0', trackStock: true, active: true,
}

const inicial = (p?: ProdutoLinha): Rascunho =>
  p
    ? {
        name: p.name,
        sku: p.sku ?? '',
        barcode: p.barcode ?? '',
        brand: p.brand ?? '',
        description: p.description ?? '',
        unit: p.unit,
        categoryId: p.categoria?.id ?? '',
        supplierId: p.fornecedor?.id ?? '',
        costPrice: String(p.costPrice),
        salePrice: String(p.salePrice),
        minStock: String(p.minStock),
        estoqueInicial: '0',
        trackStock: p.trackStock,
        active: p.active,
      }
    : NOVO

export function ProdutoForm({
  produto, categorias, fornecedores, onCancelar, onSalvo,
}: {
  produto?: ProdutoLinha
  categorias: Opcao[]
  fornecedores: Opcao[]
  onCancelar: () => void
  onSalvo: (mensagem: string) => void
}) {
  const editando = Boolean(produto)
  const [rascunho, setRascunho] = useState<Rascunho>(() => inicial(produto))
  const [estado, enviar, pendente] = useActionState<EstadoFormulario, FormData>(salvarProduto, { ok: false })
  const tratado = useRef<string | null>(null)

  useEffect(() => {
    if (pendente) tratado.current = null
  }, [pendente])

  useEffect(() => {
    if (estado.ok && estado.mensagem && tratado.current !== estado.mensagem) {
      tratado.current = estado.mensagem
      onSalvo(estado.mensagem)
    }
  }, [estado, onSalvo])

  const mudar = <C extends keyof Rascunho>(campo: C, valor: Rascunho[C]) =>
    setRascunho((r) => ({ ...r, [campo]: valor }))

  // A margem é calculada aqui, no formulário, e na tabela pela mesma função em lib/margem
  const margemAtual = margem(paraNumero(rascunho.costPrice), paraNumero(rascunho.salePrice))

  return (
    <form action={enviar} className="space-y-5">
      {produto && <input type="hidden" name="id" value={produto.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nome" erro={estado.erros?.name} className="sm:col-span-2">
          <input
            name="name"
            value={rascunho.name}
            onChange={(e) => mudar('name', e.target.value)}
            placeholder="Ex.: Batom Matte Vermelho 3,5g"
            className={inputClass}
            autoFocus
          />
        </Campo>

        <Campo label="SKU" erro={estado.erros?.sku} hint={editando ? undefined : 'Deixe vazio se a loja não usar SKU.'}>
          <input name="sku" value={rascunho.sku} onChange={(e) => mudar('sku', e.target.value)} className={inputClass} />
        </Campo>

        <Campo label="Código de barras" erro={estado.erros?.barcode}>
          <input
            name="barcode"
            value={rascunho.barcode}
            onChange={(e) => mudar('barcode', e.target.value)}
            inputMode="numeric"
            className={inputClass}
          />
        </Campo>

        <Campo label="Marca" erro={estado.erros?.brand}>
          <input name="brand" value={rascunho.brand} onChange={(e) => mudar('brand', e.target.value)} className={inputClass} />
        </Campo>

        <CampoSelecao
          label="Categoria"
          name="categoryId"
          erro={estado.erros?.categoryId}
          placeholder="Sem categoria"
          value={rascunho.categoryId}
          onChange={(v) => mudar('categoryId', v)}
        >
          {categorias.map((c) => (
            <option key={c.valor} value={c.valor}>{c.label}</option>
          ))}
        </CampoSelecao>

        <CampoSelecao
          label="Unidade"
          name="unit"
          erro={estado.erros?.unit}
          value={rascunho.unit}
          onChange={(v) => mudar('unit', v)}
        >
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </CampoSelecao>

        <CampoSelecao
          label="Fornecedor"
          name="supplierId"
          erro={estado.erros?.supplierId}
          placeholder="Sem fornecedor"
          value={rascunho.supplierId}
          onChange={(v) => mudar('supplierId', v)}
        >
          {fornecedores.map((f) => (
            <option key={f.valor} value={f.valor}>{f.label}</option>
          ))}
        </CampoSelecao>

        <Campo label="Descrição" erro={estado.erros?.description} className="sm:col-span-2">
          <textarea
            name="description"
            value={rascunho.description}
            onChange={(e) => mudar('description', e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Campo>
      </div>

      <div className="grid gap-4 border-t border-borda pt-5 sm:grid-cols-2">
        <Campo label="Custo" erro={estado.erros?.costPrice}>
          <input
            name="costPrice"
            value={rascunho.costPrice}
            onChange={(e) => mudar('costPrice', e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass}
          />
        </Campo>

        <Campo label="Preço de venda" erro={estado.erros?.salePrice}>
          <input
            name="salePrice"
            value={rascunho.salePrice}
            onChange={(e) => mudar('salePrice', e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass}
          />
        </Campo>

        <div className="flex items-center gap-4 rounded-lg border border-borda bg-superficie-2 px-4 py-3 sm:col-span-2">
          <div className="flex-1">
            <div className="text-[12px] text-texto-3">Margem sobre a venda</div>
            <div className={`num text-[19px] font-bold ${corMargem(margemAtual)}`}>{percent(margemAtual, 1)}</div>
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-texto-3">Markup sobre o custo</div>
            <div className="num text-[19px] font-bold">{percent(markup(paraNumero(rascunho.costPrice), paraNumero(rascunho.salePrice)), 1)}</div>
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-texto-3">Lucro por {rascunho.unit || 'un'}</div>
            <div className="num text-[19px] font-bold">
              {money((paraNumero(rascunho.salePrice)) - (paraNumero(rascunho.costPrice)))}
            </div>
          </div>
        </div>

        <Campo
          label="Estoque inicial"
          erro={estado.erros?.estoqueInicial}
          hint={editando ? 'O saldo só muda por entrada, ajuste ou venda.' : 'Gera uma entrada na auditoria de estoque.'}
        >
          <input
            name="estoqueInicial"
            value={produto ? String(produto.stock) : rascunho.estoqueInicial}
            onChange={(e) => mudar('estoqueInicial', e.target.value)}
            inputMode="numeric"
            disabled={editando}
            className={`${inputClass} disabled:opacity-60`}
          />
        </Campo>

        <Campo label="Estoque mínimo" erro={estado.erros?.minStock} hint="Abaixo disso o produto entra no alerta.">
          <input
            name="minStock"
            value={rascunho.minStock}
            onChange={(e) => mudar('minStock', e.target.value)}
            inputMode="numeric"
            className={inputClass}
          />
        </Campo>

        {editando && (
          <p className="flex items-start gap-2 text-[12.5px] text-texto-3 sm:col-span-2">
            <AlertTriangle size={14} className="mt-px shrink-0 text-laranja" />
            <span>
              Para corrigir o saldo, use{' '}
              <Link href="/estoque/ajustes" className="text-dourado hover:underline">
                Ajustes de estoque
              </Link>
              , que deixa registrado quem alterou e por quê.
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-5 border-t border-borda pt-5">
        <Caixa
          name="trackStock"
          checked={rascunho.trackStock}
          onChange={(v) => mudar('trackStock', v)}
          label="Controlar estoque"
          descricao="Desmarque para serviços e kits montados: vende sem contar unidades."
        />
        <Caixa
          name="active"
          checked={rascunho.active}
          onChange={(v) => mudar('active', v)}
          label="Produto ativo"
          descricao="Inativo some do PDV e dos relatórios."
        />
      </div>

      {estado.mensagem && !estado.ok && (
        <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          {estado.mensagem}
        </p>
      )}

      <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
        <Botao type="button" variante="secundario" onClick={onCancelar} disabled={pendente}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={pendente}>
          {pendente && <Loader2 size={15} className="animate-spin" />}
          {editando ? 'Salvar alterações' : 'Cadastrar produto'}
        </Botao>
      </div>
    </form>
  )
}
