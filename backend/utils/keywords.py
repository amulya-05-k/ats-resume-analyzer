import re
import string
import os
from typing import List, Set

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer

# NLTK packages required: {package_name: lookup_path_relative_to_nltk_data}
_NLTK_PACKAGES = {
    'stopwords': os.path.join('corpora', 'stopwords'),
    'wordnet': os.path.join('corpora', 'wordnet'),
    'omw-1.4': os.path.join('corpora', 'omw-1.4'),
    'punkt_tab': os.path.join('tokenizers', 'punkt_tab'),
}

for _pkg, _rel_path in _NLTK_PACKAGES.items():
    installed = any(
        os.path.exists(os.path.join(base, _rel_path))
        for base in nltk.data.path
    )
    if not installed:
        nltk.download(_pkg, quiet=True)

_STOP_WORDS: Set[str] = set(stopwords.words('english'))
_LEMMATIZER = WordNetLemmatizer()

# Common resume section headers to ignore as keywords
_SECTION_HEADERS = {
    'experience', 'education', 'skills', 'summary', 'objective',
    'projects', 'certifications', 'references', 'work', 'history',
    'achievements', 'awards', 'publications', 'interests', 'contact',
}


def preprocess(text: str) -> str:
    """Lowercase, remove punctuation, lemmatize and remove stopwords."""
    text = text.lower()
    text = re.sub(r'\d+', ' ', text)
    text = text.translate(str.maketrans(string.punctuation, ' ' * len(string.punctuation)))
    tokens = text.split()
    tokens = [
        _LEMMATIZER.lemmatize(t)
        for t in tokens
        if t not in _STOP_WORDS and len(t) > 2 and t not in _SECTION_HEADERS
    ]
    return ' '.join(tokens)


def extract_keywords(text: str, top_n: int = 30) -> List[str]:
    """Extract top-N keywords from text using TF-IDF on a single document."""
    processed = preprocess(text)
    if not processed.strip():
        return []

    # Use character n-gram TF-IDF on a single document to rank terms
    vectorizer = TfidfVectorizer(
        analyzer='word',
        ngram_range=(1, 2),
        max_features=200,
        min_df=1,
    )
    try:
        tfidf_matrix = vectorizer.fit_transform([processed])
    except ValueError:
        return processed.split()[:top_n]

    feature_names = vectorizer.get_feature_names_out()
    scores = tfidf_matrix.toarray()[0]
    ranked = sorted(zip(feature_names, scores), key=lambda x: x[1], reverse=True)
    return [term for term, _ in ranked[:top_n]]
