// server.js
const express = require('express');
const { exec } = require('child_process');

const app = express();

app.get('/run', (req, res) => {
  exec('node index.js && node eval-index.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).send(`Error: ${error.message}`);
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    console.log(`Output: ${stdout}`);
    res.send('Both scripts executed.');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
