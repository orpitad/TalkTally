"""TalkTally backend regression tests"""
import base64
import io
import math
import struct
import wave
import pytest


# ---------- Health ----------
class TestHealth:
    def test_root(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("message") == "TalkTally API"
        assert data.get("status") == "ok"


# ---------- Profiles ----------
class TestProfiles:
    def test_create_and_fetch_profile(self, base_url, api_client):
        payload = {"name": "TEST_Kid", "age_cohort": "18-24M"}
        r = api_client.post(f"{base_url}/api/profiles", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Kid"
        assert data["age_cohort"] == "18-24M"
        assert "id" in data and data["id"]
        assert "created_at" in data
        pytest.profile_id = data["id"]

        # GET verify
        g = api_client.get(f"{base_url}/api/profiles/{data['id']}")
        assert g.status_code == 200
        gdata = g.json()
        assert gdata["id"] == data["id"]
        assert gdata["name"] == "TEST_Kid"
        assert gdata["age_cohort"] == "18-24M"

    def test_get_profile_404(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/profiles/nonexistent-id-xyz")
        assert r.status_code == 404


# ---------- Sessions ----------
class TestSessions:
    def test_create_session_and_accuracy(self, base_url, api_client):
        # Ensure profile exists
        pr = api_client.post(f"{base_url}/api/profiles", json={"name": "TEST_Sess", "age_cohort": "24-30M"}).json()
        pid = pr["id"]

        payload = {
            "profile_id": pid,
            "category_id": "bilabials",
            "category_label": "Bilabials",
            "targets": [
                {"word": "ball", "target_phoneme": "b", "correct": True, "transcript": "ball", "audio_base64": "", "audio_ext": "m4a"},
                {"word": "mama", "target_phoneme": "m", "correct": True, "transcript": "mama", "audio_base64": "", "audio_ext": "m4a"},
                {"word": "papa", "target_phoneme": "p", "correct": False, "transcript": "", "audio_base64": "", "audio_ext": "m4a"},
            ],
        }
        r = api_client.post(f"{base_url}/api/sessions", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["profile_id"] == pid
        assert data["category_id"] == "bilabials"
        assert data["category_label"] == "Bilabials"
        assert data["correct_count"] == 2
        assert data["total_count"] == 3
        assert data["accuracy"] == round(2 / 3 * 100)  # 67
        assert data["target_words"] == ["ball", "mama", "papa"]
        assert "id" in data
        assert "timestamp" in data

        pytest.session_id = data["id"]
        pytest.session_profile_id = pid

    def test_list_sessions_excludes_targets_and_id(self, base_url, api_client):
        pid = getattr(pytest, "session_profile_id", None)
        assert pid, "prerequisite session not created"
        r = api_client.get(f"{base_url}/api/sessions", params={"profile_id": pid})
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) >= 1
        for s in arr:
            assert "_id" not in s
            assert "targets" not in s
            assert "target_words" in s
            assert "accuracy" in s
        # Sorted desc by timestamp
        ts_list = [s["timestamp"] for s in arr]
        assert ts_list == sorted(ts_list, reverse=True)

    def test_list_sessions_sorted_two_entries(self, base_url, api_client):
        pid = getattr(pytest, "session_profile_id", None)
        # Create a second session
        payload = {
            "profile_id": pid,
            "category_id": "vowels",
            "category_label": "Vowels",
            "targets": [
                {"word": "eye", "target_phoneme": "aɪ", "correct": True},
                {"word": "up", "target_phoneme": "ʌ", "correct": True},
            ],
        }
        r = api_client.post(f"{base_url}/api/sessions", json=payload)
        assert r.status_code == 200
        # List and confirm newest first
        r2 = api_client.get(f"{base_url}/api/sessions", params={"profile_id": pid})
        assert r2.status_code == 200
        arr = r2.json()
        assert arr[0]["category_id"] == "vowels"
        assert arr[0]["accuracy"] == 100

    def test_get_session_detail_includes_targets(self, base_url, api_client):
        sid = getattr(pytest, "session_id", None)
        assert sid
        r = api_client.get(f"{base_url}/api/sessions/{sid}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == sid
        assert "targets" in d
        assert isinstance(d["targets"], list)
        assert len(d["targets"]) == 3
        for t in d["targets"]:
            assert "word" in t
            assert "target_phoneme" in t
            assert "correct" in t
            assert "audio_base64" in t

    def test_get_session_404(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/sessions/does-not-exist-xyz")
        assert r.status_code == 404


# ---------- Transcribe ----------
def _make_wav_bytes(seconds=1.0, freq=440.0, framerate=16000):
    """Generate a synthetic sine-wave WAV in memory."""
    buf = io.BytesIO()
    n_frames = int(seconds * framerate)
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(framerate)
        amp = 16000
        frames = bytearray()
        for i in range(n_frames):
            val = int(amp * math.sin(2 * math.pi * freq * (i / framerate)))
            frames += struct.pack("<h", val)
        wf.writeframes(bytes(frames))
    return buf.getvalue()


def _backend_has_groq_key(base_url, api_client):
    """Probe the backend to detect whether GROQ_API_KEY is configured server-side.
    Sends a tiny valid WAV; if backend returns the 'GROQ_API_KEY missing' 500 the
    key is unset; otherwise (400 invalid base64, 200 success, or 500 Transcription
    failed) it is configured."""
    wav_bytes = _make_wav_bytes(seconds=0.1)
    b64 = base64.b64encode(wav_bytes).decode("ascii")
    r = api_client.post(
        f"{base_url}/api/transcribe",
        json={"audio_base64": b64, "ext": "wav", "target_word": "hi"},
        timeout=30,
    )
    if r.status_code == 500 and "GROQ_API_KEY missing" in r.json().get("detail", ""):
        return False
    return True


class TestTranscribe:
    """
    /api/transcribe now backed by Groq (whisper-large-v3-turbo).
    Behavior depends on backend-side GROQ_API_KEY:
      - unset  -> 500 'GROQ_API_KEY missing' before any decoding
      - set    -> attempts Groq call; may 200/400/500 depending on payload+key validity
    """

    def test_transcribe_missing_key_returns_500(self, base_url, api_client):
        if _backend_has_groq_key(base_url, api_client):
            pytest.skip("Backend has GROQ_API_KEY configured; skipping missing-key assertion")
        wav_bytes = _make_wav_bytes(seconds=0.2)
        b64 = base64.b64encode(wav_bytes).decode("ascii")
        r = api_client.post(
            f"{base_url}/api/transcribe",
            json={"audio_base64": b64, "ext": "wav", "target_word": "hello"},
            timeout=30,
        )
        assert r.status_code == 500, r.text
        assert "GROQ_API_KEY missing" in r.json().get("detail", "")

    def test_transcribe_invalid_base64(self, base_url, api_client):
        """With backend GROQ_API_KEY set, invalid base64 surfaces as 400.
        With it unset, the handler short-circuits with 500 before decoding."""
        r = api_client.post(
            f"{base_url}/api/transcribe",
            json={"audio_base64": "not-valid-base64!!!@@@###", "ext": "wav", "target_word": "hello"},
        )
        if _backend_has_groq_key(base_url, api_client):
            assert r.status_code == 400, r.text
            assert "Invalid base64" in r.json().get("detail", "")
        else:
            assert r.status_code == 500, r.text
            assert "GROQ_API_KEY missing" in r.json().get("detail", "")

    def test_transcribe_synthetic_wav(self, base_url, api_client):
        wav_bytes = _make_wav_bytes(seconds=1.0)
        b64 = base64.b64encode(wav_bytes).decode("ascii")
        r = api_client.post(
            f"{base_url}/api/transcribe",
            json={"audio_base64": b64, "ext": "wav", "target_word": "hello"},
            timeout=60,
        )
        if not _backend_has_groq_key(base_url, api_client):
            assert r.status_code == 500, r.text
            assert "GROQ_API_KEY missing" in r.json().get("detail", "")
            return
        # With a key present (real or fake), Groq may return 200 (real key + audible speech)
        # or 500 with 'Transcription failed: ...' (fake key / auth error / bad audio).
        assert r.status_code in (200, 500), r.text
        if r.status_code == 500:
            assert "Transcription failed" in r.json().get("detail", "")
        else:
            d = r.json()
            assert "transcript" in d
            assert "match_score" in d
            assert "correct" in d
            assert isinstance(d["match_score"], int)
            assert 0 <= d["match_score"] <= 100
            assert isinstance(d["correct"], bool)
