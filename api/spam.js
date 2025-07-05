const axios = require("axios");

module.exports = async function runSpamCheck(description) {
  const response = await axios.post("http://localhost:8000/spam", {
    description,
  });

  return response.data; 
};
