const auth = {
    token: null,
    user: null,

    init() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user'));
        this.updateUI();
    },

    register(userData) {
        // Store user data in localStorage
        const user = {
            id: Date.now(),
            ...userData,
        };
        localStorage.setItem('users', JSON.stringify([
            ...JSON.parse(localStorage.getItem('users') || '[]'),
            user
        ]));
        this.login(userData.email, userData.password);
    },

    login(email, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            this.token = `dummy-token-${user.id}`;
            this.user = user;
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(user));
            return true;
        }
        return false;
    },

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.updateUI();
    },

    updateUI() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app');
        const username = document.getElementById('username');

        if (this.token && this.user) {
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            username.textContent = this.user.username;
        } else {
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    }
};

// Initialize auth state
document.addEventListener('DOMContentLoaded', () => {
    auth.init();

    // Handle auth tabs
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const formId = tab.dataset.form;
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(`${formId}-form`).classList.remove('hidden');
        });
    });

    // Handle login
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        if (auth.login(email, password)) {
            auth.updateUI();
        } else {
            alert('Invalid credentials');
        }
    });

    // Handle register
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            username: e.target.querySelector('input[placeholder="Username"]').value,
            email: e.target.querySelector('input[type="email"]').value,
            password: e.target.querySelector('input[type="password"]').value,
            medicalProfile: {
                age: e.target.querySelector('input[type="number"]').value,
                gender: e.target.querySelector('select[name="gender"]').value,
                allergies: e.target.querySelector('input[placeholder="Allergies (comma separated)"]').value.split(',').map(s => s.trim()),
                conditions: e.target.querySelector('input[placeholder="Medical Conditions"]').value.split(',').map(s => s.trim()),
                medications: e.target.querySelector('input[placeholder="Current Medications"]').value.split(',').map(s => s.trim()),
            }
        };
        
        auth.register(formData);
    });

    // Handle logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.logout();
    });
}); 