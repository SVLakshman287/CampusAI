from fastapi import FastAPI, HTTPException
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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
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
def read_ticket(ticket_id: int):
    ticket = get_ticket(ticket_id)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return ticket


@app.get("/tickets")
def read_all_tickets():
    return get_all_tickets()


@app.put("/tickets/{ticket_id}/status")
def change_ticket_status(ticket_id: int, request: TicketStatusRequest):
    allowed_statuses = ["Pending", "In Progress", "Resolved"]

    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status must be Pending, In Progress, or Resolved",
        )

    updated = update_ticket_status(ticket_id, request.status)

    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {
        "message": "Ticket status updated successfully",
        "ticket_id": ticket_id,
        "status": request.status,
    }