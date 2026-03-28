/**
 * WHOOP Store — Supabase-operationer för WHOOP-integration
 *
 * Hanterar tokens (whoop_connections) och snapshots (whoop_snapshots).
 */

import { supabase } from '../supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhoopTokenRecord {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  whoop_user_id: string | null;
  connected_at: string;
}

export interface WhoopSnapshotData {
  recovery_score?: number | null;
  hrv?: number | null;
  resting_hr?: number | null;
  sleep_performance?: number | null;
  sleep_hours?: number | null;
  strain_score?: number | null;
}

// ─── Token operations ─────────────────────────────────────────────────────────

export async function saveWhoopTokens(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token?: string | null;
    expires_at?: string | null;
    whoop_user_id?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('whoop_connections')
    .upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: tokens.expires_at ?? null,
        whoop_user_id: tokens.whoop_user_id ?? null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[WHOOP Store] saveWhoopTokens error:', error.message);
  }
}

export async function getWhoopTokens(userId: string): Promise<WhoopTokenRecord | null> {
  const { data, error } = await supabase
    .from('whoop_connections')
    .select('access_token, refresh_token, expires_at, whoop_user_id, connected_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[WHOOP Store] getWhoopTokens error:', error.message);
    return null;
  }

  return data as WhoopTokenRecord | null;
}

export async function deleteWhoopTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from('whoop_connections')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[WHOOP Store] deleteWhoopTokens error:', error.message);
  }
}

// ─── Snapshot operations ──────────────────────────────────────────────────────

export async function saveWhoopSnapshot(
  userId: string,
  data: WhoopSnapshotData
): Promise<void> {
  const { error } = await supabase.from('whoop_snapshots').insert({
    user_id: userId,
    recovery_score: data.recovery_score ?? null,
    hrv: data.hrv ?? null,
    resting_hr: data.resting_hr ?? null,
    sleep_performance: data.sleep_performance ?? null,
    sleep_hours: data.sleep_hours ?? null,
    strain_score: data.strain_score ?? null,
    snapshot_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[WHOOP Store] saveWhoopSnapshot error:', error.message);
  }
}

export async function getLatestSnapshot(userId: string): Promise<WhoopSnapshotData & { snapshot_at?: string } | null> {
  const { data, error } = await supabase
    .from('whoop_snapshots')
    .select('recovery_score, hrv, resting_hr, sleep_performance, sleep_hours, strain_score, snapshot_at')
    .eq('user_id', userId)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[WHOOP Store] getLatestSnapshot error:', error.message);
    return null;
  }

  return data as (WhoopSnapshotData & { snapshot_at?: string }) | null;
}

// ─── Team snapshots ───────────────────────────────────────────────────────────

export interface TeamMemberSnapshot {
  user_id: string;
  full_name: string | null;
  email: string | null;
  recovery_score: number | null;
  hrv: number | null;
  resting_hr: number | null;
  sleep_performance: number | null;
  sleep_hours: number | null;
  strain_score: number | null;
  snapshot_at: string | null;
}

export async function getTeamSnapshots(): Promise<TeamMemberSnapshot[]> {
  try {
    // Hämta senaste snapshot per user via whoop_connections (de som är kopplade)
    const { data: connections, error: connErr } = await supabase
      .from('whoop_connections')
      .select('user_id');

    if (connErr || !connections || connections.length === 0) return [];

    const userIds = connections.map((c: { user_id: string }) => c.user_id);

    // Hämta senaste snapshot per user
    const results: TeamMemberSnapshot[] = [];

    for (const userId of userIds) {
      // Senaste snapshot
      const { data: snap } = await supabase
        .from('whoop_snapshots')
        .select('recovery_score, hrv, resting_hr, sleep_performance, sleep_hours, strain_score, snapshot_at')
        .eq('user_id', userId)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Hämta användarinfo — userId är public.users.id (inte auth_id)
      const { data: userRow } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', userId)
        .maybeSingle();

      results.push({
        user_id: userId,
        full_name: userRow?.full_name ?? null,
        email: userRow?.email ?? null,
        recovery_score: snap?.recovery_score ?? null,
        hrv: snap?.hrv ?? null,
        resting_hr: snap?.resting_hr ?? null,
        sleep_performance: snap?.sleep_performance ?? null,
        sleep_hours: snap?.sleep_hours ?? null,
        strain_score: snap?.strain_score ?? null,
        snapshot_at: snap?.snapshot_at ?? null,
      });
    }

    return results;
  } catch (err) {
    console.error('[WHOOP Store] getTeamSnapshots error:', err);
    return [];
  }
}
