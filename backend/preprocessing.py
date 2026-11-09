import re
import nltk

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize


# Download required NLTK resources
nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)


def clean_text(text: str) -> str:
    """
    Clean extracted resume or job description text.
    """

    if not text:
        return ""

    # Convert text to lowercase
    text = text.lower()

    # Remove URLs
    text = re.sub(r"http\S+|www\S+", " ", text)

    # Remove email addresses
    text = re.sub(r"\S+@\S+", " ", text)

    # Remove special characters and digits
    text = re.sub(r"[^a-z\s]", " ", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text


def preprocess_text(text: str) -> str:
    """
    Tokenize text and remove English stopwords.
    """

    cleaned_text = clean_text(text)

    # Tokenization
    tokens = word_tokenize(cleaned_text)

    # Stopword removal
    stop_words = set(stopwords.words("english"))

    filtered_tokens = [
        word for word in tokens
        if word not in stop_words
    ]

    return " ".join(filtered_tokens)