import requests

url = "https://alris-server.onrender.com/upload"
files = {"photo": open("test.jpeg", "rb")}
data = {"latitude": "12.34", "longitude": "56.78"}

response = requests.post(url, files=files, data=data)
print(response.json())
