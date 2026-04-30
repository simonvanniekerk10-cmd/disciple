import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only super admins can approve/decline requests
    if (!user || user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { request_id, status } = body;

    if (!request_id || !['approved', 'declined'].includes(status)) {
      return Response.json(
        { error: 'Invalid request_id or status' },
        { status: 400 }
      );
    }

    // Fetch the request
    const requests = await base44.asServiceRole.entities.LeaderAccessRequest.filter({
      id: request_id,
    });
    const accessRequest = requests[0];

    if (!accessRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    if (accessRequest.status !== 'pending') {
      return Response.json({ error: 'Request already reviewed' }, { status: 400 });
    }

    // Update request status
    await base44.asServiceRole.entities.LeaderAccessRequest.update(request_id, {
      status,
      reviewed_by: user.email,
      reviewed_date: new Date().toISOString(),
    });

    // If approved, upgrade user to admin role
    if (status === 'approved') {
      await base44.asServiceRole.entities.User.update(accessRequest.user_id, {
        role: 'admin',
        oversight_leader_id: accessRequest.user_id,
      });

      await base44.integrations.Core.SendEmail({
        to: accessRequest.user_email,
        subject: 'Leader Access Approved',
        body: `Hi ${accessRequest.user_name},\n\nYour request for leader access has been approved! You can now access the Leader View in your dashboard.\n\nBest regards,\nAnchor`,
      });
    } else {
      await base44.integrations.Core.SendEmail({
        to: accessRequest.user_email,
        subject: 'Leader Access Request Status',
        body: `Hi ${accessRequest.user_name},\n\nYour request for leader access was not approved at this time. Please reach out to your pastor or supervisor for more information.\n\nBest regards,\nAnchor`,
      });
    }

    return Response.json({ success: true, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});