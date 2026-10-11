# 05 — Demo Script (60 seconds on stage)

Context in the deck: right after "Three moments to keep customers". The pitch opens with **Pak Andi**, a loyal customer who buys a second life policy (small premium, monthly) and later cancels it. The demo shows that moment being caught **before** he signs.

Setup: browser open on screen 1, zoom 110–125%, data mode **Real**, Second Look form empty, `Load demo: Pak Andi` preset ready.

| Time | Screen | Action | Script (English) |
|---|---|---|---|
| 0–10s | Portfolio X-Ray | Hover the "Share of all stops" bar | "This is SECOND LOOK. Management sees the five groups we just showed: extra policies are 6 percent of the book and 83 percent of everything that stopped." |
| 10–22s | Retention Watchlist | Click segment S1 → filtered list → click the top row → detail panel | "The retention team sees which active policies are at risk, ranked, each with a reason and a suggested action. This customer holds three policies. The third already stopped; the second is paid monthly and duplicates the first. That's who we call." |
| 22–45s | **Second Look Check** | Click `Load demo: Pak Andi` → plan shows Life, small premium, monthly → **High** risk + reasons + alternatives | "Now the moment that matters. An agent is about to sell Pak Andi a second policy. He already has life insurance. The plan: life again, small premium, monthly. Chance it gets cancelled: high. The system suggests a top-up on the policy he already has." |
| 45–55s | Second Look Check | Switch payment to **Annual** | "If he pays annually instead, the risk drops sharply." |
| 55–60s | Second Look Check | Point at the disclaimer | "This is an estimate from historical patterns, and it's exactly what our pilot will test. The decision takes ten seconds, at the agent's desk, before anything is signed." |

> Scene 2 example (real data): filter S1 → top row **POL004016** / **CUST001175** (92%). Detail panel shows policy 1 Life monthly (active), policy 2 Life monthly (active, the at-risk one), policy 3 CI monthly (stopped).

## Shortcuts & deep links
- Keys `1`–`5` switch screens; `/` opens the assistant; `Esc` closes panels.
- Open `index.html#andi` to land on Second Look with Pak Andi already loaded (fastest recovery if something goes wrong mid-demo).

## Backup plan
1. **No internet:** the app is static and doesn't need internet. Test with Wi-Fi turned off.
2. **Venue laptop:** bring the build (`dist/`) on a USB drive and open `index.html`. If the browser blocks local files, use the backup video.
3. **Backup video:** 55-second recording of the flow above (fallback only), embedded in the demo slide or the next slide.
4. **Backup screenshots:** 3 images (X-Ray, Watchlist, Second Look high → low) on one slide.

## Day-before checklist
- [ ] Real data loaded; KPI numbers match the deck
- [ ] Watchlist example chosen and its ID written down
- [ ] Tested on the presentation laptop at projector resolution (1366×768 and 1920×1080)
- [ ] Backup video plays from inside the PPT
- [ ] Demo ≤ 60 seconds in 3 consecutive rehearsals
