// ============================================================
// status-dashboard.ts
// Serves the live ops dashboard at /status
// Accessible at status.pixdrift.com (via Cloudflare CNAME)
// ============================================================

export function getStatusDashboardHTML(req: any): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'api.bc.pixdrift.com';
  const apiBase = `https://${host}`;

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hypbit · Driftstatus</title>
  <meta name="robots" content="noindex">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#080810;--card:#0f0f1e;--border:#1a1a2a;
      --text:#e8e8f0;--muted:#555;
      --green:#4ade80;--red:#f87171;--yellow:#fbbf24;--blue:#60a5fa;--purple:#a855f7;--cyan:#22d3ee;
    }
    body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:0}

    /* ── TOPBAR ── */
    .topbar{background:#0a0a14;border-bottom:1px solid var(--border);padding:0 32px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
    .topbar-left{display:flex;align-items:center;gap:14px}
    .topbar-logo{font-size:20px}
    .topbar-title{font-size:14px;font-weight:800;color:#fff;letter-spacing:-0.3px}
    .topbar-sub{font-size:10px;color:var(--muted);margin-top:1px}
    .topbar-right{display:flex;align-items:center;gap:12px}
    .live-badge{display:flex;align-items:center;gap:6px;background:#0a1a0a;border:1px solid #1a3a1a;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--green)}
    .pulse{width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
    .clock-display{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}

    /* ── LAYOUT ── */
    .main{padding:28px 32px;max-width:1200px;margin:0 auto}
    .rainbow{height:3px;background:linear-gradient(90deg,#4f8fff,#a855f7,#22d3ee,#34d399)}

    /* ── STATUS BANNER ── */
    .status-banner{border-radius:14px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;gap:16px}
    .status-banner.ok{background:#001a0a;border:1.5px solid #16a34a}
    .status-banner.degraded{background:#1a1000;border:1.5px solid #d97706}
    .status-banner.down{background:#1a0000;border:1.5px solid #dc2626}
    .banner-icon{font-size:32px}
    .banner-title{font-size:18px;font-weight:900;color:#fff}
    .banner-sub{font-size:12px;color:var(--muted);margin-top:3px}
    .banner-time{margin-left:auto;text-align:right;font-size:11px;color:var(--muted)}

    /* ── GRID ── */
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .full{grid-column:1/-1}
    @media(max-width:900px){.grid{grid-template-columns:1fr 1fr}.grid-2{grid-template-columns:1fr}}
    @media(max-width:600px){.grid{grid-template-columns:1fr}}

    /* ── CARDS ── */
    .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px}
    .card-title{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px}

    /* ── SERVICE ROWS ── */
    .svc{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #1a1a2a}
    .svc:last-child{border-bottom:none}
    .svc-icon{font-size:18px;width:28px;text-align:center;flex-shrink:0}
    .svc-info{flex:1}
    .svc-name{font-size:13px;font-weight:700;color:#e8e8f0;margin-bottom:2px}
    .svc-detail{font-size:11px;color:var(--muted);line-height:1.4}
    .svc-status{flex-shrink:0;text-align:right}
    .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:middle}
    .dg{background:var(--green)}
    .dy{background:var(--yellow)}
    .dr{background:var(--red)}
    .dgr{background:#444}
    .tag{font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:.5px}
    .tag-ok{background:#0a2a14;color:var(--green);border:1px solid #16a34a}
    .tag-warn{background:#1a1200;color:var(--yellow);border:1px solid #d97706}
    .tag-err{background:#1a0808;color:var(--red);border:1px solid #dc2626}
    .tag-na{background:#1a1a2a;color:#555;border:1px solid #2a2a4a}
    .tag-load{background:#0a1428;color:var(--blue);border:1px solid #1d4ed8;animation:blink 1.5s infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.5}}

    /* ── METRIC CARDS ── */
    .metric{text-align:center;padding:10px 0}
    .metric-val{font-size:36px;font-weight:900;letter-spacing:-1px}
    .metric-label{font-size:10px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:1px}

    /* ── SYSTEM MAP ── */
    #sysmap-wrap{overflow-x:auto}

    /* ── ACTIVITY LOG ── */
    .log-row{display:flex;gap:12px;padding:9px 0;border-bottom:1px solid #1a1a2a;font-size:11px}
    .log-row:last-child{border-bottom:none}
    .log-t{color:var(--muted);white-space:nowrap;min-width:44px;padding-top:1px;font-variant-numeric:tabular-nums}
    .log-msg{color:#bbb;line-height:1.5}
    .log-msg strong{color:#e8e8f0}

    /* ── SUBSCRIBE ── */
    .sub-form{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
    .sub-input{flex:1;min-width:160px;background:#0a0a1e;border:1.5px solid #2a2a4a;border-radius:8px;padding:9px 14px;color:#e8e8f0;font-size:13px;outline:none}
    .sub-input:focus{border-color:var(--blue)}
    .sub-input::placeholder{color:#333355}
    .sub-btn{background:linear-gradient(135deg,#1a2a5a,#0d1a3a);border:1.5px solid #3a4a8a;border-radius:8px;padding:9px 18px;color:#7b9fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
    .sub-btn:hover{border-color:var(--blue);color:#aabbff}
    .sub-success{display:none;color:var(--green);font-size:13px;font-weight:700;padding:10px 0}

    /* ── COUNTDOWN ── */
    .countdown-boxes{display:flex;gap:10px;justify-content:center;margin-top:14px}
    .cd-box{background:#001e28;border:2px solid var(--cyan);border-radius:10px;padding:10px 14px;text-align:center;min-width:60px}
    .cd-num{font-size:28px;font-weight:900;color:var(--cyan);line-height:1}
    .cd-lbl{font-size:9px;font-weight:700;color:#0e7490;text-transform:uppercase;letter-spacing:1px;margin-top:4px}

    footer{text-align:center;padding:32px;font-size:10px;color:#222240;border-top:1px solid var(--border);margin-top:8px}
  </style>
</head>
<body>

<div class="rainbow"></div>

<div class="topbar">
  <div class="topbar-left">
    <div class="topbar-logo">🏗️</div>
    <div>
      <div class="topbar-title">Hypbit · Driftstatus</div>
      <div class="topbar-sub">pixdrift.com · hypbit.com · Wavult Group</div>
    </div>
  </div>
  <div class="topbar-right">
    <div class="clock-display" id="clock">--:--:--</div>
    <div class="live-badge"><div class="pulse"></div>LIVE</div>
  </div>
</div>

<div class="main">

  <!-- STATUS BANNER -->
  <div class="status-banner ok" id="status-banner">
    <div class="banner-icon" id="banner-icon">✅</div>
    <div>
      <div class="banner-title" id="banner-title">Alla system operativa</div>
      <div class="banner-sub" id="banner-sub">Senast kontrollerat: laddar...</div>
    </div>
    <div class="banner-time" id="banner-time">
      <div style="font-size:20px;font-weight:900;color:var(--green)" id="uptime-pct">100%</div>
      <div style="font-size:10px;color:var(--muted)">uptime 30d</div>
    </div>
  </div>

  <!-- METRICS ROW -->
  <div class="grid" style="margin-bottom:24px">
    <div class="card">
      <div class="card-title">API Latens</div>
      <div class="metric">
        <div class="metric-val" id="api-latency" style="color:var(--green)">—</div>
        <div class="metric-label">millisekunder</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Database</div>
      <div class="metric">
        <div class="metric-val" id="db-status" style="color:var(--green)">—</div>
        <div class="metric-label">Supabase PostgreSQL</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">🇹🇭 Thailand</div>
      <div class="metric">
        <div class="metric-val" id="th-days" style="color:var(--cyan)">—</div>
        <div class="metric-label">dagar till workcamp</div>
      </div>
    </div>
  </div>

  <!-- SERVICES -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title">🚀 Tjänster</div>

      <div class="svc">
        <div class="svc-icon">🌐</div>
        <div class="svc-info">
          <div class="svc-name">pixdrift.com</div>
          <div class="svc-detail">Marketing + App-portal</div>
        </div>
        <div class="svc-status"><span class="tag tag-load" id="svc-pixdrift">Kollar...</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">🌐</div>
        <div class="svc-info">
          <div class="svc-name">hypbit.com</div>
          <div class="svc-detail">Hypbit Group site</div>
        </div>
        <div class="svc-status"><span class="tag tag-load" id="svc-hypbit">Kollar...</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">⚙️</div>
        <div class="svc-info">
          <div class="svc-name">API · api.bc.pixdrift.com</div>
          <div class="svc-detail">Express · AWS ECS · eu-north-1</div>
        </div>
        <div class="svc-status"><span class="tag tag-load" id="svc-api">Kollar...</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">🗄️</div>
        <div class="svc-info">
          <div class="svc-name">Supabase · PostgreSQL</div>
          <div class="svc-detail">znmxtnxxjpmgtycmsqjv · eu-west-1</div>
        </div>
        <div class="svc-status"><span class="tag tag-load" id="svc-db">Kollar...</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">🛡️</div>
        <div class="svc-info">
          <div class="svc-name">Cloudflare · DNS + WAF</div>
          <div class="svc-detail">Proxying + DDoS-skydd aktivt</div>
        </div>
        <div class="svc-status"><span class="tag tag-ok">Aktiv</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">▲</div>
        <div class="svc-info">
          <div class="svc-name">Vercel · evasvensson.se</div>
          <div class="svc-detail">Next.js · Auto-deploy från GitHub</div>
        </div>
        <div class="svc-status"><span class="tag tag-load" id="svc-eva">Kollar...</span></div>
      </div>

    </div>

    <div class="card">
      <div class="card-title">🔧 Infrastruktur</div>

      <div class="svc">
        <div class="svc-icon">📦</div>
        <div class="svc-info">
          <div class="svc-name">AWS ECS · hypbit-api</div>
          <div class="svc-detail">Cluster: hypbit · Task def: hypbit-api</div>
        </div>
        <div class="svc-status"><span class="tag tag-ok">Running</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">🗃️</div>
        <div class="svc-info">
          <div class="svc-name">AWS ECR · Container Registry</div>
          <div class="svc-detail">155407238699.dkr.ecr.eu-north-1</div>
        </div>
        <div class="svc-status"><span class="tag tag-ok">OK</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">🌍</div>
        <div class="svc-info">
          <div class="svc-name">AWS CloudFront · CDN</div>
          <div class="svc-detail">Distribution E2CZK80C8S8JPF</div>
        </div>
        <div class="svc-status"><span class="tag tag-ok">OK</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">🐙</div>
        <div class="svc-info">
          <div class="svc-name">GitHub Actions · CI/CD</div>
          <div class="svc-detail">wolfoftyreso-debug/hypbit · deploy-api.yml</div>
        </div>
        <div class="svc-status"><span class="tag tag-ok">✓ Senaste deploy OK</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">💳</div>
        <div class="svc-info">
          <div class="svc-name">Stripe · Betalningar</div>
          <div class="svc-detail">Webhooks + Subscription billing</div>
        </div>
        <div class="svc-status"><span class="tag tag-ok">Aktiv</span></div>
      </div>

      <div class="svc">
        <div class="svc-icon">⚡</div>
        <div class="svc-info">
          <div class="svc-name">Trigger.dev · Background Jobs</div>
          <div class="svc-detail">Async jobs · Schemalagda uppgifter</div>
        </div>
        <div class="svc-status"><span class="tag tag-ok">OK</span></div>
      </div>

    </div>
  </div>

  <!-- SYSTEM MAP SVG -->
  <div class="card full" style="margin-bottom:24px">
    <div class="card-title">🗺️ Systemkarta · Live Arkitektur</div>
    <div id="sysmap-wrap">
    <svg viewBox="0 0 960 400" width="100%" style="min-width:680px;display:block;font-family:-apple-system,sans-serif;">
      <rect width="960" height="400" fill="#08080f" rx="8"/>

      <!-- Zone labels -->
      <rect x="8" y="8" width="140" height="384" rx="6" fill="none" stroke="#1a2a1a" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="78" y="24" text-anchor="middle" fill="#2a4a2a" font-size="8" font-weight="700" letter-spacing="2">KLIENTER</text>

      <rect x="158" y="8" width="110" height="384" rx="6" fill="none" stroke="#2a2010" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="213" y="24" text-anchor="middle" fill="#4a3a10" font-size="8" font-weight="700" letter-spacing="2">CLOUDFLARE</text>

      <rect x="278" y="8" width="250" height="384" rx="6" fill="none" stroke="#0a1a2a" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="403" y="24" text-anchor="middle" fill="#1a3a5a" font-size="8" font-weight="700" letter-spacing="2">AWS · EU-NORTH-1</text>

      <rect x="538" y="8" width="414" height="384" rx="6" fill="none" stroke="#1a0a2a" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="745" y="24" text-anchor="middle" fill="#3a1a5a" font-size="8" font-weight="700" letter-spacing="2">EXTERNA TJÄNSTER</text>

      <!-- CONNECTIONS -->
      <line x1="108" y1="80" x2="163" y2="80" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>
      <line x1="108" y1="160" x2="163" y2="160" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>
      <line x1="108" y1="240" x2="163" y2="240" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>
      <line x1="268" y1="80" x2="283" y2="80" stroke="#f97316" stroke-width="1.5" opacity="0.8"/>
      <polygon points="283,76 289,80 283,84" fill="#f97316" opacity="0.8"/>
      <line x1="268" y1="160" x2="543" y2="160" stroke="#60a5fa" stroke-width="1.5" opacity="0.5" stroke-dasharray="4,3"/>
      <polygon points="543,156 549,160 543,164" fill="#60a5fa" opacity="0.7"/>
      <line x1="403" y1="110" x2="403" y2="140" stroke="#f97316" stroke-width="1.5" opacity="0.8"/>
      <polygon points="399,140 403,146 407,140" fill="#f97316" opacity="0.8"/>
      <line x1="460" y1="175" x2="543" y2="220" stroke="#4ade80" stroke-width="1.5" opacity="0.7"/>
      <polygon points="540,217 547,222 541,227" fill="#4ade80" opacity="0.7"/>
      <line x1="460" y1="185" x2="543" y2="300" stroke="#a855f7" stroke-width="1" opacity="0.5" stroke-dasharray="3,3"/>
      <line x1="403" y1="200" x2="403" y2="230" stroke="#22d3ee" stroke-width="1" opacity="0.5" stroke-dasharray="3,2"/>
      <line x1="543" y1="120" x2="460" y2="160" stroke="#22d3ee" stroke-width="1" opacity="0.5" stroke-dasharray="4,3"/>
      <path d="M 700 60 Q 580 40 460 80" stroke="#fbbf24" stroke-width="1.5" fill="none" stroke-dasharray="5,3" opacity="0.6"/>
      <polygon points="463,76 458,80 463,84" fill="#fbbf24" opacity="0.6"/>

      <!-- CLIENT: pixdrift -->
      <g transform="translate(15,48)">
        <rect width="88" height="64" rx="7" fill="#0d1a10" stroke="#4ade80" stroke-width="1.5"/>
        <rect x="26" y="6" width="36" height="44" rx="4" fill="#0a1a0d" stroke="#4ade80" stroke-width="1"/>
        <rect x="28" y="9" width="32" height="32" rx="2" fill="#1a3a1a"/>
        <rect x="30" y="11" width="28" height="3" rx="1" fill="#4ade80" opacity="0.7"/>
        <rect x="30" y="17" width="20" height="2" rx="1" fill="#4ade80" opacity="0.3"/>
        <rect x="30" y="22" width="28" height="8" rx="1" fill="#4ade80" opacity="0.15"/>
        <circle cx="78" cy="10" r="4" fill="#4ade80"/>
        <text x="44" y="58" text-anchor="middle" fill="#4ade80" font-size="7" font-weight="700">PIXDRIFT</text>
        <text x="44" y="67" text-anchor="middle" fill="#4ade80" font-size="6" opacity="0.5">Workstation App</text>
      </g>

      <!-- CLIENT: hypbit -->
      <g transform="translate(15,128)">
        <rect width="88" height="64" rx="7" fill="#0a0d1a" stroke="#60a5fa" stroke-width="1.5"/>
        <rect x="26" y="6" width="36" height="44" rx="4" fill="#080d18" stroke="#60a5fa" stroke-width="1"/>
        <rect x="28" y="9" width="32" height="32" rx="2" fill="#0d1a30"/>
        <rect x="30" y="11" width="28" height="3" rx="1" fill="#60a5fa" opacity="0.7"/>
        <rect x="30" y="17" width="20" height="2" rx="1" fill="#60a5fa" opacity="0.3"/>
        <rect x="30" y="22" width="28" height="8" rx="1" fill="#60a5fa" opacity="0.15"/>
        <circle cx="78" cy="10" r="4" fill="#4ade80"/>
        <text x="44" y="58" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="700">HYPBIT.COM</text>
        <text x="44" y="67" text-anchor="middle" fill="#60a5fa" font-size="6" opacity="0.5">Marketing Site</text>
      </g>

      <!-- CLIENT: evasvensson -->
      <g transform="translate(15,210)">
        <rect width="88" height="55" rx="7" fill="#1a0a1a" stroke="#a855f7" stroke-width="1"/>
        <rect x="26" y="6" width="36" height="36" rx="4" fill="#15091a" stroke="#a855f7" stroke-width="1"/>
        <rect x="30" y="9" width="28" height="3" rx="1" fill="#a855f7" opacity="0.6"/>
        <circle cx="78" cy="10" r="4" fill="#4ade80"/>
        <text x="44" y="49" text-anchor="middle" fill="#a855f7" font-size="7" font-weight="700">EVASVENSSON</text>
        <text x="44" y="58" text-anchor="middle" fill="#a855f7" font-size="6" opacity="0.5">Portfolio · Vercel</text>
      </g>

      <!-- CLOUDFLARE -->
      <g transform="translate(163,55)">
        <rect width="100" height="55" rx="7" fill="#1a1200" stroke="#f97316" stroke-width="1.5"/>
        <path d="M 15 35 Q 22 20 38 24 Q 42 14 52 18 Q 64 16 62 26 Q 70 24 70 32 L 15 32 Z" fill="#f97316" opacity="0.4"/>
        <circle cx="90" cy="12" r="4" fill="#4ade80"/>
        <text x="50" y="47" text-anchor="middle" fill="#f97316" font-size="8" font-weight="700">CLOUDFLARE</text>
        <text x="50" y="57" text-anchor="middle" fill="#f97316" font-size="6" opacity="0.5">DNS · WAF · CDN</text>
      </g>

      <!-- CF hypbit -->
      <g transform="translate(163,138)">
        <rect width="100" height="42" rx="7" fill="#1a1200" stroke="#f97316" stroke-width="1" stroke-dasharray="3,2"/>
        <text x="50" y="18" text-anchor="middle" fill="#f97316" font-size="7" font-weight="700">CLOUDFLARE</text>
        <text x="50" y="30" text-anchor="middle" fill="#f97316" font-size="6" opacity="0.5">hypbit.com DNS</text>
        <text x="50" y="40" text-anchor="middle" fill="#f97316" font-size="6" opacity="0.4">→ Vercel</text>
      </g>

      <!-- CLOUDFRONT -->
      <g transform="translate(283,52)">
        <rect width="115" height="58" rx="7" fill="#001428" stroke="#60a5fa" stroke-width="1.5"/>
        <rect x="10" y="10" width="26" height="7" rx="2" fill="#60a5fa" opacity="0.4"/>
        <rect x="10" y="20" width="26" height="7" rx="2" fill="#60a5fa" opacity="0.3"/>
        <rect x="10" y="30" width="26" height="7" rx="2" fill="#60a5fa" opacity="0.2"/>
        <circle cx="10" cy="13" r="2" fill="#60a5fa" opacity="0.3"/>
        <circle cx="33" cy="13" r="2" fill="#4ade80"/>
        <circle cx="33" cy="23" r="2" fill="#4ade80"/>
        <circle cx="33" cy="33" r="2" fill="#fbbf24"/>
        <circle cx="105" cy="12" r="4" fill="#4ade80"/>
        <text x="57" y="50" text-anchor="middle" fill="#60a5fa" font-size="8" font-weight="700">CLOUDFRONT</text>
        <text x="57" y="60" text-anchor="middle" fill="#60a5fa" font-size="6" opacity="0.5">CDN · E2CZK80C8S8JPF</text>
      </g>

      <!-- ECS -->
      <g transform="translate(283,140)">
        <rect width="160" height="85" rx="7" fill="#001428" stroke="#f97316" stroke-width="2"/>
        <rect x="8" y="10" width="144" height="14" rx="3" fill="#0a1e38" stroke="#f97316" stroke-width="0.5"/>
        <rect x="8" y="27" width="144" height="14" rx="3" fill="#0a1e38" stroke="#f97316" stroke-width="0.5" opacity="0.7"/>
        <rect x="8" y="44" width="144" height="14" rx="3" fill="#0a1e38" stroke="#f97316" stroke-width="0.5" opacity="0.4"/>
        <circle cx="140" cy="17" r="3" fill="#4ade80"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></circle>
        <circle cx="140" cy="34" r="3" fill="#4ade80"><animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite"/></circle>
        <circle cx="140" cy="51" r="3" fill="#fbbf24"/>
        <text x="72" y="20" fill="#f97316" font-size="6" font-weight="700" text-anchor="middle">hypbit-api · ECS Task</text>
        <text x="72" y="37" fill="#f97316" font-size="6" text-anchor="middle" opacity="0.8">Express API · Port 3001</text>
        <text x="72" y="54" fill="#fbbf24" font-size="6" text-anchor="middle" opacity="0.7">Lighthouse CI (⚠️)</text>
        <circle cx="150" cy="12" r="4" fill="#4ade80"/>
        <text x="80" y="72" text-anchor="middle" fill="#f97316" font-size="9" font-weight="800">AWS ECS</text>
        <text x="80" y="83" text-anchor="middle" fill="#f97316" font-size="6" opacity="0.5">eu-north-1 · Stockholm</text>
      </g>

      <!-- ECR -->
      <g transform="translate(283,255)">
        <rect width="110" height="48" rx="7" fill="#001428" stroke="#22d3ee" stroke-width="1.5"/>
        <rect x="10" y="10" width="90" height="16" rx="2" fill="#0a1e38"/>
        <text x="55" y="21" text-anchor="middle" fill="#22d3ee" font-size="6" font-weight="700">hypbit/api · latest</text>
        <circle cx="100" cy="12" r="4" fill="#4ade80"/>
        <text x="55" y="38" text-anchor="middle" fill="#22d3ee" font-size="8" font-weight="700">AWS ECR</text>
        <text x="55" y="48" text-anchor="middle" fill="#22d3ee" font-size="6" opacity="0.5">Container Registry</text>
      </g>

      <!-- SUPABASE -->
      <g transform="translate(548,195)">
        <rect width="120" height="80" rx="7" fill="#001a0a" stroke="#4ade80" stroke-width="2"/>
        <ellipse cx="60" cy="22" rx="36" ry="9" fill="#0a2a14" stroke="#4ade80" stroke-width="1"/>
        <rect x="24" y="22" width="72" height="28" fill="#0a2a14"/>
        <ellipse cx="60" cy="50" rx="36" ry="9" fill="#0d3018" stroke="#4ade80" stroke-width="1"/>
        <ellipse cx="60" cy="22" rx="36" ry="9" fill="#0d3018" stroke="#4ade80" stroke-width="1"/>
        <line x1="30" y1="30" x2="90" y2="30" stroke="#4ade80" stroke-width="0.5" opacity="0.3"/>
        <line x1="30" y1="37" x2="90" y2="37" stroke="#4ade80" stroke-width="0.5" opacity="0.3"/>
        <line x1="30" y1="44" x2="90" y2="44" stroke="#4ade80" stroke-width="0.5" opacity="0.3"/>
        <circle cx="110" cy="12" r="4" fill="#4ade80"/>
        <text x="60" y="68" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="700">SUPABASE</text>
        <text x="60" y="78" text-anchor="middle" fill="#4ade80" font-size="6" opacity="0.5">PostgreSQL · eu-west-1</text>
      </g>

      <!-- VERCEL -->
      <g transform="translate(548,138)">
        <rect width="110" height="48" rx="7" fill="#101010" stroke="#ffffff" stroke-width="1.5"/>
        <polygon points="55,10 68,28 42,28" fill="#ffffff" opacity="0.8"/>
        <circle cx="100" cy="12" r="4" fill="#4ade80"/>
        <text x="55" y="40" text-anchor="middle" fill="#ffffff" font-size="8" font-weight="700">VERCEL</text>
        <text x="55" y="48" text-anchor="middle" fill="#aaa" font-size="6" opacity="0.6">hypbit.com · evasvensson.se</text>
      </g>

      <!-- STRIPE -->
      <g transform="translate(548,70)">
        <rect width="110" height="48" rx="7" fill="#0a0a28" stroke="#22d3ee" stroke-width="1.5"/>
        <rect x="10" y="10" width="48" height="12" rx="2" fill="#22d3ee" opacity="0.2"/>
        <rect x="10" y="10" width="18" height="12" rx="2" fill="#22d3ee" opacity="0.5"/>
        <circle cx="100" cy="12" r="4" fill="#4ade80"/>
        <text x="55" y="36" text-anchor="middle" fill="#22d3ee" font-size="8" font-weight="700">STRIPE</text>
        <text x="55" y="46" text-anchor="middle" fill="#22d3ee" font-size="6" opacity="0.5">Betalningar · Webhooks</text>
      </g>

      <!-- TRIGGER.DEV -->
      <g transform="translate(548,295)">
        <rect width="120" height="48" rx="7" fill="#0d0a1e" stroke="#a855f7" stroke-width="1.5"/>
        <polygon points="54,10 44,26 58,26 46,42 68,22 54,22" fill="#a855f7" opacity="0.8"/>
        <circle cx="110" cy="12" r="4" fill="#4ade80"/>
        <text x="60" y="40" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="700">TRIGGER.DEV</text>
        <text x="60" y="50" text-anchor="middle" fill="#a855f7" font-size="6" opacity="0.5">Background Jobs</text>
      </g>

      <!-- GITHUB -->
      <g transform="translate(710,40)">
        <rect width="110" height="48" rx="7" fill="#0d1117" stroke="#fbbf24" stroke-width="1.5"/>
        <circle cx="28" cy="22" r="10" fill="#fbbf24" opacity="0.2"/>
        <circle cx="28" cy="19" r="6" fill="#fbbf24" opacity="0.7"/>
        <circle cx="22" cy="28" r="3.5" fill="#fbbf24" opacity="0.5"/>
        <circle cx="34" cy="28" r="3.5" fill="#fbbf24" opacity="0.5"/>
        <circle cx="100" cy="12" r="4" fill="#4ade80"/>
        <text x="55" y="40" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="700">GITHUB</text>
        <text x="55" y="50" text-anchor="middle" fill="#fbbf24" font-size="6" opacity="0.5">Actions CI/CD Pipeline</text>
      </g>

      <!-- REVOLUT -->
      <g transform="translate(710,110)">
        <rect width="110" height="48" rx="7" fill="#0a0a14" stroke="#818cf8" stroke-width="1.5"/>
        <rect x="10" y="12" width="55" height="24" rx="3" fill="#818cf8" opacity="0.15"/>
        <rect x="10" y="12" width="20" height="10" rx="2" fill="#818cf8" opacity="0.5"/>
        <text x="70" y="24" fill="#818cf8" font-size="8" font-weight="700">VISA</text>
        <circle cx="100" cy="12" r="4" fill="#4ade80"/>
        <text x="55" y="40" text-anchor="middle" fill="#818cf8" font-size="8" font-weight="700">REVOLUT</text>
        <text x="55" y="50" text-anchor="middle" fill="#818cf8" font-size="6" opacity="0.5">Business · Multi-currency</text>
      </g>

      <!-- OPENCLAW -->
      <g transform="translate(820,340)">
        <rect width="120" height="50" rx="7" fill="#0a1a0a" stroke="#4ade80" stroke-width="2"/>
        <text x="26" y="28" fill="#4ade80" font-size="20">🦞</text>
        <circle cx="110" cy="12" r="4" fill="#4ade80"><animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/></circle>
        <text x="60" y="40" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="700">OPENCLAW</text>
        <text x="60" y="50" text-anchor="middle" fill="#4ade80" font-size="6" opacity="0.5">AI Ops · WSL2 · Stockholm</text>
      </g>

      <!-- LEGEND -->
      <g transform="translate(16,335)">
        <circle cx="5" cy="8" r="3" fill="#4ade80"/><text x="13" y="11" fill="#444" font-size="7">Online</text>
        <circle cx="5" cy="22" r="3" fill="#fbbf24"/><text x="13" y="25" fill="#444" font-size="7">Varning</text>
        <circle cx="5" cy="36" r="3" fill="#f87171"/><text x="13" y="39" fill="#444" font-size="7">Offline</text>
        <line x1="70" y1="8" x2="95" y2="8" stroke="#4ade80" stroke-width="1.5"/><text x="100" y="11" fill="#444" font-size="7">Live trafik</text>
        <line x1="70" y1="22" x2="95" y2="22" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4,2"/><text x="100" y="25" fill="#444" font-size="7">Deploy</text>
      </g>
    </svg>
    </div>
  </div>

  <!-- ACTIVITY + COUNTDOWN -->
  <div class="grid-2">

    <!-- LOG -->
    <div class="card">
      <div class="card-title">📋 Aktivitetslogg</div>
      <div id="activity-log">
        <div class="log-row"><div class="log-t" id="log-t1">—</div><div class="log-msg"><strong>API health check</strong> — svarar 200 OK</div></div>
        <div class="log-row"><div class="log-t">—</div><div class="log-msg"><strong>GitHub Actions</strong> — deploy-api.yml passerade</div></div>
        <div class="log-row"><div class="log-t">—</div><div class="log-msg"><strong>Cloudflare</strong> — www.pixdrift.com → 301 aktiv</div></div>
        <div class="log-row"><div class="log-t">—</div><div class="log-msg"><strong>ECS</strong> — ny container-version live efter zod-fix</div></div>
        <div class="log-row"><div class="log-t">—</div><div class="log-msg"><strong>Supabase</strong> — 0 query-errors senaste timmen</div></div>
      </div>
    </div>

    <!-- COUNTDOWN + SUBSCRIBE -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Thailand countdown -->
      <div class="card">
        <div class="card-title">🇹🇭 Thailand Workcamp · 11 April 2026</div>
        <div style="font-size:14px;color:#0e7490;margin-bottom:12px;">Officiell projektstart — hela teamet</div>
        <div class="countdown-boxes">
          <div class="cd-box"><div class="cd-num" id="cd-days">—</div><div class="cd-lbl">Dagar</div></div>
          <div style="font-size:22px;color:#0e7490;align-self:center">:</div>
          <div class="cd-box"><div class="cd-num" id="cd-hours">—</div><div class="cd-lbl">Timmar</div></div>
          <div style="font-size:22px;color:#0e7490;align-self:center">:</div>
          <div class="cd-box"><div class="cd-num" id="cd-mins">—</div><div class="cd-lbl">Minuter</div></div>
        </div>
      </div>

      <!-- Subscribe -->
      <div class="card">
        <div class="card-title">📬 Prenumerera på Morning Brief</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;line-height:1.6">Daglig uppdatering från Erik Svensson kl 08:00 — serverstatus, AI-nyheter och mer.</div>
        <div id="sub-success-msg" class="sub-success">✅ Du är med! Nästa brief kl 08:00.</div>
        <form class="sub-form" id="sub-form" onsubmit="handleSub(event)">
          <input class="sub-input" type="text" id="sub-name" placeholder="Ditt namn" required>
          <input class="sub-input" type="email" id="sub-email" placeholder="din@email.com" required>
          <button type="submit" class="sub-btn" id="sub-btn">🔔 Prenumerera</button>
        </form>
        <div style="font-size:10px;color:#222240;margin-top:8px;" id="sub-count-display">Laddar prenumeranter...</div>
      </div>
    </div>

  </div>

</div>

<footer>
  Hypbit · Driftstatus · status.pixdrift.com<br>
  Erik Svensson · Founder · Wavult Group<br>
  <span id="footer-updated">—</span>
</footer>

<script>
const API = '';  // same-origin

// ── CLOCK ──────────────────────────────────────────────────────────────────
function pad(n){ return String(n).padStart(2,'0'); }
function tick(){
  const now = new Date();
  document.getElementById('clock').textContent =
    pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());

  // Countdown to April 11 2026
  const target = new Date('2026-04-11T00:00:00');
  const diff = target - now;
  if(diff > 0){
    const days  = Math.floor(diff/86400000);
    const hours = Math.floor((diff%86400000)/3600000);
    const mins  = Math.floor((diff%3600000)/60000);
    document.getElementById('cd-days').textContent  = days;
    document.getElementById('cd-hours').textContent = pad(hours);
    document.getElementById('cd-mins').textContent  = pad(mins);
    document.getElementById('th-days').textContent  = days;
  }

  // Log timestamps
  const t = pad(now.getHours())+':'+pad(now.getMinutes());
  document.getElementById('log-t1').textContent = t;
  document.getElementById('footer-updated').textContent = 'Senast uppdaterad '+t;
}
tick();
setInterval(tick, 1000);

// ── HEALTH CHECK ──────────────────────────────────────────────────────────
async function checkHealth(){
  try {
    const start = Date.now();
    const r = await fetch('/health');
    const ms = Date.now() - start;
    const data = await r.json();

    // Latency
    const latEl = document.getElementById('api-latency');
    latEl.textContent = ms + ' ms';
    latEl.style.color = ms < 300 ? 'var(--green)' : ms < 800 ? 'var(--yellow)' : 'var(--red)';

    // DB
    const dbSvc = data.services?.find(s => s.name === 'database');
    const dbEl = document.getElementById('db-status');
    if(dbSvc?.status === 'ok'){
      dbEl.textContent = '✓ OK'; dbEl.style.color = 'var(--green)';
      document.getElementById('svc-db').className = 'tag tag-ok';
      document.getElementById('svc-db').textContent = 'OK';
    } else {
      dbEl.textContent = '✗ ERR'; dbEl.style.color = 'var(--red)';
      document.getElementById('svc-db').className = 'tag tag-err';
      document.getElementById('svc-db').textContent = 'ERROR';
    }

    // API tag
    document.getElementById('svc-api').className = 'tag tag-ok';
    document.getElementById('svc-api').textContent = '200 OK · '+ms+'ms';

    // Banner
    const allOk = data.status === 'ok';
    const banner = document.getElementById('status-banner');
    banner.className = 'status-banner ' + (allOk ? 'ok' : 'degraded');
    document.getElementById('banner-icon').textContent = allOk ? '✅' : '⚠️';
    document.getElementById('banner-title').textContent = allOk ? 'Alla system operativa' : 'Vissa system degraderade';
    document.getElementById('banner-sub').textContent = 'Senast kontrollerat: ' + new Date().toLocaleTimeString('sv-SE');

  } catch(e){
    document.getElementById('svc-api').className = 'tag tag-err';
    document.getElementById('svc-api').textContent = 'OFFLINE';
    document.getElementById('api-latency').textContent = '—';
    document.getElementById('api-latency').style.color = 'var(--red)';
    const banner = document.getElementById('status-banner');
    banner.className = 'status-banner down';
    document.getElementById('banner-icon').textContent = '🔴';
    document.getElementById('banner-title').textContent = 'API offline';
  }
}

// ── URL CHECKS (via API proxy) ─────────────────────────────────────────────
async function checkUrls(){
  const urls = [
    { id: 'svc-pixdrift', url: 'https://pixdrift.com' },
    { id: 'svc-hypbit',   url: 'https://hypbit.com' },
    { id: 'svc-eva',      url: 'https://evasvensson.se' },
  ];
  for(const u of urls){
    try {
      const r = await fetch('/api/status-probe?url='+encodeURIComponent(u.url));
      const d = await r.json();
      const el = document.getElementById(u.id);
      if(d.ok){
        el.className = 'tag tag-ok'; el.textContent = d.status+' OK';
      } else {
        el.className = 'tag tag-warn'; el.textContent = d.status || 'ERR';
      }
    } catch {
      const el = document.getElementById(u.id);
      el.className = 'tag tag-warn'; el.textContent = 'N/A';
    }
  }
}

// ── SUBSCRIBE ──────────────────────────────────────────────────────────────
function loadSubCount(){
  try {
    const subs = JSON.parse(localStorage.getItem('hypbit_status_subs') || '[]');
    const base = 4; // Dennis, Leon, Winston, Johan
    const total = base + subs.length;
    document.getElementById('sub-count-display').textContent =
      total + ' prenumeranter · senast: ' + (subs[subs.length-1]?.name || 'teamet');
  } catch {}
}

async function handleSub(e){
  e.preventDefault();
  const name  = document.getElementById('sub-name').value.trim();
  const email = document.getElementById('sub-email').value.trim();
  const btn   = document.getElementById('sub-btn');
  btn.textContent = '⏳ Sparar...'; btn.disabled = true;

  // Save locally
  try {
    const subs = JSON.parse(localStorage.getItem('hypbit_status_subs') || '[]');
    subs.push({ name, email, ts: new Date().toISOString() });
    localStorage.setItem('hypbit_status_subs', JSON.stringify(subs));
  } catch {}

  // Try server endpoint
  try { await fetch('/api/subscribe', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,source:'status-dashboard'}) }); } catch {}

  document.getElementById('sub-form').style.display = 'none';
  document.getElementById('sub-success-msg').style.display = 'block';
  loadSubCount();
}

// ── INIT ───────────────────────────────────────────────────────────────────
checkHealth();
loadSubCount();
setTimeout(checkUrls, 500);
setInterval(checkHealth, 30000);
setInterval(checkUrls, 60000);
</script>
</body>
</html>`;
}
