import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the _site directory
app.use(express.static(path.join(__dirname, '_site')));

// Optional: Handle 404s
app.use((req, res) => {
  res.status(404).send("Sorry, can't find that!");
});

app.listen(port, () => {
  console.log(`Eleventy site served at http://localhost:${port}`);
});
