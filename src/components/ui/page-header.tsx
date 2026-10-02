export function PageHeader({
  titulo, descricao, acao,
}: {
  titulo: string
  descricao?: string
  acao?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-texto-2">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}
