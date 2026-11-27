/* Pure calculator math for the AI ROI Calculator Hub. Zero dependencies.
 * Works in the browser (window.Calc) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Coerce to a finite, non-negative number (bad input -> 0). */
  function num(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(/,/g, ""));
    return isFinite(n) && n > 0 ? n : 0;
  }
  function pct(v) { return Math.min(num(v), 100) / 100; }
  function round2(n) { return isFinite(n) ? Math.round(n * 100) / 100 : n; }

  /* 1. AI automation ROI & hours saved */
  function automationROI(input) {
    var i = input || {};
    var tasks = num(i.tasksPerMonth);
    var minutes = num(i.minutesPerTask);
    var wage = num(i.hourlyCost);
    var rate = pct(i.automationPct == null ? 80 : i.automationPct);
    var platform = num(i.platformMonthly);
    var aiPerTask = num(i.aiCostPerTask);
    var setup = num(i.setupCost);

    var manualHours = (tasks * minutes) / 60;
    var manualMonthly = manualHours * wage;
    var hoursSaved = manualHours * rate;
    var laborSavedMonthly = hoursSaved * wage;
    var automationMonthly = platform + tasks * rate * aiPerTask;
    var netMonthly = laborSavedMonthly - automationMonthly;
    var paybackMonths = netMonthly > 0 ? setup / netMonthly : Infinity;
    var firstYearCost = automationMonthly * 12 + setup;
    var firstYearNet = netMonthly * 12 - setup;
    var roiPct = firstYearCost > 0 ? (firstYearNet / firstYearCost) * 100 : null;

    return {
      manualHours: round2(manualHours),
      manualMonthly: round2(manualMonthly),
      hoursSaved: round2(hoursSaved),
      hoursSavedYearly: round2(hoursSaved * 12),
      laborSavedMonthly: round2(laborSavedMonthly),
      automationMonthly: round2(automationMonthly),
      netMonthly: round2(netMonthly),
      firstYearNet: round2(firstYearNet),
      paybackMonths: round2(paybackMonths),
      roiPct: roiPct == null ? null : round2(roiPct),
      worthIt: netMonthly > 0,
    };
  }

  /* 2. AI voiceover / podcast cost vs human studio or freelancer */
  // Illustrative defaults only: voice AI pricing changes often, users can edit every value.
  var DEFAULT_VOICE_TIERS = [
    { name: "AI Starter", monthly: 5, includedMinutes: 30, overagePerMinute: null },
    { name: "AI Creator", monthly: 22, includedMinutes: 100, overagePerMinute: 0.3 },
    { name: "AI Pro", monthly: 99, includedMinutes: 500, overagePerMinute: 0.24 },
    { name: "AI Scale", monthly: 330, includedMinutes: 2000, overagePerMinute: 0.18 },
  ];

  function tierCost(tier, minutes) {
    var included = num(tier.includedMinutes);
    var extra = Math.max(0, minutes - included);
    if (extra > 0 && (tier.overagePerMinute == null || tier.overagePerMinute === "")) return Infinity;
    return num(tier.monthly) + extra * num(tier.overagePerMinute);
  }

  function voiceoverCost(input) {
    var i = input || {};
    var minutes = num(i.minutesPerMonth);
    var humanPerMin = num(i.humanRatePerMinute);
    var sessionFees = num(i.humanSessionFees);
    var editHours = num(i.editHoursPerMonth);
    var editRate = num(i.editHourlyRate);
    var aiEditShare = i.aiEditPct == null ? 0.5 : pct(i.aiEditPct);
    var tiers = Array.isArray(i.tiers) && i.tiers.length ? i.tiers : DEFAULT_VOICE_TIERS;

    var editCost = editHours * editRate;
    var humanMonthly = minutes * humanPerMin + sessionFees + editCost;
    var results = tiers.map(function (t) {
      var plan = tierCost(t, minutes);
      var total = plan + editCost * aiEditShare;
      return { name: String(t.name), planCost: round2(plan), total: round2(total), eligible: isFinite(plan) };
    });
    var best = null;
    results.forEach(function (r) { if (r.eligible && (!best || r.total < best.total)) best = r; });
    var savingsMonthly = best ? humanMonthly - best.total : null;
    return {
      humanMonthly: round2(humanMonthly),
      humanPerFinishedMinute: minutes > 0 ? round2(humanMonthly / minutes) : null,
      tiers: results,
      best: best,
      aiPerFinishedMinute: best && minutes > 0 ? round2(best.total / minutes) : null,
      savingsMonthly: savingsMonthly == null ? null : round2(savingsMonthly),
      savingsYearly: savingsMonthly == null ? null : round2(savingsMonthly * 12),
      savingsPct: best && humanMonthly > 0 ? round2((savingsMonthly / humanMonthly) * 100) : null,
    };
  }

  /* 3. Freelancer hourly -> fixed price & tax take-home */
  var CURRENCIES = { USD: 2, EUR: 2, KRW: 0 };

  function roundCurrency(n, currency) {
    var d = CURRENCIES[currency] == null ? 2 : CURRENCIES[currency];
    var f = Math.pow(10, d);
    return isFinite(n) ? Math.round(n * f) / f : n;
  }

  function freelancerRate(input) {
    var i = input || {};
    var currency = CURRENCIES[i.currency] != null ? i.currency : "USD";
    var hourly = num(i.hourlyRate);
    var hours = num(i.estimatedHours);
    var buffer = pct(i.bufferPct);
    var platform = pct(i.platformFeePct);
    var fx = pct(i.fxFeePct);
    var tax = pct(i.taxRatePct);
    var withholding = pct(i.withholdingPct);
    var R = function (n) { return roundCurrency(n, currency); };

    var fixedPrice = hourly * hours * (1 + buffer);
    var platformFee = fixedPrice * platform;
    var fxFee = (fixedPrice - platformFee) * fx;
    var taxable = fixedPrice - platformFee - fxFee;
    var incomeTax = taxable * tax;
    var takeHome = taxable - incomeTax;
    var withheld = fixedPrice * withholding;
    var cashAtPayment = taxable - withheld;
    var keepFactor = (1 - platform) * (1 - fx) * (1 - tax);

    var result = {
      currency: currency,
      fixedPrice: R(fixedPrice),
      platformFee: R(platformFee),
      fxFee: R(fxFee),
      taxableIncome: R(taxable),
      incomeTax: R(incomeTax),
      takeHome: R(takeHome),
      withheldAtSource: R(withheld),
      cashAtPayment: R(cashAtPayment),
      taxStillDue: R(incomeTax - withheld), // negative = expected refund
      effectiveHourly: hours > 0 ? R(takeHome / hours) : null,
      keepPct: round2(keepFactor * 100),
    };
    var target = num(i.targetTakeHome);
    if (target > 0) {
      result.requiredFixedPrice = keepFactor > 0 ? R(target / keepFactor) : null;
      result.requiredHourly = keepFactor > 0 && hours > 0 ? R(target / keepFactor / hours / (1 + buffer)) : null;
    }
    return result;
  }

  return {
    num: num,
    automationROI: automationROI,
    voiceoverCost: voiceoverCost,
    tierCost: tierCost,
    freelancerRate: freelancerRate,
    roundCurrency: roundCurrency,
    DEFAULT_VOICE_TIERS: DEFAULT_VOICE_TIERS,
    CURRENCIES: CURRENCIES,
  };
});
