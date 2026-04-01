// ─── Uber API Integration Layer — Wavult OS ──────────────────────────────────
// All Uber API calls go through backend proxy at api.wavult.com
// Never expose secrets to frontend

export const UBER_CLIENT_ID = import.meta.env.VITE_UBER_CLIENT_ID || 'wayac2WIVVjqEj1BB6U5l2WFKgOS72ea'
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.wavult.com'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LunchOrder {
  date: string
  time: string
  deliveryAddress: string
  numberOfPeople: number
  budgetPerPerson: number
  cuisinePreference: string
  specialNotes: string
  restaurantName?: string
}

export interface DeliveryRequest {
  from: string
  to: string
  recipient: string
  description: string
  urgency: 'standard' | 'express'
  estimatedPrice?: number
}

export interface Restaurant {
  name: string
  cuisine: string
  rating: number
  eta: string
  price: string
}

export interface BusinessRide {
  person: string
  from: string
  to: string
  date: string
  time: string
  project?: string
}

export interface TravelPolicy {
  maxCostPerRide: number
  approvedHoursStart: number
  approvedHoursEnd: number
  requiresApproval: boolean
}

// ─── Mock data (fallback when API not configured) ─────────────────────────────

export const MOCK_RESTAURANTS: Restaurant[] = [
  { name: 'Som Tum Nua', cuisine: 'Thai', rating: 4.8, eta: '30-40 min', price: 'THB 150-250/person' },
  { name: 'Greyhound Café', cuisine: 'Thai Fusion', rating: 4.6, eta: '25-35 min', price: 'THB 200-350/person' },
  { name: 'The Pizza Company', cuisine: 'Pizza', rating: 4.3, eta: '20-30 min', price: 'THB 120-200/person' },
  { name: 'MK Gold Shabu', cuisine: 'Japanese/Thai', rating: 4.7, eta: '35-45 min', price: 'THB 250-400/person' },
]

export const LOCATIONS: Record<string, string> = {
  'Nysa Hotel Bangkok': 'Soi Sukhumvit 13, Khwaeng Khlong Toei Nuea, Bangkok',
  'Wavult Stockholm': 'Stockholm, Sweden',
}

export const DELIVERY_TEMPLATES = [
  { name: 'Send contract to Dennis', from: 'Erik (Wavult)', to: 'Dennis Bjarnemark', type: 'Legal' },
  { name: 'Send docs to notary', from: 'Erik (Wavult)', to: 'Notary Office', type: 'Legal' },
  { name: 'Send equipment to hotel', from: 'Erik (Wavult)', to: 'Nysa Hotel Bangkok', type: 'Equipment' },
]

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function uberEatsSearch(address: string, cuisineFilter?: string): Promise<{ restaurants: Restaurant[] }> {
  return fetch(`${API_BASE}/api/uber/eats/restaurants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, cuisine: cuisineFilter }),
  })
    .then(r => r.json())
    .catch(() => ({ restaurants: MOCK_RESTAURANTS }))
}

export async function orderTeamLunch(params: LunchOrder) {
  return fetch(`${API_BASE}/api/uber/eats/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).then(r => r.json())
}

export async function requestDirectDelivery(params: DeliveryRequest) {
  return fetch(`${API_BASE}/api/uber/direct/delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).then(r => r.json())
}

export async function bookBusinessRide(params: BusinessRide) {
  return fetch(`${API_BASE}/api/uber/business/ride`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).then(r => r.json())
}

export async function getBusinessRideHistory() {
  return fetch(`${API_BASE}/api/uber/business/rides`, {
    headers: { 'Content-Type': 'application/json' },
  })
    .then(r => r.json())
    .catch(() => ({ rides: [] }))
}
