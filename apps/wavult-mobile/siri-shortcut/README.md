# Siri → Bernt Shortcut

## Hur det fungerar

"Hey Siri, Bernt" → öppnar Wavult Mobile direkt i röstläge → du pratar → Bernt svarar.

## Installera på iPhone

### Alternativ 1 — URL Scheme (enklast, 2 min)

1. Öppna **Genvägar** (Shortcuts) på din iPhone
2. Tryck **+** → **Ny genväg**
3. Lägg till action: **Öppna URL**
4. URL: `wavult://voice` _(deep link till röstläge i appen)_
5. Namnge genvägen: **"Bernt"**
6. Tryck på genvägen → **Lägg till Siri** → säg "Bernt"

Nu funkar: **"Hey Siri, Bernt"** → öppnar appen i röstläge direkt.

### Alternativ 2 — Med röstfråga direkt (avancerad)

1. Skapa genväg som ovan
2. Lägg till **Diktera text** FÖRE Öppna URL
3. Lägg till **URL** med: `wavult://voice?query=[Diktat text]`

Nu funkar: **"Hey Siri, Bernt, skicka mail till Dennis"** → appen öppnas med frågan ifylld.

## Deep Link i appen

Lägg till i `app.json`:
```json
{
  "scheme": "wavult"
}
```

Och hantera `wavult://voice` och `wavult://voice?query=...` i `_layout.tsx`.

## Status-indikator i appen

När Bernt är live: grön dot + "Live — Bernt ansluten"
När offline: röd dot + "Demo-läge"
