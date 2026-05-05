import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  timeout: 60000, // Increased timeout to 60s for file upload
  maxBodyLength: 20 * 1024 * 1024,
});

const SUPPORTED_RESUME_EXTENSIONS = new Set(['pdf', 'docx']);

function normalizeAnalysisPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const normalized = { ...payload };

  normalized.atsScore = payload.atsScore ?? payload.ats_score ?? 0;
  normalized.semanticMatch = payload.semanticMatch ?? payload.semantic_match_percentage ?? 0;
  normalized.matchedSkills = payload.matchedSkills ?? payload.matched_skills ?? [];
  normalized.missingKeywords = payload.missingKeywords ?? payload.missing_keywords ?? [];
  normalized.missingSkills = payload.missingSkills ?? payload.missing_skills ?? [];
  normalized.experienceRelevance = payload.experienceRelevance ?? payload.experience_relevance_percentage ?? 0;
  normalized.educationRelevance = payload.educationRelevance ?? payload.education_relevance_percentage ?? 0;
  normalized.keywordCoverage = payload.keywordCoverage ?? payload.keyword_coverage ?? 0;
  normalized.keywordDensity = payload.keywordDensity ?? payload.keyword_density ?? 0;
  normalized.technicalMatch = payload.technicalMatch ?? payload.technical_match_percentage ?? 0;
  normalized.structureScore = payload.structureScore ?? payload.structure_score ?? 0;
  normalized.jobDescriptionKeywords = payload.jobDescriptionKeywords ?? payload.job_description_keywords ?? [];
  normalized.jobDescriptionAnalysis = payload.jobDescriptionAnalysis ?? payload.job_description_analysis ?? {};
  normalized.extractedEntities = payload.extractedEntities ?? payload.extracted_entities ?? [];
  normalized.skillsByCategory = payload.skillsByCategory ?? payload.skills_by_category ?? {};
  normalized.identifiedSections = payload.identifiedSections ?? payload.identified_sections ?? [];
  normalized.missingSections = payload.missingSections ?? payload.missing_sections ?? [];
  normalized.sectionContent = payload.sectionContent ?? payload.section_content ?? {};
  normalized.actionVerbAnalysis = payload.actionVerbAnalysis ?? payload.action_verb_analysis ?? {};
  normalized.qualityChecks = payload.qualityChecks ?? payload.quality_checks ?? [];
  normalized.nlpInsights = payload.nlpInsights ?? payload.nlp_insights ?? {};
  normalized.totalWords = payload.totalWords ?? payload.total_words ?? 0;
  normalized.structuredExtraction = payload.structuredExtraction ?? payload.structured_extraction ?? {};

  return normalized;
}

function isSupportedResumeFile(file) {
  if (!file?.name) return false;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_RESUME_EXTENSIONS.has(extension);
}

function extractApiErrorMessage(error) {
  const responseDetail = error?.response?.data?.detail;
  const responseMessage = error?.response?.data?.message;
  const fallbackPayload = typeof error?.response?.data === 'string' ? error.response.data : null;

  if (Array.isArray(responseDetail)) {
    return responseDetail
      .map(item => {
        if (typeof item === 'string') return item;
        if (item?.msg) return item.msg;
        if (item?.message) return item.message;
        return JSON.stringify(item);
      })
      .join(', ');
  }

  return responseDetail || responseMessage || fallbackPayload || error?.message || 'Unknown API error';
}

// Add detailed request logging
api.interceptors.request.use(
  req => {
    const { url, method, data } = req;
    console.log(`[API Request] ${method?.toUpperCase()} ${url}`);
    console.log('[API] Base URL:', req.baseURL);
    if (data && data.get) {
      console.log('[API] FormData keys:', Array.from(data.keys()));
    }
    return req;
  },
  err => Promise.reject(err),
);

// Add detailed response logging
api.interceptors.response.use(
  res => {
    const { status, config, data } = res;
    console.log(`[API Response] ${config.method?.toUpperCase()} ${config.url} -> ${status}`);
    console.log('[API] Response data:', data);
    return res;
  },
  err => {
    const { response, request, message } = err;
    if (response) {
      console.error(
        `[API Error] ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`,
        response.data,
      );
    } else if (request) {
      console.error('[API Error] No response received:', message);
    } else {
      console.error('[API Error]', message);
    }
    return Promise.reject(err);
  },
);

export async function analyzeResume(file, jobDescription) {
  if (!file) {
    throw new Error('Please select a resume file to upload.');
  }

  if (!isSupportedResumeFile(file)) {
    throw new Error('Only PDF and DOCX files are supported.');
  }

  const formData = new FormData();
  formData.append('resume', file, file.name);
  formData.append('file', file, file.name);
  formData.append('job_description', jobDescription || '');
  console.log('[API] Upload start:', file?.name, file?.size, 'bytes');
  console.log('[API] Job description length:', (jobDescription || '').trim().length);
  const response = await api.post('/analyze', formData, {
    headers: {
      Accept: 'application/json',
    },
  });
  console.log('[API] Upload success');
  if (response?.data?.success === false) {
    throw new Error(response.data.message || 'Resume analysis failed');
  }
  return normalizeAnalysisPayload(response?.data?.data || response.data);
}

export function getApiErrorMessage(error) {
  return extractApiErrorMessage(error);
}

export async function getHistory() {
  const response = await api.get('/history');
  return (response.data || []).map(item => ({
    ...item,
    analysis: normalizeAnalysisPayload(item.analysis),
  }));
}

export async function getHistoryItem(id) {
  const response = await api.get(`/history/${id}`);
  return {
    ...response.data,
    analysis: normalizeAnalysisPayload(response.data?.analysis),
  };
}

export default api;
