import express from "express";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();

// Enable CORS for applehand.dev
app.use(
  cors({
    origin: "https://applehand.dev", // Allow only applehand.dev
  })
);

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// In-memory token store
const tokenStore = {};

// Step 1: Initiate the GitHub OAuth flow from /auth
app.get("/auth", (req, res) => {
  const state = uuidv4();
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&state=${state}`;
  tokenStore[state] = null;
  console.log("Redirecting to GitHub for authentication:", githubAuthUrl); // Debug log
  res.redirect(githubAuthUrl);
});

// Step 2: Handle GitHub's callback to exchange code for an access token
app.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state || !(state in tokenStore)) {
    console.error("Invalid request in /callback: missing code or state"); // Debug log
    return res.status(400).send("Invalid request.");
  }

  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
          state,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("Failed to obtain access token"); // Debug log
      return res.status(400).send("Failed to obtain access token.");
    }

    tokenStore[state] = accessToken;

    // Step 3: Redirect back to DecapCMS with the state in the URL hash
    res.redirect(`https://applehand.dev/admin/#state=${state}`);
  } catch (error) {
    console.error("Error during authentication:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Step 4: Endpoint for DecapCMS to retrieve the actual access token
app.get("/token", (req, res) => {
  const { state } = req.query;
  console.log("Token request received with state:", state); // Debug log
  const accessToken = tokenStore[state];

  if (!accessToken) {
    console.error("Token not found or expired for state:", state); // Debug log
    return res.status(404).send("Token not found or has expired.");
  }

  delete tokenStore[state];
  console.log("Returning access token:", accessToken); // Debug log

  res.json({ access_token: accessToken });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`OAuth server is running on http://localhost:${PORT}`);
});
