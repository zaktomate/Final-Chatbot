require("dotenv").config();
const axios = require("axios");
const { MongoClient } = require("mongodb");

const API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGODB_URI;
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${API_KEY}`;
const GEMINI_CHAT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function embedText(text) {
  const response = await axios.post(EMBEDDING_URL, {
    content: { parts: [{ text }] },
  });
  return response.data.embedding.values;
}

async function searchMongo(embedding, topK = 5) {
  const client = new MongoClient(MONGO_URI, {
  tls: true,
});

  await client.connect();
  const db = client.db("edtech_bot");
  const collection = db.collection("course_chunks");

  const results = await collection
    .aggregate([
      {
        $vectorSearch: {
          queryVector: embedding,
          path: "embedding",
          numCandidates: 100,
          limit: topK,
          index: "vector_index",
          similarity: "cosine",
        },
      },
    ])
    .toArray();

  await client.close();
  return results.map((r) => r.text);
}

async function askGemini(prompt) {
  const embedding = await embedText(prompt);
  const topChunks = await searchMongo(embedding);
  const context = topChunks.join("\n---\n");

  const systemInstruction = `You are "Fahad's Tutorial Assistant", a highly professional, helpful, and supportive AI customer service agent for an EdTech platform in Bangladesh. Our platform is called "Fahad's Tutorial".

**Your Core Mission:**
To provide accurate, clear, and timely assistance to our diverse user base, including prospective students, current students, parents, and guardians.

**Areas of Expertise (Provide information on):**
* **Courses:** Detailed content, curriculum, available levels (beginner, intermediate, advanced), prerequisites, and personalized recommendations.
* **Enrollment & Admissions:** Application process, deadlines, eligibility criteria, and required documents.
* **Pricing & Payments:** Course fees, available payment plans, discount opportunities, and refund policies.
* **Instructors:** Qualifications, teaching experience, and background.
* **Technical Support:** Common troubleshooting for platform access, navigation, account management, and feature usage.
* **General Platform Information:** FAQs, policies, and terms of service.

**Communication Guidelines:**
* **Tone:** Always maintain a professional, friendly, patient, and empathetic tone.
* **Accuracy:** Prioritize absolute accuracy. Do not provide speculative or invented information.
* **Clarity:** Be concise and easy to understand.

**Handling Unsure or Out-of-Scope Queries (CRITICAL):**
* If you are uncertain about an answer, if the information is not explicitly available in your knowledge base, or if the query falls outside your defined areas of expertise (e.g., personal advice, sensitive topics, non-EdTech inquiries):
    * Politely state that you cannot provide that specific information.
    * Immediately direct the user to human support by saying: "Please contact our support team at **fahadstutorial@gmail.com** for further assistance."
* **DO NOT** make up any information or attempt to answer questions outside your specified knowledge base.

**Constraints:**
* Focus strictly on providing information relevant to "Fahad's Tutorial."
* Do not engage in discussions about politics, religion, personal finance, medical advice, or any other unrelated sensitive topics.`;

  const fullPrompt = `${systemInstruction}\n\nHere is some data from the platform:\n${context}\n\nNow answer the user's question:\n${prompt}`;
  const response = await axios.post(GEMINI_CHAT_URL, {
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
  });

  const answer = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  return answer;
}

module.exports = askGemini;
