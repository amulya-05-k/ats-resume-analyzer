from __future__ import annotations

import logging
import math
import re
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Sequence, Tuple

import numpy as np
import spacy
from spacy.language import Language
from spacy.matcher import PhraseMatcher
from spacy.util import filter_spans

try:
    from nltk.stem import PorterStemmer
except Exception:  # pragma: no cover - optional runtime dependency
    PorterStemmer = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - optional runtime dependency
    SentenceTransformer = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine_similarity
except Exception:  # pragma: no cover - optional runtime dependency
    TfidfVectorizer = None
    sklearn_cosine_similarity = None

try:
    from rapidfuzz import fuzz
except Exception:  # pragma: no cover - optional runtime dependency
    fuzz = None

from .skills_database import (
    SKILL_GROUPS,
    SKILL_SYNONYM_MAP,
    build_skill_lookup,
    build_skill_patterns,
    canonicalize_skill,
    group_skills_by_category,
)

logger = logging.getLogger(__name__)

MAX_RESUME_CHARS = 24000
MAX_JOB_CHARS = 10000
SEMANTIC_CHUNK_CHARS = 1200
FUZZY_SKILL_THRESHOLD = 89

ACTION_VERBS = {
    "built",
    "developed",
    "designed",
    "implemented",
    "created",
    "optimized",
    "led",
    "improved",
    "automated",
    "deployed",
    "reduced",
    "increased",
    "delivered",
    "shipped",
    "spearheaded",
    "architected",
    "launched",
    "scaled",
    "orchestrated",
    "resolved",
    "drove",
    "managed",
    "owned",
    "achieved",
}

LEADERSHIP_KEYWORDS = {
    "lead",
    "leadership",
    "mentored",
    "managed",
    "owner",
    "ownership",
    "strategy",
    "initiative",
}

CERTIFICATION_KEYWORDS = {
    "certified",
    "certification",
    "aws certified",
    "azure certified",
    "gcp certified",
    "oracle certified",
}

SECTION_ALIASES = {
    "summary": ["summary", "professional summary", "profile", "objective"],
    "skills": ["skills", "technical skills", "core skills", "competencies"],
    "experience": ["experience", "work experience", "professional experience", "employment history"],
    "projects": ["projects", "selected projects", "project experience"],
    "education": ["education", "academic background"],
    "certifications": ["certifications", "licenses", "credentials"],
    "awards": ["awards", "achievements", "honors"],
}

DOMAIN_HINTS = {
    "backend": ["api", "microservices", "distributed systems", "database", "backend", "server-side"],
    "frontend": ["react", "angular", "vue", "frontend", "ui", "ux", "web"],
    "data": ["data pipeline", "etl", "spark", "airflow", "analytics", "warehouse"],
    "ai_ml": ["machine learning", "deep learning", "nlp", "computer vision", "llm", "rag"],
    "devops": ["kubernetes", "docker", "ci/cd", "terraform", "sre", "monitoring"],
    "mobile": ["android", "ios", "swift", "kotlin", "react native", "flutter"],
}

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})")
WORD_PATTERN = re.compile(r"[a-zA-Z][a-zA-Z0-9.+#-]*")
METRIC_PATTERN = re.compile(r"\d+(?:\.\d+)?%|\$\d[\d,]*(?:\.\d+)?|\b\d+x\b|\b\d+(?:\.\d+)?\b")
EXPERIENCE_YEARS_PATTERN = re.compile(r"(\d{1,2})\+?\s+years?", flags=re.IGNORECASE)


@dataclass
class PreprocessResult:
    normalized_text: str
    tokens: List[str]
    lemmas: List[str]
    stems: List[str]


def normalize_text(text: str) -> str:
    text = (text or "").replace("\x00", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[^\S\n]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _dedupe_lines(text: str) -> str:
    lines = [line.strip() for line in normalize_text(text).splitlines() if line.strip()]
    seen = set()
    deduped: List[str] = []
    for line in lines:
        line_key = re.sub(r"\s+", " ", line.lower())
        if line_key in seen:
            continue
        seen.add(line_key)
        deduped.append(line)
    return "\n".join(deduped)


def clean_resume_text(text: str) -> str:
    cleaned = _dedupe_lines(text)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    return cleaned[:MAX_RESUME_CHARS]


def _trim_text(text: str, limit: int) -> str:
    text = normalize_text(text)
    return text[:limit]


def _normalize_keyword(term: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9.+#\-/ ]", " ", term.lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _tokenize(text: str) -> List[str]:
    return [token.lower() for token in WORD_PATTERN.findall(text or "")]


def _safe_stem(term: str) -> str:
    if PorterStemmer is None:
        for suffix in ("ing", "ed", "es", "s"):
            if term.endswith(suffix) and len(term) > len(suffix) + 2:
                return term[: -len(suffix)]
        return term
    return PorterStemmer().stem(term)


@lru_cache(maxsize=1)
def get_spacy_pipeline() -> Language:
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        nlp = spacy.blank("en")

    if "sentencizer" not in nlp.pipe_names:
        nlp.add_pipe("sentencizer")

    if "entity_ruler" not in nlp.pipe_names:
        nlp.add_pipe("entity_ruler", last=True)

    ruler = nlp.get_pipe("entity_ruler")
    if not getattr(ruler, "patterns", None):
        ruler.add_patterns(build_skill_patterns())

    return nlp


@lru_cache(maxsize=1)
def get_skill_matcher() -> PhraseMatcher:
    nlp = get_spacy_pipeline()
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    patterns = [nlp.make_doc(pattern["pattern"]) for pattern in build_skill_patterns()]
    matcher.add("SKILLS", patterns)
    return matcher


@lru_cache(maxsize=1)
def get_sentence_transformer() -> SentenceTransformer | None:
    if SentenceTransformer is None:
        return None
    try:
        return SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as exc:  # pragma: no cover
        logger.warning("SentenceTransformer unavailable, falling back to TF-IDF: %s", exc)
        return None


def preprocess_text(text: str) -> PreprocessResult:
    normalized = normalize_text(text)
    if not normalized:
        return PreprocessResult(normalized_text="", tokens=[], lemmas=[], stems=[])

    doc = get_spacy_pipeline()(normalized.lower())
    tokens: List[str] = []
    lemmas: List[str] = []
    stems: List[str] = []

    for token in doc:
        if token.is_space or token.is_punct or token.like_num or token.is_stop:
            continue
        raw = _normalize_keyword(token.text)
        lemma = _normalize_keyword(token.lemma_ or token.text)
        if not raw or len(raw) < 2:
            continue
        tokens.append(raw)
        lemmas.append(lemma or raw)
        stems.append(_safe_stem(lemma or raw))

    return PreprocessResult(
        normalized_text=normalized,
        tokens=tokens,
        lemmas=lemmas,
        stems=stems,
    )


def _build_ngrams(tokens: Sequence[str], min_size: int = 2, max_size: int = 4) -> List[str]:
    phrases: List[str] = []
    for size in range(min_size, max_size + 1):
        for start in range(0, max(0, len(tokens) - size + 1)):
            phrase = " ".join(tokens[start : start + size]).strip()
            if phrase:
                phrases.append(phrase)
    return phrases


def _extract_section_highlights(section_text: str, keywords: Iterable[str], limit: int = 6) -> List[str]:
    lowered = normalize_text(section_text).lower()
    highlights: List[str] = []
    seen = set()
    for keyword in keywords:
        normalized = _normalize_keyword(keyword)
        if not normalized:
            continue
        if re.search(rf"\b{re.escape(normalized)}\b", lowered) and keyword not in seen:
            seen.add(keyword)
            highlights.append(keyword)
        if len(highlights) >= limit:
            break
    return highlights


def _build_structured_extraction(
    resume_text: str,
    preprocessing: PreprocessResult,
    sections: Dict[str, str],
    identified_sections: Sequence[str],
    missing_sections: Sequence[str],
    matched_skills: Sequence[str],
    skill_frequency: Dict[str, int],
    skills_by_category: Dict[str, List[str]],
    education_keywords: Sequence[str],
    experience_keywords: Sequence[str],
) -> Dict[str, Any]:
    return {
        "preprocessing": {
            "normalized_text_preview": preprocessing.normalized_text[:400],
            "token_count": len(preprocessing.tokens),
            "unique_token_count": len(dict.fromkeys(preprocessing.tokens)),
            "lemma_count": len(preprocessing.lemmas),
            "stem_count": len(preprocessing.stems),
        },
        "skills": {
            "matched": list(matched_skills),
            "frequency": skill_frequency,
            "by_category": skills_by_category,
            "exact_coverage": _extract_exact_skills(resume_text),
        },
        "education": {
            "present": bool(sections.get("education")),
            "section_text": sections.get("education", ""),
            "keywords": list(education_keywords),
            "highlights": _extract_section_highlights(
                sections.get("education", ""),
                ["degree", "bachelor", "master", "phd", "b.tech", "m.tech", "mba", "bsc", "msc", "cgpa", "gpa"],
            ),
        },
        "experience": {
            "present": bool(sections.get("experience")),
            "section_text": sections.get("experience", ""),
            "keywords": list(experience_keywords),
            "highlights": _extract_section_highlights(
                sections.get("experience", ""),
                ["built", "developed", "implemented", "led", "managed", "optimized", "deployed", "shipped"],
            ),
        },
        "sections": {
            "identified": list(identified_sections),
            "missing": list(missing_sections),
            "content": {
                name: value
                for name, value in sections.items()
                if name in {"summary", "skills", "experience", "education", "projects", "certifications", "awards"}
            },
        },
    }


def _build_text_chunks(text: str, max_chunk_chars: int = SEMANTIC_CHUNK_CHARS) -> List[str]:
    cleaned = normalize_text(text)
    if not cleaned:
        return []
    if len(cleaned) <= max_chunk_chars:
        return [cleaned]

    doc = get_spacy_pipeline()(cleaned)
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for sentence in doc.sents:
        sentence_text = sentence.text.strip()
        if not sentence_text:
            continue
        if current_len + len(sentence_text) + 1 > max_chunk_chars and current:
            chunks.append(" ".join(current))
            current = [sentence_text]
            current_len = len(sentence_text)
        else:
            current.append(sentence_text)
            current_len += len(sentence_text) + 1

    if current:
        chunks.append(" ".join(current))

    return chunks[:16]


def _mean_embedding(text: str) -> np.ndarray | None:
    model = get_sentence_transformer()
    if model is None:
        return None

    chunks = _build_text_chunks(text)
    if not chunks:
        return None

    vectors = model.encode(chunks, convert_to_numpy=True, normalize_embeddings=True)
    if vectors.ndim == 1:
        return vectors
    return np.mean(vectors, axis=0)


def _cosine_similarity(left: np.ndarray, right: np.ndarray) -> float:
    denominator = float(np.linalg.norm(left) * np.linalg.norm(right))
    if denominator == 0:
        return 0.0
    return float(np.dot(left, right) / denominator)


def _fallback_semantic_similarity(resume_text: str, job_text: str) -> float:
    if TfidfVectorizer is not None and sklearn_cosine_similarity is not None:
        try:
            vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=700)
            matrix = vectorizer.fit_transform([resume_text, job_text])
            return float(sklearn_cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
        except Exception as exc:
            logger.debug("TF-IDF fallback failed: %s", exc)

    resume_terms = set(_tokenize(resume_text))
    job_terms = set(_tokenize(job_text))
    if not resume_terms or not job_terms:
        return 0.0
    overlap = len(resume_terms & job_terms)
    return overlap / max(1, len(job_terms))


def calculate_semantic_similarity(resume_text: str, job_text: str) -> float:
    resume_text = _trim_text(resume_text, MAX_RESUME_CHARS)
    job_text = _trim_text(job_text, MAX_JOB_CHARS)
    if not resume_text or not job_text:
        return 0.0

    resume_emb = _mean_embedding(resume_text)
    job_emb = _mean_embedding(job_text)

    if resume_emb is not None and job_emb is not None:
        score = _cosine_similarity(resume_emb, job_emb)
    else:
        score = _fallback_semantic_similarity(resume_text, job_text)

    return round(max(0.0, min(1.0, score)) * 100, 2)


def _extract_sections(text: str) -> Tuple[Dict[str, str], List[str], List[str], float]:
    lines = [line.strip() for line in normalize_text(text).splitlines() if line.strip()]
    if not lines:
        missing = list(SECTION_ALIASES.keys())
        return {}, [], missing, 0.0

    sections: Dict[str, List[str]] = {}
    current_section = "summary"
    sections[current_section] = []

    def find_section(line: str) -> str | None:
        lower = line.lower()
        for section, aliases in SECTION_ALIASES.items():
            for alias in aliases:
                if re.search(rf"\b{re.escape(alias)}\b", lower):
                    return section
        return None

    for line in lines:
        maybe_header = find_section(line)
        if maybe_header is not None:
            current_section = maybe_header
            sections.setdefault(current_section, [])
            continue
        sections.setdefault(current_section, []).append(line)

    final_sections = {name: "\n".join(value).strip() for name, value in sections.items() if "\n".join(value).strip()}
    identified = sorted(final_sections.keys())
    missing = [name for name in SECTION_ALIASES if name not in identified]
    section_score = round((len(identified) / len(SECTION_ALIASES)) * 100, 2)
    return final_sections, identified, missing, section_score


def _extract_exact_skills(text: str) -> List[str]:
    nlp = get_spacy_pipeline()
    matcher = get_skill_matcher()
    doc = nlp.make_doc(normalize_text(text))
    matches = matcher(doc)
    lookup = build_skill_lookup()
    skills: List[str] = []
    seen = set()

    for _, start, end in matches:
        term = doc[start:end].text.lower().strip()
        canonical = lookup.get(term, canonicalize_skill(term))
        if canonical not in seen:
            seen.add(canonical)
            skills.append(canonical)
    return skills


def _extract_fuzzy_skills(text: str) -> List[str]:
    if fuzz is None:
        return []

    clean_text = normalize_text(text).lower()
    tokens = _tokenize(clean_text)
    catalog = list(build_skill_lookup().keys())
    matched: List[str] = []
    seen = set()

    candidates = list(dict.fromkeys(tokens + _build_ngrams(tokens)))

    for candidate in candidates:
        if len(candidate) < 3:
            continue
        best_alias = ""
        best_score = 0
        for alias in catalog:
            score = fuzz.ratio(candidate, alias)
            if score > best_score:
                best_alias = alias
                best_score = score
            if len(candidate.split()) > 1 and hasattr(fuzz, "partial_ratio"):
                partial_score = fuzz.partial_ratio(candidate, alias)
                if partial_score > best_score:
                    best_alias = alias
                    best_score = partial_score
        if best_score >= FUZZY_SKILL_THRESHOLD:
            canonical = canonicalize_skill(best_alias)
            if canonical not in seen:
                seen.add(canonical)
                matched.append(canonical)

    return matched


def _skill_frequency(text: str, skills: Iterable[str]) -> Dict[str, int]:
    normalized = normalize_text(text).lower()
    frequency: Dict[str, int] = {}
    for skill in skills:
        pattern = re.compile(rf"\b{re.escape(skill.lower())}\b")
        count = len(pattern.findall(normalized))
        if count <= 0:
            aliases = [alias for alias, canonical in build_skill_lookup().items() if canonical.lower() == skill.lower()]
            count = sum(len(re.findall(rf"\b{re.escape(alias)}\b", normalized)) for alias in aliases)
        if count > 0:
            frequency[skill] = count
    return dict(sorted(frequency.items(), key=lambda item: item[1], reverse=True))


def extract_skills_advanced(text: str) -> Tuple[List[str], Dict[str, int], Dict[str, List[str]]]:
    exact = set(_extract_exact_skills(text))
    fuzzy = set(_extract_fuzzy_skills(text))

    synonym_hits = set()
    tokens = set(_tokenize(text.lower()))
    for token in tokens:
        if token in SKILL_SYNONYM_MAP:
            synonym_hits.add(SKILL_SYNONYM_MAP[token])

    all_skills = sorted(exact | fuzzy | synonym_hits)
    grouped = group_skills_by_category(all_skills)
    frequency = _skill_frequency(text, all_skills)
    return all_skills, frequency, grouped


def _extract_entities(text: str) -> List[Dict[str, str]]:
    doc = get_spacy_pipeline()(_trim_text(text, MAX_RESUME_CHARS))
    spans = filter_spans(list(doc.ents))
    items: List[Dict[str, str]] = []
    seen = set()
    for entity in spans:
        cleaned = entity.text.strip()
        if not cleaned:
            continue
        key = (cleaned.lower(), entity.label_)
        if key in seen:
            continue
        seen.add(key)
        items.append({"text": cleaned, "label": entity.label_})
    return items[:40]


def _extract_keyword_hits(text: str, candidates: Iterable[str]) -> List[str]:
    lowered = normalize_text(text).lower()
    hits: List[str] = []
    for candidate in candidates:
        normalized = _normalize_keyword(candidate)
        if not normalized:
            continue
        if re.search(rf"\b{re.escape(normalized)}\b", lowered):
            hits.append(candidate)
    return sorted(dict.fromkeys(hits))


def analyze_job_description(job_text: str) -> Dict[str, Any]:
    cleaned = _trim_text(job_text, MAX_JOB_CHARS)
    if not cleaned:
        return {
            "required_skills": [],
            "preferred_skills": [],
            "critical_keywords": [],
            "experience_level": "unspecified",
            "domain_type": "general",
            "priority_keywords": [],
        }

    jd_skills, _, _ = extract_skills_advanced(cleaned)
    lowered = cleaned.lower()

    required_cues = ["must have", "required", "mandatory", "need to", "essential"]
    preferred_cues = ["nice to have", "preferred", "plus", "good to have", "bonus"]

    required_skills: List[str] = []
    preferred_skills: List[str] = []

    for skill in jd_skills:
        skill_l = skill.lower()
        if any(cue in lowered and re.search(rf"{re.escape(cue)}[^\n.]*\b{re.escape(skill_l)}\b", lowered) for cue in required_cues):
            required_skills.append(skill)
        elif any(cue in lowered and re.search(rf"{re.escape(cue)}[^\n.]*\b{re.escape(skill_l)}\b", lowered) for cue in preferred_cues):
            preferred_skills.append(skill)

    if not required_skills:
        required_skills = jd_skills[: min(10, len(jd_skills))]

    years = [int(match.group(1)) for match in EXPERIENCE_YEARS_PATTERN.finditer(lowered)]
    if years:
        min_year = min(years)
        if min_year <= 1:
            experience_level = "entry"
        elif min_year <= 3:
            experience_level = "mid"
        else:
            experience_level = "senior"
    else:
        experience_level = "unspecified"

    domain_scores = {
        domain: sum(1 for hint in hints if hint in lowered)
        for domain, hints in DOMAIN_HINTS.items()
    }
    domain_type = max(domain_scores, key=domain_scores.get) if any(domain_scores.values()) else "general"

    tfidf_keywords: List[str] = []
    if TfidfVectorizer is not None:
        try:
            vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=40)
            matrix = vectorizer.fit_transform([cleaned])
            scores = matrix[0].toarray()[0]
            feature_names = vectorizer.get_feature_names_out()
            ranked = sorted(zip(feature_names, scores), key=lambda item: item[1], reverse=True)
            tfidf_keywords = [term for term, score in ranked if score > 0][:20]
        except Exception as exc:
            logger.debug("JD TF-IDF extraction failed: %s", exc)

    critical_keywords = sorted(dict.fromkeys(required_skills + tfidf_keywords[:12]))
    priority_keywords = sorted(dict.fromkeys(required_skills[:8] + preferred_skills[:6] + tfidf_keywords[:10]))

    return {
        "required_skills": sorted(dict.fromkeys(required_skills)),
        "preferred_skills": sorted(dict.fromkeys(preferred_skills)),
        "critical_keywords": critical_keywords,
        "experience_level": experience_level,
        "domain_type": domain_type,
        "priority_keywords": priority_keywords,
    }


def _experience_relevance(resume_text: str, sections: Dict[str, str], jd_analysis: Dict[str, Any]) -> float:
    experience_blob = "\n".join(filter(None, [sections.get("experience", ""), sections.get("projects", ""), resume_text]))
    years_in_resume = [int(match.group(1)) for match in EXPERIENCE_YEARS_PATTERN.finditer(experience_blob)]
    max_resume_years = max(years_in_resume) if years_in_resume else 0

    expected = jd_analysis.get("experience_level", "unspecified")
    if expected == "entry":
        baseline = 1
    elif expected == "mid":
        baseline = 3
    elif expected == "senior":
        baseline = 5
    else:
        baseline = 2

    years_score = min(100.0, (max_resume_years / baseline) * 75) if baseline else 50.0
    action_score = min(25.0, len([v for v in _tokenize(experience_blob) if v in ACTION_VERBS]) * 2.5)
    return round(min(100.0, years_score + action_score), 2)


def _education_relevance(sections: Dict[str, str], resume_text: str, jd_analysis: Dict[str, Any]) -> float:
    education_blob = "\n".join(filter(None, [sections.get("education", ""), resume_text]))
    degree_keywords = ["bachelor", "master", "phd", "degree", "b.tech", "m.tech", "bsc", "msc", "mba"]
    cert_hits = len(_extract_keyword_hits(education_blob, CERTIFICATION_KEYWORDS))
    degree_hits = len(_extract_keyword_hits(education_blob, degree_keywords))

    preferred = jd_analysis.get("preferred_skills", [])
    preferred_edu_bonus = 8.0 if any(term.lower() in education_blob.lower() for term in preferred[:5]) else 0.0

    raw = min(100.0, degree_hits * 18 + cert_hits * 14 + preferred_edu_bonus)
    return round(max(20.0 if degree_hits else 0.0, raw), 2)


def _technical_match(required_skills: Sequence[str], matched_skills: Sequence[str]) -> float:
    if not required_skills:
        return round(min(100.0, len(matched_skills) * 8), 2)
    req = {item.lower() for item in required_skills}
    got = {item.lower() for item in matched_skills}
    return round((len(req & got) / max(1, len(req))) * 100, 2)


def _keyword_coverage(priority_keywords: Sequence[str], resume_text: str) -> float:
    if not priority_keywords:
        return 0.0
    lowered = normalize_text(resume_text).lower()
    hits = sum(1 for keyword in priority_keywords if re.search(rf"\b{re.escape(keyword.lower())}\b", lowered))
    return round((hits / max(1, len(priority_keywords))) * 100, 2)


def _keyword_density(resume_text: str, keyword_pool: Sequence[str]) -> float:
    words = _tokenize(resume_text)
    if not words:
        return 0.0
    lowered = normalize_text(resume_text).lower()
    occurrences = sum(len(re.findall(rf"\b{re.escape(keyword.lower())}\b", lowered)) for keyword in keyword_pool if keyword)
    return occurrences / max(1, len(words))


def _keyword_present(keyword: str, resume_text: str) -> bool:
    normalized_keyword = _normalize_keyword(keyword)
    if not normalized_keyword:
        return False

    lowered_resume = normalize_text(resume_text).lower()
    if re.search(rf"\b{re.escape(normalized_keyword)}\b", lowered_resume):
        return True

    if fuzz is None:
        return False

    keyword_tokens = normalized_keyword.split()
    if len(keyword_tokens) == 1:
        return False

    resume_terms = _build_ngrams(_tokenize(lowered_resume))
    return any(fuzz.partial_ratio(normalized_keyword, term) >= 88 for term in resume_terms)


def _detect_missing_keywords(resume_text: str, keywords: Sequence[str]) -> List[str]:
    missing: List[str] = []
    seen = set()
    for keyword in keywords:
        normalized = keyword.strip()
        if not normalized or normalized.lower() in seen:
            continue
        seen.add(normalized.lower())
        if not _keyword_present(normalized, resume_text):
            missing.append(normalized)
    return missing


def _impact_score(resume_text: str) -> Tuple[float, Dict[str, Any]]:
    tokens = _tokenize(resume_text)
    verbs = [token for token in tokens if token in ACTION_VERBS]
    metrics = len(METRIC_PATTERN.findall(resume_text))
    score = min(100.0, len(verbs) * 6 + metrics * 10)
    return round(score, 2), {
        "action_verb_count": len(verbs),
        "unique_action_verbs": sorted(dict.fromkeys(verbs)),
        "quantified_metrics": metrics,
        "score": round(score, 2),
    }


def _contact_score(resume_text: str) -> float:
    has_email = bool(EMAIL_PATTERN.search(resume_text))
    has_phone = bool(PHONE_PATTERN.search(resume_text))
    if has_email and has_phone:
        return 100.0
    if has_email or has_phone:
        return 70.0
    return 30.0


def _build_quality_checks(
    technical_match_percentage: float,
    semantic_similarity_percentage: float,
    experience_relevance_percentage: float,
    education_relevance_percentage: float,
    missing_sections: Sequence[str],
    contact_score: float,
) -> List[Dict[str, Any]]:
    return [
        {
            "name": "Skills alignment",
            "passed": technical_match_percentage >= 60,
            "detail": "Strong required-skill match" if technical_match_percentage >= 60 else "Missing critical required skills",
        },
        {
            "name": "Semantic alignment",
            "passed": semantic_similarity_percentage >= 55,
            "detail": "Resume context aligns with JD" if semantic_similarity_percentage >= 55 else "Improve summary and experience phrasing to mirror JD context",
        },
        {
            "name": "Experience relevance",
            "passed": experience_relevance_percentage >= 55,
            "detail": "Experience level appears aligned" if experience_relevance_percentage >= 55 else "Add role-relevant experience bullets and quantified outcomes",
        },
        {
            "name": "Education relevance",
            "passed": education_relevance_percentage >= 50,
            "detail": "Education/certifications are visible" if education_relevance_percentage >= 50 else "Highlight degree and certifications more clearly",
        },
        {
            "name": "Resume structure",
            "passed": len(missing_sections) <= 2,
            "detail": "Sections are reasonably complete" if len(missing_sections) <= 2 else f"Missing sections: {', '.join(missing_sections[:4])}",
        },
        {
            "name": "Contact info",
            "passed": contact_score >= 70,
            "detail": "Contact information detected" if contact_score >= 70 else "Add email and phone at top of resume",
        },
    ]


def _build_recommendations(
    missing_required_skills: Sequence[str],
    missing_keywords: Sequence[str],
    missing_sections: Sequence[str],
    semantic_similarity_percentage: float,
    keyword_density: float,
    total_words: int,
    action_verb_analysis: Dict[str, Any],
) -> List[str]:
    tips: List[str] = []

    if missing_required_skills:
        tips.append(f"Add or emphasize required skills: {', '.join(missing_required_skills[:8])}.")
    if missing_keywords:
        tips.append(f"Improve keyword coverage with: {', '.join(missing_keywords[:10])}.")
    if semantic_similarity_percentage < 50:
        tips.append("Rewrite the summary and first two experience bullets using the same terminology as the job description.")
    if keyword_density < 0.012:
        tips.append("Keyword density is low; include target technologies in context across experience and projects.")
    if total_words < 220:
        tips.append("Resume is short for ATS screening; expand achievements, tools used, and impact metrics.")
    if missing_sections:
        tips.append(f"Add ATS-friendly section headings such as: {', '.join(missing_sections[:4])}.")
    if action_verb_analysis.get("quantified_metrics", 0) < 3:
        tips.append("Add measurable achievements (%, $, time savings, scale) to improve impact and recruiter confidence.")

    if not tips:
        tips.append("Resume is strong. Tailor role-specific keywords in summary and maintain quantified outcomes.")

    return tips[:8]


def _build_strengths(
    technical_match_percentage: float,
    semantic_similarity_percentage: float,
    experience_relevance_percentage: float,
    education_relevance_percentage: float,
    action_verb_analysis: Dict[str, Any],
) -> List[str]:
    strengths: List[str] = []
    if technical_match_percentage >= 70:
        strengths.append("Strong required technical skill alignment")
    if semantic_similarity_percentage >= 65:
        strengths.append("High semantic match with job context")
    if experience_relevance_percentage >= 65:
        strengths.append("Experience appears relevant to role expectations")
    if education_relevance_percentage >= 60:
        strengths.append("Education and certifications are ATS-visible")
    if action_verb_analysis.get("quantified_metrics", 0) >= 4:
        strengths.append("Contains measurable achievements")
    return strengths


def _weighted_ats_score(
    technical_match_percentage: float,
    semantic_similarity_percentage: float,
    keyword_coverage_percentage: float,
    experience_relevance_percentage: float,
    education_relevance_percentage: float,
    structure_score: float,
    contact_score: float,
    missing_required_skills_count: int,
    keyword_density: float,
    total_words: int,
    has_certifications: bool,
    has_projects: bool,
    measurable_achievements: int,
    leadership_hits: int,
) -> Tuple[int, Dict[str, float]]:
    weighted = (
        technical_match_percentage * 0.26
        + semantic_similarity_percentage * 0.20
        + keyword_coverage_percentage * 0.14
        + structure_score * 0.10
        + experience_relevance_percentage * 0.12
        + education_relevance_percentage * 0.06
        + contact_score * 0.04
    )

    penalties = 0.0
    penalties += min(18.0, missing_required_skills_count * 2.75)
    if keyword_density < 0.012:
        penalties += min(10.0, (0.012 - keyword_density) * 700)
    if total_words < 220:
        penalties += 8.0 if total_words >= 120 else 12.0

    bonuses = 0.0
    if has_certifications:
        bonuses += 3.0
    if has_projects:
        bonuses += 2.5
    bonuses += min(4.0, measurable_achievements * 0.9)
    bonuses += min(3.0, leadership_hits * 0.7)
    if keyword_coverage_percentage >= 60:
        bonuses += 2.0

    weighted_final = max(0.0, min(100.0, weighted - penalties + bonuses))
    final = int(round(weighted_final))

    return final, {
        "weighted_base": round(weighted, 2),
        "penalties": round(penalties, 2),
        "bonuses": round(bonuses, 2),
        "final_score": round(weighted_final, 2),
    }


def analyze_resume_nlp(resume_text: str, job_description: str | None = None) -> Dict[str, Any]:
    try:
        cleaned_resume = clean_resume_text(resume_text)
        cleaned_job = _trim_text(job_description or "", MAX_JOB_CHARS)

        logger.info("NLP: preprocessing started (resume_chars=%s, jd_chars=%s)", len(cleaned_resume), len(cleaned_job))
        preprocessed_resume = preprocess_text(cleaned_resume)

        sections, identified_sections, missing_sections, section_score = _extract_sections(cleaned_resume)
        matched_skills, skill_frequency, skills_by_category = extract_skills_advanced(cleaned_resume)
        soft_skills = _extract_keyword_hits(cleaned_resume, [entry["skill"] for entry in SKILL_GROUPS.get("soft_skills", [])])
        entities = _extract_entities(cleaned_resume)

        jd_analysis = analyze_job_description(cleaned_job)
        required_skills = jd_analysis.get("required_skills", [])
        preferred_skills = jd_analysis.get("preferred_skills", [])
        critical_keywords = jd_analysis.get("critical_keywords", [])

        semantic_similarity_percentage = calculate_semantic_similarity(cleaned_resume, cleaned_job) if cleaned_job else 0.0
        technical_match_percentage = _technical_match(required_skills, matched_skills)
        experience_relevance_percentage = _experience_relevance(cleaned_resume, sections, jd_analysis)
        education_relevance_percentage = _education_relevance(sections, cleaned_resume, jd_analysis)

        keyword_coverage = _keyword_coverage(jd_analysis.get("priority_keywords", []), cleaned_resume)
        keyword_density = _keyword_density(cleaned_resume, jd_analysis.get("priority_keywords", []))

        missing_required_skills = [skill for skill in required_skills if skill.lower() not in {s.lower() for s in matched_skills}]
        missing_keywords = _detect_missing_keywords(cleaned_resume, critical_keywords)

        impact_score, action_verb_analysis = _impact_score(cleaned_resume)
        contact_score = _contact_score(cleaned_resume)
        structure_score = section_score

        certifications_blob = sections.get("certifications", "") + "\n" + cleaned_resume
        has_certifications = bool(_extract_keyword_hits(certifications_blob, CERTIFICATION_KEYWORDS))
        has_projects = bool(sections.get("projects"))
        leadership_hits = len(_extract_keyword_hits(cleaned_resume, LEADERSHIP_KEYWORDS))
        total_words = len(_tokenize(cleaned_resume))

        ats_score, ats_meta = _weighted_ats_score(
            technical_match_percentage=technical_match_percentage,
            semantic_similarity_percentage=semantic_similarity_percentage,
            keyword_coverage_percentage=keyword_coverage,
            experience_relevance_percentage=experience_relevance_percentage,
            education_relevance_percentage=education_relevance_percentage,
            structure_score=structure_score,
            contact_score=contact_score,
            missing_required_skills_count=len(missing_required_skills),
            keyword_density=keyword_density,
            total_words=total_words,
            has_certifications=has_certifications,
            has_projects=has_projects,
            measurable_achievements=action_verb_analysis.get("quantified_metrics", 0),
            leadership_hits=leadership_hits,
        )

        quality_checks = _build_quality_checks(
            technical_match_percentage=technical_match_percentage,
            semantic_similarity_percentage=semantic_similarity_percentage,
            experience_relevance_percentage=experience_relevance_percentage,
            education_relevance_percentage=education_relevance_percentage,
            missing_sections=missing_sections,
            contact_score=contact_score,
        )

        quality_score = round((sum(1 for check in quality_checks if check["passed"]) / max(1, len(quality_checks))) * 100, 2)

        recommendations = _build_recommendations(
            missing_required_skills=missing_required_skills,
            missing_keywords=missing_keywords,
            missing_sections=missing_sections,
            semantic_similarity_percentage=semantic_similarity_percentage,
            keyword_density=keyword_density,
            total_words=total_words,
            action_verb_analysis=action_verb_analysis,
        )

        strengths = _build_strengths(
            technical_match_percentage=technical_match_percentage,
            semantic_similarity_percentage=semantic_similarity_percentage,
            experience_relevance_percentage=experience_relevance_percentage,
            education_relevance_percentage=education_relevance_percentage,
            action_verb_analysis=action_verb_analysis,
        )

        logger.info(
            "NLP: scoring complete (ats=%s semantic=%s tech=%s exp=%s edu=%s)",
            ats_score,
            semantic_similarity_percentage,
            technical_match_percentage,
            experience_relevance_percentage,
            education_relevance_percentage,
        )

        structured_extraction = _build_structured_extraction(
            resume_text=cleaned_resume,
            preprocessing=preprocessed_resume,
            sections=sections,
            identified_sections=identified_sections,
            missing_sections=missing_sections,
            matched_skills=matched_skills,
            skill_frequency=skill_frequency,
            skills_by_category=skills_by_category,
            education_keywords=_extract_keyword_hits(cleaned_resume, ["bachelor", "master", "phd", "cgpa", "gpa", "degree", "diploma", "certification"]),
            experience_keywords=_extract_keyword_hits(cleaned_resume, ["internship", "experience", "project", "lead", "developed", "delivered", "built", "implemented"]),
        )

        return {
            "structured_extraction": structured_extraction,
            "resume_text_preview": cleaned_resume[:700],
            "extracted_text": cleaned_resume,
            "ats_score": ats_score,
            "semantic_match_percentage": semantic_similarity_percentage,
            "technical_match_percentage": technical_match_percentage,
            "experience_relevance_percentage": experience_relevance_percentage,
            "education_relevance_percentage": education_relevance_percentage,
            "matched_skills": matched_skills,
            "missing_skills": missing_required_skills,
            "soft_skills": soft_skills,
            "education_keywords": _extract_keyword_hits(cleaned_resume, ["bachelor", "master", "phd", "cgpa", "gpa", "degree"]),
            "experience_keywords": _extract_keyword_hits(cleaned_resume, ["internship", "experience", "project", "lead", "developed", "delivered"]),
            "skill_frequency": skill_frequency,
            "missing_keywords": missing_keywords,
            "suggestions": recommendations,
            "resume_strengths": strengths,
            "keyword_coverage": keyword_coverage,
            "keyword_density": round(keyword_density, 4),
            "technical_skill_score": technical_match_percentage,
            "structure_score": structure_score,
            "impact_score": impact_score,
            "contact_score": contact_score,
            "job_description_keywords": jd_analysis.get("priority_keywords", []),
            "job_description_analysis": jd_analysis,
            "extracted_entities": entities,
            "skills_by_category": skills_by_category,
            "identified_sections": identified_sections,
            "missing_sections": missing_sections,
            "section_content": sections,
            "action_verb_analysis": action_verb_analysis,
            "quality_checks": quality_checks,
            "nlp_insights": {
                "semantic_similarity_percentage": semantic_similarity_percentage,
                "technical_match_percentage": technical_match_percentage,
                "experience_relevance_percentage": experience_relevance_percentage,
                "education_relevance_percentage": education_relevance_percentage,
                "keyword_coverage_percentage": keyword_coverage,
                "section_score": structure_score,
                "entity_count": len(entities),
                "entity_labels": sorted({entity["label"] for entity in entities}),
                "quality_score": quality_score,
                "skill_categories": {category: len(items) for category, items in skills_by_category.items()},
                "action_verbs": action_verb_analysis.get("unique_action_verbs", []),
                "soft_skills": soft_skills,
                "ats_meta": ats_meta,
                "score_breakdown": {
                    "technical_match": technical_match_percentage,
                    "semantic_similarity": semantic_similarity_percentage,
                    "keyword_coverage": keyword_coverage,
                    "structure_score": structure_score,
                    "experience_relevance": experience_relevance_percentage,
                    "education_relevance": education_relevance_percentage,
                    "contact_score": contact_score,
                },
            },
            "total_words": total_words,
        }
    except Exception as exc:
        logger.exception("NLP pipeline failed, returning safe fallback: %s", exc)
        cleaned = normalize_text(resume_text)
        fallback_preprocessing = preprocess_text(cleaned)
        return {
            "structured_extraction": {
                "preprocessing": {
                    "normalized_text_preview": fallback_preprocessing.normalized_text[:400],
                    "token_count": len(fallback_preprocessing.tokens),
                    "unique_token_count": len(dict.fromkeys(fallback_preprocessing.tokens)),
                    "lemma_count": len(fallback_preprocessing.lemmas),
                    "stem_count": len(fallback_preprocessing.stems),
                },
                "skills": {
                    "matched": [],
                    "frequency": {},
                    "by_category": {},
                    "exact_coverage": [],
                },
                "education": {
                    "present": False,
                    "section_text": "",
                    "keywords": [],
                    "highlights": [],
                },
                "experience": {
                    "present": False,
                    "section_text": "",
                    "keywords": [],
                    "highlights": [],
                },
                "sections": {
                    "identified": [],
                    "missing": list(SECTION_ALIASES.keys()),
                    "content": {},
                },
            },
            "resume_text_preview": cleaned[:700],
            "extracted_text": cleaned,
            "ats_score": 0,
            "semantic_match_percentage": 0.0,
            "technical_match_percentage": 0.0,
            "experience_relevance_percentage": 0.0,
            "education_relevance_percentage": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "soft_skills": [],
            "education_keywords": [],
            "experience_keywords": [],
            "skill_frequency": {},
            "missing_keywords": [],
            "suggestions": ["Analysis failed internally. Please retry with a clean PDF/DOCX resume."],
            "resume_strengths": [],
            "keyword_coverage": 0.0,
            "keyword_density": 0.0,
            "technical_skill_score": 0.0,
            "structure_score": 0.0,
            "impact_score": 0.0,
            "contact_score": 0.0,
            "job_description_keywords": [],
            "job_description_analysis": {
                "required_skills": [],
                "preferred_skills": [],
                "critical_keywords": [],
                "experience_level": "unspecified",
                "domain_type": "general",
                "priority_keywords": [],
            },
            "extracted_entities": [],
            "skills_by_category": {},
            "identified_sections": [],
            "missing_sections": [],
            "section_content": {},
            "action_verb_analysis": {
                "action_verb_count": 0,
                "unique_action_verbs": [],
                "quantified_metrics": 0,
                "score": 0.0,
            },
            "quality_checks": [],
            "nlp_insights": {
                "semantic_similarity_percentage": 0.0,
                "technical_match_percentage": 0.0,
                "experience_relevance_percentage": 0.0,
                "education_relevance_percentage": 0.0,
                "section_score": 0.0,
                "entity_count": 0,
                "entity_labels": [],
                "quality_score": 0.0,
                "skill_categories": {},
                "action_verbs": [],
                "soft_skills": [],
                "ats_meta": {"weighted_base": 0.0, "penalties": 0.0, "bonuses": 0.0},
            },
            "total_words": len(_tokenize(cleaned)),
        }
