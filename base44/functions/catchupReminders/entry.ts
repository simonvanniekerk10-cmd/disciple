/**
 * catchupReminders — runs every hour, finds confirmed bookings happening in ~24h,
 * sends reminder emails to both the leader and user via catchupEmails function.
 * Uses admin's configured timezone for time calculations.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function localToUtcMs(dateStr, timeRaw, timezone) {
  if (!dateStr || !timeRaw) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeRaw.split(':').map(Number);
    const nominalUtcMs = Date.UTC(year, month - 1, day, hour, minute);
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: timezone,
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date(nominalUtcMs));
    const aH = parseInt(parts.find(p => p.type === 'hour')?.value ?? 0);
    const aM = parseInt(parts.find(p => p.type === 'minute')?.value ?? 0);
    let diffMins = (hour * 60 + minute) - (aH * 60 + aM);
    if (diffMins > 720) diffMins -= 24 * 60;
    if (diffMins < -720) diffMins += 24 * 60;
    return nominalUtcMs - diffMins * 60 * 1000;
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const allSlots = await base44.asServiceRole.entities.CatchUpSlot.filter({ status: 'booked', confirmed: true });

    const now = Date.now();
    const window_start = now + 23 * 60 * 60 * 1000;
    const window_end = now + 25 * 60 * 60 * 1000;

    let sent = 0;
    for (const slot of allSlots) {
      if (!slot.date || !slot.time_raw || !slot.oversight_leader_id) continue;

      // Fetch leader profile for timezone
      const [leaderProfiles, leaderUsers] = await Promise.all([
        base44.asServiceRole.entities.OversightLeaderProfile.filter({ user_id: slot.oversight_leader_id }),
        base44.asServiceRole.entities.User.filter({ id: slot.oversight_leader_id }),
      ]);
      const leaderProfile = leaderProfiles[0];
      const leaderUser = leaderUsers[0];
      const timezone = leaderProfile?.timezone || 'Australia/Adelaide';

      const slotMs = localToUtcMs(slot.date, slot.time_raw, timezone);
      if (!slotMs || slotMs < window_start || slotMs > window_end) continue;

      const leaderName = leaderUser?.full_name || 'Your Leader';
      const userName = slot.booked_by || 'User';

      const emailBase = {
        leaderName, userName,
        date: slot.date, time: slot.time, time_raw: slot.time_raw,
        type: slot.type, duration: slot.duration,
        booked_by_user_id: slot.booked_by_user_id,
        oversight_leader_id: slot.oversight_leader_id,
      };

      await Promise.all([
        base44.asServiceRole.functions.invoke('catchupEmails', { ...emailBase, scenario: 'reminder_user' }),
        base44.asServiceRole.functions.invoke('catchupEmails', { ...emailBase, scenario: 'reminder_admin' }),
      ]);

      sent++;
    }

    console.log(`[catchupReminders] Checked ${allSlots.length} slots, sent reminders for ${sent}`);
    return Response.json({ ok: true, checked: allSlots.length, sent });
  } catch (error) {
    console.error('[catchupReminders]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});