import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import EarlyAccessForm from '@/components/EarlyAccessForm';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { BrainCircuit, Plus, Pencil, Trash2, Lock } from 'lucide-react';

const BLANK = {
  nickname: '',
  relationship_stage: '',
  where_met: '',
  notes: '',
  likes: '',
  dislikes: '',
  communication_style: '',
  inside_jokes: '',
  important_dates: '',
  boundaries: '',
};

function MemoryFormDialog({ open, onOpenChange, initial, onSaved }) {
  const [form, setForm] = useState(initial || BLANK);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(initial || BLANK);
  }, [initial, open]);

  const isEdit = Boolean(initial?.id);

  const submit = async () => {
    if (!form.nickname.trim()) {
      toast.error('Add a nickname so you can find this card later.');
      return;
    }
    try {
      setSubmitting(true);
      let saved;
      if (isEdit) {
        const { data } = await api.patch(`/memory-cards/${initial.id}`, form);
        saved = data;
      } else {
        const { data } = await api.post('/memory-cards', form);
        saved = data;
      }
      onSaved?.(saved, isEdit ? 'updated' : 'created');
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border-white/12 bg-[#0B0D1A]/90 backdrop-blur-2xl"
        data-testid="memory-form"
      >
        <DialogHeader>
          <DialogTitle className="text-white">{isEdit ? 'Edit memory' : 'Save a memory'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-white/80" htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              placeholder="e.g. Coffee Girl"
              data-testid="memory-form-nickname-input"
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-white/80">Relationship stage</Label>
              <Input
                value={form.relationship_stage}
                onChange={(e) => set('relationship_stage', e.target.value)}
                placeholder="Talking, dating, friends…"
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
                data-testid="memory-form-stage-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Where you met</Label>
              <Input
                value={form.where_met}
                onChange={(e) => set('where_met', e.target.value)}
                placeholder="Hinge, friend’s party…"
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
                data-testid="memory-form-where-input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Likes</Label>
            <Input
              value={form.likes}
              onChange={(e) => set('likes', e.target.value)}
              placeholder="chai, indie music, quiet cafes…"
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
              data-testid="memory-form-likes-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Avoid</Label>
            <Input
              value={form.dislikes}
              onChange={(e) => set('dislikes', e.target.value)}
              placeholder="too much flirting, pressure to meet…"
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
              data-testid="memory-form-avoid-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Communication style</Label>
            <Input
              value={form.communication_style}
              onChange={(e) => set('communication_style', e.target.value)}
              placeholder="funny, calm, career-focused…"
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
              data-testid="memory-form-style-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Inside jokes</Label>
            <Input
              value={form.inside_jokes}
              onChange={(e) => set('inside_jokes', e.target.value)}
              placeholder="world domination…"
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
              data-testid="memory-form-jokes-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Important dates / context</Label>
            <Input
              value={form.important_dates}
              onChange={(e) => set('important_dates', e.target.value)}
              placeholder="interview on Friday, birthday next month…"
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
              data-testid="memory-form-important-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Anything else worth remembering…"
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/40"
              data-testid="memory-form-notes-textarea"
            />
          </div>
          <p className="text-[11px] text-white/45">
            Memory is private by design. You control what gets saved.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/80 hover:bg-white/[0.06]"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="lovli-cta text-white"
            data-testid="memory-save-button"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save memory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemoryListItem({ card, onEdit, onDelete }) {
  return (
    <GlassCard className="p-4" data-testid="memory-card-item">
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-semibold text-white" data-testid="memory-card-nickname">
                {card.nickname}
              </h3>
              {card.relationship_stage && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/70">
                  {card.relationship_stage}
                </span>
              )}
            </div>
            {card.where_met && (
              <p className="mt-0.5 text-[12px] text-white/55">Met at {card.where_met}</p>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onEdit(card)}
              className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
              data-testid="memory-edit-button"
              aria-label="Edit memory"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onDelete(card)}
              className="h-8 w-8 rounded-full border border-rose-300/15 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
              data-testid="memory-delete-button"
              aria-label="Delete memory"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[13px] text-white/85 sm:grid-cols-2">
          {card.likes && (
            <p><span className="text-white/55">Likes — </span>{card.likes}</p>
          )}
          {card.dislikes && (
            <p><span className="text-white/55">Avoid — </span>{card.dislikes}</p>
          )}
          {card.communication_style && (
            <p><span className="text-white/55">Vibe — </span>{card.communication_style}</p>
          )}
          {card.important_dates && (
            <p><span className="text-white/55">Important — </span>{card.important_dates}</p>
          )}
          {card.inside_jokes && (
            <p className="sm:col-span-2"><span className="text-white/55">Inside joke — </span>{card.inside_jokes}</p>
          )}
          {card.notes && (
            <p className="sm:col-span-2"><span className="text-white/55">Notes — </span>{card.notes}</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function PreviewExample() {
  return (
    <GlassCard className="p-4" data-testid="memory-preview-card">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-400">
          <BrainCircuit className="h-4 w-4 text-white" />
        </span>
        <h3 className="font-display text-base font-semibold text-white">Coffee Girl</h3>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/70">Talking</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[13px] text-white/85 sm:grid-cols-2">
        <p><span className="text-white/55">Vibe — </span>Funny, calm, career-focused</p>
        <p><span className="text-white/55">Likes — </span>Chai, indie music, quiet cafes</p>
        <p><span className="text-white/55">Avoid — </span>Too much flirting, pressure to meet</p>
        <p><span className="text-white/55">Important — </span>Interview on Friday</p>
        <p className="sm:col-span-2"><span className="text-white/55">Inside joke — </span>World domination</p>
        <p className="sm:col-span-2"><span className="text-white/55">Best approach — </span>Light, respectful, playful</p>
        <p className="sm:col-span-2"><span className="text-white/55">Next move — </span>Ask about her interview and keep it easy.</p>
      </div>
    </GlassCard>
  );
}

export default function Memory() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | card | {} for create
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/memory-cards');
      setCards(data || []);
    } catch {
      toast.error('Could not load your memory cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSaved = async (saved, action) => {
    toast.success(action === 'updated' ? 'Memory updated.' : 'Memory saved.');
    await refresh();
  };

  const onDelete = async (card) => {
    const ok = window.confirm(`Delete “${card.nickname}”? You can’t undo this.`);
    if (!ok) return;
    try {
      await api.delete(`/memory-cards/${card.id}`);
      toast.success('Memory deleted.');
      setCards((cs) => cs.filter((c) => c.id !== card.id));
    } catch {
      toast.error('Could not delete right now.');
    }
  };

  return (
    <AppShell>
      <div data-testid="memory-page" className="space-y-5">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              backgroundImage:
                'radial-gradient(60% 50% at 90% 10%, rgba(99,102,241,0.20), transparent 60%), radial-gradient(50% 50% at 10% 100%, rgba(168,85,247,0.14), transparent 60%)',
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/85">
              <BrainCircuit className="h-3 w-3" /> Private journal — you control what’s saved
            </span>
            <h1 className="mt-3 font-display text-2xl font-semibold text-white">Lovli Memory</h1>
            <p className="mt-1 text-sm text-white/70">
              Remember the little things. Reply more thoughtfully.
            </p>
            <p className="mt-2 text-[13px] text-white/55">
              Save details like inside jokes, favorite cafes, important dates, and context so future
              replies feel more personal. Memory is private by design.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">Your memories</h2>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { setEditing(null); setOpen(true); }}
                  className="lovli-cta text-white rounded-full min-h-[36px]"
                  data-testid="memory-create-button"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create memory
                </Button>
              </DialogTrigger>
              <MemoryFormDialog
                open={open}
                onOpenChange={setOpen}
                initial={editing}
                onSaved={onSaved}
              />
            </Dialog>
          </div>

          {loading ? (
            <div className="lovli-glass rounded-2xl p-6 text-center text-sm text-white/65">Loading…</div>
          ) : cards.length === 0 ? (
            <div className="lovli-glass rounded-2xl p-6" data-testid="memory-empty-state">
              <h3 className="font-display text-base font-semibold text-white">No memories yet</h3>
              <p className="mt-1 text-sm text-white/65">
                Save the little things so you never blank.
              </p>
              <div className="mt-4">
                <PreviewExample />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((c) => (
                <MemoryListItem
                  key={c.id}
                  card={c}
                  onEdit={(card) => { setEditing(card); setOpen(true); }}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </section>

        <section className="lovli-glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold text-white">Coming soon</h2>
          <p className="mt-1 text-sm text-white/65">
            Auto-summarize chats, gentle reminders, and date ideas — powered by your memories.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['AI summary of a memory', 'Reminders', 'Date ideas'].map((label) => (
              <button
                key={label}
                type="button"
                disabled
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/55"
                data-testid="memory-coming-soon-button"
              >
                <Lock className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
        </section>

        <section className="lovli-glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Get early access to the AI memory layer
          </h2>
          <p className="mt-1 text-sm text-white/65">
            We’ll let you in early when AI summaries, reminders, and date ideas go live.
          </p>
          <div className="mt-4">
            <EarlyAccessForm
              type="memory"
              source="memory-page"
              defaultEmail={user?.email || ''}
              question="What would you want Lovli Memory to remember? (dates, likes, chat context, date ideas, reminders, other)"
              successMessage="You’re on the Memory early access list."
              testIdPrefix="memory-early-access"
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
