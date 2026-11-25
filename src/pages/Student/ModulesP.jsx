import Button from "../../Components/uiC/Button.jsx";
import ModuleCard from "../../Components/sharedC/ModuleCard.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { getModules } from "../../services/studentsService.js";

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/** All the student's modules (dashboard "Your modules" → See all). Each card opens that module's sessions. */
export default function ModulesP() {
  const { status, data, reload } = useAsync(getModules);
  const modules = data ?? [];
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Your modules</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">Open a module to see the sessions published for it.</p>
      </div>
      {status === "loading" ? (
        <Note>Loading your modules…</Note>
      ) : status === "error" ? (
        <Note>
          Your modules aren’t available right now.
          <Button variant="outline" size="s" onClick={reload}>
            Try again
          </Button>
        </Note>
      ) : modules.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard key={m.code} module={m} />
          ))}
        </div>
      ) : (
        <Note>
          You have no modules yet.
          <a href="/app/profile/edit" className="text-sm font-bold text-primary-text hover:underline">
            Add your strong modules in your profile ›
          </a>
        </Note>
      )}
    </>
  );
}
