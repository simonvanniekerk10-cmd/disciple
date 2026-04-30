/**
 * createCalendarEvent — fires on CatchUpSlot update (when status becomes "booked").
 * Creates a Google Calendar event for the Leader using their profile timezone.
 * Guards against duplicate invites using the invite_sent flag.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// VTIMEZONE blocks for supported Australian/NZ timezones
const VTIMEZONE_BLOCKS = {
  'Australia/Adelaide': `BEGIN:VTIMEZONE
TZID:Australia/Adelaide
BEGIN:STANDARD
DTSTART:19700405T030000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=4
TZOFFSETFROM:+1030
TZOFFSETTO:+0930
TZNAME:ACST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19701004T020000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=10
TZOFFSETFROM:+0930
TZOFFSETTO:+1030
TZNAME:ACDT
END:DAYLIGHT
END:VTIMEZONE`,
  'Australia/Sydney': `BEGIN:VTIMEZONE
TZID:Australia/Sydney
BEGIN:STANDARD
DTSTART:19700405T030000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=4
TZOFFSETFROM:+1100
TZOFFSETTO:+1000
TZNAME:AEST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19701004T020000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=10
TZOFFSETFROM:+1000
TZOFFSETTO:+1100
TZNAME:AEDT
END:DAYLIGHT
END:VTIMEZONE`,
  'Australia/Melbourne': `BEGIN:VTIMEZONE
TZID:Australia/Melbourne
BEGIN:STANDARD
DTSTART:19700405T030000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=4
TZOFFSETFROM:+1100
TZOFFSETTO:+1000
TZNAME:AEST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19701004T020000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=10
TZOFFSETFROM:+1000
TZOFFSETTO:+1100
TZNAME:AEDT
END:DAYLIGHT
END:VTIMEZONE`,
  'Australia/Brisbane': `BEGIN:VTIMEZONE
TZID:Australia/Brisbane
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+1000
TZOFFSETTO:+1000
TZNAME:AEST
END:STANDARD
END:VTIMEZONE`,
  'Australia/Perth': `BEGIN:VTIMEZONE
TZID:Australia/Perth
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0800
TZOFFSETTO:+0800
TZNAME:AWST
END:STANDARD
END:VTIMEZONE`,
  'Australia/Darwin': `BEGIN:VTIMEZONE
TZID:Australia/Darwin
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0930
TZOFFSETTO:+0930
TZNAME:ACST
END:STANDARD
END:VTIMEZONE`,
  'Australia/Hobart': `BEGIN:VTIMEZONE
TZID:Australia/Hobart
BEGIN:STANDARD
DTSTART:19700405T030000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=4
TZOFFSETFROM:+1100
TZOFFSETTO:+1000
TZNAME:AEST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19701004T020000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=10
TZOFFSETFROM:+1000
TZOFFSETTO:+1100
TZNAME:AEDT
END:DAYLIGHT
END:VTIMEZONE`,
  'Pacific/Auckland': `BEGIN:VTIMEZONE
TZID:Pacific/Auckland
BEGIN:STANDARD
DTSTART:19700405T030000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=4
TZOFFSETFROM:+1300
TZOFFSETTO:+1200
TZNAME:NZST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700927T020000
RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=9
TZOFFSETFROM:+1200
TZOFFSETTO:+1300
TZNAME:NZDT
END:DAYLIGHT
END:VTIMEZONE`,
};

// Format datetime as local ISO without timezone suffix: YYYYMMDDTHHmmss
function toICSLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// Format for Google Calendar API: YYYY-MM-DDTHH:mm:ss (no Z, with TZID)
function toGCalLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const slot = payload.data || payload;
    const { id: slot_id, date, time, time_raw, type, duration, booked_by, booked_by_user_id, message, status, invite_sent, oversight_leader_id } = slot;

    // Only act on booked slots
    if (status !== 'booked') {
      console.log('[createCalendarEvent] Slot not booked, skipping.');
      return Response.json({ ok: true, skipped: true });
    }

    // Duplicate guard — skip if invite already sent
    if (invite_sent === true) {
      console.log('[createCalendarEvent] Invite already sent for slot', slot_id, '— skipping.');
      return Response.json({ ok: true, skipped: true, reason: 'invite_already_sent' });
    }

    if (!date || !slot_id) {
      return Response.json({ error: 'Missing date or slot_id' }, { status: 400 });
    }

    // Derive raw time (HH:MM 24h)
    let rawTime = time_raw;
    if (!rawTime && time) {
      const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let h = parseInt(match[1]);
        const m = match[2];
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        rawTime = `${h.toString().padStart(2, '0')}:${m}`;
      }
    }
    if (!rawTime) {
      return Response.json({ error: 'Cannot determine start time' }, { status: 400 });
    }

    // Fetch disciple's display name
    let discipleName = booked_by || 'Disciple';
    if (booked_by_user_id) {
      const disciples = await base44.asServiceRole.entities.User.filter({ id: booked_by_user_id });
      if (disciples[0]) {
        discipleName = disciples[0].display_name || disciples[0].full_name || disciples[0].email || discipleName;
      }
    }

    // Fetch leader's profile for timezone + calendar_mode
    let timezone = 'Australia/Adelaide';
    let calendarMode = 'manual';
    if (oversight_leader_id) {
      const profiles = await base44.asServiceRole.entities.OversightLeaderProfile.filter({ user_id: oversight_leader_id });
      if (profiles[0]?.timezone) timezone = profiles[0].timezone;
      if (profiles[0]?.calendar_mode) calendarMode = profiles[0].calendar_mode;
    }

    // Only create calendar event if leader has opted in to automatic mode
    if (calendarMode !== 'automatic') {
      console.log('[createCalendarEvent] Leader is using manual calendar mode — skipping auto-invite.');
      return Response.json({ ok: true, skipped: true, reason: 'manual_calendar_mode' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // Parse date+time as a local datetime (no UTC conversion)
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = rawTime.split(':').map(Number);
    // Use Date constructor with local values — we treat these as the leader's local time
    const startDate = new Date(year, month - 1, day, hour, minute, 0);
    const endDate = new Date(startDate.getTime() + (duration || 30) * 60 * 1000);

    const typeLabel = type === 'phone' ? 'Phone Call' : 'In Person';
    const durationLabel = `${duration || 30} min`;

    const event = {
      summary: `Catch-Up — ${discipleName}`,
      description: [
        `Type: ${typeLabel} (${durationLabel})`,
        `Booked by: ${discipleName}`,
        `Message: ${message?.trim() || 'No message provided'}`,
      ].join('\n'),
      start: { dateTime: toGCalLocal(startDate), timeZone: timezone },
      end: { dateTime: toGCalLocal(endDate), timeZone: timezone },
      extendedProperties: {
        private: { anchor_slot_id: slot_id },
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('[createCalendarEvent] create error:', err);
      return Response.json({ error: 'Calendar create failed', detail: err }, { status: 500 });
    }

    const created = await response.json();
    console.log('[createCalendarEvent] Event created:', created.id, 'timezone:', timezone);

    // Mark invite_sent = true and store event_id to prevent duplicates
    await base44.asServiceRole.entities.CatchUpSlot.update(slot_id, {
      calendar_event_id: created.id,
      invite_sent: true,
    });

    return Response.json({ ok: true, event_id: created.id, timezone });
  } catch (error) {
    console.error('[createCalendarEvent]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});