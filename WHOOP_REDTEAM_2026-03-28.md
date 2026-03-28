# Red Team Rapport — WHOOP-integration
Datum: 2026-03-28
Granskad av: Bernt (AI-säkerhetsanalys) · Kodbas: Wavult OS / Hypbit

---

## Executive Summary

WHOOP-integrationen har en kritisk arkitektursårbarhet: OAuth-callbacken returnerar access_token och refresh_token i klartext i URL:en, vilket exponerar långlivade biometriska tokens i webbläsarhistorik, server-loggar, Referer-headers och nätverk-proxies. Backend `/whoop/me` accepterar godtyckliga Bearer tokens utan att verifiera att de tillhör den inloggade användaren, vilket i praktiken öppnar för token-substitutionsangrepp. `oauthStateStore` är en in-memory Map som inte synkroniseras mellan ECS-instanser, vilket gör CSRF-skyddet opålitligt i produktionsmiljön med 2 tasks. GDPR-efterlevnaden är bristfällig: det saknas retention policy, rätt till radering av snapshots, och explicit samtycke för teamvisning av biometrik. Sammantaget behöver tre kritiska och fyra medelsvåra problem åtgärdas innan WHOOP-modulen är produktionsklar ur ett säkerhets- och integritetsperspektiv.

---

## Kritiska sårbarheter (åtgärda omedelbart)

### KRIT-1 — Tokens exponeras i URL (webbläsarhistorik + loggar)
**Beskrivning:**  
I `/whoop/callback` sker redirect till:
```
https://wavult-os.pages.dev/whoop?connected=true&access_token=<TOKEN>&refresh_token=<TOKEN>&expires_at=...
```
Access_token och refresh_token hamnar i:
- Webbläsarens URL-historik (synkad till iCloud/Google om användaren aktiverat det)
- Cloudflare access-loggar (om aktiverade)
- `Referer`-headern om användaren klickar på en länk på sidan
- Nätverksproxies / CDN-cache
- Skärmdelning och skärmdumpar

Refresh_token är långlivad (ofta 30+ dagar) och ger full access till WHOOP-API:et utan nytt användarmedgivande.

**Risk:** Kritisk — token-stöld utan nätverksattack, passiv historikexponering

**Åtgärd:**
1. Returnera aldrig tokens i URL. Använd ett kort-livat (60s) `connect_code` i URL:en:
   ```
   /whoop?connected=true&connect_code=<UUID>
   ```
2. Frontend anropar `POST /whoop/token-exchange { connect_code }` och backend returnerar tokens via JSON-body (inte URL).
3. Alternativt: sätt tokens direkt i httpOnly cookies i callbacken och redirecta utan token-params.

---

### KRIT-2 — `/whoop/me` accepterar godtyckliga Bearer tokens utan ägarkontroll
**Beskrivning:**  
I `whoop-api.ts`:
```typescript
if (authHeader?.startsWith('Bearer ')) {
  accessToken = authHeader.slice(7)
  // Direkt Bearer-token-läge: anropa WHOOP API direkt med given token
  const [recovery, sleep, strain] = await Promise.all([...])
  return res.json({ connected: true, recovery, sleep, strain, ... })
}
```
Vem som helst med ett giltigt WHOOP-token (eget eller stulet) kan anropa `/whoop/me` och få data. Det finns ingen kontroll att den medskickade Bearer-tokenen tillhör den inloggade Wavult OS-användaren. En angripare kan:
- Skicka in en token de stulit (t.ex. från URL-historik)
- Skicka in sitt eget WHOOP-token och låtsas vara en annan Wavult OS-användare

**Risk:** Kritisk — token-substitution, obehörig datahämtning

**Åtgärd:**
1. Ta bort det direkta Bearer-token-läget helt. Kräv alltid att användaren är inloggad via session (`requireAuth`).
2. Hämta alltid WHOOP-token från Supabase via `getValidAccessToken(userId)` — aldrig från request-headern.
3. Om lokalt localStorage-flöde måste behållas: bind WHOOP-token till Supabase-userId vid OAuth och validera bindningen vid varje anrop.

---

### KRIT-3 — oauthStateStore är in-memory, ECS kör 2 tasks → CSRF-skydd sönder
**Beskrivning:**  
```typescript
const oauthStateStore = new Map<string, { createdAt: number }>()
```
ECS-klustret kör 2 tasks (instanser). En OAuth-flow som startar på instans A (state skapas där) kan få sin callback på instans B (state hittas inte → redirect med `?error=invalid_state`). I praktiken:
1. **CSRF-skyddet fungerar inte reliabelt** — legitima flöden avvisas slumpmässigt
2. **Alternativt fall:** Om ECS-lastbalanseraren använder sticky sessions, fungerar det men är inte garanterat
3. En angripare kan utnyttja detta för att få systemet att acceptera manipulerade state-värden i kaosfönstret

**Risk:** Kritisk (i kombination med #1) — CSRF mot OAuth-flödet möjligt i multi-instance-miljö

**Åtgärd:**
1. Ersätt in-memory store med Redis, Supabase eller signerade HMAC-cookies för state-lagring:
   ```typescript
   // Alternativ A: Supabase-tabell whoop_oauth_states (state, created_at, used)
   // Alternativ B: Signera state med HMAC → validera signaturen utan lagring
   const state = createHmacState(randomUUID(), process.env.OAUTH_SECRET)
   ```
2. State bör bindas till användarens session/IP för extra skydd.

---

## Medelhög risk

### MED-1 — `/whoop/auth` är helt publik — DoS via state-flood
**Beskrivning:**  
`GET /whoop/auth` kräver ingen inloggning. Det globala rate-limiten är 500 req/15 min (indexts) — tillräckligt för att en angripare ska kunna:
- Fylla `oauthStateStore` med tusentals states (minnesläcka)
- Trigga tusentals redirectar till WHOOP OAuth utan att den inloggade användaren initierat dem
- Kombinerat med KRIT-3: förstöra CSRF-skyddet ytterligare

**Risk:** Medelhög — DoS, resursåtgång, missbruk av WHOOP OAuth-klient

**Åtgärd:**
1. Kräv inloggning för `/whoop/auth` — det är onödigt att det är publikt.
2. Lägg till ett max-tak för oauthStateStore (`if (oauthStateStore.size > 1000) return 429`).
3. Sätt ett specifikt striktare rate-limit på `/whoop/auth` (t.ex. 10 req/min per IP).

---

### MED-2 — access_token sparas i localStorage — XSS-sårbar
**Beskrivning:**  
`WHOOPTeamDashboard.tsx` och `WHOOPConnect.tsx` sparar tokens i localStorage:
```typescript
localStorage.setItem('whoop_access_token', access_token)
localStorage.setItem('whoop_refresh_token', refresh_token)
localStorage.setItem('whoop_expires_at', expires_at)
```
localStorage är tillgängligt via JavaScript i webbläsaren. Varje XSS-sårbarhet (i Wavult OS eller en tredje-parts-dependency) kan stjäla dessa tokens. WHOOP-tokens ger direkt tillgång till känslig biometrisk data (HRV, sömn, recovery).

**Risk:** Medelhög — tokensstöld via XSS, förvärras av att refresh_token också lagras

**Åtgärd:**
1. Idealiskt: flytta till httpOnly Secure SameSite=Strict cookies (hanteras av backend) — otillgängliga för JavaScript.
2. Om localStorage måste behållas: kryptera tokens med en session-nyckel, sätt kort TTL (1h), refresha server-side.
3. Implementera Content-Security-Policy (CSP) på Cloudflare Pages för att minska XSS-ytan.

---

### MED-3 — `/whoop/team` skickar Bearer token men kräver admin/manager — inkonsekvent
**Beskrivning:**  
I `WHOOPTeamDashboard.tsx`:
```typescript
const res = await fetch(`${API_BASE}/whoop/team`, {
  credentials: 'include',
  headers: token ? { 'Authorization': `Bearer ${token}` } : {},
})
```
Problemet: tokenen som skickas är WHOOP-access_token (biometrisk token), inte Wavult OS JWT. Backend-koden `requireAuth` kontrollerar `(req as any).user` som sätts av den globala auth-middleware som parsar Wavult OS Supabase JWT. `requireAdmin` kontrollerar `user.role`. Om frontend skickar WHOOP-token som Bearer-header:
1. Auth-middleware försöker validera den mot Supabase → misslyckas → `req.user = null`
2. `requireAuth` returnerar 401
3. Admin kan inte se team-data

I praktiken fallerar `/whoop/team` för alla användare som bara har WHOOP-token i localStorage och inte Wavult OS-session. Rolltestet är effektivt sönder i localStorage-läget.

**Risk:** Medelhög — funktionell brist + auktoriseringskonfusion

**Åtgärd:**
1. Frontend ska alltid skicka Wavult OS JWT som Authorization-header, inte WHOOP-token.
2. Separera tydligt Wavult OS-autentisering (JWT i Authorization) från WHOOP-token (internt i Supabase).
3. Lägg till ett integrationtest som verifierar att en ADMIN-användare faktiskt kan nå `/whoop/team`.

---

### MED-4 — Token refresh-fel hanteras tyst — session slutar fungera utan varning
**Beskrivning:**  
I `getValidAccessToken`:
```typescript
const fresh = await refreshWhoopToken(tokens.refresh_token);
if (fresh) {
  await saveWhoopTokens(userId, { ... });
  return fresh.access_token;
}
return null; // Refresh misslyckades
```
Om refresh misslyckas returneras `null` och `/whoop/me` returnerar 404 `WHOOP inte kopplat`. Användaren informeras inte om att de behöver koppla om. Det gamla expired token tas inte bort från Supabase. Detta kan leda till looping-beteende i frontend.

**Risk:** Låg→Medel — UX-problem + potentiell informationsläcka i felloggar

**Åtgärd:**
1. Vid refresh-fel: radera `access_token` och `refresh_token` från Supabase (tvinga re-auth).
2. Returnera ett specifikt felsvar `{ connected: false, reason: 'token_expired' }` så frontend kan visa "Koppla om WHOOP".
3. Logga refresh-fel utan att inkludera token-värdet.

---

## Låg risk / Förbättringar

- **Ingen token-expiry-kontroll i frontend:** `WHOOPTeamDashboard` kontrollerar inte `whoop_expires_at` från localStorage innan API-anrop. Anrop med expired token leder till 401 från WHOOP API, men ingen omstartsmekanism finns.

- **getTeamSnapshots loopas per user:** N+1-queries i Supabase (en query per teammedlem för snapshot + user). Vid 20 teammedlemmar = 40 queries. Bör ersättas med en JOIN-query eller PostgreSQL view.

- **Hårdkodad FRONTEND_URL:** `const FRONTEND_URL = 'https://wavult-os.pages.dev'` — bör vara en env-variabel (`WHOOP_FRONTEND_URL`) för att stödja staging/dev-miljöer utan kodändringar.

- **Snapshot-tabellen växer obegränsat:** `saveWhoopSnapshot` använder INSERT (inte upsert/update). Varje anrop till `/whoop/me` skapar en ny rad. Vid daglig användning = 365 rader/år/användare. Ingen retention-policy existerar.

- **Loggning kan läcka tokens:** `console.warn('[WHOOP] OAuth error:', oauthError)` och `console.error('[WHOOP] /me error:', err)` — om `err` innehåller request-objekt med Authorization-header kan tokens hamna i CloudWatch. Bör sanitiseras.

- **Ingen retry-logik mot WHOOP API:** Om WHOOP API returnerar 429 eller 503 misslyckas anropet tyst. Exponential backoff bör implementeras i `whoopFetch`.

- **WHOOPConnect.tsx rensar inte tokens vid disconnect:** `handleDisconnect` i `WHOOPConnect.tsx` anropar `DELETE /whoop/disconnect` men rensa inte localStorage (till skillnad från `WHOOPTeamDashboard.tsx` som har `clearWhoopTokens()`). En rest-token finns kvar i localStorage.

- **Ingen validering av access_token-format:** Frontend sparar rakt av det som `params.get('access_token')` returnerar. Om en angripare manipulerar URL:en kan en skadlig sträng sparas i localStorage (begränsad risk men defensiv programmering rekommenderas).

---

## GDPR-bedömning

| Krav | Status | Kommentar |
|------|--------|-----------|
| **Rättslig grund (Art. 6)** | ⚠️ Oklar | Biometrisk data (HRV, vilopuls) är känslig (Art. 9). Samtycke behöver vara explicit och dokumenterat. OAuth-samtycket mot WHOOP är inte detsamma som samtycke till att data visas för arbetsgivaren. |
| **Explicit samtycke (Art. 7/9)** | ❌ Saknas | Användaren godkänner WHOOP-kopplingen, men godkänner inte explicit att chefer/managers kan se deras biometrik i `/whoop/team`. Arbetsgivare kan inte kräva att anställda delar biometrisk hälsodata. |
| **Dataminimering (Art. 5.1c)** | ⚠️ Delvis | `kilojoules` hämtas men visas ej i UI. `body_measurement`-scope inkluderas i OAuth men används inte. Bör tas bort. |
| **Lagringstid (Art. 5.1e)** | ❌ Saknas | `whoop_snapshots`-tabellen har ingen retention policy. Data lagras för evigt. |
| **Rätt till radering (Art. 17)** | ⚠️ Delvis | `DELETE /whoop/disconnect` raderar tokens men raderar inte snapshots i `whoop_snapshots`-tabellen. Historisk biometrisk data finns kvar. |
| **Information till den registrerade (Art. 13)** | ❌ Saknas | Ingen tydlig information om vilken data som lagras, hur länge, vem som ser den. |
| **Dataskyddsombud / DPA** | ❓ Okänt | Okänt om GDPR-representation är på plats för databehandling av anställdas biometrik. |
| **Tredjepartsöverföring (Art. 46)** | ⚠️ Bevaka | WHOOP Corp är ett amerikanskt bolag. Standardavtalsklausuler (SCC) krävs för legal dataöverföring EU→USA. |
| **Supabase-säkerhet** | ⚠️ Kontrollera | Access_token och refresh_token lagras i klartext i `whoop_connections`-tabellen. Bör krypteras at-rest eller via Vault. |

**GDPR-sammanfattning:** Biometrisk data (HRV, vilopuls, sömn) klassas som känslig personuppgift enligt Art. 9 GDPR. Det nuvarande flödet saknar explicit samtycke till teamvisning, retention policy och rätt till fullständig radering. I arbetsgivarkontext (Wavult Group) är det problematiskt att chefer automatiskt kan se anställdas biometrik utan skriftligt samtycke och dokumenterat behandlingsändamål.

---

## Dataflöde (verifierat)

```
1. INITIERING
   Användare klickar "Koppla WHOOP" i frontend
   → window.location.href = 'https://api.hypbit.com/whoop/auth'

2. OAUTH START (backend)
   GET /whoop/auth [PUBLIC — ingen auth krävs]
   → randomUUID() → oauthStateStore.set(state, { createdAt }) [IN-MEMORY, ej delad mellan ECS-tasks]
   → redirect till https://api.prod.whoop.com/oauth/oauth2/auth?state=...&scope=read:recovery read:sleep read:workout read:body_measurement offline

3. WHOOP GODKÄNNANDE
   Användaren loggar in hos WHOOP och godkänner
   → WHOOP redirectar till WHOOP_REDIRECT_URI (backend /whoop/callback?code=...&state=...)

4. CALLBACK (backend)
   GET /whoop/callback
   → Validera state mot oauthStateStore [SÅRBAR: multi-instance]
   → POST https://api.prod.whoop.com/oauth/oauth2/token → access_token, refresh_token
   → Om req.user finns: hämta WHOOP user_id, spara tokens till Supabase (whoop_connections)
   → Hämta initial snapshot: recovery, sleep, strain → INSERT till whoop_snapshots
   → [KRITISK] Redirect till https://wavult-os.pages.dev/whoop?connected=true&access_token=TOKEN&refresh_token=TOKEN

5. FRONTEND MOTTAGNING
   WHOOPTeamDashboard/ConnectTab useEffect
   → params.get('access_token') → localStorage.setItem('whoop_access_token', token) [XSS-sårbar]
   → window.history.replaceState({}, '', '/whoop') [rensar URL-baren, men ej historik]

6. DATA-HÄMTNING (frontend → backend → WHOOP)
   GET /whoop/me { Authorization: Bearer <whoop_access_token från localStorage> }
   → Backend: token extraheras från header [EJ validerat mot ägare]
   → GET https://api.prod.whoop.com/developer/v1/recovery?limit=1
   → GET https://api.prod.whoop.com/developer/v1/sleep?limit=1
   → GET https://api.prod.whoop.com/developer/v1/cycle?limit=1
   → Returneras till frontend som JSON

7. TEAM-DATA (admin/manager)
   GET /whoop/team { credentials: 'include', Authorization: Bearer <whoop_token?> }
   → requireAuth + requireAdmin
   → getTeamSnapshots(): N+1 queries mot Supabase per teammedlem
   → Returnerar aggregerad data inkl. full_name, email, biometrik

8. DATA I VILA
   - whoop_connections (Supabase): access_token, refresh_token, expires_at, whoop_user_id [klartext]
   - whoop_snapshots (Supabase): recovery_score, hrv, resting_hr, sleep_performance, sleep_hours, strain_score [ej retention]
   - localStorage (webbläsare): whoop_access_token, whoop_refresh_token, whoop_expires_at [XSS-sårbar]
   - Webbläsarhistorik: URL med token (kvar trots replaceState)
   - CloudWatch-loggar: potentiellt token-data vid fel
```

---

## Rekommenderad åtgärdsplan

### Fas 1 — Omedelbart (denna sprint)

1. **Fixa token-i-URL (KRIT-1):** Implementera `connect_code`-mönstret. Backend sparar tokens med ett engångskod, frontend hämtar dem via POST. Aldrig tokens i URL.

2. **Ta bort direkt Bearer-token-läge i `/whoop/me` (KRIT-2):** Kräv alltid Wavult OS-session. Hämta WHOOP-token server-side från Supabase.

3. **Kräv inloggning för `/whoop/auth` (MED-1):** Flytta `requireAuth` till `/auth`-endpointen. State-flood-risk minimeras.

4. **Fixa oauthStateStore för multi-instance (KRIT-3):** Lägg en `whoop_oauth_states`-tabell i Supabase eller använd HMAC-signerade state-tokens som inte kräver lagring.

### Fas 2 — Inom 1 vecka

5. **Flytta tokens till httpOnly cookies (MED-2):** Alternativt: kryptera localStorage-tokens och håll TTL kort.

6. **Rätt till radering (GDPR):** `DELETE /whoop/disconnect` ska även radera rader i `whoop_snapshots` för userId.

7. **Retention policy:** Lägg till en Supabase Edge Function eller cron-job som raderar `whoop_snapshots` äldre än 90 dagar.

8. **Fixa N+1-queries i `getTeamSnapshots`:** Reskriv med en Supabase JOIN-query eller PostgreSQL-view.

9. **Sanitisera loggning:** Säkerställ att tokens aldrig loggas. Använd `[REDACTED]` vid loggning av headers.

### Fas 3 — Inom 1 månad

10. **GDPR-dokumentation:** Ta fram ett behandlingsregister (Art. 30) för WHOOP-biometrik. Lägg till tydligt samtyckessteg där användaren explicit godkänner teamvisning.

11. **Kryptera tokens at-rest (Supabase):** Implementera kolumnkryptering för `access_token` och `refresh_token` i `whoop_connections`.

12. **CSP-headers:** Implementera Content-Security-Policy på Cloudflare Pages för att minska XSS-ytan.

13. **Ta bort oanvänd scope:** Ta bort `read:body_measurement` och `read:workout` från OAuth-scope om data inte används i UI.

14. **Integrationtester:** Skriv tester som verifierar att: (a) admin kan nå `/whoop/team`, (b) vanlig användare inte kan, (c) token-substitution blockeras.

---

*Rapport genererad 2026-03-28 av Bernt (AI-säkerhetsanalys) · Wavult OS Red Team*
