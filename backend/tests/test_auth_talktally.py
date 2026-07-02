"""TalkTally auth endpoint tests (email + OTP)."""
import os
import re
import time
import subprocess
import pytest


LOG_PATH = "/var/log/supervisor/backend.err.log"


def _grep_latest_otp(email: str) -> str:
    """Tail backend stderr log, return the most recent 6-digit code for the email."""
    try:
        out = subprocess.check_output(
            ["tail", "-n", "500", LOG_PATH], stderr=subprocess.STDOUT
        ).decode("utf-8", errors="ignore")
    except Exception as e:
        pytest.skip(f"Cannot read backend log: {e}")
    pattern = re.compile(rf"\[TalkTally OTP\]\s+{re.escape(email)}\s*->\s*(\d{{6}})")
    matches = pattern.findall(out)
    assert matches, f"No OTP found in log for {email}"
    return matches[-1]


class TestAuthRequestCode:
    """POST /api/auth/request-code"""

    def test_request_code_success_and_logged(self, base_url, api_client):
        email = "test_auth_req@talktally.dev"
        r = api_client.post(f"{base_url}/api/auth/request-code", json={"email": email})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "message" in body
        assert "Code sent" in body["message"]

        time.sleep(0.4)
        code = _grep_latest_otp(email)
        assert re.fullmatch(r"\d{6}", code)

    def test_request_code_invalid_email(self, base_url, api_client):
        r = api_client.post(f"{base_url}/api/auth/request-code", json={"email": "not-an-email"})
        assert r.status_code == 422


class TestAuthVerifyCode:
    """POST /api/auth/verify-code"""

    def test_verify_wrong_code_increments_attempts_and_blocks(self, base_url, api_client):
        email = "test_wrong_code@talktally.dev"
        r0 = api_client.post(f"{base_url}/api/auth/request-code", json={"email": email})
        assert r0.status_code == 200
        time.sleep(0.3)
        real = _grep_latest_otp(email)
        wrong = "000000" if real != "000000" else "111111"

        # 5 wrong attempts -> 400 Invalid code each
        for i in range(5):
            r = api_client.post(
                f"{base_url}/api/auth/verify-code", json={"email": email, "code": wrong}
            )
            assert r.status_code == 400, r.text
            assert "Invalid code" in r.json().get("detail", "")

        # 6th attempt should be blocked (attempts>=5) with "Too many attempts"
        r = api_client.post(
            f"{base_url}/api/auth/verify-code", json={"email": email, "code": wrong}
        )
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "Too many attempts" in detail or "Invalid code" in detail
        # After block, otp doc is deleted; subsequent request should say "No code requested"
        r2 = api_client.post(
            f"{base_url}/api/auth/verify-code", json={"email": email, "code": wrong}
        )
        assert r2.status_code == 400
        assert "No code" in r2.json().get("detail", "") or "Too many" in r2.json().get("detail", "")

    def test_verify_correct_code_returns_token_and_idempotent_user(self, base_url, api_client):
        email = "test_verify_ok@talktally.dev"
        # First verify -> creates user
        r0 = api_client.post(f"{base_url}/api/auth/request-code", json={"email": email})
        assert r0.status_code == 200
        time.sleep(0.3)
        code = _grep_latest_otp(email)
        r1 = api_client.post(
            f"{base_url}/api/auth/verify-code", json={"email": email, "code": code}
        )
        assert r1.status_code == 200, r1.text
        body = r1.json()
        assert "token" in body and body["token"]
        assert body["user"]["email"] == email
        assert "id" in body["user"] and body["user"]["id"]
        assert "created_at" in body["user"]
        user_id_1 = body["user"]["id"]
        token_1 = body["token"]

        # Second verify -> reuses user
        r2 = api_client.post(f"{base_url}/api/auth/request-code", json={"email": email})
        assert r2.status_code == 200
        time.sleep(0.3)
        code2 = _grep_latest_otp(email)
        r3 = api_client.post(
            f"{base_url}/api/auth/verify-code", json={"email": email, "code": code2}
        )
        assert r3.status_code == 200
        assert r3.json()["user"]["id"] == user_id_1, "user must be idempotent by email"

        pytest.auth_token = token_1
        pytest.auth_email = email
        pytest.auth_user_id = user_id_1

    def test_verify_without_request(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/auth/verify-code",
            json={"email": "never_requested@talktally.dev", "code": "123456"},
        )
        assert r.status_code == 400
        assert "No code" in r.json().get("detail", "")

    def test_verify_expired_code(self, base_url, api_client):
        """Manually expire an OTP via Mongo and confirm 400 'Code expired'."""
        try:
            from pymongo import MongoClient
        except ImportError:
            pytest.skip("pymongo not available")
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("MONGO_URL/DB_NAME not set")
        mclient = MongoClient(mongo_url)
        mdb = mclient[db_name]

        email = "test_expired@talktally.dev"
        r0 = api_client.post(f"{base_url}/api/auth/request-code", json={"email": email})
        assert r0.status_code == 200
        time.sleep(0.3)
        code = _grep_latest_otp(email)
        # Force expires_at into the past
        from datetime import datetime, timezone, timedelta
        past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        res = mdb.otp_requests.update_one({"email": email}, {"$set": {"expires_at": past}})
        assert res.modified_count == 1

        r = api_client.post(
            f"{base_url}/api/auth/verify-code", json={"email": email, "code": code}
        )
        assert r.status_code == 400
        assert "expired" in r.json().get("detail", "").lower()


class TestAuthMe:
    """GET /api/auth/me"""

    def test_me_missing_token(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, base_url, api_client):
        r = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": "Bearer not.a.jwt"},
        )
        assert r.status_code == 401

    def test_me_expired_token(self, base_url, api_client):
        """Craft a JWT expired 1 min ago with the server's secret."""
        import jwt
        from datetime import datetime, timezone, timedelta
        secret = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
        algo = os.environ.get("JWT_ALGORITHM", "HS256")
        tok = jwt.encode(
            {"sub": "any", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
            secret,
            algorithm=algo,
        )
        r = api_client.get(
            f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {tok}"}
        )
        assert r.status_code == 401

    def test_me_valid_token(self, base_url, api_client):
        token = getattr(pytest, "auth_token", None)
        email = getattr(pytest, "auth_email", None)
        uid = getattr(pytest, "auth_user_id", None)
        if not token:
            pytest.skip("no auth_token from previous test")
        r = api_client.get(
            f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == email
        assert body["id"] == uid
        assert "created_at" in body
