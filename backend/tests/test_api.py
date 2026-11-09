
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import Base, get_db
from models import User, Job, Resume, ScreeningResult


# --------------------------------------------------
# TEST DATABASE (SQLite - in-memory)
# --------------------------------------------------

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


@pytest.fixture
def test_db():
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# --------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------

def register_user(client, email, password, role):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": email,
            "password": password,
            "role": role,
        },
    )
    return response



def login_user(client, email, password):
    response = client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 200, response.text

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}"
    }



# --------------------------------------------------
# TEST 1: HEALTH CHECK
# --------------------------------------------------

def test_health_check(client):
    response = client.get("/api/health")

    assert response.status_code == 200


# --------------------------------------------------
# TEST 2: USER REGISTRATION
# --------------------------------------------------

def test_user_registration(client):
    response = register_user(
        client,
        "recruiter@test.com",
        "TestPass123!",
        "recruiter",
    )

    assert response.status_code in [200, 201]


# --------------------------------------------------
# TEST 3: DUPLICATE REGISTRATION
# --------------------------------------------------

def test_duplicate_registration(client):
    register_user(
        client,
        "duplicate@test.com",
        "TestPass123!",
        "recruiter",
    )

    response = register_user(
        client,
        "duplicate@test.com",
        "TestPass123!",
        "recruiter",
    )

    assert response.status_code == 409


# --------------------------------------------------
# TEST 4: LOGIN
# --------------------------------------------------

def test_login(client):
    register_user(
        client,
        "login@test.com",
        "TestPass123!",
        "recruiter",
    )

    response = client.post(
        "/api/auth/login",
        json={
            "email": "login@test.com",
            "password": "TestPass123!",
        },
    )

    assert response.status_code == 200, response.text
    assert "access_token" in response.json()



# --------------------------------------------------
# TEST 5: INVALID LOGIN
# --------------------------------------------------

def test_invalid_login(client):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "wrong@test.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code in [400, 401]



# --------------------------------------------------
# TEST 6: AUTHENTICATED USER PROFILE
# --------------------------------------------------

def test_get_current_user(client):
    register_user(
        client,
        "profile@test.com",
        "TestPass123!",
        "recruiter",
    )

    headers = login_user(
        client,
        "profile@test.com",
        "TestPass123!",
    )

    response = client.get(
        "/api/auth/me",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["email"] == "profile@test.com"


# --------------------------------------------------
# TEST 7: COMPLETE RECRUITER-CLIENT WORKFLOW
# --------------------------------------------------

def test_recruiter_client_workflow(client, test_db):

    # Create recruiter
    register_user(
        client,
        "recruiter_workflow@test.com",
        "TestPass123!",
        "recruiter",
    )

    recruiter_headers = login_user(
        client,
        "recruiter_workflow@test.com",
        "TestPass123!",
    )

    # Create client
    register_user(
        client,
        "client_workflow@test.com",
        "TestPass123!",
        "client",
    )

    client_headers = login_user(
        client,
        "client_workflow@test.com",
        "TestPass123!",
    )

    # Fetch users from test database
    recruiter = (
        test_db.query(User)
        .filter(User.email == "recruiter_workflow@test.com")
        .first()
    )

    client_user = (
        test_db.query(User)
        .filter(User.email == "client_workflow@test.com")
        .first()
    )

    assert recruiter is not None
    assert client_user is not None

    # Create sample job
    job = Job(
        title="Python Developer",
        description="Python SQL FastAPI",
        recruiter_id=recruiter.id,
        client_id=client_user.id,
    )

    test_db.add(job)
    test_db.commit()
    test_db.refresh(job)

    # Create sample resume
    resume = Resume(
        job_id=job.id,
        filename="synthetic_resume.pdf",
        file_type="pdf",
        file_size=1024,
        extracted_text="Python SQL FastAPI developer with project experience.",
    )

    test_db.add(resume)
    test_db.commit()
    test_db.refresh(resume)

    # Create screening result
    screening = ScreeningResult(
        resume_id=resume.id,
        match_score=85.0,
        matched_skills=["Python", "SQL"],
        missing_skills=["Docker"],
        explanation="Good match based on the listed skills.",
    )

    test_db.add(screening)
    test_db.commit()
    test_db.refresh(screening)

    # Recruiter candidate list
    candidates_response = client.get(
        "/api/recruiter/candidates",
        headers=recruiter_headers,
    )

    assert candidates_response.status_code == 200

    # Recruiter client list
    clients_response = client.get(
        "/api/recruiter/clients",
        headers=recruiter_headers,
    )

    assert clients_response.status_code == 200

    # Recruiter shares candidate with client
    shortlist_response = client.post(
        f"/api/recruiter/candidates/{screening.id}/shortlist",
        headers=recruiter_headers,
        json={
            "client_id": client_user.id,
            "notes": "Please review this candidate.",
        },
    )

    assert shortlist_response.status_code in [200, 201]

    # Client views shortlist
    client_shortlist_response = client.get(
        "/api/client/shortlist",
        headers=client_headers,
    )

    assert client_shortlist_response.status_code == 200

    # Client updates candidate status
    
    # Get shortlist ID from client's shortlist response
    
    shortlist_data = client_shortlist_response.json()

    if isinstance(shortlist_data, list):
        shortlist_records = shortlist_data
    else:
        shortlist_records = (
            shortlist_data.get("candidates")
            or shortlist_data.get("shortlist")
            or shortlist_data.get("items")
            or shortlist_data.get("data")
            or []
        )


    assert len(shortlist_records) > 0, client_shortlist_response.text

    shortlist_id = shortlist_records[0].get("shortlist_id")

    assert shortlist_id is not None, client_shortlist_response.text


    update_response = client.patch(
        f"/api/client/shortlist/{shortlist_id}",
        headers=client_headers,
        json={
            "status": "accepted",
            "notes": "Approved for next round.",
        },
    )

    assert update_response.status_code == 200


# --------------------------------------------------
# TEST 8: DUPLICATE SHORTLIST PREVENTION
# --------------------------------------------------

def test_duplicate_shortlist(client, test_db):

    register_user(
        client,
        "recruiter_duplicate@test.com",
        "TestPass123!",
        "recruiter",
    )

    recruiter_headers = login_user(
        client,
        "recruiter_duplicate@test.com",
        "TestPass123!",
    )

    register_user(
        client,
        "client_duplicate@test.com",
        "TestPass123!",
        "client",
    )

    client_user = (
        test_db.query(User)
        .filter(User.email == "client_duplicate@test.com")
        .first()
    )

    recruiter = (
        test_db.query(User)
        .filter(User.email == "recruiter_duplicate@test.com")
        .first()
    )

    job = Job(
        title="Data Analyst",
        description="Python SQL Excel",
        recruiter_id=recruiter.id,
        client_id=client_user.id,
    )

    test_db.add(job)
    test_db.commit()
    test_db.refresh(job)

    resume = Resume(
        job_id=job.id,
        filename="test_resume.pdf",
        file_type="pdf",
        file_size=1024,
        extracted_text="Python SQL Excel",
    )

    test_db.add(resume)
    test_db.commit()
    test_db.refresh(resume)

    screening = ScreeningResult(
        resume_id=resume.id,
        match_score=80.0,
        matched_skills=["Python", "SQL"],
        missing_skills=[],
        explanation="Test screening result.",
    )

    test_db.add(screening)
    test_db.commit()
    test_db.refresh(screening)

    payload = {
        "client_id": client_user.id,
        "notes": "Review candidate",
    }

    first_response = client.post(
        f"/api/recruiter/candidates/{screening.id}/shortlist",
        headers=recruiter_headers,
        json=payload,
    )

    assert first_response.status_code in [200, 201]

    second_response = client.post(
        f"/api/recruiter/candidates/{screening.id}/shortlist",
        headers=recruiter_headers,
        json=payload,
    )

    assert second_response.status_code in [400, 409]


# --------------------------------------------------
# TEST 9: ROLE-BASED ACCESS CONTROL
# --------------------------------------------------

def test_client_cannot_access_recruiter_candidates(client):

    register_user(
        client,
        "role_client@test.com",
        "TestPass123!",
        "client",
    )

    headers = login_user(
        client,
        "role_client@test.com",
        "TestPass123!",
    )

    response = client.get(
        "/api/recruiter/candidates",
        headers=headers,
    )

    assert response.status_code == 403


# --------------------------------------------------
# TEST 10: UNAUTHORIZED ACCESS
# --------------------------------------------------

def test_unauthorized_access(client):

    response = client.get(
        "/api/recruiter/candidates"
    )

    assert response.status_code in [401, 403]
