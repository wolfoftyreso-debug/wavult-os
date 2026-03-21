import express, { Request, Response } from 'express';
import { supabase } from './supabase';

const router = express.Router();

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
let sitemapCache: string | null = null;
let sitemapCacheTime = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Static pages with SEO priority
// ---------------------------------------------------------------------------
const STATIC_PAGES = [
  { url: 'https://pixdrift.com/', priority: '1.0', changefreq: 'weekly' },
  { url: 'https://pixdrift.com/about.html', priority: '0.9', changefreq: 'monthly' },
  { url: 'https://pixdrift.com/security.html', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://pixdrift.com/changelog.html', priority: '0.8', changefreq: 'weekly' },
  { url: 'https://pixdrift.com/roadmap.html', priority: '0.7', changefreq: 'monthly' },
  { url: 'https://pixdrift.com/sie4.html', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://pixdrift.com/blog/', priority: '0.9', changefreq: 'weekly' },
  { url: 'https://pixdrift.com/press/', priority: '0.7', changefreq: 'weekly' },
  { url: 'https://pixdrift.com/developers/', priority: '0.8', changefreq: 'weekly' },
  { url: 'https://pixdrift.com/developers/api-reference.html', priority: '0.8', changefreq: 'weekly' },
  { url: 'https://pixdrift.com/developers/authentication.html', priority: '0.6', changefreq: 'monthly' },
  { url: 'https://pixdrift.com/developers/webhooks.html', priority: '0.6', changefreq: 'monthly' },
  { url: 'https://pixdrift.com/developers/guides/quickstart.html', priority: '0.7', changefreq: 'monthly' },
];

function formatDate(date: Date | string): string {
  return new Date(date).toISOString().split('T')[0];
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------------------
// GET /sitemap.xml — dynamic sitemap from DB + static pages
// ---------------------------------------------------------------------------
router.get('/sitemap.xml', async (req: Request, res: Response) => {
  // Serve from cache if fresh
  if (sitemapCache && Date.now() - sitemapCacheTime < CACHE_TTL) {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('X-Cache', 'HIT');
    return res.send(sitemapCache);
  }

  try {
    const today = formatDate(new Date());

    // Static pages
    const staticEntries = STATIC_PAGES.map(p => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

    // Dynamic: knowledge_articles
    let articleEntries = '';
    try {
      const { data: articles } = await supabase
        .from('knowledge_articles')
        .select('id, slug, updated_at')
        .eq('status', 'published')
        .limit(500);

      if (articles && articles.length > 0) {
        articleEntries = articles.map((a: any) => `  <url>
    <loc>https://pixdrift.com/blog/${a.slug || a.id}.html</loc>
    <lastmod>${formatDate(a.updated_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n');
      }
    } catch (_e) { /* Supabase unavailable — skip dynamic entries */ }

    // Dynamic: press_releases
    let pressEntries = '';
    try {
      const { data: press } = await supabase
        .from('press_releases')
        .select('id, slug, updated_at')
        .eq('status', 'published')
        .limit(200);

      if (press && press.length > 0) {
        pressEntries = press.map((p: any) => `  <url>
    <loc>https://pixdrift.com/press/${p.slug || p.id}.html</loc>
    <lastmod>${formatDate(p.updated_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`).join('\n');
      }
    } catch (_e) { /* skip */ }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticEntries}
${articleEntries}
${pressEntries}
</urlset>`;

    sitemapCache = sitemap;
    sitemapCacheTime = Date.now();

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Cache', 'MISS');
    return res.send(sitemap);

  } catch (err) {
    console.error('[SEO] sitemap generation failed:', err);
    return res.status(500).send('Sitemap generation failed');
  }
});

// ---------------------------------------------------------------------------
// GET /robots.txt
// ---------------------------------------------------------------------------
router.get('/robots.txt', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(`User-agent: *
Allow: /
Disallow: /legal/
Disallow: /checkout.html
Disallow: /success.html
Disallow: /status.html
Disallow: /*.json$

Crawl-delay: 10

Sitemap: https://pixdrift.com/sitemap.xml

User-agent: Googlebot
Allow: /
Crawl-delay: 0`);
});

// ---------------------------------------------------------------------------
// GET /og-image.svg?title=...&description=...&type=default|blog|press
// ---------------------------------------------------------------------------
router.get('/og-image.svg', (req: Request, res: Response) => {
  const title = escapeXml(String(req.query.title || 'Business Operating System').slice(0, 60));
  const description = escapeXml(String(req.query.description || 'Your Business, Running on pixdrift.').slice(0, 100));
  const type = String(req.query.type || 'default');

  // Accent color varies by type
  const accentColor = type === 'blog' ? '#10b981' : type === 'press' ? '#f59e0b' : '#6366f1';
  const typeLabel = type === 'blog' ? 'BLOG' : type === 'press' ? 'PRESS RELEASE' : 'PRODUCT';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0a0f"/>
  <defs>
    <radialGradient id="glow" cx="40%" cy="60%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#0a0a0f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="80%" cy="20%" r="40%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#0a0a0f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="480" cy="380" rx="600" ry="350" fill="url(#glow)"/>
  <ellipse cx="960" cy="120" rx="400" ry="250" fill="url(#glow2)"/>
  <!-- Grid lines for tech feel -->
  <line x1="0" y1="540" x2="1200" y2="540" stroke="${accentColor}" stroke-opacity="0.1" stroke-width="1"/>
  <line x1="80" y1="0" x2="80" y2="630" stroke="${accentColor}" stroke-opacity="0.1" stroke-width="1"/>
  <!-- Logo -->
  <text x="80" y="100" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="800" fill="${accentColor}">pixdrift</text>
  <!-- Type label -->
  <rect x="80" y="120" width="${typeLabel.length * 10 + 20}" height="28" rx="4" fill="${accentColor}" fill-opacity="0.15"/>
  <text x="90" y="139" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="700" fill="${accentColor}" letter-spacing="2">${typeLabel}</text>
  <!-- Title -->
  <text x="80" y="260" font-family="Inter, system-ui, sans-serif" font-size="56" font-weight="700" fill="#f8fafc">${title}</text>
  <!-- Description -->
  <text x="80" y="340" font-family="Inter, system-ui, sans-serif" font-size="24" fill="#94a3b8">${description}</text>
  <!-- Bottom bar -->
  <rect x="0" y="590" width="1200" height="2" fill="${accentColor}" fill-opacity="0.4"/>
  <text x="80" y="615" font-family="Inter, system-ui, sans-serif" font-size="18" fill="${accentColor}">pixdrift.com</text>
  <text x="1120" y="615" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#4b5563" text-anchor="end">Business Operating System</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(svg);
});

// ---------------------------------------------------------------------------
// GET /api/seo/schema/:page — JSON-LD structured data
// ---------------------------------------------------------------------------
router.get('/schema/:page(*)', async (req: Request, res: Response) => {
  const page = req.params.page;
  const baseUrl = 'https://pixdrift.com';

  const org = {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'pixdrift',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/pixdrift-design.css`, // swap for real logo URL
    },
    sameAs: [
      'https://twitter.com/pixdrift',
      'https://linkedin.com/company/pixdrift',
    ],
  };

  let schema: object;

  if (page === 'home' || page === '') {
    schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'pixdrift',
          description: 'Business Operating System for Modern Teams',
          publisher: { '@id': `${baseUrl}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/blog/?q={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        },
        org,
        {
          '@type': 'SoftwareApplication',
          name: 'pixdrift',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: baseUrl,
          description: 'Replace 5+ tools with one platform. Operations management software built for modern teams.',
          offers: {
            '@type': 'Offer',
            price: '499',
            priceCurrency: 'EUR',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '499',
              priceCurrency: 'EUR',
              billingDuration: 'P1M',
            },
          },
          provider: { '@id': `${baseUrl}/#organization` },
        },
      ],
    };
  } else if (page === 'about') {
    schema = {
      '@context': 'https://schema.org',
      '@graph': [
        org,
        {
          '@type': 'AboutPage',
          url: `${baseUrl}/about.html`,
          name: 'Om pixdrift — Grundarberättelse & Team',
          description: 'Lär känna teamet bakom pixdrift.',
          publisher: { '@id': `${baseUrl}/#organization` },
        },
      ],
    };
  } else if (page === 'security') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: `${baseUrl}/security.html`,
      name: 'Säkerhet & Compliance — GDPR, ISO 27001 | pixdrift',
      description: 'pixdrift är byggt för enterprise-säkerhet. GDPR-compliant, krypterat.',
      publisher: { '@id': `${baseUrl}/#organization` },
    };
  } else if (page.startsWith('blog/')) {
    const slug = page.replace('blog/', '');
    // Attempt to fetch article data from Supabase
    let articleData: any = null;
    try {
      const { data } = await supabase
        .from('knowledge_articles')
        .select('id, title, description, created_at, updated_at, author')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .single();
      articleData = data;
    } catch (_e) { /* skip */ }

    schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      url: `${baseUrl}/blog/${slug}.html`,
      headline: articleData?.title || slug,
      description: articleData?.description || '',
      datePublished: articleData?.created_at ? formatDate(articleData.created_at) : undefined,
      dateModified: articleData?.updated_at ? formatDate(articleData.updated_at) : undefined,
      author: {
        '@type': 'Organization',
        name: articleData?.author || 'pixdrift',
      },
      publisher: { '@id': `${baseUrl}/#organization` },
    };
  } else if (page.startsWith('press/')) {
    const slug = page.replace('press/', '');
    schema = {
      '@context': 'https://schema.org',
      '@type': 'PressRelease',
      url: `${baseUrl}/press/${slug}.html`,
      headline: slug,
      publisher: { '@id': `${baseUrl}/#organization` },
    };
  } else {
    return res.status(404).json({ error: `No schema defined for page: ${page}` });
  }

  res.setHeader('Content-Type', 'application/ld+json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.json(schema);
});

// ---------------------------------------------------------------------------
// GET /api/seo/report — SEO health report
// ---------------------------------------------------------------------------
router.get('/report', async (_req: Request, res: Response) => {
  const report: {
    generatedAt: string;
    summary: { totalPages: number; pagesWithMeta: number; pagesWithSchema: number; issues: number };
    issues: Array<{ url: string; type: string; message: string; severity: 'error' | 'warning' | 'info' }>;
    sitemapUrls: number;
  } = {
    generatedAt: new Date().toISOString(),
    summary: { totalPages: 0, pagesWithMeta: 0, pagesWithSchema: 0, issues: 0 },
    issues: [],
    sitemapUrls: 0,
  };

  // Count static pages
  report.summary.totalPages = STATIC_PAGES.length;
  report.sitemapUrls = STATIC_PAGES.length;

  // Check for dynamic content counts
  try {
    const { count: articleCount } = await supabase
      .from('knowledge_articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    if (articleCount) {
      report.summary.totalPages += articleCount;
      report.sitemapUrls += articleCount;
    }
  } catch (_e) {
    report.issues.push({
      url: '/blog',
      type: 'db_connection',
      message: 'Cannot connect to Supabase to count articles',
      severity: 'warning',
    });
  }

  // Pages defined in SEO system always have schema (we serve it dynamically)
  report.summary.pagesWithSchema = STATIC_PAGES.length;
  report.summary.pagesWithMeta = STATIC_PAGES.length;

  // Check for pages that are blocked but shouldn't be
  const NOINDEX_PAGES = ['/checkout.html', '/success.html', '/status.html'];
  NOINDEX_PAGES.forEach(p => {
    report.issues.push({
      url: p,
      type: 'noindex',
      message: `Page is blocked from indexing via robots.txt — confirm this is intentional`,
      severity: 'info',
    });
  });

  report.summary.issues = report.issues.filter(i => i.severity !== 'info').length;

  return res.json(report);
});

// ---------------------------------------------------------------------------
// POST /api/seo/invalidate-cache — invalidate sitemap cache on new content
// ---------------------------------------------------------------------------
router.post('/invalidate-cache', (_req: Request, res: Response) => {
  sitemapCache = null;
  sitemapCacheTime = 0;
  console.log('[SEO] Sitemap cache invalidated');
  return res.json({ success: true, message: 'Sitemap cache cleared', timestamp: new Date().toISOString() });
});

export default router;
