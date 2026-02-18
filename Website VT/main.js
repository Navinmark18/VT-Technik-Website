const ADMIN_PASSWORD = "123";

// Login-Funktion
window.login = () => {
    const userInput = prompt("Bitte Admin-Passwort eingeben:");
    if (userInput === ADMIN_PASSWORD) {
        localStorage.setItem('eventVT_admin', 'true');
        alert("Erfolgreich eingeloggt!");
        location.reload();
    } else if (userInput !== null) {
        alert("Falsches Passwort!");
    }
};

// Logout-Funktion
window.logout = () => {
    localStorage.removeItem('eventVT_admin');
    location.reload();
};

// Wartungsmodus Toggle-Funktion
window.toggleMaintenance = () => {
    const isMaintenance = localStorage.getItem('eventVT_maintenance') === 'true';
    if (isMaintenance) {
        localStorage.removeItem('eventVT_maintenance');
        alert('Wartungsmodus deaktiviert - Website ist online');
    } else {
        localStorage.setItem('eventVT_maintenance', 'true');
        alert('Wartungsmodus aktiviert - Website ist for Besucher offline');
    }
    location.reload();
};

function render() {
    const app = document.getElementById('app');
    const isAdmin = localStorage.getItem('eventVT_admin') === 'true';
    const isMaintenance = localStorage.getItem('eventVT_maintenance') === 'true';

    // Wartungsmodus-Button im Footer anzeigen (nur für Admins)
    const maintenanceToggle = document.getElementById('maintenance-toggle');
    if (maintenanceToggle && isAdmin) {
        maintenanceToggle.style.display = 'inline';
        maintenanceToggle.textContent = isMaintenance ? 'Wartungsmodus: AN' : 'Wartungsmodus: AUS';
    }

    // Wenn Wartungsmodus aktiv und nicht Admin - zeige Wartungsseite
    if (isMaintenance && !isAdmin) {
        app.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #222; color: white; text-align: center;">
                <h1>🛠 Wartungsmodus</h1>
                <p>Wir arbeiten gerade an der Seite.</p>
                <button onclick="window.login()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer; background: #ff4d4d; border: none; color: white; border-radius: 5px;">
                    Admin Login
                </button>
            </div>
        `;
        return; // Keine weitere JavaScript-Ausführung für Nicht-Admins
    }

    // Wenn du eingeloggt bist, fügen wir einen Logout-Hinweis hinzu
    if (isAdmin) {
        const logoutBtn = document.createElement('div');
        logoutBtn.innerHTML = `<button onclick="window.logout()" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000; padding: 10px; opacity: 0.5;">Admin Logout</button>`;
        document.body.appendChild(logoutBtn);
    }
}

render();