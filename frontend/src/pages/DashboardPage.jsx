import { ArrowRight, CheckCircle2, FileUp, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import AnalysisCharts from '../components/AnalysisCharts';
import HistoryPanel from '../components/HistoryPanel';
import MetricCard from '../components/MetricCard';
import NlpInsightsPanel from '../components/NlpInsightsPanel';
import ScoreCard from '../components/ScoreCard';
import SkillsPanel from '../components/SkillsPanel';
import SuggestionsPanel from '../components/SuggestionsPanel';
import UploadDropzone from '../components/UploadDropzone';
import { GlassCard, SectionHeading } from '../components/ui';
import useResumeAnalysis from '../hooks/useResumeAnalysis';

export default function DashboardPage() {
  const { history, currentAnalysis, loading, historyLoading, error, submitResume, setCurrentAnalysis } = useResumeAnalysis();
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleAnalyze = async event => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }
    setSuccessMessage('');
    setStatusMessage('Uploading resume and running NLP analysis...');
    try {
      const result = await submitResume(selectedFile, jobDescription);
      setSuccessMessage(`Analysis completed for ${selectedFile.name}. ATS score: ${result.ats_score}.`);
      setStatusMessage('Analysis finished successfully.');
    } catch {
      setStatusMessage('Analysis failed. Check the error details below and try again.');
    }
  };

  const overview = useMemo(() => {
    if (!currentAnalysis) {
      return [
        { label: 'Matched Skills', value: '0', helper: 'Upload a resume to extract technical keywords.' },
        { label: 'Missing Keywords', value: '0', helper: 'Compare against a job description to find gaps.' },
        { label: 'Semantic Match', value: '0%', helper: 'Sentence Transformer similarity between resume and job description.' },
        { label: 'Resume Length', value: '0 words', helper: 'Text extraction runs automatically for PDF and DOCX.' },
      ];
    }

    return [
      {
        label: 'Matched Skills',
        value: String((currentAnalysis.matchedSkills || currentAnalysis.matched_skills || []).length || 0),
        helper: 'Technical skills detected with spaCy phrase matching.',
      },
      {
        label: 'Missing Keywords',
        value: String((currentAnalysis.missingKeywords || currentAnalysis.missing_keywords || []).length || 0),
        helper: 'Keywords that should be added or emphasized.',
      },
      {
        label: 'Semantic Match',
        value: `${currentAnalysis.semanticMatch ?? currentAnalysis.semantic_match_percentage ?? 0}%`,
        helper: 'Embedding-based cosine similarity across the resume and job description.',
      },
      {
        label: 'Technical Match',
        value: `${currentAnalysis.technicalMatch ?? currentAnalysis.technical_match_percentage ?? 0}%`,
        helper: 'Required skill alignment score from JD analysis.',
      },
    ];
  }, [currentAnalysis]);

  const matchedSkills = currentAnalysis?.matchedSkills || currentAnalysis?.matched_skills || [];
  const missingKeywords = currentAnalysis?.missingKeywords || currentAnalysis?.missing_keywords || [];
  const semanticMatch = currentAnalysis?.semanticMatch ?? currentAnalysis?.semantic_match_percentage ?? 0;
  const atsScore = currentAnalysis?.atsScore ?? currentAnalysis?.ats_score ?? 0;
  const hasAnalysis = Boolean(currentAnalysis);

  return (
    <div className="space-y-6 pb-4">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/35 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(247,183,49,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-teal-100/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-3 py-1.5">
                <Sparkles className="h-4 w-4" />
                Smart ATS review
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-gold-400" />
                MongoDB history logging
              </span>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-teal-200/80">AI Resume Analyzer</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
                A premium ATS dashboard for semantic matching, skill extraction, and recruiter-ready insights.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                Upload a resume, compare it against a job description, and get structured feedback on matched skills, missing keywords, semantic similarity, and ATS score quality.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-gold-400 px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_0_32px_rgba(45,212,191,0.25)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_42px_rgba(45,212,191,0.32)]"
                type="button"
                onClick={() => document.getElementById('resume-upload-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                <FileUp className="h-4 w-4" />
                Start analysis
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition duration-300 hover:border-white/20 hover:bg-white/10"
                type="button"
                onClick={() => document.getElementById('analysis-history')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                View history
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[32rem] lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Files</p>
              <p className="mt-2 text-2xl font-semibold text-white">PDF + DOCX</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Semantic</p>
              <p className="mt-2 text-2xl font-semibold text-white">{semanticMatch}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">ATS</p>
              <p className="mt-2 text-2xl font-semibold text-white">{atsScore}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <GlassCard id="resume-upload-card" className="p-6">
            <SectionHeading
              eyebrow="Upload"
              title="Analyze a resume against a job description"
              subtitle="Drop in a file, paste the job description, and let the model extract semantic and keyword signals automatically."
            />

            <form className="mt-6 space-y-4" onSubmit={handleAnalyze}>
              <UploadDropzone onFileSelect={setSelectedFile} fileName={selectedFile?.name} isAnalyzing={loading} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Job Description</span>
                <textarea
                  className="min-h-44 w-full rounded-[28px] border border-white/10 bg-slate-950/55 px-5 py-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-teal-300/50 focus:ring-4 focus:ring-teal-400/10"
                  placeholder="Paste the job description here to compare keywords and responsibilities..."
                  value={jobDescription}
                  onChange={event => setJobDescription(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-gold-400 px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_0_32px_rgba(45,212,191,0.2)] transition duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedFile || loading}
                  type="submit"
                >
                  {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/70 border-r-transparent" /> : <FileUp className="h-4 w-4" />}
                  {loading ? 'Analyzing...' : 'Analyze Resume'}
                </button>
                {selectedFile ? (
                  <p className="text-sm text-slate-300">Selected: {selectedFile.name}</p>
                ) : (
                  <p className="text-sm text-slate-400">Select a file to begin analysis.</p>
                )}
              </div>
            </form>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
            ) : null}
            {statusMessage ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{statusMessage}</div>
            ) : null}
            {successMessage ? (
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </div>
            ) : null}
          </GlassCard>

          {hasAnalysis ? (
            <AnalysisCharts analysis={currentAnalysis} />
          ) : (
            <GlassCard className="p-6">
              <SectionHeading
                eyebrow="Analytics"
                title="ATS score breakdown"
                subtitle="Run an analysis to render the live score composition and semantic signal chart."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-5">
                {overview.map(item => (
                  <MetricCard key={item.label} {...item} />
                ))}
              </div>
            </GlassCard>
          )}

          <SkillsPanel
            matchedSkills={matchedSkills}
            missingSkills={currentAnalysis?.missingSkills || currentAnalysis?.missing_skills || []}
            missingKeywords={missingKeywords}
            extractedEntities={currentAnalysis?.extractedEntities || currentAnalysis?.extracted_entities || []}
            identifiedSections={currentAnalysis?.identifiedSections || currentAnalysis?.identified_sections || []}
            missingSections={currentAnalysis?.missingSections || currentAnalysis?.missing_sections || []}
            skillsByCategory={currentAnalysis?.skillsByCategory || currentAnalysis?.skills_by_category || {}}
            softSkills={currentAnalysis?.softSkills || currentAnalysis?.soft_skills || []}
            educationKeywords={currentAnalysis?.educationKeywords || currentAnalysis?.education_keywords || []}
            experienceKeywords={currentAnalysis?.experienceKeywords || currentAnalysis?.experience_keywords || []}
            skillFrequency={currentAnalysis?.skillFrequency || currentAnalysis?.skill_frequency || {}}
            resumeStrengths={currentAnalysis?.resumeStrengths || currentAnalysis?.resume_strengths || []}
            jobDescription={jobDescription}
          />

          <NlpInsightsPanel analysis={currentAnalysis} />

          <SuggestionsPanel suggestions={currentAnalysis?.suggestions || []} />

          {hasAnalysis ? (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Extracted preview</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Resume text sample</h3>
                </div>
                <ArrowRight className="h-5 w-5 text-teal-300" />
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded-[24px] border border-white/10 bg-slate-950/45 p-5 text-sm leading-7 text-slate-200">
                {currentAnalysis.resume_text_preview}
              </p>
            </GlassCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <ScoreCard score={atsScore} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {overview.map(item => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>
          <div id="analysis-history">
            <HistoryPanel history={history} loading={historyLoading} onSelect={setCurrentAnalysis} />
          </div>
        </div>
      </section>
    </div>
  );
}
