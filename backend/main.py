from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    Depends
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from io import BytesIO

import fitz
from docx import Document

from database import get_db
from models import User, Job, Resume, ScreeningResult, Shortlist

from auth import (
    hash_password,
    verify_password,
    create_access_token
)

from dependencies import (
    get_current_user,
    require_role
)

from matching import analyze_resume_match


# ==================================================
# PYDANTIC SCHEMAS
# ==================================================

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=72)
    role: str = "recruiter"


class LoginRequest(BaseModel):
    email: str
    password: str


class ShortlistCreateRequest(BaseModel):
    client_id: int
    notes: str | None = None


class ShortlistUpdateRequest(BaseModel):
    status: str = Field(min_length=1, max_length=30)
    notes: str | None = None


# ==================================================
# INITIALIZE FASTAPI
# ==================================================

app = FastAPI(
    title="HireSense AI API",
    description="AI-powered Resume Screening Platform",
    version="1.0.0"
)

app.openapi_version = "3.0.2"


# ==================================================
# CORS CONFIGURATION
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# CONFIGURATION
# ==================================================

MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = ["pdf", "docx"]

ALLOWED_SHORTLIST_STATUSES = [
    "shortlisted",
    "reviewing",
    "accepted",
    "rejected"
]


# ==================================================
# HOME ENDPOINT
# ==================================================

@app.get("/")
def home():
    return {
        "message": "Welcome to HireSense AI Backend!",
        "status": "Running"
    }


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "HireSense AI"
    }


# ==================================================
# PDF TEXT EXTRACTION
# ==================================================

def extract_pdf_text(content: bytes) -> str:

    with fitz.open(
        stream=content,
        filetype="pdf"
    ) as pdf:

        return "\n".join(
            page.get_text()
            for page in pdf
        )


# ==================================================
# DOCX TEXT EXTRACTION
# ==================================================

def extract_docx_text(content: bytes) -> str:

    document = Document(
        BytesIO(content)
    )

    return "\n".join(
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    )


# ==================================================
# RESUME UPLOAD AND AI SCREENING
# ==================================================

@app.post("/api/resumes/upload")
async def upload_resumes(

    job_title: str = Form(...),

    job_description: str = Form(...),

    files: list[UploadFile] = File(...),

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("recruiter")
    )

):

    if not job_title.strip():
        raise HTTPException(
            status_code=400,
            detail="Job title is required."
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description is required."
        )

    if not files:
        raise HTTPException(
            status_code=400,
            detail="Please upload at least one resume."
        )

    results = []

    try:

        # Create Job

        new_job = Job(
            title=job_title.strip(),
            description=job_description.strip(),
            recruiter_id=current_user.id
        )

        db.add(new_job)
        db.flush()

        # Process Resumes

        for file in files:

            filename = file.filename or "unknown"

            extension = filename.rsplit(
                ".",
                1
            )[-1].lower()

            if extension not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file format: {filename}"
                )

            content = await file.read(
                MAX_FILE_SIZE + 1
            )

            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"{filename} exceeds the 10 MB limit."
                )

            if not content:
                raise HTTPException(
                    status_code=400,
                    detail=f"{filename} is empty."
                )

            # Extract Resume Text

            try:

                if extension == "pdf":
                    extracted_text = extract_pdf_text(content)

                else:
                    extracted_text = extract_docx_text(content)

            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail=f"Could not read {filename}. Check the file."
                )

            if not extracted_text.strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"No readable text found in {filename}."
                )

            # AI Resume Analysis

            analysis = analyze_resume_match(
                extracted_text,
                job_description
            )

            # Save Resume

            new_resume = Resume(
                job_id=new_job.id,
                filename=filename,
                file_type=extension,
                file_size=len(content),
                extracted_text=extracted_text
            )

            db.add(new_resume)
            db.flush()

            # Save Screening Result

            new_screening = ScreeningResult(
                resume_id=new_resume.id,
                match_score=analysis["match_score"],
                matched_skills=analysis["matched_skills"],
                missing_skills=analysis["missing_skills"],
                explanation=analysis["explanation"]
            )

            db.add(new_screening)
            db.flush()

            # Prepare Response

            results.append({

                "id": new_resume.id,

                "screening_result_id": new_screening.id,

                "filename": filename,

                "file_size": len(content),

                "extracted_characters": len(extracted_text),

                "match_score": analysis["match_score"],

                "text_similarity": analysis["text_similarity"],

                "skill_coverage": analysis["skill_coverage"],

                "matched_skills": analysis["matched_skills"],

                "missing_skills": analysis["missing_skills"],

                "resume_skills": analysis["resume_skills"],

                "required_skills": analysis["required_skills"],

                "confidence": analysis["confidence"],

                "explanation": analysis["explanation"]

            })

        db.commit()

    except Exception:

        db.rollback()
        raise

    # Rank Candidates

    results.sort(
        key=lambda resume: resume["match_score"],
        reverse=True
    )

    return {

        "message": "Resumes screened and saved successfully.",

        "job_id": new_job.id,

        "job_title": job_title,

        "total_resumes": len(results),

        "resumes": results

    }


# ==================================================
# CUSTOM OPENAPI CONFIGURATION
# ==================================================

def custom_openapi():

    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes
    )

    schema["openapi"] = "3.0.3"

    components = schema.get(
        "components",
        {}
    ).get(
        "schemas",
        {}
    )

    for component in components.values():

        properties = component.get(
            "properties",
            {}
        )

        for prop in properties.values():

            if prop.get("type") == "array":

                items = prop.get(
                    "items",
                    {}
                )

                if items.get("contentMediaType"):

                    items.pop(
                        "contentMediaType",
                        None
                    )

                    items["format"] = "binary"

            elif prop.get("contentMediaType"):

                prop.pop(
                    "contentMediaType",
                    None
                )

                prop["format"] = "binary"

    app.openapi_schema = schema

    return app.openapi_schema


app.openapi = custom_openapi


# ==================================================
# USER REGISTRATION
# ==================================================

@app.post(
    "/api/auth/register",
    status_code=201
)
def register_user(

    data: RegisterRequest,

    db: Session = Depends(get_db)

):

    email = data.email.strip().lower()
    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required."
        )

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(
            status_code=400,
            detail="Invalid email address."
        )

    if data.role not in ["recruiter", "client"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role."
        )

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered."
        )

    new_user = User(
        name=name,
        email=email,
        hashed_password=hash_password(data.password),
        role=data.role
    )

    try:

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email already registered."
        )

    return {

        "message": "User registered successfully",

        "user_id": new_user.id,

        "name": new_user.name,

        "email": new_user.email,

        "role": new_user.role

    }


# ==================================================
# USER LOGIN
# ==================================================

@app.post("/api/auth/login")
def login_user(

    data: LoginRequest,

    db: Session = Depends(get_db)

):

    email = data.email.strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user or not verify_password(
        data.password,
        user.hashed_password
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    access_token = create_access_token(
        user.id,
        user.role
    )

    return {

        "message": "Login successful.",

        "access_token": access_token,

        "token_type": "bearer",

        "user": {

            "id": user.id,

            "name": user.name,

            "email": user.email,

            "role": user.role

        }

    }


# ==================================================
# CURRENT USER PROFILE
# ==================================================

@app.get("/api/auth/me")
def get_my_profile(

    current_user: User = Depends(
        get_current_user
    )

):

    return {

        "id": current_user.id,

        "name": current_user.name,

        "email": current_user.email,

        "role": current_user.role

    }


# ==================================================
# RECRUITER DASHBOARD
# ==================================================

@app.get("/api/recruiter/dashboard")
def recruiter_dashboard(

    current_user: User = Depends(
        require_role("recruiter")
    )

):

    return {

        "message": "Welcome to Recruiter Dashboard",

        "recruiter": current_user.name

    }


# ==================================================
# RECRUITER CANDIDATES
# ==================================================

@app.get("/api/recruiter/candidates")
def get_recruiter_candidates(

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("recruiter")
    )

):

    records = (
        db.query(
            Resume,
            Job,
            ScreeningResult
        )
        .join(
            Job,
            Resume.job_id == Job.id
        )
        .join(
            ScreeningResult,
            ScreeningResult.resume_id == Resume.id
        )
        .filter(
            Job.recruiter_id == current_user.id
        )
        .order_by(
            ScreeningResult.match_score.desc()
        )
        .all()
    )

    candidates = []

    for resume, job, screening in records:

        candidates.append({

            "resume_id": resume.id,

            "screening_result_id": screening.id,

            "filename": resume.filename,

            "job_id": job.id,

            "job_title": job.title,

            "match_score": screening.match_score,

            "matched_skills": screening.matched_skills,

            "missing_skills": screening.missing_skills,

            "explanation": screening.explanation,

            "uploaded_at": str(resume.uploaded_at)

        })

    return {

        "total_candidates": len(candidates),

        "candidates": candidates

    }


# ==================================================
# RECRUITER CLIENT LIST
# ==================================================

@app.get("/api/recruiter/clients")
def get_recruiter_clients(

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("recruiter")
    )

):

    clients = db.query(User).filter(
        User.role == "client"
    ).order_by(
        User.name.asc()
    ).all()

    return {

        "total_clients": len(clients),

        "clients": [

            {
                "id": client.id,
                "name": client.name,
                "email": client.email
            }

            for client in clients

        ]

    }


# ==================================================
# RECRUITER SHORTLIST CANDIDATE FOR CLIENT
# ==================================================

@app.post(
    "/api/recruiter/candidates/{screening_result_id}/shortlist",
    status_code=201
)
def create_shortlist(

    screening_result_id: int,

    data: ShortlistCreateRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("recruiter")
    )

):

    client = db.query(User).filter(
        User.id == data.client_id,
        User.role == "client"
    ).first()

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found."
        )

    screening = (
        db.query(ScreeningResult)
        .join(
            Resume,
            ScreeningResult.resume_id == Resume.id
        )
        .join(
            Job,
            Resume.job_id == Job.id
        )
        .filter(
            ScreeningResult.id == screening_result_id,
            Job.recruiter_id == current_user.id
        )
        .first()
    )

    if not screening:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found in your jobs."
        )

    existing = db.query(Shortlist).filter(
        Shortlist.screening_result_id == screening_result_id,
        Shortlist.client_id == data.client_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Candidate is already shared with this client."
        )

    new_shortlist = Shortlist(

        screening_result_id=screening_result_id,

        client_id=data.client_id,

        status="shortlisted",

        notes=data.notes

    )

    try:

        db.add(new_shortlist)
        db.commit()
        db.refresh(new_shortlist)

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Candidate is already shortlisted."
        )

    return {

        "message": "Candidate shared with client successfully.",

        "shortlist_id": new_shortlist.id,

        "client_id": new_shortlist.client_id,

        "screening_result_id": new_shortlist.screening_result_id,

        "status": new_shortlist.status

    }


# ==================================================
# CLIENT SHORTLIST
# ==================================================

@app.get("/api/client/shortlist")
def get_client_shortlist(

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("client")
    )

):

    records = (
        db.query(
            Shortlist,
            ScreeningResult,
            Resume,
            Job
        )
        .join(
            ScreeningResult,
            Shortlist.screening_result_id == ScreeningResult.id
        )
        .join(
            Resume,
            ScreeningResult.resume_id == Resume.id
        )
        .join(
            Job,
            Resume.job_id == Job.id
        )
        .filter(
            Shortlist.client_id == current_user.id
        )
        .order_by(
            Shortlist.created_at.desc()
        )
        .all()
    )

    candidates = []

    for shortlist, screening, resume, job in records:

        candidates.append({

            "shortlist_id": shortlist.id,

            "resume_id": resume.id,

            "filename": resume.filename,

            "job_title": job.title,

            "match_score": screening.match_score,

            "matched_skills": screening.matched_skills,

            "missing_skills": screening.missing_skills,

            "status": shortlist.status,

            "notes": shortlist.notes,

            "created_at": str(shortlist.created_at)

        })

    return {

        "total_candidates": len(candidates),

        "candidates": candidates

    }


# ==================================================
# CLIENT UPDATE SHORTLIST STATUS
# ==================================================

@app.patch("/api/client/shortlist/{shortlist_id}")
def update_shortlist_status(

    shortlist_id: int,

    data: ShortlistUpdateRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("client")
    )

):

    new_status = data.status.strip().lower()

    if new_status not in ALLOWED_SHORTLIST_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Allowed values: "
                + ", ".join(ALLOWED_SHORTLIST_STATUSES)
            )
        )

    shortlist = db.query(Shortlist).filter(
        Shortlist.id == shortlist_id,
        Shortlist.client_id == current_user.id
    ).first()

    if not shortlist:
        raise HTTPException(
            status_code=404,
            detail="Shortlist record not found."
        )

    shortlist.status = new_status
    shortlist.notes = data.notes

    try:

        db.commit()
        db.refresh(shortlist)

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Could not update shortlist."
        )

    return {

        "message": "Candidate status updated successfully.",

        "shortlist_id": shortlist.id,

        "status": shortlist.status,

        "notes": shortlist.notes

    }