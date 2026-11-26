import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Study With Me. Placeholder until the page is built. */
export default function StudyWithMeAdminP() {
  return (
    <AdminPagePlaceholder
      title="Study With Me"
      icon="lamp"
      description="Study rooms across TANAWAR: who is studying, where, and for how long."
      planned={[
        "Live rooms and participants",
        "Study hours by module and faculty",
        "Close or moderate rooms that break the rules",
      ]}
    />
  );
}
