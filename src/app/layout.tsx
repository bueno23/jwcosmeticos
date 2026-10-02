import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'JW Cosméticos — Gestão',
  description: 'Estoque, vendas e financeiro da JW Cosméticos Multimarcas.',
  icons: { icon: '/brand/logo-sm.png', apple: '/brand/logo.png' },
}

// Só o esqueleto. O shell com sidebar/topbar fica no grupo (app), para a tela
// de login aparecer sem menu.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  )
}
