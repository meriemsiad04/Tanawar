import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Users. Placeholder until the page is built. */
export default function UserManagementP() {
  return (
    <AdminPagePlaceholder
      title="Users"
      icon="users"
      description="Student and administrator accounts."
      planned={[
      "Search by name, matricule or email",
      "Suspend, reactivate or change a role",
      ]}
    />
  );
}
