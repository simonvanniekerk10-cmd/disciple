/**
 * mondayAvailabilityReminder — runs every Monday morning.
 * Sends each admin leader a reminder to set their catch-up availability for the week.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SIG = "\n\nThe Disciple Team";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all leader profiles
    const profiles = await base44.asServiceRole.entities.OversightLeaderProfile.filter({});

    let sent = 0;
    for (const profile of profiles) {
      if (!profile.user_id) continue;

      const users = await base44.asServiceRole.entities.User.filter({ id: profile.user_id });
      const user = users[0];
      if (!user) continue;

      const email = profile.notification_email || user.email;
      if (!email) continue;

      const name = user.full_name || 'Leader';

      await base44.asServiceRole.functions.invoke('catchupEmails', {
        scenario: 'monday_reminder',
        oversight_leader_id: profile.user_id,
        leaderName: name,
      });

      sent++;
    }

    console.log(`[mondayAvailabilityReminder] Sent reminders to ${sent} leaders`);
    return Response.json({ ok: true, sent });
  } catch (error) {
    console.error('[mondayAvailabilityReminder]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});