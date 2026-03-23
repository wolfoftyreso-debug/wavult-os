# Hypbit OS v2 — Wavult Command Center

## Vad detta är
Hypbit är Wavult Groups interna enterprise-operativsystem.  
Inte ett SaaS-verktyg. Inte ett ERP. Wavults ryggmärg.

## Vad det gör
- Multi-entity management: kör quiXzoom, Optic Insights och Hypbit Tools som separata entiteter i ett system
- Multi-jurisdiction compliance: Texas LLC, Litauisk UAB, Dubai Holding med rätt lagar och regler automatiskt
- Financial core: transaktioner, multi-currency, intercompany flows, VAT per jurisdiktion
- Identity & access: roller, permissions, audit log per entitet
- Operational modules: personal, kontrakt, handel, kommunikation — allt kopplade mot entity core

## Arkitektur

### Tre fundament (oförändras aldrig)
1. **Entity Core** — bolag, jurisdiktioner, roller, permissions
2. **Ledger Core** — konton, transaktioner, valutor, intercompany clearing
3. **Identity Core** — användare, åtkomst, audit log

### Moduler (växer in i systemet)
- HR & People OS
- Contract & Legal
- Financial Reporting
- Commerce & Billing
- Brand & Communications
- Software & Integrations

## Entiteter (Wavult Group)

| Entitet | Typ | Jurisdiktion | Syfte |
|---------|-----|-------------|-------|
| Wavult Group Holding | Holding | AE-DIFC | Moderbolag, kapitalstruktur |
| Wavult Technologies LLC | Operating | US-TX | quiXzoom-plattformen |
| Wavult Intelligence UAB | Operating | LT | Optic Insights Group |

## Design-principer
- **Config over code**: jurisdiktionsregler i databasen, inte i koden
- **Tenant isolation**: varje entitet är sin egen tenant med RLS
- **Audit everything**: oföränderlig logg på allt som händer
- **API-first**: allt exponeras som REST, inget lockat i UI

## Teknisk stack
- Backend: Node.js/TypeScript, Express
- Database: Supabase (PostgreSQL) med RLS
- Design system: Wavult EDOS v1 (React/Tailwind/shadcn)
- Deploy: AWS ECS (eu-north-1)
- Monorepo: Turborepo

## Roadmap
- **v2.0** (nu): Entity Core + Command Center UI + Jurisdiction middleware
- **v2.1** (Q2 2026): Ledger Core + multi-currency transactions
- **v2.2** (Q3 2026): Compliance Layer + VAT reporting per jurisdiktion
- **v2.3** (Q4 2026): Payment Rails (Revolut API → egen processor)
