import requests

url = "http://localhost:5000/upload"
files = {"photo": open("./test/test.jpeg", "rb")}
data = {
    "latitude": "12.34",
    "longitude": "56.78",
    "description": "Test upload for pothole"
}

response = requests.post(url, files=files, data=data)
print(response.status_code)
print(response.json())
