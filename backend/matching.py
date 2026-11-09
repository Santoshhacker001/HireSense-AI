
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from preprocessing import preprocess_text


# Skill dictionary with common variations
SKILL_ALIASES = {
    "Python": ["python"],
    "SQL": ["sql", "structured query language"],
    "Excel": ["excel", "microsoft excel"],
    "Power BI": ["power bi", "powerbi"],
    "Tableau": ["tableau"],
    "Machine Learning": ["machine learning", "ml"],
    "Deep Learning": ["deep learning"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "Matplotlib": ["matplotlib"],
    "Seaborn": ["seaborn"],
    "Statistics": ["statistics", "statistical analysis"],
    "Data Analysis": ["data analysis", "data analytics"],
    "Data Visualization": ["data visualization", "data visualisation"],
    "Data Cleaning": ["data cleaning", "data preprocessing"],
    "ETL": ["etl", "extract transform load"],
    "AWS": ["aws", "amazon web services"],
    "Azure": ["azure", "microsoft azure"],
    "Google Cloud": ["google cloud", "gcp"],
    "BigQuery": ["bigquery"],
    "Spark": ["apache spark", "pyspark", "spark"],
    "Java": ["java"],
    "C++": ["c++"],
    "JavaScript": ["javascript"],
    "React": ["react", "react.js"],
    "HTML": ["html"],
    "CSS": ["css"],
    "FastAPI": ["fastapi"],
    "Flask": ["flask"],
    "Django": ["django"],
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql"],
    "MongoDB": ["mongodb"],
    "Git": ["git", "github"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes"],
    "NLP": ["nlp", "natural language processing"],
    "PowerPoint": ["powerpoint", "microsoft powerpoint"],
}


def extract_skills(text: str) -> list:
    """
    Extract recognized skills from resume or job description.
    Uses keyword matching, not semantic AI inference.
    """

    if not text:
        return []

    text = text.lower()
    found_skills = []

    for skill, aliases in SKILL_ALIASES.items():
        for alias in aliases:
            pattern = r"(?<!\w)" + re.escape(alias) + r"(?!\w)"

            if re.search(pattern, text):
                found_skills.append(skill)
                break

    return sorted(found_skills)


def calculate_text_similarity(
    resume_text: str,
    job_description: str
) -> float:
    """
    Calculate TF-IDF cosine similarity.
    Returns a score between 0 and 100.
    """

    resume = preprocess_text(resume_text)
    job = preprocess_text(job_description)

    if not resume or not job:
        return 0.0

    vectorizer = TfidfVectorizer()

    try:
        matrix = vectorizer.fit_transform([job, resume])

        similarity = cosine_similarity(
            matrix[0:1],
            matrix[1:2]
        )[0][0]

        return round(float(similarity * 100), 2)

    except ValueError:
        return 0.0


def analyze_resume_match(
    resume_text: str,
    job_description: str
) -> dict:
    """
    Generate an explainable resume matching analysis.
    """

    if not resume_text or not job_description:
        return {
            "match_score": 0.0,
            "text_similarity": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "resume_skills": [],
            "required_skills": [],
            "skill_coverage": 0.0,
            "confidence": "low",
            "explanation": "Insufficient text for reliable analysis."
        }

    resume_skills = extract_skills(resume_text)
    required_skills = extract_skills(job_description)

    matched_skills = [
        skill for skill in required_skills
        if skill in resume_skills
    ]

    missing_skills = [
        skill for skill in required_skills
        if skill not in resume_skills
    ]

    text_similarity = calculate_text_similarity(
        resume_text,
        job_description
    )

    if required_skills:
        skill_coverage = round(
            len(matched_skills) / len(required_skills) * 100,
            2
        )

        # Combined score: 70% skill coverage + 30% text similarity
        match_score = round(
            (0.70 * skill_coverage) +
            (0.30 * text_similarity),
            2
        )

        confidence = (
            "moderate" if len(required_skills) >= 3 else "low"
        )

    else:
        skill_coverage = 0.0
        match_score = text_similarity
        confidence = "low"

    if required_skills:
        explanation = (
            f"Detected {len(matched_skills)} of "
            f"{len(required_skills)} recognized required skills. "
            f"Skill coverage is {skill_coverage}%. "
            f"Text similarity is {text_similarity}%. "
            "The score is an automated screening indicator, "
            "not a hiring recommendation."
        )
    else:
        explanation = (
            "No recognized skills were detected in the job description. "
            "The score relies only on textual similarity and should "
            "not be treated as a reliable skill-match assessment."
        )

    return {
        "match_score": match_score,
        "text_similarity": text_similarity,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "resume_skills": resume_skills,
        "required_skills": required_skills,
        "skill_coverage": skill_coverage,
        "confidence": confidence,
        "explanation": explanation
    }


def calculate_match_score(
    resume_text: str,
    job_description: str
) -> float:
    """
    Backward-compatible function for the existing API.
    """

    return analyze_resume_match(
        resume_text,
        job_description
    )["match_score"]
