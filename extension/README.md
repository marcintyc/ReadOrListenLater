# Rozszerzenie: Czytaj i Słuchaj

## Instalacja (tryb deweloperski)
1. Otwórz Chrome i przejdź do `chrome://extensions/`.
2. Włącz tryb deweloperski (Developer mode).
3. Kliknij "Load unpacked" / "Załaduj rozpakowane" i wskaż folder `/workspace/extension`.
4. Kliknij ikonę rozszerzenia, aby otworzyć popup.

## Użycie
- Z przycisku "Zapisz bieżącą kartę" zapiszesz aktualną stronę.
- Możesz wkleić URL i kliknąć "Zapisz z linka".
- Lista pokazuje tytuły. Przyciski: "Odtwarzaj", "Dodaj do playlisty", "Tekst", "Usuń".
- "Odtwórz playlistę" odtwarza wszystkie po kolei. Tryb offline działa po zapisaniu (audio jest w IndexedDB).
- Menu kontekstowe (prawy klik) pozwala dodać stronę do kolejki. Po otwarciu popupu zostanie zapisana automatycznie.

## Wymagania backendu
Backend nasłuchuje na `http://localhost:3000` (patrz `/workspace/backend`).