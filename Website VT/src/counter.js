// 1. EINSTELLUNG: Ist die Wartung aktiv? (true = Ja, false = Nein)
let isMaintenance = true; 

// 2. Funktion zum Umschalten (für dich als Admin)
window.toggleAdmin = () => {
    const pw = prompt("Admin-Passwort:");
    if (pw === "1234") {
        isMaintenance = !isMaintenance;
        renderPage();
    } else {
        alert("Falsches Passwort!");
    }
};

function renderPage() {
    const app = document.getElementById('app');

    if (isMaintenance) {
        // DESIGN FÜR WARTUNGSMODUS
        app.innerHTML = `
            <div class="maintenance-screen">
                <div class="card">
                    <h1>🛠 Website im Umbau</h1>
                    <p>Wir machen EVENT VT gerade noch besser für dich.</p>
                    <button onclick="toggleAdmin()">Admin Login</button>
                </div>
            </div>
        `;
    } else {
        // HIER WIRD DEINE ECHTE WEBSITE GELADEN
        // Du kannst hier deinen normalen HTML-Code einfügen oder einfach die Seite so lassen
        location.reload(); // Einfachste Methode: Seite neu laden, wenn Wartung aus
    }
}

renderPage();