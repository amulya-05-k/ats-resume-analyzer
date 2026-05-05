import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { CloudArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../api/axios.js'
import ScoreGauge from '../components/ScoreGauge.jsx'
import KeywordChart from '../components/KeywordChart.jsx'
import clsx from 'clsx'

export default function Analyzer() {
  const [file, setFile] = useState(null)
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    multiple: false,
    maxSize: 16 * 1024 * 1024,
    onDropRejected: () => toast.error('File rejected. Use a PDF or DOCX under 16 MB.'),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Please upload a resume'); return }
    if (!jobDescription.trim()) { toast.error('Please enter a job description'); return }

    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('resume', file)
      formData.append('job_description', jobDescription)
      formData.append('job_title', jobTitle)

      const res = await api.post('/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data.analysis)
      toast.success('Analysis complete!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const Chip = ({ label, variant }) => (
    <span
      className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-1 mb-1', {
        'bg-green-100 text-green-700': variant === 'matched',
        'bg-red-100 text-red-700': variant === 'missing',
      })}
    >
      {label}
    </span>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">ATS Resume Analyzer</h1>
      <p className="text-gray-500 mb-8">Upload your resume and paste a job description to see how well you match.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left — Upload form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            )}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-800 truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="ml-2 text-gray-400 hover:text-red-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <CloudArrowUpIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Drag & drop your resume here</p>
                <p className="text-xs text-gray-400 mt-1">PDF or DOCX, max 16 MB</p>
              </>
            )}
          </div>

          {/* Job title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title (optional)</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Job description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description *</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              placeholder="Paste the full job description here…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Analyzing…
              </>
            ) : (
              'Analyze Resume'
            )}
          </button>
        </form>

        {/* Right — Results */}
        {result ? (
          <div className="space-y-6">
            {/* Score */}
            <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">ATS Score</h2>
              <ScoreGauge score={result.ats_score} />
              <div className="mt-4 grid grid-cols-2 gap-4 w-full text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Semantic</p>
                  <p className="text-xl font-bold text-blue-600">{result.semantic_score?.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Keywords</p>
                  <p className="text-xl font-bold text-blue-600">{result.keyword_score?.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Keyword chart */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Keyword Analysis</h2>
              <KeywordChart matched={result.matched_keywords} missing={result.missing_keywords} />
            </div>

            {/* Keyword chips */}
            <div className="bg-white rounded-2xl shadow p-6 space-y-4">
              {result.matched_keywords?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-2">✅ Matched Keywords</h3>
                  <div>{result.matched_keywords.map((k) => <Chip key={k} label={k} variant="matched" />)}</div>
                </div>
              )}
              {result.missing_keywords?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">❌ Missing Keywords</h3>
                  <div>{result.missing_keywords.map((k) => <Chip key={k} label={k} variant="missing" />)}</div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {result.suggestions?.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">💡 Suggestions</h2>
                <ul className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center bg-gray-100 rounded-2xl text-gray-400 text-sm min-h-64">
            Results will appear here after analysis
          </div>
        )}
      </div>
    </div>
  )
}
