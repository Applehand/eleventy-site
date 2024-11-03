const express = require("express");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://applehand.dev/auth/callback";

// In-memory token store (consider using a database for production)
const tokenStore = {};

// Redirect to GitHub for authentication
app.get("/auth", (req, res) => {
  const state = uuidv4(); // Generate a unique state parameter
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${state}`;
  tokenStore[state] = null; // Store state to validate later
  res.redirect(githubAuthUrl);
});

// Handle GitHub's callback and exchange code for an access token
app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state || !(state in tokenStore)) {
    return res.status(400).send("Invalid request.");
  }

  try {
    // Exchange the authorization code for an access token
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

    // Store the access token with the state as the key
    tokenStore[state] = accessToken;

    // Redirect to Decap CMS with the state as a parameter
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

  // Optionally, delete the token after retrieval for security
  delete tokenStore[state];

  // Respond with the access token
  res.json({ access_token: accessToken });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`OAuth server is running on http://localhost:${PORT}`);
});
