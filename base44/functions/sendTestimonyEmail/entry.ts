import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { oversight_leader_id, title, testimony_text, disciple_name } = await req.json();

    // Find the leader's notification email from their profile
    const profiles = await base44.asServiceRole.entities.OversightLeaderProfile.filter({ user_id: oversight_leader_id });
    const leaderEmail = profiles[0]?.notification_email;

    if (!leaderEmail) {
      return Response.json({ status: 'no_email', message: 'Leader has no notification email set.' });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: leaderEmail,
      subject: `New Testimony from ${disciple_name}`,
      body: `<h2>New Testimony: ${title}</h2><p><strong>From:</strong> ${disciple_name}</p><hr/><p>${testimony_text.replace(/\n/g, '<br/>')}</p>`,
    });

    return Response.json({ status: 'ok' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});