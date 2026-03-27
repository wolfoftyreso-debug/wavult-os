# 🎙️ Siri → Bernt — Setup på 3 minuter

## Resultat: "Hey Siri, Bernt" → du pratar → Bernt svarar i örat

---

## Steg 1 — Installera Wavult Mobile (om ej gjort)

```
npx expo start --tunnel
```
Scanna QR-koden med Expo Go på iPhone.

---

## Steg 2 — Skapa Siri Shortcut

1. Öppna **Genvägar** (Shortcuts) på iPhone
2. Tryck **+** uppe till höger
3. Tryck **Lägg till åtgärd**
4. Sök: **Diktera text** → lägg till
   - Språk: **Svenska**
   - Stanna automatiskt: **På**
5. Tryck **+** igen → **URL** → lägg till
6. URL: `wavult://voice?query=[Diktat text]`
   (dra in "Diktat text"-variabeln från steg 4)
7. Tryck **+** igen → **Öppna URL** → välj URL från steg 6
8. Tryck **Nästa** → Namn: **Bernt**
9. Tryck på genvägen → **Lägg till Siri**
10. Säg: **"Bernt"** (detta är aktiveringsorden)

---

## Steg 3 — Testa

Säg: **"Hey Siri, Bernt"**

→ Siri lyssnar på din fråga
→ Wavult Mobile öppnas med frågan
→ Bernt svarar

---

## Bonussteg — Siri talar svaret

Lägg till **Tala text** sist i genvägen (efter Öppna URL):
- Kalla ett API-anrop till Bernt och läs upp svaret
- Eller: Wavult Mobile kan skicka svaret tillbaka via TTS

---

## URL-schema som fungerar

| URL | Effekt |
|-----|--------|
| `wavult://voice` | Öppnar appen i röstläge |
| `wavult://voice?query=skicka mail till Dennis` | Öppnar + skickar direkt |
| `wavult://` | Öppnar appen |

---

## Felsökning

**Appen öppnas inte:** Kontrollera att Wavult Mobile är installerad via Expo Go
**Bernt svarar inte:** Tunnel kan ha gått ner — kör `start-bernt-tunnel.sh` igen på datorn
**Siri förstår inte:** Säg tydligare, eller byt aktiveringsord till "Wavult"
