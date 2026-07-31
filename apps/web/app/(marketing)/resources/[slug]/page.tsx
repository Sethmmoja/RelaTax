import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getResourcePost, resourcePosts } from "../../../../lib/resources-content";
import { Reveal } from "../../../../components/motion/Reveal";

export function generateStaticParams() {
  return resourcePosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getResourcePost(slug);
  if (!post) return {};
  return { title: `${post.title} — RelaTax Resources`, description: post.summary };
}

export default async function ResourcePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getResourcePost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/resources" className="text-sm text-muted-foreground hover:text-primary">
        ← Resources
      </Link>

      <Reveal className="mt-6">
        <h1 className="font-serif text-4xl md:text-5xl">{post.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.summary}</p>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Last updated {post.updated}
        </p>
      </Reveal>

      <div className="mt-12 space-y-10">
        {post.sections.map((section, i) => (
          <Reveal key={i}>
            {section.type === "paragraph" && (
              <div>
                {section.heading && <h2 className="mb-3 font-serif text-2xl">{section.heading}</h2>}
                <p className="text-foreground/85 leading-relaxed">{section.body}</p>
              </div>
            )}

            {section.type === "list" && (
              <div>
                {section.heading && <h2 className="mb-3 font-serif text-2xl">{section.heading}</h2>}
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2 text-foreground/85">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {section.type === "table" && (
              <div className="overflow-hidden rounded border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {section.headers.map((h) => (
                        <th key={h} className="px-4 py-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="ledger-rule">
                    {section.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.cells.map((cell, ci) => (
                          <td key={ci} className={`px-4 py-3 align-top ${ci === row.cells.length - 1 && row.cells.length > 1 ? "tabular-figures text-muted-foreground" : ""}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {section.note && <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{section.note}</p>}
              </div>
            )}
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-16 rounded border border-border bg-card p-6 shadow-soft">
        <p className="font-serif text-xl">Want this handled, not just explained?</p>
        <p className="mt-2 text-sm text-muted-foreground">
          RelaTax keeps clients compliant on exactly this — filings, invoicing and reporting, tracked and delivered
          on schedule.
        </p>
        <Link href="/contact#tell-us-about-your-business" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Talk to us →
        </Link>
      </Reveal>
    </article>
  );
}
