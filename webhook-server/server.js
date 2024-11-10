const express = require("express");
const bodyParser = require("body-parser");
const simpleGit = require("simple-git");
const { exec } = require("child_process");

const app = express();
const PORT = 3001;
const REPO_PATH = "/usr/src/app";  // Repository root
const BUILD_PATH = "/usr/src/app/eleventy";  // Path to run Eleventy build
const BRANCH = "master";

app.use(bodyParser.json());

// Function to trigger the Eleventy rebuild in the specified directory
function rebuildSite() {
  exec("npx eleventy", { cwd: BUILD_PATH }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error rebuilding site: ${error.message}`);
      return;
    }
    console.log("Eleventy site rebuilt successfully.");
    console.log(`Build output: ${stdout}`);
    if (stderr) console.error(`Build errors: ${stderr}`);
  });
}

app.post("/webhook", async (req, res) => {
  const payload = req.body;
  console.log("Received payload: ", payload);
  try {
    const git = simpleGit(REPO_PATH);
    await git.pull("origin", BRANCH);
    console.log("Repository updated successfully.");

    // Trigger the site rebuild
    rebuildSite();

    res.status(200).send("Pull and rebuild complete");
  } catch (error) {
    console.error("Failed to update repository:", error);
    res.status(500).send("Error pulling repository");
  }
});

app.listen(PORT, () => {
  console.log(`Listening for webhooks on port ${PORT}`);
});
