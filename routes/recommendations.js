const express = require('express');
const router = express.Router();
const DoctorScraper = require('../utils/scraper');

// Get doctor recommendations based on specialty
router.get('/doctors/:specialty/:location', async (req, res) => {
    try {
        const { specialty, location } = req.params;
        const doctors = await DoctorScraper.searchDoctors(specialty, location);
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching doctor recommendations' });
    }
});

// Get nearby hospitals
router.get('/hospitals/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const hospitals = await DoctorScraper.getHospitals(location);
        res.json(hospitals);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching hospital recommendations' });
    }
});

module.exports = router; 