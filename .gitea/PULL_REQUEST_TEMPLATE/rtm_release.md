# 🏭 RTM — Release to Manufacturing

> **VIKTIGT:** Denna PR är ett formellt RTM-ärende. Ingen merge sker utan att ALLA godkännanden är på plats.

## 📋 Releasebeskrivning
<!-- Beskriv vad som releaserats, varför och vilken version -->

**Release-tag:** v___
**Sprint/iteration:** ___
**Påverkade moduler:** ___

---

## ✅ RTM Checklista — OBLIGATORISK

### 1. ⚖️ Juridisk & Compliance-granskning — *Dennis Bjarnemark*
- [ ] Inga ändringar bryter mot GDPR Art. 5–32
- [ ] ISO 9001 / ISO 27001-kontroller ej försämrade
- [ ] Inga nya personuppgiftsbehandlingar utan RoPA-uppdatering
- [ ] NIS2-krav uppfyllda (om systemsäkerhet berörs)
- [ ] Avtal och DPA påverkas ej negativt
- [ ] **Godkänd av:** @dennis *(required)*

### 2. 💰 Ekonomisk Granskning — *Winston Bjarnemark*
- [ ] Driftskostnad påverkas ej oförväntat (AWS, API-kostnader etc.)
- [ ] Inga ändringar i prissättning/affärsmodell utan styrelsebeslut
- [ ] Ny infrastruktur/resurser budgeterade
- [ ] ROI och kostnadseffekter analyserade
- [ ] **Godkänd av:** @winston *(required)*

### 3. 🔧 Teknisk Granskning — *Johan Berglund*
- [ ] Arkitekturbeslut dokumenterade
- [ ] Säkerhetskonsekvenser analyserade
- [ ] Inga exponerade API-nycklar eller secrets
- [ ] Prestanda testad (inga regressioner)
- [ ] Rollback-plan finns
- [ ] TypeScript strict — inga `any` utan motivering
- [ ] **Godkänd av:** @johan *(required)*

### 4. 🎨 Design & UX-granskning
- [ ] Cream/beige designtema (#F5F0E8) följs konsekvent
- [ ] Ingen dark mode introducerad
- [ ] Responsiv på mobil och desktop
- [ ] Tillgänglighet kontrollerad
- [ ] Inga varumärkesbrott (zoomer, inte fotograf etc.)
- [ ] **Godkänd av:** @erik eller @dennis *(required)*

### 5. 👑 Chairman-godkännande — *Erik Svensson*
- [ ] Release stämmer med strategisk riktning
- [ ] GTM-sekvens respekteras (quiXzoom → Ads → LandveX)
- [ ] Kvalitetspolicyn (POL-001) uppfylls
- [ ] **Godkänd av:** @erik *(required)*

---

## 📊 Påverkan

| Område | Påverkas? | Kommentar |
|--------|-----------|-----------|
| GDPR/Persondata | Ja / Nej | |
| Ekonomisk modell | Ja / Nej | |
| Infrastrukturkostnad | Ja / Nej | |
| Säkerhet | Ja / Nej | |
| Design/varumärke | Ja / Nej | |
| quiXzoom-zoomers | Ja / Nej | |
| LandveX/kunder | Ja / Nej | |

---

## 📁 Dokumentation
- [ ] Changelog uppdaterad
- [ ] API-dokumentation uppdaterad (om endpoints ändrats)
- [ ] QMS implementation-text uppdaterad (om ISO-kontroller berörs)
- [ ] MEMORY.md / TOOLS.md uppdaterade (om arkitektur ändrats)

---

## 🔗 Kopplingar
- Relaterad CAPA: ___
- Relaterat OKR: ___
- Gitea issue: ___

---
*RTM-processen är en del av Wavult OS QMS (ISO 9001 kl. 8.3 + 8.5). Alla godkännanden loggas automatiskt i agent_action_log.*
