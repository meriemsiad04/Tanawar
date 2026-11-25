import { useEffect, useId, useRef, useState } from "react";
import Icon from "../uiC/Icon.jsx";
import { DOCUMENT_RULES } from "../../services/verificationService.js";

const formatBytes = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Single-file picker for the verification document (drag and drop or click), with an image thumbnail.
 * The parent validates (validateDocument) and passes `error`.
 */
export default function DocumentDropzone({ label, file, onChange, onBlur, error, disabled = false, required = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const thumbRef = useRef(null);
  const isImage = Boolean(file?.type?.startsWith("image/"));
  const labelId = useId();
  const errorId = useId();

  // Object URL for the thumbnail, revoked when the file changes or the component unmounts.
  useEffect(() => {
    if (!isImage || !thumbRef.current) return;
    const url = URL.createObjectURL(file);
    thumbRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const pick = (files) => {
    const next = files?.[0];
    if (next) onChange(next);
    onBlur?.();
  };

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-labelledby={labelId} aria-describedby={error ? errorId : undefined}>
      <p id={labelId} className="text-[13px] font-bold leading-[18px] text-fg">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </p>

      {file ? (
        <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${error ? "border-live" : "border-line-strong"} bg-surface`}>
          {isImage ? (
            <img ref={thumbRef} alt="" className="size-12 shrink-0 rounded-lg border border-line object-cover" />
          ) : (
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
              <Icon name="file" size="lg" />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-fg">{file.name}</span>
            <span className="text-xs text-fg-3">{formatBytes(file.size)}</span>
          </span>
          <button
            type="button"
            name="document"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="cursor-pointer rounded-md px-2 py-1 text-[13px] font-bold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              onBlur?.();
            }}
            disabled={disabled}
            aria-label={`Remove ${file.name}`}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-live focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="trash" size="sm" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          name="document"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled) pick(e.dataTransfer.files);
          }}
          className={[
            "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
            dragging ? "border-primary bg-primary-soft" : error ? "border-live bg-danger-soft/40" : "border-line-strong bg-surface-2/50 hover:border-fg-3",
          ].join(" ")}
        >
          <Icon name="upload" size="lg" className="text-primary-text" />
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-fg">Drag and drop, or click to upload</span>
            <span className="text-xs text-fg-3">{DOCUMENT_RULES.label}</span>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_RULES.accept}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs font-semibold leading-4 text-live">
          <Icon name="alert" size="sm" className="!size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
