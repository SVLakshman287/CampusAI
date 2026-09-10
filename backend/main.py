from fastapi import FastAPI

app = FastAPI()

# Welcome endpoint for CampusAI.
@app.get("/")
def read_root():
    return {"message": "Welcome to CampusAI"}