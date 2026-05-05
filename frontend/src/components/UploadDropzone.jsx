import { motion } from 'framer-motion';
import { FileText, FileUp, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { GlassCard } from './ui';

export default function UploadDropzone({ onFileSelect, fileName, isAnalyzing = false }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const openFilePicker = () => inputRef.current?.click();

  const handleFiles = files => {
    const selectedFile = files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  return (
    <GlassCard
      className={[
        'group p-6 transition sm:p-8',
        isDragging ? 'border-teal-300/50 bg-teal-400/10' : 'hover:border-white/20',
      ].join(' ')}
      onClick={openFilePicker}
      onDragEnter={event => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={event => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        accept=".pdf,.docx"
        className="hidden"
        type="file"
        onChange={event => handleFiles(event.target.files)}
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="rounded-2xl bg-gradient-to-br from-teal-400/20 via-cyan-300/15 to-gold-400/10 p-3 text-teal-100 ring-1 ring-white/10"
          >
            <UploadCloud className="h-7 w-7" />
          </motion.div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-teal-200/80">Upload resume</p>
            <p className="mt-2 text-lg font-semibold text-white sm:text-xl">Drag and drop your resume</p>
            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">
              Upload a PDF or DOCX file. The analyzer extracts text, detects technical skills, compares it against a job description, and stores the result in MongoDB.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/40 px-5 py-4 text-sm text-slate-200">
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Selected file</p>
          <div className="mt-3 flex items-center gap-3 text-base font-medium text-white">
            <FileText className="h-4 w-4 text-gold-400" />
            <span className="max-w-[18rem] truncate">{fileName || 'No file selected yet'}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">PDF, DOCX, and browser drag-and-drop are supported.</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          className="btn-primary glow-border"
          type="button"
          aria-label="Choose resume file"
          onClick={event => {
            event.stopPropagation();
            openFilePicker();
          }}
        >
          <FileUp className="h-4 w-4" />
          {isAnalyzing ? 'Analyzing...' : 'Upload resume'}
        </button>

        {isAnalyzing ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/6 bg-white/4 px-4 py-2 text-sm text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--primary-400)' }} />
            Upload in progress
          </span>
        ) : null}
      </div>
    </GlassCard>
  );
}
