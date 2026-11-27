import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("./calc.js");
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok -", name); };

// 1. Automation ROI
t("ROI: base case math", () => {
  const r = C.automationROI({ tasksPerMonth: 600, minutesPerTask: 6, hourlyCost: 30, automationPct: 80, platformMonthly: 29, aiCostPerTask: 0.02, setupCost: 1500 });
  assert.equal(r.manualHours, 60);
  assert.equal(r.manualMonthly, 1800);
  assert.equal(r.hoursSaved, 48);
  assert.equal(r.laborSavedMonthly, 1440);
  assert.equal(r.automationMonthly, 38.6); // 29 + 600*0.8*0.02
  assert.equal(r.netMonthly, 1401.4);
  assert.equal(r.paybackMonths, 1.07);
  assert.equal(r.firstYearNet, 15316.8);
  assert.equal(r.worthIt, true);
});
t("ROI: negative / garbage inputs clamp to 0", () => {
  const r = C.automationROI({ tasksPerMonth: -5, minutesPerTask: "abc", hourlyCost: null });
  assert.equal(r.manualMonthly, 0);
  assert.equal(r.paybackMonths, Infinity);
  assert.equal(r.roiPct, null);
  assert.equal(r.worthIt, false);
});
t("ROI: automation pct capped at 100, zero setup pays back instantly", () => {
  const r = C.automationROI({ tasksPerMonth: 100, minutesPerTask: 60, hourlyCost: 10, automationPct: 250 });
  assert.equal(r.hoursSaved, 100);
  assert.equal(r.paybackMonths, 0);
});
t("ROI: costs exceeding savings => not worth it, Infinity payback", () => {
  const r = C.automationROI({ tasksPerMonth: 10, minutesPerTask: 1, hourlyCost: 20, platformMonthly: 50, setupCost: 100 });
  assert.ok(r.netMonthly < 0);
  assert.equal(r.paybackMonths, Infinity);
  assert.ok(r.roiPct < 0);
});
t("ROI: comma-formatted strings parse", () => {
  assert.equal(C.automationROI({ tasksPerMonth: "1,200", minutesPerTask: "5", hourlyCost: "12", automationPct: 100 }).manualMonthly, 1200);
});

// 2. Voiceover
t("Voice: human cost and cheapest eligible tier", () => {
  const r = C.voiceoverCost({ minutesPerMonth: 120, humanRatePerMinute: 15, humanSessionFees: 100, editHoursPerMonth: 4, editHourlyRate: 25, aiEditPct: 50 });
  assert.equal(r.humanMonthly, 2000); // 1800 + 100 + 100
  assert.equal(r.humanPerFinishedMinute, 16.67);
  assert.equal(r.tiers[0].eligible, false); // Starter has no overage
  assert.equal(r.tiers[1].planCost, 28); // 22 + 20*0.3
  assert.equal(r.best.name, "AI Creator");
  assert.equal(r.best.total, 78); // 28 + 50 edit
  assert.equal(r.savingsMonthly, 1922);
  assert.equal(r.savingsYearly, 23064);
});
t("Voice: tierCost respects included minutes", () => {
  assert.equal(C.tierCost({ monthly: 22, includedMinutes: 100, overagePerMinute: 0.3 }, 100), 22);
  assert.equal(C.tierCost({ monthly: 5, includedMinutes: 30, overagePerMinute: null }, 31), Infinity);
});
t("Voice: zero minutes => null per-minute values, no crash", () => {
  const r = C.voiceoverCost({});
  assert.equal(r.humanPerFinishedMinute, null);
  assert.equal(r.aiPerFinishedMinute, null);
  assert.equal(r.best.name, "AI Starter");
});
t("Voice: no eligible tier => null savings", () => {
  const r = C.voiceoverCost({ minutesPerMonth: 999, tiers: [{ name: "X", monthly: 1, includedMinutes: 10, overagePerMinute: null }] });
  assert.equal(r.best, null);
  assert.equal(r.savingsMonthly, null);
});

// 3. Freelancer
t("Freelancer: USD fixed price, fees, tax, take-home", () => {
  const r = C.freelancerRate({ currency: "USD", hourlyRate: 50, estimatedHours: 40, bufferPct: 20, platformFeePct: 10, fxFeePct: 2, taxRatePct: 25 });
  assert.equal(r.fixedPrice, 2400);
  assert.equal(r.platformFee, 240);
  assert.equal(r.fxFee, 43.2);
  assert.equal(r.taxableIncome, 2116.8);
  assert.equal(r.incomeTax, 529.2);
  assert.equal(r.takeHome, 1587.6);
  assert.equal(r.effectiveHourly, 39.69);
});
t("Freelancer: KRW rounds to whole won, 3.3% withholding & refund sign", () => {
  const r = C.freelancerRate({ currency: "KRW", hourlyRate: 33333, estimatedHours: 3, withholdingPct: 3.3, taxRatePct: 1 });
  assert.equal(r.fixedPrice, 99999);
  assert.equal(r.withheldAtSource, 3300);
  assert.equal(r.cashAtPayment, 96699);
  assert.ok(r.taxStillDue < 0); // 1% tax < 3.3% withheld -> refund
  assert.ok(Number.isInteger(r.takeHome));
});
t("Freelancer: reverse target take-home", () => {
  const r = C.freelancerRate({ currency: "EUR", hourlyRate: 1, estimatedHours: 10, platformFeePct: 20, taxRatePct: 50, targetTakeHome: 1000 });
  assert.equal(r.requiredFixedPrice, 2500);
  assert.equal(r.requiredHourly, 250);
});
t("Freelancer: 100% tax => required price null, unknown currency => USD", () => {
  const r = C.freelancerRate({ currency: "XYZ", hourlyRate: 10, estimatedHours: 0, taxRatePct: 100, targetTakeHome: 10 });
  assert.equal(r.currency, "USD");
  assert.equal(r.requiredFixedPrice, null);
  assert.equal(r.effectiveHourly, null);
});

// Site / SEO assets
t("SEO: every page has title, description, canonical, OG and JSON-LD", () => {
  for (const p of ["index.html", "ai-automation-roi/index.html", "ai-voiceover-cost/index.html", "freelancer-rate-tax/index.html"]) {
    const h = readFileSync(new URL(p, import.meta.url), "utf8");
    for (const needle of ["<title>", 'name="description"', 'rel="canonical"', 'property="og:title"', 'property="og:url"', "application/ld+json"]) assert.ok(h.includes(needle), `${p} missing ${needle}`);
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.ok(JSON.stringify(ld).includes("WebApplication"), `${p} JSON-LD not WebApplication`);
  }
  const sm = readFileSync(new URL("sitemap.xml", import.meta.url), "utf8");
  assert.equal((sm.match(/<loc>/g) || []).length, 4);
  assert.ok(readFileSync(new URL("robots.txt", import.meta.url), "utf8").includes("Sitemap:"));
  assert.ok(existsSync(new URL(".nojekyll", import.meta.url)));
});
t("Disclosure present on affiliate pages", () => {
  for (const p of ["ai-automation-roi/index.html", "ai-voiceover-cost/index.html"]) {
    const h = readFileSync(new URL(p, import.meta.url), "utf8");
    assert.match(h, /affiliate/i);
    assert.match(h, /rel="sponsored noopener"/);
  }
});

console.log(`\n${passed} tests passed`);
