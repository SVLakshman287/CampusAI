from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.ai import classify_question, find_best_answer
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
    answer = find_best_answer(request.question, category, KNOWLEDGE_BASE)

    if answer is None:
        answer = category_info["answer"]

    return {
        "question": request.question,
        "category": category,
        "department": category_info["department"],
        "answer": answer,
    }