# WAVULT OS — Mobile Interface

React Native / Expo-app för Wavult OS Command Center.

## Stack

- **Expo SDK 55** + Expo Router (file-based routing)
- **React Query** — server state
- **Zustand** — client state
- **AsyncStorage** — JWT-persistering
- **TypeScript**

## API

- Wavult OS API: `http://api.bc.pixdrift.com:3001`
- Supabase: `znmxtnxxjpmgtycmsqjv`
- Konfigureras via `.env` (kopiera `.env.example`)

## Komma igång

```bash
cd apps/wavult-mobile

# Installera dependencies (om ej redan gjort)
npm install

# Starta i web-läge (snabbaste för dev)
npx expo start --web

# Starta för iOS simulator
npx expo start --ios

# Starta för Android
npx expo start --android
```

## Demo-läge

Appen faller automatiskt tillbaka till mock-data om API:et inte svarar.
Tryck "Fortsätt i demo-läge" på login-skärmen för att hoppa förbi autentisering.

Demo-credentials:
- Email: `demo@wavult.com`
- Lösenord: vad som helst

## Struktur

```
app/
  _layout.tsx           Root layout (QueryClient + auth guard)
  (auth)/login.tsx      Inloggningsskärm
  (tabs)/
    _layout.tsx         Bottom tab navigator
    index.tsx           AI Command Center (chat)
    feed.tsx            Priority Feed (containers)
    profile.tsx         Profil & Semantisk motor

components/
  chat/                 Chat-komponenter
  feed/                 Feed-komponenter (ContainerCard, etc.)
  profile/              Profilkomponenter

lib/
  api.ts                API-klient (med mock-fallback)
  auth.ts               JWT auth + demo-läge
  store.ts              Zustand global state
  mockData.ts           Realistisk testdata

constants/
  theme.ts              Design tokens (Wavult dark theme)
```

## Tabs

| Tab | Ikon | Funktion |
|-----|------|----------|
| AI Command Center | ◈ | Chat-gränssnitt med mock AI-svar |
| Priority Feed | ⊞ | Containers sorterade efter datum + prioritet |
| Profil | ◎ | Semantisk profil + datakontroller |

## Nästa steg (Fas 2)

- [ ] Koppla riktig AI/LLM via Wavult OS API
- [ ] Push notifications för högt-prio containers
- [ ] Swipe-to-complete med haptic feedback
- [ ] Supabase real-time sync
- [ ] Biometric login (Face ID / Touch ID)
- [ ] Offline-first med optimistic updates

## Notering

Appen är ett **klientlager** — ingen business logic körs i appen.
All logik hanteras av Wavult OS backend (api.bc.pixdrift.com:3001).
