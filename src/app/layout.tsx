import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Tailor - AI CV optimisation for every job",
  description:
    "Upload your CV and a job description. Get an honest match analysis and an ATS-friendly CV tailored to the role, without invented experience.",
};

export const viewport: Viewport = { themeColor: "#2453e0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SessionProvider>
          <SiteHeader />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
