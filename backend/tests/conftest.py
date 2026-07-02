import os
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")


@pytest.fixture(scope="session")
def base_url():
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "http://localhost:8001"
    return url.rstrip("/")


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s
