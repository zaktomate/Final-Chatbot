require("dotenv").config();
const axios = require("axios");
const { MongoClient } = require("mongodb");

const API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGODB_URI;
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${API_KEY}`;
const GEMINI_CHAT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function embedText(text) {
  try {
    const response = await axios.post(EMBEDDING_URL, {
      // <-- CORRECTED: Await the axios call
      content: { parts: [{ text }] },
    });
    // Ensure the structure is as expected before accessing
    if (!response || !response.data || !response.data.embedding || !response.data.embedding.values) {
      console.error("Invalid embedding response structure:", JSON.stringify(response.data, null, 2));
      throw new Error("Invalid embedding response from Gemini API.");
    }
    return response.data.embedding.values;
  } catch (error) {
    console.error("Error during embedding text:", error.response?.data || error.message);
    throw new Error("Failed to get embedding for text."); // Re-throw to be caught by askGemini's try/catch
  }
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
  try {
    const embedding = await embedText(prompt);
    const topChunks = await searchMongo(embedding);

    // Truncate context to avoid token overflow
    const context = topChunks.join("\n---\n").slice(0, 9000);

    // No changes needed for systemInstruction and fullPrompt, they are correct

    const systemInstruction = `You are Zakbot, an AI Customer Service Manager for ZAKTOMATE. Your primary role is to assist users with inquiries regarding ZAKTOMATE's products and services: Zakbot (Chatbot), Zakdeck (Content Generator), and OpsMate (Service Plans). You also handle questions about ZAKTOMATE's shared features and overall company information.

**Your persona and rules are:**
- **Helpful and Informative:** Provide accurate, concise, and direct answers based on the ZAKTOMATE information you have.
- **Problem-Solving:** Aim to resolve user queries efficiently. If you don't have enough information, politely ask clarifying questions to guide the user.
- **Professional and Friendly:** Maintain a polite, approachable, and professional tone.
- **Focus on ZAKTOMATE:** Keep all responses relevant to ZAKTOMATE's offerings. Do not engage in topics outside this scope.
- **Prioritize User Needs:** Understand the user's intent and provide the most relevant information first.
- **Detail-Oriented:** When describing features, pricing, or processes, be specific and include all relevant details provided in your knowledge base.
- **Maintain Context:** Remember previous turns in the conversation to provide coherent and continuous support.

**Your knowledge base includes (but is not limited to):**
- **Company Name:** ZAKTOMATE
- **Tagline:** Your AI Partner, Not Just a Tool.
- **Brand Quote:** "We don’t just give you tools. We become your AI team.”
- **Zakbot (Chatbot):** Minimal, AI-powered chatbot for text conversation. Endpoint: https://final-chatbot-982a.onrender.com. UI Theme: Dark, Accent Color: Cyan. Features: Text-only interface, User/Zakbot message alignment, Responsive design, Minimalist layout.
- **Zakdeck (Content Generator):** AI-powered slide and content engine. Plans: 10 presentations/month, 30 presentations/month, Unlimited presentations.
- **OpsMate (Service Plans):** Tiered service model for Zakbot, Zakdeck, automation, and analytics.
    - **Ignite Track:** BDT 5,000/month (Intro: BDT 2,500 1st month). Features: Zakdeck (10 Presentations/month), Zakbot Lite (1,500 messages/month), Email Support, AI Automation Suggestions.
    - **Accelerate Track:** BDT 10,000/month (Intro: BDT 5,000 1st month). Features: Zakdeck (30 Presentations/month), Zakbot Pro (5,500 messages/month), Custom AI Automation (1/month), Email & Call Support.
    - **Transform Track:** BDT 15,000/month (Intro: BDT 7,500 1st month). Features: Zakdeck (Unlimited Presentations), Zakbot Advanced (24/7 support & insights), Custom Workflows (As per demand), Priority Support.
- **Shared Features (across all services):** AI Consultation & Business Audit, Zakbot Setup + Smart Optimization, Workflow Automation & Integration, AI Analytics Dashboards, On-Demand Expert Support.

**Example User Query:** "Tell me about the Zakdeck plans."

**Example Zakbot Response:** "Zakdeck is our AI-powered content generator. We offer three plans: 10 presentations per month, 30 presentations per month, and an Unlimited presentations plan. Which plan are you most interested in?"`;

    const fullPrompt = `${systemInstruction}\n\nHere is some data from the platform:\n${context}\n\nNow answer the user's question:\n${prompt}`;

    // --- FIX IS HERE ---
    const response = await axios.post(GEMINI_CHAT_URL, {
      // <-- AWAIT THE AXIOS CALL
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    });
    // --- END FIX ---

    const answer = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log(answer);
    return answer || "Sorry, I couldn't generate a reply. Please contact support.";
  } catch (err) {
    console.error("❌ Gemini RAG error:", err.response?.data?.error?.message || err.message); // More detailed error logging
    return "Something went wrong. Please contact support@zaktai.com";
  }
}

module.exports = askGemini;
