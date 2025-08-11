# Backend: Czytaj i Słuchaj

Serwer Node.js dostarcza endpoint `POST /save`, który:
- pobiera stronę przez Puppeteer (`waitUntil: 'networkidle2'`),
- czyści treść przez Readability (JSDOM),
- generuje MP3 przez CLI Coqui TTS i zapisuje w `public/audio`,
- zwraca `{ title, text, audioUrl }`.

## Szybki start

1. Zainstaluj zależności Node:

```
npm install
```

2. Zainstaluj Coqui TTS (Python):

- Wymagany Python 3.8+ oraz `pip`.
- Zalecane wirtualne środowisko (venv).

```
python -m venv .venv
source .venv/bin/activate
pip install TTS
```

3. Uruchom serwer:

```
npm start
```

Serwer nasłuchuje na `http://localhost:3000` i serwuje pliki audio spod `/audio/*`.

## Uwaga o modelu

W pliku `server.js` model CLI ustawiony jest na `tts_models/multilingual/multi-dataset/your_tts`. Możesz zmienić na inny, np. polski, zgodnie z dokumentacją Coqui TTS.

Przykład: `--model_name tts_models/pl/mai_female/glow-tts` (jeśli dostępny w Twojej instalacji TTS).

## Test ręczny

```
curl -X POST http://localhost:3000/save \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```