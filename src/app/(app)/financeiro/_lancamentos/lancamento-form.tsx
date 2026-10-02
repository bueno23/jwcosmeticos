'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Botao, Campo, CampoSelecao, inputClass } from '@/components/ui/form'
import { money } from '@/lib/format'
import { ehNumero, paraNumero } from '@/lib/num'
import type { CategoriaFinanceira, Lancamento, TipoLancamento } from '@/lib/services/lancamentos'
import { salvarCategoriaAction, salvarLancamentoAction, type EstadoLancamento } from './actions'
import { TEXTOS } from './textos'

const NOVA = '__nova'

type Rascunho = { descricao: string; valor: string; dia: string; categoriaId: string }

// Mostra o valor salvo como a pessoa digitaria ("1234,5"), para editar sem trocar vírgula por ponto
const valorParaCampo = (v: number) => v.toFixed(2).replace('.', ',')

export function LancamentoForm({
  tipo, lancamento, categorias, hoje, onCancelar, onSalvo, onCategoriaCriada,
}: {
  tipo: TipoLancamento
  lancamento?: Lancamento
  categorias: CategoriaFinanceira[]
  hoje: string
  onCancelar: () => void
  onSalvo: (mensagem: string) => void
  onCategoriaCriada: (c: CategoriaFinanceira) => void
}) {
  const textos = TEXTOS[tipo]
  const [rascunho, setRascunho] = useState<Rascunho>(() => ({
    descricao: lancamento?.descricao ?? '',
    valor: lancamento ? valorParaCampo(lancamento.valor) : '',
    dia: lancamento?.dia ?? hoje,
    categoriaId: lancamento?.categoria?.id ?? '',
  }))
  const [estado, enviar, pendente] = useActionState<EstadoLancamento, FormData>(salvarLancamentoAction, { ok: false })
  const tratado = useRef<string | null>(null)

  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [nomeCategoria, setNomeCategoria] = useState('')
  const [erroCategoria, setErroCategoria] = useState<string | undefined>()
  const [salvandoCategoria, startCategoria] = useTransition()

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

  function escolherCategoria(v: string) {
    if (v === NOVA) {
      setCriandoCategoria(true)
      return
    }
    mudar('categoriaId', v)
  }

  function criarCategoria() {
    setErroCategoria(undefined)
    startCategoria(async () => {
      const r = await salvarCategoriaAction(tipo, null, nomeCategoria)
      if (!r.ok || !r.categoria) {
        setErroCategoria(r.erros?.nome ?? r.mensagem ?? 'Não foi possível criar a categoria.')
        return
      }
      onCategoriaCriada({ ...r.categoria, lancamentos: 0 })
      mudar('categoriaId', r.categoria.id)
      setNomeCategoria('')
      setCriandoCategoria(false)
    })
  }

  const valorLido = ehNumero(rascunho.valor) ? paraNumero(rascunho.valor) : null

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="tipo" value={tipo} />
      {lancamento && <input type="hidden" name="id" value={lancamento.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Descrição" erro={estado.erros?.descricao} className="sm:col-span-2">
          <input
            name="descricao"
            value={rascunho.descricao}
            onChange={(e) => mudar('descricao', e.target.value)}
            placeholder={textos.exemploDescricao}
            className={inputClass}
            autoFocus
          />
        </Campo>

        <Campo
          label="Valor"
          erro={estado.erros?.valor}
          hint={valorLido !== null && valorLido > 0 ? money(valorLido) : 'Aceita 1.234,56 ou 1234.56'}
        >
          <input
            name="valor"
            value={rascunho.valor}
            onChange={(e) => mudar('valor', e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass}
          />
        </Campo>

        <Campo
          label={textos.rotuloData}
          erro={estado.erros?.dia}
          hint={`Futuro é conta a ${tipo === 'despesa' ? 'pagar' : 'receber'}, não entra aqui.`}
        >
          <input
            type="date"
            name="dia"
            value={rascunho.dia}
            max={hoje}
            onChange={(e) => mudar('dia', e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </Campo>

        {criandoCategoria ? (
          <div className="sm:col-span-2">
            <Campo label="Nova categoria" erro={erroCategoria}>
              <div className="flex gap-2">
                <input
                  value={nomeCategoria}
                  onChange={(e) => setNomeCategoria(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      criarCategoria()
                    }
                  }}
                  placeholder={textos.categoriaNova}
                  aria-label="Nome da nova categoria"
                  className={inputClass}
                  autoFocus
                />
                <Botao type="button" onClick={criarCategoria} disabled={salvandoCategoria}>
                  {salvandoCategoria ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Criar
                </Botao>
                <Botao
                  type="button"
                  variante="secundario"
                  onClick={() => {
                    setCriandoCategoria(false)
                    setErroCategoria(undefined)
                  }}
                  disabled={salvandoCategoria}
                >
                  Voltar
                </Botao>
              </div>
            </Campo>
            <input type="hidden" name="categoriaId" value={rascunho.categoriaId} />
          </div>
        ) : (
          <CampoSelecao
            label="Categoria"
            name="categoriaId"
            erro={estado.erros?.categoriaId}
            placeholder="Sem categoria"
            value={rascunho.categoriaId}
            onChange={escolherCategoria}
            className="sm:col-span-2"
          >
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            <option value={NOVA}>+ Nova categoria de {textos.singular}…</option>
          </CampoSelecao>
        )}
      </div>

      {estado.mensagem && !estado.ok && (
        <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          {estado.mensagem}
        </p>
      )}

      <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
        <Botao type="button" variante="secundario" onClick={onCancelar} disabled={pendente}>Cancelar</Botao>
        <Botao type="submit" disabled={pendente || salvandoCategoria || criandoCategoria}>
          {pendente && <Loader2 size={15} className="animate-spin" />}
          {lancamento ? 'Salvar alterações' : `Lançar ${textos.singular}`}
        </Botao>
      </div>
    </form>
  )
}
