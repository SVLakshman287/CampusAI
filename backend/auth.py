import hashlib
import hmac
import os
import secrets
import time


SESSION_MAX_AGE = 60 * 60 * 8
_sessions = {}
_captcha_challenges = {}


def hash_password(password, salt=None):
    salt_bytes = bytes.fromhex(salt) if salt else secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        120000,
    )
    return password_hash.hex(), salt_bytes.hex()


def verify_password(password, password_hash, password_salt):
    calculated_hash, _ = hash_password(password, password_salt)
    return hmac.compare_digest(calculated_hash, password_hash)


def create_session(user_id, role):
    token = secrets.token_urlsafe(32)
    _sessions[token] = {
        "user_id": user_id,
        "role": role,
        "created_at": time.time(),
    }
    return token


def get_session(token):
    if not token:
        return None

    session = _sessions.get(token)
    if session is None:
        return None

    if time.time() - session["created_at"] > SESSION_MAX_AGE:
        _sessions.pop(token, None)
        return None

    return session


def delete_session(token):
    _sessions.pop(token, None)


def create_captcha():
    first = secrets.randbelow(8) + 2
    second = secrets.randbelow(8) + 2
    captcha_id = secrets.token_urlsafe(18)
    _captcha_challenges[captcha_id] = {
        "answer": str(first + second),
        "created_at": time.time(),
    }
    return captcha_id, f"{first} + {second} = ?"


def verify_captcha(captcha_id, answer):
    challenge = _captcha_challenges.pop(captcha_id, None)
    if challenge is None or time.time() - challenge["created_at"] > 300:
        return False
    return hmac.compare_digest(challenge["answer"], str(answer).strip())


def get_admin_credentials():
    return (
        os.getenv("CAMPUSAI_ADMIN_USERNAME", "admin"),
        os.getenv("CAMPUSAI_ADMIN_PASSWORD", "CampusAI-Admin-2026"),
    )
