import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Sessions. Placeholder until the page is built. */
export default function ManagementSP() {
  return (
    <AdminPagePlaceholder
      title="Sessions"
      icon="calendar"
      description="Every session on the platform."
      planned={[
      "Search and filter by module, host and status",
      "Cancel or edit a session",
      ]}
    />
  );
}
