#include <iostream>
#include <cmath>
using namespace std;

#pragma once
#include <string>
#include <vector>

struct Snack {
    std::string name;
    double preis;
    int anzahl;
};

class Automat {
public:
    Automat(); // Konstruktor: Befüllt den Automaten
    void anzeigen();
    void kaufen(int index);

private:
    std::vector<Snack> m_inventar;
};