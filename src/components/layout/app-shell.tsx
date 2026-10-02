'use client'

import { useState } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import type { Role } from '@/generated/prisma'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export type UsuarioShell = {
  nome: string
  email: string
  papel: Role
  empresa: string
}

export function AppShell({ usuario, children }: { usuario: UsuarioShell; children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <ToastProvider>
    <div className="flex min-h-screen">
      <Sidebar aberta={menuAberto} onFechar={() => setMenuAberto(false)} papel={usuario.papel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onAbrirMenu={() => setMenuAberto(true)} usuario={usuario} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
    </ToastProvider>
  )
}
