import { redirect } from "next/navigation";

// /pop-punk has moved to /music?tab=pop-punk as part of the Music
// channel consolidation. Keep this route alive so old bookmarks and
// any external links keep working.
export default function PopPunkRedirect() {
  redirect("/music?tab=pop-punk");
}
