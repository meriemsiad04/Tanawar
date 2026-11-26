import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Admin Management & Activity Logs. Placeholder until the page is built. */
export default function AdminManagementP() {
  return (
    <AdminPagePlaceholder
      title="Admin Management & Activity Logs"
      icon="logs"
      description="Who administers TANAWAR, and an audit trail of what they did."
      planned={[
        "Invite, suspend and remove administrators",
        "Role permissions",
        "Searchable log of every admin action",
      ]}
    />
  );
}
