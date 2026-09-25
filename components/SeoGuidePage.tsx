import Link from "next/link";
import styles from "./SeoGuidePage.module.css";

export type SeoGuideSection = {
  eyebrow?: string;
  title: string;
  body: string;
  bullets?: string[];
};

export type SeoGuidePageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  path: string;
  sections: SeoGuideSection[];
  faqs: Array<{ question: string; answer: string }>;
  related?: Array<{ href: string; label: string }>;
};

export default function SeoGuidePage({ eyebrow, title, intro, path, sections, faqs, related = [] }: SeoGuidePageProps) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: title,
        description: intro,
        url: `https://fplprism.com${path}`,
        isPartOf: { "@type": "WebSite", name: "FPL Prism", url: "https://fplprism.com" },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <main className={styles.shell}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className={styles.hero}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className={styles.actions}><Link href="/dashboard" className={styles.primary}>Open the live dashboard →</Link><Link href="/modelbook" className={styles.secondary}>Check the model record</Link></div>
      </section>

      <section className={styles.content}>
        {sections.map((section) => <article key={section.title} className={styles.card}>
          {section.eyebrow && <span className={styles.cardEyebrow}>{section.eyebrow}</span>}
          <h2>{section.title}</h2>
          <p>{section.body}</p>
          {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
        </article>)}
      </section>

      <section className={styles.faq}>
        <span className={styles.eyebrow}>COMMON QUESTIONS</span>
        <h2>Useful answers before the deadline.</h2>
        <div className={styles.faqGrid}>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
      </section>

      {related.length > 0 && <section className={styles.related} aria-label="Related FPL Prism guides">
        <span className={styles.eyebrow}>KEEP EXPLORING</span>
        <div>{related.map((link) => <Link href={link.href} key={link.href}>{link.label} →</Link>)}</div>
      </section>}

      <footer className={styles.footer}><span>FPL Prism · Independent FPL analytics</span><span>Not affiliated with, endorsed by or sponsored by the Premier League.</span></footer>
    </main>
  );
}
