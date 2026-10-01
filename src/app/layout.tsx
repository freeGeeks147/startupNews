import type { Metadata } from "next";
import Link from "next/link";
import { hasSampleData } from "@/lib/data";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  ...(site.url ? { metadataBase: new URL(site.url) } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {hasSampleData && (
          <div className="banner">
            <div className="container">
              Preview build: the deals shown are fictional sample records used to demonstrate the format.
            </div>
          </div>
        )}
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              Deep<span>Fund</span> India
            </Link>
            <nav className="nav">
              <Link href="/deals/">Deals</Link>
              <Link href="/sectors/">Sectors</Link>
              <Link href="/companies/">Companies</Link>
              <Link href="/investors/">Investors</Link>
              <Link href="/pricing/">Pricing</Link>
              <Link href="/about/">About</Link>
            </nav>
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <span>
              © {new Date().getFullYear()} {site.name}. Facts and source links only; no article text is republished.
            </span>
            <nav>
              <Link href="/about/">Methodology</Link>
              <Link href="/corrections/">Corrections</Link>
              <Link href="/terms/">Terms</Link>
              <Link href="/privacy/">Privacy</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
