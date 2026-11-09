# HireSense AI

**AI-Powered Resume Screening and Client Shortlisting Platform**

HireSense AI is a web-based recruitment platform designed to help staffing firms screen resumes, evaluate candidate-job matches, and share shortlisted candidates with clients.

## Key Features

- Resume upload with PDF and DOCX support
- Automated resume text extraction
- Candidate matching using skill coverage and TF-IDF similarity
- Recruiter dashboard and candidate management
- Share shortlisted candidates with clients
- Client dashboard with shortlist status management
- Role-based authentication and access control

## Technology Stack

**Frontend:** React, Vite

**Backend:** Python, FastAPI

**Database:** PostgreSQL, SQLAlchemy

**Authentication:** JWT

**Machine Learning:** Scikit-learn, TF-IDF, cosine similarity

## Project Structure

```text
HireSense-AI/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── sample_data/
└── frontend/
    ├── src/
    └── package.json
```

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Santoshhacker001/HireSense-AI.git
cd HireSense-AI
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables in `backend/.env`:

```env
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
JWT_SECRET_KEY=
```

Start the backend:

```bash
python -m uvicorn main:app --reload --port 8000
```

Backend API documentation: http://127.0.0.1:8000/docs

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Resume Matching Approach

The current matching engine uses a deterministic scoring approach:

- 70% skill coverage
- 30% TF-IDF text similarity

The resulting score is a candidate prioritization indicator, not a hiring probability or an automated hiring decision. Recruiters should review candidates before making decisions.

## Testing

Automated backend tests: **10 passed** in the local test environment.

## Current Limitations

- The application is configured for local development.
- The frontend API URL and backend CORS settings need updating for hosted deployment.
- Sample candidate JSON data is provided as reference data and is not automatically imported into the database.
- Production onboarding should use controlled recruiter/client invitations.

## Repository

[GitHub – HireSense AI](https://github.com/Santoshhacker001/HireSense-AI)

## Disclaimer

This project is a recruitment decision-support prototype. Final hiring decisions must remain under human review.