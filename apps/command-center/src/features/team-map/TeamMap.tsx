// ─── Team Map — Live teamkarta (Snapchat Maps-stil) ────────────────────────────
// Mapbox GL JS + Supabase realtime poll var 30s
// Visar teammedlemmar som avatar-bubblor på kartan

import mapboxgl from 'mapbox-gl'
// mapbox CSS loaded conditionally
import { useEffect, useRef, useState, useCallback } from 'react'
import { useApi } from '../../shared/auth/useApi'
import { useTranslation } from '../../shared/i18n/useTranslation'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// ─── WHOOP Types ──────────────────────────────────────────────────────────────

interface WhoopMember {
  user_id: string
  full_name: string | null
  email: string | null
  recovery_score: number | null
  hrv: number | null
  sleep_performance: number | null
  strain_score: number | null
  snapshot_at: string | null
}

function recoveryColor(score: number | null): string {
  if (score == null) return '#6B7280'
  if (score > 66) return '#10B981'
  if (score > 33) return '#F59E0B'
  return '#EF4444'
}


// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamLocation {
  id: string
  user_id: string | null
  full_name: string
  avatar_initials: string
  avatar_color: string
  lat: number
  lng: number
  accuracy: number | null
  status: 'active' | 'away' | 'offline'
  last_seen: string
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchTeamLocations(): Promise<TeamLocation[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/team_locations?select=*&order=last_seen.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  )
  return res.ok ? res.json() : []
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return `${diff}s sedan`
  if (diff < 3600) return `${Math.floor(diff / 60)} min sedan`
  if (diff < 86400) return `${Math.floor(diff / 3600)} tim sedan`
  return `${Math.floor(diff / 86400)} dagar sedan`
}

function statusColor(status: string): string {
  switch (status) {
    case 'active': return '#22c55e'
    case 'away': return '#f59e0b'
    case 'offline': return '#9CA3AF'
    default: return '#9CA3AF'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Aktiv'
    case 'away': return 'Borta'
    case 'offline': return 'Offline'
    default: return status
  }
}

// ─── Custom marker element ────────────────────────────────────────────────────

function createMarkerElement(member: TeamLocation): HTMLElement {
  const isOffline = member.status === 'offline'
  const isActive = member.status === 'active'

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position: relative; width: 46px; height: 46px; cursor: pointer;'

  // Pulse ring for active members
  if (isActive) {
    const pulse = document.createElement('div')
    pulse.style.cssText = `
      position: absolute;
      top: -4px; left: -4px;
      width: 54px; height: 54px;
      border-radius: 50%;
      background: ${member.avatar_color}33;
      animation: teamMapPulse 2s ease-out infinite;
    `
    wrapper.appendChild(pulse)
  }

  // Avatar circle
  const avatar = document.createElement('div')
  avatar.style.cssText = `
    position: absolute;
    top: 3px; left: 3px;
    width: 40px; height: 40px;
    border-radius: 50%;
    background: ${isOffline ? '#6B7280' : member.avatar_color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: white;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border: 3px solid ${isOffline ? '#F3F4F6' : 'white'};
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    user-select: none;
    transition: transform 0.2s;
  `
  avatar.textContent = member.avatar_initials

  // Status dot
  const dot = document.createElement('div')
  dot.style.cssText = `
    position: absolute;
    bottom: 2px; right: 2px;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: ${statusColor(member.status)};
    border: 2px solid #111827;
  `

  wrapper.appendChild(avatar)
  wrapper.appendChild(dot)

  // Hover effect
  wrapper.addEventListener('mouseenter', () => {
    avatar.style.transform = 'scale(1.1)'
  })
  wrapper.addEventListener('mouseleave', () => {
    avatar.style.transform = 'scale(1)'
  })

  return wrapper
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamMap() {
  const { t: _t } = useTranslation() // ready for i18n
  const { apiFetch } = useApi()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [locations, setLocations] = useState<TeamLocation[]>([])
  const [whoopData, setWhoopData] = useState<Map<string, WhoopMember>>(new Map())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [sharingLocation, setSharingLocation] = useState(false)
  const [myStatus, setMyStatus] = useState<'active' | 'away' | 'offline'>('active')
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Inject CSS animation ─────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes teamMapPulse {
        0% { transform: scale(0.8); opacity: 0.8; }
        70% { transform: scale(1.4); opacity: 0; }
        100% { transform: scale(1.4); opacity: 0; }
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  // ── Hämta WHOOP-teamdata ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadWhoop() {
      try {
        const res = await apiFetch('/whoop/team')
        if (res.ok) {
          const data = await res.json()
          const map = new Map<string, WhoopMember>()
          for (const m of data.team ?? []) {
            map.set(m.full_name?.toLowerCase() ?? m.user_id, m)
          }
          setWhoopData(map)
        }
      } catch { /* WHOOP ej tillgängligt */ }
    }
    loadWhoop()
    const interval = setInterval(loadWhoop, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (!MAPBOX_TOKEN) {
      setError('Mapbox-token saknas. Kontrollera VITE_MAPBOX_TOKEN i .env.local')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [17.0, 59.0],
      zoom: 5,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    map.on('load', () => setMapReady(true))

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Update markers on map ────────────────────────────────────────────────
  const updateMarkers = useCallback((locs: TeamLocation[]) => {
    const map = mapRef.current
    if (!map) return

    const currentIds = new Set(locs.map((l) => l.id))

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
        popupsRef.current.get(id)?.remove()
        popupsRef.current.delete(id)
      }
    })

    // Upsert markers
    locs.forEach((member) => {
      const existing = markersRef.current.get(member.id)

      // Hitta WHOOP-data för denna person (matcha på namn)
      const whoopKey = member.full_name?.toLowerCase() ?? ''
      const whoop = whoopData.get(whoopKey)
      const recovery = whoop?.recovery_score ?? null
      const rColor = recoveryColor(recovery)
      // const rEmoji = recoveryEmoji(recovery)

      // Build popup content
      const popupHtml = `
        <div style="
          background: #1f2937;
          color: #f9fafb;
          border-radius: 10px;
          padding: 12px 14px;
          min-width: 200px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 13px;
        ">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <div style="
              width:36px; height:36px; border-radius:50%;
              background:${member.status === 'offline' ? '#6B7280' : member.avatar_color};
              display:flex; align-items:center; justify-content:center;
              font-weight:700; color:white; font-size:12px;
              flex-shrink:0;
            ">${member.avatar_initials}</div>
            <div>
              <div style="font-weight:600; font-size:14px;">${member.full_name}</div>
              <div style="color:${statusColor(member.status)}; font-size:11px; margin-top:2px;">
                ● ${statusLabel(member.status)}
              </div>
            </div>
          </div>
          ${whoop ? `
          <div style="border-top:1px solid #374151; padding-top:8px; margin-bottom:8px;">
            <div style="font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px;">⌚ WHOOP</div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; text-align:center;">
              <div style="background:#111827; border-radius:6px; padding:5px 3px;">
                <div style="font-size:15px; font-weight:700; color:${rColor};">${recovery != null ? Math.round(recovery)+'%' : '—'}</div>
                <div style="font-size:9px; color:#6b7280; margin-top:1px;">Recovery</div>
              </div>
              <div style="background:#111827; border-radius:6px; padding:5px 3px;">
                <div style="font-size:15px; font-weight:700; color:#818cf8;">${whoop.sleep_performance != null ? Math.round(whoop.sleep_performance)+'%' : '—'}</div>
                <div style="font-size:9px; color:#6b7280; margin-top:1px;">Sömn</div>
              </div>
              <div style="background:#111827; border-radius:6px; padding:5px 3px;">
                <div style="font-size:15px; font-weight:700; color:#f59e0b;">${whoop.strain_score != null ? Math.round(whoop.strain_score*10)/10 : '—'}</div>
                <div style="font-size:9px; color:#6b7280; margin-top:1px;">Strain</div>
              </div>
            </div>
          </div>
          ` : ''}
          <div style="color:#9ca3af; font-size:11px; border-top:1px solid #374151; padding-top:8px;">
            Senast sedd: ${timeAgo(member.last_seen)}
          </div>
        </div>
      `

      if (existing) {
        // Update position
        existing.setLngLat([member.lng, member.lat])

        // Update popup
        const popup = popupsRef.current.get(member.id)
        if (popup) popup.setHTML(popupHtml)

        // Refresh marker element (status may have changed)
        const el = createMarkerElement(member)
        el.addEventListener('click', () => {
          popupsRef.current.get(member.id)?.addTo(map)
        })
        existing.getElement().replaceWith(el)
        // Note: we can't replace element on existing marker, so remove and re-add
        existing.remove()
        markersRef.current.delete(member.id)
      }

      // Create new marker
      const el = createMarkerElement(member)
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 25,
        className: 'team-map-popup',
      }).setHTML(popupHtml)

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([member.lng, member.lat])
        .addTo(map)

      el.addEventListener('click', () => {
        // Close all other popups
        popupsRef.current.forEach((p) => p.remove())
        popup.addTo(map)
        map.flyTo({ center: [member.lng, member.lat], zoom: Math.max(map.getZoom(), 10), duration: 800 })
      })

      markersRef.current.set(member.id, marker)
      popupsRef.current.set(member.id, popup)
    })
  }, [])

  // ── Fetch + poll ─────────────────────────────────────────────────────────
  const loadLocations = useCallback(async () => {
    try {
      const locs = await fetchTeamLocations()
      setLocations(locs)
      setLastUpdated(new Date())
      setSecondsAgo(0)
      if (mapReady) updateMarkers(locs)
    } catch (err) {
      console.error('TeamMap fetch error:', err)
    }
  }, [mapReady, updateMarkers])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(loadLocations, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [loadLocations])

  // ── "Senast uppdaterad" ticker ────────────────────────────────────────────
  useEffect(() => {
    const ticker = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
      }
    }, 1000)
    return () => clearInterval(ticker)
  }, [lastUpdated])

  // ── Center on team ────────────────────────────────────────────────────────
  const centerOnTeam = useCallback(() => {
    const map = mapRef.current
    if (!map || locations.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    locations.forEach((l) => bounds.extend([l.lng, l.lat]))
    map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 1000 })
  }, [locations])

  // ── Share my location ─────────────────────────────────────────────────────
  const shareLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation stöds inte i denna webbläsare.')
      return
    }

    setSharingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        try {
          await fetch(
            `${SUPABASE_URL}/rest/v1/team_locations`,
            {
              method: 'POST',
              headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates',
              },
              body: JSON.stringify({
                full_name: 'Min position',
                avatar_initials: 'ME',
                avatar_color: '#2563EB',
                lat: latitude,
                lng: longitude,
                accuracy,
                status: myStatus,
                last_seen: new Date().toISOString(),
              }),
            }
          )
          await loadLocations()
        } catch (err) {
          console.error('Share location error:', err)
        } finally {
          setSharingLocation(false)
        }
      },
      (err) => {
        setSharingLocation(false)
        alert(`Kunde inte hämta position: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }, [myStatus, loadLocations])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Map container — full bleed */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Hide Mapbox logo & attribution — integrate into our UI */}
      <style>{`
        .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-ctrl-attrib { display: none !important; }
        .mapboxgl-ctrl-bottom-right { display: none !important; }
        .mapboxgl-ctrl-bottom-left { display: none !important; }
        .mapboxgl-ctrl-top-right { display: none !important; }
      `}</style>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <div className="rounded-xl bg-red-950/60 border border-red-800/40 p-6 max-w-sm text-center">
            <p className="text-red-700 text-sm font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Top controls — integrated pill */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Status switch */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ background: 'rgba(7,8,15,0.80)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['active', 'away', 'offline'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setMyStatus(s)}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                background: myStatus === s ? statusColor(s) + '22' : 'transparent',
                color: myStatus === s ? statusColor(s) : '#9CA3AF',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s',
              }}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>

        {/* Center on team */}
        <button
          onClick={centerOnTeam}
          style={{
            background: 'rgba(7,8,15,0.80)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#FFFFFF',
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Centrera
        </button>

        {/* Share location */}
        <button
          onClick={shareLocation}
          disabled={sharingLocation}
          style={{
            background: sharingLocation ? 'rgba(55,65,81,0.80)' : 'rgba(139,92,246,0.90)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'white',
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            cursor: sharingLocation ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {sharingLocation ? 'Hämtar…' : 'Dela position'}
        </button>
      </div>

      {/* Bottom bar — status + members — full width integrated */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2"
        style={{
          background: 'rgba(7,8,15,0.88)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Status info */}
        <div className="flex items-center gap-3 text-xs font-mono text-gray-9000 shrink-0">
          <span className="text-text-primary font-semibold">{locations.length}</span>
          <span>online</span>
          <span className="text-gray-600">·</span>
          <span style={{ color: '#22c55e' }}>{locations.filter((l) => l.status === 'active').length} aktiva</span>
          <span className="text-gray-600">·</span>
          <span>
            {lastUpdated
              ? secondsAgo < 5 ? 'live' : `${secondsAgo}s`
              : '…'}
          </span>
        </div>

        {/* Member avatars */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {locations.map((member) => (
            <button
              key={member.id}
              onClick={() => {
                mapRef.current?.flyTo({ center: [member.lng, member.lat], zoom: 12, duration: 800 })
                popupsRef.current.forEach((p) => p.remove())
                popupsRef.current.get(member.id)?.addTo(mapRef.current!)
              }}
              title={member.full_name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: member.status === 'offline' ? '#F3F4F6' : member.avatar_color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: 'white',
                  fontSize: 10,
                  border: `2px solid ${statusColor(member.status)}`,
                  boxShadow: member.status === 'active' ? `0 0 6px ${statusColor(member.status)}66` : 'none',
                }}
              >
                {member.avatar_initials}
              </div>
              <span style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 500, letterSpacing: '0.01em' }}>
                {member.full_name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Mapbox attribution — minimal, integrated */}
        <span className="text-gray-600 font-mono text-[9px] shrink-0 ml-2">
          © Mapbox · OSM
        </span>
      </div>
    </div>
  )
}
