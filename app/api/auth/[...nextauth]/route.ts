// Auth.js route handler — delegates all GET/POST to the NextAuth config
// (sign-in, sign-out, callback URLs, session check, etc).
import { handlers } from "../../../../auth";

export const { GET, POST } = handlers;

// Auth.js sets cookies and reads request URLs — must be dynamic
export const dynamic = "force-dynamic";
