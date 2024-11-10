const express = require("express");
const bodyParser = require("body-parser");
const simpleGit = require("simple-git");
const { exec } = require("child_process");

const app = express();
const PORT = 3001;
const REPO_PATH = "/home/nonpolar/Projects/eleventy-site"; // Repository root
const BUILD_PATH = "/home/nonpolar/Projects/eleventy-site/eleventy"; // Path to run Eleventy build
const BRANCH = "master";
const PM2_PROCESS_NAME = "eleventy-site"; // PM2 process name

app.use(bodyParser.json());

// Function to trigger the Eleventy rebuild and restart PM2
function rebuildSite() {
  exec("npx eleventy", { cwd: BUILD_PATH }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error rebuilding site: ${error.message}`);
      return;
    }
    console.log("Eleventy site rebuilt successfully.");
    console.log(`Build output: ${stdout}`);
    if (stderr) console.error(`Build errors: ${stderr}`);

    // Restart the PM2 process
    exec(`pm2 restart ${PM2_PROCESS_NAME}`, (pm2Error, pm2Stdout, pm2Stderr) => {
      if (pm2Error) {
        console.error(`Error restarting PM2 process: ${pm2Error.message}`);
        return;
      }
      console.log(`PM2 process '${PM2_PROCESS_NAME}' restarted successfully.`);
      console.log(`PM2 output: ${pm2Stdout}`);
      if (pm2Stderr) console.error(`PM2 errors: ${pm2Stderr}`);
    });
  });
}

app.post("/webhook", async (req, res) => {
  const payload = req.body;
  console.log("Received payload: ", payload);
  try {
    const git = simpleGit(REPO_PATH);
    await git.pull("origin", BRANCH);
    console.log("Repository updated successfully.");

    // Trigger the site rebuild and PM2 restart
    rebuildSite();

    res.status(200).send("Pull, rebuild, and PM2 restart complete");
  } catch (error) {
    console.error("Failed to update repository:", error);
    res.status(500).send("Error pulling repository");
  }
});

app.listen(PORT, () => {
  console.log(`Listening for webhooks on port ${PORT}`);
});
