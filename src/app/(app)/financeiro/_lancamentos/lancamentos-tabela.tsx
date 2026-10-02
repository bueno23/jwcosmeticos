'use client'

import { useCallback, useState, useTransition } from 'react'
import { Loader2, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { FiltroSelect } from '@/components/ui/filtro-select'
import { Botao } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { SearchInput } from '@/components/ui/search-input'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import type { CategoriaFinanceira, Lancamento, TipoLancamento } from '@/lib/services/lancamentos'
import { excluirLancamentoAction } from './actions'
import { CategoriasGerenciador } from './categorias-gerenciador'
import { diaBR } from './datas'
import { FiltroPeriodo } from './filtro-periodo'
import { LancamentoForm } from './lancamento-form'
import type { Periodo } from './periodo'
import { TEXTOS } from './textos'

export function LancamentosTabela({
  tipo, lancamentos, categorias, periodo, hoje, total,
}: {
  tipo: TipoLancamento
  lancamentos: Lancamento[]
  categorias: CategoriaFinanceira[]
  periodo: Periodo
  hoje: string
  total: number
}) {
  const toast = useToast()
  const textos = TEXTOS[tipo]
  const [editando, setEditando] = useState<Lancamento | null | undefined>(undefined)
  const [excluindo, setExcluindo] = useState<Lancamento | null>(null)
  const [gerenciando, setGerenciando] = useState(false)
  const [criadas, setCriadas] = useState<CategoriaFinanceira[]>([])
  const [pendente, startTransition] = useTransition()

  // Categoria criada no formulário aparece no select antes do servidor revalidar
  const todasCategorias = [...categorias, ...criadas.filter((c) => !categorias.some((x) => x.id === c.id))]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const fecharForm = useCallback(() => setEditando(undefined), [])
  const salvo = useCallback((mensagem: string) => {
    setEditando(undefined)
    toast(mensagem, 'ok')
  }, [toast])

  function confirmarExclusao() {
    if (!excluindo) return
    startTransition(async () => {
      const r = await excluirLancamentoAction(tipo, excluindo.id)
      setExcluindo(null)
      toast(r.mensagem ?? (r.ok ? 'Excluído.' : 'Não foi possível excluir.'), r.ok ? 'ok' : 'erro')
    })
  }

  const colunas: Coluna<Lancamento>[] = [
    { chave: 'dia', titulo: 'Data', render: (l) => <span className="num text-texto-2">{diaBR(l.dia)}</span> },
    { chave: 'descricao', titulo: 'Descrição', render: (l) => <span className="font-medium">{l.descricao}</span> },
    {
      chave: 'categoria',
      titulo: 'Categoria',
      render: (l) => l.categoria
        ? <span className="text-texto-2">{l.categoria.nome}</span>
        : <span className="text-texto-3">Sem categoria</span>,
    },
    {
      chave: 'valor',
      titulo: 'Valor',
      alinhamento: 'direita',
      render: (l) => (
        <span className={`num font-semibold ${tipo === 'receita' ? 'text-positivo' : ''}`}>{money(l.valor)}</span>
      ),
    },
    {
      chave: 'acoes',
      titulo: '',
      alinhamento: 'direita',
      render: (l) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setEditando(l)} title="Editar" className="rounded-md p-2 text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto">
            <Pencil size={15} />
          </button>
          <button onClick={() => setExcluindo(l)} title="Excluir" className="rounded-md p-2 text-texto-3 transition-colors hover:bg-negativo/10 hover:text-negativo">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <FiltroPeriodo key={`${periodo.de}-${periodo.ate}`} periodo={periodo} hoje={hoje} />
        <div className="ml-auto flex gap-2.5">
          <Botao variante="secundario" onClick={() => setGerenciando(true)}>
            <Tags size={15} />
            Categorias
          </Botao>
          <Botao onClick={() => setEditando(null)}>
            <Plus size={16} />
            {textos.novo}
          </Botao>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-borda p-4">
          <SearchInput placeholder="Buscar na descrição..." />
          <FiltroSelect
            param="categoria"
            opcoes={[...todasCategorias.map((c) => ({ valor: c.id, label: c.nome })), { valor: 'sem', label: 'Sem categoria' }]}
            todos="Todas as categorias"
          />
        </div>

        <DataTable colunas={colunas} linhas={lancamentos} vazio={<EmptyState titulo={`Nenhuma ${textos.singular}`} descricao={textos.vazio} />} />

        {lancamentos.length > 0 && (
          <div className="flex items-center justify-between border-t border-borda px-5 py-3.5 text-sm">
            <span className="text-texto-2">Total — {periodo.rotulo}</span>
            <span className={`num text-[15px] font-bold ${tipo === 'receita' ? 'text-positivo' : ''}`}>{money(total)}</span>
          </div>
        )}
      </Card>

      {editando !== undefined && (
        <Modal
          titulo={editando ? `Editar ${textos.singular}` : textos.novo}
          descricao="Não movimenta o caixa."
          onFechar={fecharForm}
        >
          <LancamentoForm
            tipo={tipo}
            lancamento={editando ?? undefined}
            categorias={todasCategorias}
            hoje={hoje}
            onCancelar={fecharForm}
            onSalvo={salvo}
            onCategoriaCriada={(c) => setCriadas((a) => [...a, c])}
          />
        </Modal>
      )}

      {gerenciando && (
        <Modal titulo={`Categorias de ${textos.singular}`} onFechar={() => setGerenciando(false)}>
          <CategoriasGerenciador tipo={tipo} categorias={categorias} />
        </Modal>
      )}

      {excluindo && (
        <Modal titulo={`Excluir ${textos.singular}`} descricao={excluindo.descricao} onFechar={() => setExcluindo(null)}>
          <div className="space-y-5">
            <p className="text-[13.5px] leading-relaxed text-texto-2">
              {money(excluindo.valor)} em {diaBR(excluindo.dia)}. A exclusão é definitiva e some dos totais do financeiro.
            </p>
            <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
              <Botao variante="secundario" onClick={() => setExcluindo(null)} disabled={pendente}>Cancelar</Botao>
              <Botao variante="perigo" onClick={confirmarExclusao} disabled={pendente}>
                {pendente ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Excluir
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
