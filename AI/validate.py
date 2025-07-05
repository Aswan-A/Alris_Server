from fastapi import HTTPException, UploadFile

def validate_inputs(photo: UploadFile, image_bytes: bytes, description: str = None):
    try:
        return 1
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid ") from e
