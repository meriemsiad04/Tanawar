import AdminPagePlaceholder from "../../Components/sharedC/AdminPagePlaceholder.jsx";

/** Admin: Announcements & Feedback. Placeholder until the page is built. */
export default function AnnouncementsP() {
  return (
    <AdminPagePlaceholder
      title="Announcements & Feedback"
      icon="megaphone"
      description="Messages to students and what they tell you back."
      planned={[
        "Create announcements for all students or by faculty / level",
        "Schedule and pin announcements",
        "Read and answer student feedback",
      ]}
    />
  );
}
