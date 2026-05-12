import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { tomorrowAtMidnightIso } from '../_shared/utils.ts';

export async function ensureUsageRow(input: { admin: SupabaseClient; userId: string }) {
  const { data } = await input.admin
    .from('kivo_usage')
    .select('user_id,reset_at')
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!data) {
    await input.admin.from('kivo_usage').insert({
      user_id: input.userId,
      plan: 'free',
      credits_used: 0,
      daily_runs: 0,
      reset_at: tomorrowAtMidnightIso(),
    });
    return;
  }

  const resetAt = typeof data.reset_at === 'string' ? new Date(data.reset_at).getTime() : 0;
  if (Number.isFinite(resetAt) && resetAt < Date.now()) {
    await input.admin
      .from('kivo_usage')
      .update({ daily_runs: 0, reset_at: tomorrowAtMidnightIso() })
      .eq('user_id', input.userId);
  }
}

export async function incrementUsage(input: { admin: SupabaseClient; userId: string; creditsSpent: number }) {
  const { data } = await input.admin
    .from('kivo_usage')
    .select('credits_used,daily_runs')
    .eq('user_id', input.userId)
    .maybeSingle();

  await input.admin.from('kivo_usage').upsert({
    user_id: input.userId,
    credits_used: Number(data?.credits_used ?? 0) + input.creditsSpent,
    daily_runs: Number(data?.daily_runs ?? 0) + 1,
  }, { onConflict: 'user_id' });
}
