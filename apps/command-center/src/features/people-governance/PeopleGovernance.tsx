// ─── People & Governance ─────────────────────────────────────────────────────
// DISC-profiler, hälsodata och teamöversikt

import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { DISC_PROFILES, HEALTH_DATA } from './pgData'
import { DISC_DESCRIPTIONS, type DISCType, type DISCProfile } from './pgTypes'

// ─── Person type ──────────────────────────────────────────────────────────────

interface Person {
  id: string
  name: string
  initials: string
  role: string
  color: string
  email: string
  phone?: string
  entityId: string
  startDate: string
  certifications: string[]
  isActive: boolean
}

// ─── Passport data ────────────────────────────────────────────────────────────

interface PassportInfo {
  hasPassport: boolean
  passportNumber?: string
  expiry?: string
  imageUrl?: string
  name?: string
}

const PASSPORT_DATA: Record<string, PassportInfo> = {
  'erik-svensson': {
    hasPassport: true,
    passportNumber: 'AA8190273',
    expiry: '2031-02-26',
  },
  'dennis-bjarnemark': {
    hasPassport: true,
    passportNumber: '—',
    expiry: '—',
  },
  'winston-bjarnemark': {
    hasPassport: true,
    passportNumber: '—',
    expiry: '—',
  },
  'johan-berglund': {
    hasPassport: true,
    passportNumber: 'AA8151040',
    expiry: '2031-02-23',
  },
  'leon-russo': {
    hasPassport: false,
  },
}

// ─── Team roster ──────────────────────────────────────────────────────────────

const PEOPLE: Person[] = [
  {
    id: 'erik-svensson',
    name: 'Erik Svensson',
    initials: 'ES',
    role: 'Chairman & Group CEO',
    color: '#8B5CF6',
    email: 'erik@wavult.com',
    phone: '+46709123223',
    entityId: 'Wavult Group',
    startDate: '2024-01-01',
    certifications: [],
    isActive: true,
  },
  {
    id: 'leon-russo',
    name: 'Leon Russo',
    initials: 'LR',
    role: 'CEO Wavult Operations',
    color: '#F59E0B',
    email: 'leon@wavult.com',
    phone: '+46738968949',
    entityId: 'Wavult Operations',
    startDate: '2024-03-01',
    certifications: [],
    isActive: true,
  },
  {
    id: 'dennis-bjarnemark',
    name: 'Dennis Bjarnemark',
    initials: 'DB',
    role: 'Board / Chief Legal',
    color: '#10B981',
    email: 'dennis@wavult.com',
    phone: '0761474243',
    entityId: 'Wavult Group',
    startDate: '2024-01-01',
    certifications: [],
    isActive: true,
  },
  {
    id: 'winston-bjarnemark',
    name: 'Winston Bjarnemark',
    initials: 'WB',
    role: 'CFO',
    color: '#3B82F6',
    email: 'winston@wavult.com',
    phone: '0768123548',
    entityId: 'Wavult Group',
    startDate: '2024-06-01',
    certifications: [],
    isActive: true,
  },
  {
    id: 'johan-berglund',
    name: 'Johan Berglund',
    initials: 'JB',
    role: 'Group CTO',
    color: '#06B6D4',
    email: 'johan@wavult.com',
    phone: '+46736977576',
    entityId: 'Wavult Group',
    startDate: '2024-02-01',
    certifications: [],
    isActive: true,
  },
]

// ─── Icons (inline SVG — no lucide-react dependency issues) ───────────────────

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function PassportIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h20v16H2z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M9 12c0-3 1.5-5 3-5s3 2 3 5-1.5 5-3 5-3-2-3-5z" />
      <path d="M9 12h6" />
    </svg>
  )
}

// ─── Person Detail Panel ───────────────────────────────────────────────────────

function PersonDetail({ person, discProfile, onClose }: {
  person: Person
  discProfile?: DISCProfile
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 420,
      background: '#FFFFFF', borderLeft: '1px solid rgba(0,0,0,0.1)',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.08)', zIndex: 100,
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: discProfile ? DISC_DESCRIPTIONS[discProfile.primary].color + '20' : '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700,
              color: discProfile ? DISC_DESCRIPTIONS[discProfile.primary].color : '#6B7280',
            }}>
              {person.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{person.name}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{person.role}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9CA3AF', padding: 4 }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Kontaktinfo */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Kontakt</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(
              [
                ['📧', person.email],
                ['📱', person.phone ?? '—'],
                ['🏢', person.entityId],
                ['📅', `Startdatum: ${person.startDate}`],
              ] as [string, string][]
            ).map(([icon, value]) => (
              <div key={`${icon}-${value}`} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: '#374151' }}>
                <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
                <span style={{ fontFamily: value.includes('@') || value.includes('+') ? 'monospace' : 'inherit' }}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* DISC */}
        {discProfile && (
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>DISC-profil</div>
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '16px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{DISC_DESCRIPTIONS[discProfile.primary].emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DISC_DESCRIPTIONS[discProfile.primary].color }}>
                    {DISC_DESCRIPTIONS[discProfile.primary].label}
                    {discProfile.secondary && ` + ${DISC_DESCRIPTIONS[discProfile.secondary].label}`}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{discProfile.teamRole}</div>
                </div>
              </div>
              {/* Score bars */}
              {(['D', 'I', 'S', 'C'] as const).map(type => {
                const d = DISC_DESCRIPTIONS[type]
                const score = discProfile.scores[type]
                return (
                  <div key={type} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: d.color }}>{type}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E8E93' }}>{score}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${score}%`, background: d.color, borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
              <div style={{ marginTop: 10, fontSize: 11, color: '#6B7280', fontStyle: 'italic', lineHeight: 1.5 }}>
                {discProfile.communicationStyle}
              </div>
              {/* Styrkor */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#059669', marginBottom: 4 }}>STYRKOR</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {discProfile.strengths.map(s => (
                    <span key={s} style={{ fontSize: 10, padding: '2px 7px', background: '#D1FAE5', color: '#065F46', borderRadius: 10 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* OKR / Prestationsdata */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>OKR Q2 2026</div>
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#6B7280' }}>
            Se Performance-fliken för detaljerade OKR och delivery rate.
          </div>
        </section>

        {/* Certifieringar */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Certifieringar</div>
          {person.certifications && person.certifications.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {person.certifications.map((c: string) => (
                <span key={c} style={{ fontSize: 11, padding: '3px 10px', background: '#EDE9FE', color: '#5B21B6', borderRadius: 10, fontWeight: 500 }}>{c}</span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Inga certifieringar ännu — se Academy</div>
          )}
        </section>

        {/* WHOOP Health Data */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            WHOOP — Hälsodata
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '16px' }}>
            {person.id === 'erik-svensson' ? (
              <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
                Koppla WHOOP under /whoop för att se hälsodata
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Recovery', value: '—', unit: '/100', color: '#6B7280' },
                  { label: 'Sömn', value: '—', unit: '%', color: '#6B7280' },
                  { label: 'HRV', value: '—', unit: 'ms', color: '#6B7280' },
                  { label: 'Strain', value: '—', unit: '/21', color: '#6B7280' },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: '#8E8E93' }}>{m.label} {m.unit}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: '#8E8E93', textAlign: 'center' }}>
              Senast uppdaterat: Koppla WHOOP via /whoop
            </div>
          </div>
        </section>

        {/* Status */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Status</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: person.isActive ? '#D1FAE5' : '#FEE2E2',
              color: person.isActive ? '#065F46' : '#991B1B',
            }}>
              {person.isActive ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
        </section>

      </div>
    </div>
  )
}

// ─── Person Card (Teamöversikt) ────────────────────────────────────────────────

function PersonCard({ person, onClick, onPassportClick }: {
  person: Person
  onClick: () => void
  onPassportClick: (info: PassportInfo & { name: string }) => void
}) {
  const disc = DISC_PROFILES.find(d => d.personId === person.id)
  const passData = PASSPORT_DATA[person.id]

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 14,
        padding: '16px 20px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: person.color + '22',
          border: `1px solid ${person.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: person.color, flexShrink: 0,
        }}>
          {person.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{person.name}</div>
          <div style={{ fontSize: 11, color: person.color, fontWeight: 600, marginTop: 1 }}>{person.role}</div>
        </div>
        {disc && (
          <div style={{
            padding: '3px 8px', borderRadius: 20,
            background: DISC_DESCRIPTIONS[disc.primary].color + '18',
            border: `1px solid ${DISC_DESCRIPTIONS[disc.primary].color}30`,
            fontSize: 11, fontWeight: 700,
            color: DISC_DESCRIPTIONS[disc.primary].color,
          }}>
            {disc.primary}{disc.secondary ? `+${disc.secondary}` : ''}
          </div>
        )}
        {/* Passport icon */}
        <button
          onClick={e => {
            e.stopPropagation()
            if (passData?.hasPassport) {
              onPassportClick({ ...passData, name: person.name })
            }
          }}
          title={passData?.hasPassport ? 'Visa pass-info' : 'Pass saknas'}
          style={{
            background: 'none', border: 'none',
            cursor: passData?.hasPassport ? 'pointer' : 'default',
            padding: 4, flexShrink: 0,
          }}
        >
          <PassportIcon color={passData?.hasPassport ? '#7C3AED' : '#D1D5DB'} />
        </button>
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#8E8E93' }}>
        Klicka för att se all info →
      </div>
    </div>
  )
}

// ─── Profiler Tab ──────────────────────────────────────────────────────────────

function ProfilerTab() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Team DISC-profiler</h2>
        <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>
          Kommunikationsstilar, styrkor och teamroller för hela core-teamet.
        </p>
      </div>

      {/* DISC legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {(['D', 'I', 'S', 'C'] as DISCType[]).map(type => {
          const d = DISC_DESCRIPTIONS[type]
          return (
            <div key={type} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 20,
              background: d.color + '15', border: `1px solid ${d.color}30`,
            }}>
              <span style={{ fontSize: 13 }}>{d.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: d.color }}>{type} — {d.label}</span>
            </div>
          )
        })}
      </div>

      {/* Profile cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {DISC_PROFILES.map(profile => {
          const person = PEOPLE.find(p => p.id === profile.personId)
          const primary = DISC_DESCRIPTIONS[profile.primary]
          return (
            <div key={profile.personId} style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {/* Person header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: primary.color + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {primary.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{person?.name || profile.personId}</div>
                  <div style={{ fontSize: 11, color: primary.color, fontWeight: 600 }}>
                    {primary.label}{profile.secondary ? ` + ${DISC_DESCRIPTIONS[profile.secondary].label}` : ''}
                  </div>
                </div>
              </div>

              {/* Score bars */}
              <div style={{ marginBottom: 14 }}>
                {(['D', 'I', 'S', 'C'] as DISCType[]).map(type => {
                  const d = DISC_DESCRIPTIONS[type]
                  const score = profile.scores[type]
                  return (
                    <div key={type} style={{ marginBottom: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: d.color }}>{type} · {d.label}</span>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8E8E93' }}>{score}</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${score}%`, background: d.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Description */}
              <div style={{ fontSize: 12, color: '#3C3C43CC', lineHeight: 1.6, marginBottom: 12 }}>
                {profile.description}
              </div>

              {/* Strengths */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8E8E93', marginBottom: 4, letterSpacing: '0.06em' }}>STYRKOR</div>
                {profile.strengths.map(s => (
                  <div key={s} style={{ fontSize: 11, color: '#1C1C1E', padding: '2px 0' }}>✓ {s}</div>
                ))}
              </div>

              {/* Challenges */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8E8E93', marginBottom: 4, letterSpacing: '0.06em' }}>UTMANINGAR</div>
                {profile.challenges.map(c => (
                  <div key={c} style={{ fontSize: 11, color: '#8E8E93', padding: '2px 0' }}>△ {c}</div>
                ))}
              </div>

              {/* Team role */}
              <div style={{
                fontSize: 11, color: '#8E8E93', fontStyle: 'italic',
                borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 10, marginTop: 10,
              }}>
                <strong style={{ color: '#3C3C43CC' }}>Teamroll:</strong> {profile.teamRole}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Hälsa Tab ────────────────────────────────────────────────────────────────

function HalsaTab() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Hälsodata & välmående</h2>
        <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>
          WHOOP-data och självrapporterade välmåendemätningar.
        </p>
      </div>

      {/* WHOOP connect CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
        borderRadius: 14, padding: 24, marginBottom: 20,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 32 }}>⌚</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>WHOOP Integration</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Koppla WHOOP för automatisk recovery, sömn och strain-data</div>
          </div>
        </div>
        <a
          href="/whoop"
          style={{
            display: 'inline-block', padding: '8px 16px',
            background: '#00C6FF', borderRadius: 8,
            fontSize: 12, fontWeight: 600, color: '#000',
            textDecoration: 'none',
          }}
        >
          Öppna WHOOP Dashboard →
        </a>
      </div>

      {/* Self-reported data */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8E8E93', marginBottom: 12 }}>
          Självrapporterad data
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {HEALTH_DATA.map(snap => {
            const person = PEOPLE.find(p => p.id === snap.personId)
            return (
              <div key={snap.personId + snap.date} style={{
                background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', marginBottom: 4 }}>
                  {person?.name || snap.personId}
                </div>
                <div style={{ fontSize: 10, color: '#8E8E93', marginBottom: 12 }}>{snap.date}</div>

                {snap.energyLevel !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#3C3C43CC' }}>⚡ Energi</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#FF9500' }}>{snap.energyLevel}/5</span>
                  </div>
                )}
                {snap.stressLevel !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#3C3C43CC' }}>🔥 Stress</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#FF3B30' }}>{snap.stressLevel}/5</span>
                  </div>
                )}
                {snap.motivationLevel !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#3C3C43CC' }}>🎯 Motivation</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#34C759' }}>{snap.motivationLevel}/5</span>
                  </div>
                )}

                {snap.note && (
                  <div style={{
                    marginTop: 10, fontSize: 10, color: '#8E8E93', fontStyle: 'italic',
                    borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8,
                  }}>
                    {snap.note}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PeopleGovernance() {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedPassport, setSelectedPassport] = useState<(PassportInfo & { name: string }) | null>(null)
  const { activeEntity } = useEntityScope()

  const selectedDisc = selectedPerson
    ? DISC_PROFILES.find(d => d.personId === selectedPerson.id)
    : undefined

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>People & Governance</h1>
        <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>
          Teamöversikt och hälsodata för {activeEntity.shortName} core-team. Klicka på en person för fullständig profil.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Teamstorlek', value: String(PEOPLE.length) },
          { label: 'Hälsosnaps', value: String(HEALTH_DATA.length) },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 12, padding: '14px 18px',
          }}>
            <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Section: Core Team */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#374151' }}>Core Team</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {PEOPLE.map(person => (
            <PersonCard
              key={person.id}
              person={person}
              onClick={() => setSelectedPerson(person)}
              onPassportClick={info => setSelectedPassport(info)}
            />
          ))}
        </div>
      </section>

      {/* Section: Hälsa */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hälsa & Välmående</h2>
        <HalsaTab />
      </section>

      {/* Person detail overlay */}
      {selectedPerson && (
        <>
          <div
            onClick={() => setSelectedPerson(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
              zIndex: 99, backdropFilter: 'blur(2px)',
            }}
          />
          <PersonDetail
            person={selectedPerson}
            discProfile={selectedDisc}
            onClose={() => setSelectedPerson(null)}
          />
        </>
      )}

      {/* Passport modal */}
      {selectedPassport && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setSelectedPassport(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '90%' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Pass — {selectedPassport.name}</h3>
              <button
                onClick={() => setSelectedPassport(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280' }}
              >×</button>
            </div>

            {/* Pass-info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {(
                [
                  ['Passnummer', selectedPassport.passportNumber || '—'],
                  ['Giltigt till', selectedPassport.expiry || '—'],
                  ['Nationalitet', 'Sverige'],
                  ['KYC-status', selectedPassport.hasPassport ? '✅ Verifierat' : '❌ Saknas'],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Secure storage note */}
            <div style={{
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534',
              display: 'flex', gap: 8,
            }}>
              <span>🔒</span>
              <span>Passdokumentet lagras krypterat i Identity Core. Bilder delas aldrig via mail eller okrypterade kanaler.</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
