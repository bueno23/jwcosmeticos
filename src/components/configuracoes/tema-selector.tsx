'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tema = 'dark' | 'light'

const CHAVE = 'jw-tema'

function aplicarTema(tema: Tema) {
  if (tema === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // modo privado ou localStorage bloqueado: só não persiste entre sessões
  }
}

export function TemaSelector() {
  const [tema, setTema] = useState<Tema | null>(null)

  useEffect(() => {
    const atual = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
    // lê o atributo que o script de boot já aplicou no <html>: só existe no cliente
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(atual)
  }, [])

  function escolher(novo: Tema) {
    setTema(novo)
    aplicarTema(novo)
  }

  const OPCOES: { valor: Tema; label: string; icone: typeof Sun }[] = [
    { valor: 'dark', label: 'Preto', icone: Moon },
    { valor: 'light', label: 'Branco', icone: Sun },
  ]

  return (
    <div className="grid max-w-xs grid-cols-2 gap-2" role="radiogroup" aria-label="Cor de fundo da tela">
      {OPCOES.map((o) => {
        const Icone = o.icone
        // antes de montar no cliente, não sabemos o tema salvo: evita piscar o estado errado
        const ativo = tema === null ? o.valor === 'dark' : tema === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => escolher(o.valor)}
            className={cn(
              'flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-[13px] font-medium transition-colors',
              ativo ? 'border-dourado bg-dourado/15 text-dourado' : 'border-borda bg-superficie-2 text-texto-2 hover:border-borda-clara',
            )}
          >
            <Icone size={18} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
