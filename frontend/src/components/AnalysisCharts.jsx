import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GlassCard, ProgressBar, SectionHeading } from './ui';

const chartColors = ['#2dd4bf', '#f7b731', '#60a5fa', '#a78bfa', '#34d399'];

export default function AnalysisCharts({ analysis }) {
  const semantic = analysis?.semanticMatch ?? analysis?.semantic_match_percentage ?? 0;
  const technical = analysis?.technicalMatch ?? analysis?.technical_match_percentage ?? 0;
  const experience = analysis?.experienceRelevance ?? analysis?.experience_relevance_percentage ?? 0;
  const education = analysis?.educationRelevance ?? analysis?.education_relevance_percentage ?? 0;
  const keyword = analysis?.keywordCoverage ?? analysis?.keyword_coverage ?? 0;

  const data = analysis
    ? [
        { name: 'Semantic', value: semantic },
        { name: 'Technical', value: technical },
        { name: 'Experience', value: experience },
        { name: 'Education', value: education },
        { name: 'Keyword', value: keyword },
      ]
    : [
        { name: 'Semantic', value: 0 },
        { name: 'Technical', value: 0 },
        { name: 'Experience', value: 0 },
        { name: 'Education', value: 0 },
        { name: 'Keyword', value: 0 },
      ];

  return (
    <GlassCard className="p-6">
      <SectionHeading
        eyebrow="Analytics"
        title="ATS score breakdown"
        subtitle="Live metric view of semantic alignment, technical match, and resume quality factors."
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
          <div className="h-[22rem]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={40}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#cbd5e1" tickLine={false} axisLine={false} />
                <YAxis stroke="#cbd5e1" tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '16px',
                    color: '#e2e8f0',
                  }}
                  formatter={value => [`${value}%`, 'Score']}
                />
                <Bar dataKey="value" radius={[18, 18, 8, 8]}>
                  {data.map(entry => (
                    <Cell key={entry.name} fill={chartColors[data.findIndex(item => item.name === entry.name) % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Semantic Match</p>
            <div className="mt-3 text-4xl font-semibold text-white">{semantic}%</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">Embedding similarity between the resume and job description.</p>
            <ProgressBar value={semantic} className="mt-4" />
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Keyword Coverage</p>
            <div className="mt-3 text-4xl font-semibold text-white">{keyword}%</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">How many priority JD terms appear in the resume.</p>
            <ProgressBar value={keyword} className="mt-4" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
