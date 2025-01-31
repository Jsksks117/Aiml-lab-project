document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const welcomeMessage = document.getElementById('welcome-message');
    let userLocation = null;

    // Get user's location quietly in the background
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            },
            error => console.error('Geolocation error:', error)
        );
    }

    async function searchNearbyHealthcare(location, type = 'doctors') {
        const results = [];
        
        // Try OpenStreetMap first
        try {
            const osmQuery = `
                [out:json][timeout:25];
                (
                    node["healthcare"="doctor"](around:5000,${location.lat},${location.lng});
                    way["healthcare"="doctor"](around:5000,${location.lat},${location.lng});
                    node["amenity"="hospital"](around:5000,${location.lat},${location.lng});
                    way["amenity"="hospital"](around:5000,${location.lat},${location.lng});
                );
                out body;
                >;
                out skel qt;
            `;
            const osmResponse = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: osmQuery
            });
            const osmData = await osmResponse.json();
            results.push(...osmData.elements);
        } catch (error) {
            console.error('OpenStreetMap error:', error);
        }

        // Try Here Maps API as backup
        try {
            const hereResponse = await fetch(
                `https://discover.search.hereapi.com/v1/discover?at=${location.lat},${location.lng}&q=${type}&limit=10&apiKey=${process.env.HERE_API_KEY}`
            );
            const hereData = await hereResponse.json();
            
            const mappedHereResults = hereData.items.map(item => ({
                tags: {
                    name: item.title,
                    'addr:street': item.address.street,
                    'addr:housenumber': item.address.houseNumber,
                    'addr:city': item.address.city,
                    phone: item.contacts?.[0]?.phone?.[0]?.value,
                    opening_hours: item.openingHours?.text
                }
            }));
            results.push(...mappedHereResults);
        } catch (error) {
            console.error('Here Maps error:', error);
        }

        return results;
    }

    function formatRecommendations(places) {
        if (!places || places.length === 0) return '';
        
        const recommendations = places.slice(0, 3).map(place => {
            const name = place.tags.name || 'Healthcare Facility';
            const address = [
                place.tags['addr:street'],
                place.tags['addr:housenumber'],
                place.tags['addr:city']
            ].filter(Boolean).join(', ');

            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`;

            let facilityInfo = [
                `<div class="facility-info">`,
                `<div class="facility-name">🏥 <strong>${name}</strong></div>`,
                place.tags.phone ? `<div>📞 ${place.tags.phone}</div>` : '',
                place.tags.opening_hours ? `<div>🕒 ${place.tags.opening_hours}</div>` : '',
                `<div class="maps-link"><a href="${mapsLink}" target="_blank">📍 View on Google Maps</a></div>`,
                `</div>`
            ].filter(Boolean);

            return facilityInfo.join('\n');
        }).join('\n\n');

        return `\n\n<strong>NEARBY HEALTHCARE FACILITIES:</strong>\n${recommendations}`;
    }

    async function scrapeDoctors(specialty, location) {
        try {
            // Try scraping from Practo (or similar healthcare directory)
            const searchUrl = `https://www.practo.com/${location}/doctor/${specialty}`;
            const response = await axios.get(searchUrl);
            const $ = cheerio.load(response.data);
            
            const doctors = [];
            
            // Adjust selectors based on the website structure
            $('.doctor-listing').each((i, element) => {
                if (i >= 5) return; // Limit to 5 doctors
                
                const name = $(element).find('.doctor-name').text().trim();
                const qualification = $(element).find('.doctor-qualification').text().trim();
                const experience = $(element).find('.doctor-experience').text().trim();
                const location = $(element).find('.doctor-location').text().trim();
                
                // Create Google Maps link for doctor
                const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Dr. ${name} ${location}`)}`;
                
                doctors.push({
                    name,
                    qualification,
                    experience,
                    location,
                    mapsLink
                });
            });
            
            return doctors;
        } catch (error) {
            console.error('Error scraping doctors:', error);
            return [];
        }
    }

    async function getMedicalResponse(userMessage) {
        try {
            const response = await fetch('/api/medical-advice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: userMessage })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            let fullResponse = data.response;

            // Extract specialty and location
            const specialty = extractHealthcareKeywords(data.response);
            const userCity = await getUserCity(userLocation);
            
            // Get doctors through web scraping
            const doctors = await scrapeDoctors(specialty, userCity);
            
            // Format doctor recommendations with maps links
            if (doctors.length > 0) {
                fullResponse += '\n\n<strong>👨‍⚕️ RECOMMENDED DOCTORS IN YOUR AREA:</strong>';
                doctors.forEach(doctor => {
                    const doctorInfo = [
                        `<div class="doctor-info">`,
                        `<div class="doctor-name">🔸 <strong>Dr. ${doctor.name}</strong></div>`,
                        `<div>📚 ${doctor.qualification}</div>`,
                        `<div>⏳ ${doctor.experience}</div>`,
                        `<div class="maps-link"><a href="${doctor.mapsLink}" target="_blank">📍 View on Google Maps</a></div>`,
                        `</div>`
                    ];
                    fullResponse += doctorInfo.join('\n');
                });
            }

            // Add existing nearby facility recommendations
            if (userLocation) {
                const facilities = await searchNearbyHealthcare(userLocation, specialty);
                const recommendations = formatRecommendations(facilities);
                fullResponse += recommendations;
            }

            return fullResponse;
        } catch (error) {
            console.error('Error:', error);
            return 'I apologize, but I encountered an error processing your request. Please try again.';
        }
    }

    function extractHealthcareKeywords(response) {
        const specialties = {
            'Cardiology': ['heart', 'chest pain', 'chest ache', 'cardiac', 'blood pressure', 'palpitations', 'arrhythmia', 'cardiovascular', 'angina', 'cholesterol', 'stroke', 'circulation', 'heart attack', 'hypertension', 'heart racing', 'chest tightness', 'heart burning'],
            'Dermatology': ['skin', 'rash', 'acne', 'eczema', 'dermatitis', 'psoriasis', 'mole', 'melanoma', 'itching', 'hives', 'skin cancer', 'wart', 'rosacea', 'skin infection'],
            'Orthopedics': ['bone', 'joint', 'fracture', 'sprain', 'arthritis', 'tendon', 'ligament', 'muscle pain', 'back pain', 'spine', 'knee', 'shoulder', 'hip', 'osteoporosis', 'sports injury', 'aching joints', 'bone ache', 'muscle ache', 'joint stiffness', 'back ache', 'neck ache', 'leg ache', 'arm ache', 'knee pain', 'ankle pain', 'wrist pain', 'elbow pain'],
            'Pediatrics': ['child', 'infant', 'pediatric', 'vaccination', 'growth', 'development', 'childhood', 'newborn', 'baby', 'toddler', 'immunization', 'pediatric fever'],
            'Neurology': ['headache', 'migraine', 'brain', 'seizure', 'dizziness', 'numbness', 'tremor', 'memory loss', 'stroke', 'multiple sclerosis', 'epilepsy', 'vertigo', 'neuropathy', 'head pain', 'head ache', 'throbbing head', 'nerve pain', 'tingling sensation', 'pins and needles', 'head pressure', 'brain fog'],
            'Ophthalmology': ['eye', 'vision', 'optical', 'cataract', 'glaucoma', 'retina', 'blindness', 'eye pain', 'blurred vision', 'double vision', 'eye infection', 'eye pressure'],
            'Dental': ['tooth', 'teeth', 'dental', 'gum', 'cavity', 'toothache', 'wisdom tooth', 'dental pain', 'root canal', 'dental crown', 'dental bridge', 'gingivitis', 'oral health', 'tooth pain', 'teeth ache', 'tooth ache', 'jaw pain', 'jaw ache', 'gum pain', 'mouth pain', 'teeth sensitivity'],
            'Psychiatry': ['mental', 'anxiety', 'depression', 'stress', 'panic attack', 'bipolar', 'schizophrenia', 'eating disorder', 'addiction', 'insomnia', 'trauma', 'PTSD', 'OCD'],
            'Gynecology': ['pregnancy', 'menstrual', 'reproductive', 'obstetrics', 'fertility', 'menopause', 'pelvic pain', 'ovarian', 'uterus', 'cervical', 'breast', 'contraception', 'gynecological'],
            'ENT': ['ear', 'nose', 'throat', 'sinus', 'hearing', 'tonsil', 'adenoid', 'ear infection', 'hearing loss', 'tinnitus', 'nasal congestion', 'sinusitis', 'throat infection', 'ear ache', 'ear pain', 'throat pain', 'sore throat', 'throat ache', 'sinus pain', 'sinus pressure', 'nose pain', 'nose ache', 'ear pressure', 'ringing ears'],
            'Gastroenterology': ['stomach', 'digestive', 'liver', 'intestine', 'acid reflux', 'GERD', 'ulcer', 'gallbladder', 'constipation', 'diarrhea', 'IBS', 'Crohn', 'colitis', 'hepatitis', 'stomach ache', 'stomach pain', 'abdominal pain', 'belly ache', 'tummy ache', 'gut pain', 'indigestion', 'heartburn', 'bloating', 'nausea'],
            'Pulmonology': ['lung', 'breathing', 'respiratory', 'asthma', 'COPD', 'pneumonia', 'bronchitis', 'shortness of breath', 'cough', 'sleep apnea', 'tuberculosis', 'lung cancer', 'chest tightness', 'chest congestion', 'wheezing', 'difficulty breathing', 'chest pressure', 'chest ache', 'lung pain', 'painful breathing'],
            'Endocrinology': ['diabetes', 'thyroid', 'hormone', 'metabolism', 'insulin', 'pituitary', 'adrenal', 'growth hormone', 'testosterone', 'estrogen', 'metabolic', 'obesity'],
            'Urology': ['kidney', 'bladder', 'urinary', 'prostate', 'UTI', 'kidney stone', 'incontinence', 'erectile dysfunction', 'prostate cancer', 'bladder infection'],
            'Rheumatology': ['arthritis', 'lupus', 'fibromyalgia', 'gout', 'rheumatoid', 'autoimmune', 'joint pain', 'inflammation', 'connective tissue', 'vasculitis'],
            'Allergy/Immunology': ['allergy', 'asthma', 'immune system', 'hay fever', 'food allergy', 'hives', 'immunodeficiency', 'sinus allergy', 'allergic reaction'],
            'Infectious Disease': ['infection', 'virus', 'bacterial', 'fungal', 'HIV', 'AIDS', 'COVID', 'flu', 'pneumonia', 'meningitis', 'sepsis', 'tropical disease'],
            'Oncology': ['cancer', 'tumor', 'chemotherapy', 'radiation', 'leukemia', 'lymphoma', 'melanoma', 'oncology', 'malignant', 'metastasis'],
            'Vascular': ['vein', 'artery', 'blood clot', 'DVT', 'varicose veins', 'peripheral artery disease', 'circulation', 'aneurysm', 'vascular disease'],
            'Pain Management': ['chronic pain', 'pain management', 'nerve pain', 'fibromyalgia', 'back pain', 'neck pain', 'arthritis pain', 'migraine', 'joint pain', 'persistent pain', 'severe pain', 'constant pain', 'recurring pain', 'shooting pain', 'burning pain', 'throbbing pain', 'sharp pain', 'dull ache', 'radiating pain', 'muscle soreness', 'body ache', 'widespread pain']
        };

        const lowerResponse = response.toLowerCase();
        for (const [specialty, keywords] of Object.entries(specialties)) {
            if (keywords.some(keyword => lowerResponse.includes(keyword))) {
                return specialty;
            }
        }
        return 'doctor';
    }

    async function addMessage(message, isUser) {
        welcomeMessage.style.display = 'none';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        if (isUser) {
            messageDiv.textContent = message;
        } else {
            // Use innerHTML for AI messages to support links
            messageDiv.innerHTML = message;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleUserInput() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';
            userInput.disabled = true;
            sendButton.disabled = true;

            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message ai-message loading';
            loadingDiv.textContent = 'Thinking';
            chatMessages.appendChild(loadingDiv);

            const response = await getMedicalResponse(message);
            
            chatMessages.removeChild(loadingDiv);
            addMessage(response, false);

            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });

    // Add new helper function to get user's city
    async function getUserCity(coords) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
            );
            const data = await response.json();
            return data.address.city || data.address.town || 'unknown';
        } catch (error) {
            console.error('Error getting user city:', error);
            return 'unknown';
        }
    }
}); 