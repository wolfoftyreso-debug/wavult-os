// ─── API Hub — Integration Data ──────────────────────────────────────────────
// Extracted from uapix (wolfoftyreso-debug/uapix) PackagesSection.tsx
// Categories: 12 free + 22 paid = 34 categories, 400+ integrations

export type IntegrationStatus = 'live' | 'configured' | 'available' | 'planned'
export type IntegrationPrice = 'free' | 'paid' | 'usage-based'

export interface APIIntegration {
  id: string
  name: string
  provider: string
  category: string
  categoryId: string
  description: string
  status: IntegrationStatus
  price: IntegrationPrice
  icon: string
  wavultUsage?: string
  docsUrl?: string
}

export interface APICategory {
  id: string
  name: string
  icon: string
  description: string
  price: IntegrationPrice
  basePrice?: number
  count: number
}

// ─── LIVE integrations in Wavult stack ────────────────────────────────────────
export const LIVE_INTEGRATIONS: APIIntegration[] = [
  {
    id: 'live-46elks',
    name: '46elks',
    provider: '46elks',
    category: 'Communication & Messaging',
    categoryId: 'communication',
    description: 'Swedish SMS & Voice API — carrier-grade, GDPR-compliant',
    status: 'live',
    price: 'usage-based',
    icon: '📱',
    wavultUsage: 'SMS-notifieringar till team och kunder',
    docsUrl: 'https://46elks.com/docs',
  },
  {
    id: 'live-stripe',
    name: 'Stripe',
    provider: 'Stripe',
    category: 'Payments & Billing',
    categoryId: 'payments',
    description: 'Global payment processing — cards, subscriptions, invoicing',
    status: 'live',
    price: 'usage-based',
    icon: '💳',
    wavultUsage: 'Betalningprocessering för produkter och SaaS',
    docsUrl: 'https://stripe.com/docs',
  },
  {
    id: 'live-revolut',
    name: 'Revolut Business',
    provider: 'Revolut',
    category: 'Payments & Billing',
    categoryId: 'payments',
    description: 'Multi-currency business accounts and payments',
    status: 'live',
    price: 'usage-based',
    icon: '🏦',
    wavultUsage: 'Valutahantering, internationella betalningar',
    docsUrl: 'https://developer.revolut.com',
  },
  {
    id: 'live-supabase',
    name: 'Supabase',
    provider: 'Supabase',
    category: 'Infrastructure & Cloud',
    categoryId: 'infrastructure',
    description: 'Open-source Firebase alternative — Postgres + Auth + Storage + Realtime',
    status: 'live',
    price: 'usage-based',
    icon: '🗄️',
    wavultUsage: 'Primär databas för Wavult OS — alla moduler',
    docsUrl: 'https://supabase.com/docs',
  },
  {
    id: 'live-aws',
    name: 'AWS',
    provider: 'Amazon Web Services',
    category: 'Infrastructure & Cloud',
    categoryId: 'infrastructure',
    description: 'S3 storage, ECS container orchestration, full cloud infrastructure',
    status: 'live',
    price: 'usage-based',
    icon: '☁️',
    wavultUsage: 'ECS (wavult-os-api, quixzoom-api, n8n, team-pulse), S3 media',
    docsUrl: 'https://docs.aws.amazon.com',
  },
  {
    id: 'live-cloudflare',
    name: 'Cloudflare',
    provider: 'Cloudflare',
    category: 'Infrastructure & Cloud',
    categoryId: 'infrastructure',
    description: 'Edge CDN, DNS, DDoS protection, Pages deployment',
    status: 'live',
    price: 'usage-based',
    icon: '🌐',
    wavultUsage: 'DNS för alla domäner, Pages för Wavult OS frontend',
    docsUrl: 'https://developers.cloudflare.com',
  },
  {
    id: 'live-github',
    name: 'GitHub Actions',
    provider: 'GitHub',
    category: 'Developer Tools',
    categoryId: 'developer',
    description: 'CI/CD automation, version control, deployment pipelines',
    status: 'live',
    price: 'usage-based',
    icon: '🐙',
    wavultUsage: 'CI/CD pipelines, all repos (hypbit, quixzoom-v2, evasvensson)',
    docsUrl: 'https://docs.github.com/actions',
  },
  {
    id: 'live-whisper',
    name: 'OpenAI Whisper',
    provider: 'OpenAI',
    category: 'AI Audio & Voice',
    categoryId: 'ai-audio',
    description: 'Best-in-class multilingual speech-to-text transcription',
    status: 'live',
    price: 'usage-based',
    icon: '🎙️',
    wavultUsage: 'Rösttranskription via OpenClaw (Bernt)',
    docsUrl: 'https://platform.openai.com/docs/guides/speech-to-text',
  },
  {
    id: 'live-gemini',
    name: 'Gemini',
    provider: 'Google',
    category: 'AI Language Models',
    categoryId: 'ai-language',
    description: 'Google Gemini Ultra — best multimodal understanding and long contexts',
    status: 'live',
    price: 'usage-based',
    icon: '🤖',
    wavultUsage: 'LLM-kapabilitet via OpenClaw (Bernt) — analys, skrivning',
    docsUrl: 'https://ai.google.dev/docs',
  },
  {
    id: 'live-loopia',
    name: 'Loopia SMTP',
    provider: 'Loopia',
    category: 'Email & Marketing',
    categoryId: 'email-marketing',
    description: 'Swedish email hosting — SMTP delivery via mailout.loopia.se',
    status: 'live',
    price: 'usage-based',
    icon: '📧',
    wavultUsage: 'Transaktionsmejl från erik@hypbit.com (port 587 STARTTLS)',
    docsUrl: 'https://www.loopia.se/loopiamail/',
  },
]

// ─── ALL INTEGRATIONS (extracted from uapix categories) ──────────────────────
export const API_INTEGRATIONS: APIIntegration[] = [
  // ── FREE: Weather ─────────────────────────────────────────────
  { id: 'openweathermap', name: 'OpenWeatherMap', provider: 'OpenWeather', category: 'Weather & Environment', categoryId: 'free-weather', description: 'Global weather forecasts and current conditions', status: 'available', price: 'free', icon: '🌤️', docsUrl: 'https://openweathermap.org/api' },
  { id: 'open-meteo', name: 'Open-Meteo', provider: 'Open-Meteo', category: 'Weather & Environment', categoryId: 'free-weather', description: 'Free weather API with no key required', status: 'available', price: 'free', icon: '🌡️', docsUrl: 'https://open-meteo.com/en/docs' },
  { id: 'air-quality', name: 'Air Quality API', provider: 'AQICN', category: 'Weather & Environment', categoryId: 'free-weather', description: 'Real-time air pollution and pollen data', status: 'available', price: 'free', icon: '🌬️' },

  // ── FREE: News ─────────────────────────────────────────────────
  { id: 'newsapi', name: 'NewsAPI', provider: 'NewsAPI.org', category: 'News & Media', categoryId: 'free-news', description: 'Breaking news from 80,000+ sources worldwide', status: 'available', price: 'free', icon: '📰', docsUrl: 'https://newsapi.org/docs' },
  { id: 'hacker-news', name: 'Hacker News', provider: 'Y Combinator', category: 'News & Media', categoryId: 'free-news', description: 'Top tech and startup news', status: 'available', price: 'free', icon: '👾', docsUrl: 'https://github.com/HackerNews/API' },

  // ── FREE: Finance ───────────────────────────────────────────────
  { id: 'alpha-vantage-free', name: 'Alpha Vantage', provider: 'Alpha Vantage', category: 'Finance & Economy', categoryId: 'free-finance', description: 'Real-time and historical stock data', status: 'available', price: 'free', icon: '📈', docsUrl: 'https://www.alphavantage.co/documentation/' },
  { id: 'coingecko-free', name: 'CoinGecko', provider: 'CoinGecko', category: 'Finance & Economy', categoryId: 'free-finance', description: 'Cryptocurrency prices and market data', status: 'available', price: 'free', icon: '🦎', docsUrl: 'https://www.coingecko.com/en/api' },
  { id: 'exchangerate-api', name: 'ExchangeRate-API', provider: 'ExchangeRate', category: 'Finance & Economy', categoryId: 'free-finance', description: 'Real-time currency exchange rates', status: 'available', price: 'free', icon: '💱' },
  { id: 'frankfurter', name: 'Frankfurter', provider: 'Frankfurter', category: 'Finance & Economy', categoryId: 'free-finance', description: 'European Central Bank exchange rates', status: 'available', price: 'free', icon: '🏛️' },

  // ── FREE: Transport ─────────────────────────────────────────────
  { id: 'opensky', name: 'OpenSky', provider: 'OpenSky Network', category: 'Transport & Travel', categoryId: 'free-transport', description: 'Real-time flight tracking worldwide', status: 'available', price: 'free', icon: '✈️' },
  { id: 'transitland', name: 'TransitLand', provider: 'Transitland', category: 'Transport & Travel', categoryId: 'free-transport', description: 'Global public transport schedules and routes', status: 'available', price: 'free', icon: '🚌' },
  { id: 'openrouteservice', name: 'OpenRouteService', provider: 'HeiGIT', category: 'Transport & Travel', categoryId: 'free-transport', description: 'Directions, isochrones and geocoding', status: 'available', price: 'free', icon: '🗺️' },
  { id: 'openchargermap', name: 'OpenChargeMap', provider: 'OpenChargeMap', category: 'Transport & Travel', categoryId: 'free-transport', description: 'Electric vehicle charging station locations', status: 'available', price: 'free', icon: '⚡' },

  // ── FREE: Health ────────────────────────────────────────────────
  { id: 'open-food-facts', name: 'Open Food Facts', provider: 'Open Food Facts', category: 'Health & Fitness', categoryId: 'free-health', description: 'Food product nutrition data worldwide', status: 'available', price: 'free', icon: '🥗' },
  { id: 'nutritionix', name: 'Nutritionix', provider: 'Nutritionix', category: 'Health & Fitness', categoryId: 'free-health', description: 'Nutrition info for foods and restaurants', status: 'available', price: 'free', icon: '🥦' },
  { id: 'wger', name: 'WGER', provider: 'WGER', category: 'Health & Fitness', categoryId: 'free-health', description: 'Exercise database with muscle groups', status: 'available', price: 'free', icon: '💪' },
  { id: 'disease-sh', name: 'Disease.sh', provider: 'disease.sh', category: 'Health & Fitness', categoryId: 'free-health', description: 'Global health and disease statistics', status: 'available', price: 'free', icon: '🏥' },

  // ── FREE: Sports ────────────────────────────────────────────────
  { id: 'thesportsdb', name: 'TheSportsDB', provider: 'TheSportsDB', category: 'Sports', categoryId: 'free-sports', description: 'Sports results, teams, players and events', status: 'available', price: 'free', icon: '⚽' },
  { id: 'api-football', name: 'API-Football', provider: 'API-Sports', category: 'Sports', categoryId: 'free-sports', description: 'Live scores and football statistics', status: 'available', price: 'free', icon: '🏆' },

  // ── FREE: Food ──────────────────────────────────────────────────
  { id: 'themealdb', name: 'TheMealDB', provider: 'TheMealDB', category: 'Food & Recipes', categoryId: 'free-food', description: 'Thousands of recipes with ingredients', status: 'available', price: 'free', icon: '🍽️' },
  { id: 'thecocktaildb', name: 'TheCocktailDB', provider: 'TheCocktailDB', category: 'Food & Recipes', categoryId: 'free-food', description: 'Cocktail recipes and drink database', status: 'available', price: 'free', icon: '🍹' },

  // ── FREE: Entertainment ─────────────────────────────────────────
  { id: 'omdb', name: 'OMDB', provider: 'OMDB', category: 'Entertainment', categoryId: 'free-entertainment', description: 'Movie, TV series and game information', status: 'available', price: 'free', icon: '🎬' },
  { id: 'tvmaze', name: 'TVMaze', provider: 'TVMaze', category: 'Entertainment', categoryId: 'free-entertainment', description: 'TV show schedules and episode data', status: 'available', price: 'free', icon: '📺' },
  { id: 'open-library', name: 'Open Library', provider: 'Internet Archive', category: 'Entertainment', categoryId: 'free-entertainment', description: 'Access to millions of book records', status: 'available', price: 'free', icon: '📚' },
  { id: 'jikan', name: 'Jikan', provider: 'Jikan', category: 'Entertainment', categoryId: 'free-entertainment', description: 'Complete anime and manga database', status: 'available', price: 'free', icon: '🎌' },

  // ── FREE: Fun ───────────────────────────────────────────────────
  { id: 'pokeapi', name: 'PokeAPI', provider: 'PokeAPI', category: 'Fun & Misc', categoryId: 'free-fun', description: 'Complete Pokémon database API', status: 'available', price: 'free', icon: '🎮' },
  { id: 'imgflip', name: 'Imgflip', provider: 'Imgflip', category: 'Fun & Misc', categoryId: 'free-fun', description: 'Generate and browse popular memes', status: 'available', price: 'free', icon: '😂' },
  { id: 'random-user', name: 'Random User', provider: 'randomuser.me', category: 'Fun & Misc', categoryId: 'free-fun', description: 'Generate random user profiles for testing', status: 'available', price: 'free', icon: '👤' },
  { id: 'quotable', name: 'Quotable', provider: 'Quotable', category: 'Fun & Misc', categoryId: 'free-fun', description: 'Random inspirational quotes', status: 'available', price: 'free', icon: '💬' },

  // ── FREE: Geo ───────────────────────────────────────────────────
  { id: 'rest-countries', name: 'REST Countries', provider: 'REST Countries', category: 'Geo & Reference', categoryId: 'free-geo', description: 'Information about all countries', status: 'available', price: 'free', icon: '🌍' },
  { id: 'ip-api', name: 'IP-API', provider: 'IP-API', category: 'Geo & Reference', categoryId: 'free-geo', description: 'IP address geolocation lookup', status: 'available', price: 'free', icon: '📍' },
  { id: 'nasa-api', name: 'NASA API', provider: 'NASA', category: 'Geo & Reference', categoryId: 'free-geo', description: 'Astronomy photos, Mars data, asteroids', status: 'available', price: 'free', icon: '🚀' },
  { id: 'advice-slip', name: 'Advice Slip', provider: 'Advice Slip', category: 'Geo & Reference', categoryId: 'free-geo', description: 'Random life advice generator', status: 'available', price: 'free', icon: '💡' },

  // ── FREE: Education ─────────────────────────────────────────────
  { id: 'wikipedia', name: 'Wikipedia API', provider: 'Wikimedia', category: 'Education & Learning', categoryId: 'free-education', description: 'Access to Wikipedia articles and content', status: 'available', price: 'free', icon: '📖' },
  { id: 'free-dictionary', name: 'Free Dictionary', provider: 'dictionaryapi.dev', category: 'Education & Learning', categoryId: 'free-education', description: 'Word definitions, phonetics and examples', status: 'available', price: 'free', icon: '📝' },
  { id: 'libretranslate', name: 'LibreTranslate', provider: 'LibreTranslate', category: 'Education & Learning', categoryId: 'free-education', description: 'Free open-source language translation', status: 'available', price: 'free', icon: '🌐' },
  { id: 'numbers-api', name: 'Numbers API', provider: 'Numbers API', category: 'Education & Learning', categoryId: 'free-education', description: 'Interesting facts about numbers and dates', status: 'available', price: 'free', icon: '🔢' },

  // ── FREE: Music ─────────────────────────────────────────────────
  { id: 'deezer', name: 'Deezer API', provider: 'Deezer', category: 'Music & Audio', categoryId: 'free-music', description: 'Artist, album and track information', status: 'available', price: 'free', icon: '🎵' },
  { id: 'lyrics-ovh', name: 'Lyrics.ovh', provider: 'Lyrics.ovh', category: 'Music & Audio', categoryId: 'free-music', description: 'Song lyrics from multiple sources', status: 'available', price: 'free', icon: '🎤' },
  { id: 'musicbrainz', name: 'MusicBrainz', provider: 'MetaBrainz', category: 'Music & Audio', categoryId: 'free-music', description: 'Comprehensive music metadata database', status: 'available', price: 'free', icon: '🎼' },
  { id: 'radio-browser', name: 'Radio Browser', provider: 'Radio Browser', category: 'Music & Audio', categoryId: 'free-music', description: 'Database of internet radio stations', status: 'available', price: 'free', icon: '📻' },

  // ── PAID: AI Image ──────────────────────────────────────────────
  { id: 'dalle', name: 'DALL·E', provider: 'OpenAI', category: 'AI Image Generation', categoryId: 'ai-image', description: 'Photorealistic images and creative prompt interpretation', status: 'available', price: 'paid', icon: '🎨', docsUrl: 'https://platform.openai.com/docs/guides/images' },
  { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney', category: 'AI Image Generation', categoryId: 'ai-image', description: 'Superior aesthetics and artistic style', status: 'available', price: 'paid', icon: '🖼️' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', provider: 'Stability AI', category: 'AI Image Generation', categoryId: 'ai-image', description: 'Full control and local execution', status: 'available', price: 'paid', icon: '🎭' },
  { id: 'flux', name: 'Flux', provider: 'Black Forest Labs', category: 'AI Image Generation', categoryId: 'ai-image', description: 'Fastest generation with high quality output', status: 'available', price: 'paid', icon: '⚡' },
  { id: 'ideogram', name: 'Ideogram', provider: 'Ideogram', category: 'AI Image Generation', categoryId: 'ai-image', description: 'Best at rendering text within images', status: 'available', price: 'paid', icon: '✍️' },
  { id: 'adobe-firefly', name: 'Adobe Firefly', provider: 'Adobe', category: 'AI Image Generation', categoryId: 'ai-image', description: 'Commercially safe with Adobe integration', status: 'available', price: 'paid', icon: '🔥' },
  { id: 'imagen', name: 'Imagen', provider: 'Google', category: 'AI Image Generation', categoryId: 'ai-image', description: 'State-of-the-art image understanding and editing', status: 'available', price: 'paid', icon: '🖥️' },
  { id: 'canva', name: 'Canva', provider: 'Canva', category: 'AI Image Generation', categoryId: 'ai-image', description: 'Template-based design automation with brand kit', status: 'available', price: 'paid', icon: '🎪' },

  // ── PAID: AI Video ──────────────────────────────────────────────
  { id: 'sora', name: 'Sora', provider: 'OpenAI', category: 'AI Video Generation', categoryId: 'ai-video', description: 'Longest and most coherent video generation', status: 'available', price: 'paid', icon: '🎥' },
  { id: 'runway', name: 'Runway Gen-3', provider: 'Runway', category: 'AI Video Generation', categoryId: 'ai-video', description: 'Industry-leading for professional video production', status: 'available', price: 'paid', icon: '🎞️' },
  { id: 'pika', name: 'Pika', provider: 'Pika Labs', category: 'AI Video Generation', categoryId: 'ai-video', description: 'Best for stylized animations and effects', status: 'available', price: 'paid', icon: '✨' },
  { id: 'heygen', name: 'HeyGen', provider: 'HeyGen', category: 'AI Video Generation', categoryId: 'ai-video', description: 'Best lip-sync and multilingual dubbing', status: 'available', price: 'paid', icon: '👄' },
  { id: 'synthesia', name: 'Synthesia', provider: 'Synthesia', category: 'AI Video Generation', categoryId: 'ai-video', description: 'Market leader for AI presenters', status: 'available', price: 'paid', icon: '🧑‍💼' },

  // ── PAID: AI Audio ──────────────────────────────────────────────
  { id: 'elevenlabs', name: 'ElevenLabs', provider: 'ElevenLabs', category: 'AI Audio & Voice', categoryId: 'ai-audio', description: 'Most natural and expressive voice cloning', status: 'available', price: 'paid', icon: '🗣️', docsUrl: 'https://elevenlabs.io/docs' },
  { id: 'suno', name: 'Suno', provider: 'Suno', category: 'AI Audio & Voice', categoryId: 'ai-audio', description: 'Best at creating complete songs with vocals', status: 'available', price: 'paid', icon: '🎶' },
  { id: 'whisper-api', name: 'Whisper API', provider: 'OpenAI', category: 'AI Audio & Voice', categoryId: 'ai-audio', description: 'Best multilingual transcription', status: 'live', price: 'usage-based', icon: '🎙️', wavultUsage: 'Via OpenClaw (Bernt)' },
  { id: 'assemblyai', name: 'AssemblyAI', provider: 'AssemblyAI', category: 'AI Audio & Voice', categoryId: 'ai-audio', description: 'Most accurate speaker diarization', status: 'available', price: 'paid', icon: '📝' },
  { id: 'deepgram', name: 'Deepgram', provider: 'Deepgram', category: 'AI Audio & Voice', categoryId: 'ai-audio', description: 'Fastest for real-time transcription', status: 'available', price: 'paid', icon: '🔊' },

  // ── PAID: AI Language ───────────────────────────────────────────
  { id: 'openai', name: 'OpenAI GPT', provider: 'OpenAI', category: 'AI Language Models', categoryId: 'ai-language', description: 'Most versatile and reliable language model', status: 'live', price: 'usage-based', icon: '🤖', wavultUsage: 'Via OpenClaw (default model)', docsUrl: 'https://platform.openai.com/docs' },
  { id: 'anthropic', name: 'Claude (Anthropic)', provider: 'Anthropic', category: 'AI Language Models', categoryId: 'ai-language', description: 'Best for code generation and safety', status: 'live', price: 'usage-based', icon: '🧠', wavultUsage: 'Via OpenClaw (Bernt) — primary LLM', docsUrl: 'https://docs.anthropic.com' },
  { id: 'google-gemini', name: 'Google Gemini', provider: 'Google', category: 'AI Language Models', categoryId: 'ai-language', description: 'Best multimodal understanding and long contexts', status: 'live', price: 'usage-based', icon: '💫', wavultUsage: 'Via OpenClaw (Bernt)', docsUrl: 'https://ai.google.dev/docs' },
  { id: 'meta-llama', name: 'Meta Llama 3', provider: 'Meta', category: 'AI Language Models', categoryId: 'ai-language', description: 'Best open source model for self-hosting', status: 'available', price: 'paid', icon: '🦙' },
  { id: 'mistral', name: 'Mistral / Mixtral', provider: 'Mistral AI', category: 'AI Language Models', categoryId: 'ai-language', description: 'Fastest for its quality level', status: 'available', price: 'paid', icon: '🌪️' },
  { id: 'deepseek', name: 'DeepSeek', provider: 'DeepSeek', category: 'AI Language Models', categoryId: 'ai-language', description: 'Superior at math and logic', status: 'available', price: 'paid', icon: '🔭' },
  { id: 'groq', name: 'Groq', provider: 'Groq', category: 'AI Language Models', categoryId: 'ai-language', description: 'Fastest inference with LPU hardware', status: 'available', price: 'paid', icon: '⚡' },

  // ── PAID: Payments ──────────────────────────────────────────────
  { id: 'stripe-paid', name: 'Stripe', provider: 'Stripe', category: 'Payments & Billing', categoryId: 'payments', description: 'Best developer experience and documentation', status: 'live', price: 'usage-based', icon: '💳', wavultUsage: 'Betalningprocessering', docsUrl: 'https://stripe.com/docs' },
  { id: 'paypal', name: 'PayPal', provider: 'PayPal', category: 'Payments & Billing', categoryId: 'payments', description: 'Highest consumer trust globally', status: 'available', price: 'paid', icon: '🅿️' },
  { id: 'adyen', name: 'Adyen', provider: 'Adyen', category: 'Payments & Billing', categoryId: 'payments', description: 'Most global payment methods in one platform', status: 'available', price: 'paid', icon: '🌐' },
  { id: 'klarna', name: 'Klarna', provider: 'Klarna', category: 'Payments & Billing', categoryId: 'payments', description: 'Highest conversion with installments', status: 'available', price: 'paid', icon: '🛍️' },
  { id: 'revolut-paid', name: 'Revolut Business', provider: 'Revolut', category: 'Payments & Billing', categoryId: 'payments', description: 'Best for multi-currency business accounts', status: 'live', price: 'usage-based', icon: '🏦', wavultUsage: 'Valutahantering och betalningar', docsUrl: 'https://developer.revolut.com' },
  { id: 'wise', name: 'Wise', provider: 'Wise', category: 'Payments & Billing', categoryId: 'payments', description: 'Lowest fees for international transfers', status: 'available', price: 'paid', icon: '💸' },
  { id: 'mollie', name: 'Mollie', provider: 'Mollie', category: 'Payments & Billing', categoryId: 'payments', description: 'Best support for European payment methods', status: 'available', price: 'paid', icon: '🇪🇺' },

  // ── PAID: Commerce ──────────────────────────────────────────────
  { id: 'shopify', name: 'Shopify', provider: 'Shopify', category: 'Commerce & Enterprise', categoryId: 'commerce', description: 'Fastest to get started with e-commerce', status: 'available', price: 'paid', icon: '🛒' },
  { id: 'salesforce', name: 'Salesforce', provider: 'Salesforce', category: 'Commerce & Enterprise', categoryId: 'commerce', description: 'Most powerful CRM for enterprise', status: 'available', price: 'paid', icon: '☁️' },
  { id: 'hubspot', name: 'HubSpot', provider: 'HubSpot', category: 'Commerce & Enterprise', categoryId: 'commerce', description: 'Best free CRM with marketing automation', status: 'available', price: 'paid', icon: '🧲' },
  { id: 'zendesk', name: 'Zendesk', provider: 'Zendesk', category: 'Commerce & Enterprise', categoryId: 'commerce', description: 'Most scalable customer support platform', status: 'available', price: 'paid', icon: '🎧' },
  { id: 'slack', name: 'Slack', provider: 'Salesforce', category: 'Commerce & Enterprise', categoryId: 'commerce', description: 'Best for team communication and integrations', status: 'available', price: 'paid', icon: '💬' },
  { id: 'notion', name: 'Notion', provider: 'Notion', category: 'Commerce & Enterprise', categoryId: 'commerce', description: 'Best for internal wikis and documentation', status: 'available', price: 'paid', icon: '📋' },

  // ── PAID: Infrastructure ────────────────────────────────────────
  { id: 'aws-paid', name: 'AWS', provider: 'Amazon', category: 'Infrastructure & Cloud', categoryId: 'infrastructure', description: 'Most comprehensive service offering globally', status: 'live', price: 'usage-based', icon: '☁️', wavultUsage: 'ECS, S3, eu-north-1', docsUrl: 'https://docs.aws.amazon.com' },
  { id: 'gcp', name: 'Google Cloud', provider: 'Google', category: 'Infrastructure & Cloud', categoryId: 'infrastructure', description: 'Best for AI/ML and data analytics', status: 'available', price: 'paid', icon: '🔷' },
  { id: 'azure', name: 'Azure', provider: 'Microsoft', category: 'Infrastructure & Cloud', categoryId: 'infrastructure', description: 'Best integration with Microsoft ecosystem', status: 'available', price: 'paid', icon: '🔵' },
  { id: 'cloudflare-paid', name: 'Cloudflare', provider: 'Cloudflare', category: 'Infrastructure & Cloud', categoryId: 'infrastructure', description: 'Fastest global edge network', status: 'live', price: 'usage-based', icon: '🌐', wavultUsage: 'DNS, Pages, Workers', docsUrl: 'https://developers.cloudflare.com' },
  { id: 'vercel', name: 'Vercel', provider: 'Vercel', category: 'Infrastructure & Cloud', categoryId: 'infrastructure', description: 'Best for Next.js and React applications', status: 'configured', price: 'paid', icon: '▲', wavultUsage: 'evasvensson.se' },
  { id: 'supabase-paid', name: 'Supabase', provider: 'Supabase', category: 'Infrastructure & Cloud', categoryId: 'infrastructure', description: 'Fastest for full-stack prototypes', status: 'live', price: 'usage-based', icon: '🗄️', wavultUsage: 'Primär databas', docsUrl: 'https://supabase.com/docs' },

  // ── PAID: Developer Tools ───────────────────────────────────────
  { id: 'github', name: 'GitHub', provider: 'Microsoft', category: 'Developer Tools', categoryId: 'developer', description: 'Largest community and most integrations', status: 'live', price: 'usage-based', icon: '🐙', wavultUsage: 'Alla repos, GitHub Actions CI/CD', docsUrl: 'https://docs.github.com' },
  { id: 'datadog', name: 'Datadog', provider: 'Datadog', category: 'Developer Tools', categoryId: 'developer', description: 'Most comprehensive observability platform', status: 'available', price: 'paid', icon: '🐕' },
  { id: 'sentry', name: 'Sentry', provider: 'Sentry', category: 'Developer Tools', categoryId: 'developer', description: 'Best at tracing errors to code', status: 'available', price: 'paid', icon: '🔍' },
  { id: 'postman', name: 'Postman', provider: 'Postman', category: 'Developer Tools', categoryId: 'developer', description: 'Largest API library and documentation', status: 'available', price: 'free', icon: '📮' },
  { id: 'grafana', name: 'Grafana', provider: 'Grafana Labs', category: 'Developer Tools', categoryId: 'developer', description: 'Best open-source dashboards', status: 'available', price: 'free', icon: '📊' },

  // ── PAID: Shipping ──────────────────────────────────────────────
  { id: 'fedex', name: 'FedEx', provider: 'FedEx', category: 'Shipping & Logistics', categoryId: 'shipping', description: 'Fastest for international express shipping', status: 'planned', price: 'paid', icon: '📦' },
  { id: 'dhl', name: 'DHL', provider: 'DHL', category: 'Shipping & Logistics', categoryId: 'shipping', description: 'Largest global network', status: 'planned', price: 'paid', icon: '🚛' },
  { id: 'postnord', name: 'PostNord', provider: 'PostNord', category: 'Shipping & Logistics', categoryId: 'shipping', description: 'Best for Nordic markets', status: 'planned', price: 'paid', icon: '📫' },
  { id: 'shipstation', name: 'ShipStation', provider: 'ShipStation', category: 'Shipping & Logistics', categoryId: 'shipping', description: 'Best for multi-channel order management', status: 'planned', price: 'paid', icon: '🚢' },

  // ── PAID: Email & Marketing ─────────────────────────────────────
  { id: 'sendgrid', name: 'SendGrid', provider: 'Twilio', category: 'Email & Marketing', categoryId: 'email-marketing', description: 'Best for high volume transactional emails', status: 'available', price: 'paid', icon: '📬' },
  { id: 'mailchimp', name: 'Mailchimp', provider: 'Intuit', category: 'Email & Marketing', categoryId: 'email-marketing', description: 'Easiest for marketing beginners', status: 'available', price: 'paid', icon: '🐒' },
  { id: 'postmark', name: 'Postmark', provider: 'Wildbit', category: 'Email & Marketing', categoryId: 'email-marketing', description: 'Highest deliverability for transactional emails', status: 'available', price: 'paid', icon: '✉️' },
  { id: 'resend', name: 'Resend', provider: 'Resend', category: 'Email & Marketing', categoryId: 'email-marketing', description: 'Best DX for modern email', status: 'available', price: 'paid', icon: '🔄' },
  { id: 'loopia-smtp', name: 'Loopia SMTP', provider: 'Loopia', category: 'Email & Marketing', categoryId: 'email-marketing', description: 'Swedish email hosting — mailout.loopia.se', status: 'live', price: 'paid', icon: '📧', wavultUsage: 'Transaktionsmejl från erik@hypbit.com' },

  // ── PAID: Analytics ─────────────────────────────────────────────
  { id: 'google-analytics', name: 'Google Analytics', provider: 'Google', category: 'Analytics & Data', categoryId: 'analytics', description: 'Free and most widely used analytics', status: 'available', price: 'free', icon: '📈' },
  { id: 'mixpanel', name: 'Mixpanel', provider: 'Mixpanel', category: 'Analytics & Data', categoryId: 'analytics', description: 'Best for event-based product analytics', status: 'available', price: 'paid', icon: '🔢' },
  { id: 'posthog', name: 'PostHog', provider: 'PostHog', category: 'Analytics & Data', categoryId: 'analytics', description: 'Best all-in-one open source analytics', status: 'available', price: 'free', icon: '🦔' },
  { id: 'plausible', name: 'Plausible', provider: 'Plausible', category: 'Analytics & Data', categoryId: 'analytics', description: 'Best GDPR-friendly alternative', status: 'available', price: 'paid', icon: '🔒' },

  // ── PAID: Communication ─────────────────────────────────────────
  { id: 'twilio', name: 'Twilio', provider: 'Twilio', category: 'Communication & Messaging', categoryId: 'communication', description: 'Largest selection of communication APIs', status: 'available', price: 'paid', icon: '📞', docsUrl: 'https://www.twilio.com/docs' },
  { id: 'whatsapp-business', name: 'WhatsApp Business', provider: 'Meta', category: 'Communication & Messaging', categoryId: 'communication', description: 'Highest engagement of all channels', status: 'available', price: 'paid', icon: '💬' },
  { id: 'telegram-bot', name: 'Telegram Bot API', provider: 'Telegram', category: 'Communication & Messaging', categoryId: 'communication', description: 'Most flexible bot platform', status: 'live', price: 'free', icon: '✈️', wavultUsage: 'OpenClaw (Bernt) Telegram-integration', docsUrl: 'https://core.telegram.org/bots/api' },
  { id: 'discord-bot', name: 'Discord', provider: 'Discord', category: 'Communication & Messaging', categoryId: 'communication', description: 'Best for community building', status: 'available', price: 'free', icon: '🎮' },
  { id: 'sinch', name: 'Sinch', provider: 'Sinch', category: 'Communication & Messaging', categoryId: 'communication', description: 'Best for carrier-grade voice', status: 'available', price: 'paid', icon: '☎️' },
  { id: 'elks-46', name: '46elks', provider: '46elks', category: 'Communication & Messaging', categoryId: 'communication', description: 'Swedish SMS & Voice API', status: 'live', price: 'usage-based', icon: '🦌', wavultUsage: 'SMS-notifieringar', docsUrl: 'https://46elks.com/docs' },
  { id: 'pusher', name: 'Pusher', provider: 'Pusher', category: 'Communication & Messaging', categoryId: 'communication', description: 'Best for real-time notifications', status: 'available', price: 'paid', icon: '📡' },

  // ── PAID: Maps ──────────────────────────────────────────────────
  { id: 'mapbox', name: 'Mapbox', provider: 'Mapbox', category: 'Maps & Geodata', categoryId: 'maps-geodata', description: 'Most customizable maps with best design tools', status: 'planned', price: 'paid', icon: '🗺️', wavultUsage: 'QuixZoom karta — fas 2' },
  { id: 'google-maps', name: 'Google Maps', provider: 'Google', category: 'Maps & Geodata', categoryId: 'maps-geodata', description: 'Largest coverage and most accurate data', status: 'available', price: 'paid', icon: '📍' },
  { id: 'here-maps', name: 'HERE', provider: 'HERE', category: 'Maps & Geodata', categoryId: 'maps-geodata', description: 'Best for automotive and logistics', status: 'available', price: 'paid', icon: '🚗' },
  { id: 'openstreetmap', name: 'OpenStreetMap', provider: 'OSM Foundation', category: 'Maps & Geodata', categoryId: 'maps-geodata', description: 'Free and community-maintained', status: 'available', price: 'free', icon: '🌍' },

  // ── PAID: Identity ──────────────────────────────────────────────
  { id: 'onfido', name: 'Onfido', provider: 'Onfido', category: 'Identity & Verification', categoryId: 'identity-verification', description: 'Best AI-powered document verification', status: 'available', price: 'paid', icon: '🪪' },
  { id: 'sumsub', name: 'Sumsub', provider: 'Sumsub', category: 'Identity & Verification', categoryId: 'identity-verification', description: 'Best all-in-one compliance platform (KYC/AML)', status: 'available', price: 'paid', icon: '🛡️' },
  { id: 'auth0', name: 'Auth0', provider: 'Okta', category: 'Identity & Verification', categoryId: 'identity-verification', description: 'Best developer experience for auth', status: 'available', price: 'paid', icon: '🔐' },
  { id: 'clerk', name: 'Clerk', provider: 'Clerk', category: 'Identity & Verification', categoryId: 'identity-verification', description: 'Best for modern web apps', status: 'available', price: 'paid', icon: '👤' },

  // ── PAID: Finance data ──────────────────────────────────────────
  { id: 'plaid', name: 'Plaid', provider: 'Plaid', category: 'Finance & Banking', categoryId: 'finance-data', description: 'Largest bank coverage in North America', status: 'available', price: 'paid', icon: '🏦' },
  { id: 'tink', name: 'Tink', provider: 'Tink (Visa)', category: 'Finance & Banking', categoryId: 'finance-data', description: 'Best for European open banking', status: 'available', price: 'paid', icon: '🔗' },
  { id: 'nordigen', name: 'Nordigen', provider: 'GoCardless', category: 'Finance & Banking', categoryId: 'finance-data', description: 'Free open banking API in Europe', status: 'available', price: 'free', icon: '🏢' },

  // ── PAID: Travel ────────────────────────────────────────────────
  { id: 'amadeus', name: 'Amadeus', provider: 'Amadeus', category: 'Travel & Booking', categoryId: 'travel-booking', description: 'Largest GDS with most airline connections', status: 'available', price: 'paid', icon: '✈️' },
  { id: 'duffel', name: 'Duffel', provider: 'Duffel', category: 'Travel & Booking', categoryId: 'travel-booking', description: 'Best developer experience for flights', status: 'available', price: 'paid', icon: '🎫' },
  { id: 'booking-com', name: 'Booking.com', provider: 'Booking Holdings', category: 'Travel & Booking', categoryId: 'travel-booking', description: 'Largest hotel inventory', status: 'available', price: 'paid', icon: '🏨' },

  // ── PAID: Blockchain ────────────────────────────────────────────
  { id: 'alchemy', name: 'Alchemy', provider: 'Alchemy', category: 'Blockchain & Crypto', categoryId: 'blockchain-crypto', description: 'Most reliable blockchain infrastructure', status: 'available', price: 'paid', icon: '⛓️' },
  { id: 'coinbase-commerce', name: 'Coinbase Commerce', provider: 'Coinbase', category: 'Blockchain & Crypto', categoryId: 'blockchain-crypto', description: 'Easiest crypto payment integration', status: 'available', price: 'paid', icon: '💰' },
]

// ─── Category metadata ─────────────────────────────────────────────────────
export const API_CATEGORIES: APICategory[] = [
  { id: 'all', name: 'Alla', icon: '🔌', description: 'Alla API-integrationer', price: 'free', count: API_INTEGRATIONS.length },
  { id: 'live', name: 'Live i Wavult', icon: '🟢', description: 'Aktivt konfigurerade i stacken', price: 'free', count: API_INTEGRATIONS.filter(i => i.status === 'live').length },
  { id: 'free-weather', name: 'Weather & Environment', icon: '🌤️', description: 'Weather forecasts and environmental data', price: 'free', count: 3 },
  { id: 'free-news', name: 'News & Media', icon: '📰', description: 'Breaking news from global sources', price: 'free', count: 2 },
  { id: 'free-finance', name: 'Finance & Economy (Free)', icon: '📈', description: 'Stock market and crypto data', price: 'free', count: 4 },
  { id: 'free-transport', name: 'Transport & Travel (Free)', icon: '✈️', description: 'Flight tracking and routing', price: 'free', count: 4 },
  { id: 'free-health', name: 'Health & Fitness', icon: '🏥', description: 'Nutrition and exercise data', price: 'free', count: 4 },
  { id: 'free-sports', name: 'Sports', icon: '⚽', description: 'Sports results and live scores', price: 'free', count: 2 },
  { id: 'free-food', name: 'Food & Recipes', icon: '🍽️', description: 'Recipes and ingredients', price: 'free', count: 2 },
  { id: 'free-entertainment', name: 'Entertainment', icon: '🎬', description: 'Movies, TV, books and anime', price: 'free', count: 4 },
  { id: 'free-fun', name: 'Fun & Misc', icon: '🎮', description: 'Memes, test data and random generators', price: 'free', count: 4 },
  { id: 'free-geo', name: 'Geo & Reference', icon: '🌍', description: 'Country data and space', price: 'free', count: 4 },
  { id: 'free-education', name: 'Education & Learning', icon: '📚', description: 'Encyclopedia and translation', price: 'free', count: 4 },
  { id: 'free-music', name: 'Music & Audio (Free)', icon: '🎵', description: 'Music data and lyrics', price: 'free', count: 4 },
  { id: 'ai-image', name: 'AI Image Generation', icon: '🎨', description: 'AI image generation models', price: 'paid', basePrice: 490, count: 8 },
  { id: 'ai-video', name: 'AI Video Generation', icon: '🎥', description: 'AI video generation models', price: 'paid', basePrice: 690, count: 5 },
  { id: 'ai-audio', name: 'AI Audio & Voice', icon: '🎙️', description: 'Voice synthesis and music generation', price: 'paid', basePrice: 390, count: 5 },
  { id: 'ai-language', name: 'AI Language Models', icon: '🤖', description: 'Large language model access', price: 'paid', basePrice: 590, count: 7 },
  { id: 'payments', name: 'Payments & Billing', icon: '💳', description: 'Payment processing integrations', price: 'paid', basePrice: 790, count: 7 },
  { id: 'commerce', name: 'Commerce & Enterprise', icon: '🛒', description: 'E-commerce and enterprise systems', price: 'paid', basePrice: 690, count: 6 },
  { id: 'infrastructure', name: 'Infrastructure & Cloud', icon: '☁️', description: 'Cloud infrastructure providers', price: 'paid', basePrice: 590, count: 6 },
  { id: 'developer', name: 'Developer Tools', icon: '🔧', description: 'Development platforms and observability', price: 'paid', basePrice: 390, count: 5 },
  { id: 'shipping', name: 'Shipping & Logistics', icon: '🚛', description: 'Shipping and fulfillment', price: 'paid', basePrice: 490, count: 4 },
  { id: 'email-marketing', name: 'Email & Marketing', icon: '📬', description: 'Email delivery and marketing automation', price: 'paid', basePrice: 390, count: 5 },
  { id: 'analytics', name: 'Analytics & Data', icon: '📊', description: 'Analytics and data platforms', price: 'paid', basePrice: 290, count: 4 },
  { id: 'communication', name: 'Communication & Messaging', icon: '💬', description: 'SMS, voice and messaging', price: 'paid', basePrice: 490, count: 7 },
  { id: 'maps-geodata', name: 'Maps & Geodata', icon: '🗺️', description: 'Mapping and location services', price: 'paid', basePrice: 390, count: 4 },
  { id: 'identity-verification', name: 'Identity & Verification', icon: '🪪', description: 'KYC, identity verification, fraud prevention', price: 'paid', basePrice: 690, count: 4 },
  { id: 'finance-data', name: 'Finance & Banking', icon: '🏦', description: 'Banking APIs and open banking', price: 'paid', basePrice: 990, count: 3 },
  { id: 'travel-booking', name: 'Travel & Booking', icon: '✈️', description: 'Flights, hotels and car rentals', price: 'paid', basePrice: 890, count: 3 },
  { id: 'blockchain-crypto', name: 'Blockchain & Crypto', icon: '⛓️', description: 'Wallet APIs and crypto payments', price: 'paid', basePrice: 590, count: 2 },
]

// ─── Static provider news (fallback) ──────────────────────────────────────
export interface ProviderNews {
  id: string
  provider: string
  title: string
  summary: string
  date: string
  category: string
  icon: string
  type: 'update' | 'deprecation' | 'new' | 'security'
}

export const STATIC_PROVIDER_NEWS: ProviderNews[] = [
  {
    id: 'news-1',
    provider: 'OpenAI',
    title: 'GPT-4o mini — snabbare och billigare',
    summary: 'OpenAI lanserade GPT-4o mini med 60% lägre kostnad och 2x snabbare inferens jämfört med GPT-4o.',
    date: '2026-03-20',
    category: 'AI Language Models',
    icon: '🤖',
    type: 'new',
  },
  {
    id: 'news-2',
    provider: 'Stripe',
    title: 'Stripe Tax nu tillgänglig i Sverige',
    summary: 'Automatisk momsberäkning och rapportering för svenska bolag via Stripe Tax API.',
    date: '2026-03-18',
    category: 'Payments & Billing',
    icon: '💳',
    type: 'new',
  },
  {
    id: 'news-3',
    provider: 'Supabase',
    title: 'Supabase Realtime v3 — 10x prestanda',
    summary: 'Ny realtime-motor med stöd för 100k+ concurrent connections per projekt.',
    date: '2026-03-15',
    category: 'Infrastructure & Cloud',
    icon: '🗄️',
    type: 'update',
  },
  {
    id: 'news-4',
    provider: 'Cloudflare',
    title: 'Workers AI — fler modeller tillgängliga',
    summary: 'Cloudflare Workers AI lade till Llama 3.3, Qwen 2.5 och Mistral v0.3 i edge-miljön.',
    date: '2026-03-14',
    category: 'Infrastructure & Cloud',
    icon: '🌐',
    type: 'new',
  },
  {
    id: 'news-5',
    provider: 'ElevenLabs',
    title: 'ElevenLabs Turbo v2.5 — lägre latens',
    summary: 'Turbo v2.5 erbjuder 50% lägre latens för realtidsröst — nu under 300ms first-byte.',
    date: '2026-03-12',
    category: 'AI Audio & Voice',
    icon: '🎙️',
    type: 'update',
  },
  {
    id: 'news-6',
    provider: 'GitHub',
    title: 'GitHub Copilot Enterprise — ny modell Claude 3.7',
    summary: 'GitHub Copilot Enterprise kan nu köra Claude 3.7 Sonnet som standard kodmodell.',
    date: '2026-03-10',
    category: 'Developer Tools',
    icon: '🐙',
    type: 'update',
  },
  {
    id: 'news-7',
    provider: 'Anthropic',
    title: 'Claude 3.7 Sonnet lanserat',
    summary: 'Claude 3.7 Sonnet sätter nytt rekord på SWE-bench coding benchmark med 70.3%.',
    date: '2026-02-24',
    category: 'AI Language Models',
    icon: '🧠',
    type: 'new',
  },
  {
    id: 'news-8',
    provider: 'Revolut',
    title: 'Revolut Business API v2 — bättre webhooks',
    summary: 'Ny API-version med förbättrade webhooks för betalningshändelser och saldo-uppdateringar.',
    date: '2026-02-20',
    category: 'Payments & Billing',
    icon: '🏦',
    type: 'update',
  },
  {
    id: 'news-9',
    provider: '46elks',
    title: '46elks lanserar MMS-stöd i Sverige',
    summary: 'Svenska 46elks lägger till MMS-meddelanden till sin SMS-API — stöd för bild och video.',
    date: '2026-02-15',
    category: 'Communication & Messaging',
    icon: '📱',
    type: 'new',
  },
  {
    id: 'news-10',
    provider: 'AWS',
    title: 'AWS Bedrock — fler AI-modeller i eu-north-1',
    summary: 'Amazon Bedrock expanderar till Stockholm-regionen med stöd för Claude, Llama och Titan.',
    date: '2026-02-10',
    category: 'Infrastructure & Cloud',
    icon: '☁️',
    type: 'new',
  },
]
