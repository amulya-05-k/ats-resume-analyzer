# ATS Resume Analyzer

A full-stack web application that analyzes resumes against job descriptions using NLP-based ATS (Applicant Tracking System) scoring, keyword matching, and actionable improvement suggestions.

---

## Features

- **ATS Score** — combined score from keyword match ratio (70%) and TF-IDF character-n-gram cosine similarity (30%)
- **Keyword Analysis** — matched and missing keywords extracted from the job description
- **Suggestions** — personalised tips to improve your resume
- **Dashboard** — history table and score trend chart
- **Authentication** — JWT-based register/login

---

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Backend  | Python 3.10+, Flask, SQLAlchemy, Flask-JWT-Extended |
| NLP      | scikit-learn (TF-IDF), NLTK                     |
| Parsing  | pdfplumber (PDF), python-docx (DOCX)            |
| Database | SQLite (default), any SQLAlchemy-compatible DB  |
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Axios   |

---

## Project Structure

```
ats-resume-analyzer/
├── backend/
│   ├── app.py              # Flask application factory
│   ├── config.py           # Configuration
│   ├── models.py           # SQLAlchemy models (User, Analysis)
│   ├── auth.py             # Auth routes (register / login / me)
│   ├── analyze.py          # Analysis routes
│   ├── utils/
│   │   ├── parser.py       # PDF / DOCX text extraction
│   │   ├── nlp.py          # ATS scoring engine
│   │   └── keywords.py     # TF-IDF keyword extraction
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api/axios.js        # Axios instance + JWT interceptor
    │   ├── context/AuthContext.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── ScoreGauge.jsx  # Circular score gauge
    │   │   ├── KeywordChart.jsx
    │   │   └── ProtectedRoute.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Analyzer.jsx    # Main analysis page
    │       └── Dashboard.jsx
    ├── package.json
    └── vite.config.js          # Proxies /api → localhost:5000
```

---

## Setup & Running

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download required NLTK data
python -c "import nltk; nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('omw-1.4'); nltk.download('punkt_tab')"

# Copy and customise environment variables
cp .env.example .env

# Start the Flask server (port 5000)
python app.py
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server (port 3000, proxies /api to :5000)
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and set:

| Variable        | Description                        | Default                           |
|-----------------|------------------------------------|-----------------------------------|
| `SECRET_KEY`    | Flask session secret               | `dev-secret-key-change-in-production` |
| `JWT_SECRET_KEY`| JWT signing secret                 | `jwt-secret-key-change-in-production` |
| `DATABASE_URL`  | SQLAlchemy connection string       | `sqlite:///ats_analyzer.db`       |
| `FLASK_DEBUG`   | Enable debug mode (`1` / `0`)      | `0`                               |

> **Important:** Change all secret keys before deploying to production.

---

## API Reference

### Auth

| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | `/api/auth/register`  | Create account       |
| POST   | `/api/auth/login`     | Obtain JWT token     |
| GET    | `/api/auth/me`        | Get current user     |

### Analysis

| Method | Endpoint                    | Description               |
|--------|-----------------------------|---------------------------|
| POST   | `/api/analyze`              | Upload resume + analyze   |
| GET    | `/api/analyses`             | List user analyses        |
| GET    | `/api/analyses/:id`         | Get single analysis       |
| DELETE | `/api/analyses/:id`         | Delete analysis           |
| GET    | `/api/stats`                | Summary statistics        |

All analysis endpoints require `Authorization: Bearer <token>`.

---

## Scoring Algorithm

```
ATS Score = (keyword_match_ratio × 0.70 + cosine_similarity × 0.30) × 100
```

- **keyword_match_ratio** — fraction of top-40 JD keywords found in the resume (primary signal)
- **cosine_similarity** — character n-gram TF-IDF cosine between preprocessed resume and JD texts

---

## Production Build

```bash
cd frontend && npm run build
# Serves static files from frontend/dist/
```

For production deployment, serve the Flask app with Gunicorn and the frontend dist with Nginx or a CDN.
