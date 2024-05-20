const axios = require("axios");

const fetch_tweet = async (username) => {
  const options = {
    method: "GET",
    url: "https://twitter-api45.p.rapidapi.com/timeline.php",
    params: {
      screenname: `${username}`,
    },
    headers: {
      "X-RapidAPI-Key": "5862104581msh873139d0f43b307p1e268fjsna0966e690527",
      "X-RapidAPI-Host": "twitter-api45.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    
    return response.data;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = { fetch_tweet };
