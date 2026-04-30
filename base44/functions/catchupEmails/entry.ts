/**
 * catchupEmails — sends targeted emails for catch-up actions.
 * All times are displayed in the admin's configured timezone.
 *
 * Scenarios:
 *  - "confirm"          → Admin confirms: email user
 *  - "deny"             → Admin denies: email user
 *  - "cancel_user"      → Admin cancels confirmed booking: email user
 *  - "cancel_admin"     → Admin cancels confirmed booking: email admin (self)
 *  - "reminder_user"    → 24h reminder to user
 *  - "reminder_admin"   → 24h reminder to admin
 *  - "monday_reminder"  → Weekly Monday reminder to admin
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const APP_URL = 'https://disciple.base44.app';
const BOOKING_URL = `${APP_URL}/BookCatchUp`;
const ADMIN_URL = `${APP_URL}/AdminPanel`;
const SIG = '<br><br>The Disciple Team<br>https://disciple.base44.app/Settings';
const HR = '<br>———————————————<br>';

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

async function fetchUserEmail(base44, booked_by_user_id) {
  if (!booked_by_user_id) return null;
  const users = await base44.asServiceRole.entities.User.filter({ id: booked_by_user_id });
  return users[0]?.email || null;
}

async function fetchLeaderData(base44, oversight_leader_id) {
  if (!oversight_leader_id) return {};
  const [profiles, users] = await Promise.all([
    base44.asServiceRole.entities.OversightLeaderProfile.filter({ user_id: oversight_leader_id }),
    base44.asServiceRole.entities.User.filter({ id: oversight_leader_id }),
  ]);
  const profile = profiles[0];
  const user = users[0];
  return {
    email: profile?.notification_email || user?.email || null,
    timezone: profile?.timezone || 'Australia/Adelaide',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      scenario,
      booked_by_user_id,
      oversight_leader_id,
      leaderName,
      userName,
      date, time, time_raw, type, duration, message,
    } = await req.json();

    if (!scenario) {
      return Response.json({ error: 'Missing scenario' }, { status: 400 });
    }

    let to = null;
    let subject = '';
    let body = '';

    switch (scenario) {

      case 'confirm': {
        to = await fetchUserEmail(base44, booked_by_user_id);
        if (!to) { console.log('[catchupEmails] No user email for confirm'); return Response.json({ ok: true, skipped: true }); }
        const { timezone } = await fetchLeaderData(base44, oversight_leader_id);
        const tzAbbr = getTzAbbr(timezone, date);
        const calLink = buildCalLink(date, time_raw, duration, type, timezone, leaderName);
        const typeLabel = type === 'phone' ? 'Phone Call' : 'In-Person Catch-Up';
        subject = `Your catch-up is confirmed`;
        body = `<strong>Your catch-up is confirmed</strong><br>`;
        body += `<span style="background:#22c55e;color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;">Confirmed</span>`;
        body += `<br><br>Your leader has confirmed your catch-up. Add it to your calendar so you don't miss it.`;
        body += HR;
        body += `Leader: ${leaderName}<br>`;
        body += `Date: ${fmtDate(date)}<br>`;
        body += `Time: ${time} (${tzAbbr})<br>`;
        body += `Type: ${typeLabel}<br>`;
        body += `Duration: ${duration || 30} minutes`;
        body += HR;
        if (calLink) {
          body += `Add to calendar:<br><a href="${calLink}">${calLink}</a>`;
          body += HR;
        }
        body += `If you need to cancel or reschedule, you can do so from the app. Please give as much notice as possible.`;
        body += SIG;
        break;
      }

      case 'deny': {
        to = await fetchUserEmail(base44, booked_by_user_id);
        if (!to) { console.log('[catchupEmails] No user email for deny'); return Response.json({ ok: true, skipped: true }); }
        const { timezone: tz2 } = await fetchLeaderData(base44, oversight_leader_id);
        const tzAbbr2 = getTzAbbr(tz2, date);
        const typeLabel2 = type === 'phone' ? 'Phone Call' : 'In-Person Catch-Up';
        subject = `Your catch-up request was unable to be approved`;
        body = `<strong>Your catch-up request was unable to be approved</strong><br>`;
        body += `<span style="background:#ef4444;color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;">Unable to approve</span>`;
        body += `<br><br>Unfortunately your leader is unable to approve the following catch-up request. Please reschedule a new time or reach out to them personally.`;
        body += HR;
        body += `Leader: ${leaderName}<br>`;
        body += `Date: ${fmtDate(date)}<br>`;
        body += `Time: ${time} (${tzAbbr2})<br>`;
        body += `Type: ${typeLabel2}<br>`;
        body += `Duration: ${duration || 30} minutes`;
        body += HR;
        body += `Reschedule in app:<br><a href="${BOOKING_URL}">${BOOKING_URL}</a>`;
        body += HR;
        body += `If you have any questions, please reach out to your leader directly.`;
        body += SIG;
        break;
      }

      case 'cancel_user': {
        to = await fetchUserEmail(base44, booked_by_user_id);
        if (!to) { console.log('[catchupEmails] No user email for cancel_user'); return Response.json({ ok: true, skipped: true }); }
        const { timezone: tz3 } = await fetchLeaderData(base44, oversight_leader_id);
        const tzAbbr3 = getTzAbbr(tz3, date);
        const typeLabel3 = type === 'phone' ? 'Phone Call' : 'In-Person Catch-Up';
        subject = `Your catch-up has been cancelled`;
        body = `<strong>Your catch-up has been cancelled</strong><br>`;
        body += `<span style="background:#6b7280;color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;">Cancelled</span>`;
        body += `<br><br>Your leader has cancelled the following catch-up. Please reschedule a new time or reach out to them personally.`;
        body += HR;
        body += `Leader: ${leaderName}<br>`;
        body += `Date: ${fmtDate(date)}<br>`;
        body += `Time: ${time} (${tzAbbr3})<br>`;
        body += `Type: ${typeLabel3}<br>`;
        body += `Duration: ${duration || 30} minutes`;
        body += HR;
        body += `Reschedule in app:<br><a href="${BOOKING_URL}">${BOOKING_URL}</a>`;
        body += HR;
        body += `If you have any questions, please reach out to your leader directly.`;
        body += SIG;
        break;
      }

      case 'cancel_admin': {
        const leaderData = await fetchLeaderData(base44, oversight_leader_id);
        to = leaderData.email;
        if (!to) { console.log('[catchupEmails] No admin email for cancel_admin'); return Response.json({ ok: true, skipped: true }); }
        const tzAbbr4 = getTzAbbr(leaderData.timezone, date);
        const typeLabel4 = type === 'phone' ? 'Phone Call' : 'In-Person Catch-Up';
        subject = `Catch-up cancelled — ${userName}`;
        body = `<strong>Catch-up cancelled by admin</strong><br>`;
        body += `<span style="background:#6b7280;color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;">Cancelled</span>`;
        body += `<br><br>You have cancelled the following catch-up with ${userName}. The slot has been removed from the calendar.`;
        body += HR;
        body += `User: ${userName}<br>`;
        body += `Date: ${fmtDate(date)}<br>`;
        body += `Time: ${time} (${tzAbbr4})<br>`;
        body += `Type: ${typeLabel4}<br>`;
        body += `Duration: ${duration || 30} minutes`;
        body += HR;
        body += `No further action is required.`;
        body += SIG;
        break;
      }

      case 'reminder_user': {
        to = await fetchUserEmail(base44, booked_by_user_id);
        if (!to) { return Response.json({ ok: true, skipped: true }); }
        const { timezone: tz5 } = await fetchLeaderData(base44, oversight_leader_id);
        const tzAbbr5 = getTzAbbr(tz5, date);
        const calLink5 = buildCalLink(date, time_raw, duration, type, tz5, leaderName);
        const typeLabel5 = type === 'phone' ? 'Phone Call' : 'In-Person Catch-Up';
        subject = `Reminder: Catch-Up tomorrow with ${leaderName}`;
        body = `<strong>Reminder: Catch-Up tomorrow</strong>`;
        body += `<br><br>Just a reminder — you have a catch-up tomorrow!`;
        body += HR;
        body += `Leader: ${leaderName}<br>`;
        body += `Date: ${fmtDate(date)}<br>`;
        body += `Time: ${time} (${tzAbbr5})<br>`;
        body += `Type: ${typeLabel5}<br>`;
        body += `Duration: ${duration || 30} minutes`;
        body += HR;
        if (calLink5) body += `Add to calendar:<br><a href="${calLink5}">${calLink5}</a>`;
        body += SIG;
        break;
      }

      case 'reminder_admin': {
        const leaderData6 = await fetchLeaderData(base44, oversight_leader_id);
        to = leaderData6.email;
        if (!to) { return Response.json({ ok: true, skipped: true }); }
        const tzAbbr6 = getTzAbbr(leaderData6.timezone, date);
        const calLink6 = buildCalLink(date, time_raw, duration, type, leaderData6.timezone, userName);
        const typeLabel6 = type === 'phone' ? 'Phone Call' : 'In-Person Catch-Up';
        subject = `Reminder: Catch-Up tomorrow with ${userName}`;
        body = `<strong>Reminder: Catch-Up tomorrow</strong>`;
        body += `<br><br>Just a reminder — you have a catch-up tomorrow!`;
        body += HR;
        body += `User: ${userName}<br>`;
        body += `Date: ${fmtDate(date)}<br>`;
        body += `Time: ${time} (${tzAbbr6})<br>`;
        body += `Type: ${typeLabel6}<br>`;
        body += `Duration: ${duration || 30} minutes`;
        body += HR;
        if (calLink6) body += `Add to calendar:<br><a href="${calLink6}">${calLink6}</a>`;
        body += SIG;
        break;
      }

      case 'monday_reminder': {
        const leaderData7 = await fetchLeaderData(base44, oversight_leader_id);
        to = leaderData7.email;
        if (!to) { return Response.json({ ok: true, skipped: true }); }
        subject = `Don't forget to set your availability this week`;
        body = `<strong>Set your catch-up availability</strong>`;
        body += `<br><br>This is a friendly reminder to open Disciple and set your catch-up availability for this week so your users can book time with you.`;
        body += HR;
        body += `Manage availability:<br><a href="${ADMIN_URL}">${ADMIN_URL}</a>`;
        body += SIG;
        break;
      }

      default:
        return Response.json({ error: `Unknown scenario: ${scenario}` }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body });
    console.log(`[catchupEmails] Sent "${scenario}" to ${to}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[catchupEmails]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});