'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Campo({
  label, hint, erro, children, className,
}: {
  label: string
  hint?: string
  erro?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[12.5px] font-medium text-texto-2">{label}</span>
      {children}
      {erro ? (
        <span className="mt-1 block text-[12px] text-negativo">{erro}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-texto-3">{hint}</span>
      ) : null}
    </label>
  )
}

export const inputClass =
  'focus-dourado w-full rounded-lg border border-borda bg-superficie-2 px-3 py-2.5 text-sm text-texto placeholder:text-texto-3'

/**
 * Select controlado por definição: `value` e `onChange` são obrigatórios de propósito,
 * porque um select sem controle manda a primeira opção mesmo quando a tela mostra outra.
 */
export function CampoSelecao({
  label, hint, erro, children, className, placeholder, value, onChange, name,
}: {
  label: string
  hint?: string
  erro?: string
  children: React.ReactNode
  className?: string
  placeholder?: string
  value: string
  onChange: (valor: string) => void
  name: string
}) {
  return (
    <Campo label={label} hint={hint} erro={erro} className={className}>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, 'appearance-none')}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </select>
    </Campo>
  )
}

export function Caixa({
  checked, onChange, label, descricao, name, disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  descricao?: string
  name?: string
  disabled?: boolean
}) {
  return (
    <label className={cn('flex items-start gap-2.5', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="focus-dourado peer h-4 w-4 cursor-pointer appearance-none rounded border border-borda-clara bg-superficie-2 checked:border-dourado checked:bg-dourado disabled:cursor-not-allowed"
        />
        <Check
          size={12}
          strokeWidth={3.5}
          className="pointer-events-none absolute text-preto opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="text-[13.5px] leading-tight">
        <span className="font-medium text-texto">{label}</span>
        {descricao && <span className="mt-0.5 block text-[12px] text-texto-3">{descricao}</span>}
      </span>
    </label>
  )
}

export function Botao({
  children, variante = 'primario', className, ...props
}: {
  variante?: 'primario' | 'secundario' | 'perigo'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variante === 'primario' && 'bg-dourado text-preto hover:bg-dourado-escuro',
        variante === 'secundario' && 'border border-borda bg-superficie-2 text-texto hover:border-borda-clara',
        variante === 'perigo' && 'border border-negativo/40 text-negativo hover:bg-negativo/10',
        className,
      )}
    >
      {children}
    </button>
  )
}
