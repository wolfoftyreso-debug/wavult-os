// ─── Wavult OS v2 — Duix API Proxy ──────────────────────────────────────────────
// Server-side proxy for Duix API calls. Handles:
//   1. Token refresh — Duix JWTs expire, this endpoint fetches fresh ones
//   2. Avatar creation — proxies createAvatar calls so client never holds the secret
//   3. Face clone — sends uploaded photo URL to Duix for digital human creation
//
// The client NEVER holds Duix credentials. All calls go through this proxy.
// Requires DUIX_APP_ID and DUIX_APP_SECRET in server env.

import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

const DUIX_API_BASE = "https://app.duix.ai/duix-openapi-v2/sdk/v2";
const DUIX_APP_ID = process.env.DUIX_APP_ID || "";
const DUIX_APP_SECRET = process.env.DUIX_APP_SECRET || "";

// ─── Token cache ─────────────────────────────────────────────────────────────

interface CachedToken {
  token: string;
  expiresAt: number; // Unix ms
}

let tokenCache: CachedToken | null = null;

async function getToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokenCache.token;
  }

  if (!DUIX_APP_ID || !DUIX_APP_SECRET) {
    throw new Error("DUIX_APP_ID and DUIX_APP_SECRET must be set");
  }

  // Fetch new token from Duix
  const res = await axios.post(
    `${DUIX_API_BASE}/getToken`,
    {
      appId: DUIX_APP_ID,
      appSecret: DUIX_APP_SECRET,
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    }
  );

  const data = res.data;
  if (!data?.data?.token) {
    throw new Error(`Duix token response invalid: ${JSON.stringify(data)}`);
  }

  // Parse expiry from JWT payload (middle segment, base64)
  let expiresAt = Date.now() + 2 * 60 * 60 * 1000; // Default 2h
  try {
    const payload = JSON.parse(
      Buffer.from(data.data.token.split(".")[1], "base64").toString()
    );
    if (payload.exp) {
      expiresAt = payload.exp * 1000;
    }
  } catch {
    // Use default expiry
  }

  tokenCache = { token: data.data.token, expiresAt };
  return tokenCache.token;
}

// ─── GET /api/duix/token ─────────────────────────────────────────────────────
// Returns a fresh Duix JWT for the client SDK.
// Client calls this on init and when token expires.

router.get("/token", async (_req: Request, res: Response) => {
  try {
    const token = await getToken();
    res.json({
      token,
      expiresAt: tokenCache?.expiresAt || Date.now() + 7200000,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[duix-proxy] Token fetch failed:", message);
    res.status(502).json({ error: "Failed to fetch Duix token", detail: message });
  }
});

// ─── POST /api/duix/create-avatar ────────────────────────────────────────────
// Creates a Duix avatar with face clone from an image URL.
// Body: { imageUrl, name, conversationId? }

router.post("/create-avatar", async (req: Request, res: Response) => {
  try {
    const { imageUrl, name, conversationId } = req.body;

    if (!imageUrl || !name) {
      res.status(400).json({ error: "imageUrl and name are required" });
      return;
    }

    const token = await getToken();
    const convId = conversationId || process.env.DUIX_CONVERSATION_ID || "";

    const duixRes = await axios.post(
      `${DUIX_API_BASE}/createAvatar`,
      {
        conversationId: convId,
        name,
        ttsName: "Marin",
        greetings: `Welcome back, ${name.split(" ")[0]}. Ready when you are.`,
        profile:
          "You are the Wavult OS operator interface. Present tasks and coaching concisely, like a mission controller.",
        faceUrl: imageUrl,
      },
      {
        headers: {
          "Content-Type": "application/json",
          token,
        },
        timeout: 30000,
      }
    );

    res.json({
      success: true,
      avatarId: duixRes.data?.data?.avatarId || duixRes.data?.data?.id || convId,
      data: duixRes.data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[duix-proxy] Create avatar failed:", message);
    res.status(502).json({ error: "Failed to create Duix avatar", detail: message });
  }
});

// ─── GET /api/duix/status ────────────────────────────────────────────────────
// Returns whether Duix is configured and token is valid.

router.get("/status", async (_req: Request, res: Response) => {
  const configured = Boolean(DUIX_APP_ID && DUIX_APP_SECRET);
  let tokenValid = false;

  if (configured && tokenCache && tokenCache.expiresAt > Date.now()) {
    tokenValid = true;
  } else if (configured) {
    try {
      await getToken();
      tokenValid = true;
    } catch {
      tokenValid = false;
    }
  }

  res.json({
    configured,
    tokenValid,
    conversationId: process.env.DUIX_CONVERSATION_ID || null,
  });
});

export default router;
