import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'JW Cosméticos — Gestão',
  description: 'Estoque, vendas e financeiro da JW Cosméticos Multimarcas.',
  icons: { icon: '/brand/logo-sm.png', apple: '/brand/logo.png' },
}

// Lê o tema salvo antes da primeira pintura, pra não piscar preto→branco.
const SCRIPT_TEMA = `
(function () {
  try {
    if (localStorage.getItem('jw-tema') === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  } catch (e) {}
})();
`

// Só o esqueleto. O shell com sidebar/topbar fica no grupo (app), para a tela
// de login aparecer sem menu.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Script id="tema-boot" strategy="beforeInteractive">{SCRIPT_TEMA}</Script>
        {children}
      </body>
    </html>
  )
}
