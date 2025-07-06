import os
import uuid
import torch
import open_clip
import numpy as np
from PIL import Image
from io import BytesIO
import psycopg2
from dotenv import load_dotenv
from pgvector.psycopg2 import register_vector 
from urllib.parse import urlparse


load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL not found in environment.")


parsed = urlparse(db_url)
conn = psycopg2.connect(
    dbname=parsed.path.lstrip("/"),
    user=parsed.username,
    password=parsed.password,
    host=parsed.hostname,
    port=parsed.port,
    sslmode="require"
)
register_vector(conn)


device = "cuda" if torch.cuda.is_available() else "cpu"

model_name = "ViT-B-32-quickgelu"
pretrained = "laion400m_e32"

model, _, preprocess = open_clip.create_model_and_transforms(
    model_name=model_name,
    pretrained=pretrained
)
tokenizer = open_clip.get_tokenizer(model_name)
model = model.to(device).eval()


def extract_clip_embedding(image_bytes: bytes) -> list:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image_tensor = preprocess(image).unsqueeze(0).to(device)
    with torch.no_grad():
        embedding = model.encode_image(image_tensor)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
    return embedding.squeeze(0).cpu().tolist()


def merge_model(image_bytes: bytes, latitude: float, longitude: float):
    embedding = extract_clip_embedding(image_bytes)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, issue_id
    FROM uploads
    WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(%s, %s), 4326),
        10
    )
    AND embedding <#> %s::vector < 0.15
    ORDER BY embedding <#> %s::vector
    LIMIT 1;
""", (longitude, latitude, embedding, embedding))



    match = cursor.fetchone()

    if match:
        match_id, issue_id = match
        print("Matched Issue ID:", issue_id)
        return {
            "embedding": embedding,
            "issue_id": issue_id,
            "is_duplicate": True,
            "duplicate_of_id": match_id
        }
    else:
        new_issue_id = str(uuid.uuid4())
        print("New issue created.")
        return {
            "embedding": embedding,
            "issue_id": new_issue_id,
            "is_duplicate": False,
            "duplicate_of_id": None
        }
