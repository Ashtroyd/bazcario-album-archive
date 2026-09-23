import { redirect } from "next/navigation";

export default function AnnouncementsPage() {
  redirect("/activity?view=releases");
}
