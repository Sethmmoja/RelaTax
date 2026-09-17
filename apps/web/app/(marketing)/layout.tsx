import { Nav } from "../../components/marketing/Nav";
import { Footer } from "../../components/marketing/Footer";
import { DeferredAIChatWidget } from "../../components/marketing/DeferredAIChatWidget";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
      <DeferredAIChatWidget />
    </div>
  );
}
