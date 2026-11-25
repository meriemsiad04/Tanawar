import Icon from "../../Components/uiC/Icon.jsx";

// Frequently asked questions about how TANAWAR works (placeholder copy until the help content is written).
const FAQ = [
  {
    q: "What’s the difference between a public and a private session?",
    a: "Anyone can join a public session instantly while seats are left. For a private session you send a request, and the host approves or declines it from Bookings → Requests to approve.",
  },
  {
    q: "How do I host a session?",
    a: "Use Create session on the dashboard or the Sessions page. Instant sessions start right away; scheduled ones appear in the list for other students to join.",
  },
  {
    q: "Where do I find the sessions I joined?",
    a: "In Bookings → My bookings. Sessions you joined show Enter classroom; requests still waiting for the host show Pending.",
  },
  {
    q: "Can I leave a session after joining?",
    a: "Yes. Choose Leave on the session card or in Bookings. Your seat is freed for someone else, and you can join again later if seats remain.",
  },
  {
    q: "How are recommendations picked?",
    a: "For you ranks sessions by your modules, your level, sessions hosted by your friends and whether seats are left. Add your strong modules in your profile to improve them.",
  },
  {
    q: "How does rating a tutor work?",
    a: "Open a student’s profile and pick 1 to 5 stars under Rating. You can change your rating at any time; only the average is shown to others.",
  },
];

/** Help: FAQ (native disclosure, keyboard friendly) and a contact card. */
export default function HelpP() {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Help</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">Answers to common questions about sessions, bookings and your profile.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="flex flex-col gap-2.5">
          {FAQ.map(({ q, a }) => (
            <li key={q}>
              <details className="group rounded-[18px] border border-line bg-surface px-5 py-4 open:border-accent-line">
                <summary className="flex cursor-pointer list-none items-center gap-3 text-[15px] font-bold leading-5 text-fg [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{q}</span>
                  <Icon name="chevronDown" size="sm" className="text-fg-3 transition-transform group-open:rotate-180" />
                </summary>
                <p className="pt-2.5 text-sm leading-6 text-fg-2">{a}</p>
              </details>
            </li>
          ))}
        </ul>

        <aside className="flex flex-col gap-3 rounded-[20px] bg-ink p-6 text-white">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/10">
            <Icon name="help" />
          </span>
          <h2 className="text-lg font-extrabold leading-6">Still stuck?</h2>
          <p className="text-[13px] leading-[19px] text-on-dark-2">
            Tell us what went wrong and the TANAWAR team will get back to you.
          </p>
          {/* TODO: replace with the real support address once it exists. */}
          <a
            href="mailto:support@tanawar.example"
            className="mt-1 inline-flex h-[38px] items-center justify-center rounded-[10px] bg-highlight px-4 text-sm font-bold text-ink hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-highlight/50"
          >
            Contact support
          </a>
        </aside>
      </div>
    </>
  );
}
