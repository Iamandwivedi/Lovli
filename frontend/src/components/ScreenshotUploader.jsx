import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

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
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
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
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-black/55 text-white/90 hover:bg-black/70"
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
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors ${
          drag
            ? 'border-indigo-300/40 bg-indigo-400/[0.08]'
            : 'border-white/14 bg-white/[0.03] hover:bg-white/[0.05]'
        }`}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
          <Upload className="h-4 w-4 text-white/80" />
        </span>
        <span className="text-sm text-white/85 font-medium">
          Tap to upload chat screenshot
        </span>
        <span className="text-xs text-white/55">JPG, PNG, or WEBP — up to 6MB</span>
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
      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/55">
        <ImageIcon className="h-3 w-3" /> Only upload chats you’re comfortable sharing with Lovli.
      </p>
    </div>
  );
}
