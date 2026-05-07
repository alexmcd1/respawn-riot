import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Cache the audience ID at the module level so we don't list/create on every request.
let cachedAudienceId: string | null = null;

async function getAudienceId(): Promise<string | null> {
  if (cachedAudienceId) return cachedAudienceId;

  const list = await resend.audiences.list();
  const first = list.data?.data?.[0];
  if (first?.id) {
    cachedAudienceId = first.id;
    return first.id;
  }

  const created = await resend.audiences.create({ name: "Riot" });
  if (created.data?.id) {
    cachedAudienceId = created.data.id;
    return created.data.id;
  }

  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubscribeBody = {
  email?: unknown;
  honeypot?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Email service not configured" },
      { status: 500 }
    );
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  // Honeypot: real users leave this blank; bots fill every field.
  // Pretend success so bots don't learn we filtered them.
  if (typeof body.honeypot === "string" && body.honeypot.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  if (typeof body.email !== "string") {
    return NextResponse.json(
      { ok: false, error: "Email required" },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { ok: false, error: "That email doesn't look right" },
      { status: 400 }
    );
  }

  try {
    const audienceId = await getAudienceId();
    if (!audienceId) {
      return NextResponse.json(
        { ok: false, error: "No audience available" },
        { status: 500 }
      );
    }

    const result = await resend.contacts.create({
      email,
      audienceId,
      unsubscribed: false,
    });

    if (result.error) {
      const msg = result.error.message?.toLowerCase() ?? "";
      // Common: contact already exists in this audience
      if (msg.includes("already") || msg.includes("exists")) {
        return NextResponse.json({ ok: true, alreadySubscribed: true });
      }
      console.error("Resend contacts.create error:", result.error);
      return NextResponse.json(
        { ok: false, error: "Couldn't subscribe — try again in a minute" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("subscribe route error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
