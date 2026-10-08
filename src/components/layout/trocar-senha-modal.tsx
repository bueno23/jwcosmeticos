'use client'

import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { trocarSenhaAction } from './trocar-senha-actions'

export function TrocarSenhaModal({
  onFechar, onSucesso,
}: {
  onFechar: () => void
  onSucesso: (mensagem: string) => void
}) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setPendente(true)
    setErro(null)
    const r = await trocarSenhaAction(senhaAtual, novaSenha)
    setPendente(false)
    if (r.ok) onSucesso(r.mensagem ?? 'Senha alterada.')
    else setErro(r.mensagem ?? 'Não foi possível trocar a senha.')
  }

  return (
    <Modal titulo="Trocar senha" descricao="Sua senha de acesso ao sistema" onFechar={onFechar}>
      <form onSubmit={enviar} className="space-y-4">
        <Campo label="Senha atual">
          <input
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Nova senha" hint="Pelo menos 6 caracteres">
          <input
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Confirmar nova senha">
          <input
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className={inputClass}
          />
        </Campo>

        {erro && (
          <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
          <Botao type="button" variante="secundario" onClick={onFechar} disabled={pendente}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={pendente}>
            {pendente ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            Trocar senha
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
