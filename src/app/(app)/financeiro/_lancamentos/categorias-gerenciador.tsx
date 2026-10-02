'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Botao, inputClass } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import type { CategoriaFinanceira, TipoLancamento } from '@/lib/services/lancamentos'
import { removerCategoriaAction, salvarCategoriaAction } from './actions'
import { TEXTOS } from './textos'

/** Conteúdo do modal de categorias: criar, renomear e remover, sempre do tipo da tela. */
export function CategoriasGerenciador({
  tipo, categorias,
}: {
  tipo: TipoLancamento
  categorias: CategoriaFinanceira[]
}) {
  const toast = useToast()
  const textos = TEXTOS[tipo]
  const [nova, setNova] = useState('')
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null)
  const [removendo, setRemovendo] = useState<CategoriaFinanceira | null>(null)
  const [erro, setErro] = useState<string | undefined>()
  const [pendente, startTransition] = useTransition()

  function salvar(id: string | null, nome: string, depois: () => void) {
    setErro(undefined)
    startTransition(async () => {
      const r = await salvarCategoriaAction(tipo, id, nome)
      if (!r.ok) {
        setErro(r.erros?.nome ?? r.mensagem)
        return
      }
      toast(r.mensagem ?? 'Pronto.', 'ok')
      depois()
    })
  }

  function remover(c: CategoriaFinanceira) {
    startTransition(async () => {
      const r = await removerCategoriaAction(tipo, c.id)
      setRemovendo(null)
      toast(r.mensagem ?? (r.ok ? 'Categoria removida.' : 'Não foi possível remover.'), r.ok ? 'ok' : 'erro')
    })
  }

  if (removendo) {
    return (
      <div className="space-y-5">
        <p className="text-[13.5px] leading-relaxed text-texto-2">
          Remover <strong className="text-texto">{removendo.nome}</strong>?{' '}
          {removendo.lancamentos > 0 ? (
            <>
              Os <strong className="text-texto">{removendo.lancamentos}</strong> lançamento(s) desta categoria
              continuam lá, com o mesmo valor, mas ficam sem categoria.
            </>
          ) : (
            'Nenhum lançamento usa esta categoria.'
          )}
        </p>
        <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
          <Botao variante="secundario" onClick={() => setRemovendo(null)} disabled={pendente}>Cancelar</Botao>
          <Botao variante="perigo" onClick={() => remover(removendo)} disabled={pendente}>
            {pendente ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Remover
          </Botao>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          salvar(null, nova, () => setNova(''))
        }}
        className="flex gap-2"
      >
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder={textos.categoriaNova}
          aria-label="Nome da nova categoria"
          className={inputClass}
        />
        <Botao type="submit" disabled={pendente || !nova.trim()}>
          <Plus size={15} />
          Criar
        </Botao>
      </form>

      {erro && <p role="alert" className="text-[12.5px] text-negativo">{erro}</p>}

      {categorias.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-texto-3">Nenhuma categoria de {textos.singular} ainda.</p>
      ) : (
        <ul className="divide-y divide-borda rounded-lg border border-borda">
          {categorias.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editando?.id === c.id ? (
                <form
                  className="flex flex-1 items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    salvar(c.id, editando.nome, () => setEditando(null))
                  }}
                >
                  <input
                    value={editando.nome}
                    onChange={(e) => setEditando({ id: c.id, nome: e.target.value })}
                    aria-label="Novo nome"
                    className={`${inputClass} py-1.5`}
                    autoFocus
                  />
                  <button type="submit" title="Salvar" disabled={pendente} className="rounded-md p-2 text-positivo hover:bg-positivo/10">
                    {pendente ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  </button>
                  <button
                    type="button"
                    title="Cancelar"
                    onClick={() => {
                      setEditando(null)
                      setErro(undefined)
                    }}
                    className="rounded-md p-2 text-texto-3 hover:text-texto"
                  >
                    <X size={15} />
                  </button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{c.nome}</span>
                  <span className="num text-[12px] text-texto-3">
                    {c.lancamentos} lançamento{c.lancamentos === 1 ? '' : 's'}
                  </span>
                  <button
                    onClick={() => {
                      setErro(undefined)
                      setEditando({ id: c.id, nome: c.nome })
                    }}
                    title="Renomear"
                    className="rounded-md p-2 text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setRemovendo(c)}
                    title="Remover"
                    className="rounded-md p-2 text-texto-3 transition-colors hover:bg-negativo/10 hover:text-negativo"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
