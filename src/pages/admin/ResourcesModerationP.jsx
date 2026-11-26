import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Resources. Placeholder until the page is built. */
export default function ResourcesModerationP() {
  return (
    <AdminPagePlaceholder
      title="Resources"
      icon="books"
      description="Shared resources waiting for moderation, and reported ones."
      planned={[
      "Approve or remove resources",
      "Review reported resources",
      ]}
    />
  );
}
