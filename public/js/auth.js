// Authentication utilities
const Auth = {
    // Check if user is logged in
    isLoggedIn() {
        return !!localStorage.getItem('token');
    },

    // Get current user
    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Get token
    getToken() {
        return localStorage.getItem('token');
    },

    // Logout
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    },

    // Protected page check
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
        }
    },

    // Redirect if logged in
    redirectIfLoggedIn() {
        if (this.isLoggedIn()) {
            window.location.href = '/dashboard.html';
        }
    }
};

// Export for use in other files
window.Auth = Auth;
