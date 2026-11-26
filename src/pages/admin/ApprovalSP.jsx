import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Session approvals. Placeholder until the page is built. */
export default function ApprovalSP() {
  return (
    <AdminPagePlaceholder
      title="Session approvals"
      icon="clipboard"
      description="Sessions waiting for an administrator before they are published."
      planned={[
      "Queue of submitted sessions",
      "Approve, or reject with a reason",
      ]}
    />
  );
}
