const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

module.exports = async function runFakeDetection(imagePath) {
  const form = new FormData();
  form.append("photo", fs.createReadStream(imagePath));

  const response = await axios.post("http://localhost:8000/fake", form, {
    headers: form.getHeaders(),
  });

  return response.data; 
};
