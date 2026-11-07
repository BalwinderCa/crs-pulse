# Community Timelines: plan

Status: planned 2026-11-07, not started. Nothing is built yet.

**The idea:** users can choose to publish their timeline. Everyone can browse other people's
timelines, see what happened today, and compare their own wait with people like them. It's the
Reddit or Telegram "timeline thread", built into the app and updated every day.

**Why:** PostHog (30 days to 2026-11-07, 448 app users) shows that people who add a milestone
come back on 3+ days 65% of the time, against 41% of everyone else. Timeline is the second
most-used screen (326 users). The competitor "Canadian Immigration Tracker" (1,715 ratings,
4.8 stars) made "Community Insights" its biggest release (v3.0, 2026-09-21): users compare their
timeline with other users' and get predicted dates for their next milestone.

## 1. What a shared timeline shows

```
Maple-4821 · CEC (Express Entry) · Outside Canada · Office: CPC Sydney
  AOR              Aug 19, 2026
  BIL              Sep 14   (+26 days)
  Medical passed   Sep 14   (+26)
  Biometrics done  Sep 15   (+27)
  Final decision   Nov 4    (+77)   ✓ 6 days ago
```

- **Shared:** the program (from the tracked application), the milestone types and their exact
  dates, and an optional office and inside/outside Canada, both picked from fixed lists.
- **Never shared:** milestone notes, custom labels, CRS score, profile data, the push token.
- **Name:** an automatic handle like "Maple-4821". There's no free text anywhere, so no names,
  no abuse to moderate and nobody impersonating anyone.
- **No account:** the phone keeps a private key, which it uses to update or delete its own
  timeline. Other people only ever see a separate public ID. The server stores only a hash of
  the key.

## 2. What users can see

The Timeline tab gets a **Mine | Community** switch.

| View | What it shows |
|---|---|
| **Today** | Milestones dated today or yesterday: "Maple-4821 · CEC · Final decision · AOR + 77 days". This is the reason to open the app every day. Milestones added today with an old date don't count as today's news. |
| **Like me** | Same program, AOR within ±15 days of yours: "14 people near your AOR · 5 have their final decision". |
| **Browse** | Filters for program, AOR month, current stage and office, newest first. |
| **Stats** | Medians per step (AOR → BIL, Medical, Final decision, eCOPR) with the number of timelines behind each. A step only shows once it has at least 5 timelines. Also "you're faster than X% of people". |

- A native ad after every 5th card, the same as the Draws list.
- A banner on the feed: "Self-reported by app users. Unofficial, not from IRCC." This matters
  given the Play Misleading Claims rejection (2026-10-31).

## 3. Adding a timeline

1. **Share button**, with a preview of exactly what others will see before anything is sent.
   It's off by default.
2. **Paste import.** A user pastes text like the example below and the app turns each line into
   a milestone. It understands AOR, BIL, Med, Bio, FD, PPR, P1/P2, eCOPR, and dates written as
   "Aug 19", "19/08/2026" or "2026-08-19". It lists the lines it couldn't read (e.g. "PVO/SVO")
   instead of guessing. This is the fastest way to collect timelines people already have.
   ```
   AOR: August 19, 2026
   PVO/SVO: Vancouver, CPC Sydney
   BIL: September 14, 2026
   Medical Passed: September 14, 2026
   Biometrics Completed: September 15, 2026
   FD: November 4, 2026
   ```
3. **Automatic updates.** Once a timeline is shared, adding, editing or deleting a milestone
   updates it.
4. **New milestone types** the community uses: Eligibility passed, Background check
   started/done, PPR, eCOPR. Today's types are in `mobile/src/store/timelineStore.ts`.

## 4. Scenarios and how each is handled

| Scenario | Handling |
|---|---|
| No tracked application | The Share button first asks them to pick their program. |
| User changes their program | The shared timeline moves to the new program. |
| User starts their next application (e.g. citizenship) | ⚠️ Today the timeline is one list for all applications (`startNext` in `applicationStore` doesn't touch milestones). The shared timeline has to be frozen as completed before new milestones mix in. Finished timelines are the most useful data, so they should stay. |
| User turns sharing off | Deleted from the server immediately. |
| Reset All Data | Deletes the shared timeline as well (`mobile/src/utils/resetAllData.ts`). |
| App deleted, or phone changed, while sharing | The key is gone, so the user can't delete it from the app. Timelines not updated for 18 months are removed automatically, there's a support route to delete one by its public ID, and the privacy policy says so. |
| Fake timelines or spam (the API key is inside the app, so anyone can extract it) | Limit of 3 new timelines per IP per day. Dates must be between 2015 and tomorrow, in a sensible order, with AOR required. Outliers are left out of the stats. A Report button hides a card after 3 reports, and the developer can remove cards by hand. |
| Few users at launch | Empty states say "Be one of the first", and stats stay hidden below 5 timelines. Nothing is made up or seeded with fake timelines. |
| Offline | Shows the cached feed with "updated X ago". |
| French | Every screen and program name in both languages (`en.ts` / `fr.ts`). |
| Older app versions | Only 1.0.15 gets it, over the air. That's about 75% of users already. |

## 5. Privacy and store rules (must be done before launch)

- **Privacy policy** (`docs/PRIVACY_POLICY.md`): today it says profile and immigration data
  never leave the device. It needs a "Community timelines (optional)" section.
- **The same claim appears elsewhere** and needs "unless you choose to share" added:
  - the onboarding line "Private & free — everything on your device" (`welcomeFeat3` in `en.ts`/`fr.ts`)
  - the in-app privacy text in `en.ts`/`fr.ts`
  - the website (`web/build.mjs`), e.g. "It never leaves your phone" and "Data stays on your device"
  - the "All user profile data stays on-device" line in `CLAUDE.md`
- **App Store privacy label:** add "Other User Content, not linked to you".
  **Play Data safety form:** the same.
- **Apple guideline 1.2 (user-generated content):** this requires a way to report content and
  to block or hide users. That's covered by Report plus "Hide this person".
- **Exact dates can identify someone** to people who know them, for example a sponsor's family.
  The preview and the off-by-default switch cover this, the same as posting on Reddit.

## 6. Technical design

- **Storage: Cloudflare D1 (SQLite), not KV.** The feed needs filtered queries (program, AOR
  month, "today"), and KV's free tier allows only 1,000 listings a day. D1 sits on the same
  Cloudflare account as the worker (check the account first, see `CLAUDE.md`), with feed
  responses cached for a few minutes.
- **Tables:**
  - `timelines(public_id, secret_hash, program, office, inside_canada, handle, created_at, updated_at, hidden, reports)`
  - `milestones(public_id, type, date)`
- **Worker API** (`workers/push/src/`, bearer `PUSH_API_SECRET`, rate limited like `/register`):
  - `POST /timelines`: create or update. The key goes in the body; a new timeline returns its public ID.
  - `DELETE /timelines`: remove one, using the key.
  - `GET /timelines/feed?program=&aorMonth=&stage=&office=&cursor=`
  - `GET /timelines/today?program=`
  - `GET /timelines/stats?program=`
  - `POST /timelines/report`: report a card, by public ID.
- **App:**
  - a community service (same headers as `pushService.ts`) and a store that keeps the key, the
    sharing on/off state and a feed cache
  - the Community screens, the paste parser, the new milestone types and en/fr strings
  - analytics events `timeline_shared`, `timeline_unshared` and `community_viewed`, with no
    timeline data in their properties (the rule in `analyticsService.ts`)
- **No new native code**, so it ships to 1.0.15 as an over-the-air update (`npm run ota`) with
  no store review. The privacy label and policy still have to be updated first.
- **Tests:** worker tests (`node --test`) and app tests (Jest) for the API, the paste parser and
  the share/unshare flows. Never call the live worker from a test.

## 7. Phases

| Phase | What | Estimate |
|---|---|---|
| 1 | Worker and D1, Share with preview, Today / Like me / Browse / Stats, paste import, Report, privacy updates | ~4–5 days |
| 2 | Daily digest push ("12 updates today in CEC, including 3 final decisions"), bookmark a timeline and get alerted when it moves, optional CRS score | ~3 days |

**How we'll know it works:** at least 30% of people who add milestones share their timeline, the
Community view is opened daily, and viewers come back on 7 days more often than non-viewers,
measured in PostHog.

## Decisions still open

1. **Exact dates or month only?** Recommended: exact dates. That's what makes "Today" possible,
   and it's what Reddit users already post.
2. **Open to everyone, or only people who share?** Recommended: open to everyone, with a share
   prompt. A locked feed would put people off.
3. **Daily digest push in phase 1 or phase 2?** Recommended: phase 2, once there's enough to put
   in it.
4. **Optional fields:** office and inside/outside Canada for now, with CRS score later?
