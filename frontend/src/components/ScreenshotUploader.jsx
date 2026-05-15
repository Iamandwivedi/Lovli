import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, ShieldCheck } from 'lucide-react';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

export default function ScreenshotUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(
    (file) => {
      setError('');
      if (!file) return;
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Use a clear JPG, PNG, or WEBP image.');
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        setError('Image too large (max 6MB).');
        return;
      }
      const url = URL.createObjectURL(file);
      onChange?.({ file, previewUrl: url });
    },
    [onChange]
  );

  const onPick = (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  if (value?.previewUrl) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-lovli-border bg-lovli-card"
        data-testid="reply-screenshot-preview"
      >
        <img
          src={value.previewUrl}
          alt="Chat screenshot preview"
          className="max-h-[320px] w-full object-contain"
        />
        <button
          type="button"
          onClick={() => onChange?.(null)}
          aria-label="Remove image"
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-lovli-border bg-lovli-bg/80 text-lovli-text-soft hover:bg-lovli-bg hover:text-lovli-text transition-colors"
          data-testid="reply-screenshot-remove-button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        data-testid="reply-screenshot-uploader"
        className={`group flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lovli-lavender/55 ${
          drag
            ? 'border-lovli-lavender/55 bg-lovli-lavender/8'
            : 'border-lovli-border bg-lovli-card hover:bg-lovli-card-2 hover:border-lovli-lavender/40'
        }`}
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-lovli-lavender/30 bg-lovli-lavender/10 transition-transform group-hover:scale-[1.03]">
          <Upload className="h-4 w-4 text-lovli-lavender" />
        </span>
        <span className="text-[15px] text-lovli-text font-semibold">
          Upload chat screenshot
        </span>
        <span className="text-xs text-lovli-text-muted">
          Instagram, Dating platform, or WhatsApp
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onPick}
          className="hidden"
          data-testid="reply-screenshot-file-input"
        />
      </button>
      {error && (
        <p className="mt-2 text-xs text-rose-300" data-testid="reply-screenshot-error">
          {error}
        </p>
      )}
      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-lovli-text-muted">
        <ShieldCheck className="h-3 w-3" /> Only upload chats you’re comfortable sharing.
      </p>
    </div>
  );
}
