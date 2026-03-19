// Global API Configuration
window.API_BASE_URL = (() => {
    const meta = document.querySelector('meta[name="api-base-url"]');
    const metaValue = meta?.getAttribute("content")?.trim();
    if (metaValue) {
        return metaValue;
    }

    if (window.API_BASE_URL_OVERRIDE) {
        return window.API_BASE_URL_OVERRIDE;
    }

    if (typeof process !== "undefined" && process.env?.VITE_API_URL) {
        return process.env.VITE_API_URL;
    }

    const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    if (isLocal) {
        return "http://localhost:4000";
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

// Maintenance Mode Check & Redirect
window.checkMaintenanceMode = async (service) => {
    try {
        const result = await window.apiCall('/api/settings');
        if (!result || !result.settings) return false;
        
        const settings = result.settings;
        
        // Check if maintenance is globally enabled
        if (settings.maintenance?.enabled) {
            console.warn(`⚠️ Gesamte Website im Wartungsmodus. Leite weiter zur Startseite...`);
            setTimeout(() => window.location.href = '/index.html', 1500);
            return true;
        }
        
        // Check if specific service is in maintenance
        if (service && settings.maintenance?.services?.[service]) {
            console.warn(`⚠️ Service "${service}" im Wartungsmodus. Leite weiter zur Startseite...`);
            // Show notification message if available
            const message = settings.maintenance?.message || 'Dieser Service ist aktuell im Wartungsmodus. Bitte später erneut versuchen.';
            showMaintenanceMessage(message);
            setTimeout(() => window.location.href = '/index.html', 3000);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Fehler beim Prüfen des Wartungsmodus:', error);
        return false;
    }
};

// Show maintenance message banner
window.showMaintenanceMessage = (message) => {
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #b97f24, #d4a257);
        color: white;
        padding: 16px;
        text-align: center;
        font-size: 1rem;
        font-weight: 600;
        z-index: 9999;
        animation: slideDown 0.3s ease;
    `;
    banner.textContent = '⚠️ ' + message;
    document.body.appendChild(banner);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
};
