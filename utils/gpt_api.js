const axios = require('axios');

const apiKey = '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';

async function callChatGPT(prompt) {
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  try {
    const response = await axios.post(
      apiUrl,
      {
        model: "gpt-3.5-turbo", 
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const message = response.data.choices[0].message.content;
    console.log("ChatGPT Response:", message);
    return message;
  } catch (error) {
    console.error('Error calling ChatGPT API:', error.response ? error.response.data : error.message);
  }
}


const prompt = `
create a similar tweet ad using this content and should be professional,smooth, human looking

Introducing the premier destination for high-end replica watches that offer exceptional value without compromising on quality. We pride ourselves on providing the finest replicas of the most sought-after luxury timepieces. Our collection features automatic movements that perfectly mirror the intricate mechanics of the originals, ensuring a seamless and authentic experience for our customers. Each watch is meticulously crafted using top-grade materials, capturing the essence and elegance of the genuine article. Whether you're looking for a classic design or a contemporary masterpiece, we offer the best prices for unmatched quality, making luxury accessible to all.
`;


callChatGPT(prompt);
