'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/components/ui/toast'
import { removerCategoriaAction, salvarCategoriaAction, type EstadoFormulario } from './actions'

export type Categoria = {
  id: string
  name: string
  color: string
  produtos: number
}

// Cores pensadas para o donut da dashboard: vivas o bastante no fundo escuro
const PALETA = [
  '#F5C518', '#EF4444', '#22C55E', '#3B82F6', '#A855F7',
  '#F59E3B', '#EC4899', '#14B8A6', '#06B6D4', '#84CC16',
]

function CategoriaForm({
  categoria, onCancelar, onSalvo,
}: {
  categoria?: Categoria
  onCancelar: () => void
  onSalvo: (mensagem: string) => void
}) {
  const [nome, setNome] = useState(categoria?.name ?? '')
  const [cor, setCor] = useState(categoria?.color ?? PALETA[0])
  const [estado, enviar, pendente] = useActionState<EstadoFormulario, FormData>(salvarCategoriaAction, { ok: false })
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

  return (
    <form action={enviar} className="space-y-5">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <input type="hidden" name="color" value={cor} />

      <Campo label="Nome" erro={estado.erros?.name}>
        <input
          name="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Maquiagem"
          className={inputClass}
          autoFocus
        />
      </Campo>

      <div>
        <span className="mb-2 block text-[12.5px] font-medium text-texto-2">Cor</span>
        <div className="flex flex-wrap gap-2">
          {PALETA.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCor(c)}
              title={c}
              style={{ background: c }}
              className={`h-8 w-8 rounded-lg transition-transform ${
                cor.toLowerCase() === c.toLowerCase()
                  ? 'scale-110 ring-2 ring-texto ring-offset-2 ring-offset-superficie'
                  : 'hover:scale-105'
              }`}
            />
          ))}
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-borda px-2.5 text-[12px] text-texto-2 hover:border-borda-clara">
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0" />
            outra
          </label>
        </div>
        <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-texto-3">
          <span className="h-3 w-3 rounded-full" style={{ background: cor }} />
          Esta cor é a que aparece no gráfico de vendas por categoria.
        </p>
      </div>

      {estado.mensagem && !estado.ok && (
        <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          {estado.mensagem}
        </p>
      )}

      <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
        <Botao type="button" variante="secundario" onClick={onCancelar} disabled={pendente}>Cancelar</Botao>
        <Botao type="submit" disabled={pendente}>
          {pendente && <Loader2 size={15} className="animate-spin" />}
          {categoria ? 'Salvar' : 'Criar categoria'}
        </Botao>
      </div>
    </form>
  )
}

export function CategoriasTabela({ categorias, podeEditar }: { categorias: Categoria[]; podeEditar: boolean }) {
  const toast = useToast()
  const [editando, setEditando] = useState<Categoria | null | undefined>(undefined)
  const [removendo, setRemovendo] = useState<Categoria | null>(null)
  const [pendente, setPendente] = useState(false)

  async function confirmarRemocao() {
    if (!removendo) return
    setPendente(true)
    const r = await removerCategoriaAction(removendo.id)
    setPendente(false)
    setRemovendo(null)
    toast(r.mensagem ?? (r.ok ? 'Categoria removida.' : 'Não foi possível remover.'), r.ok ? 'ok' : 'erro')
  }

  const todas: Coluna<Categoria>[] = [
    {
      chave: 'nome',
      titulo: 'Categoria',
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    {
      chave: 'produtos',
      titulo: 'Produtos',
      alinhamento: 'direita',
      render: (c) => <span className="num text-texto-2">{c.produtos}</span>,
    },
    {
      chave: 'acoes',
      titulo: '',
      alinhamento: 'direita',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => setEditando(c)}
            title="Editar"
            className="rounded-md p-2 text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setRemovendo(c)}
            title="Remover"
            className="rounded-md p-2 text-texto-3 transition-colors hover:bg-negativo/10 hover:text-negativo"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  const colunas = podeEditar ? todas : todas.filter((c) => c.chave !== 'acoes')

  return (
    <>
      <PageHeader
        titulo="Categorias"
        descricao="Agrupam o catálogo e dão a cor de cada fatia no gráfico da dashboard."
        acao={podeEditar && (
          <button
            onClick={() => setEditando(null)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-dourado px-4 text-sm font-semibold text-preto transition-colors hover:bg-dourado-escuro"
          >
            <Plus size={16} />
            Nova categoria
          </button>
        )}
      />

      <Card>
        <DataTable
          colunas={colunas}
          linhas={categorias}
          vazio={
            <EmptyState
              titulo="Nenhuma categoria"
              descricao="Crie as categorias para organizar o catálogo — sem elas o gráfico da dashboard fica vazio."
            />
          }
        />
      </Card>

      {editando !== undefined && (
        <Modal
          titulo={editando ? 'Editar categoria' : 'Nova categoria'}
          onFechar={() => setEditando(undefined)}
        >
          <CategoriaForm
            categoria={editando ?? undefined}
            onCancelar={() => setEditando(undefined)}
            onSalvo={(mensagem) => {
              setEditando(undefined)
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}

      {removendo && (
        <Modal
          titulo="Remover categoria"
          descricao={removendo.name}
          onFechar={() => setRemovendo(null)}
        >
          <div className="space-y-5">
            <p className="text-[13.5px] leading-relaxed text-texto-2">
              {removendo.produtos > 0 ? (
                <>
                  Os <strong className="text-texto">{removendo.produtos}</strong> produto(s) desta categoria
                  continuam cadastrados, mas ficam sem categoria até você escolher outra.
                </>
              ) : (
                'Nenhum produto usa esta categoria.'
              )}{' '}
              As vendas já feitas não mudam.
            </p>
            <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
              <Botao variante="secundario" onClick={() => setRemovendo(null)} disabled={pendente}>
                Cancelar
              </Botao>
              <Botao variante="perigo" onClick={confirmarRemocao} disabled={pendente}>
                {pendente ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Remover
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
