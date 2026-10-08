'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Search, Store, User } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ROTULO_PAPEL } from '@/lib/auth/papeis'
import { sairAction } from '@/app/(auth)/login/actions'
import { useToast } from '@/components/ui/toast'
import type { UsuarioShell } from './app-shell'
import { TrocarSenhaModal } from './trocar-senha-modal'

export function Topbar({ onAbrirMenu, usuario }: { onAbrirMenu: () => void; usuario: UsuarioShell }) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [trocarSenhaAberta, setTrocarSenhaAberta] = useState(false)
  const toast = useToast()
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuAberto) return
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setMenuAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [menuAberto])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-borda bg-fundo/85 px-4 py-3 backdrop-blur lg:px-8">
      <button className="text-texto-2 lg:hidden" onClick={onAbrirMenu} aria-label="Abrir menu">
        <Menu size={22} />
      </button>

      <label className="relative hidden flex-1 md:block md:max-w-xl">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-3" />
        <input
          type="search"
          placeholder="Buscar produtos, categorias, clientes..."
          className="focus-dourado w-full rounded-lg border border-borda bg-superficie py-2.5 pl-10 pr-4 text-sm text-texto placeholder:text-texto-3"
        />
      </label>

      <div className="ml-auto flex items-center gap-3">
        <button className="relative rounded-lg border border-borda bg-superficie p-2 text-texto-2 hover:text-texto" aria-label="Notificações">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-negativo" />
        </button>

        <div className="relative" ref={caixa}>
          <button
            onClick={() => setMenuAberto((v) => !v)}
            aria-expanded={menuAberto}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-lg border border-borda bg-superficie px-3 py-1.5 transition-colors hover:border-borda-clara"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-dourado/15 text-dourado">
              <User size={15} />
            </span>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-[13px] font-semibold">{usuario.nome}</div>
              <div className="text-[11px] text-texto-3">{ROTULO_PAPEL[usuario.papel]}</div>
            </div>
            <ChevronDown size={14} className={cn('text-texto-3 transition-transform', menuAberto && 'rotate-180')} />
          </button>

          {menuAberto && (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-borda bg-superficie shadow-xl"
            >
              <div className="border-b border-borda px-4 py-3">
                <div className="text-[13px] font-semibold">{usuario.nome}</div>
                <div className="mt-0.5 truncate text-[11.5px] text-texto-3">{usuario.email}</div>
                <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-texto-2">
                  <Store size={12} className="text-texto-3" />
                  {usuario.empresa}
                </div>
                <div className="mt-2 inline-flex items-center rounded-md bg-dourado/15 px-2 py-0.5 text-[11px] font-semibold text-dourado">
                  {ROTULO_PAPEL[usuario.papel]}
                </div>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuAberto(false)
                  setTrocarSenhaAberta(true)
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto"
              >
                <KeyRound size={14} />
                Trocar senha
              </button>

              <form action={sairAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {trocarSenhaAberta && (
        <TrocarSenhaModal
          onFechar={() => setTrocarSenhaAberta(false)}
          onSucesso={(mensagem) => {
            setTrocarSenhaAberta(false)
            toast(mensagem, 'ok')
          }}
        />
      )}
    </header>
  )
}
