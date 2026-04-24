// Production API URL Support
const API_BASE_URL = typeof process !== 'undefined' && process.env.VITE_API_URL 
    ? process.env.VITE_API_URL
    : (window.location.origin.includes('localhost') ? 'http://localhost:4000' : window.location.origin);

const SETTINGS_ENDPOINT = `${API_BASE_URL}/api/settings`;
const TRACK_ENDPOINT = `${API_BASE_URL}/api/track`;
const SETTINGS_CACHE_KEY = "eventVIN_settings_cache";
let hasTrackedVisit = false;

const DEFAULT_SETTINGS = {
    theme: {
        accent: "#b97f24",
        accent2: "#d4a257",
        accent3: "#f0d3a2",
        bg1: "#030303",
        bg2: "#0b0b0b",
        bg3: "#171717"
    },
    images: {
        homeHero: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=2200&q=90",
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
        message: "Wir führen gerade Wartungsarbeiten durch. Bitte versuchen Sie es später erneut.",
        services: {
            mieten: false,
            anfrage: false
        }
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

function resolveImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== "string") {
        return "";
    }

    const trimmed = imageUrl.trim();
    if (!trimmed) {
        return "";
    }

    if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("data:") ||
        trimmed.startsWith("blob:")
    ) {
        return trimmed;
    }

    if (trimmed.startsWith("/")) {
        return `${API_BASE_URL}${trimmed}`;
    }

    return `${API_BASE_URL}/${trimmed}`;
}

function applySettings(settings) {
    const normalized = {
        theme: { ...DEFAULT_SETTINGS.theme, ...(settings?.theme || {}) },
        images: { ...DEFAULT_SETTINGS.images, ...(settings?.images || {}) },
        maintenance: { 
            ...DEFAULT_SETTINGS.maintenance, 
            ...(settings?.maintenance || {}),
            services: { 
                ...DEFAULT_SETTINGS.maintenance.services,
                ...(settings?.maintenance?.services || {})
            }
        }
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
        const homeHeroUrl = resolveImageUrl(normalized.images.homeHero);
        if (homeHeroUrl) {
            setRootVar("--home-hero-image", `url('${homeHeroUrl}')`);
        }
    }
    if (normalized.images.anfrageHero) {
        const anfrageHeroUrl = resolveImageUrl(normalized.images.anfrageHero);
        if (anfrageHeroUrl) {
            setRootVar("--anfrage-hero-image", `url('${anfrageHeroUrl}')`);
        }
    }
    if (normalized.images.mietenHero) {
        const mietenHeroUrl = resolveImageUrl(normalized.images.mietenHero);
        if (mietenHeroUrl) {
            setRootVar("--mieten-hero-image", `url('${mietenHeroUrl}')`);
        }
    }

    const serviceImages = Array.isArray(normalized.images.service)
        ? normalized.images.service
        : [];
    document.querySelectorAll("[data-service-index]").forEach((element) => {
        const index = Number(element.getAttribute("data-service-index"));
        if (!Number.isInteger(index)) {
            return;
        }

        const configuredImage = typeof serviceImages[index] === "string"
            ? serviceImages[index].trim()
            : "";
        const fallbackImage = DEFAULT_SETTINGS.images.service[index] || DEFAULT_SETTINGS.images.service[0];
        const finalImage = resolveImageUrl(configuredImage || fallbackImage);

        if (finalImage) {
            element.style.setProperty("--card-image", `url('${finalImage}')`);
        }
    });

    // Wartungsmodus prüfen
    let inMaintenance = false;
    
    // Prüfe globalen Wartungsmodus
    if (normalized.maintenance.enabled && !window.location.pathname.includes("admin.html")) {
        inMaintenance = true;
    }
    
    // Prüfe Service-spezifischen Wartungsmodus
    if (!window.location.pathname.includes("admin.html")) {
        if (window.location.pathname.includes("mieten") && normalized.maintenance.services?.mieten) {
            inMaintenance = true;
        }
        if (window.location.pathname.includes("Anfrage") && normalized.maintenance.services?.anfrage) {
            inMaintenance = true;
        }
    }
    
    if (inMaintenance) {
        showMaintenanceMode(normalized.maintenance.message);
    } else {
        hideMaintenanceMode();
    }

    try {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(normalized));
    } catch (error) {
        // Ignore storage errors (private mode, quota, etc.)
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
            return false;
        }

        const payload = await response.json();
        if (payload?.settings) {
            applySettings(payload.settings);
            return true;
        }
        return false;
    } catch (error) {
        console.warn("Settings load failed", error);
        return false;
    }
}

function loadCachedSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
        return null;
    }
}

function hasAnalyticsConsent() {
    return Boolean(window.EventVINConsent?.hasConsent?.("analytics"));
}

function trackVisit() {
    if (!window.location || hasTrackedVisit || !hasAnalyticsConsent()) {
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
    })
        .then(() => {
            hasTrackedVisit = true;
        })
        .catch(() => undefined);
}

function trackSocialClick(platform) {
    if (!hasAnalyticsConsent()) {
        return;
    }

    fetch("/api/social/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
        keepalive: true
    }).catch(() => undefined);
}

function setupConsentTracking() {
    window.addEventListener("eventvin:consent-changed", (event) => {
        if (event.detail?.analytics) {
            trackVisit();
        }
    });
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

function setupScrollAnimations() {
    const targets = Array.from(document.querySelectorAll(
        ".hero-copy, .hero-panel, .strip-card, .section-heading, .service-card, .editorial-panel, .process-step, .cta-section"
    ));

    if (targets.length === 0) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPowerDevice = typeof navigator !== "undefined"
        && typeof navigator.hardwareConcurrency === "number"
        && navigator.hardwareConcurrency <= 4;

    if (reduceMotion || lowPowerDevice) {
        targets.forEach((element) => {
            element.classList.add("is-visible");
        });
        return;
    }

    document.documentElement.classList.add("js-enhanced");

    targets.forEach((element, index) => {
        element.classList.add("reveal-on-scroll");
        element.style.setProperty("--reveal-delay", `${(index % 4) * 80}ms`);
    });

    const observer = new IntersectionObserver(
        (entries, instance) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("is-visible");
                instance.unobserve(entry.target);
            });
        },
        {
            threshold: 0.16,
            rootMargin: "0px 0px -8% 0px"
        }
    );

    targets.forEach((target) => observer.observe(target));
}

function setupHeroMotion() {
    const hero = document.querySelector(".hero");
    const heroBg = document.querySelector(".hero-bg");

    if (!hero || !heroBg) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
        document.documentElement.classList.add("page-loaded");
        return;
    }

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let rafId = null;

    const animate = () => {
        const time = performance.now();
        const idleX = Math.sin(time / 1450) * 22;
        const idleY = Math.cos(time / 1750) * 14;
        const destinationX = targetX + idleX;
        const destinationY = targetY + idleY;

        currentX += (destinationX - currentX) * 0.14;
        currentY += (destinationY - currentY) * 0.14;

        heroBg.style.setProperty("--hero-shift-x", `${currentX.toFixed(3)}px`);
        heroBg.style.setProperty("--hero-shift-y", `${currentY.toFixed(3)}px`);

        rafId = requestAnimationFrame(animate);
    };

    const requestAnimate = () => {
        if (rafId !== null) {
            return;
        }
        rafId = requestAnimationFrame(animate);
    };

    const setTargetFromPointer = (clientX, clientY) => {
        const rect = hero.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return;
        }

        const px = (clientX - rect.left) / rect.width - 0.5;
        const py = (clientY - rect.top) / rect.height - 0.5;
        targetX = px * 44;
        targetY = py * 30;
    };

    hero.addEventListener("pointermove", (event) => {
        setTargetFromPointer(event.clientX, event.clientY);
    });

    hero.addEventListener(
        "touchmove",
        (event) => {
            if (!event.touches || event.touches.length === 0) {
                return;
            }

            const touch = event.touches[0];
            setTargetFromPointer(touch.clientX, touch.clientY);
        },
        { passive: true }
    );

    hero.addEventListener("mouseleave", () => {
        targetX = 0;
        targetY = 0;
    });

    hero.addEventListener("touchend", () => {
        targetX = 0;
        targetY = 0;
    }, { passive: true });

    requestAnimate();

    requestAnimationFrame(() => {
        document.documentElement.classList.add("page-loaded");
    });
}

function setupCardSpotlight() {
    const cards = Array.from(document.querySelectorAll(".panel-item"));
    if (cards.length === 0) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (reduceMotion || coarsePointer) {
        return;
    }

    cards.forEach((card) => {
        card.addEventListener("pointermove", (event) => {
            const rect = card.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;

            card.style.setProperty("--spot-x", `${Math.min(100, Math.max(0, x)).toFixed(2)}%`);
            card.style.setProperty("--spot-y", `${Math.min(100, Math.max(0, y)).toFixed(2)}%`);
        });
    });
}

function initSite() {
    const cachedSettings = loadCachedSettings();
    if (cachedSettings) {
        applySettings(cachedSettings);
    }

    loadSettings().then((loaded) => {
        if (!loaded && !cachedSettings) {
            applySettings(DEFAULT_SETTINGS);
        }
    });
    setupConsentTracking();
    setupHeroMotion();
    setupCardSpotlight();
    setupScrollAnimations();
    trackVisit();
    setupSocialTracking();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSite);
} else {
    initSite();
}