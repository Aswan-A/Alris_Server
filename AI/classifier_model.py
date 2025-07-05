import torch
import open_clip
from PIL import Image
import io

device = "cuda" if torch.cuda.is_available() else "cpu"

# Define labels for classification
labels = ["garbage", "pothole", "electricity", "vehicle"]

model_name = "ViT-B-32-quickgelu"
pretrained = "laion400m_e32"

model, _, preprocess = open_clip.create_model_and_transforms(
    model_name=model_name,
    pretrained=pretrained
)

tokenizer = open_clip.get_tokenizer(model_name)
model = model.to(device).eval()
text_tokens = tokenizer(labels).to(device)

def classify_clip(image_bytes: bytes):
    """Classifies the image and returns the predicted label with probabilities."""
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
    return {
        "label": labels[best_idx],
        "confidence": float(probs[best_idx]),
        "probabilities": {label: float(prob) for label, prob in zip(labels, probs)}
    }
