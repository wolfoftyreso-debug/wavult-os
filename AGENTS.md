
---

## PRODUKTIONSLÅS — LÅST 2026-03-29

**ABSOLUTA REGLER SOM ALDRIG FÅR BRYTAS:**

1. **Aldrig mockdata.** Om data inte finns — visa tomt state med tydligt meddelande. Aldrig fabricera data.
2. **Aldrig demo-komponenter.** Allt som byggs ska vara kopplat mot riktiga backends (Supabase, API, ECS).
3. **Aldrig "stub" eller "TODO: connect to real API".** Bygg rätt från start eller bygg inte alls.
4. **Aldrig "provisorisk lösning".** Det finns inga temporära lösningar — bara rätt lösningar och saker som inte är byggda ännu.
5. **Aldrig "lägger till detta senare".** Antingen byggs det komplett nu, eller så byggs det inte.
6. **Aldrig kommentarer som "// mock", "// demo", "// placeholder", "// TODO real data".**
7. **Enterprise-standard på allt.** Varje komponent, varje endpoint, varje UI ska hålla produktionskvalitet.

**Denna regel gäller retroaktivt** — all befintlig mockdata och alla stubs ska aktivt identifieras och ersättas med riktiga implementationer.

**Signerat av:** Erik Svensson, CEO Wavult Group — 2026-03-29
