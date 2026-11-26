import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Settings. Placeholder until the page is built. */
export default function AdminSettingP() {
  return (
    <AdminPagePlaceholder
      title="Settings"
      icon="gear"
      description="Platform settings."
      planned={[
      "Registration rules and accepted documents",
      "Administrator accounts",
      ]}
    />
  );
}
