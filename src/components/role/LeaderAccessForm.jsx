import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

export default function LeaderAccessForm({ open, onOpenChange }) {
  const { user } = useAuth();
  const [church, setChurch] = useState('');
  const [pastorApproved, setPastorApproved] = useState(false);
  const [leadershipRole, setLeadershipRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = church.trim() && leadershipRole.trim() && pastorApproved;

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setIsSubmitting(true);
    try {
      await supabase.from('leader_access_requests').insert({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        church,
        pastor_approved: pastorApproved,
        leadership_role: leadershipRole,
        status: 'pending',
      });
      setChurch('');
      setPastorApproved(false);
      setLeadershipRole('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit leader access request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Leader Access</DialogTitle>
          <DialogDescription>
            Please complete all fields below. A Super Admin will review your request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="church">What church are you from?</Label>
            <Input
              id="church"
              placeholder="e.g., Hope Community Church"
              value={church}
              onChange={(e) => setChurch(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Switch checked={pastorApproved} onCheckedChange={setPastorApproved} disabled={isSubmitting} />
              Has your Pastor approved this request?
            </Label>
            {!pastorApproved && (
              <p className="text-xs text-destructive">Please speak with your Pastor before requesting Leader access.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">What leadership role are you stepping into?</Label>
            <Input
              id="role"
              placeholder="e.g., Connect Group Leader"
              value={leadershipRole}
              onChange={(e) => setLeadershipRole(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}