/**
 * sendBookingNotification — fires on CatchUpSlot entity update (automation).
 * Sends ONE email to the admin when a new booking is made (status=booked).
 * Dedup: sets notification_sent: true immediately.
 * User receives NO email here — only after admin confirms/denies.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const HR = '<br>———————————————<br>';
const SIG = '<br><br>The Disciple Team<br>https://disciple.base44.app/Settings';
const ADMIN_URL = 'https://disciple.base44.app/AdminPanel';

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
    return nominalUtcMs + diffMins * 60 * 1000;
  } catch { return null; }
}

function getTzAbbr(timezone, dateStr) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0));
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: timezone,
      timeZoneName: 'short'
    }).formatToParts(d);
    return parts.find(p => p.type === 'timeZoneName')?.value || timezone;
  } catch { return timezone; }
}

function fmtDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayName = d.toLocaleDateString('en-AU', { weekday: 'long' });
    const monthName = d.toLocaleDateString('en-AU', { month: 'long' });
    return `${dayName}, ${day} ${monthName} ${year}`;
  } catch { return dateStr || ''; }
}

function buildCalLink(dateStr, timeRaw, duration, type, timezone, titleWith) {
  try {
    const startMs = localToUtcMs(dateStr, timeRaw, timezone);
    if (!startMs) return null;
    const endMs = startMs + (duration || 30) * 60 * 1000;
    const pad = n => String(n).padStart(2, '0');
    const fmt = ms => {
      const d = new Date(ms);
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const typeLabel = type === 'phone' ? 'Phone+Call' : 'In+Person+Catch-Up';
    const title = encodeURIComponent(`Catch-Up with ${titleWith || 'Leader'}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(startMs)}/${fmt(endMs)}&details=Type:+${typeLabel}+%7C+Duration:+${duration || 30}+min`;
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const slot = payload.data || payload;
    const { id: slot_id, oversight_leader_id, booked_by, booked_by_user_id, date, time, time_raw, type, duration, message, status, notification_sent } = slot;

    if (status !== 'booked') {
      return Response.json({ ok: true, skipped: true, reason: 'not_booked' });
    }
    if (notification_sent === true) {
      console.log('[sendBookingNotification] Already sent for slot', slot_id, '— skipping.');
      return Response.json({ ok: true, skipped: true, reason: 'already_sent' });
    }
    if (!oversight_leader_id) {
      return Response.json({ ok: true, skipped: true, reason: 'no_leader_id' });
    }

    // Mark sent immediately to prevent duplicates
    await base44.asServiceRole.entities.CatchUpSlot.update(slot_id, { notification_sent: true });

    // Fetch leader profile (for timezone + notification email)
    const [leaderUsers, leaderProfiles] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ id: oversight_leader_id }),
      base44.asServiceRole.entities.OversightLeaderProfile.filter({ user_id: oversight_leader_id }),
    ]);
    const leaderUser = leaderUsers[0];
    const leaderProfile = leaderProfiles[0];
    if (!leaderUser) {
      console.error('[sendBookingNotification] Leader not found:', oversight_leader_id);
      return Response.json({ error: 'Leader not found' }, { status: 404 });
    }

    const leaderEmail = leaderProfile?.notification_email || leaderUser.email;
    if (!leaderEmail) {
      return Response.json({ error: 'No leader email' }, { status: 400 });
    }

    const timezone = leaderProfile?.timezone || 'Australia/Adelaide';
    const userName = booked_by || 'A User';
    const typeLabel = type === 'phone' ? 'Phone Call' : 'In-Person Catch-Up';
    const durationLabel = `${duration || 30} minutes`;
    const tzAbbr = getTzAbbr(timezone, date);
    const calLink = buildCalLink(date, time_raw, duration, type, timezone, userName);

    const subject = `New catch-up request — ${userName}`;
    let body = `<strong>New catch-up request</strong><br>`;
    body += `<span style="background:#f59e0b;color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;">Pending your approval</span>`;
    body += `<br><br>${userName} has requested a catch-up with you. Review the details below and confirm or manage this booking in the app.`;
    body += HR;
    body += `User: ${userName}<br>`;
    body += `Date: ${fmtDate(date)}<br>`;
    body += `Time: ${time} (${tzAbbr})<br>`;
    body += `Type: ${typeLabel}<br>`;
    body += `Duration: ${durationLabel}`;
    body += HR;
    if (message && message.trim()) {
      body += `Message from ${userName}:<br>`;
      body += `&ldquo;${message.trim()}&rdquo;`;
      body += HR;
    }
    body += `Confirm in app:<br><a href="${ADMIN_URL}">${ADMIN_URL}</a>`;
    if (calLink) {
      body += `<br><br>Add to calendar:<br><a href="${calLink}">${calLink}</a>`;
    }
    body += HR;
    body += `This request will remain pending until you confirm or deny it in the app. The slot is held and unavailable to others in the meantime.`;
    body += SIG;

    await base44.asServiceRole.integrations.Core.SendEmail({ to: leaderEmail, subject, body });
    console.log('[sendBookingNotification] Email sent to leader:', leaderEmail);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[sendBookingNotification]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});