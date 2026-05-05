import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

function scoreColor(score) {
  if (score >= 75) return '#22c55e'  // green
  if (score >= 50) return '#eab308'  // yellow
  return '#ef4444'                   // red
}

function scoreLabel(score) {
  if (score >= 75) return 'Excellent'
  if (score >= 50) return 'Average'
  return 'Poor'
}

export default function ScoreGauge({ score }) {
  const value = Math.round(score)
  const color = scoreColor(value)
  const remaining = 100 - value

  const data = [
    { name: 'Score', value },
    { name: 'Remaining', value: remaining },
  ]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={55}
              outerRadius={75}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
            <Tooltip formatter={(val, name) => name === 'Score' ? [`${val}%`, 'ATS Score'] : null} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold" style={{ color }}>{value}</span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <span
        className={clsx('mt-2 text-sm font-semibold px-3 py-1 rounded-full', {
          'bg-green-100 text-green-700': value >= 75,
          'bg-yellow-100 text-yellow-700': value >= 50 && value < 75,
          'bg-red-100 text-red-700': value < 50,
        })}
      >
        {scoreLabel(value)} Match
      </span>
    </div>
  )
}
