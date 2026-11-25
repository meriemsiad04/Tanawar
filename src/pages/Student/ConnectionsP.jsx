import { useMemo, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import { fieldShell } from "../../Components/uiC/fieldShell.js";
import StudentCard from "../../Components/sharedC/StudentCard.jsx";
import SuggestedStudentCard from "../../Components/sharedC/SuggestedStudentCard.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { getFriends, getModules, getSuggestedStudents, sendFriendRequest } from "../../services/studentsService.js";

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

async function loadConnections() {
  const [friends, modules] = await Promise.all([getFriends(), getModules().catch(() => [])]);
  const suggestions = await getSuggestedStudents(modules ?? []);
  return { friends, suggestions };
}

const matches = (s, q) => !q || [s.fullName, s.major, s.level].some((t) => t?.toLowerCase().includes(q));

/** Connections: the student's friends and suggested students (ranked like the dashboard), with a search. */
export default function ConnectionsP() {
  const { status, data, reload } = useAsync(loadConnections);
  const [query, setQuery] = useState("");
  const [friend, setFriend] = useState({}); // id → "sending" | "sent"
  const [friendError, setFriendError] = useState("");

  const q = query.trim().toLowerCase();
  const friends = useMemo(() => (data?.friends ?? []).filter((s) => matches(s, q)), [data, q]);
  const suggestions = useMemo(() => (data?.suggestions ?? []).filter((s) => matches(s, q)), [data, q]);
  const total = data?.friends?.length ?? 0;

  const addFriend = async ({ id }) => {
    setFriendError("");
    setFriend((f) => ({ ...f, [id]: "sending" }));
    try {
      await sendFriendRequest(id);
      setFriend((f) => ({ ...f, [id]: "sent" }));
    } catch {
      setFriend((f) => Object.fromEntries(Object.entries(f).filter(([k]) => k !== id)));
      setFriendError("Couldn’t send the friend request. Please try again.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Connections</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">
          {status === "ready" ? `${total} friend${total === 1 ? "" : "s"}` : "Your study friends and students you may know."}
        </p>
      </div>

      <label className={`${fieldShell()} h-11 w-full max-w-[440px]`}>
        <Icon name="search" size="sm" className="text-fg-3 group-focus-within:text-primary-text" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students…"
          aria-label="Search students"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-3"
        />
      </label>

      {status === "loading" ? (
        <Note>Loading your connections…</Note>
      ) : status === "error" ? (
        <Note>
          Your connections aren’t available right now.
          <Button variant="outline" size="s" onClick={reload}>
            Try again
          </Button>
        </Note>
      ) : (
        <>
          <section className="flex flex-col gap-3.5">
            <h2 className="text-lg font-extrabold leading-6 text-fg">Friends</h2>
            {friends.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {friends.map((s) => (
                  <StudentCard key={s.id} student={s} />
                ))}
              </div>
            ) : (
              <Note>{q ? "No friend matches your search." : "No friends yet. Add students you study with below."}</Note>
            )}
          </section>

          <section className="flex flex-col gap-3.5">
            <h2 className="text-lg font-extrabold leading-6 text-fg">Suggested students</h2>
            {friendError && (
              <p role="alert" className="text-[13px] font-bold text-live">
                {friendError}
              </p>
            )}
            {suggestions.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {suggestions.map((s) => (
                  <SuggestedStudentCard key={s.id} student={s} status={friend[s.id]} onAdd={addFriend} />
                ))}
              </div>
            ) : (
              <Note>{q ? "No suggestion matches your search." : "No suggestions yet. Check back once more students join your modules."}</Note>
            )}
          </section>
        </>
      )}
    </>
  );
}
