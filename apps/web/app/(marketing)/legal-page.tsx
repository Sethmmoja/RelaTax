import { Breadcrumbs } from "../../components/marketing/Breadcrumbs";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

/**
 * One layout for the legal pages so they read as a set: dated, sectioned,
 * scannable, and set in the body face at a comfortable measure rather than
 * the marketing pages' wide grid.
 */
export function LegalPage({
  title,
  intro,
  effectiveDate,
  sections
}: {
  title: string;
  intro: string;
  effectiveDate: string;
  sections: LegalSection[];
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Breadcrumbs crumbs={[{ name: title }]} />
      <h1 className="font-serif text-4xl md:text-5xl">{title}</h1>
      <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Effective {effectiveDate}
      </p>
      <p className="mt-6 text-lg text-muted-foreground">{intro}</p>

      <div className="mt-12 space-y-10">
        {sections.map((s, i) => (
          <section key={s.heading} aria-labelledby={`legal-${i}`}>
            <h2 id={`legal-${i}`} className="font-serif text-2xl">
              {i + 1}. {s.heading}
            </h2>
            {s.paragraphs?.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-foreground/85">
                {p}
              </p>
            ))}
            {s.bullets ? (
              <ul className="mt-3 list-disc space-y-2 pl-6 text-foreground/85">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </section>
  );
}
