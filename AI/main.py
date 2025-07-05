from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_403_FORBIDDEN
from uuid import uuid4

from .validate import validate_inputs
from .classifier_model import classify_clip
from .spam_model import check_spam
from .fake_model import detect_fake

app = FastAPI()

API_KEY = "1234"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to check API key
@app.middleware("http")
async def restrict_to_node(request: Request, call_next):
    if request.headers.get("x-api-key") != API_KEY:
        raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Unauthorized")
    return await call_next(request)

@app.post("/model")
async def model_handler(
    photo: UploadFile = File(...),
    description: str = Form(...),
    latitude: str = Form(None),
    longitude: str = Form(None)
):
    try:
        image_bytes = await photo.read()

        print(f"Received file: {photo.filename}")
        print(f"Description: {description}")
        print(f"Latitude: {latitude}, Longitude: {longitude}")

        validate_inputs(photo, image_bytes, description)

        classification = classify_clip(image_bytes)
        spam_result = check_spam(description)
        fake_result = detect_fake(image_bytes)

        return {
            "message": "Processed successfully",
            "classification": classification,
            "isSpam": spam_result,
            "isFake": fake_result,
            "description": description,
            "location": {
                "latitude": latitude,
                "longitude": longitude
            }
        }

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=400, detail=str(e))
