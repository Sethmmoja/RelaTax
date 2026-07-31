/**
 * Manual ops tool — run against a live local dev server, not part of CI.
 * Targets the two endpoints most likely to bottleneck under real traffic:
 * report export (CPU-bound PDF rendering) and the WhatsApp webhook path
 * (conversation-engine + DB round trips per message).
 *
 * Usage: pnpm --filter api load-test
 */
import autocannon, { Result } from "autocannon";

const API = process.env.API_URL ?? "http://localhost:4000/api/v1";
const DURATION_SECONDS = Number(process.env.LOAD_TEST_DURATION ?? 15);
const CONNECTIONS = Number(process.env.LOAD_TEST_CONNECTIONS ?? 10);

function summarize(label: string, result: Result) {
  console.log(`\n--- ${label} ---`);
  console.log(`Requests: ${result.requests.total} total (${result.requests.average}/sec avg)`);
  console.log(
    `Latency (ms): avg=${result.latency.average} p50=${result.latency.p50} p99=${result.latency.p99} max=${result.latency.max}`
  );
  console.log(`Throughput: ${(result.throughput.average / 1024).toFixed(1)} KB/sec`);
  console.log(`2xx: ${result.requests.total - result.non2xx}  Non-2xx: ${result.non2xx}  Errors: ${result.errors}  Timeouts: ${result.timeouts}`);
}

async function main() {
  const login = (await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "jane@acmefoods.co.ke", password: "RelaTax#2026" })
  }).then((r) => r.json())) as { accessToken: string };

  if (!login.accessToken) {
    console.error("Could not log in as the seeded test user — is the API running with seed data loaded?");
    process.exit(1);
  }

  const reportId = encodeURIComponent("seed-business-acme-July 2026-VAT");
  console.log(`Running ${DURATION_SECONDS}s at ${CONNECTIONS} connections per endpoint...`);

  const reportResult = await autocannon({
    url: `${API}/reports/${reportId}/export?format=pdf`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    headers: { authorization: `Bearer ${login.accessToken}` }
  });
  summarize("Report export (PDF rendering via pdfkit)", reportResult);

  const whatsappResult = await autocannon({
    url: `${API}/whatsapp/simulate-inbound`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+254700000999", message: "menu" })
  });
  summarize("WhatsApp simulate-inbound (conversation engine)", whatsappResult);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
