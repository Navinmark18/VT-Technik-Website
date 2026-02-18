#include "Header.h"
#include <iostream>
#include <iomanip>

Automat::Automat() {
    m_inventar = {
        {"Chips", 1.50, 5},
        {"Schokolade", 1.20, 10},
        {"Gummibärchen", 0.80, 2},
        {"Energie-Riegel", 2.00, 0} // Ausverkauft zum Testen
    };
}

void Automat::anzeigen() {
    std::cout << "\n--- SNACK-O-MAT 3000 ---\n";
    for (int i = 0; i < m_inventar.size(); ++i) {
        std::cout << i + 1 << ". " << std::setw(15) << m_inventar[i].name 
                  << " | " << m_inventar[i].preis << "€ | Vorrat: " 
                  << m_inventar[i].anzahl << "\n";
    }
}

void Automat::kaufen(int index) {
    int i = index - 1; // Umrechnung von User-Eingabe auf Index
    if (i < 0 || i >= m_inventar.size()) {
        std::cout << "Ungültige Wahl!\n";
        return;
    }

    if (m_inventar[i].anzahl > 0) {
        m_inventar[i].anzahl--;
        std::cout << "Guten Appetit! Du hast " << m_inventar[i].name << " gekauft.\n";
    } else {
        std::cout << "Leider ausverkauft! Wähle etwas anderes.\n";
    }
}