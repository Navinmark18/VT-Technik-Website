(function () {
    const STORAGE_KEY = "eventvt_cookie_consent_v1";
    const DEFAULT_CONSENT = {
        necessary: true,
        analytics: false,
        marketing: false,
        updatedAt: 0
    };

    function readConsent() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") {
                return null;
            }

            return {
                ...DEFAULT_CONSENT,
                ...parsed,
                necessary: true
            };
        } catch (error) {
            return null;
        }
    }

    function writeConsent(consent) {
        const normalized = {
            ...DEFAULT_CONSENT,
            ...consent,
            necessary: true,
            updatedAt: Date.now()
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        window.dispatchEvent(new CustomEvent("eventvt:consent-changed", { detail: normalized }));
        return normalized;
    }

    function hasDecision() {
        const consent = readConsent();
        return Boolean(consent && consent.updatedAt);
    }

    function hasConsent(category) {
        const consent = readConsent();
        if (!consent) {
            return false;
        }

        if (category === "necessary") {
            return true;
        }

        return Boolean(consent[category]);
    }

    function createStyles() {
        const style = document.createElement("style");
        style.textContent = `
            .cookie-consent-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.55);
                backdrop-filter: blur(4px);
                z-index: 10020;
                display: none;
            }
            .cookie-consent-backdrop.active {
                display: block;
            }
            .cookie-consent-banner {
                position: fixed;
                left: 18px;
                right: 18px;
                bottom: 18px;
                z-index: 10030;
                padding: 18px;
                border: 1px solid rgba(255, 255, 255, 0.16);
                border-radius: 18px;
                background: rgba(10, 10, 10, 0.94);
                color: #f4f4f4;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
                display: none;
                gap: 14px;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
            }
            .cookie-consent-banner.active {
                display: flex;
            }
            .cookie-consent-text {
                flex: 1 1 360px;
            }
            .cookie-consent-title {
                margin: 0 0 6px;
                font-size: 1rem;
                font-weight: 700;
            }
            .cookie-consent-copy {
                margin: 0;
                color: rgba(244, 244, 244, 0.72);
                font-size: 0.92rem;
                line-height: 1.4;
            }
            .cookie-consent-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .cookie-btn {
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.04);
                color: #f4f4f4;
                border-radius: 999px;
                padding: 10px 14px;
                cursor: pointer;
                font-weight: 600;
            }
            .cookie-btn.primary {
                border-color: rgba(185, 127, 36, 0.6);
                background: linear-gradient(135deg, #b97f24, #d4a257);
                color: #17120b;
            }
            .cookie-btn.ghost {
                color: rgba(244, 244, 244, 0.78);
            }
            .cookie-consent-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: min(680px, calc(100vw - 24px));
                max-height: calc(100vh - 36px);
                overflow-y: auto;
                z-index: 10040;
                border: 1px solid rgba(255, 255, 255, 0.16);
                border-radius: 20px;
                background: rgba(14, 14, 14, 0.98);
                color: #f4f4f4;
                padding: 22px;
                display: none;
                box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
            }
            .cookie-consent-modal.active {
                display: block;
            }
            .cookie-modal-title {
                margin: 0 0 8px;
                font-size: 1.3rem;
            }
            .cookie-modal-copy {
                margin: 0 0 18px;
                color: rgba(244, 244, 244, 0.72);
                line-height: 1.45;
            }
            .cookie-options {
                display: grid;
                gap: 12px;
                margin-bottom: 18px;
            }
            .cookie-option {
                border: 1px solid rgba(255, 255, 255, 0.14);
                border-radius: 14px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.02);
            }
            .cookie-option-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 6px;
            }
            .cookie-option h4 {
                margin: 0;
                font-size: 1rem;
            }
            .cookie-option p {
                margin: 0;
                color: rgba(244, 244, 244, 0.68);
                font-size: 0.9rem;
                line-height: 1.4;
            }
            .cookie-toggle {
                width: 46px;
                height: 26px;
                position: relative;
            }
            .cookie-toggle input {
                appearance: none;
                width: 46px;
                height: 26px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.24);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .cookie-toggle input::before {
                content: "";
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #fff;
                position: absolute;
                left: 3px;
                top: 3px;
                transition: transform 0.2s ease;
            }
            .cookie-toggle input:checked {
                background: linear-gradient(135deg, #b97f24, #d4a257);
                border-color: rgba(185, 127, 36, 0.7);
            }
            .cookie-toggle input:checked::before {
                transform: translateX(20px);
            }
            .cookie-toggle input:disabled {
                opacity: 0.8;
                cursor: not-allowed;
            }
            .cookie-modal-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                flex-wrap: wrap;
            }
            .cookie-settings-link {
                color: rgba(244, 244, 244, 0.75);
                text-decoration: underline;
                text-underline-offset: 3px;
                cursor: pointer;
                font-size: 0.88rem;
            }
        `;

        document.head.appendChild(style);
    }

    function createUI() {
        const backdrop = document.createElement("div");
        backdrop.className = "cookie-consent-backdrop";

        const modal = document.createElement("div");
        modal.className = "cookie-consent-modal";
        modal.innerHTML = `
            <h3 class="cookie-modal-title">Cookie-Einstellungen</h3>
            <p class="cookie-modal-copy">Du entscheidest, welche Cookies aktiviert werden. Notwendige Cookies sind fuer den Betrieb der Website erforderlich und immer aktiv.</p>
            <div class="cookie-options">
                <div class="cookie-option">
                    <div class="cookie-option-head">
                        <h4>Notwendig</h4>
                        <label class="cookie-toggle"><input id="cookie-necessary" type="checkbox" checked disabled></label>
                    </div>
                    <p>Erforderlich fuer grundlegende Funktionen wie Sicherheit und Seitennavigation.</p>
                </div>
                <div class="cookie-option">
                    <div class="cookie-option-head">
                        <h4>Statistik</h4>
                        <label class="cookie-toggle"><input id="cookie-analytics" type="checkbox"></label>
                    </div>
                    <p>Hilft uns zu verstehen, wie Besucher die Website nutzen (z. B. Seitenaufrufe).</p>
                </div>
                <div class="cookie-option">
                    <div class="cookie-option-head">
                        <h4>Marketing</h4>
                        <label class="cookie-toggle"><input id="cookie-marketing" type="checkbox"></label>
                    </div>
                    <p>Wird fuer externe Marketing- und Kampagnenfunktionen genutzt.</p>
                </div>
            </div>
            <div class="cookie-modal-actions">
                <button class="cookie-btn ghost" data-cookie-action="reject">Nur notwendige</button>
                <button class="cookie-btn" data-cookie-action="save">Auswahl speichern</button>
                <button class="cookie-btn primary" data-cookie-action="accept-all">Alle akzeptieren</button>
            </div>
        `;

        const banner = document.createElement("div");
        banner.className = "cookie-consent-banner";
        banner.innerHTML = `
            <div class="cookie-consent-text">
                <p class="cookie-consent-title">Cookie-Einstellungen</p>
                <p class="cookie-consent-copy">Wir verwenden notwendige Cookies sowie optional Statistik- und Marketing-Cookies. Du kannst deine Auswahl jederzeit aendern.</p>
                <span class="cookie-settings-link" data-cookie-open-settings="true">Einstellungen bearbeiten</span>
            </div>
            <div class="cookie-consent-actions">
                <button class="cookie-btn ghost" data-cookie-action="reject">Nur notwendige</button>
                <button class="cookie-btn" data-cookie-action="open-settings">Auswahl</button>
                <button class="cookie-btn primary" data-cookie-action="accept-all">Alle akzeptieren</button>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
        document.body.appendChild(banner);

        return { backdrop, modal, banner };
    }

    function initConsent() {
        createStyles();
        const ui = createUI();

        const analyticsInput = ui.modal.querySelector("#cookie-analytics");
        const marketingInput = ui.modal.querySelector("#cookie-marketing");

        const syncInputs = (consent) => {
            const current = consent || DEFAULT_CONSENT;
            analyticsInput.checked = Boolean(current.analytics);
            marketingInput.checked = Boolean(current.marketing);
        };

        const closeModal = () => {
            ui.modal.classList.remove("active");
            ui.backdrop.classList.remove("active");
        };

        const openModal = () => {
            const existing = readConsent();
            syncInputs(existing);
            ui.modal.classList.add("active");
            ui.backdrop.classList.add("active");
        };

        const hideBanner = () => {
            ui.banner.classList.remove("active");
        };

        const showBanner = () => {
            ui.banner.classList.add("active");
        };

        const applyAction = (action) => {
            if (action === "accept-all") {
                writeConsent({ analytics: true, marketing: true });
                closeModal();
                hideBanner();
                return;
            }

            if (action === "reject") {
                writeConsent({ analytics: false, marketing: false });
                closeModal();
                hideBanner();
                return;
            }

            if (action === "save") {
                writeConsent({
                    analytics: analyticsInput.checked,
                    marketing: marketingInput.checked
                });
                closeModal();
                hideBanner();
                return;
            }

            if (action === "open-settings") {
                openModal();
            }
        };

        ui.backdrop.addEventListener("click", closeModal);

        document.addEventListener("click", (event) => {
            const actionEl = event.target.closest("[data-cookie-action]");
            if (actionEl) {
                applyAction(actionEl.dataset.cookieAction);
                return;
            }

            const openEl = event.target.closest("[data-cookie-open-settings]");
            if (openEl) {
                openModal();
            }
        });

        const footerLinks = document.querySelectorAll("a[href='#'], a[href='datenschutz.html']");
        footerLinks.forEach((link) => {
            const text = (link.textContent || "").trim().toLowerCase();
            if (text.includes("datenschutz") || text.includes("cookie")) {
                link.addEventListener("click", (event) => {
                    event.preventDefault();
                    openModal();
                });
            }
        });

        const consent = readConsent();
        if (!consent || !hasDecision()) {
            showBanner();
        }
    }

    window.EventVTConsent = {
        hasConsent,
        getConsent: readConsent,
        hasDecision,
        openSettings: () => {
            const trigger = document.querySelector("[data-cookie-action='open-settings']");
            if (trigger) {
                trigger.click();
            }
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initConsent);
    } else {
        initConsent();
    }
})();
