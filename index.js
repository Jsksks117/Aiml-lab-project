const express = require('express');
const path = require('path');
const medicalRoutes = require('./medical-api');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Use medical routes
app.use('/api', medicalRoutes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
