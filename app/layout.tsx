import type { Metadata } from "next";
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import "./globals.css";
import NavBar from "./_components/NavBar";
import BackToTop from "./_components/BackToTop";
import AuthProvider from "./_components/AuthProvider";
import SignInModal from "./_components/SignInModal";
import SyncController from "./_components/SyncController";
import ChatRoot from "./_components/chat/ChatRoot";
import { ChatProvider } from "./_components/chat/ChatContext";
import DadJokeSkull from "./_components/DadJokeSkull";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Respawn Riot",
  description:
    "Anime, pop punk, and gaming chaos. A loud, glitchy hub built for second chances.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <AuthProvider>
          {/* ChatProvider sits ABOVE the page tree so /buddies and the
              floating overlay share one buddy/messages state. When
              signed out it's a no-op (no fetches, empty arrays). */}
          <ChatProvider>
            <NavBar />
            <div className="flex-1">{children}</div>
            <BackToTop />
            <SignInModal />
            {/* SyncController is invisible — watches session + drives
                localStorage ↔ /api/sync/<kind> sync per registered store */}
            <SyncController />
            {/* AIM-style buddy chat — floating buddy list + popup chat
                windows. Renders nothing when signed out. */}
            <ChatRoot />
            {/* Kid Ghost dad-joke skull — peeks in every ~5–12 min,
                tells a joke, switches to its laughing face on the
                punchline. Visible to signed-in and signed-out alike. */}
            <DadJokeSkull />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
