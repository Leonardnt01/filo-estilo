import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { ConfirmProvider } from "@/components/confirm-modal";
import { AuthModalProvider } from "@/components/auth-modal";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { SessionSyncGuard } from "@/components/session-sync-guard";
import { SiteNavbar } from "@/components/site-navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Filo Estilo | Barbería Premium",
  description:
    "Tu barbería de confianza. Cortes profesionales, atención personalizada y reservas online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider initialUser={null}>
          <ThemeProvider>
            <ToastProvider>
              <ConfirmProvider>
                <AuthModalProvider>
                  <SessionSyncGuard />
                  <SiteNavbar />
                  {children}
                </AuthModalProvider>
              </ConfirmProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
