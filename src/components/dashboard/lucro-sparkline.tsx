'use client'

import { Bar, BarChart, Cell, ResponsiveContainer } from 'recharts'

export function LucroSparkline({ dados }: { dados: { lucro: number }[] }) {
  return (
    <div className="h-[72px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="lucro" radius={[3, 3, 0, 0]} animationDuration={450}>
            {dados.map((d, i) => (
              <Cell key={i} fill={d.lucro >= 0 ? '#F5C518' : '#EF4444'} fillOpacity={i === dados.length - 1 ? 1 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
