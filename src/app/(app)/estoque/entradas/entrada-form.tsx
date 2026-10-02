'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Loader2, PackagePlus, TriangleAlert } from 'lucide-react'
import { Botao, Caixa, Campo, CampoSelecao, inputClass } from '@/components/ui/form'
import { money, number, percent } from '@/lib/format'
import { paraNumero } from '@/lib/num'
import { custoMedioPonderado, margem } from '@/lib/margem'
import type { Opcao } from '@/app/(app)/estoque/produtos/produto'
import type { ProdutoEstoque } from '../produto-estoque'
import { registrarEntradaAction, type EstadoMovimento } from './actions'

type Rascunho = {
  productId: string
  quantidade: string
  custoUnitario: string
  supplierId: string
  nota: string
  motivo: string
  gerarContaPagar: boolean
  descricaoConta: string
  vencimento: string
}

const VAZIO: Rascunho = {
  productId: '', quantidade: '', custoUnitario: '', supplierId: '', nota: '', motivo: '',
  gerarContaPagar: false, descricaoConta: '', vencimento: '',
}

export function EntradaForm({
  produtos, fornecedores,
}: {
  produtos: ProdutoEstoque[]
  fornecedores: Opcao[]
}) {
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO)
  const [estado, enviar, pendente] = useActionState<EstadoMovimento, FormData>(registrarEntradaAction, { ok: false })
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
      setRascunho((r) => ({ ...VAZIO, gerarContaPagar: r.gerarContaPagar }))
    }
  }, [estado])

  const mudar = <C extends keyof Rascunho>(campo: C, valor: Rascunho[C]) =>
    setRascunho((r) => ({ ...r, [campo]: valor }))

  // A mesma conta que a regra 6 faz no servidor, mostrada antes de salvar
  const quantidade = Math.max(Math.trunc(paraNumero(rascunho.quantidade)), 0)
  const custoInformado = paraNumero(rascunho.custoUnitario)
  const custoNovo = produto
    ? custoMedioPonderado(produto.costPrice, produto.stock, custoInformado, quantidade)
    : 0
  const margemNova = produto ? margem(custoNovo, produto.salePrice) : 0
  const total = quantidade * custoInformado
  const semSalvar = produto && quantidade > 0 && custoInformado > produto.salePrice

  return (
    <form action={enviar} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelecao
          label="Produto"
          name="productId"
          erro={estado.erros?.productId}
          placeholder="Escolha o produto"
          value={rascunho.productId}
          onChange={(v) => {
            // Trocar de produto recusa o preço antigo, que é do produto anterior
            const proximo = produtos.find((p) => p.id === v)
            setRascunho((r) => ({
              ...r,
              productId: v,
              custoUnitario: proximo ? String(produto?.costPrice ?? proximo.costPrice) : '',
            }))
          }}
          className="sm:col-span-2"
        >
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.stock} {p.unit} em estoque
            </option>
          ))}
        </CampoSelecao>

        <Campo label="Quantidade" erro={estado.erros?.quantidade}>
          <input
            name="quantidade"
            value={rascunho.quantidade}
            onChange={(e) => mudar('quantidade', e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className={inputClass}
          />
        </Campo>

        <Campo label="Custo unitário" erro={estado.erros?.custoUnitario} hint="O que foi pago nesta entrada.">
          <input
            name="custoUnitario"
            value={rascunho.custoUnitario}
            onChange={(e) => mudar('custoUnitario', e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass}
          />
        </Campo>

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

        <Campo label="Nota fiscal" erro={estado.erros?.nota} hint="Opcional. Ajuda a achar a entrada depois.">
          <input
            name="nota"
            value={rascunho.nota}
            onChange={(e) => mudar('nota', e.target.value)}
            placeholder="Ex.: 001234"
            className={inputClass}
          />
        </Campo>

        <Campo label="Observação" erro={estado.erros?.motivo} className="sm:col-span-2">
          <input
            name="motivo"
            value={rascunho.motivo}
            onChange={(e) => mudar('motivo', e.target.value)}
            placeholder="Ex.: reposição, compra de promoção"
            className={inputClass}
          />
        </Campo>
      </div>

      {produto && quantidade > 0 && (
        <div className="grid gap-4 rounded-lg border border-borda bg-superficie-2 p-4 sm:grid-cols-4">
          <div>
            <div className="text-[12px] text-texto-3">Estoque</div>
            <div className="num mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold">
              <span>{number(produto.stock)}</span>
              <ArrowRight size={11} className="text-texto-3" />
              <span>{number(produto.stock + quantidade)}</span>
            </div>
          </div>
          <div>
            <div className="text-[12px] text-texto-3">Custo médio</div>
            <div className="num mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold">
              <span>{money(produto.costPrice)}</span>
              <ArrowRight size={11} className="text-texto-3" />
              <span className={custoNovo > produto.costPrice ? 'text-laranja' : undefined}>{money(custoNovo)}</span>
            </div>
          </div>
          <div>
            <div className="text-[12px] text-texto-3">Margem prevista</div>
            <div className={`num mt-0.5 text-[15px] font-semibold ${margemNova >= 0 ? 'text-positivo' : 'text-negativo'}`}>
              {percent(margemNova, 1)}
            </div>
          </div>
          <div>
            <div className="text-[12px] text-texto-3">Total da compra</div>
            <div className="num mt-0.5 text-[15px] font-semibold">{money(total)}</div>
          </div>
        </div>
      )}

      {semSalvar && (
        <p className="flex items-start gap-2 rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          <TriangleAlert size={15} className="mt-px shrink-0" />
          <span>
            O custo informado ({money(custoInformado)}) está acima do preço de venda ({money(produto!.salePrice)}).
            Depois de salvar, o custo médio deste produto sobe.
          </span>
        </p>
      )}

      <div className="space-y-4 border-t border-borda pt-5">
        <Caixa
          name="gerarContaPagar"
          checked={rascunho.gerarContaPagar}
          onChange={(v) => mudar('gerarContaPagar', v)}
          label="Lançar conta a pagar"
          descricao="Cria um contas a pagar em aberto com o valor desta entrada."
        />
        {rascunho.gerarContaPagar && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Vencimento" erro={estado.erros?.vencimento}>
              <input
                name="vencimento"
                type="date"
                value={rascunho.vencimento}
                onChange={(e) => mudar('vencimento', e.target.value)}
                className={inputClass}
              />
            </Campo>
            <Campo label="Descrição" erro={estado.erros?.descricaoConta} hint="Se vazio, usamos o produto e a quantidade.">
              <input
                name="descricaoConta"
                value={rascunho.descricaoConta}
                onChange={(e) => mudar('descricaoConta', e.target.value)}
                className={inputClass}
              />
            </Campo>
          </div>
        )}
      </div>

      {estado.mensagem && (
        <div
          role="status"
          className={`rounded-lg border px-3.5 py-2.5 text-[13px] ${
            estado.ok ? 'border-positivo/40 bg-positivo/10 text-positivo' : 'border-negativo/40 bg-negativo/10 text-negativo'
          }`}
        >
          <div>{estado.mensagem}</div>
          {estado.custo?.mudou && (
            <div className="mt-0.5">
              Custo médio: {money(estado.custo.anterior)} → {money(estado.custo.novo)}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end border-t border-borda pt-5">
        <Botao type="submit" disabled={pendente}>
          {pendente ? <Loader2 size={15} className="animate-spin" /> : <PackagePlus size={16} />}
          Registrar entrada
        </Botao>
      </div>
    </form>
  )
}
