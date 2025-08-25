// Authentication JavaScript
class AuthHandler {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form  
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        // Login logic here
    }

    async handleRegister(e) {
        e.preventDefault();  
        // Registration logic here
    }

    switchTab(e) {
        // Tab switching logic
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthHandler();
});
