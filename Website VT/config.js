// Global API Configuration
window.API_BASE_URL = (() => {
    if (typeof process !== 'undefined' && process.env.VITE_API_URL) {
        return process.env.VITE_API_URL;
    }
    
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
        return 'http://localhost:4000';
    }
    
    // In production, use same origin as frontend
    return window.location.origin;
})();

// Helper function for API calls
window.apiCall = async (endpoint, options = {}) => {
    const url = `${window.API_BASE_URL}${endpoint}`;
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers: defaultHeaders
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${response.status} ${error}`);
    }
    
    return response.json();
};
