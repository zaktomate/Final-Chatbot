// index.js (Backend for Website Chat)

require("dotenv").config(); // Loads environment variables from .env
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); // REQUIRED: For your website frontend to communicate
const askGemini = require("./bot"); // Your RAG logic from bot.js

const app = express();

// --- Middleware ---
app.use(bodyParser.json()); // To parse JSON request bodies from the frontend
app.use(cors());            // To allow requests from your frontend's domain (Cross-Origin Resource Sharing)

// --- API Endpoint for your Website Frontend ---
// This route will receive the user's message from your website
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message; // Expecting { message: "User's query" } from frontend

    // Basic validation for the incoming message
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
      console.warn("Received invalid or empty message:", req.body);
      return res.status(400).json({ error: "Invalid or empty 'message' in request body." });
    }

    console.log("💬 Received message from website:", userMessage);

    // Call your RAG logic to get a reply from Gemini
    const geminiReply = await askGemini(userMessage);

    // Send the AI's reply back to your website
    res.status(200).json({ reply: geminiReply });

  } catch (error) {
    console.error("❌ Error processing chat request from website:", error.message);
    // Send a generic error message to the frontend, log full error details internally
    res.status(500).json({ error: "An internal server error occurred while processing your request. Please try again later." });
  }
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000
app.listen(PORT, () => console.log(`✅ Backend API running on port ${PORT}`));
