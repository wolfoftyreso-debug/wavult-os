-- ═══════════════════════════════════════════════════════════════════════════
-- Learning & Knowledge Module — Seed Data
-- Kör EFTER att schema är skapat och minst en org + users finns
-- ═══════════════════════════════════════════════════════════════════════════

-- Hämta första org och users för seed
DO $$
DECLARE
  v_org_id   UUID;
  v_user1_id UUID;
  v_user2_id UUID;
  v_user3_id UUID;

  -- Playbook IDs
  pb1 UUID; pb2 UUID; pb3 UUID; pb4 UUID; pb5 UUID;
  pb6 UUID; pb7 UUID; pb8 UUID; pb9 UUID; pb10 UUID;

  -- Course IDs
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;

  -- Quiz IDs
  q1 UUID; q2 UUID; q3 UUID; q4 UUID; q5 UUID;

BEGIN
  -- Hämta IDs
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  SELECT id INTO v_user1_id FROM users ORDER BY created_at LIMIT 1;
  SELECT id INTO v_user2_id FROM users ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO v_user3_id FROM users ORDER BY created_at LIMIT 1 OFFSET 2;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Ingen organisation hittades — seed avbruten';
    RETURN;
  END IF;

  -- Fallback: använd user1 om user2/3 saknas
  IF v_user2_id IS NULL THEN v_user2_id := v_user1_id; END IF;
  IF v_user3_id IS NULL THEN v_user3_id := v_user1_id; END IF;

  -- ─── PLAYBOOKS ─────────────────────────────────────────────────────────

  INSERT INTO playbooks (id, org_id, title, description, category, status, version, created_by)
  VALUES
    (gen_random_uuid(), v_org_id, 'Onboarding ny medarbetare', 'Komplett guide för att välkomna och introducera nya teammedlemmar', 'onboarding', 'published', 2, v_user1_id) RETURNING id INTO pb1;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'Säljprocess — Inbound Lead', 'Steg-för-steg för att hantera och konvertera inkommande leads', 'sales', 'published', 1, v_user2_id) RETURNING id INTO pb2;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'ISO 9001 Intern audit', 'Genomförande av intern kvalitetsrevision enligt ISO 9001:2015', 'compliance', 'published', 3, v_user1_id) RETURNING id INTO pb3;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'Reklamationshantering', 'Process för att ta emot, utreda och åtgärda kundreklamationer', 'process', 'published', 1, v_user3_id) RETURNING id INTO pb4;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'IT-säkerhet och lösenordspolicy', 'Riktlinjer för IT-säkerhet, lösenord och datahantering', 'technical', 'published', 2, v_user1_id) RETURNING id INTO pb5;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'Offertskapning B2B', 'Hur vi skapar och skickar professionella offerter till B2B-kunder', 'sales', 'published', 1, v_user2_id) RETURNING id INTO pb6;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'GDPR-checklista', 'Hantering av personuppgifter enligt GDPR', 'compliance', 'published', 1, v_user1_id) RETURNING id INTO pb7;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'Leverantörsutvärdering', 'Systematisk bedömning och godkännande av nya leverantörer', 'process', 'published', 1, v_user3_id) RETURNING id INTO pb8;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'Driftsättning av ny funktion', 'Checklista för att driftsätta ny mjukvara i produktion', 'technical', 'draft', 1, v_user1_id) RETURNING id INTO pb9;

  INSERT INTO playbooks (org_id, title, description, category, status, version, created_by)
  VALUES (v_org_id, 'Månadsavstämning ekonomi', 'Steg för steg hur vi stänger månaden i bokföringen', 'process', 'published', 1, v_user2_id) RETURNING id INTO pb10;

  -- Playbook steps
  INSERT INTO playbook_steps (playbook_id, step_number, title, content, estimated_minutes, required) VALUES
    (pb1, 1, 'Välkomstmöte', '## Välkomstmöte\nBoka 1:1 med närmaste chef dag 1. Gå igenom:\n- Teamets uppdrag\n- Förväntningar första 30 dagarna\n- Introduktionsplan', 30, true),
    (pb1, 2, 'Kontoåtkomst', '## Kontoåtkomst\nSe till att medarbetaren har:\n- [ ] Google Workspace-konto\n- [ ] Hypbit-access\n- [ ] Slack/kommunikationsverktyg\n- [ ] VPN-uppkoppling', 15, true),
    (pb1, 3, 'Introduktion till processer', '## Processer\nGenomgång av de viktigaste processerna med processägare.', 60, true),
    (pb1, 4, 'Skugga erfaren kollega', '## Skuggning\nSpend en dag med en erfaren kollega och lär dig flödet i praktiken.', 240, false),
    (pb1, 5, 'Sätt mål för 30/60/90 dagar', '## 30-60-90 dagars plan\nDokumentera konkreta mål för de tre första månaderna.', 45, true),
    (pb2, 1, 'Kvalificera leadet', '## Kvalificering\nAnvänd BANT-modellen:\n- **B**udget — Har de budget?\n- **A**uthority — Pratar vi med rätt person?\n- **N**eed — Finns det ett verkligt behov?\n- **T**iming — När vill de agera?', 20, true),
    (pb2, 2, 'Discovery-samtal', '## Discovery\nStäll öppna frågor om:\n- Nuläge och utmaningar\n- Önskad framtid\n- Tidigare försök att lösa problemet', 45, true),
    (pb2, 3, 'Demo anpassa efter behov', '## Anpassad demo\nPresentera lösningen med fokus på deras specifika smärtpunkter.', 60, true),
    (pb2, 4, 'Skicka offert', '## Offert\nSkapa offert i systemet och skicka inom 24h efter mötet.', 30, true),
    (pb2, 5, 'Uppföljning', '## Uppföljning\nFölj upp senast 3 arbetsdagar efter offert. Dokumentera svar i CRM.', 15, true),
    (pb3, 1, 'Planering av revisionen', '## Planeringsprocess\nDefiniera scope, utse lead auditor och informera berörda processer. Minst 2 veckor i förväg.', 120, true),
    (pb3, 2, 'Granska dokumentation', '## Dokumentgranskning\nGå igenom processbeskrivningar, avvikelserapporter och föregående revisionsrapport.', 180, true),
    (pb3, 3, 'Genomför intervjuer', '## Intervjuer\nIntervjua processägare och operativ personal. Använd checklistor baserade på ISO 9001:2015.', 240, true),
    (pb3, 4, 'Dokumentera fynd', '## Fynd\nKlassificera fynd som: Major NC, Minor NC, Observation, eller Starka sidor.', 60, true),
    (pb3, 5, 'Stängmöte och rapport', '## Stängmöte\nPresentera fynd för ledningen. Leverera skriftlig rapport inom 5 arbetsdagar.', 90, true),
    (pb4, 1, 'Ta emot reklamation', '## Mottagning\nRegistrera reklamationen med: datum, kund, produkt/tjänst, beskrivning av avvikelse.', 10, true),
    (pb4, 2, 'Bekräfta mottagning', '## Kvittera\nSkicka bekräftelse till kund inom 24 timmar.', 5, true),
    (pb4, 3, 'Rota orsaksanalys', '## Rotorsak\nAnvänd 5-Varför eller Ishikawa för att identifiera grundorsaken.', 60, true),
    (pb4, 4, 'Åtgärd och beslut', '## Beslut\nBesluta om kompensation, korrigering eller återkoppling. Dokumentera beslut.', 30, true),
    (pb4, 5, 'Stäng och lär', '## Avslut\nKommunicera beslut till kund. Uppdatera NC-register. Dra lärdomar.', 20, true);

  -- ─── KNOWLEDGE ARTICLES ────────────────────────────────────────────────

  INSERT INTO knowledge_articles (org_id, title, content, category, tags, author_id, status) VALUES
    (v_org_id, 'Hur fungerar vårt CRM?', '# CRM-guide\n\nVårt CRM används för att hålla koll på kunder och leads.\n\n## Skapa ett nytt lead\n1. Klicka på "Ny kontakt"\n2. Fyll i namn, företag och e-post\n3. Välj pipeline-steg\n\n## Uppdatera deal-status\nDra kortet till rätt kolumn i Kanban-vyn.', 'system', ARRAY['crm', 'sälj', 'leads'], v_user1_id, 'published'),
    (v_org_id, 'IT-säkerhetspolicy — Sammanfattning', '# IT-säkerhetspolicy\n\n## Lösenordskrav\n- Minst 12 tecken\n- Kombinera bokstäver, siffror och specialtecken\n- Byt lösenord var 90:e dag\n\n## Tvåfaktorsautentisering\nAktivera 2FA på alla kritiska system.\n\n## Rapportera säkerhetsincidenter\nKontakta IT-ansvarig omedelbart vid misstänkt intrång.', 'security', ARRAY['it', 'säkerhet', 'gdpr'], v_user1_id, 'published'),
    (v_org_id, 'GDPR — Vad vi behöver veta', '# GDPR för Hypbit\n\n## Personuppgiftsansvarig\nHypbit är personuppgiftsansvarig för all data vi behandlar.\n\n## Laglig grund\nVi behandlar personuppgifter med stöd av:\n- Avtal\n- Samtycke\n- Berättigat intresse\n\n## Rätten att bli glömd\nKunder kan begära radering av sina uppgifter. Hantera sådana förfrågningar inom 30 dagar.', 'compliance', ARRAY['gdpr', 'juridik', 'personuppgifter'], v_user1_id, 'published'),
    (v_org_id, 'Faktureringsprocess', '# Fakturering\n\n## Skapa faktura\n1. Logga in i bokföringssystemet\n2. Välj kund\n3. Lägg till rader för tjänster\n4. Kontrollera moms och totalsumma\n5. Skicka till kund\n\n## Betalningspåminnelse\nSkicka påminnelse om fakturan är obetald 14 dagar efter förfall.', 'finance', ARRAY['faktura', 'ekonomi', 'redovisning'], v_user2_id, 'published'),
    (v_org_id, 'Onboarding-checklista för kund', '# Kundonboarding\n\n## Vecka 1\n- [ ] Kickoff-möte\n- [ ] Leverans av access-uppgifter\n- [ ] Introduktion till kontaktperson\n\n## Vecka 2-4\n- [ ] Träning i systemet\n- [ ] Första leverans\n- [ ] Uppföljningsmöte', 'process', ARRAY['onboarding', 'kund', 'cs'], v_user3_id, 'published'),
    (v_org_id, 'ISO 9001 — Nyckelbegrepp', '# ISO 9001:2015\n\n## Vad är ISO 9001?\nEn internationell standard för kvalitetsledningssystem.\n\n## Sju principer\n1. Kundfokus\n2. Ledarskap\n3. Medarbetarengagemang\n4. Processansats\n5. Förbättring\n6. Faktabaserade beslut\n7. Relationshantering', 'compliance', ARRAY['iso', 'kvalitet', 'standard'], v_user1_id, 'published'),
    (v_org_id, 'Prismodell och rabatter', '# Prissättning\n\n## Standardpris\nSe den aktuella prislistan i CRM-systemet.\n\n## Rabattnivåer\n- Årsavtal: 10%\n- Volym >5 tjänster: 15%\n- Strategisk partner: 20%\n\n## Godkännande av rabatt\nRabatter >20% kräver godkännande av CEO.', 'sales', ARRAY['pris', 'rabatt', 'sälj'], v_user2_id, 'published'),
    (v_org_id, 'Kommunikationspolicy', '# Kommunikationspolicy\n\n## Intern kommunikation\nAnvänd Hypbit-chattfunktionen för teamkommunikation.\n\n## E-post\nSvara på e-post inom 24 timmar under arbetsdagar.\n\n## Kunder\nBehåll professionell ton. Eskalera klagomål omedelbart.', 'hr', ARRAY['kommunikation', 'policy', 'team'], v_user1_id, 'published'),
    (v_org_id, 'Git-workflow och branching', '# Git-strategi\n\n## Branches\n- `main` — produktion, skyddad\n- `develop` — integration\n- `feature/*` — nya funktioner\n- `hotfix/*` — brådskande fixes\n\n## Pull Request\n1. Skapa PR mot `develop`\n2. Minst 1 godkännare krävs\n3. Alla CI-kontroller måste passera', 'technical', ARRAY['git', 'kod', 'workflow'], v_user1_id, 'published'),
    (v_org_id, 'Riskhanteringsramverk', '# Riskhantering\n\n## Riskmatris\nVi bedömer risker utifrån sannolikhet (1-5) × konsekvens (1-5).\n\n## Riskägare\nVarje risk tilldelas en ägare som ansvarar för hantering.\n\n## Granskning\nRiskregistret granskas kvartalsvis av ledningen.', 'compliance', ARRAY['risk', 'iso', 'ledning'], v_user1_id, 'published'),
    (v_org_id, 'Kompetensutvecklingsprocess', '# Kompetensutveckling\n\n## Identifiera gap\nAnvänd capability-matrisen i Hypbit för att se aktuella gap.\n\n## Skapa plan\n1. Definiera önskat läge\n2. Välj insatser (kurs, coaching, praktik)\n3. Sätt deadline\n\n## Uppföljning\nKolla in kvartalsvis mot planen.', 'hr', ARRAY['kompetensutveckling', 'lärande', 'hr'], v_user2_id, 'published'),
    (v_org_id, 'Supabase — Databasguide', '# Supabase för Hypbit\n\n## Uppbyggnad\nVi använder Supabase som primär databas och autentiseringslösning.\n\n## Tabeller\nSe `/sql`-mappen för samtliga scheman.\n\n## Migrations\nKör nya migrationer via `supabase db push` eller direkt i SQL-editorn.', 'technical', ARRAY['supabase', 'databas', 'backend'], v_user1_id, 'published'),
    (v_org_id, 'Avvikelsehantering — Snabbguide', '# Avvikelser\n\n## Vad är en avvikelse?\nNär något inte följer planerade rutiner eller krav.\n\n## Hur rapporterar jag?\n1. Gå till Avvikelser i Hypbit\n2. Klicka "Ny avvikelse"\n3. Beskriv vad som hänt\n4. Tilldela ansvarig\n\n## Stängning\nAvvikelsen stängs när rotorsak identifierats och åtgärd verifierats.', 'process', ARRAY['avvikelse', 'nc', 'kvalitet'], v_user3_id, 'published'),
    (v_org_id, 'Leverantörsgodkännande', '# Leverantörsgodkännande\n\n## Krav för godkännande\n- Ifyllt leverantörsformulär\n- Ekonomisk bakgrundskontroll\n- Teknisk kapacitetsbedömning\n- Referenscheck\n\n## Godkännandeprocess\nProcessen tar 5-10 arbetsdagar.', 'process', ARRAY['leverantör', 'inköp', 'process'], v_user2_id, 'published'),
    (v_org_id, 'AWS och Cloud-arkitektur', '# Cloud-arkitektur\n\n## Infrastruktur\n- Frontend: S3 + CloudFront\n- API: EC2 / Lambda\n- Databas: Supabase (PostgreSQL)\n\n## Säkerhet\n- IAM-roller med minsta möjliga behörighet\n- Krypterade S3-buckets\n- VPC för privat nätverkstrafik', 'technical', ARRAY['aws', 'cloud', 'infrastruktur'], v_user1_id, 'published'),
    (v_org_id, 'Mötespolicy', '# Mötespolicy\n\n## Principer\n- Inget möte utan agenda\n- Max 45 minuter som standard\n- Dokumentera beslut och actions direkt\n\n## Typer av möten\n- Daglig standup: 15 min\n- Sprintplanering: 2h\n- Retrospektiv: 1h\n- Ledningsgenomgång: 2h/kvartal', 'hr', ARRAY['möten', 'policy', 'kultur'], v_user2_id, 'published'),
    (v_org_id, 'Versionhantering av produkter', '# Versionshantering\n\n## Semantic Versioning\nVi följer SemVer: MAJOR.MINOR.PATCH\n\n## Releaseprocess\n1. Skapa release branch\n2. QA-test\n3. Godkännande\n4. Deploy till produktion\n5. Tagg i Git', 'technical', ARRAY['versionshantering', 'release', 'semver'], v_user1_id, 'published'),
    (v_org_id, 'Löneprocess och utlägg', '# Löner och utlägg\n\n## Lönekörning\nLöner betalas den 25:e varje månad.\n\n## Utlägg\nLämna in utlägg med kvitton senast den 15:e för att inkluderas i innevarande månads utbetalning.\n\n## Reseräkning\nAnvänd mallen i Google Drive.', 'finance', ARRAY['lön', 'utlägg', 'ekonomi'], v_user3_id, 'published'),
    (v_org_id, 'Produktroadmap — Hur vi planerar', '# Roadmap-process\n\n## Prioritering\nVi använder RICE-poäng: Reach × Impact × Confidence / Effort\n\n## Kvartalscykler\nVi planerar i kvartal med flexibla sprintar inuti.\n\n## Kommunikation\nRoadmap uppdateras månadsvis och delas med hela teamet.', 'process', ARRAY['roadmap', 'produkt', 'planering'], v_user1_id, 'published'),
    (v_org_id, 'Kundavtal — Vad gäller?', '# Kundavtal\n\n## Standardvillkor\nVåra standardvillkor inkluderar:\n- Betalningsvillkor: 30 dagar netto\n- Ansvarsbegränsning\n- Immateriella rättigheter\n\n## Avvikelser\nAlla avvikelser från standardvillkor kräver juridisk granskning.', 'compliance', ARRAY['avtal', 'juridik', 'kund'], v_user2_id, 'published');

  -- ─── COURSES ───────────────────────────────────────────────────────────

  INSERT INTO courses (id, org_id, title, description, duration_minutes, difficulty, required_for_roles, passing_score)
  VALUES (gen_random_uuid(), v_org_id, 'Grundkurs: Hypbit-plattformen', 'Lär dig använda Hypbit effektivt — dashboard, processer, avvikelser och rapporter.', 90, 'beginner', ARRAY['ALL'], 75) RETURNING id INTO c1;

  INSERT INTO courses (org_id, title, description, duration_minutes, difficulty, required_for_roles, passing_score)
  VALUES (v_org_id, 'ISO 9001 Grundläggande', 'Förstå kvalitetsledningssystem och ISO 9001:2015 för hela organisationen.', 120, 'intermediate', ARRAY['ALL'], 80) RETURNING id INTO c2;

  INSERT INTO courses (org_id, title, description, duration_minutes, difficulty, required_for_roles, passing_score)
  VALUES (v_org_id, 'Säljutbildning B2B', 'Kompletta säljtekniker för B2B — från prospektering till avslut.', 180, 'intermediate', ARRAY['SALES', 'CEO'], 80) RETURNING id INTO c3;

  INSERT INTO courses (org_id, title, description, duration_minutes, difficulty, required_for_roles, passing_score)
  VALUES (v_org_id, 'IT-säkerhet och GDPR', 'Cybersäkerhet, dataskydd och GDPR-efterlevnad för alla medarbetare.', 60, 'beginner', ARRAY['ALL'], 85) RETURNING id INTO c4;

  INSERT INTO courses (org_id, title, description, duration_minutes, difficulty, required_for_roles, passing_score)
  VALUES (v_org_id, 'Ledarskap och teamutveckling', 'Praktiska verktyg för att leda team, ge feedback och skapa engagemang.', 150, 'advanced', ARRAY['MANAGER', 'CEO'], 80) RETURNING id INTO c5;

  -- Course modules
  INSERT INTO course_modules (course_id, module_number, title, content_type, duration_minutes, content_text) VALUES
    (c1, 1, 'Introduktion till Hypbit', 'text', 15, '# Välkommen till Hypbit\n\nHypbit är ett integrerat verktyg för att driva och följa upp er organisation.\n\n## Vad du lär dig\n- Navigera i gränssnittet\n- Förstå huvudfunktionerna\n- Komma igång på 15 minuter'),
    (c1, 2, 'Dashboard och KPI:er', 'video', 20, '# Dashboard\n\nDashboarden ger dig en realtidsbild av organisationens hälsa.\n\n## KPI-kort\nVarje KPI-kort visar aktuellt värde, mål och trend.'),
    (c1, 3, 'Processer och avvikelser', 'text', 25, '# Processer\n\nProcessmodulen hjälper dig dokumentera och följa upp era affärsprocesser.\n\n## Avvikelserapportering\nNär något inte stämmer — rapportera det direkt i systemet.'),
    (c1, 4, 'Quiz: Hypbit-plattformen', 'quiz', 10, NULL),
    (c2, 1, 'Vad är ISO 9001?', 'text', 30, '# ISO 9001:2015\n\nISO 9001 är världens mest använda standard för kvalitetsledning.\n\n## Historik\nStandarden har funnits sedan 1987 och uppdaterats kontinuerligt.'),
    (c2, 2, 'De sju kvalitetsprinciperna', 'text', 30, '# Kvalitetsprinciper\n\n1. Kundfokus — Sätt kundens behov i centrum\n2. Ledarskap — Tydligt ledarskap skapar rätt kultur\n3. Medarbetarengagemang — Alla bidrar till kvalitet'),
    (c2, 3, 'Riskbaserat tänkande', 'text', 30, '# Risk & Möjlighet\n\nISO 9001:2015 kräver att organisationer tänker riskbaserat.\n\n## SWOT-analys\nIdentifiera styrkor, svagheter, möjligheter och hot.'),
    (c2, 4, 'Intern audit', 'playbook', 25, NULL),
    (c2, 5, 'Quiz: ISO 9001 Grunderna', 'quiz', 15, NULL),
    (c3, 1, 'Säljmentalitet och mindset', 'video', 30, '# Säljmentalitet\n\nFramgångsrika säljare fokuserar på att skapa värde, inte att sälja.'),
    (c3, 2, 'Prospektering och leadsgenerering', 'text', 40, '# Hitta rätt kunder\n\n## ICP — Ideal Customer Profile\nDefiniera din idealkund baserat på bransch, storlek och smärtpunkter.'),
    (c3, 3, 'Discovery och behovsanalys', 'text', 35, '# Discovery-samtal\n\nMålet är att förstå kundens situation djupare än kunden gör det själv.'),
    (c3, 4, 'Presentationsteknik och demo', 'video', 40, '# Säljpresentation\n\nEn bra demo fokuserar på kundens problem, inte produktens funktioner.'),
    (c3, 5, 'Quiz: Säljprocessen', 'quiz', 15, NULL),
    (c4, 1, 'Cybersäkerhetshot 2024', 'text', 20, '# Aktuella hot\n\n## Phishing\nFör att skydda dig: Klicka aldrig på misstänkta länkar. Verifiera avsändaren.'),
    (c4, 2, 'Lösenord och autentisering', 'text', 15, '# Lösenordssäkerhet\n\nAnvänd en lösenordshanterare. Aktivera 2FA på alla konton.'),
    (c4, 3, 'GDPR i praktiken', 'text', 15, '# GDPR\n\nVi behandlar personuppgifter med respekt och enligt lag.'),
    (c4, 4, 'Quiz: IT-säkerhet', 'quiz', 10, NULL),
    (c5, 1, 'Ledarskapsmodeller', 'text', 40, '# Ledarskapsmodeller\n\nSituationsanpassat ledarskap — anpassa din stil efter medarbetarens mognadsnivå.'),
    (c5, 2, 'Feedback och coachning', 'video', 35, '# Feedback\n\nSBI-modellen: Situation, Beteende, Inverkan — ett kraftfullt ramverk för feedback.'),
    (c5, 3, 'Teamdynamik och psykologisk trygghet', 'text', 40, '# Teamutveckling\n\nPsykologisk trygghet är grunden för ett högpresterande team.'),
    (c5, 4, 'Svåra samtal', 'text', 25, '# Svåra samtal\n\nUndvik dessa genom att vara tydlig tidigt. Anta positiv avsikt.'),
    (c5, 5, 'Quiz: Ledarskap', 'quiz', 10, NULL);

  -- ─── QUIZZES ───────────────────────────────────────────────────────────

  INSERT INTO quizzes (id, org_id, title, passing_score, time_limit_minutes, questions)
  VALUES (gen_random_uuid(), v_org_id, 'Quiz: Hypbit-plattformen', 75, 10, '[
    {"question": "Vad visar KPI-korten på dashboarden?", "options": ["Antal medarbetare", "Aktuellt värde, mål och trend", "Enbart ekonomi", "Projektlista"], "correct_index": 1, "explanation": "KPI-korten visar aktuellt värde, mål och trend för nyckeltal."},
    {"question": "Vad används avvikelsehanteringen till?", "options": ["Tidrapportering", "Att rapportera när något inte följer plan", "Lönehantering", "Kundkontakt"], "correct_index": 1, "explanation": "Avvikelser rapporteras när rutiner eller krav inte följs."},
    {"question": "Vad är PDCA?", "options": ["Plan-Do-Check-Act", "Price-Deal-Close-Archive", "Process-Data-Control-Audit", "None of the above"], "correct_index": 0, "explanation": "PDCA = Plan, Do, Check, Act — klassisk förbättringscykel."},
    {"question": "Var hittar du processbeskrivningar i Hypbit?", "options": ["Under Ekonomi", "Under Processer", "Under Mål", "Under Compliance"], "correct_index": 1, "explanation": "Processmodulen innehåller alla dokumenterade processer."},
    {"question": "Vad innebär ISO 9001?", "options": ["En IT-säkerhetsstandard", "En standard för kvalitetsledningssystem", "En redovisningsstandard", "En HR-certifiering"], "correct_index": 1, "explanation": "ISO 9001 är världens mest använda kvalitetsstandard."}
  ]') RETURNING id INTO q1;

  INSERT INTO quizzes (org_id, title, passing_score, time_limit_minutes, questions)
  VALUES (v_org_id, 'Quiz: ISO 9001 Grunderna', 80, 15, '[
    {"question": "Hur många kvalitetsprinciper finns i ISO 9001:2015?", "options": ["5", "6", "7", "8"], "correct_index": 2, "explanation": "ISO 9001:2015 bygger på sju kvalitetsprinciper."},
    {"question": "Vad är riskbaserat tänkande?", "options": ["Att undvika all risk", "Att identifiera och hantera risker proaktivt", "Att dokumentera historiska fel", "Att anlita en extern revisor"], "correct_index": 1, "explanation": "Riskbaserat tänkande innebär proaktiv identifiering och hantering av risker."},
    {"question": "Vad är syftet med en intern audit?", "options": ["Att kontrollera ekonomin", "Att verifiera att systemet fungerar som planerat", "Att utvärdera leverantörer", "Att anställa personal"], "correct_index": 1, "explanation": "Intern audit verifierar att kvalitetssystemet fungerar enligt plan."},
    {"question": "Vad kallas processen för kontinuerlig förbättring?", "options": ["BANT", "PDCA", "SWOT", "SCRUM"], "correct_index": 1, "explanation": "PDCA (Plan-Do-Check-Act) är cykeln för kontinuerlig förbättring."},
    {"question": "Vilket fokus är centralt i ISO 9001?", "options": ["Vinstmaximering", "Kundfokus", "Medarbetarförmåner", "Teknikutveckling"], "correct_index": 1, "explanation": "Kundfokus är den första och viktigaste av de sju principerna."},
    {"question": "Vad är en CAPA?", "options": ["Computer-Aided Process Automation", "Corrective and Preventive Action", "Customer And Partner Agreement", "Compliance Audit Preparation Activity"], "correct_index": 1, "explanation": "CAPA = Corrective and Preventive Action — åtgärder för att korrigera och förhindra återfall."}
  ]') RETURNING id INTO q2;

  INSERT INTO quizzes (org_id, title, passing_score, time_limit_minutes, questions)
  VALUES (v_org_id, 'Quiz: Säljprocessen', 80, 15, '[
    {"question": "Vad betyder BANT?", "options": ["Business, Activity, Network, Tactics", "Budget, Authority, Need, Timing", "Brand, Awareness, Negotiation, Transaction", "Basics, Analysis, Notes, Target"], "correct_index": 1, "explanation": "BANT är ett klassiskt kvalificeringsramverk: Budget, Authority, Need, Timing."},
    {"question": "Vad är en ICP?", "options": ["Integrated Customer Profile", "Ideal Customer Profile", "Internal Communication Protocol", "Invoice Control Process"], "correct_index": 1, "explanation": "ICP = Ideal Customer Profile — definitionen av er drömkund."},
    {"question": "Vad bör fokus vara i en säljdemo?", "options": ["Alla produktfunktioner", "Teknisk arkitektur", "Kundens specifika problem", "Priset"], "correct_index": 2, "explanation": "En framgångsrik demo fokuserar på att lösa kundens specifika problem."},
    {"question": "Inom hur lång tid bör du följa upp efter ett möte?", "options": ["En vecka", "En månad", "3 arbetsdagar", "Dagen efter"], "correct_index": 2, "explanation": "Best practice är uppföljning inom 3 arbetsdagar för att hålla momentum."},
    {"question": "Vad är discovery-samtalets syfte?", "options": ["Att presentera produkten", "Att förstå kundens situation och behov", "Att förhandla pris", "Att skriva avtal"], "correct_index": 1, "explanation": "Discovery handlar om att lyssna och förstå djupare än kunden själv gör."}
  ]') RETURNING id INTO q3;

  INSERT INTO quizzes (org_id, title, passing_score, time_limit_minutes, questions)
  VALUES (v_org_id, 'Quiz: IT-säkerhet', 85, 10, '[
    {"question": "Vad är phishing?", "options": ["En typ av virus", "Bedrägliga meddelanden för att stjäla uppgifter", "En databas-attack", "Ett nätverksprotokoll"], "correct_index": 1, "explanation": "Phishing är ett sätt att lura användare att lämna ut känslig information."},
    {"question": "Hur långt bör ett säkert lösenord vara?", "options": ["Minst 6 tecken", "Minst 8 tecken", "Minst 12 tecken", "Minst 4 tecken"], "correct_index": 2, "explanation": "Vi kräver minst 12 tecken för alla lösenord."},
    {"question": "Vad är tvåfaktorsautentisering (2FA)?", "options": ["Två lösenord", "En extra verifieringssteg utöver lösenordet", "Backup-inloggning", "Fingeravtrycksläsning"], "correct_index": 1, "explanation": "2FA lägger till ett extra säkerhetslager — vanligen en engångskod."},
    {"question": "Inom hur många dagar ska GDPR-incidenter rapporteras?", "options": ["72 timmar", "7 dagar", "30 dagar", "Ingen tidsgräns"], "correct_index": 0, "explanation": "GDPR kräver att dataintrång rapporteras till tillsynsmyndigheten inom 72 timmar."},
    {"question": "Vad ska du göra om du misstänker ett dataintrång?", "options": ["Ignorera det", "Kontakta IT-ansvarig omedelbart", "Byta lösenord själv", "Vänta och se"], "correct_index": 1, "explanation": "Kontakta alltid IT-ansvarig omedelbart vid misstänkt intrång."}
  ]') RETURNING id INTO q4;

  INSERT INTO quizzes (org_id, title, passing_score, time_limit_minutes, questions)
  VALUES (v_org_id, 'Quiz: Ledarskap', 80, 10, '[
    {"question": "Vad innebär situationsanpassat ledarskap?", "options": ["Att alltid vara auktoritär", "Att anpassa ledarstil efter medarbetarens mognad", "Att alltid delegera", "Att fokusera på resultat oavsett situation"], "correct_index": 1, "explanation": "Situationsanpassat ledarskap handlar om att matcha din stil med medarbetarens behov."},
    {"question": "Vad står SBI för i feedbackmodellen?", "options": ["Style, Behavior, Impact", "Situation, Behavior, Impact", "Strategy, Build, Implement", "Support, Balance, Improve"], "correct_index": 1, "explanation": "SBI = Situation, Beteende, Inverkan — ett kraftfullt ramverk för konstruktiv feedback."},
    {"question": "Vad är psykologisk trygghet?", "options": ["Att ha psykolog på plats", "Att kunna ta risker och vara sårbar utan rädsla för negativa konsekvenser", "Att undvika konflikter", "Att ha strikta regler"], "correct_index": 1, "explanation": "Psykologisk trygghet är grunden för innovation och höga prestationer i team."},
    {"question": "Vilket är det bästa sättet att undvika svåra samtal?", "options": ["Ignorera problem", "Vara tydlig tidigt och ge kontinuerlig feedback", "Skicka e-post istället", "Delegera till HR"], "correct_index": 1, "explanation": "Tydlighet och tidig feedback förhindrar att problem eskalerar."},
    {"question": "Vad karaktäriserar ett högpresterande team?", "options": ["Alla håller med varandra alltid", "Psykologisk trygghet, tillit och tydliga mål", "Hög omsättning av personal", "Hierarkisk struktur"], "correct_index": 1, "explanation": "Forskning visar att psykologisk trygghet, tillit och tydlighet driver högprestande team."}
  ]') RETURNING id INTO q5;

  -- Koppla quizmoduler till rätt quiz
  UPDATE course_modules SET content_id = q1 WHERE course_id = c1 AND content_type = 'quiz';
  UPDATE course_modules SET content_id = q2 WHERE course_id = c2 AND content_type = 'quiz';
  UPDATE course_modules SET content_id = q3 WHERE course_id = c3 AND content_type = 'quiz';
  UPDATE course_modules SET content_id = q4 WHERE course_id = c4 AND content_type = 'quiz';
  UPDATE course_modules SET content_id = q5 WHERE course_id = c5 AND content_type = 'quiz';

  -- ─── FRAMSTEG FÖR TESTANVÄNDARE ─────────────────────────────────────

  INSERT INTO learning_progress (user_id, org_id, content_type, content_id, status, score, completed_at, time_spent_minutes) VALUES
    (v_user1_id, v_org_id, 'course', c1, 'completed', 90, NOW() - INTERVAL '10 days', 85),
    (v_user1_id, v_org_id, 'course', c2, 'completed', 85, NOW() - INTERVAL '7 days', 115),
    (v_user1_id, v_org_id, 'course', c4, 'completed', 95, NOW() - INTERVAL '3 days', 58),
    (v_user1_id, v_org_id, 'quiz', q1, 'completed', 90, NOW() - INTERVAL '10 days', 8),
    (v_user1_id, v_org_id, 'quiz', q2, 'completed', 85, NOW() - INTERVAL '7 days', 12),
    (v_user1_id, v_org_id, 'playbook', pb1, 'completed', NULL, NOW() - INTERVAL '14 days', 45),
    (v_user1_id, v_org_id, 'playbook', pb3, 'completed', NULL, NOW() - INTERVAL '5 days', 90),
    (v_user2_id, v_org_id, 'course', c1, 'completed', 78, NOW() - INTERVAL '8 days', 92),
    (v_user2_id, v_org_id, 'course', c3, 'in_progress', NULL, NULL, 45),
    (v_user2_id, v_org_id, 'quiz', q1, 'completed', 78, NOW() - INTERVAL '8 days', 10),
    (v_user2_id, v_org_id, 'playbook', pb2, 'completed', NULL, NOW() - INTERVAL '6 days', 35),
    (v_user3_id, v_org_id, 'course', c1, 'in_progress', NULL, NULL, 30),
    (v_user3_id, v_org_id, 'course', c4, 'completed', 88, NOW() - INTERVAL '2 days', 60),
    (v_user3_id, v_org_id, 'playbook', pb4, 'completed', NULL, NOW() - INTERVAL '4 days', 25)
    ON CONFLICT (user_id, content_type, content_id) DO NOTHING;

  -- ─── EXTERNA CERTIFIERINGAR ─────────────────────────────────────────

  INSERT INTO external_certifications (user_id, org_id, name, issuer, issued_date, expiry_date, certificate_number) VALUES
    (v_user1_id, v_org_id, 'ISO 9001:2015 Lead Auditor', 'IRCA', '2023-06-15', '2026-06-15', 'IRCA-2023-LA-4821'),
    (v_user1_id, v_org_id, 'AWS Solutions Architect Associate', 'Amazon Web Services', '2024-02-20', '2027-02-20', 'AWS-SAA-C03-1234'),
    (v_user2_id, v_org_id, 'Certified Sales Professional', 'NASP', '2023-11-01', '2025-11-01', 'CSP-2023-8832'),
    (v_user3_id, v_org_id, 'GDPR Practitioner', 'IAPP', '2024-01-10', '2026-01-10', 'IAPP-GDPR-2024-001')
    ON CONFLICT DO NOTHING;

  -- ─── INTERNA CERTIFIKAT ─────────────────────────────────────────────

  INSERT INTO learning_certificates (user_id, org_id, course_id, expires_at, certificate_url) VALUES
    (v_user1_id, v_org_id, c1, NOW() + INTERVAL '2 years', 'https://api.bc.pixdrift.com/certificates/hypbit-platform.pdf'),
    (v_user1_id, v_org_id, c2, NOW() + INTERVAL '2 years', 'https://api.bc.pixdrift.com/certificates/iso9001-grundlaggande.pdf'),
    (v_user1_id, v_org_id, c4, NOW() + INTERVAL '1 year', 'https://api.bc.pixdrift.com/certificates/it-sakerhet.pdf'),
    (v_user2_id, v_org_id, c1, NOW() + INTERVAL '2 years', 'https://api.bc.pixdrift.com/certificates/hypbit-platform-user2.pdf'),
    (v_user3_id, v_org_id, c4, NOW() + INTERVAL '1 year', 'https://api.bc.pixdrift.com/certificates/it-sakerhet-user3.pdf')
    ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Learning seed data inserted successfully!';
END $$;
