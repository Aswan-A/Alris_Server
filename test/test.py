import requests

url = "http://localhost:5000/upload"
files = {
    "photo": ("test.jpeg", open("./test/test.jpeg", "rb"), "image/jpeg")
}

data = {
    "latitude": "12.34",
    "longitude": "56.78",
    "description": "Test upload for pothole",
    "userId":"183"
}

response = requests.post(url, files=files, data=data)

print("Status Code:", response.status_code)
data = response.json()
print(f"✅ Label: {data['classification']['label']}")
print(f"📍 Location: ({data['location']['latitude']}, {data['location']['longitude']})")
