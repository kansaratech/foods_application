import type { Metadata } from "next";
import Link from "next/link";
import {
  LEGAL_EMAIL,
  LEGAL_ORIGIN,
  LEGAL_UPDATED,
  type LegalDocument,
} from "./content";
import styles from "./legal.module.css";

export function legalMetadata(document: LegalDocument): Metadata {
  return {
    title: `${document.title} | Localsell`,
    description: document.description,
    alternates: { canonical: `${LEGAL_ORIGIN}${document.path}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${document.title} | Localsell`,
      description: document.description,
      url: `${LEGAL_ORIGIN}${document.path}`,
      siteName: "Localsell",
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary",
      title: `${document.title} | Localsell`,
      description: document.description,
    },
  };
}

export default function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <div className={styles.page} lang="en" dir="ltr">
      <a className={styles.skip} href="#legal-content">
        Skip to policy content
      </a>
      <main id="legal-content" className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{document.title}</span>
        </nav>
        <div className={styles.overview}>
          <div className={styles.hero}>
            <p className={styles.eyebrow}>LOCALSELL · TRUST & TRANSPARENCY</p>
            <h1>{document.title}</h1>
            <p className={styles.description}>{document.description}</p>
            <p className={styles.updated}>
              Last updated <time dateTime="2026-09-19">{LEGAL_UPDATED}</time>
            </p>
            <nav className={styles.tabs} aria-label="Legal pages">
              <Link
                href="/privacy"
                aria-current={document.path === "/privacy" ? "page" : undefined}
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                aria-current={document.path === "/terms" ? "page" : undefined}
              >
                Terms & Conditions
              </Link>
            </nav>
          </div>
          <section className={styles.summary} aria-labelledby="summary-title">
            <p className={styles.eyebrow}>THE QUICK READ</p>
            <h2 id="summary-title">The essentials, in everyday language.</h2>
            <ul>
              {document.summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.summaryNote}>
              This is a short guide. The full details are below.
            </p>
          </section>
        </div>
        <div className={styles.columns}>
          <aside className={styles.sidebar}>
            <nav aria-label="On this page">
              <p className={styles.eyebrow}>ON THIS PAGE</p>
              <ol>
                {document.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ol>
              <a className={styles.contactLink} href="#contact">
                Contact Localsell ↗
              </a>
            </nav>
          </aside>
          <article className={styles.article} aria-label={document.title}>
            {document.sections.map((section, index) => (
              <section
                id={section.id}
                key={section.id}
                className={styles.section}
              >
                <p className={styles.number}>
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {section.id === "whatsapp" && (
                  <p>
                    <a href="https://www.whatsapp.com/legal/privacy-policy">
                      Read WhatsApp’s Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a href="https://www.whatsapp.com/legal/terms-of-service">
                      Terms of Service
                    </a>
                    .
                  </p>
                )}
              </section>
            ))}
            <section id="contact" className={styles.contact}>
              <p className={styles.eyebrow}>WE’RE HERE TO HELP</p>
              <h2>Have a question? Talk to us.</h2>
              <p>
                For order support, privacy requests, account deletion, WhatsApp
                preferences or a complaint, email our team.
              </p>
              <a className={styles.email} href={`mailto:${LEGAL_EMAIL}`}>
                {LEGAL_EMAIL} <span aria-hidden="true">↗</span>
              </a>
              <p>
                Localsell · Operated by Maekotech Solutions LLP
                <br />
                Deogarh, Rajasthan, India
              </p>
              <p>
                Include your order number or account phone number where
                relevant. Never send your password, OTP or payment PIN.
              </p>
              <Link href="/profile/getHelp">
                Existing customer? Get help in Localsell →
              </Link>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
