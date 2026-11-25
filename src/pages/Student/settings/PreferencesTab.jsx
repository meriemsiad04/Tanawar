import { useId, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Dropdown from "../../../Components/uiC/Dropdown.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Input from "../../../Components/uiC/Input.jsx";
import { ALL_MODULES } from "../../../data/profileOptions.js";
import {
  FONT_SIZE_OPTIONS,
  LANGUAGES,
  NOTIFICATION_OPTIONS,
  SETTINGS_LIMITS as LIMITS,
  STUDY_TIMES,
  THEME_OPTIONS,
} from "../../../services/settingsService.js";
import { Row, Section, Segmented, SwitchRow } from "./settingsUi.jsx";

const fmtMinutes = (m) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`);
const DAILY_GOALS = [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480].map((m) => ({ value: m, label: fmtMinutes(m) }));

/* ───────────── Learning ───────────── */

function ModulePicker({ value, onChange, changed, error }) {
  const [query, setQuery] = useState("");
  const atLimit = value.length >= LIMITS.favoriteModules;
  const needle = query.trim().toLowerCase();
  const visible = ALL_MODULES.filter((m) => m.toLowerCase().includes(needle));
  const toggle = (m) => onChange(value.includes(m) ? value.filter((x) => x !== m) : atLimit ? value : [...value, m]);

  return (
    <Row
      stack
      changed={changed}
      error={error}
      label={
        <>
          Favourite modules <span className="text-xs font-normal text-fg-3">{value.length}/{LIMITS.favoriteModules}</span>
        </>
      }
      hint="Modules you want to work on. They’re suggested first when you open a study room, and shape your recommendations."
    >
      <div className="flex flex-col gap-2.5">
        {value.length > 0 && (
          <ul aria-label="Selected modules" className="flex flex-wrap gap-2">
            {value.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => toggle(m)}
                  aria-label={`Remove ${m}`}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary bg-primary-soft py-1.5 pl-3 pr-2 text-xs font-semibold text-primary-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                >
                  {m} <Icon name="close" size="sm" className="!size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Input icon="search" type="search" aria-label="Search modules" placeholder="Search modules to add" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-line bg-surface-2 p-3">
          {visible
            .filter((m) => !value.includes(m))
            .map((m) => (
              <button
                key={m}
                type="button"
                disabled={atLimit}
                onClick={() => toggle(m)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-fg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="plus" size="sm" className="!size-3.5" /> {m}
              </button>
            ))}
          {!visible.length && <p className="text-sm text-fg-3">No module matches “{query}”.</p>}
        </div>
        {atLimit && <p className="text-xs text-fg-3">You can pick up to {LIMITS.favoriteModules} modules. Remove one to add another.</p>}
      </div>
    </Row>
  );
}

function GoalsEditor({ value, onChange, changed, error }) {
  const [text, setText] = useState("");
  const full = value.length >= LIMITS.goals;
  const add = () => {
    const g = text.trim();
    if (!g || full) return;
    onChange([...value, g.slice(0, LIMITS.goalText)]);
    setText("");
  };
  return (
    <Row stack changed={changed} error={error} label="Learning goals" hint={`Up to ${LIMITS.goals} goals, shown on your Study With Me page to keep you on track.`}>
      <div className="flex flex-col gap-2.5">
        {value.length > 0 && (
          <ol className="flex flex-col gap-2">
            {value.map((g, i) => (
              <li key={`${i}-${g}`} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-1.5">
                <Icon name="target" size="sm" className="!size-4 text-primary-text" />
                <span className="min-w-0 flex-1 text-sm text-fg [overflow-wrap:anywhere]">{g}</span>
                <button
                  type="button"
                  aria-label={`Remove goal: ${g}`}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-3 hover:bg-surface hover:text-live focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Icon name="trash" size="sm" className="!size-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
        {!full && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="flex-1"
              icon="target"
              aria-label="New learning goal"
              placeholder="e.g. Pass Bases de données with 14/20"
              maxLength={LIMITS.goalText}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button size="s" variant="outline" onClick={add} disabled={!text.trim()} className="h-11 dark:bg-surface dark:text-fg">
              <Icon name="plus" size="sm" /> Add goal
            </Button>
          </div>
        )}
      </div>
    </Row>
  );
}

function StudyTimes({ value, onChange, changed }) {
  const id = useId();
  const toggle = (t) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <Row stack changed={changed} labelId={id} label="When I usually study" hint="Used to suggest sessions and rooms at times that suit you.">
      <div role="group" aria-labelledby={id} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STUDY_TIMES.map((t) => {
          const on = value.includes(t.value);
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t.value)}
              className={`flex cursor-pointer flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                on ? "border-primary bg-primary-soft" : "border-line-strong bg-surface hover:bg-surface-2"
              }`}
            >
              <span className={`text-sm font-bold ${on ? "text-primary-text" : "text-fg"}`}>{t.label}</span>
              <span className="text-[11px] text-fg-3">{t.hint}</span>
            </button>
          );
        })}
      </div>
    </Row>
  );
}

/* ───────────── Tab ───────────── */

/**
 * Preferences — how I use TANAWAR. Edits a draft owned by the Settings page:
 * `value` (draft), `set(path, v)`, `changed(path)` (unsaved?), `errors` (by path).
 */
export default function PreferencesTab({ value, set, changed, errors }) {
  const l = value.learning;
  const a = value.appearance;
  const n = value.notifications;
  const allOn = NOTIFICATION_OPTIONS.every((o) => n[o.key]);
  const weeklyId = useId();
  const dailyId = useId();

  return (
    <>
      <Section id="learning" icon="books" title="Learning" description="Your modules, goals and study rhythm.">
        <div className="flex flex-col divide-y divide-line">
          <ModulePicker value={l.favoriteModules} onChange={(v) => set("learning.favoriteModules", v)} changed={changed("learning.favoriteModules")} error={errors["learning.favoriteModules"]} />
          <GoalsEditor value={l.goals} onChange={(v) => set("learning.goals", v)} changed={changed("learning.goals")} error={errors["learning.goals"]} />

          <Row label="Daily study goal" labelId={dailyId} hint="Tracked on your Study With Me page." changed={changed("learning.dailyGoalMinutes")} error={errors["learning.dailyGoalMinutes"]}>
            <Dropdown
              ariaDescribedBy={dailyId}
              ariaLabel="Daily study goal"
              icon="timer"
              value={l.dailyGoalMinutes}
              options={DAILY_GOALS.some((o) => o.value === l.dailyGoalMinutes) ? DAILY_GOALS : [{ value: l.dailyGoalMinutes, label: fmtMinutes(l.dailyGoalMinutes) }, ...DAILY_GOALS]}
              onChange={(v) => set("learning.dailyGoalMinutes", v)}
              className="w-full sm:w-[180px]"
            />
          </Row>

          <Row label="Weekly study goal" labelId={weeklyId} hint={`Hours per week (${LIMITS.weeklyGoalHours.min}–${LIMITS.weeklyGoalHours.max}).`} changed={changed("learning.weeklyGoalHours")} error={errors["learning.weeklyGoalHours"]}>
            <Input
              aria-labelledby={weeklyId}
              icon="clock"
              type="number"
              inputMode="numeric"
              min={LIMITS.weeklyGoalHours.min}
              max={LIMITS.weeklyGoalHours.max}
              step={1}
              value={Number.isFinite(l.weeklyGoalHours) ? l.weeklyGoalHours : ""}
              onChange={(e) => set("learning.weeklyGoalHours", e.target.value === "" ? NaN : Number(e.target.value))}
              className="w-full sm:w-[180px]"
            />
          </Row>

          <StudyTimes value={l.studyTimes} onChange={(v) => set("learning.studyTimes", v)} changed={changed("learning.studyTimes")} />
        </div>

        <h3 className="flex items-center gap-2 pb-1 pt-5 text-sm font-extrabold uppercase tracking-[0.08em] text-fg-3">
          <Icon name="lamp" size="sm" className="!size-4" /> Study With Me
        </h3>
        <div className="flex flex-col divide-y divide-line">
          <SwitchRow
            label="Ask before leaving a room"
            hint="Show a confirmation so you don’t stop your timer by accident."
            checked={l.studyWithMe.confirmLeave}
            onChange={(v) => set("learning.studyWithMe.confirmLeave", v)}
            changed={changed("learning.studyWithMe.confirmLeave")}
          />
          <SwitchRow
            label="Show my timer in the browser tab"
            hint="Keeps your study time visible from other tabs."
            checked={l.studyWithMe.timerInTab}
            onChange={(v) => set("learning.studyWithMe.timerInTab", v)}
            changed={changed("learning.studyWithMe.timerInTab")}
          />
          <SwitchRow
            label="Appear in room rankings"
            hint="When off, other students see you studying but not your time."
            checked={l.studyWithMe.showInRanking}
            onChange={(v) => set("learning.studyWithMe.showInRanking", v)}
            changed={changed("learning.studyWithMe.showInRanking")}
          />
        </div>
      </Section>

      <Section id="appearance" icon="palette" title="Appearance" description="Changes preview right away. Save to keep them on all your devices.">
        <div className="flex flex-col divide-y divide-line">
          <Row stack label="Theme" changed={changed("appearance.theme")} hint="System follows your device’s light or dark setting.">
            <Segmented label="Theme" value={a.theme} options={THEME_OPTIONS} onChange={(v) => set("appearance.theme", v)} />
          </Row>
          <Row stack label="Language" changed={changed("language")} hint="The public pages are translated; the student app is in English for now and will follow this choice as translations land.">
            <Segmented label="Language" value={value.language} options={LANGUAGES.map((o) => ({ ...o, lang: o.value }))} onChange={(v) => set("language", v)} />
          </Row>
          <Row stack label="Text size" changed={changed("appearance.fontSize")} hint="Scales text and spacing across TANAWAR.">
            <Segmented label="Text size" value={a.fontSize} options={FONT_SIZE_OPTIONS} onChange={(v) => set("appearance.fontSize", v)} />
          </Row>
          <SwitchRow
            label="Reduce animations"
            hint="Turns off motion effects and transitions. Your device’s own reduced-motion setting is always respected."
            checked={a.reduceMotion}
            onChange={(v) => set("appearance.reduceMotion", v)}
            changed={changed("appearance.reduceMotion")}
          />
        </div>
      </Section>

      <Section
        id="notifications"
        icon="bell"
        title="Notifications"
        description="Choose what TANAWAR tells you about. Each one can be turned on or off on its own."
        action={
          <Button
            size="s"
            variant="outline"
            onClick={() => set("notifications", Object.fromEntries(NOTIFICATION_OPTIONS.map((o) => [o.key, !allOn])))}
            className="dark:bg-surface dark:text-fg"
          >
            {allOn ? "Turn all off" : "Turn all on"}
          </Button>
        }
      >
        <div className="flex flex-col divide-y divide-line">
          {NOTIFICATION_OPTIONS.map((o) => (
            <SwitchRow
              key={o.key}
              label={o.label}
              hint={o.hint}
              checked={n[o.key]}
              onChange={(v) => set(`notifications.${o.key}`, v)}
              changed={changed(`notifications.${o.key}`)}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
