import { cn } from '@/lib/cn'

export type Coluna<T> = {
  chave: string
  titulo: string
  alinhamento?: 'esquerda' | 'direita' | 'centro'
  render: (linha: T) => React.ReactNode
  className?: string
}

export function DataTable<T extends { id: string }>({
  colunas, linhas, vazio,
}: {
  colunas: Coluna<T>[]
  linhas: T[]
  vazio: React.ReactNode
}) {
  if (linhas.length === 0) return <>{vazio}</>

  const alinhar = (a?: Coluna<T>['alinhamento']) =>
    a === 'direita' ? 'text-right' : a === 'centro' ? 'text-center' : 'text-left'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-borda text-[12px] text-texto-3">
            {colunas.map((c) => (
              <th key={c.chave} className={cn('whitespace-nowrap px-4 py-3 font-medium first:pl-5 last:pr-5', alinhar(c.alinhamento))}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.id} className="border-b border-borda transition-colors last:border-0 hover:bg-superficie-2">
              {colunas.map((c) => (
                <td key={c.chave} className={cn('px-4 py-3 first:pl-5 last:pr-5', alinhar(c.alinhamento), c.className)}>
                  {c.render(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
