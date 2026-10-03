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

export default function SeoGuidePage({ title, intro, path, sections, faqs, related = [] }: SeoGuidePageProps) {
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
    <main className="page page-narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <h1 className={styles.title}>{title}</h1>
      <p className="lead" style={{ marginTop: 10 }}>{intro}</p>
      <div className="row" style={{ marginTop: 16 }}>
        <Link href="/dashboard" className="btn btn-primary">Open the dashboard</Link>
        <Link href="/modelbook" className="btn">See the forecast record</Link>
      </div>

      <div className={`prose ${styles.body}`}>
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
          </section>
        ))}
      </div>

      <section className={styles.faq} aria-labelledby="faq-heading">
        <h2 id="faq-heading">Questions</h2>
        <div className="stack-sm" style={{ marginTop: 10 }}>
          {faqs.map((faq) => (
            <details key={faq.question} className="disclosure">
              <summary>{faq.question}</summary>
              <div className="disclosure-body"><p>{faq.answer}</p></div>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <nav className={styles.related} aria-label="Related guides">
          <h2>Related</h2>
          <ul>{related.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
        </nav>
      )}
    </main>
  );
}
