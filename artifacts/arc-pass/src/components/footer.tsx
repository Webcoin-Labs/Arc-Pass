import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const CONTACT_EMAIL = "contact@webcoinlabs.com";

const buildLinks = ["Founder tools", "Builder proof", "Pitch deck review", "Tokenomics support"];

const exploreLinks = [
  { label: "Documentation", href: "/docs" },
  { label: "Founder Pass", href: "/claim/founder" },
  { label: "Builder Pass", href: "/claim/builder" },
  { label: "Credits", href: "/docs#credits" },
  { label: "Brand Assets", href: "https://webcoin.labs" },
];

const connectLinks = [
  { label: "Telegram", href: "https://t.me/webcoinlabs" },
  { label: "X", href: "https://x.com/webcoinlabs" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/webcoinlabs/" },
];

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-[11px] font-semibold uppercase text-[#9b87ff]">{children}</h2>;
}

function ExternalFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors duration-150 hover:text-white"
    >
      {children}
      <ExternalLink className="size-3 opacity-0 transition-opacity duration-150 group-hover:opacity-60" aria-hidden="true" />
    </a>
  );
}

export function Footer() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <footer className="border-t border-white/10 bg-[#0f0d26] px-4 pb-7 pt-10 text-white sm:px-6 sm:pb-8 sm:pt-12 lg:px-8 lg:pt-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr] lg:gap-16">
          <div>
            <a href="https://webcoin.labs" target="_blank" rel="noreferrer" aria-label="Webcoin Labs home" className="inline-flex">
              <img src="/brand/webcoin-mono-white.webp" alt="Webcoin Labs" className="h-7 w-auto max-w-[220px] object-contain object-left" width={640} height={128} />
            </a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/60 sm:mt-5">The operating system for founders.</p>

            <div className="mt-5 flex w-full max-w-[310px] items-center rounded-full border border-white/15 bg-white/[0.035] pl-3.5 pr-1.5 sm:mt-6 sm:pl-4">
              <a href={`mailto:${CONTACT_EMAIL}`} className="min-w-0 flex-1 truncate py-2.5 text-[13px] font-semibold text-white/90 hover:text-white sm:text-sm">
                {CONTACT_EMAIL}
              </a>
              <button
                type="button"
                onClick={copyEmail}
                aria-label={copied ? "Email address copied" : "Copy email address"}
                className="ml-2 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/45 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b87ff]"
              >
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 sm:gap-x-8 lg:gap-x-12">
            <nav aria-label="Build links">
              <FooterHeading>Build</FooterHeading>
              <ul className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
                {buildLinks.map((label) => (
                  <li key={label} className="flex flex-wrap items-center gap-1.5 text-sm text-white/60">
                    <span>{label}</span>
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase text-white/45">Soon</span>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Explore links">
              <FooterHeading>Explore</FooterHeading>
              <ul className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
                {exploreLinks.map((item) => (
                  <li key={item.label} className="group">
                    {item.href.startsWith("http") ? (
                      <ExternalFooterLink href={item.href}>{item.label}</ExternalFooterLink>
                    ) : (
                      <Link href={item.href} className="text-sm text-white/60 transition-colors duration-150 hover:text-white">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Connect links" className="col-span-2 sm:col-span-1">
              <FooterHeading>Connect</FooterHeading>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3.5 sm:mt-5 sm:block sm:space-y-4">
                {connectLinks.map((item) => (
                  <li key={item.label} className="group">
                    <ExternalFooterLink href={item.href}>{item.label}</ExternalFooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 sm:mt-12 sm:pt-7 lg:mt-16 lg:pt-8">
          <div className="flex flex-col gap-5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-white/90">&copy; {new Date().getFullYear()} Webcoin Labs. All rights reserved.</p>
            <nav className="flex flex-wrap gap-x-5 gap-y-3 text-white/55" aria-label="Footer utility links">
              <Link href="/docs" className="hover:text-white">Docs</Link>
              <Link href="/faq" className="hover:text-white">Help</Link>
              <Link href="/docs#terms" className="hover:text-white">Terms</Link>
              <Link href="/docs#privacy" className="hover:text-white">Privacy</Link>
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">Contact</a>
            </nav>
          </div>

          <div className="mt-6 max-w-6xl space-y-2 text-[11px] leading-5 text-white/35 sm:mt-8 sm:space-y-3 sm:text-xs sm:leading-6">
            <p>Arc Pass is an early-access identity credential for founders and onchain builders. Access, verification, and claim eligibility depend on fit, review, and availability.</p>
            <p>Credentials are non-transferable identity records and have no monetary, token, or airdrop value.</p>
            <p>Nothing on this site is investment, legal, tax, or financial advice.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
