'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { money } from '@/lib/format'

type Fatia = { nome: string; cor: string; total: number; percentual: number }

export function CategoriasChart({ fatias, total }: { fatias: Fatia[]; total: number }) {
  return (
    <div className="flex flex-col items-center gap-6 p-5 sm:flex-row">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={fatias} dataKey="total" nameKey="nome" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none" animationDuration={450}>
              {fatias.map((f) => <Cell key={f.nome} fill={f.cor} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1A1A1D', border: '1px solid #33333A', borderRadius: 10, fontSize: 13 }}
              formatter={(valor, nome) => [money(Number(valor ?? 0)), String(nome ?? '')]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-[17px] font-bold">{money(total)}</span>
          <span className="text-[11px] text-texto-3">total do dia</span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {fatias.map((f) => (
          <li key={f.nome} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.cor }} />
            <span className="text-texto-2">{f.nome}</span>
            <span className="num ml-auto font-semibold">{f.percentual.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
