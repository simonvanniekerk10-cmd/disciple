import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role to bypass User entity RLS
    const members = await base44.asServiceRole.entities.User.filter(
      { oversight_leader_id: user.id, role: 'user' },
      '-created_date',
      100
    );

    return Response.json({ members });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});