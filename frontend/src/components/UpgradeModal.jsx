import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LovliMark from '@/components/LovliMark';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function UpgradeModal({ open, onClose, user }) {
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!email) {
      toast.error('Add your email to join the early-access list.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/waitlist', { email, type: 'pro', source: 'upgrade-modal' });
      setDone(true);
      toast.success("You’re on the Pro early access list.");
    } catch {
      toast.error('Could not save right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent
        data-testid="upgrade-modal"
        className="max-w-md rounded-2xl border-lovli-border bg-lovli-card-2/95 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.65)]"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <LovliMark size={32} />
            <DialogTitle className="text-lovli-text">
              You’ve used today’s free replies.
            </DialogTitle>
          </div>
        </DialogHeader>
        {!done ? (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-lovli-text-muted">
              Upgrade to Pro for unlimited generations and Real Indian Wingman guidance. Drop
              your email and we’ll let you in early.
            </p>
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="upgrade-modal-email-input"
              className="bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint h-11"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full lovli-cta min-h-[44px] rounded-full"
                data-testid="upgrade-modal-cta-button"
              >
                {submitting ? 'Sending…' : 'Get Early Access'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                data-testid="upgrade-modal-dismiss-button"
                className="w-full text-lovli-text-soft hover:bg-lovli-card hover:text-lovli-text min-h-[44px] rounded-full"
              >
                Come back tomorrow
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-lovli-text">
              You’re on the Pro early access list. We’ll email you when it opens.
            </p>
            <Button
              type="button"
              onClick={onClose}
              className="w-full lovli-cta min-h-[44px] rounded-full"
              data-testid="upgrade-modal-close-button"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
