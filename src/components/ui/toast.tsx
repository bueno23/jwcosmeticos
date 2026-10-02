'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'

type Aviso = { id: number; texto: string; tipo: 'ok' | 'erro' }
const Ctx = createContext<(texto: string, tipo?: 'ok' | 'erro') => void>(() => {})

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const mostrar = useCallback((texto: string, tipo: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex flex-col gap-2">
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`card flex items-center gap-2.5 px-4 py-3 text-sm shadow-lg ${
              a.tipo === 'ok' ? 'border-positivo/40' : 'border-negativo/40'
            }`}
          >
            {a.tipo === 'ok'
              ? <Check size={16} className="text-positivo" />
              : <AlertCircle size={16} className="text-negativo" />}
            {a.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
