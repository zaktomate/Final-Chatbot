require("dotenv").config();
const axios = require("axios");
const { MongoClient } = require("mongodb");

const API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = "mongodb+srv://zaktomate:SSbAi3LIWISFECy@cluster0.mongodb.net/edtech_bot?retryWrites=true&w=majority&tls=true";
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${API_KEY}`;
const GEMINI_CHAT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function embedText(text) {
  const response = await axios.post(EMBEDDING_URL, {
    content: { parts: [{ text }] },
  });
  return response.data.embedding.values;
}

// async function searchMongo(embedding, topK = 5) {
//   const client = new MongoClient(MONGO_URI);
//   await client.connect();
//   const db = client.db("edtech_bot");
//   const collection = db.collection("course_chunks");

//   const results = await collection
//     .aggregate([
//       {
//         $vectorSearch: {
//           queryVector: embedding,
//           path: "embedding",
//           numCandidates: 100,
//           limit: topK,
//           index: "vector_index",
//           similarity: "cosine",
//         },
//       },
//     ])
//     .toArray();

//   await client.close();
//   return results.map((r) => r.text);
// }

async function searchMongo(embedding, topK = 5) {
  console.log("🧪 Mongo URI:", MONGO_URI);
  const client = new MongoClient(MONGO_URI, {
  tls: true,
});


  console.log("🔍 Trying to connect to MongoDB:", MONGO_URI);
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


// async function askGemini(prompt) {
//   const embedding = await embedText(prompt);
//   const topChunks = await searchMongo(embedding);

//   const context = topChunks.join("\n---\n");

//   const fullPrompt = `Use the following data from an EdTech platform to answer the user's question:\n${context}\n\nUser: ${prompt}`;
//   console.log("\n🔎 Top Matching Chunks from MongoDB:");
//   console.log(topChunks);
//   const response = await axios.post(GEMINI_CHAT_URL, {
//     contents: [
//       {
//         role: "user",
//         parts: [{ text: fullPrompt }],
//       },
//     ],
//   });

//   const answer = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
//   console.log("\n🤖 Gemini Answer:\n", answer || "No response");
// }

async function askGemini(prompt) {
  const embedding = await embedText(prompt);
  const topChunks = await searchMongo(embedding);
  const context = topChunks.join("\n---\n");

  const systemInstruction = `You are a helpful and professional customer service assistant for an EdTech platform in Bangladesh called "Fahad's Tutorial".
Your job is to assist students, parents, and users by answering questions about courses, enrollment, pricing, instructors, and technical issues.

Start the **first** message with a polite Islamic greeting like "Assalamu Alaikum" (if appropriate), but do **not repeat the greeting** in every reply.

Always reply clearly, accurately, and in a friendly tone. If unsure, direct the user to contact fahadstutorial@gmail.com. Avoid making things up.`;

  const fullPrompt = `${systemInstruction}\n\nHere is some data from the platform:\n${context}\n\nNow answer the user's question:\n${prompt}`;

  console.log("\n🔎 Top Matching Chunks from MongoDB:");
  console.log(topChunks);

  const response = await axios.post(GEMINI_CHAT_URL, {
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
  });

  const answer = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("\n🤖 Gemini Answer:\n", answer || "No response");
}

module.exports = askGemini;
