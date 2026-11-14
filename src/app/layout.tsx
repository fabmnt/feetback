import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/app/convex-client-provider";
import { bricolage } from "@/app/fonts";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Feetback",
  description:
    "Collect detailed, categorized feedback from your users with one script tag.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The Dashboard theme script adds the dark class before hydration.
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        bricolage.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <head>
        {/* Runs before the first paint. It lives in the root layout so React
            never re-creates it on the client, where scripts don't run. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Static, first-party theme script.
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
