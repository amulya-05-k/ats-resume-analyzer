from __future__ import annotations

from functools import lru_cache
from typing import Dict, Iterable, List

try:
    import pandas as pd
except Exception:  # pragma: no cover - fallback when pandas is unavailable
    pd = None


SKILL_GROUPS: Dict[str, List[Dict[str, List[str]]]] = {
    "programming_languages": [
        {"skill": "Python", "aliases": ["python3"]},
        {"skill": "JavaScript", "aliases": ["js", "javascript"]},
        {"skill": "TypeScript", "aliases": ["ts", "typescript"]},
        {"skill": "Java", "aliases": []},
        {"skill": "C#", "aliases": ["c sharp"]},
        {"skill": "C++", "aliases": []},
        {"skill": "C", "aliases": []},
        {"skill": "Go", "aliases": ["golang"]},
        {"skill": "Rust", "aliases": []},
        {"skill": "Ruby", "aliases": []},
        {"skill": "PHP", "aliases": []},
        {"skill": "Scala", "aliases": []},
        {"skill": "Kotlin", "aliases": []},
        {"skill": "Swift", "aliases": []},
        {"skill": "SQL", "aliases": []},
        {"skill": "HTML", "aliases": []},
        {"skill": "CSS", "aliases": []},
    ],
    "frameworks": [
        {"skill": "FastAPI", "aliases": ["fast api"]},
        {"skill": "Django", "aliases": []},
        {"skill": "Flask", "aliases": []},
        {"skill": "React", "aliases": ["react.js", "reactjs"]},
        {"skill": "Vue", "aliases": ["vue.js"]},
        {"skill": "Angular", "aliases": []},
        {"skill": "Express", "aliases": ["express.js"]},
        {"skill": "Next.js", "aliases": ["nextjs"]},
        {"skill": "Node.js", "aliases": ["node", "nodejs"]},
        {"skill": "NestJS", "aliases": ["nest", "nestjs"]},
        {"skill": "Spring Boot", "aliases": ["springboot"]},
        {"skill": "ASP.NET Core", "aliases": ["asp net core", "asp.net"]},
        {"skill": "TensorFlow", "aliases": []},
        {"skill": "PyTorch", "aliases": []},
        {"skill": "scikit-learn", "aliases": ["sklearn", "scikit learn"]},
        {"skill": "spaCy", "aliases": ["spacy"]},
        {"skill": "Hugging Face", "aliases": ["transformers", "huggingface"]},
        {"skill": "LangChain", "aliases": ["langchain"]},
    ],
    "cloud_tools": [
        {"skill": "AWS", "aliases": ["amazon web services"]},
        {"skill": "Azure", "aliases": []},
        {"skill": "GCP", "aliases": ["google cloud"]},
        {"skill": "Docker", "aliases": []},
        {"skill": "Kubernetes", "aliases": ["k8s"]},
        {"skill": "Terraform", "aliases": []},
        {"skill": "Ansible", "aliases": []},
        {"skill": "Jenkins", "aliases": []},
        {"skill": "GitLab CI", "aliases": ["gitlab ci/cd", "gitlab ci"]},
        {"skill": "GitHub Actions", "aliases": ["github actions"]},
        {"skill": "AWS Lambda", "aliases": []},
        {"skill": "Azure Functions", "aliases": []},
        {"skill": "CI/CD", "aliases": ["cicd"]},
    ],
    "databases": [
        {"skill": "MongoDB", "aliases": ["mongo"]},
        {"skill": "PostgreSQL", "aliases": ["postgres", "postgresql"]},
        {"skill": "MySQL", "aliases": []},
        {"skill": "SQL Server", "aliases": []},
        {"skill": "SQLite", "aliases": []},
        {"skill": "Redis", "aliases": []},
        {"skill": "Oracle", "aliases": []},
        {"skill": "Elasticsearch", "aliases": []},
        {"skill": "DynamoDB", "aliases": []},
        {"skill": "Snowflake", "aliases": []},
        {"skill": "BigQuery", "aliases": []},
    ],
    "ai_ml": [
        {"skill": "Machine Learning", "aliases": ["ml"]},
        {"skill": "Deep Learning", "aliases": ["dl"]},
        {"skill": "Natural Language Processing", "aliases": ["nlp"]},
        {"skill": "Computer Vision", "aliases": ["cv"]},
        {"skill": "LLMs", "aliases": ["large language models", "gpt"]},
        {"skill": "RAG", "aliases": ["retrieval augmented generation"]},
    ],
    "soft_skills": [
        {"skill": "Communication", "aliases": []},
        {"skill": "Leadership", "aliases": []},
        {"skill": "Collaboration", "aliases": ["teamwork"]},
        {"skill": "Problem Solving", "aliases": ["problem-solving"]},
        {"skill": "Critical Thinking", "aliases": []},
        {"skill": "Stakeholder Management", "aliases": []},
        {"skill": "Mentoring", "aliases": ["coaching"]},
        {"skill": "Project Management", "aliases": []},
        {"skill": "Agile", "aliases": []},
        {"skill": "Presentation", "aliases": []},
    ],
}


SKILL_SYNONYM_MAP: Dict[str, str] = {
    "js": "JavaScript",
    "node": "Node.js",
    "nodejs": "Node.js",
    "py": "Python",
    "tf": "TensorFlow",
    "torch": "PyTorch",
    "pytorch": "Deep Learning",
    "transformers": "Hugging Face",
    "k8s": "Kubernetes",
    "mongo": "MongoDB",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "sklearn": "scikit-learn",
    "spacy": "spaCy",
    "nlp": "Natural Language Processing",
    "ml": "Machine Learning",
    "dl": "Deep Learning",
}


@lru_cache(maxsize=1)
def get_skill_rows() -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for category, entries in SKILL_GROUPS.items():
        for entry in entries:
            rows.append({"category": category, "skill": entry["skill"], "alias": entry["skill"]})
            for alias in entry.get("aliases", []):
                rows.append({"category": category, "skill": entry["skill"], "alias": alias})
    return rows


@lru_cache(maxsize=1)
def get_skill_frame():
    rows = get_skill_rows()
    if pd is None:
        return rows
    return pd.DataFrame(rows)


@lru_cache(maxsize=1)
def build_skill_lookup() -> Dict[str, str]:
    lookup: Dict[str, str] = {}
    for row in get_skill_rows():
        lookup[row["alias"].lower()] = row["skill"]
    return lookup


@lru_cache(maxsize=1)
def build_skill_patterns() -> List[Dict[str, str]]:
    patterns: List[Dict[str, str]] = []
    seen = set()
    for row in get_skill_rows():
        alias = row["alias"].strip()
        key = alias.lower()
        if not alias or key in seen:
            continue
        seen.add(key)
        patterns.append({"label": "SKILL", "pattern": alias, "id": row["skill"]})
    return patterns


def list_skill_categories() -> List[str]:
    return list(SKILL_GROUPS.keys())


def group_skills_by_category(skills: Iterable[str]) -> Dict[str, List[str]]:
    normalized = {skill.lower() for skill in skills}
    grouped: Dict[str, List[str]] = {category: [] for category in SKILL_GROUPS}
    for category, entries in SKILL_GROUPS.items():
        for entry in entries:
            skill = entry["skill"]
            if skill.lower() in normalized:
                grouped[category].append(skill)
    return {category: values for category, values in grouped.items() if values}


def canonicalize_skill(term: str) -> str:
    normalized = term.lower().strip()
    if normalized in SKILL_SYNONYM_MAP:
        return SKILL_SYNONYM_MAP[normalized]
    return build_skill_lookup().get(normalized, term.strip())
