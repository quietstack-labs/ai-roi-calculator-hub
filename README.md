# AI ROI Calculator Hub

💼 **Related kits on Gumroad:** [AI Ops & MCP Prompt + Automation Mega-Pack ($12)](https://playmaster72.gumroad.com/l/mxttvof) · [Solopreneur OS Vault — 24 templates ($19)](https://playmaster72.gumroad.com/l/solopreneur-os-vault)


Free, private, zero-dependency calculators that run entirely in the browser.

Live: https://quietstack-labs.github.io/ai-roi-calculator-hub/

| Calculator | What it answers |
|---|---|
| [AI Automation ROI](https://quietstack-labs.github.io/ai-roi-calculator-hub/ai-automation-roi/) | Staff hours vs Make / n8n / Zapier + AI API cost: hours saved, payback, first-year ROI |
| [AI Voiceover Cost](https://quietstack-labs.github.io/ai-roi-calculator-hub/ai-voiceover-cost/) | Voice actor / studio cost per finished minute vs AI voice plans |
| [Freelancer Rate & Tax](https://quietstack-labs.github.io/ai-roi-calculator-hub/freelancer-rate-tax/) | Hourly → fixed price, platform/FX fees, withholding (KR 3.3%), income tax → take-home (USD/EUR/KRW) |

- All math is in `calc.js` (pure functions, works in Node and the browser).
- `npm test` checks the math, edge cases (negative/garbage input, caps, zero values, KRW rounding, reverse quotes) and SEO assets.
- Affiliate links are labeled on the page and configured in one place (`app.js`, `AFFILIATE`). They never change results.

Estimates only, not financial or tax advice. MIT licensed.
