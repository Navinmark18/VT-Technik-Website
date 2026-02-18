// Production API URL Support
const API_BASE_URL = typeof process !== 'undefined' && process.env.VITE_API_URL 
    ? process.env.VITE_API_URL
    : (window.location.origin.includes('localhost') ? 'http://localhost:4000' : window.location.origin);

const SETTINGS_ENDPOINT = `${API_BASE_URL}/api/settings`;
const TRACK_ENDPOINT = `${API_BASE_URL}/api/track`;

const DEFAULT_SETTINGS = {
    theme: {
        accent: "#ff4d4d",
        accent2: "#ff6b6b",
        accent3: "#ff8080",
        bg1: "#0f0c29",
        bg2: "#302b63",
        bg3: "#24243e"
    },
    images: {
        homeHero: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80",
        anfrageHero: "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1920&q=80",
        mietenHero: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&q=80",
        service: [
            "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80",
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
            "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
            "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
            "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"
        ]
    },
    maintenance: {
        enabled: false,
        message: "Wir führen gerade Wartungsarbeiten durch. Bitte versuchen Sie es später erneut."
    }
};

function setRootVar(name, value) {
    if (!value) {
        return;
    }

    document.documentElement.style.setProperty(name, value);
}

function hexToRgb(value) {
    if (!value) {
        return null;
    }

    const normalized = value.trim();
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
    if (!match) {
        return null;
    }

    return {
        r: Number.parseInt(match[1], 16),
        g: Number.parseInt(match[2], 16),
        b: Number.parseInt(match[3], 16)
    };
}

function setRgbVar(name, hexColor) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) {
        return;
    }

    setRootVar(name, `${rgb.r}, ${rgb.g}, ${rgb.b}`);
}

function applySettings(settings) {
    const normalized = {
        theme: { ...DEFAULT_SETTINGS.theme, ...(settings?.theme || {}) },
        images: { ...DEFAULT_SETTINGS.images, ...(settings?.images || {}) },
        maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(settings?.maintenance || {}) }
    };

    setRootVar("--accent", normalized.theme.accent);
    setRootVar("--accent-2", normalized.theme.accent2);
    setRootVar("--accent-3", normalized.theme.accent3);
    setRgbVar("--accent-rgb", normalized.theme.accent);
    setRgbVar("--accent-2-rgb", normalized.theme.accent2);
    setRgbVar("--accent-3-rgb", normalized.theme.accent3);
    setRootVar("--bg-1", normalized.theme.bg1);
    setRootVar("--bg-2", normalized.theme.bg2);
    setRootVar("--bg-3", normalized.theme.bg3);

    if (normalized.images.homeHero) {
        setRootVar("--home-hero-image", `url('${normalized.images.homeHero}')`);
    }
    if (normalized.images.anfrageHero) {
        setRootVar("--anfrage-hero-image", `url('${normalized.images.anfrageHero}')`);
    }
    if (normalized.images.mietenHero) {
        setRootVar("--mieten-hero-image", `url('${normalized.images.mietenHero}')`);
    }

    const serviceImages = Array.isArray(normalized.images.service)
        ? normalized.images.service
        : DEFAULT_SETTINGS.images.service;
    document.querySelectorAll("[data-service-index]").forEach((element) => {
        const index = Number(element.getAttribute("data-service-index"));
        if (Number.isInteger(index) && serviceImages[index]) {
            element.style.setProperty("--card-image", `url('${serviceImages[index]}')`);
        }
    });

    // Wartungsmodus
    if (normalized.maintenance.enabled && !window.location.pathname.includes("admin.html")) {
        showMaintenanceMode(normalized.maintenance.message);
    } else {
        hideMaintenanceMode();
    }
}

function showMaintenanceMode(message) {
    let overlay = document.getElementById("maintenance-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "maintenance-overlay";
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 12, 41, 0.98);
            backdrop-filter: blur(10px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const content = document.createElement("div");
        content.style.cssText = `
            max-width: 600px;
            text-align: center;
            color: white;
            padding: 60px 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const icon = document.createElement("div");
        icon.textContent = "⚙️";
        icon.style.cssText = `
            font-size: 80px;
            margin-bottom: 20px;
        `;

        const title = document.createElement("h1");
        title.textContent = "Wartungsmodus";
        title.style.cssText = `
            font-size: 2.5rem;
            margin-bottom: 20px;
            font-weight: 700;
        `;

        const msg = document.createElement("p");
        msg.textContent = message || "Wir führen gerade Wartungsarbeiten durch.";
        msg.style.cssText = `
            font-size: 1.2rem;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.8);
        `;

        content.appendChild(icon);
        content.appendChild(title);
        content.appendChild(msg);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    }
}

function hideMaintenanceMode() {
    const overlay = document.getElementById("maintenance-overlay");
    if (overlay) {
        overlay.remove();
    }
}

async function loadSettings() {
    try {
        const response = await fetch(SETTINGS_ENDPOINT, { cache: "no-store" });
        if (!response.ok) {
            return;
        }

        const payload = await response.json();
        if (payload?.settings) {
            applySettings(payload.settings);
        }
    } catch (error) {
        console.warn("Settings load failed", error);
    }
}

function trackVisit() {
    if (!window.location) {
        return;
    }

    const payload = {
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || null
    };

    fetch(TRACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
    }).catch(() => undefined);
}

function trackSocialClick(platform) {
    fetch("/api/social/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
        keepalive: true
    }).catch(() => undefined);
}

function setupSocialTracking() {
    // WhatsApp tracking
    document.querySelectorAll('.whatsapp-btn, a[href*="wa.me"]').forEach(link => {
        link.addEventListener('click', () => trackSocialClick('whatsapp'));
    });

    // Instagram tracking
    document.querySelectorAll('.instagram-btn, a[href*="instagram.com"]').forEach(link => {
        link.addEventListener('click', () => trackSocialClick('instagram'));
    });

    // Facebook tracking
    document.querySelectorAll('.facebook-btn, a[href*="facebook.com"]').forEach(link => {
        link.addEventListener('click', () => trackSocialClick('facebook'));
    });
}

function initSite() {
    applySettings(DEFAULT_SETTINGS);
    loadSettings();
    trackVisit();
    setupSocialTracking();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSite);
} else {
    initSite();
}