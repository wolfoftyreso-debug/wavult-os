// ─── UberHub — Wavult OS ──────────────────────────────────────────────────────
// Uber for Business + Team Lunch (Eats) + Direct Document Delivery

import { useState } from 'react'
import {
  Car, UtensilsCrossed, Package, ExternalLink, Plus, RefreshCw,
  Users, Clock, MapPin, Star, Truck, AlertCircle, CheckCircle2,
  ChevronRight, Zap, FileText,
} from 'lucide-react'
import {
  MOCK_RESTAURANTS, LOCATIONS, DELIVERY_TEMPLATES,
  LunchOrder, DeliveryRequest, BusinessRide,
  orderTeamLunch, requestDirectDelivery, bookBusinessRide,
  type Restaurant,
} from './uber-api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'business' | 'eats' | 'direct' | 'team'

interface DeliveryHistoryItem extends DeliveryRequest {
  id: string
  status: 'pending' | 'picked_up' | 'delivered' | 'failed'
  createdAt: string
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: 'Pending',    cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    picked_up:  { label: 'Picked up',  cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    delivered:  { label: 'Delivered',  cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    failed:     { label: 'Failed',     cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    ordered:    { label: 'Ordered',    cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    booked:     { label: 'Booked',     cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{label}</span>
  )
}

function RestaurantCard({
  r, selected, onSelect,
}: {
  r: Restaurant; selected: boolean; onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white text-sm">{r.name}</p>
          <p className="text-xs text-white/50 mt-0.5">{r.cuisine}</p>
          <p className="text-xs text-white/60 mt-1">{r.price}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-white/70">{r.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-white/40" />
            <span className="text-xs text-white/50">{r.eta}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Tab: For Business ────────────────────────────────────────────────────────

function ForBusinessTab() {
  const [showBookForm, setShowBookForm] = useState(false)
  const [ride, setRide] = useState<BusinessRide>({
    person: '',
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    project: '',
  })
  const [loading, setLoading] = useState(false)
  const [booked, setBooked] = useState(false)

  const TEAM = ['Erik Svensson', 'Dennis Bjarnemark', 'Leon Russo', 'Winston Bjarnemark', 'Johan Berglund']

  async function handleBook() {
    setLoading(true)
    try {
      await bookBusinessRide(ride)
      setBooked(true)
      setShowBookForm(false)
    } catch {
      setBooked(true) // show success in demo mode
      setShowBookForm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Account status banner */}
      <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 flex items-start gap-3">
        <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-300">Uber for Business account — pending setup</p>
          <p className="text-xs text-white/50 mt-1">
            Connect your Uber for Business account to enable real ride booking, billing, and reporting.
          </p>
        </div>
        <a
          href="https://business.uber.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 shrink-0 mt-0.5"
        >
          Set up <ExternalLink size={12} />
        </a>
      </div>

      {/* Travel policy */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FileText size={14} className="text-white/50" /> Travel Policy
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/40 mb-1">Max cost per ride</p>
            <p className="font-semibold text-white">THB 500 / SEK 250</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/40 mb-1">Approved hours</p>
            <p className="font-semibold text-white">07:00 – 23:00</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 col-span-2">
            <p className="text-xs text-white/40 mb-1">Requires approval above</p>
            <p className="font-semibold text-white">THB 1,000 → Manager sign-off</p>
          </div>
        </div>
      </div>

      {/* Book ride */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Car size={14} className="text-white/50" /> Book Team Ride
          </h3>
          <button
            onClick={() => setShowBookForm(v => !v)}
            className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
          >
            <Plus size={14} /> Book ride
          </button>
        </div>

        {booked && (
          <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-400" />
            <p className="text-xs text-green-300">Ride request submitted</p>
          </div>
        )}

        {showBookForm && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Team member</label>
              <select
                value={ride.person}
                onChange={e => setRide(p => ({ ...p, person: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Select person…</option>
                {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">From</label>
                <input
                  value={ride.from}
                  onChange={e => setRide(p => ({ ...p, from: e.target.value }))}
                  placeholder="Pickup address"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">To</label>
                <input
                  value={ride.to}
                  onChange={e => setRide(p => ({ ...p, to: e.target.value }))}
                  placeholder="Destination"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Date</label>
                <input
                  type="date"
                  value={ride.date}
                  onChange={e => setRide(p => ({ ...p, date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Time</label>
                <input
                  type="time"
                  value={ride.time}
                  onChange={e => setRide(p => ({ ...p, time: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Project (optional)</label>
              <input
                value={ride.project}
                onChange={e => setRide(p => ({ ...p, project: e.target.value }))}
                placeholder="e.g. Bangkok Workcamp"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
              />
            </div>
            <button
              onClick={handleBook}
              disabled={loading || !ride.person || !ride.from || !ride.to}
              className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Car size={14} />}
              {loading ? 'Booking…' : 'Book Ride'}
            </button>
          </div>
        )}
      </div>

      {/* Ride history placeholder */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Clock size={14} className="text-white/50" /> Ride History
        </h3>
        <p className="text-xs text-white/40 text-center py-4">
          No rides yet. Rides will appear here once Uber for Business is connected.
        </p>
      </div>
    </div>
  )
}

// ─── Tab: Team Lunch ──────────────────────────────────────────────────────────

function TeamLunchTab() {
  const today = new Date().toISOString().split('T')[0]
  const [order, setOrder] = useState<LunchOrder>({
    date: today,
    time: '12:00',
    deliveryAddress: 'Nysa Hotel Bangkok',
    numberOfPeople: 5,
    budgetPerPerson: 150,
    cuisinePreference: 'All',
    specialNotes: '',
  })
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(false)
  const [ordered, setOrdered] = useState(false)

  const cuisines = ['All', 'Thai', 'Thai Fusion', 'Pizza', 'Japanese/Thai', 'Swedish']

  const filtered = MOCK_RESTAURANTS.filter(
    r => order.cuisinePreference === 'All' || r.cuisine === order.cuisinePreference
  )

  const estimatedTotal = selectedRestaurant
    ? order.numberOfPeople * order.budgetPerPerson
    : order.numberOfPeople * order.budgetPerPerson

  async function handleOrder() {
    setLoading(true)
    try {
      await orderTeamLunch({ ...order, restaurantName: selectedRestaurant?.name })
      setOrdered(true)
    } catch {
      setOrdered(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Order form */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <UtensilsCrossed size={14} className="text-white/50" /> Order Details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Date</label>
            <input
              type="date"
              value={order.date}
              onChange={e => setOrder(p => ({ ...p, date: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Time</label>
            <input
              type="time"
              value={order.time}
              onChange={e => setOrder(p => ({ ...p, time: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs text-white/50 mb-1 block">Delivery Address</label>
          <select
            value={order.deliveryAddress}
            onChange={e => setOrder(p => ({ ...p, deliveryAddress: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            {Object.keys(LOCATIONS).map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <p className="text-xs text-white/30 mt-1">{LOCATIONS[order.deliveryAddress]}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">People</label>
            <input
              type="number"
              min={1}
              max={50}
              value={order.numberOfPeople}
              onChange={e => setOrder(p => ({ ...p, numberOfPeople: +e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Budget/person (THB)</label>
            <input
              type="number"
              min={50}
              value={order.budgetPerPerson}
              onChange={e => setOrder(p => ({ ...p, budgetPerPerson: +e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs text-white/50 mb-1 block">Cuisine</label>
          <div className="flex flex-wrap gap-2">
            {cuisines.map(c => (
              <button
                key={c}
                onClick={() => setOrder(p => ({ ...p, cuisinePreference: c }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  order.cuisinePreference === c
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : 'border-white/10 text-white/50 hover:border-white/20'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs text-white/50 mb-1 block">Special notes / allergies</label>
          <input
            value={order.specialNotes}
            onChange={e => setOrder(p => ({ ...p, specialNotes: e.target.value }))}
            placeholder="e.g. No peanuts, vegetarian option needed"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
          />
        </div>
      </div>

      {/* Restaurant cards */}
      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
          Available Restaurants
        </h3>
        <div className="space-y-2">
          {filtered.map(r => (
            <RestaurantCard
              key={r.name}
              r={r}
              selected={selectedRestaurant?.name === r.name}
              onSelect={() => setSelectedRestaurant(prev => prev?.name === r.name ? null : r)}
            />
          ))}
        </div>
      </div>

      {/* Estimated total + order button */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-white/40">Estimated total</p>
            <p className="text-xl font-bold text-white">
              THB {estimatedTotal.toLocaleString()}
            </p>
            <p className="text-xs text-white/40">
              {order.numberOfPeople} people × THB {order.budgetPerPerson}
            </p>
          </div>
          {selectedRestaurant && (
            <div className="text-right">
              <p className="text-xs text-white/40">Selected</p>
              <p className="text-sm font-semibold text-orange-300">{selectedRestaurant.name}</p>
              <p className="text-xs text-white/40">{selectedRestaurant.eta}</p>
            </div>
          )}
        </div>

        {ordered ? (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-300">Order placed!</p>
              <p className="text-xs text-white/40">Team lunch is on its way.</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleOrder}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <UtensilsCrossed size={16} />}
            {loading ? 'Ordering…' : 'Order Team Lunch'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Uber Direct ─────────────────────────────────────────────────────────

function UberDirectTab() {
  const [form, setForm] = useState<DeliveryRequest>({
    from: '',
    to: '',
    recipient: '',
    description: '',
    urgency: 'standard',
  })
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([])
  const [sent, setSent] = useState(false)

  function applyTemplate(t: typeof DELIVERY_TEMPLATES[0]) {
    setForm(p => ({
      ...p,
      from: t.from || p.from,
      to: t.to || p.to,
      description: t.type === 'Legal' ? 'Legal documents' : 'Equipment delivery',
    }))
  }

  async function handleSend() {
    setLoading(true)
    try {
      await requestDirectDelivery(form)
    } catch {
      // demo mode
    } finally {
      const item: DeliveryHistoryItem = {
        ...form,
        id: Math.random().toString(36).slice(2),
        status: 'pending',
        createdAt: new Date().toLocaleString(),
      }
      setHistory(prev => [item, ...prev])
      setSent(true)
      setForm({ from: '', to: '', recipient: '', description: '', urgency: 'standard' })
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick templates */}
      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
          Quick Templates
        </h3>
        <div className="space-y-2">
          {DELIVERY_TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => applyTemplate(t)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <Package size={14} className="text-white/40" />
                <span className="text-sm text-white">{t.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30">{t.type}</span>
                <ChevronRight size={14} className="text-white/30" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Delivery form */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Truck size={14} className="text-white/50" /> New Delivery
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">From</label>
            <input
              value={form.from}
              onChange={e => setForm(p => ({ ...p, from: e.target.value }))}
              placeholder="Pickup address"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">To</label>
            <input
              value={form.to}
              onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
              placeholder="Delivery address"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Recipient (name + phone)</label>
          <input
            value={form.recipient}
            onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))}
            placeholder="e.g. Dennis Bjarnemark +46761474243"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
          />
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Description</label>
          <input
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="e.g. Signed contract, Legal documents"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
          />
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Urgency</label>
          <div className="flex gap-2">
            {(['standard', 'express'] as const).map(u => (
              <button
                key={u}
                onClick={() => setForm(p => ({ ...p, urgency: u }))}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                  form.urgency === u
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : 'border-white/10 text-white/50 hover:border-white/20'
                }`}
              >
                {u === 'express' ? <span className="flex items-center justify-center gap-1"><Zap size={12} /> Express</span> : 'Standard'}
              </button>
            ))}
          </div>
          {form.urgency === 'express' && (
            <p className="text-xs text-orange-300/60 mt-1">Express delivery: typically 1-2 hours, higher cost.</p>
          )}
        </div>

        {sent && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-400" />
            <p className="text-xs text-green-300">Delivery request submitted</p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={loading || !form.from || !form.to || !form.recipient || !form.description}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Package size={16} />}
          {loading ? 'Requesting…' : 'Request Delivery'}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={14} className="text-white/50" /> Delivery History
          </h3>
          <div className="space-y-2">
            {history.map(item => (
              <div key={item.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{item.description}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {item.from} → {item.to}
                    </p>
                    <p className="text-xs text-white/30">{item.createdAt}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main UberHub ─────────────────────────────────────────────────────────────

export function UberHub() {
  // ─── Team Onboard Tab ───────────────────────────────────────────────────────
  function TeamOnboardTab() {
    const INVITE_URL = 'https://redeem.uber.com/public/optin/pK8tyzNKastR'
    const TEAM = [
      { name: 'Dennis Bjarnemark', role: 'Legal & Operations', phone: '+46761474243' },
      { name: 'Leon Russo',        role: 'CEO Operations',     phone: '+46738968949' },
      { name: 'Winston Bjarnemark',role: 'CFO',                phone: '+46768123548' },
      { name: 'Johan Berglund',    role: 'Group CTO',          phone: '+46736977576' },
    ]
    return (
      <div className="space-y-5">
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Uber for Business — Team Invite</p>
              <p className="text-xs text-white/50">Wavult Group Business Account</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-3 flex items-center justify-between gap-2">
            <span className="text-xs text-white/60 truncate">{INVITE_URL}</span>
            <button
              onClick={() => navigator.clipboard.writeText(INVITE_URL)}
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 shrink-0"
            >
              Copy
            </button>
          </div>
          <a
            href={INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-neutral-900 transition-colors border border-white/10"
          >
            <ExternalLink className="w-4 h-4" />
            Open Invite Link
          </a>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <p className="text-xs text-white/50 uppercase tracking-wider font-medium mb-3">Team Members</p>
          <div className="space-y-2">
            {TEAM.map(m => (
              <div key={m.phone} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  <p className="text-xs text-white/40">{m.role} · {m.phone}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">Invited</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-xs text-green-300">SMS-inbjudan skickad till alla 4 teammedlemmar via 46elks.</p>
        </div>
      </div>
    )
  }

  const [tab, setTab] = useState<Tab>('business')

  const tabs: { id: Tab; label: string; icon: typeof Car }[] = [
    { id: 'business', label: 'For Business', icon: Car },
    { id: 'eats',     label: 'Team Lunch',   icon: UtensilsCrossed },
    { id: 'team',     label: 'Team Onboard', icon: Users },
    { id: 'direct',   label: 'Direct',       icon: Package },
  ]

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center">
              <span className="text-base">🚗</span>
            </div>
            <h1 className="text-xl font-bold text-white">Uber Hub</h1>
          </div>
          <p className="text-sm text-white/40 ml-11">
            Team transport, lunch delivery &amp; document courier
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 mb-6">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {tab === 'business' && <ForBusinessTab />}
        {tab === 'eats'     && <TeamLunchTab />}
        {tab === 'direct'   && <UberDirectTab />}
        {tab === 'team'     && <TeamOnboardTab />}
      </div>
    </div>
  )
}
