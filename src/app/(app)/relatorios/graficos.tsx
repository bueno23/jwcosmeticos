'use client'

import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { money } from '@/lib/format'

const TOOLTIP = {
  contentStyle: { background: '#1A1A1D', border: '1px solid #33333A', borderRadius: 10, fontSize: 13 },
  labelStyle: { color: '#A1A1AA' },
}
const EIXO = { fill: '#71717A', fontSize: 11 }
const abreviar = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))

export function GraficoVendasDia({ dados }: { dados: { rotulo: string; total: number }[] }) {
  return (
    <div className="h-[280px] w-full px-2 pb-2 pt-5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#26262A" />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={EIXO} minTickGap={14} />
          <YAxis tickFormatter={abreviar} tickLine={false} axisLine={false} width={44} tick={EIXO} />
          <Tooltip
            {...TOOLTIP}
            cursor={{ fill: 'rgba(245,197,24,0.06)' }}
            formatter={(v) => [money(Number(v ?? 0)), 'Faturamento']}
          />
          <Bar dataKey="total" fill="#F5C518" radius={[5, 5, 0, 0]} maxBarSize={38} animationDuration={450} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoFluxo({ dados }: { dados: { rotulo: string; entradas: number; saidas: number; acumulado: number }[] }) {
  return (
    <div className="h-[320px] w-full px-2 pb-2 pt-5">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#26262A" />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={EIXO} minTickGap={14} />
          <YAxis tickFormatter={abreviar} tickLine={false} axisLine={false} width={44} tick={EIXO} />
          <Tooltip {...TOOLTIP} cursor={{ fill: 'rgba(245,197,24,0.06)' }} formatter={(v, nome) => [money(Number(v ?? 0)), String(nome)]} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#A1A1AA' }} />
          <Bar dataKey="entradas" name="Entradas" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="saidas" name="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Line dataKey="acumulado" name="Saldo acumulado" stroke="#F5C518" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export type FatiaPagamento = { nome: string; cor: string; total: number; percentual: number }

export function GraficoPagamentos({ fatias, total }: { fatias: FatiaPagamento[]; total: number }) {
  const comValor = fatias.filter((f) => f.total > 0)
  return (
    <div className="flex flex-col items-center gap-6 p-5 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={comValor} dataKey="total" nameKey="nome" innerRadius={66} outerRadius={96} paddingAngle={2} stroke="none" animationDuration={450}>
              {comValor.map((f) => <Cell key={f.nome} fill={f.cor} />)}
            </Pie>
            <Tooltip {...TOOLTIP} formatter={(v, nome) => [money(Number(v ?? 0)), String(nome ?? '')]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-[17px] font-bold">{money(total)}</span>
          <span className="text-[11px] text-texto-3">no período</span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {fatias.map((f) => (
          <li key={f.nome} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.cor }} />
            <span className="text-texto-2">{f.nome}</span>
            <span className="num ml-auto text-texto-3">{money(f.total)}</span>
            <span className="num w-12 text-right font-semibold">{f.percentual.toFixed(1).replace('.', ',')}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
