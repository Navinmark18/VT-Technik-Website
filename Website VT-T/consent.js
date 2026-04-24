(function () {
    const STORAGE_KEY = "eventVIN_consent_v1";
    const LEGACY_KEY = "cookie-consent";
    const VERSION = 1;
    const INITIAL_BANNER_DELAY_MS = 300;

    function normalizeConsent(rawConsent) {
        if (!rawConsent || typeof rawConsent !== "object") {
            return null;
        }

        return {
            version: VERSION,
            necessary: true,
            analytics: Boolean(rawConsent.analytics),
            marketing: Boolean(rawConsent.marketing),
            timestamp: Number(rawConsent.timestamp) || Date.now()
        };
    }

    function readStoredConsent() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return normalizeConsent(JSON.parse(stored));
            }

            const legacy = localStorage.getItem(LEGACY_KEY);
            if (legacy === "accept") {
                const migrated = saveConsent({ analytics: true, marketing: false });
                localStorage.removeItem(LEGACY_KEY);
                return migrated;
            }

            if (legacy === "reject") {
                const migrated = saveConsent({ analytics: false, marketing: false });
                localStorage.removeItem(LEGACY_KEY);
                return migrated;
            }
        } catch (error) {
            return null;
        }

        return null;
    }

    function saveConsent(consentDraft) {
        const normalized = normalizeConsent({ ...consentDraft, timestamp: Date.now() });
        if (!normalized) {
            return null;
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            localStorage.removeItem(LEGACY_KEY);
        } catch (error) {
            // Ignore persistence issues.
        }

        window.dispatchEvent(new CustomEvent("eventvin:consent-changed", {
            detail: normalized
        }));

        return normalized;
    }

    let root = null;
    let banner = null;
    let modal = null;
    let analyticsCheckbox = null;
    let marketingCheckbox = null;

    function closeModal() {
        if (!modal) {
            return;
        }

        modal.hidden = true;
        document.documentElement.classList.remove("consent-modal-open");
    }

    function openModal() {
        if (!modal) {
            return;
        }

        const current = readStoredConsent();
        if (analyticsCheckbox) {
            analyticsCheckbox.checked = Boolean(current?.analytics);
        }
        if (marketingCheckbox) {
            marketingCheckbox.checked = Boolean(current?.marketing);
        }

        modal.hidden = false;
        document.documentElement.classList.add("consent-modal-open");
    }

    function hideBanner() {
        if (banner) {
            banner.hidden = true;
        }
    }

    function showBanner() {
        if (banner) {
            banner.hidden = false;
        }
    }

    function applyDecision(consentDraft) {
        const saved = saveConsent(consentDraft);
        hideBanner();
        closeModal();
        return saved;
    }

    function createConsentUi() {
        root = document.createElement("div");
        root.className = "consent-root";
        root.innerHTML = `
            <div class="consent-banner" id="eventvin-consent-banner" hidden>
                <div class="consent-copy">
                    <p class="consent-title">Cookie-Einstellungen</p>
                    <p class="consent-text">Wir nutzen notwendige Technologien für den Betrieb der Website. Statistik-Cookies helfen uns zu verstehen, welche Seiten genutzt werden. Diese sind optional.</p>
                </div>
                <div class="consent-actions">
                    <button type="button" class="consent-button consent-button-secondary" data-consent-action="necessary">Nur notwendige</button>
                    <button type="button" class="consent-button consent-button-secondary" data-consent-action="settings">Einstellungen</button>
                    <button type="button" class="consent-button consent-button-primary" data-consent-action="accept-all">Alle akzeptieren</button>
                </div>
            </div>
            <div class="consent-modal" id="eventvin-consent-modal" hidden>
                <div class="consent-backdrop" data-consent-action="close"></div>
                <div class="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="consent-dialog-title">
                    <div class="consent-dialog-header">
                        <div>
                            <p class="consent-title">Cookie-Einstellungen</p>
                            <p class="consent-text">Du entscheidest, welche optionalen Kategorien aktiv sein sollen.</p>
                        </div>
                        <button type="button" class="consent-icon-button" data-consent-action="close" aria-label="Schließen">✕</button>
                    </div>
                    <div class="consent-option is-required">
                        <div>
                            <strong>Notwendig</strong>
                            <p>Erforderlich für Grundfunktionen der Website.</p>
                        </div>
                        <span class="consent-pill">Immer aktiv</span>
                    </div>
                    <label class="consent-option" for="consent-analytics">
                        <div>
                            <strong>Statistik</strong>
                            <p>Erlaubt anonyme Besucher- und Social-Klick-Statistiken.</p>
                        </div>
                        <input id="consent-analytics" type="checkbox">
                    </label>
                    <label class="consent-option" for="consent-marketing">
                        <div>
                            <strong>Marketing</strong>
                            <p>Reserviert für spätere Werbe- oder Retargeting-Integrationen.</p>
                        </div>
                        <input id="consent-marketing" type="checkbox">
                    </label>
                    <div class="consent-dialog-actions">
                        <button type="button" class="consent-button consent-button-secondary" data-consent-action="reject-all">Nur notwendige</button>
                        <button type="button" class="consent-button consent-button-primary" data-consent-action="save-selection">Auswahl speichern</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(root);

        banner = root.querySelector("#eventvin-consent-banner");
        modal = root.querySelector("#eventvin-consent-modal");
        analyticsCheckbox = root.querySelector("#consent-analytics");
        marketingCheckbox = root.querySelector("#consent-marketing");

        root.addEventListener("click", (event) => {
            const actionTarget = event.target.closest("[data-consent-action]");
            if (!actionTarget) {
                return;
            }

            const action = actionTarget.dataset.consentAction;

            if (action === "necessary" || action === "reject-all") {
                applyDecision({ analytics: false, marketing: false });
                return;
            }

            if (action === "accept-all") {
                applyDecision({ analytics: true, marketing: true });
                return;
            }

            if (action === "settings") {
                openModal();
                return;
            }

            if (action === "save-selection") {
                applyDecision({
                    analytics: Boolean(analyticsCheckbox?.checked),
                    marketing: Boolean(marketingCheckbox?.checked)
                });
                return;
            }

            if (action === "close") {
                closeModal();
            }
        });

        document.querySelectorAll("[data-open-consent]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                openModal();
            });
        });
    }

    function hasConsent(category) {
        const consent = readStoredConsent();
        if (category === "necessary") {
            return true;
        }

        return Boolean(consent?.[category]);
    }

    function init() {
        createConsentUi();
        const existingConsent = readStoredConsent();
        if (!existingConsent) {
            window.setTimeout(() => {
                if (!readStoredConsent()) {
                    showBanner();
                }
            }, INITIAL_BANNER_DELAY_MS);
        }
    }

    window.EventVINConsent = {
        getConsent: readStoredConsent,
        hasConsent,
        openPreferences: openModal,
        acceptAll: () => applyDecision({ analytics: true, marketing: true }),
        rejectOptional: () => applyDecision({ analytics: false, marketing: false })
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();