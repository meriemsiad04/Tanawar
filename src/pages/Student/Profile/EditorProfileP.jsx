import { useCallback } from "react";
import Logo from "../../../Components/uiC/Logo.jsx";
import Button from "../../../Components/uiC/Button.jsx";
import ProfileForm from "../../../Components/sharedC/ProfileForm.jsx";
import { useAsync } from "../../../hooks/useAsync.js";
import { getProfile, profileFromSession, saveProfile } from "../../../services/profileService.js";

/**
 * Profile form page.
 *  mode "setup": mandatory first-login step (standalone shell, prefilled from the session, then → /app).
 *  mode "edit":  loads the saved profile (rendered inside StudentLayout, then → /app/profile).
 */
export default function EditorProfileP({ mode = "edit", onLogout }) {
  const setup = mode === "setup";
  const load = useCallback(() => (setup ? Promise.resolve(profileFromSession()) : getProfile()), [setup]);
  const { status, data, error, reload } = useAsync(load);

  const submit = async (profile) => {
    await saveProfile(profile);
    window.location.assign(setup ? "/app" : "/app/profile");
  };

  const card = (
    <section className="w-full max-w-[720px] rounded-[24px] border border-line bg-surface p-5 sm:p-8">
      <header className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold leading-8 text-fg">{setup ? "Set up your profile" : "Edit your profile"}</h1>
        <p className="text-sm leading-5 text-fg-2">
          {setup
            ? "Tell us a little about you before you start. Fields marked * are required."
            : "Update how other students see you. Fields marked * are required."}
        </p>
      </header>

      {status === "loading" && <p role="status" className="py-10 text-center text-sm text-fg-2">Loading your profile…</p>}
      {status === "error" && (
        <div role="alert" className="flex flex-col items-start gap-3 py-4 text-sm text-fg-2">
          <p>{error?.code === "NOT_CONFIGURED" ? "Your profile will be available once the server is connected." : error?.message || "We couldn't load your profile."}</p>
          <Button size="s" variant="outline" onClick={reload}>Try again</Button>
        </div>
      )}
      {status === "ready" && (
        <ProfileForm
          initial={data}
          submitLabel={setup ? "Save and continue" : "Save changes"}
          onSubmit={submit}
          onCancel={setup ? undefined : () => window.location.assign("/app/profile")}
        />
      )}
    </section>
  );

  if (!setup) return <div className="mx-auto w-full max-w-[720px]">{card}</div>;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo imgClassName="h-7" />
        <Button size="s" variant="outline" onClick={onLogout}>Sign out</Button>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-4 sm:pt-8">{card}</main>
    </div>
  );
}
