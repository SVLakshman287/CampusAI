from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.ai import classify_question

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

    return {
        "question": request.question,
        "category": category,
        "answer": f"Your question belongs to the {category} category.",
    }