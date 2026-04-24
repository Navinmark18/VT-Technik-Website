const TOKEN_KEY = "eventVIN_admin_token";
const COLLAPSED_ROW_COUNT = 8;

// Bestimme API URL basierend auf aktueller Domain
const API_BASE_URL = (() => {
    // Prüfe zuerst auf sessionStorage-Einstellung
    const stored = sessionStorage.getItem("apiBaseUrl");
    if (stored) return stored;

    // Optionaler Meta-Override in der HTML
    const meta = document.querySelector('meta[name="api-base-url"]');
    const metaValue = meta?.getAttribute("content")?.trim();
    if (metaValue) return metaValue;

    // Globales Config-Objekt
    if (window.API_BASE_URL) return window.API_BASE_URL;

    // Vite-Config fuer Production/Preview
    if (typeof process !== "undefined" && process.env?.VITE_API_URL) {
        return process.env.VITE_API_URL;
    }

    // Fuer file:// oder fehlendes Origin
    if (!window.location.origin || window.location.origin === "null") {
        return "http://localhost:4000";
    }

    // Fuer localhost: verwende Port 4000
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:4000";
    }

    // Fuer production: verwende gleiches Origin
    return window.location.origin;
})();

console.log('API_BASE_URL:', API_BASE_URL);

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

const elements = {
    loginView: document.getElementById("login-view"),
    dashboardView: document.getElementById("dashboard-view"),
    loginForm: document.getElementById("login-form"),
    loginPassword: document.getElementById("login-password"),
    loginError: document.getElementById("login-error"),
    statTotal: document.getElementById("stat-total"),
    stat24h: document.getElementById("stat-24h"),
    stat7d: document.getElementById("stat-7d"),
    statUnique: document.getElementById("stat-unique"),
    refreshStats: document.getElementById("refresh-stats"),
    deleteStats: document.getElementById("delete-stats"),
    logout: document.getElementById("logout"),
    recentVisits: document.getElementById("recent-visits"),
    toggleVisits: document.getElementById("toggle-visits"),
    settingsForm: document.getElementById("settings-form"),
    settingsStatus: document.getElementById("settings-status"),
    maintenanceForm: document.getElementById("maintenance-form"),
    maintenanceStatus: document.getElementById("maintenance-status"),
    visitsChart: document.getElementById("visits-chart"),
    socialTotal: document.getElementById("social-total"),
    socialWhatsapp: document.getElementById("social-whatsapp"),
    socialInstagram: document.getElementById("social-instagram"),
    socialFacebook: document.getElementById("social-facebook"),
    refreshSocial: document.getElementById("refresh-social"),
    deleteSocial: document.getElementById("delete-social"),
    recentSocial: document.getElementById("recent-social"),
    toggleSocial: document.getElementById("toggle-social"),
    previewIframe: document.getElementById("preview-iframe"),
    passwordChangeForm: document.getElementById("password-change-form"),
    passwordChangeStatus: document.getElementById("password-change-status")
};

let visitsChartInstance = null;
let visitsExpanded = false;
let socialExpanded = false;
let latestVisits = [];
let latestSocialClicks = [];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function compactText(value, maxLength = 95) {
    const raw = typeof value === "string" ? value : "";
    if (!raw) {
        return "-";
    }

    if (raw.length <= maxLength) {
        return raw;
    }

    return `${raw.slice(0, maxLength - 1)}…`;
}

function updateTableToggle(button, totalRows, expanded) {
    if (!button) {
        return;
    }

    if (totalRows <= COLLAPSED_ROW_COUNT) {
        button.hidden = true;
        return;
    }

    button.hidden = false;
    const hiddenRows = totalRows - COLLAPSED_ROW_COUNT;
    button.textContent = expanded ? "Weniger anzeigen" : `Mehr anzeigen (${hiddenRows})`;
}

function showStatus(element, message, isError) {
    if (!element) {
        return;
    }

    element.textContent = message;
    element.style.color = isError ? "#ffb4b4" : "#b9f6c0";
}

function normalizeSettings(settings) {
    return {
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
}

function resolvePreviewUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") {
        return "";
    }

    const trimmed = rawUrl.trim();
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

function setPreviewImage(previewId, rawUrl) {
    const image = document.getElementById(previewId);
    if (!image) {
        return;
    }

    const resolved = resolvePreviewUrl(rawUrl);
    if (!resolved) {
        image.removeAttribute("src");
        image.style.visibility = "hidden";
        return;
    }

    image.src = resolved;
    image.style.visibility = "visible";
}

function updateImagePreviews() {
    setPreviewImage("homeHero-preview", document.getElementById("homeHero")?.value);
    setPreviewImage("anfrageHero-preview", document.getElementById("anfrageHero")?.value);
    setPreviewImage("mietenHero-preview", document.getElementById("mietenHero")?.value);

    for (let i = 0; i < 6; i += 1) {
        setPreviewImage(`service${i}-preview`, document.getElementById(`service${i}`)?.value);
    }
}

function setView(isLoggedIn) {
    if (isLoggedIn) {
        elements.loginView.classList.add("hidden");
        elements.dashboardView.classList.remove("hidden");
    } else {
        elements.loginView.classList.remove("hidden");
        elements.dashboardView.classList.add("hidden");
    }
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401) {
        clearToken();
        setView(false);
        throw new Error("Unauthorized");
    }

    return response;
}

async function login(password) {
    const response = await fetch(`${API_BASE_URL}/api/admin/login`, {  
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
    });

    console.log("Login response status:", response.status);
    console.log("Login response ok:", response.ok);

    const rawText = await response.text();
    const payload = rawText ? (() => {
        try {
            return JSON.parse(rawText);
        } catch (parseError) {
            return null;
        }
    })() : null;

    if (!response.ok) {
        console.error("Login error:", payload || rawText || "(empty response)");
        const message = payload?.error || rawText || `HTTP ${response.status}`;
        throw new Error(`Login failed: ${message}`);
    }

    console.log("Login payload:", payload);
    if (!payload?.token) {
        throw new Error("No token received");
    }

    localStorage.setItem(TOKEN_KEY, payload.token);
}

function updateMaintenancePreview() {
    const messageInput = document.getElementById("maintenance-message");
    const previewText = document.getElementById("maintenance-preview-text");
    
    if (!messageInput || !previewText) {
        console.warn("Preview elements not found");
        return;
    }
    
    const messageValue = messageInput.value?.trim();
    const displayText = messageValue || "Hier wird deine Wartungsnachricht angezeigt...";
    
    previewText.textContent = displayText;
    
    // Also update the iframe preview if it's open
    if (elements.previewIframe && elements.previewIframe.contentDocument) {
        const activeTab = document.querySelector('.admin-tab-button.active');
        if (activeTab) {
            const serviceName = activeTab.dataset.preview;
            injectMaintenancePreview(serviceName);
        }
    }
}

function fillSettingsForm(settings) {
    const normalized = normalizeSettings(settings);
    const { theme, images, maintenance } = normalized;

    document.getElementById("accent").value = theme.accent;
    document.getElementById("accent2").value = theme.accent2;
    document.getElementById("accent3").value = theme.accent3;
    document.getElementById("bg1").value = theme.bg1;
    document.getElementById("bg2").value = theme.bg2;
    document.getElementById("bg3").value = theme.bg3;

    document.getElementById("homeHero").value = images.homeHero || "";
    document.getElementById("anfrageHero").value = images.anfrageHero || "";
    document.getElementById("mietenHero").value = images.mietenHero || "";

    (images.service || []).forEach((url, index) => {
        const input = document.getElementById(`service${index}`);
        if (input) {
            input.value = url || "";
        }
    });

    document.getElementById("maintenance-enabled").checked = maintenance.enabled || false;
    document.getElementById("maintenance-message").value = maintenance.message || "";
    document.getElementById("maintenance-mieten").checked = maintenance.services?.mieten || false;
    document.getElementById("maintenance-anfrage").checked = maintenance.services?.anfrage || false;
    
    // Update preview
    updateMaintenancePreview();
    updateImagePreviews();
}

function readSettingsForm() {
    const service = [];
    for (let i = 0; i < 6; i += 1) {
        const input = document.getElementById(`service${i}`);
        service.push(input?.value?.trim() || "");
    }

    return {
        theme: {
            accent: document.getElementById("accent").value,
            accent2: document.getElementById("accent2").value,
            accent3: document.getElementById("accent3").value,
            bg1: document.getElementById("bg1").value,
            bg2: document.getElementById("bg2").value,
            bg3: document.getElementById("bg3").value
        },
        images: {
            homeHero: document.getElementById("homeHero").value.trim(),
            anfrageHero: document.getElementById("anfrageHero").value.trim(),
            mietenHero: document.getElementById("mietenHero").value.trim(),
            service
        }
    };
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    
    const response = await apiFetch("/api/admin/upload", {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Upload failed");
    }

    const payload = await response.json();
    const rawUrl = payload?.url || "";

    if (typeof rawUrl === "string" && rawUrl.startsWith("/")) {
        return `${API_BASE_URL}${rawUrl}`;
    }

    return rawUrl;
}

function setupFileUploadHandlers() {
    const fileInputs = [
        "homeHero-file", 
        "anfrageHero-file", 
        "mietenHero-file",
        "service0-file",
        "service1-file",
        "service2-file",
        "service3-file",
        "service4-file",
        "service5-file"
    ];

    fileInputs.forEach(id => {
        const fileInput = document.getElementById(id);
        if (!fileInput) return;

        fileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const targetInputId = id.replace("-file", "");
            const targetInput = document.getElementById(targetInputId);
            if (!targetInput) return;

            try {
                showStatus(elements.settingsStatus, "Lade Bild hoch...", false);
                const url = await uploadImage(file);
                targetInput.value = url;

                const saveResponse = await apiFetch("/api/admin/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(readSettingsForm())
                });

                if (!saveResponse.ok) {
                    throw new Error("Save after upload failed");
                }

                const savePayload = await saveResponse.json();
                fillSettingsForm(savePayload.settings || DEFAULT_SETTINGS);
                updateImagePreviews();
                showStatus(elements.settingsStatus, "Bild hochgeladen und gespeichert.", false);
            } catch (error) {
                showStatus(elements.settingsStatus, "Upload fehlgeschlagen.", true);
            }
            
            fileInput.value = "";
        });
    });
}

function setupUploadButtons() {
    document.querySelectorAll('.upload-trigger').forEach((button) => {
        button.addEventListener('click', () => {
            const targetInputId = button.dataset.targetInput;
            if (!targetInputId) {
                return;
            }

            const fileInput = document.getElementById(targetInputId);
            if (!fileInput) {
                return;
            }

            fileInput.click();
        });
    });
}

function setupImageInputListeners() {
    const ids = ["homeHero", "anfrageHero", "mietenHero", "service0", "service1", "service2", "service3", "service4", "service5"];

    ids.forEach((id) => {
        const input = document.getElementById(id);
        if (!input) {
            return;
        }

        input.addEventListener("input", updateImagePreviews);
        input.addEventListener("change", updateImagePreviews);
    });
}

async function renderChart() {
    if (!elements.visitsChart) return;

    const response = await apiFetch("/api/admin/visits/chart");
    if (!response.ok) return;

    const payload = await response.json();
    const data = payload?.data || [];

    const labels = data.map(item => item.date);
    const counts = data.map(item => item.count);

    if (visitsChartInstance) {
        visitsChartInstance.destroy();
    }

    visitsChartInstance = new Chart(elements.visitsChart, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Besuche pro Tag",
                data: counts,
                borderColor: "rgb(255, 77, 77)",
                backgroundColor: "rgba(255, 77, 77, 0.1)",
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: "white"
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "white",
                        precision: 0
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.1)"
                    }
                },
                x: {
                    ticks: {
                        color: "white"
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.1)"
                    }
                }
            }
        }
    });
}

function renderVisits(recent) {
    latestVisits = Array.isArray(recent) ? recent : [];
    elements.recentVisits.innerHTML = "";
    if (latestVisits.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = "<td colspan=\"5\">Noch keine Besuche vorhanden.</td>";
        elements.recentVisits.appendChild(row);
        updateTableToggle(elements.toggleVisits, 0, visitsExpanded);
        return;
    }

    const visibleRows = visitsExpanded
        ? latestVisits
        : latestVisits.slice(0, COLLAPSED_ROW_COUNT);

    visibleRows.forEach((visit) => {
        const row = document.createElement("tr");
        const time = visit.created_at ? new Date(visit.created_at).toLocaleString("de-DE") : "-";
        const path = visit.path || "-";
        const ip = visit.ip || "-";
        const referrer = visit.referrer || "-";
        const userAgent = visit.user_agent || "-";

        row.innerHTML = `
            <td>${escapeHtml(time)}</td>
            <td title="${escapeHtml(path)}"><span class="cell-truncate">${escapeHtml(compactText(path))}</span></td>
            <td>${escapeHtml(ip)}</td>
            <td title="${escapeHtml(referrer)}"><span class="cell-truncate">${escapeHtml(compactText(referrer))}</span></td>
            <td title="${escapeHtml(userAgent)}"><span class="cell-truncate">${escapeHtml(compactText(userAgent, 120))}</span></td>
        `;
        elements.recentVisits.appendChild(row);
    });

    updateTableToggle(elements.toggleVisits, latestVisits.length, visitsExpanded);
}

async function loadSummary() {
    const response = await apiFetch("/api/admin/visits/summary");
    if (response.status === 401) {
        throw new Error("Unauthorized");
    }

    const payload = await response.json();
    const summary = payload?.summary;
    if (!summary) {
        return;
    }

    elements.statTotal.textContent = Number(summary.total || 0);
    elements.stat24h.textContent = Number(summary.last24h || 0);
    elements.stat7d.textContent = Number(summary.last7d || 0);
    elements.statUnique.textContent = Number(summary.unique7d || 0);
    renderVisits(summary.recent || []);
    await renderChart();
}

function renderSocialClicks(recent) {
    if (!elements.recentSocial) return;
    latestSocialClicks = Array.isArray(recent) ? recent : [];
    
    elements.recentSocial.innerHTML = "";
    if (latestSocialClicks.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = "<td colspan=\"4\">Noch keine Social Media Klicks vorhanden.</td>";
        elements.recentSocial.appendChild(row);
        updateTableToggle(elements.toggleSocial, 0, socialExpanded);
        return;
    }

    const visibleRows = socialExpanded
        ? latestSocialClicks
        : latestSocialClicks.slice(0, COLLAPSED_ROW_COUNT);

    visibleRows.forEach((click) => {
        const row = document.createElement("tr");
        const time = click.created_at ? new Date(click.created_at).toLocaleString("de-DE") : "-";
        const platformEmoji = {
            whatsapp: "💬",
            instagram: "📸",
            facebook: "👍",
            other: "🔗"
        };
        const emoji = platformEmoji[click.platform] || "🔗";
        const platform = click.platform || "-";
        const ip = click.ip || "-";
        const userAgent = click.user_agent || "-";
        
        row.innerHTML = `
            <td>${escapeHtml(time)}</td>
            <td>${escapeHtml(`${emoji} ${platform}`)}</td>
            <td>${escapeHtml(ip)}</td>
            <td title="${escapeHtml(userAgent)}"><span class="cell-truncate">${escapeHtml(compactText(userAgent, 120))}</span></td>
        `;
        elements.recentSocial.appendChild(row);
    });

    updateTableToggle(elements.toggleSocial, latestSocialClicks.length, socialExpanded);
}

function handleToggleVisits() {
    visitsExpanded = !visitsExpanded;
    renderVisits(latestVisits);
}

function handleToggleSocial() {
    socialExpanded = !socialExpanded;
    renderSocialClicks(latestSocialClicks);
}

async function loadSocialSummary() {
    const response = await apiFetch("/api/admin/social/summary");
    if (response.status === 401) {
        throw new Error("Unauthorized");
    }

    const payload = await response.json();
    const summary = payload?.summary;
    if (!summary) {
        return;
    }

    // Gesamt
    if (elements.socialTotal) {
        elements.socialTotal.textContent = Number(summary.total || 0);
    }

    // Nach Platform
    const byPlatform = summary.byPlatform || [];
    const whatsappCount = byPlatform.find(p => p.platform === "whatsapp")?.count || 0;
    const instaCount = byPlatform.find(p => p.platform === "instagram")?.count || 0;
    const fbCount = byPlatform.find(p => p.platform === "facebook")?.count || 0;

    if (elements.socialWhatsapp) elements.socialWhatsapp.textContent = whatsappCount;
    if (elements.socialInstagram) elements.socialInstagram.textContent = instaCount;
    if (elements.socialFacebook) elements.socialFacebook.textContent = fbCount;

    renderSocialClicks(summary.recent || []);
}

async function loadSettings() {
    const response = await apiFetch("/api/admin/settings");
    if (response.status === 401) {
        throw new Error("Unauthorized");
    }

    const payload = await response.json();
    if (payload?.settings) {
        fillSettingsForm(payload.settings);
    } else {
        fillSettingsForm(DEFAULT_SETTINGS);
    }
}

async function loadDashboard() {
    await Promise.all([loadSummary(), loadSocialSummary(), loadSettings()]);
}

async function handleChangePassword(event) {
    event.preventDefault();
    showStatus(elements.passwordChangeStatus, "Ändere Passwort...", false);

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;

    try {
        const response = await apiFetch("/api/admin/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || "Passwortänderung fehlgeschlagen.");
        }

        showStatus(elements.passwordChangeStatus, "Passwort erfolgreich geändert!", false);
        elements.passwordChangeForm.reset();
    } catch (error) {
        showStatus(elements.passwordChangeStatus, error.message, true);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    showStatus(elements.loginError, "", false);

    try {
        console.log("Attempting login with API_BASE_URL:", API_BASE_URL);
        await login(elements.loginPassword.value);
        elements.loginPassword.value = "";
        setView(true);
        await loadDashboard();
    } catch (error) {
        console.error("Login error:", error);
        showStatus(elements.loginError, error.message || "Login fehlgeschlagen. Passwort pruefen.", true);
    }
}

async function handleSaveSettings(event) {
    event.preventDefault();
    showStatus(elements.settingsStatus, "Speichere...", false);

    try {
        const response = await apiFetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(readSettingsForm())
        });

        if (!response.ok) {
            throw new Error("Save failed");
        }

        const payload = await response.json();
        fillSettingsForm(payload.settings || DEFAULT_SETTINGS);
        showStatus(elements.settingsStatus, "Gespeichert! Aendereungen sind live.", false);
    } catch (error) {
        showStatus(elements.settingsStatus, "Speichern fehlgeschlagen.", true);
    }
}

async function handleRefresh() {
    try {
        await loadSummary();
    } catch (error) {
        clearToken();
        setView(false);
    }
}

async function handleDeleteStats() {
    if (!confirm("Möchtest du wirklich alle Besucherstatistiken löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
        return;
    }

    try {
        const response = await apiFetch("/api/admin/visits", {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Delete failed");
        }

        await loadSummary();
    } catch (error) {
        alert("Löschen fehlgeschlagen.");
    }
}

async function handleRefreshSocial() {
    try {
        await loadSocialSummary();
    } catch (error) {
        clearToken();
        setView(false);
    }
}

async function handleDeleteSocial() {
    if (!confirm("Möchtest du wirklich alle Social Media Statistiken löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
        return;
    }

    try {
        const response = await apiFetch("/api/admin/social", {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Delete failed");
        }

        await loadSocialSummary();
    } catch (error) {
        alert("Löschen fehlgeschlagen.");
    }
}

async function handleMaintenanceForm(event) {
    event.preventDefault();
    showStatus(elements.maintenanceStatus, "Speichere...", false);

    try {
        const enabled = document.getElementById("maintenance-enabled").checked;
        const message = document.getElementById("maintenance-message").value.trim();
        const mietenMaintenance = document.getElementById("maintenance-mieten").checked;
        const anfrageMaintenance = document.getElementById("maintenance-anfrage").checked;

        const response = await apiFetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                maintenance: {
                    enabled,
                    message,
                    services: {
                        mieten: mietenMaintenance,
                        anfrage: anfrageMaintenance
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error("Save failed");
        }

        showStatus(elements.maintenanceStatus, `Wartungsmodus ${enabled ? "aktiviert" : "deaktiviert"}!`, false);
    } catch (error) {
        showStatus(elements.maintenanceStatus, "Speichern fehlgeschlagen.", true);
    }
}

function handlePreviewTab(event) {
    const button = event.target;
    const preview = button.dataset.preview;
    
    if (!preview || !elements.previewIframe) return;
    
    // Update active tab
    document.querySelectorAll('.admin-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Load preview
    const urls = {
        home: '/index.html',
        mieten: '/mieten.html',
        anfrage: '/Anfrage.html'
    };
    
    if (urls[preview]) {
        elements.previewIframe.src = urls[preview];
        
        // After iframe loads, inject maintenance mode if enabled
        elements.previewIframe.onload = function() {
            injectMaintenancePreview(preview);
        };
    }
}

function injectMaintenancePreview(serviceName) {
    if (!elements.previewIframe?.contentDocument) return;
    
    const enabled = document.getElementById("maintenance-enabled")?.checked;
    const serviceKey = serviceName === 'mieten' ? 'mieten' : serviceName === 'anfrage' ? 'anfrage' : null;
    const serviceEnabled = serviceKey && document.getElementById(`maintenance-${serviceKey}`)?.checked;
    const message = document.getElementById("maintenance-message")?.value || "";
    
    // Only show if global or service maintenance is enabled
    if (!enabled && !serviceEnabled) return;
    
    const iframeDoc = elements.previewIframe.contentDocument;
    
    // Create and inject maintenance overlay
    const style = iframeDoc.createElement('style');
    style.textContent = `
        body { opacity: 0 !important; transition: opacity 0.4s ease; }
        .maintenance-preview-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
        }
        .maintenance-preview-modal {
            background: linear-gradient(135deg, rgba(255, 77, 77, 0.95), rgba(255, 107, 107, 0.95));
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        }
        .maintenance-preview-content {
            color: white;
            font-size: 1.2rem;
            font-weight: 600;
            line-height: 1.7;
            word-break: break-word;
        }
    `;
    iframeDoc.head.appendChild(style);
    
    const overlay = iframeDoc.createElement('div');
    overlay.className = 'maintenance-preview-overlay';
    overlay.innerHTML = `
        <div class="maintenance-preview-modal">
            <div class="maintenance-preview-content">
                ⚠️<br>${message || 'Hier wird deine Wartungsnachricht angezeigt...'}
            </div>
        </div>
    `;
    iframeDoc.body.appendChild(overlay);
}

function handleLogout() {
    clearToken();
    setView(false);
}

async function init() {
    if (elements.loginForm) {
        elements.loginForm.addEventListener("submit", handleLogin);
    }
    if (elements.settingsForm) {
        elements.settingsForm.addEventListener("submit", handleSaveSettings);
    }
    if (elements.maintenanceForm) {
        elements.maintenanceForm.addEventListener("submit", handleMaintenanceForm);
    }
    if (elements.passwordChangeForm) {
        elements.passwordChangeForm.addEventListener("submit", handleChangePassword);
    }
    if (elements.refreshStats) {
        elements.refreshStats.addEventListener("click", handleRefresh);
    }
    if (elements.deleteStats) {
        elements.deleteStats.addEventListener("click", handleDeleteStats);
    }
    if (elements.refreshSocial) {
        elements.refreshSocial.addEventListener("click", handleRefreshSocial);
    }
    if (elements.deleteSocial) {
        elements.deleteSocial.addEventListener("click", handleDeleteSocial);
    }
    if (elements.toggleVisits) {
        elements.toggleVisits.addEventListener("click", handleToggleVisits);
    }
    if (elements.toggleSocial) {
        elements.toggleSocial.addEventListener("click", handleToggleSocial);
    }
    if (elements.logout) {
        elements.logout.addEventListener("click", handleLogout);
    }

    // Add preview tab listeners
    document.querySelectorAll('.admin-tab-button').forEach(button => {
        button.addEventListener('click', handlePreviewTab);
    });

    // Add live preview for maintenance message - initialize immediately
    const maintenanceMessage = document.getElementById("maintenance-message");
    if (maintenanceMessage) {
        maintenanceMessage.addEventListener("input", updateMaintenancePreview);
        // Initialize preview with current value
        updateMaintenancePreview();
    }

    // Add listeners for maintenance checkboxes to update preview
    const maintenanceCheckboxes = [
        document.getElementById("maintenance-enabled"),
        document.getElementById("maintenance-mieten"),
        document.getElementById("maintenance-anfrage")
    ];
    
    maintenanceCheckboxes.forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener("change", updateMaintenancePreview);
        }
    });

    setupUploadButtons();
    setupFileUploadHandlers();
    setupImageInputListeners();

    if (!getToken()) {
        setView(false);
        return;
    }

    try {
        setView(true);
        await loadDashboard();
    } catch (error) {
        clearToken();
        setView(false);
    }
}

init();
