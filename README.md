# AI Resume Analyzer

A full-stack resume analyzer that uploads PDF/DOCX resumes, extracts text, runs a spaCy NLP pipeline, compares the resume to a job description with Sentence Transformer embeddings, calculates an ATS score, and stores analysis history in MongoDB.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios, React Router, Recharts
- Backend: FastAPI, Python, pdfplumber, python-docx, spaCy, Sentence Transformers, scikit-learn, numpy, pandas
- Database: MongoDB with Motor
- File Upload: PDF and DOCX

## Project Structure

```text
backend/
  app/
    api/
    core/
    models/
    schemas/
    services/
    utils/
  uploads/
  requirements.txt
frontend/
  public/
  src/
    components/
    hooks/
    pages/
    services/
    styles/
  package.json
```

## Features

- Upload resume from the frontend
- Extract text from PDF and DOCX files
- Detect technical skills with spaCy phrase matching and named entity extraction
- Compare the resume against a job description with semantic embeddings
- Show missing keywords, extracted entities, section coverage, and intelligent suggestions
- Calculate an ATS score with a weighted NLP scoring algorithm
- Display analytics charts and a history dashboard
- Store every analysis in MongoDB

## ATS Scoring Algorithm

The backend computes the ATS score from multiple signals:

- Semantic match: cosine similarity between Sentence Transformer embeddings
- Keyword coverage: overlap between extracted resume skills and job description terms
- Technical skill score: breadth of matched technical skills across skill categories
- Structure score: presence of sections like Summary, Skills, Experience, Projects, and Education
- Impact score: use of action verbs and measurable metrics
- Contact score: presence of email or phone number
- Quality checks: aggregate pass rate across ATS readiness checks

The final score is a weighted blend capped at 100.

## Backend Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Set environment variables:

```bash
set MONGODB_URI=mongodb://localhost:27017
set MONGODB_DB=resume_analyzer
set CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

4. Start the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run the command from the `backend` folder.

If you want account creation and login to work, also start the separate auth server in `backend/auth_server`:

```bash
npm install
npm run dev
```

Set `CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173` in its `.env` file if you use both local host variants.

The first semantic analysis request downloads the default Sentence Transformer model (`all-MiniLM-L6-v2`) if it is not already cached.

## Frontend Setup

1. Install dependencies:

```bash
npm install
```

Run the command from the `frontend` folder.

2. Start the development server:

```bash
npm run dev
```

3. If your backend runs on a different URL, set:

```bash
set VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## API Endpoints

- `GET /api/health` - health check
- `POST /api/analyze` - upload and analyze a resume
- `GET /api/history` - list saved analyses
- `GET /api/history/{id}` - fetch a specific analysis

## Notes

- The backend supports PDF and DOCX file extraction.
- If the spaCy English model is not installed, the app falls back to a blank English pipeline and still performs skill matching, section detection, and semantic scoring.
- Resume analysis records are saved in MongoDB and exposed in the history page.
