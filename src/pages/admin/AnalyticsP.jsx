import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Analytics. Placeholder until the page is built. */
export default function AnalyticsP() {
  return (
    <AdminPagePlaceholder
      title="Analytics"
      icon="chartLine"
      description="Trends over time for registrations, sessions, resources and study time."
      planned={[
        "Custom date ranges and comparisons",
        "Breakdowns by faculty, level and module",
        "Export to CSV",
      ]}
    />
  );
}
