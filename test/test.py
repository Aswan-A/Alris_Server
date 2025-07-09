import base64
import json
import requests
import os

# Endpoint for multi-upload
url = "http://localhost:5000/upload/multi"

# Helper function to encode image to base64
def encode_image(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Image file not found: {path}")
    with open(path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

# Prepare payload
try:
    payload = {
        "latitude": 12.34,
        "longitude": 56.78,
        "userId": "183",
        "description": "test description ",
        "images": [
            {
                "filename": "test1.jpeg",
                "base64": encode_image("./test/test1.jpeg")
            },
            {
                "filename": "test2.jpeg",
                "base64": encode_image("./test/test2.png")
            }
        ]
    }

    # Set headers
    headers = {"Content-Type": "application/json"}

    # Send request
    response = requests.post(url, data=json.dumps(payload), headers=headers)

    # Handle response
    print("Status Code:", response.status_code)
    try:
        data = response.json()
        print(json.dumps(data, indent=2))
    except json.JSONDecodeError:
        print("❌ Failed to parse JSON")
        print(response.text)

except Exception as e:
    print(f"❌ Error: {e}")
