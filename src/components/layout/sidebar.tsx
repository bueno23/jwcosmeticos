'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  BarChart3, Boxes, ChevronDown, LayoutDashboard, Settings, ShoppingCart, Truck, Users, X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { podeConfigurar, podeGerenciarEstoque, podeVerFinanceiro, podeVerRelatorios } from '@/lib/auth/papeis'
import type { Role } from '@/generated/prisma'

type Filho = { label: string; href: string; requer?: (role: Role) => boolean }
type Item = { label: string; href: string; icon: React.ElementType; filhos?: Filho[]; requer?: (role: Role) => boolean }

/**
 * "Gerenciar estoque" some para o operador, mas "Produtos" e "Categorias"
 * continuam: ele precisa consultar o que existe, só não mudar o saldo.
 */
const MENU: Item[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    label: 'Estoque', href: '/estoque', icon: Boxes,
    filhos: [
      { label: 'Produtos', href: '/estoque/produtos' },
      { label: 'Categorias', href: '/estoque/categorias' },
      { label: 'Entrada de estoque', href: '/estoque/entradas', requer: podeGerenciarEstoque },
      { label: 'Ajustes de estoque', href: '/estoque/ajustes', requer: podeGerenciarEstoque },
      { label: 'Inventário', href: '/estoque/inventario', requer: podeGerenciarEstoque },
    ],
  },
  {
    label: 'Vendas', href: '/vendas', icon: ShoppingCart,
    filhos: [
      { label: 'Nova venda', href: '/vendas/nova' },
      { label: 'Vendas realizadas', href: '/vendas' },
      { label: 'Cancelamentos', href: '/vendas/cancelamentos', requer: podeVerFinanceiro },
    ],
  },
  { label: 'Relatórios', href: '/relatorios', icon: BarChart3, requer: podeVerRelatorios },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Fornecedores', href: '/fornecedores', icon: Truck },
  { label: 'Configurações', href: '/configuracoes', icon: Settings, requer: podeConfigurar },
]

export function Sidebar({ aberta, onFechar, papel }: { aberta: boolean; onFechar: () => void; papel: Role }) {
  const pathname = usePathname()
  const menu = MENU
    .filter((m) => !m.requer || m.requer(papel))
    .map((m) => (m.filhos ? { ...m, filhos: m.filhos.filter((f) => !f.requer || f.requer(papel)) } : m))
    // um grupo sem nenhum filho visível não pode virar submenu vazio
    .filter((m) => !m.filhos || m.filhos.length > 0)

  const secaoAtual = menu.find((m) => m.filhos && m.href !== '/' && pathname.startsWith(m.href))?.label ?? null
  const [expandido, setExpandido] = useState<string | null>(secaoAtual)
  const [secaoAnterior, setSecaoAnterior] = useState(secaoAtual)

  // navegar para outra seção abre o grupo correspondente. Ajustar durante o
  // render em vez de num effect evita o ciclo de renders que o efeito causaria.
  if (secaoAnterior !== secaoAtual) {
    setSecaoAnterior(secaoAtual)
    if (secaoAtual) setExpandido(secaoAtual)
  }

  return (
    <>
      {aberta && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onFechar} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-borda bg-superficie transition-transform lg:static lg:translate-x-0',
          aberta ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <Image src="/brand/logo.png" alt="JW Cosméticos" width={44} height={44} className="rounded-full" priority />
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">JW Cosméticos</div>
            <div className="text-xs text-texto-3">Gestão da loja</div>
          </div>
          <button className="ml-auto text-texto-3 lg:hidden" onClick={onFechar} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {menu.map((item) => {
            const Icon = item.icon
            const ativo = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            const aberto = expandido === item.label

            return (
              <div key={item.label} className="mb-0.5">
                {item.filhos ? (
                  <button
                    onClick={() => setExpandido(aberto ? null : item.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      ativo ? 'bg-dourado/10 text-dourado' : 'text-texto-2 hover:bg-superficie-2 hover:text-texto',
                    )}
                    aria-expanded={aberto}
                  >
                    <Icon size={18} />
                    {item.label}
                    <ChevronDown size={15} className={cn('ml-auto transition-transform', aberto && 'rotate-180')} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onFechar}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      ativo ? 'bg-dourado text-preto' : 'text-texto-2 hover:bg-superficie-2 hover:text-texto',
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                )}

                {item.filhos && aberto && (
                  <div className="mb-1 ml-[26px] border-l border-borda pl-3">
                    {item.filhos.map((filho) => (
                      <Link
                        key={filho.href}
                        href={filho.href}
                        onClick={onFechar}
                        className={cn(
                          'block rounded-md px-3 py-2 text-[13px] transition-colors',
                          pathname === filho.href ? 'text-dourado' : 'text-texto-3 hover:text-texto',
                        )}
                      >
                        {filho.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-borda px-5 py-4 text-xs text-texto-3">
          <div className="font-medium text-texto-2">JW Cosméticos</div>
          v1.0.0
        </div>
      </aside>
    </>
  )
}
