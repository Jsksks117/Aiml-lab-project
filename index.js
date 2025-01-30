require('dotenv').config();
const express = require('express');
const path = require('path');
const medicalRoutes = require('./medical-api');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.use('/api', medicalRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
