const express = require("express");
const bodyParser = require("body-parser");
const simpleGit = require("simple-git");

const app = express();
const PORT = 3001;
const REPO_PATH = "/usr/src/app";  // Updated path for Docker container
const BRANCH = "master";

app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
  const payload = req.body;
  console.log("Received payload: ", payload);
  try {
    const git = simpleGit(REPO_PATH);
    await git.pull("origin", BRANCH);
    console.log("Repository updated successfully.");
    res.status(200).send("Pull complete");
  } catch (error) {
    console.error("Failed to update repository:", error);
    res.status(500).send("Error pulling repository");
  }
});

app.listen(PORT, () => {
  console.log(`Listening for webhooks on port ${PORT}`);
});
