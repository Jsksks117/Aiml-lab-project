const axios = require('axios');
const cheerio = require('cheerio');

class DoctorScraper {
    constructor() {
        this.baseUrl = 'https://www.justdial.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
    }

    async searchDoctors(specialty, location) {
        try {
            const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(specialty + ' doctors')}&location=${encodeURIComponent(location)}`;
            const response = await axios.get(searchUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            const doctors = [];
            
            // Adjust selectors based on JustDial's current HTML structure
            $('.doctorCard').each((i, element) => {
                const doctor = {
                    name: $(element).find('.doctor-name').text().trim(),
                    specialty: $(element).find('.specialty').text().trim(),
                    address: $(element).find('.address').text().trim(),
                    rating: $(element).find('.rating').text().trim(),
                    phone: $(element).find('.phone').text().trim(),
                    experience: $(element).find('.experience').text().trim(),
                    timing: $(element).find('.timing').text().trim()
                };
                doctors.push(doctor);
            });

            return doctors;
        } catch (error) {
            console.error('Error scraping doctors:', error);
            return [];
        }
    }

    async getHospitals(location) {
        try {
            const searchUrl = `${this.baseUrl}/search?q=hospitals&location=${encodeURIComponent(location)}`;
            const response = await axios.get(searchUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            const hospitals = [];
            
            $('.hospitalCard').each((i, element) => {
                const hospital = {
                    name: $(element).find('.hospital-name').text().trim(),
                    address: $(element).find('.address').text().trim(),
                    rating: $(element).find('.rating').text().trim(),
                    phone: $(element).find('.phone').text().trim(),
                    facilities: $(element).find('.facilities').text().trim(),
                    emergency: $(element).find('.emergency').text().trim()
                };
                hospitals.push(hospital);
            });

            return hospitals;
        } catch (error) {
            console.error('Error scraping hospitals:', error);
            return [];
        }
    }
}

module.exports = new DoctorScraper(); 