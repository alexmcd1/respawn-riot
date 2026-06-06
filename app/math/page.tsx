import { redirect } from "next/navigation";

// /math was renamed to /cram when the channel widened from "just
// flashcards" to a general educational mini-app hub. Keep this route
// alive so anyone with the URL bookmarked or shared still lands on
// the right page.
export default function MathRedirect() {
  redirect("/cram");
}
