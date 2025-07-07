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
print(f"Using device: {device}")

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
    embedding_list = embedding.squeeze(0).cpu().tolist()
    print("Embedding length:", len(embedding_list))
    print("Embedding sample:", embedding_list[:5])
    return embedding_list

def merge_model(image_bytes: bytes, latitude: float, longitude: float):
    print(f"\n Checking location: ({latitude}, {longitude})")
    embedding = extract_clip_embedding(image_bytes)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, issue_id, embedding <=> %s::vector AS distance
    FROM uploads
    WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(%s, %s), 4326),
        10
    )
    AND embedding <=> %s::vector < 0.2
    ORDER BY distance
    LIMIT 1;
""", (embedding, longitude, latitude, embedding))


    match = cursor.fetchone()

    if match:
        match_id, issue_id, distance = match
        print(f"Match found! Issue ID: {issue_id}")
        print(f"Cosine Distance: {distance:.5f}")
        return {
            "embedding": embedding,
            "issue_id": issue_id,
            "is_duplicate": True,
            "duplicate_of_id": match_id,
            "distance": distance
        }
    else:
        new_issue_id = str(uuid.uuid4())
        print("New issue — no match found.")
        return {
            "embedding": embedding,
            "issue_id": new_issue_id,
            "is_duplicate": False,
            "duplicate_of_id": None
        }
