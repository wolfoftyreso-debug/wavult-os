// ─── Team Map — Live teamkarta (Snapchat Maps-stil) ────────────────────────────
// Mapbox GL JS + Supabase realtime poll var 30s
// Visar teammedlemmar som avatar-bubblor på kartan

import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef, useState, useCallback } from 'react'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

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
    case 'offline': return '#6b7280'
    default: return '#6b7280'
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
    background: ${isOffline ? '#4b5563' : member.avatar_color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: white;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border: 3px solid ${isOffline ? '#374151' : 'white'};
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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [locations, setLocations] = useState<TeamLocation[]>([])
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

      // Build popup content
      const popupHtml = `
        <div style="
          background: #1f2937;
          color: #f9fafb;
          border-radius: 10px;
          padding: 12px 14px;
          min-width: 180px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 13px;
        ">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <div style="
              width:36px; height:36px; border-radius:50%;
              background:${member.status === 'offline' ? '#4b5563' : member.avatar_color};
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
                avatar_color: '#8B5CF6',
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
    <div className="relative w-full" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="rounded-lg bg-red-900/50 border border-red-700 p-6 max-w-sm text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Share location button */}
        <button
          onClick={shareLocation}
          disabled={sharingLocation}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-lg transition-all"
          style={{
            background: sharingLocation ? '#374151' : '#8B5CF6',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: sharingLocation ? 'not-allowed' : 'pointer',
          }}
        >
          {sharingLocation ? (
            <>
              <span className="animate-spin">⟳</span> Hämtar…
            </>
          ) : (
            <>📍 Dela min position</>
          )}
        </button>

        {/* Status switch */}
        <div
          className="flex rounded-lg overflow-hidden shadow-lg"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {(['active', 'away', 'offline'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setMyStatus(s)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                background: myStatus === s ? statusColor(s) : '#1f2937',
                color: myStatus === s ? 'white' : '#9ca3af',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s',
              }}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>

        {/* Center on team */}
        <button
          onClick={centerOnTeam}
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-lg"
          style={{
            background: '#1f2937',
            color: '#e5e7eb',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
          }}
        >
          🎯 Centrera på teamet
        </button>
      </div>

      {/* Bottom-left: status bar */}
      <div
        className="absolute bottom-8 left-4 z-10 flex items-center gap-3 rounded-lg px-3 py-2 text-xs"
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#9ca3af',
        }}
      >
        <span>
          {locations.length} teammedlemmar
        </span>
        <span>•</span>
        <span>
          {lastUpdated
            ? secondsAgo < 5
              ? 'Uppdaterad nyss'
              : `Uppdaterad: ${secondsAgo}s sedan`
            : 'Laddar…'}
        </span>
        <span>•</span>
        <span style={{ color: '#22c55e' }}>
          ● {locations.filter((l) => l.status === 'active').length} aktiva
        </span>
      </div>

      {/* Member list panel — bottom */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2 rounded-xl px-4 py-2 overflow-x-auto max-w-lg"
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {locations.map((member) => (
          <button
            key={member.id}
            onClick={() => {
              mapRef.current?.flyTo({
                center: [member.lng, member.lat],
                zoom: 12,
                duration: 800,
              })
              popupsRef.current.forEach((p) => p.remove())
              popupsRef.current.get(member.id)?.addTo(mapRef.current!)
            }}
            className="flex flex-col items-center gap-1 rounded-lg p-2 transition-all hover:bg-white/10"
            style={{ minWidth: '52px', cursor: 'pointer', background: 'transparent', border: 'none' }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: member.status === 'offline' ? '#4b5563' : member.avatar_color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: 'white',
                fontSize: 11,
                border: `2px solid ${statusColor(member.status)}`,
              }}
            >
              {member.avatar_initials}
            </div>
            <span style={{ color: '#e5e7eb', fontSize: 9, fontWeight: 600 }}>
              {member.full_name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
