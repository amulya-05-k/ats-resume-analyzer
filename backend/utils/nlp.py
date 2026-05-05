from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from utils.keywords import extract_keywords, preprocess


_TOP_N_KEYWORDS = 40  # number of job keywords used for matching

# Weights: keyword matching dominates because TF-IDF cosine on just 2 docs
# tends to underestimate semantic overlap.
_KEYWORD_WEIGHT = 0.70
_SEMANTIC_WEIGHT = 0.30


def analyze_resume(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Compute ATS score using keyword matching (70%) and TF-IDF cosine similarity (30%).

    Score = (keyword_match_ratio * 0.70 + cosine_similarity * 0.30) * 100

    Returns a dict with keys:
        ats_score (float): Overall ATS score 0–100.
        semantic_score (float): TF-IDF cosine similarity 0–100.
        keyword_score (float): Keyword match ratio 0–100.
        matched_keywords (List[str]): JD keywords found in resume.
        missing_keywords (List[str]): JD keywords absent from resume.
        suggestions (List[str]): Human-readable improvement tips.
    """
    resume_clean = preprocess(resume_text)
    job_clean = preprocess(job_description)

    # --- Semantic similarity via TF-IDF cosine (character n-grams for robustness) ---
    vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5))
    try:
        tfidf = vectorizer.fit_transform([resume_clean, job_clean])
        semantic_similarity = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
    except ValueError:
        semantic_similarity = 0.0

    # --- Keyword matching (unigrams only for fairer matching) ---
    job_keywords = extract_keywords(job_description, top_n=_TOP_N_KEYWORDS)
    resume_tokens = set(preprocess(resume_text).split())

    matched = []
    missing = []
    for kw in job_keywords:
        # For multi-word keywords, require all constituent words in the resume
        kw_words = set(kw.split())
        if kw_words.issubset(resume_tokens):
            matched.append(kw)
        else:
            missing.append(kw)

    keyword_match_ratio = len(matched) / len(job_keywords) if job_keywords else 0.0

    ats_score = (keyword_match_ratio * _KEYWORD_WEIGHT + semantic_similarity * _SEMANTIC_WEIGHT) * 100
    ats_score = max(0.0, min(100.0, ats_score))

    suggestions = _generate_suggestions(
        ats_score, semantic_similarity, keyword_match_ratio, missing
    )

    return {
        'ats_score': round(ats_score, 2),
        'semantic_score': round(semantic_similarity * 100, 2),
        'keyword_score': round(keyword_match_ratio * 100, 2),
        'matched_keywords': matched[:20],
        'missing_keywords': missing[:20],
        'suggestions': suggestions,
    }


def _generate_suggestions(
    score: float,
    semantic: float,
    keyword_ratio: float,
    missing_keywords: List[str],
) -> List[str]:
    suggestions = []

    if score < 50:
        suggestions.append(
            'Your resume has a low ATS match. Consider tailoring it specifically for this job.'
        )

    if keyword_ratio < 0.4 and missing_keywords:
        top_missing = ', '.join(missing_keywords[:5])
        suggestions.append(
            f'Add more relevant keywords from the job description. Key missing terms: {top_missing}.'
        )

    if semantic < 0.3:
        suggestions.append(
            'The overall content of your resume does not closely align with the job description. '
            'Rewrite your summary and experience sections to mirror the language used in the posting.'
        )

    if keyword_ratio >= 0.4 and semantic < 0.4:
        suggestions.append(
            'You have many keywords but the context may differ. Ensure skills appear in meaningful sentences.'
        )

    if score >= 75:
        suggestions.append(
            'Great match! Ensure your resume is well-formatted and free of spelling errors before submitting.'
        )
    elif score >= 50:
        suggestions.append(
            'Moderate match. Focus on incorporating the missing keywords naturally into your experience bullets.'
        )

    suggestions.append(
        'Use action verbs (e.g., Led, Built, Improved, Reduced) to start each bullet point in your experience section.'
    )
    suggestions.append(
        'Quantify your achievements where possible (e.g., "Increased performance by 30%").'
    )

    return suggestions[:6]
