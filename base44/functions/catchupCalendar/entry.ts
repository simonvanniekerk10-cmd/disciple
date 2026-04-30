/**
 * catchupCalendar — creates or deletes a Google Calendar event for a CatchUpSlot booking.
 *
 * Payload:
 *   action: "create" | "delete"
 *   slot_id: string  (CatchUpSlot record id — used as the calendar event's extendedProperty to find it for deletion)
 *   For "create": date, time_raw, duration, type, disciple_name, disciple_message
 *   For "delete": slot_id only (we search by extendedProperty)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, slot_id, date, time_raw, duration, type, disciple_name, disciple_message } = await req.json();

    if (!action || !slot_id) {
      return Response.json({ error: 'Missing required fields: action, slot_id' }, { status: 400 });
    }

    // Get Google Calendar access token (connected by the app builder / admin)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    if (action === 'create') {
      if (!date || !time_raw) {
        return Response.json({ error: 'Missing date or time_raw for create' }, { status: 400 });
      }

      // Build ISO datetime strings (date is YYYY-MM-DD, time_raw is HH:MM)
      const [hour, minute] = time_raw.split(':').map(Number);
      const startDate = new Date(`${date}T${time_raw}:00`);
      const endDate = new Date(startDate.getTime() + (duration || 30) * 60 * 1000);

      const pad = (n) => String(n).padStart(2, '0');
      const toLocalISO = (d) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      const typeLabel = type === 'phone' ? 'Phone Call' : 'In-Person';
      const durationLabel = `${duration || 30} min`;

      const event = {
        summary: `Catch-Up — ${disciple_name || 'Disciple'}`,
        description: [
          `Type: ${typeLabel} (${durationLabel})`,
          disciple_message ? `\nMessage from ${disciple_name}:\n"${disciple_message}"` : '',
        ].join(''),
        start: { dateTime: toLocalISO(startDate), timeZone: 'UTC' },
        end: { dateTime: toLocalISO(endDate), timeZone: 'UTC' },
        extendedProperties: {
          private: { disciple_slot_id: slot_id },
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
        console.error('[catchupCalendar] create error:', err);
        return Response.json({ error: 'Calendar create failed', detail: err }, { status: 500 });
      }

      const created = await response.json();
      console.log('[catchupCalendar] Event created:', created.id);
      return Response.json({ ok: true, event_id: created.id });
    }

    if (action === 'delete') {
      // Search for the event by our custom extendedProperty
      const searchUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      searchUrl.searchParams.set('privateExtendedProperty', `disciple_slot_id=${slot_id}`);
      searchUrl.searchParams.set('maxResults', '5');

      const searchRes = await fetch(searchUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!searchRes.ok) {
        const err = await searchRes.text();
        console.error('[catchupCalendar] search error:', err);
        return Response.json({ error: 'Calendar search failed', detail: err }, { status: 500 });
      }

      const searchData = await searchRes.json();
      const events = searchData.items || [];

      for (const ev of events) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (delRes.ok || delRes.status === 204 || delRes.status === 404) {
          console.log('[catchupCalendar] Event deleted:', ev.id);
        } else {
          const err = await delRes.text();
          console.error('[catchupCalendar] delete error:', err);
        }
      }

      return Response.json({ ok: true, deleted: events.length });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[catchupCalendar]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});