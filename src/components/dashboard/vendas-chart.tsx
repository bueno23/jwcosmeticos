'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money } from '@/lib/format'

type Ponto = { rotulo: string; dia: string; total: number; hoje: boolean }

export function VendasChart({ dados }: { dados: Ponto[] }) {
  return (
    <div className="h-[260px] w-full px-2 pb-2 pt-5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#26262A" />
          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#71717A', fontSize: 11 }}
            interval={0}
          />
          <YAxis
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: '#71717A', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(245,197,24,0.06)' }}
            contentStyle={{ background: '#1A1A1D', border: '1px solid #33333A', borderRadius: 10, fontSize: 13 }}
            labelStyle={{ color: '#A1A1AA' }}
            formatter={(valor) => [money(Number(valor ?? 0)), 'Faturamento']}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={46} animationDuration={450}>
            {dados.map((p, i) => (
              <Cell key={i} fill={p.hoje ? '#F5C518' : '#C99C0B'} fillOpacity={p.hoje ? 1 : 0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
