#!/usr/bin/env node
/**
 * SEO injection script
 * Runs automatically as part of the build process
 * Adds/updates: canonical tags, meta revised date, structured data links
 *
 * Usage:
 *   node scripts/inject-seo.js
 *   npm run seo:inject
 */

const fs = require('fs');
const path = require('path');

const LANDING_DIR = path.join(__dirname, '../apps/landing');
const BASE_URL = 'https://pixdrift.com';

// Per-page SEO configuration
const PAGE_META = {
  'index.html': {
    title: 'pixdrift — Business Operating System for Modern Teams',
    description: 'pixdrift is the operating system modern teams run their business on. Replace 5+ tools with one platform. From €499/mo.',
    keywords: 'OMS system, operations management software, business operating system, affärssystem, operativ plattform',
    ogImage: `${BASE_URL}/og-image.svg?title=Business+Operating+System&description=Your+Business%2C+Running+on+pixdrift.`,
    priority: '1.0',
    schema: 'home',
    noindex: false,
  },
  'about.html': {
    title: 'Om pixdrift — Grundarberättelse & Team',
    description: 'Lär känna teamet bakom pixdrift. Vi bygger operativsystemet för moderna team.',
    ogImage: `${BASE_URL}/og-image.svg?title=Om+pixdrift&description=Vi+bygger+operativsystemet+f%C3%B6r+moderna+team.`,
    priority: '0.9',
    schema: 'about',
    noindex: false,
  },
  'security.html': {
    title: 'Säkerhet & Compliance — GDPR, ISO 27001 | pixdrift',
    description: 'pixdrift är byggt för enterprise-säkerhet. GDPR-compliant, krypterat, ISO 27001 roadmap.',
    ogImage: `${BASE_URL}/og-image.svg?title=S%C3%A4kerhet+%26+Compliance&description=GDPR-compliant%2C+krypterat%2C+ISO+27001+roadmap.`,
    priority: '0.8',
    schema: 'security',
    noindex: false,
  },
  'changelog.html': {
    title: 'Changelog | pixdrift',
    description: 'Senaste uppdateringar och förbättringar i pixdrift. Se alla nya features och fixes.',
    ogImage: `${BASE_URL}/og-image.svg?title=Changelog&description=Senaste+uppdateringar+i+pixdrift.`,
    priority: '0.8',
    noindex: false,
  },
  'roadmap.html': {
    title: 'Roadmap | pixdrift',
    description: 'Se vad som är på väg i pixdrift. Kommande features och förbättringar.',
    ogImage: `${BASE_URL}/og-image.svg?title=Roadmap&description=Kommande+features+i+pixdrift.`,
    priority: '0.7',
    noindex: false,
  },
  'sie4.html': {
    title: 'SIE4 Export | pixdrift',
    description: 'Exportera SIE4-filer direkt från pixdrift. Sömlös integration med bokföringsprogram.',
    priority: '0.8',
    noindex: false,
  },
  'privacy.html': {
    title: 'Integritetspolicy | pixdrift',
    description: 'Hur pixdrift hanterar din data. GDPR-compliant integritetspolicy.',
    priority: '0.3',
    noindex: false,
  },
  'terms.html': {
    title: 'Användarvillkor | pixdrift',
    description: 'Användarvillkor för pixdrift-plattformen.',
    priority: '0.3',
    noindex: false,
  },
  // Pages that should NOT be indexed
  'checkout.html': { noindex: true },
  'success.html': { noindex: true },
  'status.html': { noindex: true },
};

let processedCount = 0;
let skippedCount = 0;
const issues = [];

/**
 * Inject or update SEO tags in an HTML file
 */
function injectSEO(html, meta, filePath) {
  const filename = path.basename(filePath);
  const relPath = path.relative(LANDING_DIR, filePath).replace(/\\/g, '/');
  const isIndex = filename === 'index.html' && path.dirname(filePath) === LANDING_DIR;
  const pageUrl = `${BASE_URL}/${isIndex ? '' : relPath}`;

  // --- noindex pages: ensure noindex tag and bail ---
  if (meta.noindex) {
    if (!html.includes('name="robots"')) {
      html = html.replace('</head>', `  <meta name="robots" content="noindex, nofollow">\n</head>`);
    }
    return html;
  }

  // --- canonical ---
  if (!html.includes('rel="canonical"')) {
    html = html.replace('</head>', `  <link rel="canonical" href="${pageUrl}">\n</head>`);
  }

  // --- lastmod / revised ---
  const now = new Date().toISOString().split('T')[0];
  if (html.includes('name="revised"')) {
    // Update existing
    html = html.replace(/(<meta name="revised" content=")[^"]*(")/g, `$1${now}$2`);
  } else {
    html = html.replace('</head>', `  <meta name="revised" content="${now}">\n</head>`);
  }

  // --- OG image tag (if defined in meta) ---
  if (meta.ogImage && !html.includes('property="og:image"')) {
    html = html.replace('</head>', `  <meta property="og:image" content="${meta.ogImage}">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n</head>`);
  }

  // --- Schema.org JSON-LD link (structured data endpoint) ---
  if (meta.schema && !html.includes('application/ld+json')) {
    const schemaTag = `  <!-- Schema.org JSON-LD: fetched from /api/seo/schema/${meta.schema} -->\n  <script type="application/ld+json" src="${BASE_URL.replace('pixdrift.com', 'api.bc.pixdrift.com')}/api/seo/schema/${meta.schema}"></script>\n`;
    // Note: browsers don't support src on script[type=application/ld+json]
    // Instead, we note the endpoint in a comment for the build to inline if needed.
    html = html.replace('</head>', `  <!-- SEO:schema=${meta.schema} endpoint=/api/seo/schema/${meta.schema} -->\n</head>`);
  }

  return html;
}

/**
 * Recursively process all HTML files in a directory
 */
function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (['node_modules', '.git', 'legal'].includes(entry.name)) continue;
      processDir(fullPath);
    } else if (entry.name.endsWith('.html')) {
      try {
        let html = fs.readFileSync(fullPath, 'utf8');
        const meta = PAGE_META[entry.name] || {};

        // Validate: warn about pages without title/description
        if (!meta.title && !html.includes('<title>')) {
          issues.push(`⚠️  No title defined for: ${entry.name}`);
        }
        if (!meta.description && !html.includes('name="description"')) {
          issues.push(`⚠️  No description defined for: ${entry.name}`);
        }

        const updated = injectSEO(html, meta, fullPath);
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`✅ SEO injected: ${path.relative(LANDING_DIR, fullPath)}`);
        processedCount++;
      } catch (err) {
        console.error(`❌ Failed to process ${fullPath}:`, err.message);
        skippedCount++;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('🔍 Starting SEO injection...');
console.log(`   Target: ${LANDING_DIR}`);
console.log('');

if (!fs.existsSync(LANDING_DIR)) {
  console.error(`❌ Landing dir not found: ${LANDING_DIR}`);
  process.exit(1);
}

processDir(LANDING_DIR);

console.log('');
console.log(`✅ SEO injection complete: ${processedCount} files processed, ${skippedCount} skipped`);

if (issues.length > 0) {
  console.log('');
  console.log('⚠️  Issues found:');
  issues.forEach(i => console.log(`   ${i}`));
}
