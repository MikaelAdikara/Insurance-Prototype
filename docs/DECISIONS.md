# Decisions Log

Catat setiap keputusan desain/teknis di sini: tanggal, keputusan, alasan, alternatif yang ditolak.

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-10-10 | Frontend: Vite + React + TS, no chart library (X-Ray bars are plain flex divs) | Fewer deps, smaller bundle, nothing to break offline |
| 2026-10-10 | Build = one self-contained `dist/index.html` (vite-plugin-singlefile); JSON imported at build time from `app/src/data/{real,synthetic}` instead of `public/data` | Opens straight from disk (file://) on any laptop, no server; `real/` stays gitignored |
| 2026-10-10 | Risk bands kept at High ≥ 30% · Medium 5–30% · Low < 5% | Spec default; all 4 Second Look scenarios land in the expected band (Andi 76% High → 4% Low annual; first policy 1% Low; PA single 12% Medium) |
| 2026-10-10 | Reason codes = grouped `coef × x` contributions > 0.1, max 3; QUARTERLY + SEMESTER grouped as OTHER_INSTALLMENT | Same logic in `pipeline/model.py` and `app/src/lib/score.ts` |
| 2026-10-10 | "Not drivers" age p-value from a logit controlling for all model features (p = 0.20) | Matches the deck's "not significant once controlled" claim |
| 2026-10-10 | Safer alternatives skip combinations never seen in data (e.g. PA paid annually); PA plans get a "one-click renewal" card | Avoid recommending something the data can't back |
| 2026-10-10 | Synthetic data: same customer/policy structure, churn ~ Bernoulli(real model probability per cell); IDs `SYN-*` | Aggregates mirror real (S1 292/160, AUC 0.959), no real rows copied |
| 2026-10-10 | Demo watchlist example: **CUST001175**, policy **POL004016** (2nd of 3, Life, monthly, same product as 1st, 92%); the 3rd policy already stopped | No active "3rd of 3, monthly, duplicate" case exists; demo line adjusted in docs/05 |
| 2026-10-10 | Pilot Planner not tested against clustering by agent | Shown as a note on screen; formula reproduces 350 / 159 / 611 |
| 2026-10-10 | v2: assistant "Ask SECOND LOOK" is **offline, rule-based** (keyword intents computed on the loaded data), not an LLM | Demo must run without internet; a static build can't hide an API key in a public repo; every number stays reproducible |
| 2026-10-10 | v2: Campaign Simulator tab (contacts per saved policy: rule vs model vs random, save-rate slider) | Reproduces deck slide 22: 135 → 10 at a 20% save rate |
| 2026-10-10 | v2: Three.js portfolio constellation on X-Ray (5,000 policies, stopped = gold), CSS 3D policy stack in Second Look, tilt KPIs | "3D & modern" request; three.js bundled, still one offline file (~4.8 MB) |
| 2026-10-10 | v2: presenter shortcuts 1–5 (screens), "/" (assistant), Esc (close) | Faster, safer navigation on stage |
| 2026-10-11 | v3: unified dark page headers, animated risk gauge (needle + count-up), KPI count-up, risk bars in watchlist, pilot month strip | Make the demo moments read from the back of the room |
| 2026-10-11 | v3: deep links `#x-ray` `#watchlist` `#second-look` `#campaign` `#pilot`, plus `#andi` (Second Look with Pak Andi loaded) | Backup entry points on stage; enables headless screenshot QA |
| 2026-10-11 | QA/QC: fixed duplicate React keys (`main` and assistant both keyed by mode) that left stale screens + WebGL canvases after toggling Real/Synthetic; tween/count-up now land on final value even when frames pause; 3D stack offset so policy 1 is visible; select overflow; shortcut handler hardened | Found via headless Edge file:// screenshots at 1366×768 and a scripted sweep of all tabs in both data modes (0 console errors after fixes) |
