import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@relatax/ui";
import { resourcePosts } from "../../../lib/resources-content";
import { Reveal } from "../../../components/motion/Reveal";

export default function ResourcesPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h1 className="font-serif text-4xl md:text-6xl">Resources</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Plain-language guides to the tax and accounting concepts that matter most for growing businesses.
      </p>
      <Reveal stagger=".resource-card" className="mt-12 grid gap-6 sm:grid-cols-2">
        {resourcePosts.map((r) => (
          <Link key={r.slug} href={`/resources/${r.slug}`} className="resource-card block">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle>{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{r.summary}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
