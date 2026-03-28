const LINKS = [
  { label: 'quiXzoom App', url: 'https://dewrtqzc20flx.cloudfront.net', icon: '📍', sub: 'CloudFront · quiXzoom' },
  { label: 'Supabase', url: 'https://supabase.com/dashboard/project/lpeipzdmnnlbcoxlfhoe', icon: '🗄️', sub: 'hypbit project' },
  { label: 'AWS Console', url: 'https://eu-north-1.console.aws.amazon.com/ecs/v2/clusters/hypbit', icon: '☁️', sub: 'eu-north-1 · ECS' },
  { label: 'GitHub', url: 'https://github.com/wolfoftyreso-debug', icon: '🐙', sub: 'wolfoftyreso-debug' },
  { label: 'Cloudflare', url: 'https://dash.cloudflare.com', icon: '🔥', sub: 'Pages · DNS · Workers' },
  { label: 'Stripe', url: 'https://dashboard.stripe.com', icon: '💳', sub: 'Payments' },
]

export function QuickLinksWidget() {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-sm font-medium text-white/70">Snabblänkar</p>
      </div>
      <div className="grid grid-cols-3 gap-px bg-white/[0.06]">
        {LINKS.map(link => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 bg-[#0A0A1B] hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-xl">{link.icon}</span>
            <span className="text-xs text-white/50 text-center leading-tight">{link.label}</span>
            {'sub' in link && <span className="text-xs text-white/25 text-center leading-tight">{(link as { sub: string }).sub}</span>}
          </a>
        ))}
      </div>
    </div>
  )
}
