from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.ai import classify_question, find_best_answer
from backend.database import (
    create_ticket,
    get_all_tickets,
    get_ticket,
    update_ticket_status,
)
from backend.knowledge_base import KNOWLEDGE_BASE

ADMIN_KEY = "CampusAI-Admin-2026"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Key"],
)


class QuestionRequest(BaseModel):
    question: str


class TicketStatusRequest(BaseModel):
    status: str


# Welcome endpoint for CampusAI.
@app.get("/")
def read_root():
    return {"message": "Welcome to CampusAI"}


@app.post("/ask")
def ask_question(request: QuestionRequest):
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
        )

    return {
        "question": request.question,
        "category": category,
        "department": category_info["department"],
        "answer": answer,
        "ticket_id": ticket_id,
    }


@app.get("/tickets/{ticket_id}")
def read_ticket(ticket_id: str):
    try:
        ticket_number = int(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ticket ID must be a positive integer")

    if ticket_number <= 0:
        raise HTTPException(status_code=400, detail="Ticket ID must be a positive integer")

    ticket = get_ticket(ticket_number)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return ticket


@app.get("/tickets")
def read_all_tickets():
    return get_all_tickets()


@app.put("/tickets/{ticket_id}/status")
def change_ticket_status(
    ticket_id: str,
    request: TicketStatusRequest,
    admin_key: str = Header(default=None, alias="X-Admin-Key"),
):
    # Demo admin protection only; production should use proper authentication and securely stored secrets.
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing admin key")

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