# 🏁 Wyścig Grawitacyjny

Gra wyścigowa z silnikiem fizyki 2D w JavaScript. Dwa okręgi spadają z góry na dół po torze pełnym przeszkód - kto pierwszy dotrze do mety, wygrywa!

## 🎮 Jak grać

### Sterowanie
- **Gracz 1 (niebieski)**: `A` / `D` - ruch w lewo/prawo
- **Gracz 2 (różowy)**: `←` / `→` - ruch w lewo/prawo

### Zasady
1. Kliknij **START** aby rozpocząć wyścig
2. Po odliczaniu okręgi zaczną spadać pod wpływem grawitacji
3. Steruj swoim okręgiem, omijając przeszkody lub wykorzystując je na swoją korzyść
4. Pierwszy okrąg, który dotrze do mety - wygrywa!

## ⚙️ Parametry fizyki

Możesz dostosować parametry silnika fizyki w panelu ustawień:

| Parametr | Opis | Zakres |
|----------|------|--------|
| **Grawitacja** | Siła ciągnąca okręgi w dół | 0.1 - 2.0 |
| **Sprężystość** | Jak bardzo okręgi odbijają się od przeszkód | 0 - 1.0 |
| **Tarcie** | Spowalnia ruch okręgów | 0 - 0.2 |

## 🔧 Funkcje silnika fizyki

### Klasy
- `Vector2D` - operacje wektorowe (dodawanie, odejmowanie, normalizacja, iloczyn skalarny)
- `PhysicsBody` - bazowa klasa obiektów fizycznych
- `Circle` - okręgi z kolizjami
- `Rectangle` - prostokąty (przeszkody) z rotacją
- `PhysicsEngine` - główny silnik obsługujący grawitację i kolizje

### Kolizje
- **Okrąg-Okrąg**: Realistyczne odbicia z zachowaniem pędu
- **Okrąg-Prostokąt**: Obsługa obrotowych przeszkód
- **Granice canvas**: Odbicia od ścian bocznych

## 🚀 Uruchomienie

1. Otwórz plik `index.html` w przeglądarce
2. Lub uruchom lokalny serwer:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

Następnie otwórz `http://localhost:8000` w przeglądarce.

## 📁 Struktura projektu

```
physics/
├── index.html      # Główny plik HTML z canvas
├── style.css       # Stylowanie interfejsu
├── physics.js      # Silnik fizyki 2D
├── game.js         # Logika gry wyścigowej
└── README.md       # Dokumentacja
```

## 🎨 Cechy wizualne

- Neonowa estetyka z efektami poświaty
- Animowane cząsteczki przy ruchu
- Dynamiczne odliczanie przed startem
- Efekty confetti przy wygranej
- Responsywny interfejs

## 📝 Licencja

MIT License - możesz używać i modyfikować kod dowolnie.
