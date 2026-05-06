import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
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
        className="max-w-md rounded-2xl border-white/12 bg-[#0B0D1A]/85 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.65)]"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-400">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <DialogTitle className="text-white">You’ve used today’s free replies.</DialogTitle>
          </div>
        </DialogHeader>
        {!done ? (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-white/70">
              Upgrade to Pro for unlimited generations and Real Indian Wingman guidance. Drop your email and we’ll let you in early.
            </p>
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="upgrade-modal-email-input"
              className="bg-white/[0.06] border-white/12 text-white placeholder:text-white/40"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full lovli-cta text-white min-h-[44px]"
                data-testid="upgrade-modal-cta-button"
              >
                {submitting ? 'Sending…' : 'Get Early Access'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                data-testid="upgrade-modal-dismiss-button"
                className="w-full text-white/80 hover:bg-white/[0.06] min-h-[44px]"
              >
                Come back tomorrow
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/85">
              You’re on the Pro early access list. We’ll email you when it opens.
            </p>
            <Button
              type="button"
              onClick={onClose}
              className="w-full lovli-cta text-white min-h-[44px]"
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
