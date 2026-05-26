import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { Nav } from "@/components/nav";
import "./styles.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "XPay Store — Integration Demo",
  description:
    "A demo e-commerce store showing every XPay SDK integration pattern.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <QueryProvider>
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col">
            <Nav />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border/40 py-8">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <p className="text-sm text-muted-foreground">
                  XPay Example Store
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <a
                    href="https://docs.xpay.app"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    Docs
                  </a>
                  <span className="text-border">/</span>
                  <a
                    href="https://github.com/xpayeg"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
