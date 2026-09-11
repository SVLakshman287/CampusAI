import sqlite3
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.ai import classify_question, find_best_answer
from backend.auth import (
    create_captcha,
    create_session,
    delete_session,
    get_admin_credentials,
    get_session,
    hash_password,
    verify_captcha,
    verify_password,
)
from backend.database import (
    create_ticket,
    create_user,
    get_all_tickets,
    get_ticket,
    get_tickets_for_user,
    get_user,
    get_user_by_login,
    update_ticket_status,
)
from backend.knowledge_base import KNOWLEDGE_BASE

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Admin-Key"],
)


class QuestionRequest(BaseModel):
    question: str


class TicketStatusRequest(BaseModel):
    status: str


class RegistrationRequest(BaseModel):
    full_name: str
    student_id: str
    username: str
    password: str
    confirm_password: str
    department: str
    other_department: str = ""
    captcha_id: str
    captcha_answer: str


class LoginRequest(BaseModel):
    login: str
    password: str
    captcha_id: str
    captcha_answer: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str
    captcha_id: str
    captcha_answer: str


def get_auth_context(authorization: Annotated[str | None, Header()] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please log in to continue.")

    session = get_session(authorization[7:].strip())
    if session is None:
        raise HTTPException(status_code=401, detail="Please log in to continue.")

    user = get_user(session["user_id"]) if session["user_id"] else None
    if session["role"] == "student" and user is None:
        raise HTTPException(status_code=401, detail="Please log in to continue.")

    return {"session": session, "user": user}


def require_role(context, role):
    if context["session"]["role"] != role:
        raise HTTPException(status_code=403, detail="You do not have permission to access this area.")


def student_department(request):
    departments = {
        "Computer Science and Engineering",
        "Electronics and Communication Engineering",
        "Electrical and Electronics Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Information Technology",
        "Artificial Intelligence and Data Science",
        "Other",
    }

    if request.department not in departments:
        raise HTTPException(status_code=400, detail="Please select a valid department")

    if request.department == "Other":
        department = request.other_department.strip()
        if not department or len(department) > 100:
            raise HTTPException(status_code=400, detail="Please enter a valid department")
        return department

    return request.department


# Welcome endpoint for CampusAI.
@app.get("/")
def read_root():
    return {"message": "Welcome to CampusAI"}


@app.get("/captcha")
def get_captcha():
    captcha_id, question = create_captcha()
    return {"captcha_id": captcha_id, "question": question}


@app.post("/register")
def register_student(request: RegistrationRequest):
    full_name = request.full_name.strip()
    student_id = request.student_id.strip()
    username = request.username.strip().lower()

    if not full_name or not student_id or not username:
        raise HTTPException(status_code=400, detail="All required fields must be filled")

    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if not verify_captcha(request.captcha_id, request.captcha_answer):
        raise HTTPException(status_code=400, detail="Verification failed. Please try again.")

    department = student_department(request)
    password_hash, password_salt = hash_password(request.password)

    try:
        user_id = create_user(
            full_name,
            student_id,
            username,
            password_hash,
            password_salt,
            department,
        )
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username or Student ID already exists")

    return {"message": "Student account created successfully", "user_id": user_id}


@app.post("/login")
def login_student(request: LoginRequest):
    if not verify_captcha(request.captcha_id, request.captcha_answer):
        raise HTTPException(status_code=400, detail="Verification failed. Please try again.")

    user = get_user_by_login(request.login.strip().lower())
    if user is None or not verify_password(request.password, user["password_hash"], user["password_salt"]):
        raise HTTPException(status_code=401, detail="Invalid login details")

    token = create_session(user["id"], "student")
    return {
        "token": token,
        "role": "student",
        "user": {
            "full_name": user["full_name"],
            "student_id": user["student_id"],
            "department": user["department"],
        },
    }


@app.post("/admin/login")
def login_admin(request: AdminLoginRequest):
    if not verify_captcha(request.captcha_id, request.captcha_answer):
        raise HTTPException(status_code=400, detail="Verification failed. Please try again.")

    admin_username, admin_password = get_admin_credentials()
    if request.username.strip() != admin_username or request.password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid admin login details")

    token = create_session(None, "admin")
    return {
        "token": token,
        "role": "admin",
        "user": {
            "full_name": "CampusAI Administrator",
            "department": "Campus-wide Student Services",
        },
    }


@app.post("/logout")
def logout(authorization: Annotated[str | None, Header()] = None):
    if authorization and authorization.startswith("Bearer "):
        delete_session(authorization[7:].strip())
    return {"message": "Logged out successfully"}


@app.get("/me")
def current_user(authorization: Annotated[str | None, Header()] = None):
    auth_context = get_auth_context(authorization)
    user = auth_context["user"]
    if user is None:
        return {"role": "admin", "department": "Campus-wide Student Services"}
    return {
        "role": "student",
        "full_name": user["full_name"],
        "student_id": user["student_id"],
        "department": user["department"],
    }


@app.post("/ask")
def ask_question(
    request: QuestionRequest,
    authorization: Annotated[str | None, Header()] = None,
):
    auth_context = get_auth_context(authorization)
    require_role(auth_context, "student")

    if request.question.strip() == "":
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if len(request.question) > 500:
        raise HTTPException(
            status_code=400,
            detail="Question must be 500 characters or fewer",
        )

    category = classify_question(request.question)
    if category not in KNOWLEDGE_BASE:
        category = "general"

    category_info = KNOWLEDGE_BASE.get(category, KNOWLEDGE_BASE["general"])
    answer = None

    if category != "general":
        answer = find_best_answer(request.question, category, KNOWLEDGE_BASE)

    ticket_id = None

    if answer is None:
        answer = "Your question was forwarded to the appropriate department."
        ticket_id = create_ticket(
            request.question,
            category,
            category_info["department"],
            auth_context["user"]["id"],
        )

    return {
        "question": request.question,
        "category": category,
        "department": category_info["department"],
        "answer": answer,
        "ticket_id": ticket_id,
    }


@app.get("/tickets/{ticket_id}")
def read_ticket(
    ticket_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    auth_context = get_auth_context(authorization)
    try:
        ticket_number = int(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ticket ID must be a positive integer")

    if ticket_number <= 0:
        raise HTTPException(status_code=400, detail="Ticket ID must be a positive integer")

    ticket = get_ticket(ticket_number)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if auth_context["session"]["role"] == "student" and ticket.get("user_id") != auth_context["user"]["id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to access this ticket.")

    return ticket


@app.get("/tickets")
def read_all_tickets(authorization: Annotated[str | None, Header()] = None):
    auth_context = get_auth_context(authorization)
    if auth_context["session"]["role"] == "admin":
        return get_all_tickets()
    return get_tickets_for_user(auth_context["user"]["id"])


@app.put("/tickets/{ticket_id}/status")
def change_ticket_status(
    ticket_id: str,
    request: TicketStatusRequest,
    authorization: Annotated[str | None, Header()] = None,
):
    auth_context = get_auth_context(authorization)
    require_role(auth_context, "admin")

    try:
        ticket_number = int(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ticket ID must be a positive integer")

    if ticket_number <= 0:
        raise HTTPException(status_code=400, detail="Ticket ID must be a positive integer")

    allowed_statuses = ["Pending", "In Progress", "Resolved"]

    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status must be Pending, In Progress, or Resolved",
        )

    updated = update_ticket_status(ticket_number, request.status)

    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {
        "message": "Ticket status updated successfully",
        "ticket_id": ticket_number,
        "status": request.status,
    }