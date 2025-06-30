// index.js (Backend for Website Chat)

require("dotenv").config(); // Loads environment variables from .env
const express = require("express");
const cors = require("cors"); // REQUIRED: For your website frontend to communicate
const askGemini = require("./bot"); // Your RAG logic from bot.js

const app = express();

// --- Middleware ---
app.use(express.json()); // Modern way to parse JSON
app.use(cors()); // Enable CORS for frontend

// --- API Endpoint for your Website Frontend ---
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string" || userMessage.trim() === "") {
      console.warn("Received invalid or empty message:", req.body);
      return res.status(400).json({ error: "Invalid or empty 'message' in request body." });
    }

    console.log("💬 Received message from website:", userMessage);

    const geminiReply = await askGemini(userMessage);

    res.status(200).json({ reply: geminiReply });
  } catch (error) {
    console.error("❌ Error processing chat request from website:", error); // Full stack trace
    res
      .status(500)
      .json({ error: "An internal server error occurred while processing your request. Please try again later." });
  }
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend API running on port ${PORT}`));
