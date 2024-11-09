import express from "express";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();

// Enable CORS for applehand.dev on all routes
app.use(
  cors({
    origin: "https://applehand.dev",
    credentials: true,
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
  console.log(`[INFO] Redirecting to GitHub for authentication: ${githubAuthUrl}`);
  console.log(`[INFO] Generated state for OAuth flow: ${state}`);
  
  res.redirect(githubAuthUrl);
});

// Step 2: Handle GitHub's callback to exchange code for an access token
app.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  console.log(`[INFO] Received callback with code: ${code} and state: ${state}`);
  
  if (!code || !state || !(state in tokenStore)) {
    console.error(`[ERROR] Invalid request in /callback: missing or invalid code/state`);
    return res.status(400).send("Invalid request.");
  }

  try {
    console.log(`[INFO] Exchanging code for access token with GitHub...`);
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

    console.log(`[INFO] GitHub token response status: ${tokenResponse.status}`);
    if (!tokenResponse.ok) {
      console.error(`[ERROR] Failed to fetch access token. Status: ${tokenResponse.status}`);
      return res.status(500).send("Failed to fetch access token.");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log(`[INFO] GitHub token response data:`, tokenData);

    if (!accessToken) {
      console.error("[ERROR] Failed to obtain access token from GitHub response.");
      return res.status(400).send("Failed to obtain access token.");
    }

    tokenStore[state] = accessToken;
    console.log(`[INFO] Access token stored for state: ${state}`);

    // Step 3: Return HTML to communicate with the DecapCMS parent window
    res.send(`
      <html>
        <head>
          <script>
            console.log("Sending structured message to DecapCMS parent window with token");
            const message = {
              type: "authorization",
              provider: "github",
              result: "success",
              content: { access_token: "${accessToken}" }
            };
            try {
              window.opener.postMessage(JSON.stringify(message), 'https://applehand.dev/admin');
              console.log("Structured message sent to parent window:", JSON.stringify(message));
              window.close();
            } catch (e) {
              console.error("Error posting message to parent window:", e);
            }
          </script>
        </head>
        <body>
          <p>Authorization successful. Please wait...</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("[ERROR] Error during authentication:", error);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`[INFO] OAuth server is running on http://localhost:${PORT}`);
});
