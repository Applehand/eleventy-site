const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');

const app = express();
const PORT = 3001;
const REPO_PATH = '/home/nonpolar/Projects/eleventy-site/eleventy';
const BRANCH = 'master'; 

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
    const payload = req.body;

    if (payload && payload.ref === `refs/heads/${BRANCH}`) {
        try {
            const git = simpleGit(REPO_PATH);
            await git.pull('origin', BRANCH);
            console.log('Repository updated successfully.');
            res.status(200).send('Pull complete');
        } catch (error) {
            console.error('Failed to update repository:', error);
            res.status(500).send('Error pulling repository');
        }
    } else {
        res.status(400).send('No matching branch update');
    }
});

app.listen(PORT, () => {
    console.log(`Listening for webhooks on port ${PORT}`);
});
