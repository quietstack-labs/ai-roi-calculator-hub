/* UI wiring. All math lives in calc.js. */
(function () {
  "use strict";
  // Affiliate links: swap in partner referral URLs here (kept in one place).
  var AFFILIATE = {
    make: "https://www.make.com/en/register",
    elevenlabs: "https://elevenlabs.io/",
  };
  document.querySelectorAll("[data-aff]").forEach(function (a) {
    var u = AFFILIATE[a.getAttribute("data-aff")];
    if (u) a.href = u;
  });

  var form = document.querySelector("form[data-calc]");
  if (!form) return;
  var kind = form.getAttribute("data-calc");

  function values() {
    var v = {};
    form.querySelectorAll("[data-k]").forEach(function (el) { v[el.getAttribute("data-k")] = el.value; });
    return v;
  }
  function money(n, cur) {
    if (n == null || !isFinite(n)) return "—";
    cur = cur || "USD";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: cur === "KRW" ? 0 : 2 }).format(n);
    } catch (e) { return n.toFixed(2) + " " + cur; }
  }
  function plain(n, d) { return n == null || !isFinite(n) ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d == null ? 1 : d }); }
  function set(key, text, cls) {
    var el = document.querySelector('[data-o="' + key + '"]');
    if (!el) return;
    el.textContent = text;
    if (cls !== undefined) { el.classList.remove("good", "bad"); if (cls) el.classList.add(cls); }
  }

  var renderers = {
    roi: function () {
      var r = Calc.automationROI(values());
      set("netMonthly", money(r.netMonthly) + " / month", r.worthIt ? "good" : "bad");
      set("hoursSaved", plain(r.hoursSaved) + " h");
      set("hoursSavedYearly", plain(r.hoursSavedYearly, 0) + " h");
      set("manualMonthly", money(r.manualMonthly));
      set("laborSavedMonthly", money(r.laborSavedMonthly));
      set("automationMonthly", money(r.automationMonthly));
      set("paybackMonths", isFinite(r.paybackMonths) ? plain(r.paybackMonths) + " months" : "never at these numbers");
      set("firstYearNet", money(r.firstYearNet), r.firstYearNet >= 0 ? "good" : "bad");
      set("roiPct", r.roiPct == null ? "—" : plain(r.roiPct, 0) + "%");
    },
    voice: function () {
      var v = values();
      var tiers = [];
      form.querySelectorAll("tr[data-tier]").forEach(function (tr) {
        var g = function (k) { return tr.querySelector('[data-t="' + k + '"]').value; };
        var over = g("overagePerMinute");
        tiers.push({ name: g("name"), monthly: g("monthly"), includedMinutes: g("includedMinutes"), overagePerMinute: over === "" ? null : over });
      });
      v.tiers = tiers;
      var r = Calc.voiceoverCost(v);
      set("savingsMonthly", r.savingsMonthly == null ? "no plan fits" : money(r.savingsMonthly) + " / month", r.savingsMonthly > 0 ? "good" : "bad");
      set("humanMonthly", money(r.humanMonthly));
      set("humanPerFinishedMinute", money(r.humanPerFinishedMinute));
      set("bestName", r.best ? r.best.name : "—");
      set("bestTotal", r.best ? money(r.best.total) : "—");
      set("aiPerFinishedMinute", money(r.aiPerFinishedMinute));
      set("savingsYearly", money(r.savingsYearly));
      set("savingsPct", r.savingsPct == null ? "—" : plain(r.savingsPct, 0) + "%");
      r.tiers.forEach(function (t, i) {
        var cell = form.querySelectorAll("tr[data-tier] [data-t-out]")[i];
        if (cell) cell.textContent = t.eligible ? money(t.total) : "over limit";
      });
    },
    freelancer: function () {
      var r = Calc.freelancerRate(values());
      var c = r.currency;
      set("fixedPrice", money(r.fixedPrice, c));
      set("takeHome", money(r.takeHome, c), "good");
      set("platformFee", money(r.platformFee, c));
      set("fxFee", money(r.fxFee, c));
      set("incomeTax", money(r.incomeTax, c));
      set("withheldAtSource", money(r.withheldAtSource, c));
      set("cashAtPayment", money(r.cashAtPayment, c));
      set("taxStillDue", r.taxStillDue < 0 ? "refund " + money(-r.taxStillDue, c) : money(r.taxStillDue, c));
      set("effectiveHourly", money(r.effectiveHourly, c));
      set("keepPct", plain(r.keepPct) + "%");
      set("requiredFixedPrice", r.requiredFixedPrice == null ? "—" : money(r.requiredFixedPrice, c));
      set("requiredHourly", r.requiredHourly == null ? "—" : money(r.requiredHourly, c));
    },
  };
  var render = renderers[kind];
  form.addEventListener("input", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
  render();
})();
