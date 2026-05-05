import { motion } from 'framer-motion';
import { BadgeCheck, AlertTriangle } from 'lucide-react';
import { GlassCard, ProgressBar, SectionHeading } from './ui';

function SkillGroup({ title, icon: Icon, items, tone }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">{title}</h3>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? (
          items.map(item => (
            <span key={item} className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-sm text-slate-100">
              {item}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-400">No data yet.</p>
        )}
      </div>
    </GlassCard>
  );
}

function EntityGroup({ title, items }) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? (
          items.map(item => (
            <span key={`${item.label}-${item.text}`} className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-sm text-slate-100">
              <span className="mr-2 text-xs uppercase tracking-[0.2em] text-teal-300">{item.label}</span>
              {item.text}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-400">No entities detected yet.</p>
        )}
      </div>
    </GlassCard>
  );
}

function SectionGroup({ title, items, tone }) {
  return (
    <GlassCard className="p-5">
      <h3 className={`text-sm font-semibold uppercase tracking-[0.3em] ${tone}`}>{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? (
          items.map(item => (
            <span key={item} className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-sm text-slate-100">
              {item}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-400">No data yet.</p>
        )}
      </div>
    </GlassCard>
  );
}

export default function SkillsPanel({
  matchedSkills = [],
  missingSkills = [],
  missingKeywords = [],
  extractedEntities = [],
  identifiedSections = [],
  missingSections = [],
  skillsByCategory = {},
  softSkills = [],
  educationKeywords = [],
  experienceKeywords = [],
  skillFrequency = {},
  resumeStrengths = [],
  jobDescription = '',
}) {
  const hasJobDescription = Boolean(jobDescription.trim());
  const topSkills = Object.entries(skillFrequency)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 6);

  return (
    <GlassCard className="p-6">
      <SectionHeading
        eyebrow="Skills analysis"
        title="Technical and contextual skill extraction"
        subtitle="Matched skills, missing signals, and section coverage presented in a recruiter-friendly layout."
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <SkillGroup title="Matched Skills" icon={BadgeCheck} items={matchedSkills} tone="text-teal-300" />
        <SkillGroup title="Missing Skills" icon={AlertTriangle} items={missingSkills} tone="text-rose-300" />

        <GlassCard className="p-5 xl:col-span-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gold-400" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Missing Keywords</h3>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {missingKeywords.length ? (
              missingKeywords.map(item => (
                <span key={item} className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-sm text-rose-100">
                  {item}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                {hasJobDescription ? 'No missing keywords detected for this JD.' : 'Paste a job description to calculate missing keywords.'}
              </p>
            )}
          </div>
        </GlassCard>

        <EntityGroup title="Extracted Entities" items={extractedEntities} />
        <SectionGroup title="Identified Sections" items={identifiedSections} tone="text-sky-200" />
        <SectionGroup title="Missing Sections" items={missingSections} tone="text-rose-200" />
        <SkillGroup title="Soft Skills" icon={BadgeCheck} items={softSkills} tone="text-violet-300" />
        <SkillGroup title="Education Keywords" icon={BadgeCheck} items={educationKeywords} tone="text-cyan-300" />
        <SkillGroup title="Experience Keywords" icon={BadgeCheck} items={experienceKeywords} tone="text-amber-300" />
        <SkillGroup title="Resume Strengths" icon={BadgeCheck} items={resumeStrengths} tone="text-emerald-300" />

        <GlassCard className="p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Skills by Category</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {Object.keys(skillsByCategory).length ? (
              Object.entries(skillsByCategory).map(([category, items]) => (
                <div key={category} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{category.split('_').join(' ')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map(item => (
                      <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No skill categories detected yet.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Skill Frequency</h3>
            <p className="text-xs text-slate-400">Top repeated signals in the resume</p>
          </div>
          <div className="mt-5 space-y-4">
            {topSkills.length ? (
              topSkills.map(([skill, freq]) => (
                <div key={skill}>
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                    <span>{skill}</span>
                    <span className="text-slate-400">{freq} mentions</span>
                  </div>
                  <ProgressBar value={Math.min(100, freq * 18)} className="mt-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No repeated skill mentions detected yet.</p>
            )}
          </div>
        </GlassCard>
      </div>
    </GlassCard>
  );
}
