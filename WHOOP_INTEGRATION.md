# WHOOP Integration — Wavult OS

## Syfte
Wavult Group har WHOOP-armband till hela teamet. Integrationen ger:
- Individuell recovery/sömn/belastningsspårning per teammedlem
- Aggregerad teamvy för ledarskapet
- Underlag för att anpassa workload efter faktisk kapacitet

## Arkitektur
- Individuell OAuth2 per person — ingen delar credentials
- Data lagras i Supabase (whoop_connections + whoop_snapshots)
- Frontend: WHOOPConnect (individuell) + WHOOPTeamDashboard (team)

## Env vars
Lägg till i ECS task definition / `.env`:

```
WHOOP_CLIENT_ID=<din client id från developer.whoop.com>
WHOOP_CLIENT_SECRET=<din client secret>
WHOOP_REDIRECT_URI=https://os.wavult.com/whoop/callback
```

## SQL-schema
Kör mot Supabase (SQL Editor):

```sql
-- whoop_connections
CREATE TABLE IF NOT EXISTS whoop_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  whoop_user_id TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

-- whoop_snapshots
CREATE TABLE IF NOT EXISTS whoop_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_score NUMERIC,
  hrv NUMERIC,
  resting_hr NUMERIC,
  sleep_performance NUMERIC,
  sleep_hours NUMERIC,
  strain_score NUMERIC,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whoop_snapshots_user_id ON whoop_snapshots(user_id);
```

## Onboarding
WHOOP-steget är inbyggt i standardonboardingen (first-run tour, steg 9).
Separat "whoop-setup"-tour finns för att guida nya teammedlemmar.

## Endpoints
| Metod | Path | Beskrivning |
|-------|------|-------------|
| GET | /whoop/auth | Starta OAuth-flödet (redirect till WHOOP) |
| GET | /whoop/callback | Hantera OAuth callback, spara tokens |
| GET | /whoop/status | Är WHOOP kopplat för inloggad user? |
| GET | /whoop/me | Senaste recovery/sleep/strain för inloggad user |
| GET | /whoop/team | Hela teamets data (kräver admin/manager) |
| DELETE | /whoop/disconnect | Koppla bort WHOOP för inloggad user |

## WHOOP API-dokumentation
- Developer Portal: https://developer.whoop.com/
- OAuth2 auth URL: `https://api.prod.whoop.com/oauth/oauth2/auth`
- Token URL: `https://api.prod.whoop.com/oauth/oauth2/token`
- Scopes: `read:recovery read:sleep read:workout read:body_measurement offline`

## Recovery-färgkodning
| Färg | Score | Innebörd |
|------|-------|----------|
| 🔴 Röd | < 33% | Vila — anpassa workload |
| 🟡 Gul | 33–66% | Bevaka — undvik överbelastning |
| 🟢 Grön | > 66% | Redo — fullt kapacitet |

## Filer
### Backend
- `server/src/whoop/whoop-api.ts` — Express Router
- `server/src/whoop/whoop-client.ts` — WHOOP API-klient + token refresh
- `server/src/whoop/whoop-store.ts` — Supabase-operationer
- `server/src/config/env.ts` — WHOOP env-variabler tillagda
- `server/src/index.ts` — whoopRouter monterad på /whoop

### Frontend
- `apps/command-center/src/features/whoop/WHOOPConnect.tsx` — Individuell koppling
- `apps/command-center/src/features/whoop/WHOOPTeamDashboard.tsx` — Team-vy
- `apps/command-center/src/App.tsx` — Route /whoop tillagd
- `apps/command-center/src/shared/layout/Shell.tsx` — WHOOP i nav + breadcrumb
- `apps/command-center/src/shared/maturity/maturityModel.ts` — WHOOP registrerat (beta)
- `apps/command-center/src/features/onboarding/onboardingData.ts` — whoop-connect steg + whoop-setup tour
