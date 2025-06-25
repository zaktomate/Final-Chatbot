require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const askGemini = require("./bot"); // Your RAG logic

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Facebook verification (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log("MODE:", mode);
  console.log("TOKEN:", token);
  console.log("EXPECTED TOKEN:", VERIFY_TOKEN);
  console.log("CHALLENGE:", challenge);

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Messenger Webhook (POST)
// app.post("/webhook", async (req, res) => {
//   const body = req.body;

//   if (body.object === "page") {
//     for (const entry of body.entry) {
//       for (const event of entry.messaging) {
//         const sender = event.sender.id;
//         const message = event.message?.text;

//         if (message) {
//           const reply = await askGemini(message);
//           await sendReply(sender, reply);
//         }
//       }
//     }
//     res.status(200).send("EVENT_RECEIVED");
//   } else {
//     res.sendStatus(404);
//   }
// });

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object === "page") {
      body.entry.forEach(async (entry) => {
        const event = entry.messaging[0];

        // Safe check to avoid undefined errors
        if (event.message && event.sender && event.sender.id) {
          const senderId = event.sender.id;
          const messageText = event.message.text;

          console.log("Received message:", messageText);

          const reply = await askGemini(messageText); // your RAG logic
          await sendMessage(senderId, reply);
        } else {
          console.log("Non-message event or missing sender ID:", event);
        }
      });

      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.sendStatus(500);
  }
});


async function sendMessage(senderId, messageText) {
  if (!messageText) {
    console.warn("⚠️ No message text provided to sendMessage");
  }

  console.log("📤 Sending to Messenger:", messageText);

  try {
    await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
      recipient: { id: senderId },
      message: { text: messageText || "Sorry, I couldn't process that." },
    });
  } catch (error) {
    console.error("❌ Error sending to Messenger:", error.response?.data || error.message);
  }
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Webhook running on port ${PORT}`));
