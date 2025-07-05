from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .clip_model import classify_clip
from .fake_model import detect_fake
from .spam_model import check_spam

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SpamRequest(BaseModel):
    description: str

# --- Endpoints ---

@app.post("/classify")
async def classify(photo: UploadFile = File(...)):
    image_bytes = await photo.read()
    result = classify_clip(image_bytes)
    return result

@app.post("/spam")
async def spam_check(request: SpamRequest):
    result = check_spam(request.description)
    return result

@app.post("/fake")
async def fake_check(photo: UploadFile = File(...)):
    image_bytes = await photo.read()
    result = detect_fake(image_bytes)
    return result
