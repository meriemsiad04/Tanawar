import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import Input from "../uiC/Input.jsx";
import Select, { Counter, FieldError, Req } from "../uiC/Select.jsx";
import { fieldShell } from "../uiC/fieldShell.js";
import SessionPreviewCard from "./SessionPreviewCard.jsx";
import { useDialog } from "../../hooks/useDialog.js";
import {
  ALLOWED_FILE_ACCEPT,
  ALLOWED_FILE_TYPES,
  LEVELS,
  LOCATIONS,
  MODULES_BY_LEVEL,
  SESSION_LIMITS as LIMITS,
} from "../../data/sessionOptions.js";

const INITIAL = {
  type: "instant",
  title: "",
  module: "",
  level: "",
  seats: "15",
  duration: "60",
  date: "",
  time: "",
  mode: "online",
  link: "",
  location: "",
  visibility: "public",
  description: "",
};
// helper functions 
const pad = (n) => String(n).padStart(2, "0"); //for formatting numbers
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;// for formatting date and time
// Checks whether a URL is valid and uses HTTP or HTTPS.
const isHttpUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};
const formatBytes = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
// Validates all session fields and returns an object containing validation errors.
function validate(v) {
  const e = {};
  if (!v.title.trim()) e.title = "Give your session a title.";
  if (!v.module) e.module = "Choose a module.";
  if (!v.level) e.level = "Choose a level.";

  const seats = Number(v.seats);
  if (!v.seats) e.seats = "Enter the number of seats.";
  else if (!Number.isInteger(seats) || seats < LIMITS.seats.min || seats > LIMITS.seats.max)
    e.seats = `Between ${LIMITS.seats.min} and ${LIMITS.seats.max} seats.`;

  if (v.type === "instant") {
    const d = Number(v.duration);
    if (!v.duration) e.duration = "Enter a duration.";
    else if (!Number.isInteger(d) || d < LIMITS.duration.min || d > LIMITS.duration.max)
      e.duration = `Between ${LIMITS.duration.min} and ${LIMITS.duration.max} minutes.`;
  } else {
    if (!v.date) e.date = "Pick a date.";
    if (!v.time) e.time = "Pick a time.";
    if (v.date && v.time && new Date(`${v.date}T${v.time}`) <= new Date()) e.time = "Choose a time in the future.";
  }

  if (v.mode === "online") {
    if (!v.link.trim()) e.link = "Add the meeting link.";
    else if (!isHttpUrl(v.link.trim())) e.link = "Enter a valid link starting with https://";
  } else if (!v.location) e.location = "Choose a location.";

  if (!v.description.trim()) e.description = "Add a short description.";
  return e;
}
// Reusable selection button for choosing between session options.

function Choice({ selected, onClick, icon, title, hint, className = "" }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={[
        "flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
        selected
          ? "border-primary bg-primary-soft text-primary-text"
          : "border-line-strong bg-surface text-fg hover:border-fg-3",
        className,
      ].join(" ")}
    >
      <Icon name={icon} size="sm" />
      <span className="flex flex-col items-start leading-tight">
        <span>{title}</span>
        {hint && <span className="text-xs font-normal text-fg-3">{hint}</span>}
      </span>
      {selected && hint && <Icon name="check" size="sm" className="ml-auto text-primary" />}
    </button>
  );
}
////////////////////////////////////////////////////////////////////////////////
/**/////////main function */
/**
 * Create Session pop-up (Dashboard CTA). Two columns: form on the left, live preview on the right.
 * Mount it only while open (state resets on every mount).
 * Props: user ({ fullName, initials }), onClose(), onCreate(session) — receives the validated session.
 */////////////////////////////////////////////////////////////////////////////
export default function CreateSessionModal({ user, onClose, onCreate }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const fileInputRef = useRef(null);
  const linkInputRef = useRef(null);
  const [values, setValues] = useState(INITIAL);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [resources, setResources] = useState([]);
  const [resourceError, setResourceError] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkDraftError, setLinkDraftError] = useState("");
  const [dragging, setDragging] = useState(false);
  const objectUrls = useRef(new Set());
  const [today] = useState(() => localDate(new Date()));

  const onKeyDown = useDialog(panelRef, onClose);
  const errors = useMemo(() => validate(values), [values]);
  const show = (field) => (submitted || touched[field] ? errors[field] : undefined);

  // Free blob: URLs for uploaded files when the modal closes.
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const setValue = (field, value) => setValues((v) => ({ ...v, [field]: value }));
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const addFiles = (fileList) => {
    const incoming = [...fileList];
    if (!incoming.length) return;
    const problems = [];
    const accepted = [];
    let room = LIMITS.resources - resources.length;

    for (const file of incoming) {
      const extOk = /\.(pdf|png|jpe?g)$/i.test(file.name);
      if (!ALLOWED_FILE_TYPES.includes(file.type) || !extOk) problems.push(`${file.name}: only PDF, PNG, JPG or JPEG files.`);
      else if (file.size > LIMITS.fileBytes) problems.push(`${file.name}: larger than ${formatBytes(LIMITS.fileBytes)}.`);
      else if (resources.some((r) => r.file && r.name === file.name && r.size === file.size) || accepted.some((a) => a.name === file.name && a.size === file.size))
        problems.push(`${file.name}: already added.`);
      else if (room <= 0) problems.push(`${file.name}: you can add up to ${LIMITS.resources} resources.`);
      else {
        const href = URL.createObjectURL(file);
        objectUrls.current.add(href);
        accepted.push({ id: crypto.randomUUID(), kind: "file", name: file.name, size: file.size, file, href, isImage: file.type.startsWith("image/") });
        room -= 1;
      }
    }
    if (accepted.length) setResources((r) => [...r, ...accepted]);
    setResourceError(problems.join(" "));
  };

  const removeResource = (id) => {
    setResources((rs) => {
      const gone = rs.find((r) => r.id === id);
      if (gone?.kind === "file") {
        URL.revokeObjectURL(gone.href);
        objectUrls.current.delete(gone.href);
      }
      return rs.filter((r) => r.id !== id);
    });
    setResourceError("");
  };

  const openLinkInput = () => {
    setAddingLink(true);
    setTimeout(() => linkInputRef.current?.focus(), 0);
  };

  const commitLink = () => {
    const url = linkDraft.trim();
    if (!isHttpUrl(url)) return setLinkDraftError("Enter a valid link starting with https://");
    if (resources.length >= LIMITS.resources) return setLinkDraftError(`You can add up to ${LIMITS.resources} resources.`);
    if (resources.some((r) => r.kind === "link" && r.href === url)) return setLinkDraftError("This link is already added.");
    setResources((rs) => [...rs, { id: crypto.randomUUID(), kind: "link", name: url, href: url }]);
    setLinkDraft("");
    setLinkDraftError("");
    setAddingLink(false);
  };

  const whenLabel = useMemo(() => {
    if (values.type !== "scheduled" || !values.date) return "";
    const d = new Date(`${values.date}T${values.time || "00:00"}`);
    if (Number.isNaN(d.getTime())) return "";
    const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    return values.time ? `${day}, ${values.time}` : day;
  }, [values.type, values.date, values.time]);

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const first = Object.keys(errors)[0];
    if (first) {
      panelRef.current?.querySelector(`[data-field="${first}"] input, [data-field="${first}"] select, [data-field="${first}"] textarea`)?.focus();
      return;
    }
    const instant = values.type === "instant";
    onCreate?.({
      type: values.type,
      title: values.title.trim(),
      module: values.module,
      level: values.level,
      seats: Number(values.seats),
      duration: instant ? Number(values.duration) : null,
      startsAt: instant ? new Date().toISOString() : new Date(`${values.date}T${values.time}`).toISOString(),
      mode: values.mode,
      meetingLink: values.mode === "online" ? values.link.trim() : null,
      location: values.mode === "onsite" ? values.location : null,
      visibility: values.visibility,
      description: values.description.trim(),
      resources: resources.map(({ id, kind, name, href, file }) => ({ id, kind, name, ...(kind === "link" ? { url: href } : { file }) })),
    });
  };

  const preview = {
    ...values,
    resources: resources.map(({ id, kind, name, href, isImage }) => ({ id, kind, name, href, isImage })),
    whenLabel,
  };
  const instant = values.type === "instant";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4" onKeyDown={onKeyDown}>
      <div aria-hidden="true" onClick={onClose} className="animate-overlay-in fixed inset-0 bg-ink/60 backdrop-blur-md dark:bg-black/60" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-dialog-in relative my-auto flex w-full max-w-[1100px] flex-col overflow-hidden rounded-[24px] border border-line bg-surface shadow-pop outline-none lg:h-[min(860px,calc(100vh-2rem))] lg:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Icon name="close" size="sm" />
        </button>

        {/* Form column */}
        <form noValidate onSubmit={submit} className="flex min-w-0 flex-col lg:w-[60%] lg:min-h-0">
          <div className="flex flex-col gap-5 px-6 pt-6 lg:flex-1 lg:overflow-y-auto lg:px-8">
            <header className="flex items-center gap-4">
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="calendarPlus" size="lg" />
              </span>
              <div>
                <h2 id={titleId} className="text-[26px] font-extrabold leading-8 text-fg">
                  Create Session
                </h2>
                <p className="text-sm leading-5 text-fg-2">Share what you know with fellow UMBB students.</p>
              </div>
            </header>

            <div role="radiogroup" aria-label="Session type" className="grid grid-cols-2 gap-3">
              <Choice className="h-[68px]" selected={instant} onClick={() => setValue("type", "instant")} icon="bolt" title="Instant" hint="Start now" />
              <Choice className="h-[68px]" selected={!instant} onClick={() => setValue("type", "scheduled")} icon="calendar" title="Scheduled" hint="Plan for later" />
            </div>

            <div data-field="title">
              <Input
                label={<>Title<Req /></>}
                value={values.title}
                onChange={set("title")}
                onBlur={blur("title")}
                maxLength={LIMITS.title}
                placeholder="e.g. Pointers in C, finally explained"
                error={show("title")}
                trailing={<Counter value={values.title} max={LIMITS.title} />}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div data-field="level">
                <Select label="Level" required icon="levels" value={values.level} onChange={(e) => setValues((v) => ({ ...v, level: e.target.value, module: "" }))} onBlur={blur("level")} options={LEVELS} placeholder="Select a level" error={show("level")} />
              </div>
              <div data-field="module">
                <Select label="Module" required icon="books" value={values.module} onChange={set("module")} onBlur={blur("module")} options={MODULES_BY_LEVEL[values.level] ?? []} placeholder={values.level ? "Select a module" : "Choose a level first"} disabled={!values.level} error={show("module")} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {instant ? (
                <div data-field="duration">
                  <Input label={<>Duration (min)<Req /></>} icon="clock" type="number" inputMode="numeric" min={LIMITS.duration.min} max={LIMITS.duration.max} value={values.duration} onChange={set("duration")} onBlur={blur("duration")} error={show("duration")} />
                </div>
              ) : (
                <>
                  <div data-field="date">
                    <Input label={<>Date<Req /></>} icon="calendar" type="date" min={today} value={values.date} onChange={set("date")} onBlur={blur("date")} error={show("date")} />
                  </div>
                  <div data-field="time">
                    <Input label={<>Time<Req /></>} icon="clock" type="time" value={values.time} onChange={set("time")} onBlur={blur("time")} error={show("time")} />
                  </div>
                </>
              )}
              <div data-field="seats" className={instant ? "" : "sm:col-span-2"}>
                <Input label={<>Nb. of seats<Req /></>} icon="users" type="number" inputMode="numeric" min={LIMITS.seats.min} max={LIMITS.seats.max} value={values.seats} onChange={set("seats")} onBlur={blur("seats")} error={show("seats")} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-bold leading-[18px] text-fg">Mode<Req /></p>
              <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 gap-3">
                <Choice className="h-11" selected={values.mode === "online"} onClick={() => setValue("mode", "online")} icon="wifi" title="Online" />
                <Choice className="h-11" selected={values.mode === "onsite"} onClick={() => setValue("mode", "onsite")} icon="pin" title="On-site" />
              </div>
            </div>

            {values.mode === "online" ? (
              <div data-field="link">
                <Input label={<>Meet link<Req /></>} icon="link" type="url" inputMode="url" value={values.link} onChange={set("link")} onBlur={blur("link")} placeholder="https://meet.google.com/…" error={show("link")} />
              </div>
            ) : (
              <div data-field="location">
                <Select label="Location" required icon="pin" value={values.location} onChange={set("location")} onBlur={blur("location")} options={LOCATIONS} placeholder="Select a location" error={show("location")} />
              </div>
            )}

            <div>
              <p className="mb-1.5 text-[13px] font-bold leading-[18px] text-fg">Visibility</p>
              <div role="radiogroup" aria-label="Visibility" className="grid grid-cols-2 gap-3">
                <Choice className="h-11" selected={values.visibility === "public"} onClick={() => setValue("visibility", "public")} icon="globe" title="Public" />
                <Choice className="h-11" selected={values.visibility === "private"} onClick={() => setValue("visibility", "private")} icon="lock" title="Private" />
              </div>
              <p className="mt-1.5 text-xs text-fg-3">
                {values.visibility === "public" ? "Anyone can join instantly." : "Students must request to join and you approve them."}
              </p>
            </div>

            <div data-field="description">
              <label htmlFor="cs-description" className="mb-1.5 flex items-center justify-between text-[13px] font-bold leading-[18px] text-fg">
                <span>Description<Req /></span>
                <Counter value={values.description} max={LIMITS.description} />
              </label>
              <div className={`${fieldShell(show("description"))} items-start py-2.5`}>
                <Icon name="text" size="sm" className="mt-0.5 text-fg-3" />
                <textarea
                  id="cs-description"
                  rows={3}
                  value={values.description}
                  onChange={set("description")}
                  onBlur={blur("description")}
                  maxLength={LIMITS.description}
                  placeholder="Add a short description about the session…"
                  aria-invalid={show("description") ? true : undefined}
                  className="min-w-0 flex-1 resize-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-3"
                />
              </div>
              <FieldError>{show("description")}</FieldError>
            </div>

            {/* Resources */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold leading-[18px] text-fg">
                <Icon name="paperclip" size="sm" className="!size-4 text-accent" />
                Resources <span className="font-normal text-fg-3">(optional)</span>
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 transition-colors ${dragging ? "border-primary bg-primary-soft" : "border-line-strong bg-surface-2/50"}`}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Icon name="upload" size="lg" className="text-primary" />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-fg">Drag and drop files here, or click to upload</span>
                    <span className="text-xs text-fg-3">PDF, PNG, JPG, JPEG · up to {formatBytes(LIMITS.fileBytes)} each · or add links</span>
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button size="s" variant="outline" onClick={openLinkInput}>
                  <Icon name="link" size="sm" className="!size-4" /> Add link
                </Button>
              </div>

              {addingLink && (
                <div className="mt-2.5 flex items-start gap-2">
                  <Input
                    ref={linkInputRef}
                    className="flex-1"
                    icon="link"
                    type="url"
                    placeholder="https://docs.example.com"
                    value={linkDraft}
                    onChange={(e) => {
                      setLinkDraft(e.target.value);
                      setLinkDraftError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitLink();
                      }
                    }}
                    error={linkDraftError}
                    aria-label="Resource link"
                  />
                  <Button size="m" className="!h-11" onClick={commitLink}>
                    Add
                  </Button>
                  <Button size="m" variant="outline" className="!h-11" onClick={() => { setAddingLink(false); setLinkDraft(""); setLinkDraftError(""); }}>
                    Cancel
                  </Button>
                </div>
              )}

              {resourceError && (
                <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-semibold leading-4 text-live">
                  <Icon name="alert" size="sm" className="!size-3.5 shrink-0" />
                  {resourceError}
                </p>
              )}

              {resources.length > 0 && (
                <ul className="mt-2.5 flex flex-col gap-2">
                  {resources.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3 py-2">
                      <Icon name={r.kind === "link" ? "link" : r.isImage ? "image" : "file"} size="sm" className="text-accent" />
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">{r.name}</span>
                      {r.size && <span className="text-xs text-fg-3">{formatBytes(r.size)}</span>}
                      <button
                        type="button"
                        onClick={() => removeResource(r.id)}
                        aria-label={`Remove ${r.name}`}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-danger-soft hover:text-live focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-live/40"
                      >
                        <Icon name="trash" size="sm" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <footer className="mt-5 flex items-center justify-between gap-3 border-t border-line bg-surface px-6 py-4 lg:px-8">
            <Button variant="outline" size="m" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="m" className="min-w-[200px]">
              <Icon name="calendarPlus" size="sm" /> Create Session
            </Button>
          </footer>
        </form>

        {/* Live preview column: its own scroll area, so it stays in view while the form scrolls */}
        <aside
          aria-label="Live preview"
          className="flex flex-col gap-4 border-t border-line bg-bg p-6 lg:min-h-0 lg:w-[40%] lg:overflow-y-auto lg:border-l lg:border-t-0"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1.5 text-[13px] font-bold text-primary-text">
            <Icon name="eye" size="sm" className="!size-4" /> Live preview
          </span>
          <SessionPreviewCard session={preview} host={{ initials: user?.initials || "?", name: user?.fullName || "You" }} />
        </aside>
      </div>
    </div>,
    document.body
  );
}
