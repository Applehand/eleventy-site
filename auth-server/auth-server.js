import express from "express";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// In-memory token store
const tokenStore = {};

app.get("/", (req, res) => {
    res.redirect("/auth");
  });

// Redirect to GitHub for authentication
app.get("/auth", (req, res) => {
  const state = uuidv4();
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
  tokenStore[state] = null;
  res.redirect(githubAuthUrl);
});

// Handle GitHub's callback and exchange code for an access token
app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state || !(state in tokenStore)) {
    return res.status(400).send("Invalid request.");
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        state,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).send("Failed to obtain access token.");
    }

    tokenStore[state] = accessToken;

    res.redirect(`https://applehand.dev/admin/#state=${state}`);
  } catch (error) {
    console.error("Error during authentication:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint for Decap CMS to retrieve the actual access token
app.get("/auth/token", (req, res) => {
  const { state } = req.query;
  const accessToken = tokenStore[state];

  if (!accessToken) {
    return res.status(404).send("Token not found or has expired.");
  }

  delete tokenStore[state];

  res.json({ access_token: accessToken });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`OAuth server is running on http://localhost:${PORT}`);
});
