import { useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import Input from "../uiC/Input.jsx";
import Select, { Counter, FieldError } from "../uiC/Select.jsx";
import { fieldShell } from "../uiC/fieldShell.js";
import StudyIllustration from "./StudyIllustration.jsx";
import { useDialog } from "../../hooks/useDialog.js";
import { MODULES_BY_LEVEL } from "../../data/sessionOptions.js";
import { STUDY_LIMITS, createStudyRoom, joinStudyRoom, validateStudyRoom } from "../../services/studyRoomsService.js";

/** The student's own level first, then every other module once (placeholder list until the modules API exists). */
function moduleOptions(level) {
  const mine = MODULES_BY_LEVEL[level] ?? [];
  const rest = Object.values(MODULES_BY_LEVEL).flat().filter((m) => !mine.includes(m));
  return [...new Set([...mine, ...rest.sort((a, b) => a.localeCompare(b, "fr"))]), "Other / general revision"];
}

/**
 * "Open a study room" pop-up. Creates the room, then seats the creator in it (their timer starts),
 * and calls `onCreated(room)`. Mount it only while open.
 */
export default function CreateStudyRoomModal({ level, onClose, onCreated }) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const [form, setForm] = useState({ title: "", module: "", description: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState(null);
  const options = useMemo(() => moduleOptions(level), [level]);

  const close = () => {
    if (!busy) onClose?.();
  };
  const onKeyDown = useDialog(panelRef, close);
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    const found = validateStudyRoom(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setServerError(null);
    try {
      const { room } = await createStudyRoom(form);
      await joinStudyRoom(room.id);
      onCreated?.(room);
    } catch (err) {
      if (err?.code === "VALIDATION_ERROR" && err.details?.fields) setErrors(err.details.fields);
      setServerError(err?.message ?? "Couldn’t open the room. Please try again.");
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-4 sm:items-center" onKeyDown={onKeyDown}>
      <div aria-hidden="true" onClick={close} className="animate-overlay-in fixed inset-0 bg-ink/60 backdrop-blur-md dark:bg-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-dialog-in relative my-auto w-full max-w-[480px] overflow-hidden rounded-[24px] border border-line bg-surface shadow-pop outline-none"
      >
        <div className="relative flex items-end justify-between gap-4 overflow-hidden bg-ink px-6 pb-0 pt-6">
          <span aria-hidden="true" className="absolute -right-10 -top-16 size-48 rounded-full bg-highlight/25 blur-3xl" />
          <div className="relative flex flex-col gap-1 pb-6">
            <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-on-dark-2">Study With Me</p>
            <h2 id={titleId} className="font-serif text-2xl font-bold leading-8 text-white">Open a study room</h2>
            <p className="text-[13px] leading-[19px] text-on-dark-2">Anyone can drop in and study beside you. No camera, no chat.</p>
          </div>
          <StudyIllustration seed={`new-${titleId}`} pose={0} className="relative w-[120px] shrink-0" />
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-on-dark-2 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50"
          >
            <Icon name="close" size="sm" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <Input
              label="Room name"
              icon="lamp"
              value={form.title}
              onChange={set("title")}
              maxLength={STUDY_LIMITS.title.max}
              placeholder="e.g. Silent revision before the Analyse 2 exam"
              error={errors.title}
              disabled={busy}
            />
            <div className="flex justify-end">
              <Counter value={form.title} max={STUDY_LIMITS.title.max} />
            </div>
          </div>

          <Select
            label="What are you studying?"
            icon="books"
            value={form.module}
            onChange={set("module")}
            options={options}
            placeholder="Choose a module"
            error={errors.module}
            required
            disabled={busy}
          />

          <div className="flex flex-col">
            <label htmlFor={descId} className="mb-1.5 flex items-center justify-between text-[13px] font-bold leading-[18px] text-fg">
              <span>
                Room note <span className="font-normal text-fg-3">(optional)</span>
              </span>
              <Counter value={form.description} max={STUDY_LIMITS.description} />
            </label>
            <div className={`${fieldShell(errors.description)} py-2.5`}>
              <textarea
                id={descId}
                rows={2}
                value={form.description}
                onChange={set("description")}
                maxLength={STUDY_LIMITS.description}
                disabled={busy}
                placeholder="House rules or today’s goal, e.g. “Pomodoro 50/10, chapter 3”"
                className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-5 text-fg outline-none placeholder:text-fg-3"
              />
            </div>
            <FieldError>{errors.description}</FieldError>
          </div>

          {serverError && (
            <p role="alert" className="flex items-start gap-2 rounded-[12px] bg-danger-soft px-3 py-2.5 text-[13px] font-semibold leading-[19px] text-live">
              <Icon name="alert" size="sm" className="mt-px" /> {serverError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">
            <Button variant="outline" size="s" onClick={close} disabled={busy} className="dark:bg-surface dark:text-fg">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="s" disabled={busy}>
              {busy ? <Icon name="loader" size="sm" className="animate-spin" /> : <Icon name="lamp" size="sm" />}
              {busy ? "Opening…" : "Open room & take a seat"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
