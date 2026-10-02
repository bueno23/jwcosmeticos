'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

export function Modal({
  titulo, descricao, onFechar, children, largura = 'max-w-lg',
}: {
  titulo: string
  descricao?: string
  onFechar: () => void
  children: React.ReactNode
  largura?: string
}) {
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', fechar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fechar)
      document.body.style.overflow = ''
    }
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" onClick={onFechar}>
      <div
        className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none sm:rounded-b-[14px] ${largura}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="flex items-start gap-3 border-b border-borda px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-[12.5px] text-texto-3">{descricao}</p>}
          </div>
          <button onClick={onFechar} className="ml-auto text-texto-3 hover:text-texto" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
