import { AppShell } from '@/components/layout/app-shell'
import { usuarioObrigatorio } from '@/lib/auth/dal'

// O proxy já barra quem não tem sessão; aqui confirmamos contra o banco,
// porque token válido não quer dizer usuário ativo.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioObrigatorio()

  return (
    <AppShell
      usuario={{ nome: usuario.name, email: usuario.email, papel: usuario.role, empresa: usuario.companyName }}
    >
      {children}
    </AppShell>
  )
}
