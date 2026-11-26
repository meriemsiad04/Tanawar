import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Reports. Placeholder until the page is built. */
export default function ReportsP() {
  return (
    <AdminPagePlaceholder
      title="Reports & Moderation"
      icon="flag"
      description="Content and behaviour reported by students."
      planned={[
      "Open and resolved reports",
      "Warn, suspend or dismiss",
      ]}
    />
  );
}
