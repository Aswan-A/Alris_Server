import requests

url = "http://localhost:5000/upload"
files = {
    "photo": ("test.jpeg", open("./test/test.jpeg", "rb"), "image/jpeg")
}

data = {
    "latitude": "12.34",
    "longitude": "56.78",
    "description": "Test upload for pothole"
}

response = requests.post(url, files=files, data=data)

print("Status Code:", response.status_code)
print("Response Text:", response.text)  


try:
    print(response.json())
except Exception as e:
    print("Could not parse JSON:", str(e))
