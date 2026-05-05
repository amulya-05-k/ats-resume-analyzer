import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../api/axios.js'
import { useAuth } from '../context/AuthContext.jsx'
import clsx from 'clsx'

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={clsx('text-4xl font-bold', color)}>{value}</p>
    </div>
  )
}

function scoreColor(score) {
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/stats'), api.get('/analyses?per_page=50')])
      .then(([statsRes, analysesRes]) => {
        setStats(statsRes.data)
        setAnalyses(analysesRes.data.analyses)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 mt-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  // Build chart data from analyses (reverse chronological → oldest first for chart)
  const chartData = [...analyses]
    .reverse()
    .map((a, i) => ({
      name: a.job_title || `#${i + 1}`,
      score: a.ats_score,
      date: new Date(a.created_at).toLocaleDateString(),
    }))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome back, {user?.username}!</p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total Analyses" value={stats?.total ?? 0} color="text-blue-600" />
        <StatCard label="Average Score" value={`${stats?.average_score ?? 0}%`} color="text-purple-600" />
        <StatCard label="Best Score" value={`${stats?.best_score ?? 0}%`} color="text-green-600" />
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
          <p className="text-lg font-medium">No analyses yet.</p>
          <p className="text-sm mt-1">Head over to the Analyzer to get started!</p>
        </div>
      ) : (
        <>
          {/* Score trend chart */}
          <div className="bg-white rounded-2xl shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Score Trend</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'ATS Score']} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* History table */}
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-700">Analysis History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['File', 'Job Title', 'ATS Score', 'Semantic', 'Keywords', 'Date'].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analyses.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-800 max-w-xs truncate">{a.filename}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{a.job_title || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={clsx('text-sm font-bold', scoreColor(a.ats_score))}>
                          {a.ats_score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{a.semantic_score?.toFixed(1)}%</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{a.keyword_score?.toFixed(1)}%</td>
                      <td className="px-6 py-3 text-sm text-gray-400">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
