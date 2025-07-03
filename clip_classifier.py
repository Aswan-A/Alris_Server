# clip_classifier.py
import sys
import torch
from PIL import Image
import open_clip

device = "cuda" if torch.cuda.is_available() else "cpu"

# Load OpenCLIP model (ViT-B/32 pretrained on LAION-400M)
model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion400m_e32')
tokenizer = open_clip.get_tokenizer('ViT-B-32')
model = model.to(device)

# Categories to classify
labels = ["garbage", "pothole", "electricity", "vehicle"]
def classify(image_path):
    image = preprocess(Image.open(image_path)).unsqueeze(0).to(device)
    text = tokenizer(labels).to(device)

    with torch.no_grad():
        image_features = model.encode_image(image)
        text_features = model.encode_text(text)

        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)

        logits_per_image = (image_features @ text_features.T) * 100.0
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()

    best_idx = probs[0].argmax()
    return labels[best_idx]

if __name__ == "__main__":
    image_path = sys.argv[1]
    print(classify(image_path))
