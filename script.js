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

            return `🏥 ${name}
    📍 ${address || 'Address unavailable'}${place.tags.phone ? `\n   📞 ${place.tags.phone}` : ''}${place.tags.opening_hours ? `\n   🕒 ${place.tags.opening_hours}` : ''}`;
        }).join('\n\n');

        return `\n\nNEARBY HEALTHCARE FACILITIES:\n${recommendations}`;
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

            // Add recommendations if location is available
            if (userLocation) {
                const keywords = extractHealthcareKeywords(data.response);
                const facilities = await searchNearbyHealthcare(userLocation, keywords);
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
            'Cardiology': ['heart', 'chest pain', 'cardiac', 'blood pressure', 'palpitations'],
            'Dermatology': ['skin', 'rash', 'acne', 'eczema', 'dermatitis'],
            'Orthopedics': ['bone', 'joint', 'fracture', 'sprain', 'arthritis'],
            'Pediatrics': ['child', 'infant', 'pediatric', 'vaccination'],
            'Neurology': ['headache', 'migraine', 'brain', 'seizure', 'dizziness'],
            'Ophthalmology': ['eye', 'vision', 'optical', 'cataract'],
            'Dental': ['tooth', 'teeth', 'dental', 'gum', 'cavity'],
            'Psychiatry': ['mental', 'anxiety', 'depression', 'stress'],
            'Gynecology': ['pregnancy', 'menstrual', 'reproductive', 'obstetrics'],
            'ENT': ['ear', 'nose', 'throat', 'sinus', 'hearing'],
            'Gastroenterology': ['stomach', 'digestive', 'liver', 'intestine'],
            'Pulmonology': ['lung', 'breathing', 'respiratory', 'asthma'],
            'Endocrinology': ['diabetes', 'thyroid', 'hormone'],
            'Urology': ['kidney', 'bladder', 'urinary', 'prostate']
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
        messageDiv.textContent = message;
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
}); 