import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { memberId } = body;
    if (!memberId) {
      return Response.json({ error: 'memberId is required' }, { status: 400 });
    }

    // Fetch member using service role to bypass RLS
    const memberRecords = await base44.asServiceRole.entities.User.filter({ id: memberId });
    const member = memberRecords?.[0];

    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.oversight_leader_id !== user.id) {
      return Response.json({ error: 'This member does not belong to your group' }, { status: 403 });
    }

    // Clear the oversight_leader_id using service role
    await base44.asServiceRole.entities.User.update(memberId, { oversight_leader_id: '' });

    return Response.json({ success: true, memberId });
  } catch (error) {
    console.error('removeMember error:', error?.message || error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});