import { Router, Request, Response } from 'express'

const router = Router()
const DUFFEL_BASE = 'https://api.duffel.com'

// Duffel access token (set in SSM when live)
function getDuffelToken(): string {
  return process.env.DUFFEL_ACCESS_TOKEN || ''
}

async function duffelFetch(path: string, options: RequestInit = {}) {
  const token = getDuffelToken()
  const res = await fetch(`${DUFFEL_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Duffel-Version': 'v2',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Duffel API ${res.status}: ${err}`)
  }
  return res.json()
}

// POST /v1/flights/search
// Body: { origin, destination, date, passengers }
router.post('/v1/flights/search', async (req: Request, res: Response) => {
  const { origin, destination, date, passengers = 1 } = req.body

  if (!origin || !destination || !date) {
    return res.status(400).json({ error: 'origin, destination, date required' })
  }

  try {
    const offerRequest = await duffelFetch('/air/offer_requests', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          slices: [{ origin, destination, departure_date: date }],
          passengers: Array(Number(passengers)).fill({ type: 'adult' }),
          cabin_class: 'economy',
        },
      }),
    })

    const offerId = offerRequest.data?.id
    if (!offerId) return res.status(500).json({ error: 'No offer request ID' })

    // Get offers sorted by price
    const offers = await duffelFetch(
      `/air/offers?offer_request_id=${offerId}&limit=20&sort=total_amount`,
    )

    // Map to simplified format
    const flights = (offers.data || []).map((offer: any) => ({
      id: offer.id,
      price: offer.total_amount,
      currency: offer.total_currency,
      airline: offer.owner?.name,
      airline_iata: offer.owner?.iata_code,
      duration: offer.slices?.[0]?.duration,
      departure: offer.slices?.[0]?.segments?.[0]?.departing_at,
      arrival: offer.slices?.[0]?.segments?.slice(-1)[0]?.arriving_at,
      stops: (offer.slices?.[0]?.segments?.length || 1) - 1,
      segments: offer.slices?.[0]?.segments?.map((seg: any) => ({
        flight: `${seg.operating_carrier?.iata_code}${seg.operating_carrier_flight_number}`,
        from: seg.origin?.iata_code,
        to: seg.destination?.iata_code,
        dep: seg.departing_at,
        arr: seg.arriving_at,
      })),
    }))

    return res.json({ flights, total: flights.length })
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// POST /v1/flights/book
// Body: { offer_id, passengers (with names/documents) }
router.post('/v1/flights/book', async (req: Request, res: Response) => {
  const { offer_id, passengers } = req.body

  if (!offer_id || !passengers?.length) {
    return res.status(400).json({ error: 'offer_id and passengers required' })
  }

  try {
    const order = await duffelFetch('/air/orders', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'instant',
          selected_offers: [offer_id],
          passengers,
          payments: [
            {
              type: 'balance',
              currency: 'GBP',
              amount: '0', // overridden by offer price
            },
          ],
        },
      }),
    })

    return res.status(201).json({
      booking_reference: order.data?.booking_reference,
      order_id: order.data?.id,
      status: order.data?.payment_status?.awaiting_payment
        ? 'pending_payment'
        : 'confirmed',
    })
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

// GET /v1/flights/booking/:orderId
router.get('/v1/flights/booking/:orderId', async (req: Request, res: Response) => {
  try {
    const order = await duffelFetch(`/air/orders/${req.params.orderId}`)
    return res.json(order.data)
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

export default router
