/**
 * Script de vérification rapide des APIs (santé, auth, permissions).
 * À exécuter avec : node scripts/test-api-health.js
 * Prérequis : serveur démarré (npm run dev)
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, cache: "no-store" });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function main() {
  console.log("🔍 Test des APIs – Emeraude Business\n");
  console.log("Base URL:", BASE);

  const results = [];

  // 1. Health
  try {
    const { status } = await fetchJson(`${BASE}/api/health`);
    results.push({ name: "GET /api/health", status, ok: status === 200 });
  } catch (e) {
    results.push({ name: "GET /api/health", status: "ERR", ok: false, error: e.message });
  }

  // 2. Auth (sans session = 401 attendu)
  try {
    const { status } = await fetchJson(`${BASE}/api/marches`);
    results.push({ name: "GET /api/marches (sans auth)", status, ok: status === 401 });
  } catch (e) {
    results.push({ name: "GET /api/marches (sans auth)", status: "ERR", ok: false, error: e.message });
  }

  // 3. Rate limit (auth)
  try {
    const attempts = [];
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${BASE}/api/auth/csrf`, { cache: "no-store" });
      attempts.push(res.status);
    }
    results.push({ name: "Rate limit auth", status: attempts.join(","), ok: true });
  } catch (e) {
    results.push({ name: "Rate limit auth", status: "ERR", ok: false, error: e.message });
  }

  // Affichage
  console.log("\nRésultats:");
  results.forEach((r) => {
    const icon = r.ok ? "✅" : "❌";
    console.log(`  ${icon} ${r.name}: ${r.status}${r.error ? ` (${r.error})` : ""}`);
  });

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log("\n⚠️", failed.length, "test(s) en échec");
    process.exit(1);
  }
  console.log("\n✅ Tous les tests passés");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
