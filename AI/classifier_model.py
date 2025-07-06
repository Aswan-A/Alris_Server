import torch
import open_clip
from PIL import Image
import io

device = "cuda" if torch.cuda.is_available() else "cpu"

model_name = "ViT-B-32-quickgelu"
pretrained = "laion400m_e32"

model, _, preprocess = open_clip.create_model_and_transforms(
    model_name=model_name,
    pretrained=pretrained
)

tokenizer = open_clip.get_tokenizer(model_name)
model = model.to(device).eval()

labels = [
    "garbage dumping",
    "open pothole",
    "damaged road",
    "abandoned vehicle",
    "illegal construction",
    "street light not working",
    "water logging",
    "stray animals",
    "fallen tree",
    "fire hazard",
    "public urination",
    "open manhole",
    "unauthorized parking",
    "faded zebra crossing",
    "unsafe electrical pole",
    "broken footpath",
    "blocked drainage"
]

label_to_department = {
    "garbage dumping": "Municipal Waste Management",
    "open pothole": "Public Works Department",
    "damaged road": "Road Maintenance",
    "abandoned vehicle": "Traffic Police",
    "illegal construction": "Town Planning",
    "street light not working": "Electricity Department",
    "water logging": "Drainage Board",
    "stray animals": "Animal Control",
    "fallen tree": "Disaster Management",
    "fire hazard": "Fire Department",
    "public urination": "Sanitation Department",
    "open manhole": "Sewerage Board",
    "unauthorized parking": "Traffic Police",
    "faded zebra crossing": "Road Safety",
    "unsafe electrical pole": "Electricity Department",
    "broken footpath": "Urban Development",
    "blocked drainage": "Drainage Board"
}

text_tokens = tokenizer(labels).to(device)

def classify_clip(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_tensor = preprocess(image).unsqueeze(0).to(device)

    with torch.no_grad():
        image_features = model.encode_image(image_tensor)
        text_features = model.encode_text(text_tokens)

        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)

        logits_per_image = (image_features @ text_features.T) * 100.0
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]

    best_idx = probs.argmax()
    best_label = labels[best_idx]
    responsible_authority = label_to_department.get(best_label, "General Department")

    return {
        "label": best_label,
        "confidence": float(probs[best_idx]),
        "probabilities": {label: float(prob) for label, prob in zip(labels, probs)},
        "department": responsible_authority
    }
