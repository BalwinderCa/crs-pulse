// Builds the CRS Pulse public site into web/public/:
//   /             → home (hero + features + calculators + draws preview + FAQ)
//   /crs-calculator, /fsw-calculator, /bc-pnp-calculator, /sinp-calculator → one live
//     in-browser calculator each (/calculators 301s to the CRS one, see vercel.json)
//   /draws        → live IRCC draw tracking, cutoff trend + pool composition
//   /analytics    → draw analytics + where a score lands
//   /checklists   → per-program document checklists (from the app's data)
//   /processing-times → IRCC processing times + decision-date estimate
//   /timeline     → in-browser application milestone log
//   /features     → feature tour
//   /guides + /crs-points, /improve-crs-score, /language-tests-clb, /fsw-67-points,
//     /express-entry-draws, /express-entry-process → long-form guides (guides.mjs)
//   /about        → who publishes the site, data sources, contact
//   /privacy      → rendered from docs/PRIVACY_POLICY.md
//   /terms        → rendered from docs/TERMS_OF_USE.md
//
// Design ported from the claude.ai/design "iOS App Landing Page" project: a dark
// (light-toggle) theme in Space Grotesk + Newsreader, red accent #FF453A. The design
// canvas ({{ }} / sc-for / sc-if / DCLogic) is resolved to static HTML here; the
// interactive bits (theme toggle, FAQ, draws filter, calculator engine) run as small
// vanilla JS in-page. The legal markdown stays the single source of truth.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { buildGuides, GUIDES_REVIEWED } from './guides.mjs';
import { TESTS as LANG_TESTS, SKILLS, toClb, CLB_CLIENT_SRC } from './clb.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(here, '../docs');
// Rounds of invitations + pool distribution, mirrored from IRCC's public feed by
// .github/workflows/ircc-mirror.yml. Every draw figure on the site comes from here —
// a missing or empty file is a hard build failure, because shipping invented numbers
// on an immigration site is worse than not shipping.
const FEED = JSON.parse(readFileSync(resolve(here, '../data/ee-rounds.json'), 'utf8'));
if (!FEED.rounds?.length || !FEED.pool?.length) throw new Error('data/ee-rounds.json has no usable rounds');
const OUT = resolve(here, 'public');
const ASSETS = resolve(here, 'assets');

const APP_STORE_URL = 'https://apps.apple.com/app/crs-pulse-ircc-tracker/id6784619403';
const CONTACT = 'contact@crspulse.com';
const SITE = 'https://www.crspulse.com';
const BUILT = new Date().toISOString().slice(0, 10);

// The newest round, for the draws page's title/description. The site rebuilds on
// every mirror commit, so search snippets show the current cutoff.
const LATEST = FEED.rounds[0];
const YEAR = String(LATEST.date).slice(0, 4);
const fmtN = (n) => Number(n).toLocaleString('en-CA');
const SHORT_DATE = new Date(`${LATEST.date}T12:00:00Z`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// Every public page, in nav order. Single source of truth for <title>/<meta description>,
// the markdown twin agents get via `Accept: text/markdown`, sitemap.xml and llms.txt.
// vercel.json's redirects/headers must list the same paths — web/build.test.mjs asserts it.
const PAGES = [
  {
    file: 'index', path: '/', priority: '1.0',
    title: 'CRS Pulse \u2014 Express Entry CRS Calculator & IRCC Draw Tracker',
    description: 'Calculate your Canada Express Entry CRS score, track live IRCC draws, and get push alerts for new rounds. Free, private, and on-device.',
    llm: 'What CRS Pulse is, the four calculators, recent draws, privacy model and FAQ.',
  },
  // One page per calculator (calc: the form it renders). /calculators 301s to the CRS one.
  {
    file: 'crs-calculator', path: '/crs-calculator', priority: '0.9', calc: 'crs',
    title: `CRS Calculator ${YEAR}: Free Express Entry Score Calculator`,
    description: 'Free CRS calculator for Express Entry. Enter your IELTS, CELPIP, PTE Core, TEF or TCF scores and get your Comprehensive Ranking System score out of 1,200.',
    llm: 'The CRS (Express Entry) calculator: inputs, how each factor scores, and the biggest-boost suggestion. Runs in-browser, no upload.',
  },
  {
    file: 'fsw-calculator', path: '/fsw-calculator', priority: '0.8', calc: 'fsw',
    title: 'FSW Calculator: Federal Skilled Worker 67 Points Check',
    description: 'Check Federal Skilled Worker eligibility on the 67-point grid: language, education, experience, age, job offer and adaptability. Free, in your browser.',
    llm: 'The FSW 67-point eligibility calculator: six selection factors, the 67-point pass mark and the CLB 7 / one-year minimums.',
  },
  {
    file: 'bc-pnp-calculator', path: '/bc-pnp-calculator', priority: '0.8', calc: 'bc',
    title: 'BC PNP Calculator: SIRS Points Score out of 200',
    description: 'Estimate your BC PNP Skills Immigration Registration System (SIRS) score out of 200 from work experience, education, language, wage and region.',
    llm: 'The BC PNP SIRS calculator: five factors scored out of 200, with no fixed pass mark.',
  },
  {
    file: 'sinp-calculator', path: '/sinp-calculator', priority: '0.8', calc: 'sinp',
    title: 'SINP Points Calculator: Saskatchewan EOI Score out of 110',
    description: 'Calculate your Saskatchewan Immigrant Nominee Program EOI points out of 110 and check the 60-point minimum. Free and private, in your browser.',
    llm: 'The Saskatchewan SINP International Skilled Worker EOI calculator: five factors out of 110, 60 to qualify.',
  },
  {
    file: 'draws', path: '/draws', priority: '0.9',
    title: `Express Entry Draws ${YEAR}: Latest CRS Cutoffs | CRS Pulse`,
    description: `Latest Express Entry draw #${LATEST.number} (${SHORT_DATE}): ${LATEST.label}, CRS ${LATEST.crs}, ${fmtN(LATEST.size)} ITAs. Every round from IRCC with cutoff trends and pool data.`,
    llm: 'Round-by-round draw table (number, date, category, invitations, cutoff), pool distribution and trend notes.',
  },
  {
    file: 'analytics', path: '/analytics', priority: '0.8',
    title: `Express Entry Draw Analytics ${YEAR}: Cutoffs by Category`,
    description: 'Express Entry cutoffs, cadence and invitations by category from recent IRCC rounds, plus a tool that shows which rounds your CRS score would have cleared.',
    llm: 'Per-category cutoff summary (rounds, low/average/high), invitations by category, draw cadence, and how a CRS score compares with recent rounds and the pool.',
  },
  {
    file: 'checklists', path: '/checklists', priority: '0.8',
    title: 'Immigration Document Checklists: PR, PNP, Study & Work',
    description: 'Free document checklists for Express Entry, PNP, family sponsorship, study and work permits, and citizenship. Track your progress privately in your browser.',
    llm: 'Document lists by program (Express Entry, PNP paper, family sponsorship, study permit, work permit, citizenship), grouped by section with hints.',
  },
  {
    file: 'processing-times', path: '/processing-times', priority: '0.8',
    title: `IRCC Processing Times ${YEAR}: PR, Family, Citizenship & More`,
    description: 'Current IRCC processing times for Express Entry, PNP, family sponsorship, citizenship and more, with people waiting and a decision-date estimator.',
    llm: 'IRCC processing time in months and people waiting for every application type, grouped by category, plus the typical stages of each.',
  },
  {
    file: 'timeline', path: '/timeline', priority: '0.7',
    title: 'Express Entry Timeline Tracker: ITA, AOR, Biometrics to COPR',
    description: 'Log Express Entry milestones from ITA and AOR to biometrics, medical and COPR. See days between steps against IRCC processing times. Private, in your browser.',
    llm: 'The PR application milestone sequence (ITA, submission, AOR, biometrics, medical, ADR, PR portal, passport request, final decision) with what each step means.',
  },
  {
    file: 'features', path: '/features', priority: '0.7',
    title: 'Express Entry App: Draw Alerts, PR Tracker & Checklists',
    description: 'Everything CRS Pulse does: CRS scoring, live IRCC draws, push alerts, an application tracker, checklists, timeline, and personal analytics \u2014 free.',
    llm: 'What the iPhone app does at each stage: tracker, checklists, timeline, alerts, analytics.',
  },
  {
    file: 'privacy', path: '/privacy', priority: '0.5',
    title: 'Privacy Policy \u2014 CRS Pulse',
    description: 'Privacy Policy for CRS Pulse \u2014 the Express Entry CRS calculator and IRCC draw tracker.',
    llm: 'What is stored, where it is stored (on-device) and what leaves the phone.',
  },
  {
    file: 'terms', path: '/terms', priority: '0.5',
    title: 'Terms of Use \u2014 CRS Pulse',
    description: 'Terms of Use for CRS Pulse \u2014 the Express Entry CRS calculator and IRCC draw tracker.',
    llm: 'Terms of use, including the estimates-only / not-immigration-advice disclaimer.',
  },
];
const page = (file) => PAGES.find((p) => p.file === file);
const mdPath = (p) => (p.path === '/' ? '/index.md' : `${p.path}.md`);

const slug = (s) =>
  s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const addHeadingIds = (html) =>
  html.replace(/<(h[2-6])>(.*?)<\/\1>/g, (_m, tag, inner) => `<${tag} id="${slug(inner)}">${inner}</${tag}>`);

const APPLE = (s = 20) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.86-.07 1.68-.75 3.04-.83 1.65-.13 2.9.65 3.71 1.94-1.94 1.16-1.64 3.66.32 4.86-.38 1.08-.9 2.15-1.65 3.2zm-3.62-14.6c-.05-1.7 1.4-3.1 3.14-3.18.28 1.88-1.65 3.4-3.14 3.18z"/></svg>`;

const appBtn = () =>
  `<a class="btn btn-dark" href="${APP_STORE_URL}" style="gap:9px">${APPLE(19)}<span style="display:flex;flex-direction:column;line-height:1.15;text-align:left"><span style="font-size:10px;opacity:.75;font-weight:500">Download on the</span><span style="font-size:15px;font-weight:700">App Store</span></span></a>`;

const accentBtn = (href, label) => `<a class="btn btn-accent" href="${href}">${label}</a>`;

// ------------------------------------------------------------------ CSS
// Restrained, document-like system: a near-white page, hairline rules instead of
// floating cards, one red accent, and type doing the hierarchy work. Two accent
// tokens on purpose — --accent is the fill (buttons, dots, bars) and --accentInk is
// the darker sibling used for accent-coloured *text*, which is the only way the red
// clears 4.5:1 on white.
const CSS = `
:root, :root[data-theme="light"]{
  --bg:#FFFFFF; --bg2:#F7F9FC; --bg3:#EDF1F7; --card:#FFFFFF; --input:#FFFFFF;
  --grad1:#FFFFFF; --grad2:#F7F9FC;
  --text:#0D1726; --text2:#48596F; --muted:#616E80; --border:#DDE3EC; --hairline:#EAEEF4;
  --catbar:#B9C3D1; --accent:#E5342B; --accentInk:#C92A22; --accentBtn:#C92A22; --accent2:#C92A22; --accentSoft:#FDEDEC;
  --success:#0B7A55; --successSoft:#E6F4EF; --warning:#E08A1E; --warningInk:#8A5200; --warningSoft:#FDF1DF; --danger:#C0281F;
  --shadow:0 1px 2px rgba(13,23,38,.06); --navbg:rgba(255,255,255,.88);
  --lift:0 18px 44px -20px rgba(13,23,38,.28), 0 2px 8px rgba(13,23,38,.05);
  --phone:0 40px 80px -28px rgba(13,23,38,.45), 0 8px 24px -8px rgba(13,23,38,.18);
  --heroTint:radial-gradient(60% 70% at 78% 28%, rgba(229,52,43,.10), transparent 70%), linear-gradient(180deg,#FDF7F6 0%,#FFFFFF 78%);
}
:root[data-theme="dark"]{
  --bg:#0B0F16; --bg2:#101720; --bg3:#1A2430; --card:#101720; --input:#0D141C;
  --grad1:#131C27; --grad2:#0D141C;
  --text:#EDF2F8; --text2:#9FB0C4; --muted:#7E8FA4; --border:#242F3D; --hairline:#1B242F;
  --catbar:#3A4757; --accent:#FF564B; --accentInk:#FF7A70; --accentBtn:#C92A22; --accent2:#FF7A70; --accentSoft:rgba(255,86,75,.12);
  --success:#3DD9A0; --successSoft:rgba(61,217,160,.12); --warning:#E8A54A; --warningInk:#F0B056; --warningSoft:rgba(240,176,86,.12); --danger:#FF6B61;
  --shadow:0 1px 2px rgba(0,0,0,.4); --navbg:rgba(11,15,22,.88);
  --lift:0 18px 44px -20px rgba(0,0,0,.7), 0 2px 8px rgba(0,0,0,.4);
  --phone:0 40px 80px -28px rgba(0,0,0,.8), 0 8px 24px -8px rgba(0,0,0,.5);
  --heroTint:radial-gradient(60% 70% at 78% 28%, rgba(255,86,75,.10), transparent 70%), linear-gradient(180deg,#121821 0%,#0B0F16 78%);
}
*{ box-sizing:border-box; }
html{ scroll-behavior:smooth; }
body{ margin:0; background:var(--bg); color:var(--text);
  font-family:'Satoshi',-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
  font-size:16px; line-height:1.6; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
a{ color:var(--accentInk); text-decoration:none; }
a:hover{ color:var(--accent); }
::selection{ background:var(--accent); color:#fff; }
h1,h2,h3,h4{ margin:0; font-family:'Satoshi',sans-serif; font-weight:900; color:var(--text); letter-spacing:-.035em; line-height:1.1; }
p{ margin:0; }
/* numerals: one class for every figure on the site, so columns of numbers line up */
.num{ font-family:'Satoshi',sans-serif; font-weight:900; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.wrap{ max-width:1080px; margin:0 auto; padding:0 24px; }
.sect{ padding:72px 0; border-top:1px solid var(--hairline); }
.sect-tint{ background:var(--bg2); }
.lede{ font-size:17px; line-height:1.65; color:var(--text2); max-width:62ch; }
.klabel{ font-size:11.5px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
.h2{ font-size:29px; margin-bottom:12px; }
.eyebrow{ font-size:11.5px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--accentInk); margin-bottom:10px; }
select, input, button{ font-family:inherit; }
select{ appearance:none; -webkit-appearance:none;
  background-image:linear-gradient(45deg,transparent 50%,var(--text2) 50%),linear-gradient(135deg,var(--text2) 50%,transparent 50%);
  background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%; background-size:5px 5px,5px 5px; background-repeat:no-repeat; }
select:focus, input:focus{ outline:none; border-color:var(--accent)!important; box-shadow:0 0 0 3px var(--accentSoft); }
a:focus-visible, button:focus-visible, summary:focus-visible{ outline:2px solid var(--accentInk); outline-offset:2px; border-radius:4px; }
@keyframes fadeUp{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
@media (prefers-reduced-motion: no-preference){
  [data-reveal]{ animation:fadeUp both linear; animation-timeline:view(); animation-range:entry 0% cover 14%; }
}
@media (prefers-reduced-motion: reduce){ *{ animation:none!important; transition:none!important; } html{ scroll-behavior:auto; } }
/* header */
.sitehead{ position:sticky; top:0; z-index:50; background:var(--navbg); backdrop-filter:saturate(1.4) blur(14px); -webkit-backdrop-filter:saturate(1.4) blur(14px); border-bottom:1px solid var(--hairline); }
.headbar{ display:flex; align-items:center; gap:28px; height:64px; }
.brand{ display:flex; align-items:center; gap:10px; flex-shrink:0; color:var(--text); }
.brand:hover{ color:var(--text); }
.brandmark{ width:32px; height:32px; border-radius:9px; display:block; box-shadow:0 1px 2px rgba(201,42,34,.25), inset 0 0 0 1px rgba(255,255,255,.08); transition:transform .2s ease; }
.brand:hover .brandmark{ transform:rotate(-6deg) scale(1.04); }
.wordmark{ font-family:'Satoshi',sans-serif; font-weight:700; font-size:18.5px; letter-spacing:-.45px; line-height:1; }
.navlinks{ display:flex; align-items:stretch; gap:22px; height:100%; }
.navlink{ position:relative; display:flex; align-items:center; font-size:14.5px; font-weight:500; color:var(--text2); transition:color .15s ease; }
.navlink:hover{ color:var(--text); }
.navlink[aria-current="page"]{ color:var(--text); font-weight:600; }
.navlink[aria-current="page"]::after{ content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px; border-radius:2px 2px 0 0; background:var(--accent); }
.headright{ margin-left:auto; display:flex; align-items:center; gap:10px; }
.livechip{ display:inline-flex; align-items:center; gap:8px; height:34px; padding:0 12px; border-radius:999px; border:1px solid var(--border); background:var(--card); color:var(--text2); font-size:13px; font-weight:500; font-variant-numeric:tabular-nums; white-space:nowrap; transition:border-color .15s ease, color .15s ease; }
.livechip:hover{ color:var(--text); border-color:var(--text2); }
.livechip b{ color:var(--text); font-weight:700; }
.livesep{ width:1px; height:12px; background:var(--border); }
.livedot{ position:relative; width:7px; height:7px; border-radius:50%; background:var(--success); }
@media (prefers-reduced-motion: no-preference){
  .livedot::after{ content:""; position:absolute; inset:-4px; border-radius:50%; border:1.5px solid var(--success); opacity:0; animation:livering 2.4s ease-out infinite; }
}
@keyframes livering{ 0%{ transform:scale(.4); opacity:.7 } 80%,100%{ transform:scale(1.25); opacity:0 } }
.theme-btn{ width:34px; height:34px; border-radius:9px; border:1px solid var(--border); background:var(--card); color:var(--text2); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:color .15s ease, border-color .15s ease; flex-shrink:0; }
.headcta{ padding:0 15px; height:34px; font-size:14px; border-radius:9px; gap:7px; white-space:nowrap; flex-shrink:0; }
.menu{ display:none; position:relative; }
.menu summary{ list-style:none; width:36px; height:34px; border-radius:9px; border:1px solid var(--border); background:var(--card); display:flex; align-items:center; justify-content:center; cursor:pointer; }
.menu summary::-webkit-details-marker{ display:none; }
.burger{ display:flex; flex-direction:column; gap:5px; width:15px; }
.burger i{ display:block; height:1.6px; border-radius:2px; background:var(--text); transition:transform .2s ease; }
.menu[open] .burger i:first-child{ transform:translateY(3.3px) rotate(45deg); }
.menu[open] .burger i:last-child{ transform:translateY(-3.3px) rotate(-45deg); }
.menupanel{ position:absolute; right:0; top:calc(100% + 10px); width:min(280px, calc(100vw - 32px)); padding:8px; border-radius:14px; border:1px solid var(--border); background:var(--card); box-shadow:var(--lift); display:flex; flex-direction:column; }
.menulink{ padding:11px 12px; border-radius:9px; font-size:15px; font-weight:500; color:var(--text); }
.menulink:hover{ background:var(--bg2); color:var(--text); }
.menulink{ position:relative; }
.menulink[aria-current="page"]{ background:var(--bg2); font-weight:600; }
.menulink[aria-current="page"]::before{ content:""; position:absolute; left:0; top:11px; bottom:11px; width:2.5px; border-radius:2px; background:var(--accent); }
.menufoot{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:6px; padding:10px 4px 2px; border-top:1px solid var(--hairline); }
@media (max-width:980px){ .headright > .livechip{ display:none; } }
@media (max-width:760px){
  .headbar{ gap:16px; height:58px; }
  .navlinks, .head-theme{ display:none!important; }
  .menu{ display:block; }
}
@media (max-width:360px){ .wordmark{ font-size:16.5px; } .headcta{ padding:0 11px; font-size:13px; } }
.totop{ display:inline-flex; align-items:center; gap:6px; font-weight:600; color:var(--text2); }
.totop:hover{ color:var(--accentInk); }
/* skip link: off-screen until focused */
.skip{ position:absolute; left:12px; top:-60px; z-index:100; background:var(--text); color:var(--bg); padding:10px 14px; border-radius:8px; font-weight:600; font-size:14px; }
.skip:focus{ top:12px; color:var(--bg); }
#content:focus{ outline:none; }
h1,h2,h3{ text-wrap:balance; }
p, li{ text-wrap:pretty; }
.calctab{ display:inline-flex; align-items:center; gap:8px; }
.calctab svg{ opacity:.8; flex-shrink:0; }
.btn:active{ transform:translateY(1px) scale(.985); }
.theme-btn:hover{ color:var(--text); border-color:var(--text2); }
/* calculator score bar: phones only, hidden while the full result card is visible */
.scorebar{ display:none; }
@media (max-width:900px){
  .scorebar{ display:flex; align-items:center; justify-content:space-between; gap:14px; position:fixed; left:12px; right:12px; bottom:calc(12px + env(safe-area-inset-bottom)); z-index:40;
    padding:12px 16px; border-radius:14px; background:var(--navbg); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid var(--border); box-shadow:var(--lift); color:var(--text);
    transition:transform .25s ease, opacity .25s ease; }
  .scorebar.hide{ transform:translateY(140%); opacity:0; pointer-events:none; }
  .calcbody{ padding-bottom:110px!important; }
  /* one swipeable row of tabs instead of three wrapped rows */
  .calctabs{ flex-wrap:nowrap!important; overflow-x:auto; scrollbar-width:none; margin:0 -24px; padding:0 24px; }
  .calctabs::-webkit-scrollbar{ display:none; }
  .calctab{ white-space:nowrap; flex-shrink:0; }
}
/* form controls fill their cell and may shrink below their longest option */
.fields > *, .fields4 > *{ min-width:0; }
label > select, label > input{ width:100%; min-width:0; max-width:100%; box-sizing:border-box; }
/* buttons */
.btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 20px; border-radius:8px;
  font-size:15px; font-weight:600; line-height:1.2; border:1px solid transparent; transition:background .15s ease,border-color .15s ease,color .15s ease,transform .12s ease; }
.btn-accent{ background:var(--accentBtn); color:#fff; }
.btn-accent:hover{ filter:brightness(.88); color:#fff; }
.btn-quiet{ background:var(--bg); color:var(--text); border-color:var(--border); }
.btn-quiet:hover{ background:var(--bg3); color:var(--text); border-color:var(--text2); }
.btn-dark{ background:var(--text); color:var(--bg); border-radius:9px; padding:11px 18px; }
.btn-dark:hover{ background:var(--text2); color:var(--bg); }
.arrowlink{ display:inline-flex; align-items:center; gap:6px; font-size:15px; font-weight:600; color:var(--accentInk); }
.arrowlink:hover{ color:var(--accent); }
/* panel: a bordered surface, not a floating card — no shadow, no blur, small radius */
.panel{ background:var(--card); border:1px solid var(--border); border-radius:10px; }
.navlink{ padding:7px 10px; border-radius:6px; font-size:14.5px; transition:color .15s ease,background .15s ease; }
.navlink:hover{ color:var(--text)!important; background:var(--bg3); }
.foot-link{ color:var(--text2); }
.foot-link:hover{ color:var(--accentInk); }
.link-accent{ color:var(--accentInk); }
.link-accent:hover{ color:var(--accent)!important; }
.theme-btn:hover{ color:var(--text); border-color:var(--text2); }
.lift{ transition:border-color .15s ease,background .15s ease; }
.lift:hover{ border-color:var(--text2)!important; }
/* data rows */
.drawrow{ transition:background .15s ease; }
.drawrow:hover{ background:var(--bg2); }
.trustrow{ display:flex; flex-wrap:wrap; gap:8px 22px; color:var(--text2); font-size:13.5px; }
.trustrow span{ display:inline-flex; align-items:center; gap:7px; }
.trustrow svg{ color:var(--success); flex-shrink:0; }
/* trust strip: hairline-separated editorial row, not four cards */
.strip{ display:grid; grid-template-columns:repeat(4,1fr); }
.strip > div{ padding:0 24px; border-left:1px solid var(--hairline); }
.strip > div:first-child{ padding-left:0; border-left:0; }
/* stat cells inside a panel, divided by hairlines */
.cells{ display:grid; grid-template-columns:repeat(4,1fr); }
.cells > div{ padding:18px 20px; border-left:1px solid var(--hairline); }
.cells > div:first-child{ border-left:0; }
/* ---- app-landing surfaces ---- */
.hero-band{ background:var(--heroTint); border-bottom:1px solid var(--hairline); }
/* iPhone Pro frame (see phone() in the builder). Proportions follow a 6.3" Pro:
   band ~1.1% of width, bezel ~3.4%, screen corner radius ~13.6%. */
.iphone{ position:relative; flex-shrink:0; container-type:inline-size; padding:1.15%; border-radius:15.8% / 7.35%;
  background:linear-gradient(135deg,#E3E3E6 0%,#8E8E93 18%,#D6D6DA 34%,#77777D 52%,#C9C9CE 70%,#8A8A90 86%,#DADADE 100%);
  box-shadow:var(--phone), inset 0 0 0 .5px rgba(255,255,255,.55), inset 0 0 1px 1px rgba(0,0,0,.25); }
:root[data-theme="dark"] .iphone{ background:linear-gradient(135deg,#6B6B70 0%,#2E2E32 20%,#55555A 38%,#232327 56%,#4A4A4F 74%,#2A2A2E 90%,#5A5A5F 100%); }
.ibezel{ background:#050506; border-radius:14.9% / 6.95%; padding:3.3%; box-shadow:inset 0 0 0 1px rgba(255,255,255,.04); }
.iscreen{ position:relative; overflow:hidden; border-radius:12.2% / 5.62%; background:#F2F6FF; }
.iscreen::after{ content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit;
  background:linear-gradient(115deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 32%); }
.iscreen img{ display:block; width:100%; height:auto; }
.istatus{ position:relative; height:16.3cqw; display:flex; align-items:center; justify-content:space-between; padding:0 7.5cqw 0 10.5cqw; color:#0D1726; }
.itime{ font:600 4.35cqw/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif; letter-spacing:-.01em; }
.iicons svg{ display:block; width:17.5cqw; height:auto; }
.iisland{ position:absolute; left:50%; top:3.1cqw; transform:translateX(-50%); width:30cqw; height:8.9cqw; border-radius:99px; background:#000; }
.iisland::after{ content:""; position:absolute; right:3.2cqw; top:50%; width:3.1cqw; height:3.1cqw; transform:translateY(-50%); border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#2B3A55 0%,#0B0F18 60%); }
.ib{ position:absolute; width:1.1%; border-radius:2px; background:linear-gradient(90deg,#6F6F74,#C8C8CC 50%,#7A7A80); }
:root[data-theme="dark"] .ib{ background:linear-gradient(90deg,#2A2A2E,#5E5E63 50%,#2A2A2E); }
.ib-action{ left:-.9%; top:17.5%; height:3.6%; }
.ib-volup{ left:-.9%; top:24.5%; height:6.6%; }
.ib-voldn{ left:-.9%; top:32.8%; height:6.6%; }
.ib-side{ right:-.9%; top:25.5%; height:10.2%; }

.phonewrap{ position:relative; display:inline-block; }
.card{ background:var(--card); border:1px solid var(--border); border-radius:14px; }
.card-lift{ box-shadow:var(--lift); }
.frow{ display:grid; grid-template-columns:1fr 300px; gap:56px; align-items:center; }
.frow.flip{ grid-template-columns:300px 1fr; }
.frow.flip .fshot{ order:-1; }
.ftext{ max-width:520px; }
.frow.flip .ftext{ margin-left:auto; }
.fshot{ display:flex; justify-content:center; }
.ticks{ display:flex; flex-direction:column; gap:10px; margin:20px 0 0; padding:0; }
.ticks li{ list-style:none; display:flex; gap:10px; align-items:flex-start; font-size:15px; color:var(--text2); line-height:1.5; }
.ticks svg{ color:var(--success); flex-shrink:0; margin-top:4px; }
.statbar{ display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }
/* milestone rail */
.rail{ display:flex; align-items:flex-start; gap:0; }
.rail li{ flex:1; position:relative; padding-top:22px; list-style:none; }
.rail li::before{ content:""; position:absolute; top:5px; left:0; width:11px; height:11px; border-radius:50%;
  background:var(--bg); border:2px solid var(--accent); }
.rail li::after{ content:""; position:absolute; top:10px; left:11px; right:0; height:1px; background:var(--border); }
.rail li:last-child::after{ display:none; }
.rail li[data-end]::before{ background:var(--accent); }
/* faq accordion — hairline rows */
.faq{ border-bottom:1px solid var(--hairline); }
.faq summary{ list-style:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:16px;
  padding:16px 0; color:var(--text); font-size:16px; font-weight:600; transition:color .15s ease; }
.faq summary::-webkit-details-marker{ display:none; }
.faq summary::after{ content:"+"; font-family:'Satoshi',sans-serif; font-size:20px; color:var(--accentInk); flex-shrink:0; transition:transform .2s ease; }
.faq[open] summary::after{ transform:rotate(45deg); }
.faq summary:hover{ color:var(--accentInk); }
.faq .a{ padding:0 0 18px; font-size:15px; line-height:1.65; color:var(--text2); max-width:70ch; }
/* calculator controls */
.chip{ cursor:pointer; padding:9px 14px; border-radius:8px; border:1px solid var(--border); background:var(--input); color:var(--text2); font-size:13px; font-weight:600; transition:all .15s ease; }
.chip.on{ border-color:var(--accentBtn); background:var(--accentBtn); color:#fff; }
.chip.toggle{ display:inline-flex; align-items:center; gap:9px; }
.chip.toggle::before{ content:""; width:15px; height:15px; border-radius:4px; border:1.5px solid var(--muted); flex-shrink:0; box-sizing:border-box; }
.chip.toggle.on::before{ border-color:#fff; background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23C92A22' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 10.5l4 4 8-9'/%3E%3C/svg%3E") center/11px no-repeat; }
.langblock [hidden], .rboost[hidden]{ display:none!important; }
.langhint{ font-size:12.5px; color:var(--muted); margin:0 0 14px; }
.langsub{ font-size:12.5px; color:var(--text2); font-weight:600; margin-bottom:12px; }
.langhead{ display:flex; flex-wrap:wrap; align-items:flex-end; gap:14px 20px; margin-bottom:14px; }
.langhead > label:first-child{ flex:1 1 240px; max-width:340px; }
.sametoggle{ display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--text2); font-weight:500; padding-bottom:10px; cursor:pointer; }
.sametoggle input{ width:16px; height:16px; accent-color:var(--accentBtn); }
.clbout{ font-size:12px; font-weight:700; color:var(--success); min-height:16px; font-variant-numeric:tabular-nums; }
.clbout.low{ color:var(--warningInk); }
.rboost{ font-size:12.5px; line-height:1.5; color:var(--text2); margin:10px 0 0; padding-top:10px; border-top:1px solid var(--hairline); }
.rboost b{ color:var(--text); }
.rboost-pts{ font-weight:700; color:var(--success); }
.rboost a{ color:var(--accentInk); font-weight:600; margin-left:4px; }
.calctab{ cursor:pointer; padding:12px 16px; border:none; background:none; border-bottom:2px solid transparent; color:var(--text2); font-size:14.5px; font-weight:600; display:flex; align-items:center; gap:8px; }
.calctab.on{ border-bottom-color:var(--accent); color:var(--text); font-weight:700; }
.filterchip{ cursor:pointer; padding:7px 14px; border-radius:999px; border:1px solid var(--border); background:var(--card); color:var(--text2); font-size:13px; font-weight:600; }
.filterchip.on{ border-color:var(--accentBtn); background:var(--accentBtn); color:#fff; }
/* doc pages */
.doc{ max-width:760px; margin:0 auto; padding:72px 24px 90px; }
.doc-card{ background:transparent; }
.doc-card h1{ font-size:clamp(40px,5vw,64px); line-height:1.02; margin:.1em 0 .7em; }
.doc-card h2{ font-size:clamp(24px,2.4vw,30px); margin:1.8em 0 .5em; }
.doc-card h3{ font-size:1.02rem; margin:1.5em 0 .5em; }
.doc-card p,.doc-card li{ color:var(--text2); font-size:17px; line-height:1.7; }
.doc-card p{ margin:0 0 1em; }
.doc-card a{ font-weight:500; }
.doc-card hr{ border:0; border-top:1px solid var(--hairline); margin:2em 0; }
.doc-card code{ background:var(--bg3); padding:.1em .4em; border-radius:4px; font-size:.9em; }
.doc-card ul,.doc-card ol{ padding-left:1.3em; }
.doc-card li{ margin:.3em 0; }
.doc-card blockquote{ margin:1em 0; padding:.6em 1.1em; border-left:3px solid var(--accent); background:var(--bg2); }
/* responsive */
@media (max-width:900px){
  .hero{ grid-template-columns:1fr!important; gap:32px!important; }
  .frow, .frow.flip{ grid-template-columns:1fr!important; gap:32px!important; }
  .frow.flip .fshot{ order:0; }
  .ftext, .frow.flip .ftext{ max-width:none; margin-left:0; }
  .fshot{ justify-content:flex-start; }
  .phonewrap{ display:block; }
  .hero .fshot, .hero > div:last-child{ justify-content:center; }
  .hero .iphone{ margin:0 auto; }
  .statbar{ grid-template-columns:repeat(2,1fr); gap:22px 18px; }
  .split{ grid-template-columns:1fr!important; gap:28px!important; }
  .calcbody{ grid-template-columns:minmax(0,1fr)!important; }
  .calcresult{ position:static!important; }
  .poolgrid{ grid-template-columns:1fr!important; }
  .statgrid{ grid-template-columns:repeat(2,1fr)!important; }
  .fblock{ flex-direction:column!important; }
  .fblock .fvisual{ flex:none!important; max-width:100%!important; width:100%!important; }
  .featgrid{ grid-template-columns:1fr 1fr!important; }
  .strip{ grid-template-columns:1fr 1fr; gap:22px 0; }
  .strip > div:nth-child(odd){ padding-left:0; border-left:0; }
  .rail{ display:block; }
  .rail li{ padding:0 0 18px 22px; }
  .rail li::before{ top:3px; left:0; }
  .rail li::after{ top:14px; left:5px; right:auto; bottom:0; width:1px; height:auto; }
  .rail li:last-child{ padding-bottom:0; }
}
/* Below this the header cannot hold logo + links + toggle + CTA without the CTA
   falling off the edge, so the links step aside; the footer carries the full set. */

@media (max-width:640px){
  body{ font-size:15.5px; }
  /* one item per row reads better than two narrow columns of wrapped text */
  .strip{ grid-template-columns:1fr; gap:0; }
  .strip > div{ padding:14px 0 0; border-left:0; border-top:1px solid var(--border); }
  .strip > div:first-child{ padding-top:0; border-top:0; }
  /* the home draw list reflows instead of scrolling sideways, so the cutoff — the
     number people came for — is never parked off-screen */
  .dlist .dhead{ display:none!important; }
  .dlist .drawrow{ grid-template-columns:1fr auto!important; gap:3px 14px!important; padding:13px 16px!important; }
  .dlist .drawrow > *:nth-child(1){ grid-column:1; grid-row:1; display:flex; align-items:baseline; gap:8px; }
  .dlist .drawrow > *:nth-child(2){ grid-column:1; grid-row:2; }
  .dlist .drawrow > *:nth-child(3){ grid-column:1; grid-row:3; text-align:left!important; font-size:13px!important; color:var(--muted)!important; }
  .dlist .drawrow > *:nth-child(3)::after{ content:" invited"; }
  .dlist .drawrow > *:nth-child(4){ grid-column:2; grid-row:1 / span 3; align-self:center; }
  .dlist .dcat{ white-space:normal!important; }
  /* the score is the payoff — it leads on a phone, with the inputs under it */
  .calcpv .pvscore{ order:-1; border-left:0!important; border-bottom:1px solid var(--hairline); }
  .pvfields{ grid-template-columns:1fr!important; }
  .sect{ padding:48px 0; }
  .wrap{ padding:0 18px; }
  .h2{ font-size:24px; }
  .lede{ font-size:16px; }
  .featgrid{ grid-template-columns:1fr!important; }
  .fields,.fields4{ grid-template-columns:repeat(2,minmax(0,1fr))!important; }
  .footgrid{ grid-template-columns:1fr 1fr!important; }
  .cells{ grid-template-columns:1fr 1fr; }
  .cells > div{ border-left:0; border-top:1px solid var(--hairline); }
  .cells > div:nth-child(2){ border-left:1px solid var(--hairline); border-top:0; }
  .cells > div:nth-child(1){ border-top:0; }
  .cells > div:nth-child(4){ border-left:1px solid var(--hairline); }
  .drawscroll{ overflow-x:auto; }
  .drawscroll .drawinner{ min-width:600px; }
  .shots{ gap:12px!important; }
}
@media (max-width:430px){ .fields{ grid-template-columns:minmax(0,1fr)!important; } }

.doc-card{ padding:0; }
.calc-about{ padding-top:24px; padding-bottom:72px; }
.calc-about .doc-card{ max-width:760px; }
.doc-card table{ width:100%; border-collapse:collapse; margin:1.2em 0 1.6em; font-size:15px; display:block; overflow-x:auto; }
.doc-card th,.doc-card td{ text-align:left; padding:9px 12px; border-bottom:1px solid var(--hairline); color:var(--text2); vertical-align:top; }
.doc-card th{ color:var(--text); font-weight:700; border-bottom:1.5px solid var(--border); white-space:nowrap; }
.doc-card td{ font-variant-numeric:tabular-nums; }
.doc-card td strong{ color:var(--text); }
.doc-card .guide-meta{ font-size:14px; line-height:1.5; color:var(--muted); margin:-1.4em 0 2em; }
.guide-crumbs{ font-size:13.5px; color:var(--muted); margin-bottom:18px; }
.guide-crumbs a{ color:var(--text2); }
.guide-related{ margin-top:3em; padding-top:1.6em; border-top:1px solid var(--hairline); }
.guide-related h2{ margin-top:0!important; }
.guide-cards{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; margin-top:14px; }
.guide-cards a{ display:block; border:1px solid var(--border); border-radius:14px; padding:14px 16px; color:var(--text); background:var(--card); font-weight:700; font-size:15px; line-height:1.35; }
.guide-cards a small{ display:block; font-weight:500; color:var(--text2); font-size:13px; margin-top:4px; }
.guide-cta{ margin-top:2.4em; display:flex; flex-wrap:wrap; gap:12px; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:18px 20px; }
.guide-cta p{ margin:0; flex:1 1 260px; font-size:15.5px!important; }
`;

// One Google publisher account serves the app's AdMob ads and AdSense on this site.
// (developer.yxe@gmail.com has a separate AdMob-only account, pub-5258670698032581,
// which cannot take AdSense; don't use it here.) Only the ownership meta tag uses
// ADSENSE_CLIENT until the site is approved; no ad script loads yet.
const ADSENSE_CLIENT = 'ca-pub-4874088724567128';
const ADMOB_PUB = 'pub-4874088724567128';
// Vercel Web Analytics: cookieless page views, served first-party from /_vercel/insights.
// Does nothing until Web Analytics is enabled on the Vercel project (the script 404s).
const VERCEL_ANALYTICS = `<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>`;
// PostHog web analytics, same project as the app, through our managed proxy.
// cookieless_mode 'always': no cookies or storage; PostHog derives a daily visitor
// hash server-side, which needs the project's "cookieless server hash mode" on
// (events are dropped until it is). mask_all_text keeps calculator results out of
// autocaptured clicks. No session recording, no person profiles.
const POSTHOG_WEB = `<script>
!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="mu yu bu Su init Vu Gu zu Uu Ku il Wu Yu ju rh oh ah uh hh dh capture getExtension Zu pu gh calculateEventProperties ph register register_once register_for_session unregister unregister_for_session Hu mh getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync wh identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset kh shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty yh ih createPersonProfile setInternalOrTestUser bh xu Cu opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing th debug nl Os getPageViewId captureTraceFeedback captureTraceMetric Du".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('phc_B6cfSjHfowwLnGsM73hPhTeqm7MWep8Lgsxe6za9Zamj', {
  api_host: 'https://t.crspulse.com',
  ui_host: 'https://us.posthog.com',
  defaults: '2026-05-30',
  cookieless_mode: 'always',
  person_profiles: 'never',
  disable_session_recording: true,
  disable_surveys: true,
  mask_all_text: true,
});
</script>`;
// One line-icon set (24px grid, 1.75 stroke, currentColor) in place of emoji, which
// render differently on every OS and clash with the type.
const ICON_PATHS = {
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  trendDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  folder: '<path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  checklist: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 9l1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5H17M14.5 15.5H17"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.2"/>',
  award: '<circle cx="12" cy="9" r="5.5"/><path d="M9 13.8L8 21l4-2 4 2-1-7.2"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5M10 2.5h4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r=".9"/>',
  arrowUp: '<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8.5 7.5h7M8.5 11h5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
};
const icon = (name, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;

// Follows the OS setting until the visitor picks a theme with the toggle.
const THEME_INIT = `<script>(function(){var t;try{t=localStorage.getItem('crspulse-theme')}catch(e){}if(!t){t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})();</script>`;
const THEME_SCRIPT = `<script>
function toggleTheme(){var r=document.documentElement,n=r.getAttribute('data-theme')==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('crspulse-theme',n)}catch(e){}setThemeIcons(n)}
function setThemeIcons(t){var i=t==='dark'?${JSON.stringify(icon('sun', 17))}:${JSON.stringify(icon('moon', 16))};document.querySelectorAll('[data-theme-icon]').forEach(function(el){el.innerHTML=i})}
setThemeIcons(document.documentElement.getAttribute('data-theme')||'light');
document.addEventListener('click',function(e){document.querySelectorAll('details.menu[open]').forEach(function(m){if(!m.contains(e.target))m.removeAttribute('open')})});
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('details.menu[open]').forEach(function(m){m.removeAttribute('open');m.querySelector('summary').focus()})});
</script>`;

// Calendar for every date field. A page marks a hidden input with data-datepicker (optional
// data-min / data-max as YYYY-MM-DD or "today"); this swaps in a button showing the date and
// a month grid in the site's own style. The input keeps the ISO value and fires input/change
// like a native one, and assigning input.value from page code repaints the button.
const DATEPICKER_JS = `<script>
(function(){
  var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DOW=['Su','Mo','Tu','We','Th','Fr','Sa'];
  var CAL='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  var ARROW=function(d){ return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(d<0?'M15 5l-7 7 7 7':'M9 5l7 7-7 7')+'"/></svg>'; };
  var CARET='<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>';
  var desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  function pad(n){ return (n<10?'0':'')+n; }
  function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parse(s){ var m=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(s||''); return m?new Date(+m[1],m[2]-1,+m[3]):null; }
  function today(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function same(a,b){ return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
  function long(d){ return MONTHS[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear(); }
  var current=null;
  // While open the calendar lives in <body>: the cards around a field animate in, and an
  // animated ancestor traps its children in its own stacking layer (so the next card paints
  // over the calendar) and pins position:fixed to itself. On phones it is a bottom sheet;
  // elsewhere it is placed under the field, or above it when there is no room below.
  var sheet=window.matchMedia('(max-width:520px)');
  function place(c){
    if(!c||sheet.matches){ if(c){ c.pop.style.top=''; c.pop.style.left=''; } return; }
    var r=c.field.getBoundingClientRect(), b=document.body.getBoundingClientRect(), h=c.pop.offsetHeight, w=c.pop.offsetWidth;
    var below=r.bottom+8, top=(below+h>innerHeight-8&&r.top-8-h>8)?r.top-8-h:below;
    var left=Math.max(12,Math.min(r.left,document.documentElement.clientWidth-w-12));
    c.pop.style.top=(top-b.top)+'px'; c.pop.style.left=(left-b.left)+'px';
  }
  addEventListener('resize',function(){ place(current); });
  document.addEventListener('click',function(e){ var path=e.composedPath(); if(current&&path.indexOf(current.wrap)<0&&path.indexOf(current.pop)<0) current.close(false); });
  document.querySelectorAll('input[data-datepicker]').forEach(function(input){
    var bound=function(a){ var v=input.getAttribute(a); return v==='today'?today():parse(v); };
    var min=bound('data-min'), max=bound('data-max');
    var ok=function(d){ return (!min||d>=min)&&(!max||d<=max); };
    var wrap=document.createElement('div'); wrap.className='dp';
    input.parentNode.insertBefore(wrap,input); wrap.appendChild(input);
    var field=document.createElement('button'); field.type='button'; field.className='dp-field';
    field.setAttribute('style',input.getAttribute('style')||''); field.setAttribute('aria-haspopup','dialog'); field.setAttribute('aria-expanded','false');
    var pop=document.createElement('div'); pop.className='dp-pop'; pop.setAttribute('role','dialog'); pop.setAttribute('aria-label','Choose a date'); pop.hidden=true;
    wrap.appendChild(field); wrap.appendChild(pop);
    var view, focusDay, mode='days';
    var self={ wrap:wrap, pop:pop, field:field, close:close };
    function selected(){ return parse(desc.get.call(input)); }
    function paint(){ var d=selected(); field.innerHTML='<span class="'+(d?'':'dp-ph')+'">'+(d?long(d).replace(/^(\\w{3})\\w*/,'$1'):'Select a date')+'</span>'+CAL; }
    Object.defineProperty(input,'value',{ configurable:true, get:function(){ return desc.get.call(input); }, set:function(v){ desc.set.call(input,v); paint(); } });
    if(input.form) input.form.addEventListener('reset',function(){ setTimeout(paint); });
    function set(d){ desc.set.call(input,d?iso(d):''); paint(); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); }
    function clamp(d){ return min&&d<min?min:max&&d>max?max:d; }
    function open(){ if(current&&current!==self) current.close(false); var v=selected()||clamp(today()); focusDay=v; view=new Date(v.getFullYear(),v.getMonth(),1); mode='days'; render(); document.body.appendChild(pop); pop.hidden=false; field.setAttribute('aria-expanded','true'); current=self; place(self); focusGrid(); }
    function close(back){ if(pop.hidden) return; pop.hidden=true; if(pop.parentNode!==wrap) wrap.appendChild(pop); field.setAttribute('aria-expanded','false'); if(current===self) current=null; if(back) field.focus(); }
    function focusGrid(){ if(!pop.hidden) place(self); var b=pop.querySelector(mode==='days'?'.dp-day[tabindex="0"]':'.dp-mon[tabindex="0"]'); if(b) b.focus(); }
    function render(){
      var y=view.getFullYear(), m=view.getMonth(), sel=selected(), t=today(), h='';
      if(mode==='days'){
        h+='<div class="dp-head"><button type="button" class="dp-nav" data-go="-1" aria-label="Previous month">'+ARROW(-1)+'</button><button type="button" class="dp-title" data-mode aria-label="Choose month and year">'+MONTHS[m]+' '+y+CARET+'</button><button type="button" class="dp-nav" data-go="1" aria-label="Next month">'+ARROW(1)+'</button></div>';
        h+='<div class="dp-dow" aria-hidden="true">'+DOW.map(function(d){ return '<span>'+d+'</span>'; }).join('')+'</div><div class="dp-grid">';
        var first=new Date(y,m,1).getDay();
        for(var i=0;i<42;i++){
          var d=new Date(y,m,1-first+i);
          h+='<button type="button" class="dp-day'+(d.getMonth()!==m?' out':'')+(same(d,t)?' today':'')+(same(d,sel)?' sel':'')+'" data-d="'+iso(d)+'" tabindex="'+(same(d,focusDay)?0:-1)+'" aria-label="'+long(d)+(same(d,t)?', today':'')+'"'+(same(d,sel)?' aria-pressed="true"':'')+(ok(d)?'':' disabled')+'>'+d.getDate()+'</button>';
        }
        h+='</div>';
      } else {
        h+='<div class="dp-head"><button type="button" class="dp-nav" data-year="-1" aria-label="Previous year">'+ARROW(-1)+'</button><button type="button" class="dp-title" data-mode aria-label="Back to days">'+y+CARET+'</button><button type="button" class="dp-nav" data-year="1" aria-label="Next year">'+ARROW(1)+'</button></div><div class="dp-months">';
        for(var k=0;k<12;k++){
          var inRange=(!min||new Date(y,k+1,0)>=min)&&(!max||new Date(y,k,1)<=max);
          h+='<button type="button" class="dp-mon'+(sel&&sel.getFullYear()===y&&sel.getMonth()===k?' sel':'')+'" data-m="'+k+'" tabindex="'+(k===m?0:-1)+'"'+(inRange?'':' disabled')+'>'+MONTHS[k].slice(0,3)+'</button>';
        }
        h+='</div>';
      }
      h+='<div class="dp-foot"><button type="button" class="dp-link" data-today'+(ok(t)?'':' disabled')+'>Today</button><button type="button" class="dp-link" data-close>Done</button></div>';
      pop.innerHTML=h;
    }
    field.addEventListener('click',function(){ pop.hidden?open():close(true); });
    field.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'&&pop.hidden){ e.preventDefault(); open(); } });
    pop.addEventListener('click',function(e){
      var b=e.target.closest('button'); if(!b){ e.preventDefault(); return; }
      if(b.disabled) return;
      if(b.hasAttribute('data-go')){ view=new Date(view.getFullYear(),view.getMonth()+(+b.getAttribute('data-go')),1); focusDay=new Date(view); render(); return; }
      if(b.hasAttribute('data-year')){ view=new Date(view.getFullYear()+(+b.getAttribute('data-year')),view.getMonth(),1); render(); return; }
      if(b.hasAttribute('data-mode')){ mode=mode==='days'?'months':'days'; render(); focusGrid(); return; }
      if(b.hasAttribute('data-m')){ view=new Date(view.getFullYear(),+b.getAttribute('data-m'),1); focusDay=clamp(new Date(view)); mode='days'; render(); focusGrid(); return; }
      if(b.hasAttribute('data-d')){ set(parse(b.getAttribute('data-d'))); close(true); return; }
      if(b.hasAttribute('data-today')){ set(today()); close(true); return; }
      if(b.hasAttribute('data-close')) close(true);
    });
    pop.addEventListener('keydown',function(e){
      if(e.key==='Escape'){ e.preventDefault(); close(true); return; }
      if(mode!=='days'||!e.target.classList.contains('dp-day')) return;
      var d=parse(e.target.getAttribute('data-d')), n=null;
      switch(e.key){
        case 'ArrowLeft': n=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1); break;
        case 'ArrowRight': n=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1); break;
        case 'ArrowUp': n=new Date(d.getFullYear(),d.getMonth(),d.getDate()-7); break;
        case 'ArrowDown': n=new Date(d.getFullYear(),d.getMonth(),d.getDate()+7); break;
        case 'Home': n=new Date(d.getFullYear(),d.getMonth(),d.getDate()-d.getDay()); break;
        case 'End': n=new Date(d.getFullYear(),d.getMonth(),d.getDate()+6-d.getDay()); break;
        case 'PageUp': n=new Date(d.getFullYear()-(e.shiftKey?1:0),d.getMonth()-(e.shiftKey?0:1),d.getDate()); break;
        case 'PageDown': n=new Date(d.getFullYear()+(e.shiftKey?1:0),d.getMonth()+(e.shiftKey?0:1),d.getDate()); break;
      }
      if(!n) return;
      e.preventDefault(); focusDay=n; view=new Date(n.getFullYear(),n.getMonth(),1); render(); focusGrid();
    });
    paint();
  });
})();
</script>`;

// ------------------------------------------------------------------ chrome
// No decorative layer: the old drifting colour blobs and the skyline photo backdrop are
// gone. Hierarchy on this site comes from type, hairlines and alignment.
const CHECK = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>`;

// Calculator id -> its page. Also the targets for old /calculators#<id> links.
const CALC_ROUTES = { crs: '/crs-calculator', fsw: '/fsw-calculator', bc: '/bc-pnp-calculator', sinp: '/sinp-calculator' };
// The header's Calculators menu: [href, label, key, one-line description, tag].
const CALC_MENU = [
  [CALC_ROUTES.crs, 'CRS calculator', 'calc-crs', 'Express Entry ranking score', '/1,200'],
  [CALC_ROUTES.fsw, 'FSW 67-point grid', 'calc-fsw', 'Federal Skilled Worker eligibility', '/100'],
  [CALC_ROUTES.bc, 'BC PNP SIRS', 'calc-bc', 'British Columbia skills registration', '/200'],
  [CALC_ROUTES.sinp, 'Saskatchewan SINP', 'calc-sinp', 'Saskatchewan EOI points', '/110'],
];

// The header's Resources menu: [href, label, key, one-line description, icon].
const RESOURCES = [
  ['/guides', 'Guides', 'guides', 'How CRS works, CLB tables, draw types', 'book'],
  ['/analytics', 'Analytics', 'analytics', 'Cutoffs by category, and your score', 'trend'],
  ['/checklists', 'Document checklists', 'checklists', 'What to gather for each program', 'checklist'],
  ['/processing-times', 'Processing times', 'processing', 'IRCC wait times and your decision date', 'timer'],
  ['/timeline', 'Application timeline', 'timeline', 'Log milestones and the days between', 'clock'],
];

function nav(active, cta) {
  const links = [['/', 'Home', 'home']];
  const mid = [['/draws', 'Draws', 'draws']];
  const after = [['/features', 'Features', 'features']];
  const link = ([href, label, key], cls) =>
    `<a class="${cls}" href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  const chevron = `<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>`;
  // A plain list: name, muted one-liner, optional right-hand tag. No icon tiles.
  const dropdown = (id, label, current, items, tagged) => `<div class="navdrop"><button type="button" class="navlink navdrop-btn" aria-expanded="false" aria-controls="${id}"${current ? ' data-current' : ''}>${label}${chevron}</button>
      <div class="droppanel" id="${id}">${items.map(([href, name, key, desc, tag]) => `<a class="dropitem" href="${href}"${active === key ? ' aria-current="page"' : ''}><span class="dropname">${name}${tagged ? `<span class="droptag">${tag}</span>` : ''}</span><small>${desc}</small></a>`).join('')}</div></div>`;
  const calcDrop = dropdown('calc-menu', 'Calculators', String(active).startsWith('calc'), CALC_MENU, true);
  const resDrop = dropdown('res-menu', 'Resources', RESOURCES.some(([, , key]) => key === active), RESOURCES, false);
  // The practical CTA (run the calculator) on content pages, the App Store on the app pages.
  const ctaBtn = cta === 'app'
    ? `<a class="btn btn-accent headcta" href="${APP_STORE_URL}">${APPLE(15)}<span>Get the app</span></a>`
    : `<a class="btn btn-accent headcta" href="/crs-calculator">Calculate CRS</a>`;
  const latest = DRAWS[0];
  const live = `<a class="livechip" href="/draws" title="Latest Express Entry draw: round #${latest.no}, ${latest.label}, ${latest.date}"><span class="livedot" aria-hidden="true"></span><span>#${latest.no}</span><span class="livesep" aria-hidden="true"></span><span>CRS <b>${latest.cutoff}</b></span></a>`;
  const themeBtn = (cls) => `<button class="theme-btn ${cls}" type="button" onclick="toggleTheme()" data-theme-icon aria-label="Toggle dark mode">${icon('moon', 16)}</button>`;
  return `
<a class="skip" href="#content">Skip to content</a>
<header class="sitehead">
  <nav class="wrap headbar" aria-label="Main">
    <a class="brand" href="/" aria-label="CRS Pulse home">
      <img src="/img/logo-mark.png" width="32" height="32" alt="" class="brandmark">
      <span class="wordmark">CRS Pulse</span>
    </a>
    <div class="navlinks">${links.map((l) => link(l, 'navlink')).join('')}${calcDrop}${mid.map((l) => link(l, 'navlink')).join('')}${resDrop}${after.map((l) => link(l, 'navlink')).join('')}</div>
    <div class="headright">
      ${live}
      ${themeBtn('head-theme')}
      ${ctaBtn}
      <details class="menu">
        <summary aria-label="Open menu"><span class="burger" aria-hidden="true"><i></i><i></i></span></summary>
        <div class="menupanel">
          ${links.map((l) => link(l, 'menulink')).join('')}
          <div class="menuhead">Calculators</div>
          ${CALC_MENU.map(([href, label]) => link([href, label, ''], 'menulink')).join('')}
          <div class="menuhead"></div>
          ${mid.map((l) => link(l, 'menulink')).join('')}
          <div class="menuhead">Resources</div>
          ${RESOURCES.map((l) => link(l, 'menulink')).join('')}
          <div class="menuhead"></div>
          ${after.map((l) => link(l, 'menulink')).join('')}
          <a class="menulink" href="/#faq">FAQ</a>
          <div class="menufoot">${live}${themeBtn('menu-theme')}</div>
        </div>
      </details>
    </div>
  </nav>
</header>
<div id="content" tabindex="-1"></div>`;
}

const LEGAL_NOTE = 'CRS Pulse is an independent app. It is not affiliated with, endorsed by, or connected to IRCC or the Government of Canada. Scores, predictions and timelines are estimates for guidance only and are not immigration advice — verify with the official IRCC tools at canada.ca before you act on them.';

const footerSlim = (note) => `
<footer style="border-top:1px solid var(--border);background:var(--bg2)">
  <div class="wrap" style="padding:28px 24px;display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;align-items:center">
    <span style="font-family:'Satoshi',sans-serif;font-weight:900;font-size:16px;color:var(--text)">CRS Pulse</span>
    <p style="font-size:12.5px;line-height:1.6;color:var(--muted);max-width:640px">${note}</p>
    <a class="foot-link totop" href="#" style="font-size:12.5px">${icon('arrowUp', 15)}Back to top</a>
  </div>
</footer>`;

const footerFull = () => `
<footer style="border-top:1px solid var(--border);background:var(--bg2)">
  <div class="wrap" style="padding:44px 24px 26px">
    <div class="footgrid" style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:28px;margin-bottom:32px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <img src="/img/logo-mark.png" width="22" height="22" alt="" style="border-radius:6px;display:block">
          <span style="font-family:'Satoshi',sans-serif;font-weight:900;font-size:17px;color:var(--text)">CRS Pulse</span>
        </div>
        <p style="font-size:13.5px;line-height:1.6;color:var(--text2);max-width:260px">An Express Entry score calculator, IRCC draw tracker and application timeline for people applying for Canadian permanent residence.</p>
      </div>
      <div>
        <div class="klabel" style="color:var(--text);margin-bottom:12px">Product</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13.5px">
          <a class="foot-link" href="/crs-calculator">Calculators</a>
          <a class="foot-link" href="/draws">Draws &amp; trends</a>
          <a class="foot-link" href="/analytics">Draw analytics</a>
          <a class="foot-link" href="/checklists">Document checklists</a>
          <a class="foot-link" href="/processing-times">Processing times</a>
          <a class="foot-link" href="/timeline">Application timeline</a>
          <a class="foot-link" href="/features">Features</a>
          <a class="foot-link" href="/#faq">FAQ</a>
        </div>
      </div>
      <div>
        <div class="klabel" style="color:var(--text);margin-bottom:12px">Calculators</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13.5px">
          <a class="foot-link" href="/crs-calculator">CRS (Express Entry)</a>
          <a class="foot-link" href="/fsw-calculator">FSW 67-point grid</a>
          <a class="foot-link" href="/bc-pnp-calculator">BC PNP SIRS</a>
          <a class="foot-link" href="/sinp-calculator">Saskatchewan SINP</a>
        </div>
      </div>
      <div>
        <div class="klabel" style="color:var(--text);margin-bottom:12px">Guides</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13.5px">
          ${GUIDE_LINKS.map(([href, label]) => `<a class="foot-link" href="${href}">${label}</a>`).join('')}
        </div>
      </div>
      <div>
        <div class="klabel" style="color:var(--text);margin-bottom:12px">App &amp; legal</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13.5px">
          <a class="foot-link" href="/about">About</a>
          <a class="foot-link" href="${APP_STORE_URL}">iPhone app</a>
          <a class="foot-link" href="/privacy">Privacy policy</a>
          <a class="foot-link" href="/terms">Terms of use</a>
          <a class="foot-link" href="mailto:${CONTACT}">Contact</a>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid var(--hairline);padding-top:20px;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:baseline">
      <p style="font-size:12.5px;line-height:1.6;color:var(--muted);max-width:720px">${LEGAL_NOTE}</p>
      <span style="display:flex;align-items:center;gap:18px;font-size:12.5px;color:var(--muted)"><a class="foot-link totop" href="#">${icon('arrowUp', 15)}Back to top</a>© ${new Date().getFullYear()} CRS Pulse</span>
    </div>
  </div>
</footer>`;

function shell({ title, description, path, jsonld, noindex, body, head2 = '', scripts = '' }) {
  // `path` is set for the six real pages: it drives the canonical URL and the
  // rel=alternate pointer at the markdown twin agents can ask for. The 404 page
  // has no canonical home, so it passes neither and goes out noindex.
  const head = path
    ? `<link rel="canonical" href="${SITE}${path}">
<link rel="alternate" type="text/markdown" href="${SITE}${path === '/' ? '/index.md' : `${path}.md`}">`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}">
<meta name="theme-color" content="#EEF3FB">
<meta name="google-adsense-account" content="${ADSENSE_CLIENT}">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CRS Pulse">
<meta property="og:locale" content="en_CA">
${path ? `<meta property="og:url" content="${SITE}${path}">` : ''}
<meta property="og:image" content="${SITE}/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="CRS Pulse: Express Entry CRS calculator and IRCC draw tracker">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${SITE}/img/og.png">
${head}
${S5_HEAD}
${head2}
${[jsonld, path && path !== '/' ? crumbsJsonLd(path, title) : null].filter(Boolean).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
${THEME_INIT}
<script>addEventListener('DOMContentLoaded',function(){var b=document.body;function f(){b.classList.toggle('dg-scrolled',scrollY>30)}addEventListener('scroll',f,{passive:true});f();
var ds=[].slice.call(document.querySelectorAll('.navdrop'));function set(d,o){d.classList.toggle('open',o);d.querySelector('button').setAttribute('aria-expanded',o?'true':'false')}
ds.forEach(function(d){var k=d.querySelector('button');k.addEventListener('click',function(e){e.stopPropagation();var o=!d.classList.contains('open');ds.forEach(function(x){set(x,false)});set(d,o)})});
document.addEventListener('click',function(e){ds.forEach(function(d){if(!d.contains(e.target))set(d,false)})});document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;ds.forEach(function(d){if(d.classList.contains('open')){set(d,false);d.querySelector('button').focus()}})})});</script>
${VERCEL_ANALYTICS}
${POSTHOG_WEB}

<style>${CSS}</style>
</head>
<body>
${body}
${body.includes('data-datepicker') ? DATEPICKER_JS : ''}
${THEME_SCRIPT}
${S5_MOTION}
${scripts}
</body>
</html>
`;
}

// ------------------------------------------------------------------ shared content data
const FEATURES_SMALL = [
  ['trend', 'Trends and analytics', 'Cutoff averages, draw cadence, and where your score sits against recent rounds.'],
  ['bell', 'Draw alerts', 'A push notification when IRCC publishes a new round, usually within about 15 minutes.'],
  ['folder', 'Application tracker', 'Processing-time estimates for the program and category you applied under.'],
  ['checklist', 'Document checklists', 'The IRCC checklist for your program, with per-item progress.'],
  ['clock', 'Application timeline', 'Log ITA, AOR, biometrics, medical, passport request and your own milestones.'],
  ['lock', 'On-device by default', 'No account. Your profile, timeline and checklists stay on your phone.'],
];
const CALC_CARDS = [
  ['calc', '1,200', 'CRS score', 'Comprehensive Ranking System — the official Express Entry formula.'],
  ['checkCircle', '100 · 67', 'FSW 67-point', 'Federal Skilled Worker six selection factors grid.'],
  ['compass', '200', 'BC PNP SIRS', 'Skills Immigration Registration System, 200-point scale.'],
  ['pin', '110 · 60', 'Saskatchewan SINP', 'International Skilled Worker EOI points assessment.'],
];
// IRCC publishes a free-text drawName; these give each one a short chip label and a
// colour. The long label rendered next to a draw is always IRCC's own (cleaned) name,
// so an unrecognised category is never mislabelled — it just falls back to "Other".
const DRAW_CATEGORIES = [
  [/provincial nominee/i, 'PNP', '#7C5BD0'],
  [/canadian experience/i, 'CEC', '#0E8A63'],
  [/french/i, 'French', '#D3342B'],
  [/health|social service|physician|nurs/i, 'Healthcare', '#2E6FD4'],
  [/stem|science|technolog|engineer|math/i, 'STEM', '#4A8ADB'],
  [/transport/i, 'Transport', '#C07A0A'],
  [/senior manager|executive/i, 'Managers', '#C24E87'],
  [/military|armed forces/i, 'Military', '#6B7A8D'],
  [/trade/i, 'Trades', '#B07310'],
  [/education|teacher/i, 'Education', '#1F8AA8'],
  [/agri/i, 'Agriculture', '#1B8F63'],
  [/federal skilled worker|no program specified|general/i, 'General', '#5B7392'],
];
const categorise = (name) =>
  DRAW_CATEGORIES.find(([re]) => re.test(name))?.slice(1) ?? ['Other', '#5B7392'];

const num = (n) => Number(n).toLocaleString('en-CA');
const shortDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const longDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const DRAWS = FEED.rounds.map((r) => {
  const [cat, dot] = categorise(r.label || r.name);
  return { no: r.number, date: shortDate(r.date), iso: r.date, label: r.label || r.name, cat, dot, invited: num(r.size), cutoff: String(r.crs), crs: r.crs, size: r.size };
});
const HOME_DRAWS = DRAWS.slice(0, 6).map((d) => [d.no, d.date, d.label, d.invited, d.cutoff, d.dot]);
// The general-stream benchmark a raw CRS score is actually comparable against. PNP rounds
// cut off above 700 because a nomination adds 600 points, and category rounds are scoped
// to an occupation — neither is a fair yardstick, so neither is used as one.
const BENCHMARK = DRAWS.find((d) => ['CEC', 'General'].includes(d.cat)) ?? DRAWS[0];
const PRIVACY_POINTS = [
  'Your CRS inputs, timeline and checklists are stored on your device, not on our servers.',
  'There is no account and no sign-up — there is nothing to log in to.',
  'The calculators on this website run entirely in your browser; nothing you enter is uploaded.',
  'Draw alerts register an anonymous push token only, never your immigration details.',
];
const FAQ = [
  ['What is a CRS score?', 'The Comprehensive Ranking System score is the number IRCC uses to rank candidates in the Express Entry pool, out of 1,200. Every round of invitations has a cutoff; candidates at or above it are invited to apply for permanent residence.'],
  ['How is my CRS score calculated?', 'From core human capital (age, education, official-language ability and Canadian work experience), spouse factors, skill transferability, and additional points such as a provincial nomination (+600), Canadian study, French ability or a sibling in Canada. CRS Pulse implements that published grid, along with the FSW 67-point, BC PNP SIRS and Saskatchewan SINP grids. IRCC’s own tool is authoritative, so confirm your final score there before you act on it.'],
  ['Does CRS Pulse use official IRCC draw data?', 'Yes. The app reads rounds of invitations from IRCC’s public JSON feed, and each draw links to its official IRCC round page. This website mirrors the same feed and refreshes when the site is rebuilt; the app is always live.'],
  ['Can I track my Express Entry application?', 'Yes, in the iPhone app. Log milestones such as ITA, AOR, biometrics, medical and passport request on a timeline, work through the document checklist for your program, and see an estimated decision window based on IRCC’s published processing times. The tracker is in the app, not on this website.'],
  ['Is CRS Pulse free?', 'Yes. Every calculator, live draws, draw history, analytics and the application tracker are free, with no account. The app is supported by small banner ads — there are no in-app purchases and no subscriptions.'],
  ['What happens to my personal data?', 'Your age, education, language scores and work history are stored only on your device. There is no account to create. The app sends anonymous usage analytics (which screens are used, never your scores or profile). If you enable draw alerts, only an anonymous push token is stored on the notification service — never your immigration data. The app does show Google AdMob banner ads, which use a device advertising identifier; on iPhone it asks permission first, and declining still leaves the app fully usable.'],
  ['How do draw alerts work?', 'A background service checks for new rounds every 15 minutes. When IRCC publishes a draw, you get a push notification — usually within about 15 minutes — with the category, cutoff score and number of invitations. You can turn alerts on or off any time.'],
  ['What is a category-based draw?', 'Instead of inviting the highest overall CRS scores, IRCC can invite candidates who meet a specific priority — such as French-language ability or work in healthcare, trades or STEM. These rounds often cut off well below a general round, so targeting a category can matter more than raising a raw score.'],
  ['Do I need a job offer for Express Entry?', 'No. A valid job offer is not required for any of the three Express Entry programs. Since March 25, 2025, job offers no longer add CRS points, though they can still support certain category-based draws. Most invited candidates have no Canadian job offer.'],
];

const eyebrow = (t) => `<div class="eyebrow">${t}</div>`;
// Inner-page hero in the home page's language: one heavy headline with the accent
// phrase in red, one short lede, words rising in on load.
const pageHero = (lead, accent, lede) => `
<div class="dg-hero dg-sm">${MAPLE}<section class="wrap s5-pagehero">
  <h1 class="split">${lead} <em>${accent}</em></h1>
  <p data-r="420">${lede}</p>
</section></div>`;
const MAPLE = `<svg class="dg-leaf" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 16l-38 72c-4 8-12 7-20 3l-28-14 18 96c4 18-8 18-14 10l-40-46-7 23c-1 4-6 7-10 6l-51-11 13 49c3 11 5 15-3 18l-19 8 88 71c4 3 6 8 4 13l-8 25c31-4 58-9 89-12 3 0 7 3 7 6l-4 99h18l-4-99c0-3 4-6 7-6 31 3 58 8 89 12l-8-25c-2-5 0-10 4-13l88-71-19-8c-8-3-6-7-3-18l13-49-51 11c-4 1-9-2-10-6l-7-23-40 46c-6 8-18 8-14-10l18-96-28 14c-8 4-16 5-20-3z"/></svg>`;
const s5End = (title = 'Check your CRS score tonight.') => `
<div class="wrap"><section class="s5-end" data-r="0"><h2>${title}</h2><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="s5-btn s5-white" href="${APP_STORE_URL}">${APPLE(18)} App Store</a><a class="s5-btn" style="background:rgba(255,255,255,.14);color:#fff" href="/crs-calculator">Calculators</a></div></section></div>`;

// ------------------------------------------------------------------ home components
// Real captures of the shipping iOS build in a CSS-drawn frame. Every screenshot on this
// site is the actual app — no stock device photography, no invented UI.
const SHOTS = {
  home: ['/img/app-home.webp', 'The CRS Pulse home screen: a CRS score of 525 and a Canadian Experience Class application submitted May 5, 2026, with its final decision on August 25 and COPR on October 1'],
  draws: ['/img/app-draws.webp', 'The draws screen: rounds #446 (CEC, 518), #445 (PNP, 725) and #444 (Senior managers, 389) with cutoff and invitations'],
  analytics: ['/img/app-analytics.webp', 'The analytics screen: moderate odds for the Canadian Experience Class, a score of 525 against a trend cutoff near 519'],
  timeline: ['/img/app-timeline.webp', 'The application timeline, from biometrics in May to Portal 2 and eCOPR received on October 1, 2026'],
}
// An iPhone Pro drawn in CSS: titanium band, side buttons, black bezel, Dynamic Island
// and a 9:41 status bar. The screenshots are cropped below the status bar, so the drawn
// bar is what gives the screen a true iPhone aspect (~1:2.17). Everything inside is sized
// in cqw, so one frame scales to any width.
const STATUS_ICONS = `<svg viewBox="0 0 68 12" aria-hidden="true"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="4.5" y="6" width="3" height="6" rx="1"/><rect x="9" y="3.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="1" width="3" height="11" rx="1"/><path d="M29 2.6a10 10 0 0 1 7 2.8l1.2-1.3A11.8 11.8 0 0 0 29 .8a11.8 11.8 0 0 0-8.2 3.3L22 5.4a10 10 0 0 1 7-2.8zm0 3.5a6.5 6.5 0 0 1 4.5 1.8l1.2-1.3A8.3 8.3 0 0 0 29 4.3a8.3 8.3 0 0 0-5.7 2.3l1.2 1.3A6.5 6.5 0 0 1 29 6.1zm0 3.4a3 3 0 0 1 2 .8L29 12.4 27 10.3a3 3 0 0 1 2-.8z"/><rect x="42" y="1" width="22" height="10.5" rx="3.2" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1"/><rect x="43.8" y="2.8" width="16.4" height="6.9" rx="1.8"/><path d="M65.3 4.3v3.9a2 2 0 0 0 0-3.9z" fill-opacity=".45"/></g></svg>`;
const phone = (key, w = 280) => {
  const [src, alt] = SHOTS[key];
  return `<div class="iphone" style="width:${w}px">
  <span class="ib ib-action" aria-hidden="true"></span><span class="ib ib-volup" aria-hidden="true"></span><span class="ib ib-voldn" aria-hidden="true"></span><span class="ib ib-side" aria-hidden="true"></span>
  <div class="ibezel"><div class="iscreen">
    <div class="istatus" aria-hidden="true"><span class="itime">9:41</span><span class="iisland"></span><span class="iicons">${STATUS_ICONS}</span></div>
    <img src="${src}" alt="${alt}" width="520" height="1047" loading="lazy" decoding="async">
  </div></div>
</div>`;
};

const catDot = (color, size = 9) =>
  `<span aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>`;

// One stat cell. Every figure on the page goes through this so labels, numbers and
// captions share one vertical rhythm.
const cell = (label, value, caption, tone, size = 34) => `
<div>
  <div class="klabel">${label}</div>
  <div class="num" style="font-size:${size}px;line-height:1.15;margin:6px 0 3px;color:${tone || 'var(--text)'}">${value}</div>
  <div style="font-size:13px;line-height:1.45;color:var(--text2)">${caption}</div>
</div>`;


// An alternating text/screenshot row — the spine of the page.
const featureRow = ({ tag, title, body, points, shot, flip, extra }) => `
<div class="frow${flip ? ' flip' : ''}" data-reveal>
  <div class="ftext">
    ${eyebrow(tag)}
    <h2 class="h2">${title}</h2>
    <p class="lede">${body}</p>
    <ul class="ticks">${points.map((t) => `<li>${CHECK}<span>${t}</span></li>`).join('')}</ul>
    ${extra || ''}
  </div>
  <div class="fshot">${shot}</div>
</div>`;

// Live figures from the IRCC mirror, refreshed on every rebuild, rather than static
// facts about the product. The alert latency is the one constant.
const STATS = [
  [String(DRAWS[0].crs), `cutoff in draw #${DRAWS[0].no} (${DRAWS[0].cat})`],
  [num(FEED.ytd.invitations), `invitations in ${FEED.ytd.year} across ${FEED.ytd.rounds} rounds`],
  [num(FEED.poolTotal), `profiles in the pool${FEED.distributionAsOf ? ` (${FEED.distributionAsOf.replace(/, \d{4}$/, '')})` : ''}`],
  ['~15 min', 'from an IRCC draw to your push alert'],
];
const statBar = () => `
<div class="statbar">
  ${STATS.map(([n, l]) => `<div><div class="num" style="font-size:30px;line-height:1.1">${n}</div><div style="font-size:13.5px;color:var(--text2);margin-top:4px">${l}</div></div>`).join('')}
</div>`;

// A field as the calculator draws it. Inert on purpose: these are divs, not inputs, so
// the preview cannot be mistaken for a form that works here — the block links through.
const pvField = (label, value) => `
<div style="display:flex;flex-direction:column;gap:6px">
  <span style="font-size:12.5px;font-weight:600;color:var(--text2)">${label}</span>
  <span style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--input);font-size:14px;font-weight:500;color:var(--text)">
    ${value}<span aria-hidden="true" style="color:var(--muted);font-size:10px">▾</span>
  </span>
</div>`;

const pvRow = ({ label, val, max }) => `
<div>
  <div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:5px">
    <span style="color:var(--text2)">${label}</span>
    <span style="color:var(--text)"><span class="num">${val}</span> <span style="color:var(--muted);font-weight:500">/ ${max}</span></span>
  </div>
  <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${max ? Math.round((val / max) * 100) : 0}%;background:var(--accent);border-radius:3px"></div></div>
</div>`;

function calculatorPreview(sample) {
  const strong = sample.total >= 520;
  const near = sample.total >= 470;
  const badge = strong ? 'Competitive' : near ? 'In range' : 'Build it up';
  const tone = strong ? 'var(--success)' : near ? 'var(--warningInk)' : 'var(--text2)';
  const soft = strong ? 'var(--successSoft)' : near ? 'var(--warningSoft)' : 'var(--bg3)';
  return `
<a class="card card-lift lift" href="/crs-calculator" style="display:block;color:var(--text);overflow:hidden">
  <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;padding:12px 18px;background:var(--bg2);border-bottom:1px solid var(--hairline)">
    <span style="font-size:13px;font-weight:600">CRS: Express Entry score</span>
    <span class="klabel">Runs in your browser</span>
  </div>
  <div class="split calcpv" style="display:grid;grid-template-columns:1fr 260px">
    <div class="pvfields" style="padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:13px;align-content:start">
      ${pvField('Marital status', 'Single / not married')}
      ${pvField('Age', '29')}
      ${pvField('Education level', 'Master’s / professional')}
      ${pvField('Canadian work experience', '3 years')}
      ${pvField('First language (CLB, all four)', 'CLB 9')}
      ${pvField('Foreign work experience', '1–2 years')}
    </div>
    <div class="pvscore" style="padding:18px;border-left:1px solid var(--hairline);background:var(--bg2)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
        <span class="klabel">Your score</span>
        <span style="background:${soft};color:${tone};border-radius:6px;padding:3px 9px;font-size:11.5px;font-weight:700">${badge}</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:14px">
        <span class="num" style="font-size:46px;line-height:1">${sample.total}</span>
        <span style="font-size:14px;color:var(--muted);font-weight:600">/ 1,200</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">${sample.rows.map(pvRow).join('')}</div>
    </div>
  </div>
</a>`;
}

const MILESTONES = ['Profile', 'ITA', 'AOR', 'Biometrics', 'Medical', 'Background', 'Final decision'];
const milestoneRail = () => `
<ol class="rail" style="margin:0;padding:0">
  ${MILESTONES.map((m, i) => `<li${i === MILESTONES.length - 1 ? ' data-end' : ''}><span style="font-size:13.5px;font-weight:600;color:var(--text)">${m}</span></li>`).join('')}
</ol>`;

// ------------------------------------------------------------------ HOME
// ------------------------------------------------------------------ HOME (template 5)
// The home page copy follows the design skill's no-dash rule; shared copy (FAQ etc.)
// keeps its dashes elsewhere, so they are softened only where the home renders it.
const noDashes = (s) => s.replace(/\s—\s/g, ', ').replace(/—/g, ', ').replace(/(\d)\s?–\s?(\d)/g, '$1-$2');
// Satoshi (ITF Free Font License) is self-hosted from assets/fonts. Fontshare's
// stylesheet was render-blocking and cost two extra origins before first paint
// (~0.8–2 s on mobile Lighthouse). All three weights are preloaded: 900 sets the
// above-the-fold headlines, and swapping it in late reflowed the section under them
// (desktop CLS 0.21–0.27 on /draws, /analytics, /checklists, /features).
const S5_HEAD = `${[500, 700, 900].map((w) => `<link rel="preload" href="/fonts/satoshi-${w}.woff2" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="preconnect" href="https://t.crspulse.com" crossorigin>
<script>document.documentElement.classList.add('js')</script>
<style>
${[500, 700, 900].map((w) => `@font-face{font-family:'Satoshi';src:url('/fonts/satoshi-${w}.woff2') format('woff2');font-weight:${w};font-style:normal;font-display:swap}`).join('\n')}
.s5{ font-family:'Satoshi',-apple-system,system-ui,sans-serif; font-size:17px; line-height:1.6; }
.s5 h1, .s5 h2, .s5 h3{ font-family:'Satoshi',sans-serif; font-weight:900; letter-spacing:-.035em; }
.s5 .wrap{ max-width:1080px; padding:0 24px; }
.s5-btn{ display:inline-flex; align-items:center; gap:10px; height:52px; padding:0 24px; border-radius:14px; font-weight:700; font-size:16px; transition:transform .25s cubic-bezier(.16,1,.3,1), background .2s ease; }
.s5-btn:hover{ transform:translateY(-2px); } .s5-btn:active{ transform:translateY(1px) scale(.98); }
.s5-red{ background:var(--accentBtn); color:#fff!important; box-shadow:0 14px 30px -14px rgba(201,42,34,.7); } .s5-red:hover{ background:var(--accent); }
.s5-soft{ background:var(--bg3); color:var(--text)!important; } .s5-white{ background:#fff; color:#C92A22!important; }
.s5-hero{ display:grid; grid-template-columns:1.1fr .9fr; gap:40px; align-items:center; min-height:calc(100dvh - 64px); padding:24px 0 40px; }
.s5-hero h1{ font-size:clamp(46px,5.6vw,80px); line-height:1.02; } .s5-hero h1 em{ font-style:normal; color:var(--accentInk); }
.s5-sub{ font-size:20px; color:var(--text2); margin:26px 0 36px; max-width:40ch; }
.s5-stage{ position:relative; display:flex; justify-content:center; }
.s5-stage::before{ content:""; position:absolute; width:min(520px,90vw); aspect-ratio:1; border-radius:50%; top:50%; left:50%; translate:-50% -50%; background:radial-gradient(closest-side, var(--accentSoft), transparent); }
.js .s5-stage .iphone{ opacity:0; transform:translateY(60px) rotate(6deg); transition:opacity 1.2s cubic-bezier(.16,1,.3,1) .35s, transform 1.4s cubic-bezier(.16,1,.3,1) .35s; }
.js .s5-stage.in .iphone{ opacity:1; transform:rotate(-3deg); }
.s5-live{ display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
.s5-live > div{ padding:30px 26px; } .s5-live > div + div{ border-left:1px solid var(--border); }
.s5-live b{ display:block; font-size:44px; font-weight:900; letter-spacing:-.04em; line-height:1.05; font-variant-numeric:tabular-nums; color:var(--text); }
.s5-live span{ color:var(--text2); font-size:14.5px; }
.s5-trust{ display:flex; justify-content:center; gap:34px; flex-wrap:wrap; padding:22px 0; color:var(--text2); font-size:15px; } .s5-trust span{ display:inline-flex; gap:7px; align-items:center; } .s5-trust span > span{ margin:0; }
.s5-story{ display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:80px; padding:110px 0 40px; }
.s5-chap{ min-height:78vh; display:flex; flex-direction:column; justify-content:center; max-width:520px; }
.s5-ic{ width:52px; height:52px; border-radius:16px; background:var(--accentSoft); color:var(--accentInk); display:grid; place-items:center; margin-bottom:24px; }
.s5-chap h2{ font-size:clamp(34px,3.6vw,52px); line-height:1.02; margin-bottom:16px; }
.s5-chap p{ color:var(--text2); font-size:18px; }
.s5-chap ul{ list-style:none; padding:0; margin:26px 0 0; display:grid; gap:12px; } .s5-chap li{ display:flex; gap:12px; color:var(--text); }
.s5-pin{ position:sticky; top:calc(50vh - 330px); height:680px; display:flex; align-items:center; justify-content:center; }
.s5-pin .iscreen img{ transition:opacity .6s ease; } .s5-pin .iscreen img + img{ position:absolute; left:0; right:0; bottom:0; top:16.3cqw; }
.s5-pin .iscreen img:not(.on){ opacity:0; }
.s5-mphone{ display:none; }
.s5-marquee{ overflow:hidden; border-block:1px solid var(--border); padding:22px 0; margin-top:60px; }
.s5-track{ display:flex; gap:56px; width:max-content; }
@media (prefers-reduced-motion: no-preference){ .s5-track{ animation:s5mq 60s linear infinite; } .s5-marquee:hover .s5-track{ animation-play-state:paused; } }
.s5-d{ display:flex; align-items:baseline; gap:12px; white-space:nowrap; } .s5-d b{ font-size:32px; font-weight:900; letter-spacing:-.03em; color:var(--text); } .s5-d span{ color:var(--text2); font-size:15px; }
@keyframes s5mq{ to{ transform:translateX(-50%); } }
.s5-calcs{ padding:120px 0 40px; } .s5-calcs h2{ font-size:clamp(34px,4vw,56px); line-height:1; max-width:15ch; }
.s5-snap{ display:grid; grid-auto-flow:column; grid-auto-columns:minmax(260px,1fr); gap:18px; overflow-x:auto; scroll-snap-type:x mandatory; padding:34px 0 10px; scrollbar-width:none; }
/* the four grids: one row on desktop, 2x2 on tablets, a swipeable row with a peek on phones */
@media (min-width:1000px){ .s5-snap{ grid-auto-flow:row; grid-template-columns:repeat(4,minmax(0,1fr)); overflow:visible; } }
@media (min-width:640px) and (max-width:999px){ .s5-snap{ grid-auto-flow:row; grid-template-columns:repeat(2,minmax(0,1fr)); overflow:visible; } }
.s5-snap a{ scroll-snap-align:start; border-radius:24px; padding:28px; background:var(--bg2); border:1px solid var(--hairline); min-height:280px; display:flex; flex-direction:column; gap:10px; color:var(--text); transition:transform .35s cubic-bezier(.16,1,.3,1), border-color .2s ease; }
.s5-snap a:hover{ transform:translateY(-6px); border-color:var(--accentInk); color:var(--text); }
.s5-snap a:first-child{ background:var(--accentBtn); color:#fff; border:0; } .s5-snap a:first-child p{ color:rgba(255,255,255,.85); }
.s5-max{ font-size:72px; font-weight:900; letter-spacing:-.05em; line-height:1; margin-top:auto; }
.s5-snap p{ color:var(--text2); font-size:15px; }
.s5-priv{ padding:140px 0; }
.s5-big{ font-family:'Satoshi',sans-serif; font-size:clamp(34px,4.6vw,66px); font-weight:900; letter-spacing:-.035em; line-height:1.06; max-width:20ch; }
.s5-big .wd{ color:var(--border); transition:color .3s ease; } .s5-big .wd.lit{ color:var(--text); } .s5-big .wd.lit.red{ color:var(--accentInk); }
.s5-pts{ display:grid; grid-template-columns:1fr 1fr; gap:18px 48px; margin-top:56px; max-width:900px; } .s5-pts p{ display:flex; gap:12px; color:var(--text2); }
.s5-faq{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; padding:20px 0 120px; scroll-margin-top:80px; }
.s5-faq h2{ grid-column:1/-1; font-size:clamp(34px,4vw,56px); margin-bottom:20px; }
.s5-faq details{ border-radius:20px; background:var(--bg2); padding:20px 24px; align-self:start; } .s5-faq summary{ cursor:pointer; list-style:none; font-weight:700; font-size:17px; display:flex; justify-content:space-between; gap:16px; color:var(--text); }
.s5-faq summary::-webkit-details-marker{ display:none; }
.s5-faq summary::after{ content:"+"; color:var(--accentInk); font-size:22px; line-height:1; transition:transform .3s ease; } .s5-faq details[open] summary::after{ transform:rotate(45deg); }
.s5-faq details p{ color:var(--text2); font-size:15.5px; margin-top:12px; }
.s5-end{ border-radius:36px; background:var(--accentBtn); color:#fff; padding:80px 48px; display:grid; grid-template-columns:1fr auto; gap:40px; align-items:end; margin-bottom:90px; }
.s5-end h2{ font-size:clamp(40px,5vw,72px); line-height:.98; max-width:12ch; color:#fff; }
/* inner pages */
.wrap.s5-pagehero{ padding-top:72px; padding-bottom:40px; }
@media (max-width:640px){ .wrap.s5-pagehero{ padding-top:44px; padding-bottom:28px; } }
.s5-pagehero h1{ font-size:clamp(42px,5.6vw,78px); line-height:1.02; max-width:16ch; }
.s5-pagehero h1 em{ font-style:normal; color:var(--accentInk); }
.s5-pagehero p{ font-size:19px; line-height:1.6; color:var(--text2); max-width:58ch; margin-top:22px; }
.s5-end{ margin-top:60px; }
/* dot grid: a field of dots behind the top of every page, the header clear over it
   until you scroll, a maple leaf behind each hero, and the dots returning on the home
   page's privacy band and FAQ and on every red card. Drawn in theme tokens. */
html, body{ overflow-x:clip; }
body::before{ content:""; position:absolute; z-index:-1; top:0; left:0; right:0; height:min(900px,110vh); pointer-events:none;
  background:radial-gradient(var(--border) 1.2px, transparent 1.2px) 0 0/22px 22px;
  -webkit-mask-image:radial-gradient(75% 70% at 70% 30%, #000 20%, transparent 75%); mask-image:radial-gradient(75% 70% at 70% 30%, #000 20%, transparent 75%); }
html{ background:var(--bg); } body{ background:var(--heroTint) no-repeat; background-size:100% min(900px,110vh); position:relative; isolation:isolate; }
.sitehead{ transition:background .25s ease, border-color .25s ease; }
body:not(.dg-scrolled) .sitehead{ background:transparent; border-bottom-color:transparent; backdrop-filter:none; -webkit-backdrop-filter:none; }
.dg-hero{ position:relative; isolation:isolate; }
.dg-leaf{ position:absolute; z-index:-1; right:-6%; top:50%; translate:0 -50%; width:min(820px,80vw); color:var(--accent); opacity:.07; pointer-events:none; }
.dg-sm .dg-leaf{ width:min(460px,60vw); right:2%; top:55%; }
.s5-priv, .s5-faq{ position:relative; isolation:isolate; }
.s5-priv::before, .s5-faq::before{ content:""; position:absolute; z-index:-1; top:0; bottom:0; left:50%; width:100vw; translate:-50% 0; pointer-events:none; background:radial-gradient(var(--border) 1.2px, transparent 1.2px) 0 0/22px 22px; }
.s5-priv::before{ -webkit-mask-image:radial-gradient(60% 55% at 30% 50%, #000 15%, transparent 75%); mask-image:radial-gradient(60% 55% at 30% 50%, #000 15%, transparent 75%); }
.s5-faq::before{ -webkit-mask-image:radial-gradient(50% 50% at 85% 20%, #000, transparent 70%); mask-image:radial-gradient(50% 50% at 85% 20%, #000, transparent 70%); }
.s5-end, .s5-snap a:first-child{ position:relative; isolation:isolate; overflow:hidden; }
.s5-end::before, .s5-snap a:first-child::before{ content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; background:radial-gradient(rgba(255,255,255,.35) 1.2px, transparent 1.2px) 0 0/22px 22px; -webkit-mask-image:linear-gradient(120deg, transparent 30%, #000); mask-image:linear-gradient(120deg, transparent 30%, #000); }
@media (max-width:960px){ .dg-leaf{ width:120vw; right:-40%; top:68%; } .dg-sm .dg-leaf{ width:80vw; right:-25%; top:60%; } }
/* header Resources menu */
.navdrop{ position:relative; display:flex; align-items:stretch; }
.navdrop-btn{ gap:5px; background:none; border:0; cursor:pointer; font-family:inherit; }
.navdrop-btn svg{ transition:transform .2s ease; }
.navdrop-btn[data-current]{ color:var(--text); font-weight:600; }
.navdrop-btn[data-current]::after{ content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px; border-radius:2px 2px 0 0; background:var(--accent); }
.droppanel{ position:absolute; top:100%; left:-6px; width:300px; padding:6px; border-radius:12px; border:1px solid var(--border); background:var(--card); box-shadow:0 12px 32px -12px rgba(13,23,38,.28); display:flex; flex-direction:column; opacity:0; visibility:hidden; translate:0 4px; transition:opacity .12s ease, translate .12s ease, visibility .12s; z-index:60; }
.navdrop:hover .droppanel, .navdrop:has(:focus-visible) .droppanel, .navdrop.open .droppanel{ opacity:1; visibility:visible; translate:0 0; }
.navdrop:hover .navdrop-btn svg, .navdrop.open .navdrop-btn svg{ transform:rotate(180deg); }
.dropitem{ display:block; padding:10px 12px; border-radius:8px; color:var(--text); position:relative; }
.dropitem + .dropitem::before{ content:""; position:absolute; left:12px; right:12px; top:0; border-top:1px solid var(--hairline); }
.dropitem:hover, .dropitem:focus-visible{ background:var(--bg2); color:var(--text); }
.dropitem:hover::before, .dropitem:hover + .dropitem::before{ border-color:transparent; }
.dropitem[aria-current] .dropname{ color:var(--accentInk); }
.dropname{ display:flex; justify-content:space-between; align-items:baseline; gap:12px; font-size:14.5px; font-weight:600; }
.droptag{ font-size:12px; font-weight:600; color:var(--muted); font-variant-numeric:tabular-nums; }
.dropitem small{ display:block; font-size:12.5px; color:var(--text2); line-height:1.4; margin-top:1px; }
.menuhead{ padding:12px 12px 4px; font-size:11px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
.menuhead:empty{ padding:4px 0 0; margin:4px 0; border-top:1px solid var(--hairline); }
/* resources pages */
.res-table{ width:100%; border-collapse:collapse; font-size:14px; min-width:520px; }
.res-table th{ text-align:left; padding:12px 16px; color:var(--muted); font-size:11.5px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; border-bottom:1px solid var(--border); }
.res-table td{ padding:13px 16px; border-bottom:1px solid var(--hairline); color:var(--text2); font-variant-numeric:tabular-nums; }
.res-table tr:last-child td{ border-bottom:0; } .res-table td b{ color:var(--text); }
.res-table th:first-child, .res-table td:first-child{ padding-left:24px; }
.pt-row{ display:grid; grid-template-columns:minmax(0,1.4fr) minmax(80px,1fr) 110px; gap:18px; align-items:center; padding:13px 24px; border-top:1px solid var(--hairline); }
.pt-bar{ height:8px; background:var(--bg3); border-radius:5px; overflow:hidden; } .pt-bar > div{ height:100%; border-radius:5px; background:linear-gradient(90deg,var(--accent2),var(--accent)); }
.pt-m{ text-align:right; font-weight:900; color:var(--text); font-variant-numeric:tabular-nums; }
.pt-prog{ height:10px; background:var(--bg3); border-radius:6px; overflow:hidden; } .pt-prog > div{ height:100%; background:var(--accent); border-radius:6px; transition:width .4s ease; }
.pt-res{ display:grid; grid-template-columns:auto minmax(0,1fr); gap:28px; align-items:end; padding:20px; border-radius:16px; background:var(--bg2); }
.pt-big{ font-size:clamp(26px,3vw,34px); font-weight:900; letter-spacing:-.03em; color:var(--text); margin:4px 0; }
.pt-stages{ list-style:none; padding:0; margin:16px 0 0; display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
.pt-stages li{ padding:14px; border-radius:12px; border:1px solid var(--border); display:flex; flex-direction:column; gap:3px; font-size:13px; color:var(--text2); }
.pt-stages li b{ color:var(--text); font-size:14px; } .pt-stages li.done{ border-color:var(--success); background:var(--successSoft); }
.ck-tabs .filterchip{ white-space:nowrap; flex-shrink:0; }
.ck-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
.ck-item{ display:flex; gap:12px; align-items:flex-start; padding:10px 0; border-top:1px solid var(--hairline); cursor:pointer; }
.ck-item:first-of-type{ border-top:0; }
.ck-item input{ width:20px; height:20px; margin:2px 0 0; accent-color:var(--accentBtn); flex-shrink:0; cursor:pointer; }
.ck-item b{ display:block; font-weight:600; color:var(--text); font-size:15px; } .ck-item small{ display:block; color:var(--muted); font-size:13px; margin-top:2px; }
.ck-item:has(input:checked) b{ color:var(--text2); text-decoration:line-through; text-decoration-color:var(--muted); }
@media (max-width:760px){ .ck-grid{ grid-template-columns:minmax(0,1fr); } .pt-row{ grid-template-columns:minmax(0,1fr) 92px; padding:13px 18px; } .pt-bar{ grid-column:1/-1; order:3; } .pt-res{ grid-template-columns:minmax(0,1fr); gap:16px; } }
@media print{ .sitehead, footer, .s5-end, .ck-tabs, .ck-actions, .dg-hero, .skip{ display:none!important; } body::before{ display:none; } body{ background:#fff!important; } }
[hidden]{ display:none!important; }
.tl-grid{ display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:20px; align-items:start; }
.tl-list{ list-style:none; padding:0; margin:14px 0 0; }
.tl-item{ display:flex; gap:14px; align-items:flex-start; padding:14px 0; border-top:1px solid var(--hairline); }
.tl-list li:first-child .tl-item{ border-top:0; }
.tl-ic{ width:38px; height:38px; border-radius:11px; display:grid; place-items:center; flex-shrink:0; }
.tl-item b{ display:block; color:var(--text); font-size:15.5px; } .tl-item > div > span{ display:block; color:var(--text2); font-size:13.5px; } .tl-item em{ display:block; font-style:normal; color:var(--muted); font-size:13px; margin-top:3px; overflow-wrap:anywhere; }
.tl-act{ display:flex; gap:4px; flex-shrink:0; } .tl-act button{ background:none; border:0; cursor:pointer; padding:6px 8px; border-radius:8px; color:var(--muted); font-size:13px; font-weight:600; font-family:inherit; } .tl-act button:hover{ background:var(--bg3); color:var(--text); }
.tl-gap{ margin-left:18px; padding:2px 0 2px 31px; border-left:2px dashed var(--border); font-size:12.5px; font-weight:700; color:var(--accentInk); }
.tl-empty{ padding:22px; border-radius:14px; background:var(--bg2); color:var(--text2); font-size:14px; margin-top:14px; }
.tl-gloss{ margin:12px 0 0; display:flex; flex-direction:column; gap:12px; } .tl-gloss dt{ display:flex; align-items:center; gap:8px; font-weight:700; color:var(--text); font-size:14px; } .tl-gloss dd{ margin:2px 0 0 23px; color:var(--text2); font-size:13.5px; line-height:1.5; }
@media (max-width:860px){ .tl-grid{ grid-template-columns:minmax(0,1fr); } }
@media print{ .tl-act, #tl-form, .tl-grid > div:last-child{ display:none!important; } .tl-grid{ display:block; } }
/* calendar (DATEPICKER_JS) */
.dp{ position:relative; }
.dp-field{ display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; cursor:pointer; text-align:left; font-family:inherit; }
.dp-field svg{ color:var(--text2); flex-shrink:0; }
.dp-field:hover{ border-color:var(--text2)!important; }
.dp-field[aria-expanded="true"]{ border-color:var(--accent)!important; box-shadow:0 0 0 3px var(--accentSoft); }
.dp-ph{ color:var(--muted); }
.dp-pop{ position:absolute; z-index:70; top:calc(100% + 8px); left:0; width:312px; padding:14px; border-radius:18px; background:var(--card); border:1px solid var(--border); box-shadow:var(--lift); color:var(--text); font-weight:500; letter-spacing:0; text-transform:none; }
.dp-head{ display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:8px; }
.dp-nav{ width:36px; height:36px; border-radius:10px; border:0; background:none; color:var(--text2); cursor:pointer; display:grid; place-items:center; }
.dp-nav:hover{ background:var(--bg3); color:var(--text); }
.dp-title{ border:0; background:none; font-family:inherit; font-weight:800; font-size:15.5px; color:var(--text); cursor:pointer; padding:7px 10px; border-radius:10px; display:flex; gap:6px; align-items:center; }
.dp-title:hover{ background:var(--bg3); }
.dp-dow, .dp-grid{ display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
.dp-dow span{ text-align:center; font-size:11px; font-weight:700; color:var(--muted); padding:4px 0 6px; text-transform:uppercase; letter-spacing:.05em; }
.dp-day{ aspect-ratio:1; border:0; background:none; border-radius:10px; font-family:inherit; font-size:14px; font-weight:600; color:var(--text); cursor:pointer; font-variant-numeric:tabular-nums; transition:background .12s ease; }
.dp-day:hover{ background:var(--bg3); }
.dp-day.out{ color:var(--muted); opacity:.5; }
.dp-day.today{ box-shadow:inset 0 0 0 1.5px var(--accent); color:var(--accentInk); }
.dp-day.sel, .dp-day.sel:hover{ background:var(--accentBtn); color:#fff; box-shadow:none; opacity:1; }
.dp-day:disabled, .dp-mon:disabled, .dp-link:disabled{ opacity:.25; cursor:not-allowed; background:none; }
.dp-months{ display:grid; grid-template-columns:repeat(3,1fr); gap:6px; padding:4px 0; }
.dp-mon{ padding:14px 0; border:0; border-radius:12px; background:var(--bg2); font-family:inherit; font-size:14px; font-weight:600; color:var(--text); cursor:pointer; }
.dp-mon:hover{ background:var(--bg3); } .dp-mon.sel{ background:var(--accentBtn); color:#fff; }
.dp-foot{ display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid var(--hairline); }
.dp-link{ border:0; background:none; font-family:inherit; font-size:13.5px; font-weight:700; color:var(--accentInk); cursor:pointer; padding:7px 10px; border-radius:8px; }
.dp-link:hover{ background:var(--accentSoft); }
.dp-pop button:focus-visible{ outline:2px solid var(--accentInk); outline-offset:1px; }
@media (max-width:520px){ .dp-pop{ position:fixed; left:12px; right:12px; top:auto; bottom:calc(12px + env(safe-area-inset-bottom)); width:auto; padding:16px; box-shadow:0 -10px 40px -10px rgba(0,0,0,.35), var(--lift); } .dp-day{ font-size:15px; } }
/* motion runtime */
.js [data-r]{ opacity:0; transform:translateY(26px); transition:opacity .9s cubic-bezier(.16,1,.3,1) var(--d,0ms), transform .9s cubic-bezier(.16,1,.3,1) var(--d,0ms); }
.js [data-r].in{ opacity:1; transform:none; }
.js .split .w{ display:inline-block; overflow:hidden; vertical-align:top; padding-bottom:.08em; margin-bottom:-.08em; }
.js .split .w > span{ display:inline-block; transform:translateY(105%); transition:transform 1s cubic-bezier(.16,1,.3,1) var(--d,0ms); }
.js .split.in .w > span{ transform:none; }
@media (prefers-reduced-motion: reduce){ .js [data-r], .js .split .w > span{ opacity:1!important; transform:none!important; transition:none!important; } }
@media (max-width:960px){
  .s5-hero{ grid-template-columns:minmax(0,1fr); min-height:auto; padding-top:30px; } .s5-live{ grid-template-columns:repeat(2,minmax(0,1fr)); } .s5-live > div{ padding:22px 16px; } .s5-live b{ font-size:32px; }
  .s5-live > div:nth-child(3){ border-left:0; } .s5-live > div:nth-child(n+3){ border-top:1px solid var(--border); }
  .s5-story{ grid-template-columns:minmax(0,1fr); padding-top:60px; } .s5-pin{ display:none; } .s5-chap{ min-height:auto; padding:40px 0; } .s5-mphone{ display:flex; justify-content:center; margin-top:36px; }
  .s5-pts{ grid-template-columns:1fr; } .s5-faq{ grid-template-columns:minmax(0,1fr); } .s5-end{ grid-template-columns:1fr; padding:52px 28px; } }
</style>`;
const S5_MOTION = `<script>
window.addEventListener('DOMContentLoaded', function(){
  var R = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.split').forEach(function(el){ var i = 0;
    el.innerHTML = el.innerHTML.trim().split(/(\\s+|<[^>]+>)/).filter(Boolean).map(function(t){ if(/^</.test(t)) return t; if(/^\\s+$/.test(t)) return ' '; return '<span class="w"><span style="--d:' + (i++ * 55) + 'ms">' + t + '</span></span>'; }).join(''); });
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .16, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-r], .split').forEach(function(el){ if(el.dataset.r) el.style.setProperty('--d', el.dataset.r + 'ms'); R ? el.classList.add('in') : io.observe(el); });
  var fmt = function(n){ return n.toLocaleString('en-CA'); };
  document.querySelectorAll('[data-count]').forEach(function(el){ var end = +el.dataset.count; if(R) return; el.textContent = '0';
    var o = new IntersectionObserver(function(es){ if(!es[0].isIntersecting) return; o.disconnect(); var t0 = performance.now();
      (function step(t){ var p = Math.min(1, (t - t0) / 1500), k = 1 - Math.pow(1 - p, 4); el.textContent = fmt(Math.round(end * k)); if(p < 1) requestAnimationFrame(step); })(t0); }, { threshold: .6 });
    o.observe(el); });
});
</script>`;
const HOME_SCRIPTS = `<script src="/js/gsap.min.js" defer></script><script src="/js/ScrollTrigger.min.js" defer></script>
<script>
window.addEventListener('DOMContentLoaded', function(){
  var R = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var words = document.querySelectorAll('#privline .wd');
  if(R || !window.gsap){ words.forEach(function(w){ w.classList.add('lit'); }); return; }
  gsap.registerPlugin(ScrollTrigger);
  var imgs = document.querySelectorAll('.s5-pin img[data-k]');
  document.querySelectorAll('.s5-chap').forEach(function(ch){
    ScrollTrigger.create({ trigger: ch, start: 'top 55%', end: 'bottom 55%', onToggle: function(s){ if(!s.isActive) return; imgs.forEach(function(im){ im.classList.toggle('on', im.dataset.k === ch.dataset.screen); }); } }); });
  gsap.fromTo('.s5-pin .iphone', { rotate: 4 }, { rotate: -4, ease: 'none', scrollTrigger: { trigger: '.s5-story', start: 'top bottom', end: 'bottom top', scrub: true } });
  ScrollTrigger.create({ trigger: '#privline', start: 'top 80%', end: 'bottom 35%', scrub: true, onUpdate: function(s){ var n = Math.round(s.progress * words.length); words.forEach(function(w, i){ w.classList.toggle('lit', i < n); }); } });
});
</script>`;

function home() {
  // Template 5 "Story": a scroll-told homepage. The phone pins while you read and shows
  // the screen each chapter describes; live figures count up; one marquee of real rounds;
  // the privacy line lights word by word. Everything settles to static under reduced
  // motion, and nothing is hidden without JS (styles are gated on html.js).
  const latest = DRAWS[0];
  const SCREENS = ['draws', 'analytics', 'timeline'];
  const chapters = [
    ['draws', 'bell', 'Every IRCC draw, minutes after it happens.', 'CRS Pulse watches the Government of Canada feed and pushes you the category, cutoff and invitation count as soon as a round is published.', ['Alerts usually within about 15 minutes', 'Full history filtered by CEC, PNP, French, healthcare, trades', 'Every round links to its official IRCC page']],
    ['analytics', 'trend', 'Your odds, not just your score.', 'Your score is placed against the live trend cutoff, the next round in your category is estimated from IRCC cadence, and every lever is priced.', ['Odds against the current trend cutoff, by program', 'Next draw predicted from recent cadence', 'What a nomination, French or Canadian work is worth']],
    ['timeline', 'clock', 'Follow your file to the decision.', 'Log the dates that matter. The app keeps them in order, compares you with IRCC processing times, and tells you when you pass the typical window.', ['ITA, AOR, biometrics, medical, passport request and portal steps', 'The IRCC document checklist for your program', 'Processing estimates for your category']],
  ];
  const pinned = phone('draws', 330).replace(/<img [^>]+>/, SCREENS.map((k, i) => `<img src="${SHOTS[k][0]}" data-k="${k}" class="${i === 0 ? 'on' : ''}" alt="${SHOTS[k][1]}" width="520" height="1047"${i ? ' loading="lazy"' : ''} decoding="async">`).join(''));
  const privacy = 'Your immigration profile is yours. It never leaves your phone.';
  const ck = (s = 18) => `<span style="color:var(--success);flex-shrink:0;display:inline-flex;margin-top:3px">${icon('checkCircle', s)}</span>`;

  const heroCopy = `<div><h1 class="split">Your Express Entry journey, <em>in one app.</em></h1>
      <p data-r="500" class="s5-sub">Your CRS on IRCC’s official grid, every draw within minutes, your file tracked to the decision.</p>
      <div data-r="650" style="display:flex;gap:12px;flex-wrap:wrap"><a class="s5-btn s5-red" href="${APP_STORE_URL}">${APPLE(18)} Download for iPhone</a><a class="s5-btn s5-soft" href="/crs-calculator">Calculate my CRS</a></div></div>`;
  const hero = `<div class="dg-hero">${MAPLE}<div class="wrap">
  <section class="s5-hero">
    ${heroCopy}
    <div class="s5-stage" data-r="0">${phone('home', 320)}</div>
  </section></div></div>`;
  const priv = `<section class="s5-priv"><p class="s5-big" id="privline">${privacy.split(' ').map((w) => `<span class="wd${/yours|never/.test(w) ? ' red' : ''}">${w}</span>`).join(' ')}</p>
    <div class="s5-pts">${PRIVACY_POINTS.map((p, i) => `<p data-r="${i * 80}"><span style="color:var(--success);flex-shrink:0;margin-top:3px">${icon('lock', 19)}</span><span>${p}</span></p>`).join('')}</div></section>`;

  const body = `${nav('home', 'app')}
<main class="s5">
${hero}
<div class="wrap">
  <div class="s5-live">
    <div data-r="0"><b data-count="${latest.crs}">${latest.crs}</b><span>cutoff in round #${latest.no} (${latest.cat}, ${latest.date.replace(/, \d{4}$/, '')})</span></div>
    <div data-r="80"><b data-count="${FEED.ytd.invitations}">${num(FEED.ytd.invitations)}</b><span>invitations in ${FEED.ytd.year}, ${FEED.ytd.rounds} rounds</span></div>
    <div data-r="160"><b data-count="${FEED.poolTotal}">${num(FEED.poolTotal)}</b><span>profiles in the Express Entry pool</span></div>
    <div data-r="240"><b>~15 min</b><span>from an IRCC draw to your alert</span></div>
  </div>
  <div class="s5-trust"><span>${ck(16)}Free</span><span>${ck(16)}No account</span><span>${ck(16)}English and French</span><span>${ck(16)}Data stays on your device</span></div>
  <section class="s5-story" id="how">
    <div>${chapters.map(([key, ic, h, p, items]) => `<article class="s5-chap" data-screen="${key}"><div data-r="0"><div class="s5-ic">${icon(ic, 26)}</div><h2>${h}</h2><p>${p}</p><ul>${items.map((x) => `<li>${ck()}<span>${x}</span></li>`).join('')}</ul><div class="s5-mphone">${phone(key, 260)}</div></div></article>`).join('')}</div>
    <div class="s5-pin">${pinned}</div>
  </section>
</div>
<div class="s5-marquee" aria-label="Recent Express Entry rounds"><div class="s5-track">${[...DRAWS.slice(0, 12), ...DRAWS.slice(0, 12)].map((d, i) => `<div class="s5-d"${i >= 12 ? ' aria-hidden="true"' : ''}><b>${d.crs}</b><span>#${d.no} ${d.cat}, ${d.date.replace(/, \d{4}$/, '')}</span></div>`).join('')}</div></div>
<div class="wrap">
  <section class="s5-calcs"><h2 data-r="0">Four point grids, right in your browser.</h2>
    <div class="s5-snap">${[['CRS', 'Express Entry', '1,200', 'The Comprehensive Ranking System IRCC uses to rank every profile in the pool.', CALC_ROUTES.crs], ['FSW', '67-point grid', '100', 'Federal Skilled Worker eligibility: six selection factors, 67 to qualify.', CALC_ROUTES.fsw], ['BC PNP', 'SIRS', '200', 'British Columbia’s Skills Immigration Registration System score.', CALC_ROUTES.bc], ['SINP', 'EOI', '110', 'Saskatchewan’s International Skilled Worker points assessment.', CALC_ROUTES.sinp]].map(([a, b, mx, d, h], i) => `<a href="${h}" data-r="${i * 90}"><b style="font-size:20px">${a}</b><span style="opacity:.75">${b}</span><p>${d}</p><span class="s5-max">${mx}</span></a>`).join('')}</div></section>
  ${priv}
  <section class="s5-faq" id="faq"><h2 data-r="0">Questions people ask.</h2>${FAQ.map(([q, a], i) => `<details data-r="${(i % 2) * 80}"><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
  <section class="s5-end" data-r="0"><h2>Check your CRS score tonight.</h2><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="s5-btn s5-white" href="${APP_STORE_URL}">${APPLE(18)} App Store</a><a class="s5-btn" style="background:rgba(255,255,255,.14);color:#fff" href="/crs-calculator">Calculators</a></div></section>
</div>
</main>
${footerFull()}`;
  return shell({ ...page('index'), jsonld: homeJsonLd(), body: noDashes(body), scripts: HOME_SCRIPTS });
}

// ------------------------------------------------------------------ FEATURES
// The mock panels use the site's own tokens, so they follow light/dark like the page
// around them instead of dropping navy boxes into a white page. The alert shows the
// real latest draw.
const PANEL = 'background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px;color:var(--text)';
const FEATURE_BLOCKS = [
  {
    icon: 'folder', tag: 'Application tracker', title: 'Track your PR application against live IRCC times',
    body: 'Tell CRS Pulse which program you applied to and it estimates your progress using live processing-time data — so you always know roughly how long is left.',
    points: ['Live processing estimates by program & category', 'Days-since-applied and estimated decision month', 'Overdue flag when you pass the typical window'],
    visual: `<div style="${PANEL}">
      <div style="display:flex;justify-content:space-between;margin-bottom:14px"><span style="font-size:13px;font-weight:700">CEC · online application</span><span style="font-size:12px;color:var(--muted)">62% of typical</span></div>
      <div style="display:flex;gap:28px;margin-bottom:14px"><div><div class="num" style="font-size:28px;line-height:1">112</div><div class="klabel" style="font-size:10px;margin-top:4px">days since applied</div></div><div><div class="num" style="font-size:28px;line-height:1;color:var(--accentInk)">3</div><div class="klabel" style="font-size:10px;margin-top:4px">months left</div></div></div>
      <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:10px"><div style="height:100%;width:62%;background:var(--accent);border-radius:3px"></div></div>
      <div style="font-size:12.5px;color:var(--text2)">Estimated decision <b style="color:var(--text)">January 2027</b></div></div>`,
  },
  {
    icon: 'checklist', tag: 'Document checklists', title: 'Per-program checklists from IRCC requirements',
    body: 'Every program has its own document set. CRS Pulse ships the right checklist and tracks each item as you gather it — nothing forgotten before your e-APR.',
    points: ['Checklists compiled from IRCC requirements', 'Per-item progress that persists on device', 'Tailored to the program you applied under'],
    reverse: true,
    visual: `<div style="${PANEL};padding:8px 18px">${[['Passport / travel document', 1], ['Language test results', 1], ['ECA report', 1], ['Proof of funds', 0], ['Police certificates', 0]].map(([t, done], i, arr) => `<div style="display:flex;align-items:center;gap:11px;padding:10px 0;${i < arr.length - 1 ? 'border-bottom:1px solid var(--hairline)' : ''}"><span style="width:18px;height:18px;border-radius:5px;border:1.5px solid ${done ? 'var(--success)' : 'var(--border)'};background:${done ? 'var(--success)' : 'transparent'};color:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0">${done ? CHECK : ''}</span><span style="font-size:13.5px;color:${done ? 'var(--muted)' : 'var(--text)'};text-decoration:${done ? 'line-through' : 'none'}">${t}</span></div>`).join('')}</div>`,
  },
  {
    icon: 'clock', tag: 'Application timeline', title: 'Log every milestone from ITA to PPR',
    body: 'Add ITA, AOR, biometrics, medicals, passport request and custom milestones with notes. Your whole journey on one clean timeline.',
    points: ['Add, edit and delete milestones with notes', 'Standard IRCC stages plus custom entries', 'A shareable view of where you are'],
    visual: `<div style="${PANEL}">${[['ITA received', 'Feb 12', 1], ['e-APR submitted', 'Feb 28', 1], ['AOR', 'Mar 4', 1], ['Biometrics', 'Mar 19', 1], ['Medical passed', 'Apr 22', 0]].map(([t, d, past], i, arr) => `<div style="display:flex;gap:12px;align-items:flex-start"><div style="display:flex;flex-direction:column;align-items:center"><span style="width:11px;height:11px;border-radius:50%;margin-top:3px;${past ? 'background:var(--accent)' : 'border:2px solid var(--accent);background:var(--bg2)'}"></span>${i < arr.length - 1 ? '<span style="width:1.5px;height:24px;background:var(--border)"></span>' : ''}</div><div style="padding-bottom:${i < arr.length - 1 ? 8 : 0}px"><div style="font-size:13.5px;font-weight:700">${t}</div><div style="font-size:11.5px;color:var(--muted)">${d}</div></div></div>`).join('')}</div>`,
  },
  {
    icon: 'bell', tag: 'Draw alerts', title: 'Know the moment IRCC draws',
    body: 'A background service checks for new rounds every 15 minutes and pushes you an alert the moment one is published — with the category, cutoff and invitation count.',
    points: ['New-draw push within ~15 minutes', 'Anonymous token only — no personal data', 'Turn on or off any time'],
    reverse: true,
    visual: `<div style="${PANEL};display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;gap:12px;align-items:flex-start;background:var(--card);border-radius:12px;padding:12px 14px;border:1px solid var(--border);box-shadow:var(--shadow)"><span style="width:30px;height:30px;border-radius:8px;background:var(--accentSoft);color:var(--accentInk);display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon('bell', 16)}</span><div><div style="font-size:13px;font-weight:700">New Express Entry draw</div><div style="font-size:12.5px;color:var(--text2);line-height:1.45">Round #${DRAWS[0].no} · ${DRAWS[0].cat} · cutoff ${DRAWS[0].cutoff} · ${DRAWS[0].invited} invited</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${DRAWS[0].date}</div></div></div>
      <div style="font-size:11.5px;color:var(--muted);text-align:center">Delivered within ~15 min of publication</div></div>`,
  },
  {
    icon: 'trend', tag: 'Analytics & your plan', title: 'See your real odds, not just a number',
    body: 'Draws, history, category trends and cadence are free. Your Plan turns them into your personal odds versus the trend cutoff, forecast bands, and your position in the pool.',
    points: ['Odds vs the current trend cutoff', 'CRS forecast bands & what-if scenarios', 'Your percentile and place in the pool'],
    visual: `<div style="${PANEL};text-align:center">
      <div class="klabel" style="font-size:10.5px;margin-bottom:8px">Your odds this trend</div>
      <div style="font-family:'Satoshi',sans-serif;font-size:48px;font-weight:900;color:var(--success);letter-spacing:-2px;line-height:1">High</div>
      <div style="height:8px;background:var(--bg3);border-radius:5px;overflow:hidden;margin:14px 0 8px"><div style="height:100%;width:78%;background:var(--success);border-radius:5px"></div></div>
      <div style="font-size:12.5px;color:var(--text2)">Score 512 · 41 above the trend cutoff · top 18% of the pool</div></div>`,
  },
];

function featuresPage() {
  const block = (b) => `
<div class="fblock" data-reveal style="display:flex;gap:56px;align-items:center;padding:44px 0;border-top:1px solid var(--hairline);${b.reverse ? 'flex-direction:row-reverse' : ''}">
  <div style="flex:1;min-width:0">
    <div class="eyebrow" style="display:flex;align-items:center;gap:8px">${icon(b.icon, 16)}${b.tag}</div>
    <h2 style="font-size:clamp(30px,3.2vw,42px);line-height:1.04;margin:0 0 14px">${b.title}</h2>
    <p style="font-size:15.5px;line-height:1.6;color:var(--text2);margin:0 0 18px">${b.body}</p>
    <div style="display:flex;flex-direction:column;gap:9px">${b.points.map((p) => `<div style="display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--text2)"><span style="color:var(--success);margin-top:3px;flex-shrink:0">${CHECK}</span><span>${p}</span></div>`).join('')}</div>
  </div>
  <div class="fvisual" style="flex:0 0 320px;max-width:320px;width:100%">${b.visual}</div>
</div>`;
  const body = `${nav('features', 'calc')}
<div style="min-height:100vh;position:relative">
<div style="position:relative;z-index:1">
${pageHero('From your first estimate to', 'landing day.', 'CRS Pulse mirrors the real IRCC process at every step. Here is everything the app does, the same information you get on your iPhone, in one place.')}
<section style="max-width:1080px;margin:0 auto;padding:20px 24px;display:flex;flex-direction:column;gap:20px">
  ${FEATURE_BLOCKS.map(block).join('')}
</section>
${s5End('Have it all in your pocket.')}
</div>
${footerFull()}
</div>`;
  return shell({ ...page('features'), body: noDashes(body) });
}

// ------------------------------------------------------------------ DRAWS
const ALL_DRAWS = DRAWS.slice(0, 16);
// Chips follow the data: a category IRCC stops running drops off, a new one appears.
const DRAW_FILTERS = ['All', ...new Set(ALL_DRAWS.map((d) => d.cat))];
const POOL = FEED.pool.map((b) => [b.label, num(b.count), b.count]);

// Every figure below is computed from the mirrored rounds, so the copy can't drift out
// of step with the table sitting right above it.
const INSIGHTS = (() => {
  const general = DRAWS.filter((d) => ['CEC', 'General'].includes(d.cat));
  const category = DRAWS.filter((d) => !['CEC', 'General', 'PNP'].includes(d.cat));
  const pnp = DRAWS.filter((d) => d.cat === 'PNP');
  const span = Math.max(1, Math.round((Date.parse(DRAWS[0].iso) - Date.parse(DRAWS[DRAWS.length - 1].iso)) / 86400000));
  const range = (list) => {
    const scores = list.map((d) => d.crs);
    return `${Math.min(...scores)}–${Math.max(...scores)}`;
  };
  const out = [];
  if (category.length && general.length) {
    out.push(['trendDown', 'Category draws run lower', `Category-based rounds cut off at ${range(category)} over the last ${DRAWS.length} draws, while general and CEC rounds held at ${range(general)} — targeting a category can beat a raw CRS race.`]);
  }
  if (pnp.length) {
    out.push(['award', 'A nomination changes everything', `Provincial Nominee rounds cut off at ${range(pnp)}, because a nomination adds 600 points on top of your base score.`]);
  }
  out.push(['timer', `${DRAWS.length} rounds in ${span} days`, `That is IRCC's recent cadence, and rounds often land in bursts over consecutive days. Push alerts reach you within ~15 minutes of each one.`]);
  out.push(['target', 'Know your odds', 'The analytics tab places your score against the live trend cutoff and forecast bands, plus your percentile in the pool — free, like the rest of the app.']);
  return out;
})();

function drawsPage() {
  // chart: recent 10, oldest→newest
  const latest = DRAWS[0];
  const recent = ALL_DRAWS.slice(0, 10).slice().reverse();
  const cutoffs = recent.map((d) => Number(d.cutoff));
  const maxC = Math.max(...cutoffs), minC = Math.min(...cutoffs);
  const chart = recent.map((d) => {
    const v = Number(d.cutoff);
    const h = 30 + Math.round(((v - minC) / Math.max(1, maxC - minC)) * 130);
    const isCat = !['CEC', 'General'].includes(d.cat);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end"><span style="font-family:'Satoshi',sans-serif;font-size:12px;font-weight:900;color:var(--text)">${d.cutoff}</span><div style="width:100%;height:${h}px;border-radius:7px 7px 3px 3px;background:${isCat ? 'var(--catbar)' : 'var(--accent)'}"></div><span style="font-size:10.5px;color:var(--muted);text-align:center;line-height:1.2">${d.date.replace(/, 20\d\d/, '')}</span></div>`;
  }).join('');
  const poolMax = Math.max(...POOL.map((p) => p[2]));
  const stat = (label, val, sub, big) => `<div style="background:${big ? 'linear-gradient(155deg,var(--grad1),var(--grad2))' : 'var(--card)'};border:1px solid var(--border);border-radius:16px;padding:20px"><div style="font-size:11.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${label}</div><div style="font-family:'Satoshi',sans-serif;font-size:34px;font-weight:900;letter-spacing:-1.5px;color:${big ? 'var(--accent)' : 'var(--text)'}">${val}</div><div style="font-size:12.5px;color:var(--text2);margin-top:2px">${sub}</div></div>`;

  const body = `${nav('draws', 'app')}
<div style="min-height:100vh;position:relative">
<div style="position:relative;z-index:1">
${pageHero('Rounds of invitations,', 'live from IRCC.', `Every round from the official IRCC feed, with category filters, cutoff trends and the pool. Figures mirror IRCC as of ${FEED.updatedFull ?? FEED.updated}; the app refreshes live.`)}

<section style="max-width:1080px;margin:0 auto;padding:14px 24px 8px">
  <div class="s5-live">
    <div data-r="0"><b data-count="${latest.cutoff}" style="color:var(--accentInk)">${latest.cutoff}</b><span>latest cutoff, round #${latest.no} (${latest.cat}, ${latest.date.replace(/, \d{4}$/, '')})</span></div>
    <div data-r="80"><b data-count="${FEED.ytd.invitations}">${num(FEED.ytd.invitations)}</b><span>invitations in ${FEED.ytd.year}, ${FEED.ytd.rounds} rounds</span></div>
    <div data-r="160"><b data-count="${FEED.poolTotal}">${num(FEED.poolTotal)}</b><span>profiles in the pool${FEED.distributionAsOf ? ` (${FEED.distributionAsOf})` : ''}</span></div>
    <div data-r="240"><b>${FEED.ytd.categories}</b><span>active categories in ${FEED.ytd.year}</span></div>
  </div>
</section>

<section style="max-width:1080px;margin:0 auto;padding:32px 24px 8px">
  <div data-reveal style="background:var(--card);border:1px solid var(--border);border-radius:24px;padding:24px">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:22px">
      <div><h2 style="font-family:'Satoshi',sans-serif;font-size:20px;font-weight:900;margin:0 0 4px">CRS cutoff trend</h2><p style="font-size:13px;color:var(--text2);margin:0">Minimum score by round — most recent 10 draws (left → right)</p></div>
      <div style="display:flex;gap:16px;font-size:12px;color:var(--text2)"><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--accent)"></span>General / CEC</span><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--catbar)"></span>Category &amp; provincial</span></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px;height:200px">${chart}</div>
  </div>
</section>

<section style="max-width:1080px;margin:0 auto;padding:32px 24px">
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px">
    ${DRAW_FILTERS.map((c, i) => `<button class="filterchip${i === 0 ? ' on' : ''}" onclick="filterDraws('${c}',this)">${c}</button>`).join('')}
  </div>
  <div class="drawscroll" style="background:var(--card);border:1px solid var(--border);border-radius:24px;overflow:hidden">
    <div class="drawinner" id="drawtable">
      <div style="display:grid;grid-template-columns:70px 96px 1fr 120px 100px;gap:12px;padding:14px 22px;border-bottom:1px solid var(--border);color:var(--muted);font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase"><span>Round</span><span>Date</span><span>Category</span><span style="text-align:right">Invitations</span><span style="text-align:right">Cutoff</span></div>
      ${ALL_DRAWS.map((d, i) => `<div class="drawrow" data-cat="${d.cat}" style="display:grid;grid-template-columns:70px 96px 1fr 120px 100px;gap:12px;padding:14px 22px;border-bottom:1px solid var(--border);align-items:center"><div style="font-weight:700;font-size:14px;color:var(--text)">#${d.no}</div><div style="font-size:13px;color:var(--text2)">${d.date}</div><div style="display:flex;align-items:center;gap:9px"><span style="width:9px;height:9px;border-radius:50%;background:${d.dot};flex-shrink:0"></span><span style="font-size:14.5px;font-weight:600;color:var(--text)">${d.cat}</span></div><div style="text-align:right;font-size:14px;color:var(--text2)">${d.invited}</div><div style="text-align:right"><span style="font-family:'Satoshi',sans-serif;font-size:19px;font-weight:900;color:${i === 0 ? 'var(--accentInk)' : 'var(--text)'}">${d.cutoff}</span></div></div>`).join('')}
      <div style="padding:13px 22px;color:var(--muted);font-size:11.5px">Last ${ALL_DRAWS.length} rounds, mirrored from IRCC on ${FEED.updatedFull ?? FEED.updated} · in the app this table syncs the live IRCC feed with pull-to-refresh.</div>
    </div>
  </div>
</section>

<section style="max-width:1080px;margin:0 auto;padding:8px 24px 40px">
  <div class="poolgrid" data-reveal style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div style="background:var(--card);border:1px solid var(--border);border-radius:24px;padding:24px">
      <h2 style="font-family:'Satoshi',sans-serif;font-size:20px;font-weight:900;margin:0 0 4px">Pool composition</h2>
      <p style="font-size:13px;color:var(--text2);margin:0 0 20px">Candidates by CRS range — a recent IRCC snapshot</p>
      <div style="display:flex;flex-direction:column;gap:16px">${POOL.map(([range, count, n]) => `<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:var(--text2);font-weight:600">${range}</span><span style="color:var(--text);font-weight:900;font-family:'Satoshi',sans-serif">${count}</span></div><div style="height:8px;background:var(--bg3);border-radius:5px;overflow:hidden"><div style="height:100%;border-radius:5px;width:${Math.round((n / poolMax) * 100)}%;background:linear-gradient(90deg,var(--accent2),var(--accent))"></div></div></div>`).join('')}</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:24px;padding:24px">
      <h2 style="font-family:'Satoshi',sans-serif;font-size:20px;font-weight:900;margin:0 0 4px">What the trends tell you</h2>
      <p style="font-size:13px;color:var(--text2);margin:0 0 18px">Analytics in the app turn this into your personal odds</p>
      <div style="display:flex;flex-direction:column;gap:14px">${INSIGHTS.map(([ico, title, bodyt]) => `<div style="display:flex;gap:12px;align-items:flex-start"><span style="width:32px;height:32px;border-radius:9px;background:var(--accentSoft);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon(ico, 17)}</span><div><div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:2px">${title}</div><div style="font-size:13px;line-height:1.5;color:var(--text2)">${bodyt}</div></div></div>`).join('')}</div>
      <a class="link-accent" href="/analytics" style="display:inline-flex;align-items:center;gap:6px;margin-top:20px;font-size:14px;font-weight:600">Open draw analytics →</a>
    </div>
  </div>
</section>
</div>
${s5End()}
${footerFull()}
</div>
<script>
function filterDraws(cat,btn){document.querySelectorAll('#drawtable .drawrow').forEach(function(r){r.style.display=(cat==='All'||r.getAttribute('data-cat')===cat)?'':'none'});document.querySelectorAll('.filterchip').forEach(function(c){c.classList.remove('on')});btn.classList.add('on')}
</script>`;
  return shell({ ...page('draws'), body: noDashes(body) });
}

// ------------------------------------------------------------------ RESOURCES
// The three pages under the header's Resources menu. Document checklists and the IRCC
// application categories are imported from the app's own data files, so the site and the
// app list the same documents and programs. Wait times come from the processing-times
// mirror and every draw figure from the rounds mirror, the same feeds the app reads.
const { CHECKLIST_PROGRAMS } = await import('../mobile/src/features/checklist/data/checklists.ts');
const { APPLICATION_CATEGORIES, getApplicationStages } = await import('../mobile/src/features/tracker/data/processingTimes.ts');
const PT_FEED = JSON.parse(readFileSync(resolve(here, '../data/processing-times.json'), 'utf8'));
if (!Object.keys(PT_FEED.times ?? {}).length) throw new Error('data/processing-times.json has no usable times');
const jsonScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const resCard = 'background:var(--card);border:1px solid var(--border);border-radius:24px;padding:24px';
const resH2 = (t, sub) => `<h2 style="font-size:20px;margin:0 0 4px">${t}</h2>${sub ? `<p style="font-size:13.5px;color:var(--text2);margin:0 0 20px">${sub}</p>` : ''}`;

// ---------- analytics
const ANALYTICS = (() => {
  const groups = new Map();
  for (const d of DRAWS) {
    if (!groups.has(d.cat)) groups.set(d.cat, []);
    groups.get(d.cat).push(d);
  }
  const cats = [...groups].map(([cat, list]) => {
    const scores = list.map((d) => d.crs);
    return {
      cat, dot: list[0].dot, rounds: list.length, invited: list.reduce((n, d) => n + d.size, 0),
      min: Math.min(...scores), max: Math.max(...scores), avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      last: list[0], scores,
    };
  }).sort((a, b) => b.rounds - a.rounds || b.invited - a.invited);
  const days = (a, b) => Math.round((Date.parse(a.iso) - Date.parse(b.iso)) / 86400000);
  const gaps = DRAWS.slice(0, -1).map((d, i) => days(d, DRAWS[i + 1]));
  const span = days(DRAWS[0], DRAWS[DRAWS.length - 1]);
  const lowest = DRAWS.reduce((a, d) => (d.crs < a.crs ? d : a));
  return {
    cats, span, lowest, first: DRAWS[DRAWS.length - 1],
    invited: DRAWS.reduce((n, d) => n + d.size, 0),
    avgGap: (span / Math.max(1, DRAWS.length - 1)).toFixed(1),
    longestGap: Math.max(...gaps),
  };
})();
// Pool bands as [low, high, count], for placing a score in the pool.
const POOL_BANDS = FEED.pool.map((b) => {
  const [lo, hi] = String(b.label).split(/[–-]/).map(Number);
  return [lo, hi, b.count];
});

function cutoffChart() {
  const W = 1000, H = 330, L = 52, R = 18, T = 18, B = 40;
  const t0 = Date.parse(ANALYTICS.first.iso), t1 = Date.parse(DRAWS[0].iso);
  const scores = DRAWS.map((d) => d.crs);
  const lo = Math.floor((Math.min(...scores) - 20) / 100) * 100, hi = Math.ceil((Math.max(...scores) + 20) / 100) * 100;
  const x = (iso) => L + ((Date.parse(iso) - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [];
  for (let v = lo; v <= hi; v += 100) ticks.push(v);
  const months = [];
  const m = new Date(t0); m.setUTCDate(1); m.setUTCMonth(m.getUTCMonth() + 1);
  for (; m.getTime() <= t1; m.setUTCMonth(m.getUTCMonth() + 1)) months.push(new Date(m));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cutoff score of each recent round, by date and category" style="display:block;overflow:visible">
  ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--hairline)"/><text x="${L - 10}" y="${y(v) + 4}" text-anchor="end" font-size="13" fill="var(--muted)">${v}</text>`).join('')}
  ${months.map((d) => `<text x="${L + ((d.getTime() - t0) / Math.max(1, t1 - t0)) * (W - L - R)}" y="${H - 12}" text-anchor="middle" font-size="13" fill="var(--muted)">${d.toLocaleDateString('en-CA', { month: 'short', timeZone: 'UTC' })}</text>`).join('')}
  ${DRAWS.slice().reverse().map((d) => `<circle cx="${x(d.iso).toFixed(1)}" cy="${y(d.crs).toFixed(1)}" r="8" fill="${d.dot}" stroke="var(--card)" stroke-width="2.5"><title>#${d.no} ${d.cat}, ${d.date}: CRS ${d.crs}, ${d.invited} invitations</title></circle>`).join('')}
</svg>`;
}

function analyticsPage() {
  const A = ANALYTICS;
  const maxInv = Math.max(...A.cats.map((c) => c.invited));
  const tool = `<div data-reveal style="${resCard}">
    <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;justify-content:space-between;margin-bottom:22px">
      <div>${resH2('Where would your score land?', 'Type a CRS score. Each row counts the recent rounds in that category you would have cleared. Nothing leaves your browser.')}</div>
      <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--text2)">Your CRS score<input id="an-score" type="number" inputmode="numeric" min="0" max="1200" value="${BENCHMARK.crs}" style="width:150px;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--input);color:var(--text);font-size:22px;font-weight:900;font-family:'Satoshi',sans-serif"></label>
    </div>
    <p id="an-pool" style="font-size:15px;color:var(--text);margin:0 0 18px"></p>
    <div style="display:flex;flex-direction:column;gap:14px">${A.cats.map((c, i) => `<div class="an-row" data-i="${i}"><div style="display:flex;justify-content:space-between;gap:12px;font-size:14px;margin-bottom:6px"><span style="display:flex;align-items:center;gap:8px;font-weight:700;color:var(--text)"><span style="width:9px;height:9px;border-radius:50%;background:${c.dot}"></span>${c.cat}${c.cat === 'PNP' ? '<span style="font-weight:500;color:var(--muted)">(with a nomination, +600)</span>' : ''}</span><span class="an-out" style="color:var(--text2);white-space:nowrap"></span></div><div style="height:8px;background:var(--bg3);border-radius:5px;overflow:hidden"><div class="an-bar" style="height:100%;width:0;border-radius:5px;background:${c.dot};transition:width .4s ease"></div></div></div>`).join('')}</div>
    <p style="font-size:12.5px;color:var(--muted);margin:18px 0 0">Category rounds only invite people eligible for that category (French ability, a healthcare or transport job, and so on). Ties at the cutoff are broken by profile date. An estimate, not a prediction.</p>
  </div>`;

  const body = `${nav('analytics', 'app')}
<div style="min-height:100vh;position:relative">
${pageHero('Express Entry draws,', 'by the numbers.', `Cutoffs, cadence and invitations for every category, worked out from the last ${DRAWS.length} rounds IRCC published (${ANALYTICS.first.date} to ${DRAWS[0].date}). Mirrored from IRCC as of ${FEED.updatedFull ?? FEED.updated}.`)}
<section style="max-width:1080px;margin:0 auto;padding:14px 24px 8px">
  <div class="s5-live">
    <div data-r="0"><b data-count="${A.invited}">${num(A.invited)}</b><span>invitations across these ${DRAWS.length} rounds</span></div>
    <div data-r="80"><b>${A.avgGap} days</b><span>between rounds on average; the longest gap was ${A.longestGap} days</span></div>
    <div data-r="160"><b data-count="${A.lowest.crs}" style="color:var(--accentInk)">${A.lowest.crs}</b><span>lowest cutoff, a ${A.lowest.cat} round (${A.lowest.date.replace(/, \d{4}$/, '')})</span></div>
    <div data-r="240"><b>${A.cats.length}</b><span>categories invited in this window</span></div>
  </div>
</section>
<section style="max-width:1080px;margin:0 auto;padding:32px 24px 8px">${tool}</section>
<section style="max-width:1080px;margin:0 auto;padding:32px 24px 8px">
  <div data-reveal style="${resCard}">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px">
      <div>${resH2('Every cutoff, over time', 'One dot per round. Hover or tap a dot for the round.')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px 14px;font-size:12px;color:var(--text2)">${A.cats.map((c) => `<span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:${c.dot}"></span>${c.cat}</span>`).join('')}</div>
    </div>
    ${cutoffChart()}
  </div>
</section>
<section style="max-width:1080px;margin:0 auto;padding:32px 24px 40px">
  <div class="poolgrid" data-reveal style="display:grid;grid-template-columns:1.35fr 1fr;gap:20px">
    <div style="${resCard};padding:0;overflow:hidden">
      <div style="padding:24px 24px 6px">${resH2('Cutoffs by category', `Lowest, average and highest cutoff in the last ${DRAWS.length} rounds`)}</div>
      <div class="drawscroll"><table class="res-table"><thead><tr><th>Category</th><th>Rounds</th><th>Low</th><th>Avg</th><th>High</th><th>Latest</th></tr></thead><tbody>
      ${A.cats.map((c) => `<tr><td><span style="display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--text)"><span style="width:9px;height:9px;border-radius:50%;background:${c.dot}"></span>${c.cat}</span></td><td>${c.rounds}</td><td>${c.min}</td><td><b>${c.avg}</b></td><td>${c.max}</td><td>${c.last.date.replace(/, \d{4}$/, '')}</td></tr>`).join('')}
      </tbody></table></div>
    </div>
    <div style="${resCard}">
      ${resH2('Invitations by category', `Share of the ${num(A.invited)} invitations`)}
      <div style="display:flex;flex-direction:column;gap:14px">${A.cats.map((c) => `<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:var(--text2);font-weight:600">${c.cat}</span><span style="color:var(--text);font-weight:900">${num(c.invited)}</span></div><div style="height:8px;background:var(--bg3);border-radius:5px;overflow:hidden"><div style="height:100%;border-radius:5px;width:${Math.max(2, Math.round((c.invited / maxInv) * 100))}%;background:${c.dot}"></div></div></div>`).join('')}</div>
      <p style="font-size:13px;color:var(--text2);margin:22px 0 0">The app's Analytics tab turns these trends into your own odds, forecast bands and the levers worth the most points. <a class="link-accent" href="/draws">See every round →</a></p>
    </div>
  </div>
</section>
${s5End()}
${footerFull()}
</div>
<script>
(function(){
  var CATS=${jsonScript(A.cats.map((c) => ({ cat: c.cat, scores: c.scores, rounds: c.rounds })))}, BANDS=${jsonScript(POOL_BANDS)}, TOTAL=${FEED.poolTotal};
  var input=document.getElementById('an-score'), pool=document.getElementById('an-pool'), rows=document.querySelectorAll('.an-row');
  function run(){
    var s=Math.max(0,Math.min(1200,parseInt(input.value,10)||0)), above=0;
    BANDS.forEach(function(b){ if(b[0]>s) above+=b[2]; else if(b[1]>s) above+=b[2]*(b[1]-s)/(b[1]-b[0]+1); });
    var pct=Math.max(0,Math.min(100,Math.round((1-above/TOTAL)*100)));
    pool.innerHTML='A score of <b>'+s+'</b> sits above roughly <b>'+pct+'%</b> of the '+TOTAL.toLocaleString('en-CA')+' profiles in the pool.';
    rows.forEach(function(r){
      var c=CATS[+r.getAttribute('data-i')], eff=c.cat==='PNP'?s+600:s, n=c.scores.filter(function(v){return v<=eff}).length;
      r.querySelector('.an-out').textContent='cleared '+n+' of '+c.rounds+' round'+(c.rounds===1?'':'s');
      r.querySelector('.an-bar').style.width=Math.round(n/c.rounds*100)+'%';
    });
  }
  input.addEventListener('input',run); run();
})();
</script>`;
  return shell({ ...page('analytics'), body: noDashes(body) });
}

// ---------- processing times
// The app's categories and labels, with each type's months and queue replaced by the
// mirrored IRCC figure wherever the mirror carries it.
const PT = APPLICATION_CATEGORIES.map((c) => ({
  ...c,
  types: c.types.map((t) => ({ ...t, ...(PT_FEED.times[t.id] ?? {}), live: Boolean(PT_FEED.times[t.id]), stages: getApplicationStages(c.id, t.id).map((s) => [s.label, s.at]) })),
}));
const PT_TYPES = PT.flatMap((c) => c.types.map((t) => ({ ...t, category: c.label })));
const ptType = (id) => PT_TYPES.find((t) => t.id === id);
const fmtMonths = (m) => (m >= 24 && m % 12 === 0 ? `${m / 12} years` : `${m} month${m === 1 ? '' : 's'}`);

function processingPage() {
  const maxM = Math.max(...PT_TYPES.map((t) => t.months));
  const statOf = (id, label) => {
    const t = ptType(id);
    return t ? `<b>${fmtMonths(t.months)}</b><span>${label}${t.peopleWaiting ? `, ${num(t.peopleWaiting)} waiting` : ''}</span>` : '';
  };
  const estimator = `<div data-reveal style="${resCard}">
    ${resH2('When should I hear back?', 'Pick your application and the date IRCC received it. The estimate uses IRCC’s current published time; nothing leaves your browser.')}
    <div class="fields" style="display:grid;grid-template-columns:1.6fr 1fr;gap:14px;margin-bottom:22px">
      <label style="${LBL}">Application<select id="pt-type" style="${SEL}">${PT.map((c) => `<optgroup label="${c.label}">${c.types.map((t) => `<option value="${t.id}"${t.id === 'ee_cec' ? ' selected' : ''}>${t.label}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label style="${LBL}">Date received<input id="pt-date" type="hidden" data-datepicker data-max="today" style="${INP}"></label>
    </div>
    <div id="pt-out"></div>
  </div>`;

  const body = `${nav('processing', 'app')}
<div style="min-height:100vh;position:relative">
${pageHero('IRCC processing times,', 'in one place.', `How long IRCC is taking right now for permanent residence, family sponsorship, citizenship and more, mirrored from IRCC’s published figures as of ${PT_FEED.updated}. IRCC’s number is the time it took to finish 80% of recent applications.`)}
<section style="max-width:1080px;margin:0 auto;padding:14px 24px 8px">
  <div class="s5-live">
    <div data-r="0">${statOf('ee_cec', 'Canadian Experience Class')}</div>
    <div data-r="80">${statOf('ee_fsw', 'Federal Skilled Worker')}</div>
    <div data-r="160">${statOf('ee_pnp', 'PNP through Express Entry')}</div>
    <div data-r="240">${statOf('citizenship', 'Citizenship grant')}</div>
  </div>
</section>
<section style="max-width:1080px;margin:0 auto;padding:32px 24px 8px">${estimator}</section>
<section style="max-width:1080px;margin:0 auto;padding:32px 24px 40px;display:flex;flex-direction:column;gap:20px">
  ${PT.map((c) => `<div data-reveal style="${resCard};padding:0;overflow:hidden">
    <h2 style="font-size:19px;padding:20px 24px 12px;margin:0">${c.label}</h2>
    ${c.types.map((t) => `<div class="pt-row"><div><div style="font-weight:700;color:var(--text);font-size:15px">${t.label}</div><div style="font-size:12.5px;color:var(--muted)">${[t.method, t.peopleWaiting ? `${num(t.peopleWaiting)} people waiting` : '', t.varies ? 'varies by country' : '', t.live ? '' : 'app estimate'].filter(Boolean).join(' · ') || '&nbsp;'}</div></div><div class="pt-bar"><div style="width:${Math.max(2, Math.round((t.months / maxM) * 100))}%"></div></div><div class="pt-m">${fmtMonths(t.months)}</div></div>`).join('')}
  </div>`).join('')}
  <p style="font-size:13px;color:var(--muted);margin:4px 4px 0">Times marked “app estimate” are not in IRCC’s published table and use the app’s typical figure. Country-specific programs vary widely; check canada.ca for your visa office. The app tracks your own file against these times and alerts you when they change.</p>
</section>
${s5End('Track your file to the decision.')}
${footerFull()}
</div>
<script>
(function(){
  var T=${jsonScript(Object.fromEntries(PT_TYPES.map((t) => [t.id, { label: t.label, months: t.months, varies: Boolean(t.varies), stages: t.stages }])))};
  var sel=document.getElementById('pt-type'), date=document.getElementById('pt-date'), out=document.getElementById('pt-out');
  var today=new Date(); today.setHours(12,0,0,0);
  var d0=new Date(today); d0.setMonth(d0.getMonth()-2); date.value=d0.toISOString().slice(0,10);
  function add(d,m){ var x=new Date(d.getTime()); x.setTime(x.getTime()+m*30.44*864e5); return x; }
  function fmt(d){ return d.toLocaleDateString('en-CA',{month:'long',day:'numeric',year:'numeric'}); }
  function run(){
    var t=T[sel.value]; if(!t||!date.value){ out.innerHTML=''; return; }
    var start=new Date(date.value+'T12:00:00'), end=add(start,t.months);
    var pct=Math.max(0,Math.min(100,Math.round((today-start)/(end-start)*100)));
    var left=Math.round((end-today)/864e5);
    out.innerHTML='<div class="pt-res"><div><div class="klabel">Estimated decision</div><div class="pt-big">'+fmt(end)+'</div><div style="color:var(--text2);font-size:14px">'+(left>0?'about '+(left>60?Math.round(left/30.44)+' months':left+' days')+' from now':'past the typical time; most files are decided by now')+(t.varies?' · varies by country':'')+'</div></div><div style="min-width:0"><div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text2);margin-bottom:6px"><span>'+pct+'% of the typical time</span><span>'+t.months+' months</span></div><div class="pt-prog"><div style="width:'+pct+'%"></div></div></div></div>'
      +'<ol class="pt-stages">'+t.stages.map(function(s){ var at=add(start,t.months*s[1]); return '<li class="'+(at<=today?'done':'')+'"><b>'+s[0]+'</b><span>'+(s[1]===0?fmt(start):'from around '+fmt(at))+'</span></li>'; }).join('')+'</ol>';
  }
  sel.addEventListener('change',run); date.addEventListener('input',run); run();
})();
</script>`;
  return shell({ ...page('processing-times'), body: noDashes(body) });
}

// ---------- document checklists
function checklistsPage() {
  const total = (p) => p.sections.reduce((n, s) => n + s.items.length, 0);
  const body = `${nav('checklists', 'app')}
<div style="min-height:100vh;position:relative">
${pageHero('Document checklists for', 'every program.', 'What to gather for Express Entry, provincial nominee, family sponsorship, study, work and citizenship applications. Tick items off as you go; your progress stays in this browser.')}
<section style="max-width:1080px;margin:0 auto;padding:8px 24px 40px">
  <div class="calctabs ck-tabs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px">${CHECKLIST_PROGRAMS.map((p, i) => `<button type="button" class="filterchip${i === 0 ? ' on' : ''}" data-p="${p.id}">${p.label}</button>`).join('')}</div>
  ${CHECKLIST_PROGRAMS.map((p, i) => `<div class="ck-panel" id="${p.id}" data-p="${p.id}"${i ? ' hidden' : ''}>
    <div style="${resCard};margin-bottom:20px">
      <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:flex-start">
        <div style="max-width:620px"><h2 style="font-size:clamp(26px,3vw,34px);margin:0 0 6px">${p.label}</h2><p style="color:var(--text2);font-size:15px;margin:0">${p.intro}</p></div>
        <div class="ck-actions" style="display:flex;gap:8px"><button type="button" class="btn btn-quiet ck-print" style="padding:9px 14px;font-size:14px">Print</button><button type="button" class="btn btn-quiet ck-reset" style="padding:9px 14px;font-size:14px">Reset</button></div>
      </div>
      <div style="margin-top:20px"><div style="display:flex;justify-content:space-between;font-size:13.5px;color:var(--text2);margin-bottom:6px"><span class="ck-count">0 of ${total(p)} ready</span><span class="ck-pct">0%</span></div><div class="pt-prog"><div class="ck-bar" style="width:0"></div></div></div>
    </div>
    <div class="ck-grid">${p.sections.map((s) => `<div style="${resCard}"><h3 style="font-size:17px;margin:0 0 12px">${s.title}</h3>${s.items.map((it) => `<label class="ck-item"><input type="checkbox" data-k="${p.id}:${it.id}"><span><b>${it.label}</b>${it.hint ? `<small>${it.hint}</small>` : ''}</span></label>`).join('')}</div>`).join('')}</div>
  </div>`).join('')}
  <p style="font-size:13px;color:var(--muted);margin:22px 4px 0">General guidance compiled from IRCC document requirements. Once you have an ITA or start an application, the personalized checklist in your IRCC account is the official list. In the app, each checklist is tied to your tracked application.</p>
</section>
${s5End('Keep every document on track.')}
${footerFull()}
</div>
<script>
(function(){
  var KEY='crspulse-checklists', state={};
  try{ state=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){} }
  var tabs=document.querySelectorAll('.ck-tabs button'), panels=document.querySelectorAll('.ck-panel');
  function progress(panel){
    var boxes=panel.querySelectorAll('input[type=checkbox]'), done=0;
    boxes.forEach(function(b){ if(b.checked) done++; });
    var pct=Math.round(done/boxes.length*100);
    panel.querySelector('.ck-count').textContent=done+' of '+boxes.length+' ready';
    panel.querySelector('.ck-pct').textContent=pct+'%';
    panel.querySelector('.ck-bar').style.width=pct+'%';
  }
  function show(id){
    var ok=false;
    panels.forEach(function(p){ var on=p.getAttribute('data-p')===id; p.hidden=!on; ok=ok||on; });
    if(!ok) return false;
    tabs.forEach(function(t){ t.classList.toggle('on',t.getAttribute('data-p')===id); });
    return true;
  }
  tabs.forEach(function(t){ t.addEventListener('click',function(){ var id=t.getAttribute('data-p'); show(id); history.replaceState(null,'','#'+id); }); });
  panels.forEach(function(panel){
    panel.querySelectorAll('input[type=checkbox]').forEach(function(b){
      b.checked=!!state[b.getAttribute('data-k')];
      b.addEventListener('change',function(){ if(b.checked) state[b.getAttribute('data-k')]=1; else delete state[b.getAttribute('data-k')]; save(); progress(panel); });
    });
    panel.querySelector('.ck-reset').addEventListener('click',function(){ panel.querySelectorAll('input[type=checkbox]').forEach(function(b){ b.checked=false; delete state[b.getAttribute('data-k')]; }); save(); progress(panel); });
    panel.querySelector('.ck-print').addEventListener('click',function(){ window.print(); });
    progress(panel);
  });
  if(location.hash) show(location.hash.slice(1));
})();
</script>`;
  return shell({ ...page('checklists'), body: noDashes(body) });
}


// ---------- application timeline
// The app's milestone types (mobile/src/store/timelineStore.ts), in the app's order, with a
// line on what each one means. Entries live in the visitor's browser only.
const MILESTONES_WEB = [
  ['ITA', 'ITA', 'bell', '#2E6FD4', 'Invitation to Apply. You have 60 days to submit your complete application.'],
  ['Application Submitted', 'Application submitted', 'arrowUp', '#0E8A63', 'Your e-APR is in and the fees are paid. IRCC’s processing time counts from here.'],
  ['AOR Received', 'AOR received', 'checklist', '#0E8A63', 'Acknowledgement of Receipt: IRCC confirms your application is complete enough to process.'],
  ['Biometrics Requested', 'Biometrics requested', 'timer', '#C07A0A', 'A Biometric Instruction Letter. You usually have 30 days to give fingerprints and a photo.'],
  ['Biometrics Completed', 'Biometrics completed', 'checkCircle', '#0E8A63', 'Fingerprints and photo given at a collection point.'],
  ['Medical Requested', 'Medical requested', 'timer', '#C07A0A', 'IRCC asks for an immigration medical exam with a panel physician.'],
  ['Medical Passed', 'Medical passed', 'checkCircle', '#0E8A63', 'Your medical results are on file and show as passed.'],
  ['Passport Requested', 'Passport requested', 'folder', '#C07A0A', 'Passport request (PPR): send your passport for the visa and COPR. Usually the last step for applicants outside Canada.'],
  ['Passport Submitted', 'Passport submitted', 'arrowUp', '#2E6FD4', 'Passport handed in at a visa application centre.'],
  ['Passport Collected', 'Passport collected', 'checkCircle', '#0E8A63', 'Passport back with your visa and COPR.'],
  ['ADR', 'ADR', 'folder', '#D9741A', 'Additional Document Request: IRCC needs something more before it can continue.'],
  ['Portal 1', 'PR portal 1', 'compass', '#7C5BD0', 'The PR confirmation portal asks you to confirm you are in Canada and your address.'],
  ['Portal 2', 'PR portal 2', 'compass', '#5B3FB0', 'You upload a photo for your PR card; the eCOPR usually follows.'],
  ['Final Decision', 'Final decision', 'award', '#D3342B', 'Approval, your COPR, and the end of the wait.'],
  ['Custom', 'Custom', 'pin', '#6B7A8D', 'Anything else worth a date: a background check, an MP inquiry, a GCMS note.'],
];

function timelinePage() {
  const META = Object.fromEntries(MILESTONES_WEB.map(([type, label, ic, color]) => [type, { label, color, icon: icon(ic, 18) }]));
  const body = `${nav('timeline', 'app')}
<div style="min-height:100vh;position:relative">
${pageHero('Your application,', 'step by step.', 'Log your ITA, AOR, biometrics, medical and passport dates. See the days between each step and how far along IRCC’s processing time you are. Everything stays in this browser.')}
<section style="max-width:1080px;margin:0 auto;padding:8px 24px 40px">
  <div class="tl-grid">
    <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
      <div data-reveal style="${resCard}">
        ${resH2('Add a milestone')}
        <form id="tl-form" class="fields" style="display:grid;grid-template-columns:1.3fr 1fr;gap:14px;margin-top:14px">
          <label style="${LBL}">Milestone<select id="tl-type" style="${SEL}">${MILESTONES_WEB.map(([type, label]) => `<option value="${type}">${label}</option>`).join('')}</select></label>
          <label style="${LBL}">Date<input id="tl-date" type="hidden" data-datepicker style="${INP}"></label>
          <label id="tl-custom-wrap" style="${LBL};grid-column:1/-1" hidden>Label<input id="tl-custom" type="text" maxlength="60" placeholder="e.g. Background check started" style="${INP}"></label>
          <label style="${LBL};grid-column:1/-1">Note (optional)<input id="tl-note" type="text" maxlength="140" placeholder="Anything worth remembering" style="${INP}"></label>
          <div style="grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap"><button type="submit" id="tl-save" class="btn btn-accent">Add milestone</button><button type="button" id="tl-cancel" class="btn btn-quiet" hidden>Cancel edit</button></div>
        </form>
      </div>
      <div data-reveal style="${resCard}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:6px"><h2 style="font-size:20px;margin:0">Your timeline</h2><div class="ck-actions" style="display:flex;gap:8px"><button type="button" id="tl-print" class="btn btn-quiet" style="padding:8px 13px;font-size:13.5px">Print</button><button type="button" id="tl-clear" class="btn btn-quiet" style="padding:8px 13px;font-size:13.5px">Clear all</button></div></div>
        <ol id="tl-list" class="tl-list"></ol>
        <div id="tl-empty" class="tl-empty"><p style="font-weight:700;color:var(--text);margin:0 0 4px">No milestones yet</p><p style="margin:0">Start with the date you got your ITA or submitted your application.</p></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
      <div data-reveal style="${resCard}">
        ${resH2('Against IRCC’s processing time', 'Counted from the date you submitted.')}
        <label style="${LBL};margin-bottom:16px">Your program<select id="tl-prog" style="${SEL}">${PT.map((c) => `<optgroup label="${c.label}">${c.types.map((t) => `<option value="${t.id}"${t.id === 'ee_cec' ? ' selected' : ''}>${t.label}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <div id="tl-progress"></div>
      </div>
      <div data-reveal style="${resCard}">
        ${resH2('What each step means')}
        <dl class="tl-gloss">${MILESTONES_WEB.filter(([t]) => t !== 'Custom').map(([, label, ic, color, desc]) => `<div><dt><span style="color:${color}">${icon(ic, 15)}</span>${label}</dt><dd>${desc}</dd></div>`).join('')}</dl>
      </div>
    </div>
  </div>
  <p style="font-size:13px;color:var(--muted);margin:22px 4px 0">The order varies by file: medicals can come before AOR, and applicants inside Canada usually get the PR portal instead of a passport request. Your IRCC account is the source of truth. The app keeps this timeline on your phone with reminders.</p>
</section>
${s5End('Carry your timeline in your pocket.')}
${footerFull()}
</div>
<script>
(function(){
  var KEY='crspulse-timeline', META=${jsonScript(META)}, PROG=${jsonScript(Object.fromEntries(PT_TYPES.map((t) => [t.id, { label: t.label, months: t.months }])))};
  var list=[], editing=null;
  try{ var raw=JSON.parse(localStorage.getItem(KEY)||'[]'); if(Array.isArray(raw)) list=raw.filter(function(m){ return m&&META[m.type]&&!isNaN(Date.parse(m.date)); }); }catch(e){}
  try{ var p=localStorage.getItem(KEY+'-program'); if(p&&PROG[p]) document.getElementById('tl-prog').value=p; }catch(e){}
  var $=function(id){ return document.getElementById(id); };
  var form=$('tl-form'), type=$('tl-type'), date=$('tl-date'), note=$('tl-note'), custom=$('tl-custom'), cwrap=$('tl-custom-wrap');
  function today(){ var d=new Date(); d.setHours(12,0,0,0); return d; }
  function at(s){ return new Date(s+'T12:00:00'); }
  function days(a,b){ return Math.round((b-a)/864e5); }
  function fmt(d){ return d.toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'}); }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(list)); }catch(e){} }
  function sorted(){ return list.slice().sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; }); }
  date.value=today().toISOString().slice(0,10);
  type.addEventListener('change',function(){ cwrap.hidden=type.value!=='Custom'; });
  function reset(){ editing=null; form.reset(); date.value=today().toISOString().slice(0,10); cwrap.hidden=true; $('tl-save').textContent='Add milestone'; $('tl-cancel').hidden=true; }
  $('tl-cancel').addEventListener('click',reset);
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!date.value) return;
    if(type.value==='Custom'&&!custom.value.trim()){ custom.focus(); return; }
    var m={ id: editing||String(Date.now()), type:type.value, date:date.value, note:note.value.trim(), customLabel:type.value==='Custom'?custom.value.trim():'' };
    if(editing) list=list.map(function(x){ return x.id===editing?m:x; }); else list.push(m);
    save(); reset(); render();
  });
  $('tl-clear').addEventListener('click',function(){ if(!list.length) return; if(!$('tl-clear').dataset.armed){ $('tl-clear').dataset.armed='1'; $('tl-clear').textContent='Tap again to clear'; setTimeout(function(){ delete $('tl-clear').dataset.armed; $('tl-clear').textContent='Clear all'; },3000); return; } list=[]; save(); reset(); render(); delete $('tl-clear').dataset.armed; $('tl-clear').textContent='Clear all'; });
  $('tl-print').addEventListener('click',function(){ window.print(); });
  $('tl-prog').addEventListener('change',function(){ try{ localStorage.setItem(KEY+'-program',this.value); }catch(e){} progress(); });
  $('tl-list').addEventListener('click',function(e){
    var b=e.target.closest('button[data-act]'); if(!b) return;
    var id=b.closest('li').getAttribute('data-id'), m=list.filter(function(x){ return x.id===id; })[0]; if(!m) return;
    if(b.getAttribute('data-act')==='del'){ list=list.filter(function(x){ return x.id!==id; }); save(); if(editing===id) reset(); render(); return; }
    editing=id; type.value=m.type; date.value=m.date; note.value=m.note||''; custom.value=m.customLabel||''; cwrap.hidden=m.type!=='Custom';
    $('tl-save').textContent='Save changes'; $('tl-cancel').hidden=false; form.scrollIntoView({behavior:'smooth',block:'center'});
  });
  function render(){
    var s=sorted(), t=today(), out='';
    $('tl-empty').hidden=s.length>0;
    s.forEach(function(m,i){
      var meta=META[m.type], d=at(m.date), ago=days(d,t), gap=i?days(at(s[i-1].date),d):null;
      var when=ago===0?'today':ago>0?ago+' day'+(ago===1?'':'s')+' ago':'in '+(-ago)+' day'+(ago===-1?'':'s');
      var label=m.type==='Custom'&&m.customLabel?esc(m.customLabel):meta.label;
      out+='<li data-id="'+m.id+'">'+(gap!==null?'<div class="tl-gap">+'+gap+' day'+(gap===1?'':'s')+'</div>':'')
        +'<div class="tl-item"><span class="tl-ic" style="color:'+meta.color+';background:color-mix(in srgb, '+meta.color+' 14%, transparent)">'+meta.icon+'</span>'
        +'<div style="min-width:0;flex:1"><b>'+label+'</b><span>'+fmt(d)+' · '+when+'</span>'+(m.note?'<em>'+esc(m.note)+'</em>':'')+'</div>'
        +'<div class="tl-act"><button type="button" data-act="edit" aria-label="Edit">Edit</button><button type="button" data-act="del" aria-label="Delete">Delete</button></div></div></li>';
    });
    $('tl-list').innerHTML=out;
    progress();
  }
  function progress(){
    var p=PROG[$('tl-prog').value], s=sorted(), box=$('tl-progress');
    var start=s.filter(function(m){ return m.type==='Application Submitted'; })[0]||s.filter(function(m){ return m.type==='AOR Received'; })[0];
    if(!p){ box.innerHTML=''; return; }
    if(!start){ box.innerHTML='<p style="font-size:14px;color:var(--text2);margin:0">Add your <b>Application submitted</b> date to see how far along you are. IRCC currently takes about <b>'+p.months+' months</b> for this program.</p>'; return; }
    var d0=at(start.date), end=new Date(d0.getTime()+p.months*30.44*864e5), t=today(), el=Math.max(0,days(d0,t)), total=days(d0,end), pct=Math.min(100,Math.round(el/total*100));
    var done=s.some(function(m){ return m.type==='Final Decision'; });
    box.innerHTML='<div class="klabel">'+(done?'Decided':'Day '+el+' of about '+total)+'</div>'
      +'<div class="pt-big">'+(done?'Approved':pct+'%')+'</div>'
      +'<div class="pt-prog" style="margin:10px 0 12px"><div style="width:'+(done?100:pct)+'%"></div></div>'
      +'<p style="font-size:14px;color:var(--text2);margin:0">'+(done?'Congratulations. Your final decision is logged.':'Typical decision around <b>'+fmt(end)+'</b>, based on IRCC’s '+p.months+'-month time for '+esc(p.label)+'.')+'</p>';
  }
  render();
})();
</script>`;
  return shell({ ...page('timeline'), body: noDashes(body) });
}

// ------------------------------------------------------------------ CALCULATORS
// Option lists (verbatim from the design component).
const CRS_EDU_OPTS = [{ v: 'less_than_secondary', l: 'Less than secondary' }, { v: 'secondary', l: 'Secondary / high school' }, { v: '1year', l: '1-year post-secondary' }, { v: '2year', l: '2-year post-secondary' }, { v: 'bachelors', l: "Bachelor's degree" }, { v: 'two_or_more', l: 'Two or more credentials' }, { v: 'masters', l: "Master's / professional" }, { v: 'phd', l: 'Doctoral (PhD)' }];
const CWE_OPTS = [{ v: 0, l: 'None' }, { v: 1, l: '1 year' }, { v: 2, l: '2 years' }, { v: 3, l: '3 years' }, { v: 4, l: '4 years' }, { v: 5, l: '5+ years' }];
const FSW_EDU_OPTS = [{ v: 'phd', l: 'Doctoral (PhD)' }, { v: 'masters_professional', l: "Master's / professional" }, { v: 'two_or_more', l: 'Two or more credentials' }, { v: 'bachelors_3yr', l: '3-year+ degree' }, { v: 'diploma_2yr', l: '2-year diploma' }, { v: 'diploma_1yr', l: '1-year diploma' }, { v: 'secondary', l: 'Secondary' }];
const FSW_WORK_OPTS = [{ v: 'none', l: 'None' }, { v: '1', l: '1 year' }, { v: '2_3', l: '2–3 years' }, { v: '4_5', l: '4–5 years' }, { v: '6plus', l: '6+ years' }];
const SIRS_WORK_OPTS = [{ v: 'none', l: 'None' }, { v: '1_2', l: '1–2 years' }, { v: '2_3', l: '2–3 years' }, { v: '3_4', l: '3–4 years' }, { v: '4_5', l: '4–5 years' }, { v: '5plus', l: '5+ years' }];
const SIRS_EDU_OPTS = [{ v: 'doctorate', l: 'Doctorate' }, { v: 'masters', l: "Master's" }, { v: 'postgrad_cert', l: 'Post-grad certificate' }, { v: 'bachelors', l: "Bachelor's" }, { v: 'associate', l: 'Associate degree' }, { v: 'diploma_cert', l: 'Diploma / certificate' }, { v: 'secondary', l: 'Secondary' }];
const SIRS_CLB_OPTS = [{ v: 'clb9plus', l: 'CLB 9+' }, { v: 'clb8', l: 'CLB 8' }, { v: 'clb7', l: 'CLB 7' }, { v: 'clb6', l: 'CLB 6' }, { v: 'clb5', l: 'CLB 5' }, { v: 'clb4', l: 'CLB 4' }, { v: 'below4', l: 'Below CLB 4' }];
const SINP_EDU_OPTS = [{ v: 'masters_phd', l: "Master's / PhD" }, { v: 'bachelors', l: "Bachelor's (3-4 yr)" }, { v: 'trade_cert', l: 'Trade certificate' }, { v: 'diploma_2yr', l: '2-year diploma' }, { v: 'diploma_1yr', l: '1-year diploma' }, { v: 'none', l: 'None' }];
const SINP_AGE_OPTS = [{ v: 'under18', l: 'Under 18' }, { v: '18_21', l: '18–21' }, { v: '22_34', l: '22–34' }, { v: '35_45', l: '35–45' }, { v: '46_50', l: '46–50' }, { v: 'over50', l: 'Over 50' }];
const SINP_CLB_OPTS = [{ v: 'clb8plus', l: 'CLB 8+' }, { v: 'clb7', l: 'CLB 7' }, { v: 'clb6', l: 'CLB 6' }, { v: 'clb5', l: 'CLB 5' }, { v: 'clb4', l: 'CLB 4' }, { v: 'below4', l: 'Below CLB 4 / none' }];
const YEAR_OPTS = [{ v: 0, l: '0 years' }, { v: 1, l: '1 year' }, { v: 2, l: '2 years' }, { v: 3, l: '3 years' }, { v: 4, l: '4 years' }, { v: 5, l: '5 years' }];

const STATE0 = {
  crs: { maritalStatus: 'single', age: 29, education: 'bachelors', canadianEducation: 'none', firstLang: { speaking: 9, listening: 9, reading: 9, writing: 9 }, hasSecondLang: false, secondLang: { speaking: 0, listening: 0, reading: 0, writing: 0 }, canadianWorkExp: 1, foreignWorkExp: 1, spouseEducation: 'bachelors', spouseLang: { speaking: 0, listening: 0, reading: 0, writing: 0 }, spouseCanadianWorkExp: 0, hasProvincialNomination: false, hasSiblingInCanada: false, hasTradeCert: false },
  fsw: { age: 30, education: 'bachelors_3yr', workYears: '4_5', firstClb: { speaking: 9, listening: 9, reading: 9, writing: 9 }, secondLangClb5: false, hasArrangedEmployment: false, studiedInCanada: false, workedInCanada: false, hasRelativeInCanada: false, spouseLangClb4: false, spouseStudiedInCanada: false, spouseWorkedInCanada: false },
  sirs: { workYears: '4_5', hasCanadianExp: false, currentlyWorkingInJob: false, education: 'bachelors', educationLocation: 'outside', hasTradesOrProfessionalCert: false, language: 'clb8', bothOfficialLanguages: false, hourlyWage: 32, region: 'metro_vancouver', hasRegionalExperience: false },
  sinp: { education: 'bachelors', age: '22_34', language: 'clb7', secondLanguage: 'below4', workRecentYears: 3, workEarlierYears: 0, hasSaskJobOffer: false, hasSaskFamily: false, hasSaskWorkExp: false, hasSaskStudy: false },
};

const SEL = 'padding:11px 34px 11px 12px;border-radius:10px;border:1px solid var(--border);background-color:var(--input);color:var(--text);font-size:14px;font-weight:500';
const SEL_SM = 'padding:10px 30px 10px 11px;border-radius:10px;border:1px solid var(--border);background-color:var(--input);color:var(--text);font-size:14px';
const INP = 'padding:11px 12px;border-radius:10px;border:1px solid var(--border);background-color:var(--input);color:var(--text);font-size:14px;font-weight:500';
const LBL = 'display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--text2);font-weight:600';
const LBL_SM = 'display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--text2);font-weight:600';
const CARD = 'background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px';
const CARDLABEL = 'font-size:12.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px;margin-bottom:16px';

const optTag = (o, cur) => `<option value="${o.v}"${String(o.v) === String(cur) ? ' selected' : ''}>${o.l}</option>`;
// Language inputs: people know their test scores, not CLB levels, so each block takes
// a test and raw scores and converts them live (clb.mjs). Keyed by the state path that
// receives the CLB levels. Defaults are IELTS scores that land on CLB 9 everywhere.
const RAW_EMPTY = { speaking: '', listening: '', reading: '', writing: '' };
const LANG0 = {
  'crs.firstLang': { test: 'ielts', same: false, raw: { speaking: '7.0', listening: '8.0', reading: '7.0', writing: '7.0' } },
  'crs.secondLang': { test: 'tef', same: false, raw: { ...RAW_EMPTY } },
  'crs.spouseLang': { test: 'ielts', same: false, raw: { ...RAW_EMPTY } },
  'fsw.firstClb': { test: 'ielts', same: false, raw: { speaking: '7.0', listening: '8.0', reading: '7.0', writing: '7.0' } },
};
for (const [key, L] of Object.entries(LANG0)) {
  const target = Object.fromEntries(SKILLS.map((sk) => [sk, toClb(L.test, sk, L.raw[sk])]));
  const [form, field] = key.split('.');
  STATE0[form][field] = target;
}
const langOpts = (langs, cur) => Object.entries(LANG_TESTS).filter(([, t]) => langs.includes(t.lang))
  .map(([k, t]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${t.name}</option>`).join('');
const rawRange = (test, sk) => { const r = LANG_TESTS[test].range; return `min="${r.min}" max="${r.small?.[sk] ?? r.max}" step="${r.step}"`; };
const capWord = (w) => w[0].toUpperCase() + w.slice(1);
const langBlock = (key, langs) => {
  const L = LANG0[key];
  return `<div class="langblock" data-lang="${key}">
  <div class="langhead">
    <label style="${LBL_SM}">Test<select data-langtest style="${SEL_SM}">${langOpts(langs, L.test)}</select></label>
    <label class="sametoggle"><input type="checkbox" data-langsame> Same score for all four</label>
  </div>
  <div class="fields4 langfour" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">${SKILLS.map((sk) => `<label style="${LBL_SM}">${capWord(sk)}<input data-langraw="${sk}" type="number" inputmode="decimal" ${rawRange(L.test, sk)} value="${L.raw[sk]}" placeholder="Score" style="${INP}"><span class="clbout" data-clbout="${sk}"></span></label>`).join('')}</div>
  <div class="langone" hidden><label style="${LBL_SM};max-width:240px">Score, all four abilities<input data-langraw="all" type="number" inputmode="decimal" ${rawRange(L.test, 'speaking')} value="" placeholder="Score" style="${INP}"><span class="clbout" data-clbout="all"></span></label></div>
</div>`;
};
const LANG_HINT = '<p class="langhint">Pick your test and enter your scores. They are converted to CLB levels as you type.</p>';
// Newest Canadian Experience Class round, the benchmark the score card compares against.
const LAST_CEC = (() => { const r = FEED.rounds.find((x) => x.label === 'Canadian Experience Class'); return r ? { no: r.number, crs: r.crs, date: r.dateFull } : null; })();

const lblSelect = (field, cur, opts, label, style = SEL, lblStyle = LBL) =>
  `<label style="${lblStyle}">${label}<select data-field="${field}" style="${style}">${opts.map((o) => optTag(o, cur)).join('')}</select></label>`;
const lblInput = (field, cur, label, attrs) =>
  `<label style="${LBL}">${label}<input data-field="${field}" value="${cur}" ${attrs} style="${INP}"></label>`;
const rawSelect = (field, cur, opts) => `<select data-field="${field}" style="${SEL}">${opts.map((o) => optTag(o, cur)).join('')}</select>`;
const chip = (field, label) => `<button type="button" class="chip toggle" data-field="${field}" aria-pressed="false">${label}</button>`;

function calcForms() {
  const c = STATE0.crs, f = STATE0.fsw, s = STATE0.sirs, sn = STATE0.sinp;
  const crsForm = `
<div id="form-crs" style="display:flex;flex-direction:column;gap:22px">
  <div style="${CARD}">
    <div style="${CARDLABEL}">Core / human capital</div>
    <div class="fields" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${lblSelect('crs.maritalStatus', c.maritalStatus, [{ v: 'single', l: 'Single / not married' }, { v: 'married', l: 'Married / common-law' }, { v: 'married_not_accompanying', l: 'Married — spouse not accompanying' }], 'Marital status')}
      ${lblInput('crs.age', c.age, 'Age', 'type="number" min="17" max="55"')}
      ${lblSelect('crs.education', c.education, CRS_EDU_OPTS, 'Education level')}
      ${lblSelect('crs.canadianEducation', c.canadianEducation, [{ v: 'none', l: 'No' }, { v: '1_2year', l: 'Yes, a 1–2 year program (+15)' }, { v: '3year_plus', l: 'Yes, 3+ years or graduate (+30)' }], 'Studied in Canada after high school?')}
    </div>
  </div>
  <div style="${CARD}">
    <div style="font-size:12.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">First official language</div>
    ${LANG_HINT}
    ${langBlock('crs.firstLang', ['en', 'fr'])}
    <button type="button" class="chip" id="crs-second-chip" data-field="crs.hasSecondLang" style="margin-top:16px">+ Add French (second official language)</button>
    <div id="crs-second" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline)">
      <div class="langsub">Second official language. The French bonus (up to +50) is added automatically from these scores.</div>
      ${langBlock('crs.secondLang', ['fr'])}
    </div>
  </div>
  <div style="${CARD}">
    <div style="${CARDLABEL}">Work experience</div>
    <div class="fields" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${lblSelect('crs.canadianWorkExp', c.canadianWorkExp, CWE_OPTS, 'Canadian work experience')}
      ${lblSelect('crs.foreignWorkExp', c.foreignWorkExp, [{ v: 0, l: 'None' }, { v: 1, l: '1–2 years' }, { v: 3, l: '3+ years' }], 'Foreign work experience')}
    </div>
  </div>
  <div id="crs-spouse" style="display:none">
    <div style="${CARD}">
      <div style="${CARDLABEL}">Spouse / common-law partner</div>
      <div class="fields" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        ${lblSelect('crs.spouseEducation', c.spouseEducation, CRS_EDU_OPTS, 'Spouse education')}
        ${lblSelect('crs.spouseCanadianWorkExp', c.spouseCanadianWorkExp, CWE_OPTS, 'Spouse Canadian work exp.')}
      </div>
      <div class="langsub">Spouse's language test (English or French)</div>
      ${langBlock('crs.spouseLang', ['en', 'fr'])}
    </div>
  </div>
  <div style="${CARD}">
    <div style="font-size:12.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">Additional points</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${chip('crs.hasProvincialNomination', 'Provincial nomination (+600)')}${chip('crs.hasSiblingInCanada', 'Brother or sister in Canada (+15)')}${chip('crs.hasTradeCert', 'Trade certificate of qualification (up to +50)')}
    </div>
  </div>
</div>`;

  const fswForm = `
<div id="form-fsw" style="display:none;flex-direction:column;gap:22px">
  <div style="${CARD}">
    <div style="${CARDLABEL}">Selection factors</div>
    <div class="fields" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${lblInput('fsw.age', f.age, 'Age', 'type="number" min="16" max="60"')}
      ${lblSelect('fsw.education', f.education, FSW_EDU_OPTS, 'Education')}
      ${lblSelect('fsw.workYears', f.workYears, FSW_WORK_OPTS, 'Skilled work experience')}
    </div>
  </div>
  <div style="${CARD}">
    <div style="${CARDLABEL};margin-bottom:6px">First official language</div>
    ${LANG_HINT}
    ${langBlock('fsw.firstClb', ['en', 'fr'])}
  </div>
  <div style="${CARD}">
    <div style="font-size:12.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">Points bonuses &amp; adaptability</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${chip('fsw.secondLangClb5', '2nd language CLB 5+ (+4)')}${chip('fsw.hasArrangedEmployment', 'Arranged employment')}${chip('fsw.studiedInCanada', 'You studied in Canada')}${chip('fsw.workedInCanada', 'You worked in Canada')}${chip('fsw.hasRelativeInCanada', 'Relative in Canada')}${chip('fsw.spouseLangClb4', 'Spouse language CLB 4+')}${chip('fsw.spouseStudiedInCanada', 'Spouse studied in Canada')}${chip('fsw.spouseWorkedInCanada', 'Spouse worked in Canada')}
    </div>
  </div>
</div>`;

  const bcForm = `
<div id="form-bc" style="display:none;flex-direction:column;gap:22px">
  <div style="${CARD}">
    <div style="${CARDLABEL}">Human capital &amp; economic factors</div>
    <div class="fields" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${lblSelect('sirs.workYears', s.workYears, SIRS_WORK_OPTS, 'Directly-related work experience')}
      ${lblSelect('sirs.education', s.education, SIRS_EDU_OPTS, 'Highest education')}
      ${lblSelect('sirs.educationLocation', s.educationLocation, [{ v: 'bc', l: 'In British Columbia' }, { v: 'canada', l: 'Elsewhere in Canada' }, { v: 'outside', l: 'Outside Canada' }], 'Where you studied')}
      ${lblSelect('sirs.language', s.language, SIRS_CLB_OPTS, 'English/French ability (CLB)')}
      ${lblInput('sirs.hourlyWage', s.hourlyWage, 'Hourly wage of B.C. job offer (CAD)', 'type="number" min="0" max="120"')}
      ${lblSelect('sirs.region', s.region, [{ v: 'metro_vancouver', l: 'Metro Vancouver' }, { v: 'area2', l: 'Area 2 (Abbotsford, Chilliwack, Squamish…)' }, { v: 'area3', l: 'Area 3 (rest of B.C.)' }], 'Region of employment')}
    </div>
  </div>
  <div style="${CARD}">
    <div style="font-size:12.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">Bonuses</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${chip('sirs.hasCanadianExp', 'Canadian work experience')}${chip('sirs.currentlyWorkingInJob', 'Currently in the B.C. job')}${chip('sirs.hasTradesOrProfessionalCert', 'Trades / professional cert')}${chip('sirs.bothOfficialLanguages', 'Both official languages')}${chip('sirs.hasRegionalExperience', 'Regional experience bonus')}
    </div>
  </div>
</div>`;

  const sinpForm = `
<div id="form-sinp" style="display:none;flex-direction:column;gap:22px">
  <div style="${CARD}">
    <div style="${CARDLABEL}">EOI points grid</div>
    <div class="fields" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${lblSelect('sinp.education', sn.education, SINP_EDU_OPTS, 'Education / training')}
      ${lblSelect('sinp.age', sn.age, SINP_AGE_OPTS, 'Age')}
      ${lblSelect('sinp.language', sn.language, SINP_CLB_OPTS, 'First language (CLB)')}
      ${lblSelect('sinp.secondLanguage', sn.secondLanguage, SINP_CLB_OPTS, 'Second official language (CLB)')}
      ${lblSelect('sinp.workRecentYears', sn.workRecentYears, YEAR_OPTS, 'Work in field — last 5 yrs')}
      ${lblSelect('sinp.workEarlierYears', sn.workEarlierYears, YEAR_OPTS, 'Work in field — 6–10 yrs ago')}
    </div>
  </div>
  <div style="${CARD}">
    <div style="font-size:12.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">Connection to Saskatchewan</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${chip('sinp.hasSaskJobOffer', 'Sask. job offer (+30)')}${chip('sinp.hasSaskFamily', 'Close family in Sask. (+20)')}${chip('sinp.hasSaskWorkExp', 'Past Sask. work (+5)')}${chip('sinp.hasSaskStudy', 'Studied in Sask. (+5)')}
    </div>
  </div>
</div>`;

  return { crs: crsForm, fsw: fswForm, bc: bcForm, sinp: sinpForm };
}

// The CRS grid, kept as source text so it has exactly one definition: it is interpolated
// into the in-browser calculator engine below, and evaluated here at build time so the
// homepage preview can show a score the calculator itself would produce.
const CRS_CALC_SRC = `
function crsCalc(i){
  var married = i.maritalStatus === 'married';
  var AGE_S = {17:0,18:99,19:105,20:110,21:110,22:110,23:110,24:110,25:110,26:110,27:110,28:110,29:110,30:105,31:99,32:94,33:88,34:83,35:77,36:72,37:66,38:61,39:55,40:50,41:39,42:28,43:17,44:6};
  var AGE_M = {17:0,18:90,19:95,20:100,21:100,22:100,23:100,24:100,25:100,26:100,27:100,28:100,29:100,30:95,31:90,32:85,33:80,34:75,35:70,36:65,37:60,38:55,39:50,40:45,41:35,42:25,43:15,44:5};
  var ageC = Math.min(55, Math.max(17, i.age));
  var agePts = (married ? AGE_M : AGE_S)[ageC] || 0;
  var EDU_S = {less_than_secondary:0,secondary:30,'1year':90,'2year':98,bachelors:120,two_or_more:128,masters:135,phd:150};
  var EDU_M = {less_than_secondary:0,secondary:28,'1year':84,'2year':91,bachelors:112,two_or_more:119,masters:126,phd:140};
  var eduPts = (married ? EDU_M : EDU_S)[i.education] || 0;
  var fl = function(clb){ return married
    ? (clb>=10?32:clb===9?29:clb===8?22:clb===7?16:clb===6?8:clb>=4?6:0)
    : (clb>=10?34:clb===9?31:clb===8?23:clb===7?17:clb===6?9:clb>=4?6:0); };
  var F = i.firstLang;
  var firstLangPts = fl(F.speaking)+fl(F.listening)+fl(F.reading)+fl(F.writing);
  var sl = function(clb){ return clb>=9?6:clb>=7?3:clb>=5?1:0; };
  var S = i.hasSecondLang ? i.secondLang : {speaking:0,listening:0,reading:0,writing:0};
  var secondRaw = sl(S.speaking)+sl(S.listening)+sl(S.reading)+sl(S.writing);
  var secondLangPts = Math.min(married?22:24, secondRaw);
  var CWE_S = {0:0,1:40,2:53,3:64,4:72,5:80}, CWE_M = {0:0,1:35,2:46,3:56,4:63,5:70};
  var cwePts = (married ? CWE_M : CWE_S)[i.canadianWorkExp] || 0;
  var coreTotal = agePts + eduPts + firstLangPts + secondLangPts + cwePts;
  var spEdu=0, spLang=0, spCwe=0;
  if (married) {
    var SPE = {less_than_secondary:0,secondary:2,'1year':6,'2year':7,bachelors:8,two_or_more:9,masters:10,phd:10};
    spEdu = SPE[i.spouseEducation]||0;
    var spl = function(clb){ return clb>=9?5:clb>=7?3:clb>=5?1:0; };
    var SP = i.spouseLang;
    spLang = spl(SP.speaking)+spl(SP.listening)+spl(SP.reading)+spl(SP.writing);
    var SPC = {0:0,1:5,2:7,3:8,4:9,5:10};
    spCwe = SPC[i.spouseCanadianWorkExp]||0;
  }
  var spouseTotal = spEdu + spLang + spCwe;
  var minClb = Math.min(F.speaking,F.listening,F.reading,F.writing);
  var topTier = ['two_or_more','masters','phd'].indexOf(i.education)>=0;
  var postSec = i.education!=='less_than_secondary' && i.education!=='secondary';
  var cwe=i.canadianWorkExp, fwe=i.foreignWorkExp;
  var eduLang=0;
  if(postSec){ if(topTier){ if(minClb>=9)eduLang=50; else if(minClb>=7)eduLang=25; } else { if(minClb>=9)eduLang=25; else if(minClb>=7)eduLang=13; } }
  var eduCWE=0;
  if(postSec && cwe>=1){ if(topTier)eduCWE=cwe>=2?50:25; else eduCWE=cwe>=2?25:13; }
  var eduPtsT = Math.min(50, Math.min(50,eduLang)+Math.min(50,eduCWE));
  var fweLang=0;
  if(fwe>=1 && minClb>=7){ var hf=fwe>=3, hl=minClb>=9; if(hf&&hl)fweLang=50; else if(hf)fweLang=25; else if(hl)fweLang=25; else fweLang=13; }
  var fweCWE=0;
  if(fwe>=1 && cwe>=1){ if(fwe>=3&&cwe>=2)fweCWE=50; else if(fwe>=3)fweCWE=25; else if(cwe>=2)fweCWE=25; else fweCWE=13; }
  var tradePts=0;
  if(i.hasTradeCert){ if(minClb>=7)tradePts=50; else if(minClb>=5)tradePts=25; }
  var foreignPts = Math.min(50, Math.min(50,fweLang)+Math.min(50,fweCWE));
  var skillPts = Math.min(100, eduPtsT + foreignPts + Math.min(50,tradePts));
  var addPts = 0;
  if (i.hasProvincialNomination) addPts = 600;
  else {
    if (i.canadianEducation==='3year_plus') addPts+=30; else if (i.canadianEducation==='1_2year') addPts+=15;
    if (i.hasSiblingInCanada) addPts+=15;
    if (i.frenchNCLC7) addPts += ((i.englishMin != null ? i.englishMin : minClb)>=5 ? 50 : 25);
    addPts = Math.min(600, addPts);
  }
  var total = Math.min(1200, coreTotal + spouseTotal + skillPts + addPts);
  return { total:total, minClb:minClb, rows:[
    { label:'Age', val:agePts, max:married?100:110 },
    { label:'Education', val:eduPts, max:married?140:150 },
    { label:'Language (1st + 2nd)', val:firstLangPts + secondLangPts, max:married?150:160 },
    { label:'Canadian work experience', val:cwePts, max:married?70:80 },
    { label:'Spouse factors', val:spouseTotal, max:40 },
    { label:'Skill transferability', val:skillPts, max:100 },
    { label:'Additional points', val:addPts, max:600 },
  ] };
}
`;
const crsCalc = new Function(`${CRS_CALC_SRC}\nreturn crsCalc;`)();

// ------------------------------------------------------------------ GUIDES
// Long-form pages from guides.mjs. They join PAGES (sitemap, llms.txt, 404, twins)
// after the feature tour and before the legal pages.
const GUIDES = buildGuides({ crsCalc, FEED, SITE, CONTACT, APP_STORE_URL });
const GUIDE_PAGES = [GUIDES.hub, ...GUIDES.guides, GUIDES.about];
PAGES.splice(PAGES.findIndex((p) => p.file === 'privacy'), 0, ...GUIDE_PAGES);
const GUIDE_LINKS = [['/guides', 'All guides'], ...GUIDES.guides.map((g) => [g.path, g.title.replace(/:.*$/, '').replace(/^How the CRS Score Is Calculated$/, 'How CRS is calculated')])];
const absLinks = (md) => md.replace(/\]\(\//g, `](${SITE}/`);

const guideJsonLd = (g) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: g.title,
  description: g.description,
  url: `${SITE}${g.path}`,
  mainEntityOfPage: `${SITE}${g.path}`,
  datePublished: GUIDES_REVIEWED,
  dateModified: GUIDES_REVIEWED,
  inLanguage: 'en-CA',
  image: `${SITE}/img/og.png`,
  author: { '@type': 'Organization', name: 'CRS Pulse', url: `${SITE}/about` },
  publisher: { '@type': 'Organization', name: 'CRS Pulse', logo: { '@type': 'ImageObject', url: `${SITE}/img/logo.svg` } },
});

function guidePage(g) {
  const byFile = Object.fromEntries(GUIDES.guides.map((x) => [x.file, x]));
  const html = addHeadingIds(marked.parse(g.md));
  // The H1 stays first; the reviewed line and the breadcrumb sit around it.
  const [h1, ...rest] = html.split(/(?<=<\/h1>)/);
  const crumbs = g.hub || g.about
    ? ''
    : `<nav class="guide-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/guides">Guides</a></nav>`;
  const meta = g.hub || g.about ? '' : `<p class="guide-meta">Last reviewed ${new Date(`${GUIDES_REVIEWED}T12:00:00Z`).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} against IRCC's published rules. Estimates only, not immigration advice.</p>`;
  const related = (g.related || []).map((f) => byFile[f]).filter(Boolean);
  const relatedBlock = related.length
    ? `<section class="guide-related"><h2>Related guides</h2><div class="guide-cards">${related.map((r) => `<a href="${r.path}">${r.title.replace(/:.*$/, '')}<small>${r.short}</small></a>`).join('')}</div></section>`
    : '';
  const cta = g.about
    ? ''
    : `<div class="guide-cta"><p>Run your own numbers: the CRS, FSW, BC PNP and SINP calculators work in your browser and keep everything you enter on your device.</p>${accentBtn('/crs-calculator', 'Open the calculators')}</div>`;
  const body = `${nav(g.hub ? 'guides' : g.about ? '' : 'guides', 'calc')}
<div style="min-height:100vh;position:relative">
<main class="doc"><article class="doc-card">${crumbs}${h1}${meta}${rest.join('')}${cta}${relatedBlock}</article></main>
${footerFull()}
</div>`;
  return shell({ ...page(g.file), jsonld: g.hub || g.about ? null : guideJsonLd(g), body });
}
const guideMd = (g) => `${absLinks(g.md)}${g.hub || g.about ? '' : `\nLast reviewed ${GUIDES_REVIEWED} against IRCC's published rules.\n`}\n${MD_FOOTER}\n`;

// Client engine: calc functions verbatim from the design component.
const calcScript = (ACTIVE) => `<script>
(function(){
  var state = ${JSON.stringify(STATE0)};
  var active = '${ACTIVE}';
  var TITLES = { crs:'CRS: Express Entry score', fsw:'Federal Skilled Worker: 67-point grid', bc:'BC PNP: SIRS score', sinp:'Saskatchewan SINP: EOI points' };
  var SUBS = { crs:'Official IRCC Comprehensive Ranking System, out of 1,200.', fsw:'Six selection factors — 67 of 100 needed to be eligible.', bc:'Skills Immigration Registration System, out of 200.', sinp:'International Skilled Worker EOI — 60 of 110 to qualify.' };

  function getPath(f){ return f.split('.').reduce(function(o,k){ return o==null?o:o[k]; }, state); }
  function setPath(f,v){ var p=f.split('.'); var o=state; for(var i=0;i<p.length-1;i++){ o=o[p[i]]; } o[p[p.length-1]]=v; }
  function bar(pct,color){ return 'height:100%;border-radius:6px;width:'+Math.max(0,Math.min(100,pct))+'%;background:'+color; }
${CLB_CLIENT_SRC}
  var LANG = ${JSON.stringify(LANG0)};
  var SKILLS = ['speaking','listening','reading','writing'];
  var LAST_CEC = ${JSON.stringify(LAST_CEC)};
  var OPTS = { en: ${JSON.stringify(langOpts(['en'], ''))}, fr: ${JSON.stringify(langOpts(['fr'], ''))} };
  function minOf(o){ return Math.min(o.speaking,o.listening,o.reading,o.writing); }
  function langOf(key){ return CLB_TESTS[LANG[key].test].lang; }
  // CRS input with the French bonus derived from whichever test is French.
  function crsInput(over, secondFr){
    var s=Object.assign({}, state.crs, over||{});
    var firstFr = langOf('crs.firstLang')==='fr';
    var sFr = secondFr!=null ? secondFr : langOf('crs.secondLang')==='fr';
    var second = s.hasSecondLang ? s.secondLang : null;
    var fr = firstFr ? minOf(s.firstLang) : (second && sFr ? minOf(second) : 0);
    var en = firstFr ? (second && !sFr ? minOf(second) : 0) : minOf(s.firstLang);
    s.frenchNCLC7 = fr>=7; s.englishMin = en; return s;
  }
  // One line: the single change worth the most points for this profile.
  function boost(){
    var s=state.crs; if (s.hasProvincialNomination) return null;
    var base=crsCalc(crsInput()).total, best=null;
    function tryIt(label, over, sFr){ var d=crsCalc(crsInput(over, sFr)).total-base; if(d>0 && (!best || d>best.d)) best={ label:label, d:d }; }
    var F=s.firstLang, m=minOf(F), unit=langOf('crs.firstLang')==='fr'?'NCLC':'CLB';
    if (m<10){ var t=Math.max(4,m+1), nf={}; SKILLS.forEach(function(k){ nf[k]=Math.max(F[k],t); }); tryIt('Every language ability at '+unit+' '+t+' or higher', { firstLang:nf }); }
    if (langOf('crs.firstLang')==='en'){
      var cur = s.hasSecondLang ? s.secondLang : {speaking:0,listening:0,reading:0,writing:0};
      if (!(s.hasSecondLang && langOf('crs.secondLang')==='fr' && minOf(cur)>=7)){ var f7={}; SKILLS.forEach(function(k){ f7[k]=Math.max(cur[k],7); }); tryIt('French at NCLC 7 in all four abilities', { hasSecondLang:true, secondLang:f7 }, true); }
    }
    if (s.canadianWorkExp<5) tryIt('One more year of skilled work in Canada', { canadianWorkExp:s.canadianWorkExp+1 });
    if (['masters','phd'].indexOf(s.education)<0) tryIt('A master\u2019s degree', { education:'masters' });
    if (s.maritalStatus==='married' && minOf(s.spouseLang)<9) tryIt('Your spouse at CLB 9 in all four abilities', { spouseLang:{speaking:9,listening:9,reading:9,writing:9} });
    return best;
  }

${CRS_CALC_SRC}
  function fswCalc(i){
    var LANG = { clb9plus:6, clb8:5, clb7:4, below7:0 };
    var EDU = { phd:25, masters_professional:23, two_or_more:22, bachelors_3yr:21, diploma_2yr:19, diploma_1yr:15, secondary:5 };
    var WORK = { none:0, '1':9, '2_3':11, '4_5':13, '6plus':15 };
    var agePts = (i.age<18||i.age>=47)?0:(i.age<=35?12:Math.max(0,12-(i.age-35)));
    var C = i.firstClb, P = function(c){ return c>=9?6:c===8?5:c===7?4:0; };
    var minFirst = Math.min(C.speaking,C.listening,C.reading,C.writing);
    var language = Math.min(28, P(C.speaking)+P(C.listening)+P(C.reading)+P(C.writing) + (i.secondLangClb5?4:0));
    var education = EDU[i.education];
    var work = WORK[i.workYears];
    var arranged = i.hasArrangedEmployment?10:0;
    var adapt = Math.min(10,
      (i.spouseLangClb4?5:0)+(i.studiedInCanada?5:0)+(i.spouseStudiedInCanada?5:0)+
      (i.workedInCanada?10:0)+(i.spouseWorkedInCanada?5:0)+(i.hasArrangedEmployment?5:0)+(i.hasRelativeInCanada?5:0));
    var total = language+education+work+agePts+arranged+adapt;
    return { total:total, pass: total>=67 && minFirst>=7 && i.workYears!=='none', rows:[
      {label:'Language', val:language, max:28},
      {label:'Education', val:education, max:25},
      {label:'Work experience', val:work, max:15},
      {label:'Age', val:agePts, max:12},
      {label:'Arranged employment', val:arranged, max:10},
      {label:'Adaptability', val:adapt, max:10},
    ] };
  }
  function sirsCalc(i){
    var WORK = { none:0,'1_2':4,'2_3':8,'3_4':12,'4_5':16,'5plus':20 };
    var EDU = { doctorate:27,masters:22,postgrad_cert:15,bachelors:15,associate:5,diploma_cert:5,secondary:0 };
    var ELOC = { bc:8, canada:6, outside:0 };
    var LANG = { clb9plus:30,clb8:25,clb7:20,clb6:15,clb5:10,clb4:5,below4:0 };
    var REG = { metro_vancouver:0, area2:5, area3:15 };
    var workExperience = Math.min(40, WORK[i.workYears] + (i.hasCanadianExp?10:0) + (i.currentlyWorkingInJob?10:0));
    var education = Math.min(40, EDU[i.education] + ELOC[i.educationLocation] + (i.hasTradesOrProfessionalCert?5:0));
    var language = Math.min(40, LANG[i.language] + (i.bothOfficialLanguages?10:0));
    var wage = (!isFinite(i.hourlyWage)||i.hourlyWage<16)?0:Math.min(55, Math.floor(i.hourlyWage)-15);
    var region = Math.min(25, REG[i.region] + (i.hasRegionalExperience?10:0));
    var total = workExperience+education+language+wage+region;
    return { total:total, rows:[
      {label:'Work experience', val:workExperience, max:40},
      {label:'Education', val:education, max:40},
      {label:'Language', val:language, max:40},
      {label:'Wage', val:wage, max:55},
      {label:'Regional', val:region, max:25},
    ] };
  }
  function sinpCalc(i){
    var EDU = { masters_phd:23, bachelors:20, trade_cert:20, diploma_2yr:15, diploma_1yr:12, none:0 };
    var AGE = { under18:0,'18_21':8,'22_34':12,'35_45':10,'46_50':8,over50:0 };
    var LANG = { clb8plus:20,clb7:18,clb6:16,clb5:14,clb4:12,below4:0 };
    var LANG2 = { clb8plus:10,clb7:8,clb6:6,clb5:4,clb4:2,below4:0 };
    var education = EDU[i.education];
    var recent = Math.min(5,Math.max(0,Math.floor(i.workRecentYears)))*2;
    var earlierY = Math.min(5,Math.max(0,Math.floor(i.workEarlierYears)));
    var earlier = earlierY<=1?0:earlierY;
    var work = recent+earlier;
    var language = LANG[i.language]+LANG2[i.secondLanguage];
    var age = AGE[i.age];
    var connection = Math.min(30, (i.hasSaskJobOffer?30:0)+(i.hasSaskFamily?20:0)+(i.hasSaskWorkExp?5:0)+(i.hasSaskStudy?5:0));
    var total = education+work+language+age+connection;
    return { total:total, pass: total>=60, rows:[
      {label:'Education', val:education, max:23},
      {label:'Work experience', val:work, max:15},
      {label:'Language', val:language, max:30},
      {label:'Age', val:age, max:12},
      {label:'Sask. connection', val:connection, max:30},
    ] };
  }

  function badge(text, style){ var b=document.getElementById('r-badge'); b.textContent=text; b.style.cssText=style; }
  function computeResult(){
    var accent='var(--accent)', grad='linear-gradient(90deg,var(--accent2),var(--accent))';
    if (active==='crs'){
      var r=crsCalc(crsInput());
      var diff = LAST_CEC ? r.total-LAST_CEC.crs : null;
      var above = diff!=null && diff>=0, close = diff!=null && diff>-30;
      return { label:'Comprehensive Ranking System', total:r.total, max:'1,200',
        badgeText: diff==null ? '' : (above ? diff+' above CEC' : (-diff)+' below CEC'),
        badgeStyle:'padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;background:'+(above?'var(--successSoft)':close?'var(--warningSoft)':'var(--bg3)')+';color:'+(above?'var(--success)':close?'var(--warningInk)':'var(--text2)'),
        barPct:Math.round(r.total/1200*100),
        note: LAST_CEC ? 'The last Canadian Experience Class round (#'+LAST_CEC.no+', '+LAST_CEC.date+') cut off at '+LAST_CEC.crs+'. Category rounds can go far lower, and a provincial nomination adds 600.' : 'Category rounds can go far lower, and a provincial nomination adds 600.',
        boost: boost(), rows:r.rows, grad:grad };
    } else if (active==='fsw'){
      var r=fswCalc(state.fsw);
      return { label:'FSW six selection factors', total:r.total, max:'100',
        badgeText: r.pass?'Eligible (67+)':'Below 67',
        badgeStyle:'padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:'+(r.pass?'var(--successSoft)':'var(--accentSoft)')+';color:'+(r.pass?'var(--success)':'var(--danger)'),
        barPct:Math.round(r.total/100*100),
        note: r.pass?'You meet the 67-point pass mark. You must also meet the CLB 7 and 1-year work minimums.':'You need at least 67 points, CLB 7 in all abilities, and 1 year of skilled work to qualify.',
        rows:r.rows, grad:grad };
    } else if (active==='bc'){
      var r=sirsCalc(state.sirs);
      return { label:'BC PNP SIRS score', total:r.total, max:'200',
        badgeText:'No fixed pass mark',
        badgeStyle:'padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:var(--bg3);color:var(--text2)',
        barPct:Math.round(r.total/200*100),
        note:'BC PNP has no fixed cutoff — candidates compete in periodic Skills Immigration draws. Higher wage and region points move you up.',
        rows:r.rows, grad:grad };
    } else {
      var r=sinpCalc(state.sinp);
      return { label:'Saskatchewan SINP EOI', total:r.total, max:'110',
        badgeText: r.pass?'Qualifies (60+)':'Below 60',
        badgeStyle:'padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:'+(r.pass?'var(--successSoft)':'var(--accentSoft)')+';color:'+(r.pass?'var(--success)':'var(--danger)'),
        barPct:Math.round(r.total/110*100),
        note: r.pass?'You meet the 60-point minimum to enter the EOI pool. Draws select the highest scores.':'You need at least 60 points to be placed in the SINP EOI pool.',
        rows:r.rows, grad:grad };
    }
  }
  function render(){
    var res=computeResult();
    document.getElementById('r-label').textContent=res.label;
    badge(res.badgeText, res.badgeStyle);
    document.getElementById('r-total').textContent=res.total;
    document.getElementById('r-max').textContent='/ '+res.max;
    document.getElementById('sb-total').textContent=res.total;
    document.getElementById('sb-max').textContent='/ '+res.max;
    document.getElementById('sb-label').textContent=res.label;
    document.getElementById('r-bar').style.cssText=bar(res.barPct,res.grad);
    document.getElementById('r-note').textContent=res.note;
    var rb=document.getElementById('r-boost');
    if (res.boost){ rb.hidden=false; rb.innerHTML='Biggest boost for this profile: <b>'+res.boost.label+'</b> <span class=\"rboost-pts\">+'+res.boost.d+'</span> <a href=\"/improve-crs-score\">More ways</a>'; } else rb.hidden=true;
    document.getElementById('r-rows').innerHTML=res.rows.map(function(x){
      var pct=x.max?Math.round(x.val/x.max*100):0;
      return '<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:var(--text2)">'+x.label+'</span><span style="color:var(--text);font-weight:700"><span style="font-family:\\'Satoshi\\',sans-serif">'+x.val+'</span> <span style="color:var(--muted);font-weight:500">/ '+x.max+'</span></span></div><div style="height:5px;background:var(--bg3);border-radius:4px;overflow:hidden"><div style="'+bar(pct,'var(--accent)')+'"></div></div></div>';
    }).join('');
  }
  function syncVis(){
    var sp=document.getElementById('crs-spouse'); if(sp) sp.style.display=state.crs.maritalStatus==='married'?'':'none';
    var sc=document.getElementById('crs-second'); if(sc) sc.style.display=state.crs.hasSecondLang?'':'none';
  }

  var root=document.getElementById('calc');
  function unitFor(key){ return langOf(key)==='fr'?'NCLC':'CLB'; }
  function applyLang(block){
    var key=block.getAttribute('data-lang'), L=LANG[key], unit=unitFor(key), out={};
    SKILLS.forEach(function(k){ out[k]=toClb(L.test,k,L.raw[k]); });
    setPath(key, out);
    SKILLS.forEach(function(k){ var o=block.querySelector('[data-clbout="'+k+'"]'); o.textContent = L.raw[k]==='' ? '' : (out[k] ? unit+' '+out[k] : 'below '+unit+' 4'); o.classList.toggle('low', L.raw[k]!=='' && !out[k]); });
    var all=block.querySelector('[data-clbout="all"]');
    if (L.raw.speaking===''){ all.textContent=''; }
    else { var u=SKILLS.map(function(k){ return out[k]; }).filter(function(v,i,a){ return a.indexOf(v)===i; });
      all.textContent = u.length===1 ? (u[0] ? unit+' '+u[0]+' in all four' : 'below '+unit+' 4') : SKILLS.map(function(k){ return k[0].toUpperCase()+' '+(out[k]||'<4'); }).join(' · '); }
  }
  function setRanges(block){
    var L=LANG[block.getAttribute('data-lang')], t=CLB_TESTS[L.test].range;
    block.querySelectorAll('[data-langraw]').forEach(function(inp){ var sk=inp.getAttribute('data-langraw'); inp.min=t.min; inp.step=t.step; inp.max=(t.small && t.small[sk]) || t.max; });
    // TCF scores writing/speaking out of 20 and reading/listening out of 699: one shared score makes no sense.
    var tcf = L.test==='tcf'; var same=block.querySelector('[data-langsame]');
    same.parentNode.hidden = tcf; if (tcf && L.same){ L.same=false; same.checked=false; }
    block.querySelector('.langfour').hidden = L.same; block.querySelector('.langone').hidden = !L.same;
  }
  function fillInputs(block){ var L=LANG[block.getAttribute('data-lang')]; block.querySelectorAll('[data-langraw]').forEach(function(inp){ var sk=inp.getAttribute('data-langraw'); inp.value = sk==='all' ? L.raw.speaking : L.raw[sk]; }); }
  // The second official language must be the other one: French after an English test, and vice versa.
  function syncSecondOptions(){
    var b=root.querySelector('[data-lang="crs.secondLang"]'); if(!b) return;
    var want = langOf('crs.firstLang')==='fr' ? 'en' : 'fr', sel=b.querySelector('[data-langtest]');
    var chipEl=document.getElementById('crs-second-chip');
    if (chipEl){ var w = want==='fr' ? 'French' : 'English'; chipEl.textContent = (state.crs.hasSecondLang ? 'Remove ' : '+ Add ')+w+' (second official language)'; }
    if (CLB_TESTS[LANG['crs.secondLang'].test].lang===want) return;
    sel.innerHTML=OPTS[want]; LANG['crs.secondLang'].test=sel.value;
    LANG['crs.secondLang'].raw={speaking:'',listening:'',reading:'',writing:''};
    fillInputs(b); setRanges(b); applyLang(b);
  }
  function onLang(e){
    var t=e.target, block=t.closest('.langblock'); if(!block) return;
    var key=block.getAttribute('data-lang'), L=LANG[key];
    if (t.hasAttribute('data-langtest')){
      if (e.type!=='change') return;
      L.test=t.value; L.raw={speaking:'',listening:'',reading:'',writing:''};
      fillInputs(block); setRanges(block); if (key==='crs.firstLang') syncSecondOptions();
    } else if (t.hasAttribute('data-langsame')){
      L.same=t.checked;
      if (L.same){ var v=L.raw.speaking; SKILLS.forEach(function(k){ L.raw[k]=v; }); fillInputs(block); }
      setRanges(block);
    } else if (t.hasAttribute('data-langraw')){
      var sk=t.getAttribute('data-langraw');
      if (sk==='all') SKILLS.forEach(function(k){ L.raw[k]=t.value; }); else L.raw[sk]=t.value;
    } else return;
    applyLang(block); render();
  }
  root.addEventListener('input', onLang);
  root.addEventListener('change', onLang);
  root.querySelectorAll('.langblock').forEach(function(b){ setRanges(b); applyLang(b); });
  root.addEventListener('change', function(e){
    var t=e.target; var f=t.getAttribute('data-field'); if(!f) return;
    var raw=t.value; var n=Number(raw); var val=(raw!==''&&!isNaN(n))?n:raw;
    setPath(f,val); syncVis(); render();
  });
  root.querySelectorAll('.chip[data-field]').forEach(function(b){
    b.addEventListener('click', function(){
      var f=b.getAttribute('data-field'); setPath(f,!getPath(f)); b.classList.toggle('on', !!getPath(f)); b.setAttribute('aria-pressed', !!getPath(f));
      if(f==='crs.hasSecondLang'){ var w=langOf('crs.firstLang')==='fr'?'English':'French'; b.textContent=getPath(f)?'Remove '+w+' (second official language)':'+ Add '+w+' (second official language)'; }
      syncVis(); render();
    });
  });
  // Phones: the score bar pins to the bottom while the result card is off-screen.
  var sb=document.getElementById('scorebar'), rc=document.getElementById('calc-result');
  if(sb && rc && 'IntersectionObserver' in window){
    new IntersectionObserver(function(es){ sb.classList.toggle('hide', es[0].isIntersecting); }).observe(rc);
  }
  syncVis(); render();
})();
</script>`;

// ------------------------------------------------------------------ calculator pages
// Copy for the four calculator pages: hero, form heading, the explainer under the form
// and its FAQ (also the FAQPage JSON-LD). Factor maxima match the calc functions above.
const LOWEST_CATEGORY = FEED.rounds.filter((r) => r.label !== 'Provincial Nominee Program').reduce((a, b) => (b.crs < a.crs ? b : a), FEED.rounds[0]);
const CALC_INFO = {
  crs: {
    file: 'crs-calculator', name: 'CRS calculator (Express Entry)',
    lead: 'CRS calculator for', accent: 'Express Entry.',
    lede: 'Enter your test scores and profile to get your Comprehensive Ranking System score out of 1,200. It runs in your browser; nothing you type is sent anywhere.',
    formTitle: 'CRS: Express Entry score', formSub: 'Official IRCC Comprehensive Ranking System, out of 1,200.',
    about: `## How the CRS score works

Immigration, Refugees and Citizenship Canada ranks every Express Entry profile with the Comprehensive Ranking System. This calculator uses IRCC's published grid:

- **Core human capital**, up to 500 (460 with a spouse): age, education, official languages and Canadian work experience.
- **Spouse or partner factors**, up to 40, only when your partner is coming with you.
- **Skill transferability**, up to 100: education and foreign work combined with strong language or Canadian experience.
- **Additional points**, up to 600: a provincial nomination, French ability, study in Canada, or a brother or sister in Canada.

Language counts per ability, and transferability uses your lowest one, so one weak band can cost more than it looks. The full tables are in [how the CRS score is calculated](/crs-points), and [how to improve your CRS score](/improve-crs-score) shows what each change is worth.`,
    faq: [
      ['What is a good CRS score?', `There is no pass mark. Each round of invitations sets its own cutoff.${LAST_CEC ? ` The last Canadian Experience Class round (#${LAST_CEC.no}, ${LAST_CEC.date}) cut off at ${LAST_CEC.crs}.` : ''} Category rounds can go much lower: the lowest recent cutoff was ${LOWEST_CATEGORY.crs} (${LOWEST_CATEGORY.label}, #${LOWEST_CATEGORY.number}). See every round on the draws page.`],
      ['Which language tests can I enter?', 'IELTS General Training, CELPIP-General and PTE Core for English, and TEF Canada and TCF Canada for French. The calculator converts each score to a CLB or NCLC level with IRCC’s tables, or you can enter CLB levels directly.'],
      ['Does a job offer add CRS points?', 'No. IRCC removed the 50 and 200 points for arranged employment on March 25, 2025, so a job offer no longer changes your CRS score.'],
      ['How is the French bonus calculated?', 'French at NCLC 7 or higher in all four abilities adds 50 points if your English is at least CLB 5, or 25 points otherwise. The calculator works this out from the French test you enter.'],
      ['Is this my official score?', 'No. It is an estimate for planning. Your official score is the one IRCC shows in your Express Entry profile.'],
    ],
    guide: ['/crs-points', 'How the CRS score is calculated'],
  },
  fsw: {
    file: 'fsw-calculator', name: 'FSW 67-point calculator',
    lead: 'FSW calculator:', accent: 'the 67-point test.',
    lede: 'Check whether you qualify for the Federal Skilled Worker Program before entering the Express Entry pool. Six factors, 67 of 100 points to pass.',
    formTitle: 'Federal Skilled Worker: 67-point grid', formSub: 'Six selection factors. 67 of 100 needed to be eligible.',
    about: `## How the FSW grid works

The Federal Skilled Worker Program is one of the three Express Entry programs. To enter the pool under it, you need at least **67 out of 100** on six selection factors:

- **Language**, up to 28: per ability, 6 points at CLB 9 or more, 5 at CLB 8, 4 at CLB 7, plus 4 for a second official language at CLB 5.
- **Education**, up to 25.
- **Work experience**, up to 15: 9 points for one year, rising to 15 for six years or more.
- **Age**, up to 12: full points from 18 to 35, then one fewer each year, reaching zero at 47.
- **Arranged employment**, 10.
- **Adaptability**, up to 10: previous study or work in Canada, a relative in Canada, or your spouse's language, study or work.

This is a pass/fail check. It does not change your CRS score. The [FSW 67 points guide](/fsw-67-points) has every table.`,
    faq: [
      ['What do I need besides 67 points?', 'CLB 7 in all four abilities of your first official language, at least one year of continuous skilled work (TEER 0, 1, 2 or 3) in the last ten years, an Educational Credential Assessment for foreign education, and proof of funds unless you have a valid job offer and are authorized to work in Canada.'],
      ['Does my FSW score affect my CRS score?', 'No. The 67-point grid only decides whether you can enter the pool under FSW. Your rank in the pool comes from the CRS.'],
      ['Do I need a job offer?', 'No. A valid job offer adds 10 points for arranged employment and 5 for adaptability, but most candidates qualify without one.'],
    ],
    guide: ['/fsw-67-points', 'FSW 67 points explained'],
  },
  bc: {
    file: 'bc-pnp-calculator', name: 'BC PNP SIRS calculator',
    lead: 'BC PNP calculator:', accent: 'your SIRS score.',
    lede: 'Estimate your British Columbia Skills Immigration Registration System score out of 200 before you register for a BC PNP skills draw.',
    formTitle: 'BC PNP: SIRS score', formSub: 'Skills Immigration Registration System, out of 200.',
    about: `## How the SIRS score works

The BC Provincial Nominee Program ranks Skills Immigration registrations with the Skills Immigration Registration System (SIRS). It has five parts:

- **Work experience**, up to 40: directly related experience, plus points for Canadian experience and for currently working in the job.
- **Education**, up to 40: your highest level, where you studied, and a trades or professional credential.
- **Language**, up to 40, with extra points for ability in both English and French.
- **Hourly wage** of the B.C. job offer, up to 55. Higher wages earn more, reaching the maximum at $70 an hour.
- **Region of employment**, up to 25: jobs outside Metro Vancouver earn more, plus points for experience or study in that region.

A BC PNP nomination adds 600 points to an Express Entry profile. See [Express Entry draw types](/express-entry-draws) for how nominee rounds work.`,
    faq: [
      ['What is a good SIRS score?', 'There is no fixed pass mark. BC PNP invites the highest-scoring registrations in periodic draws, often by stream or occupation, and the cutoffs change from draw to draw. Check the BC PNP site for recent draws.'],
      ['Why does the wage matter so much?', 'The hourly wage of your B.C. job offer is worth up to 55 points, more than any other single factor, so a higher-paid offer can move you up a long way.'],
      ['Does a BC PNP nomination help with Express Entry?', 'Yes. A nomination through an Express Entry-aligned BC PNP stream adds 600 CRS points, which in practice leads to an invitation in the next nominee round.'],
    ],
    guide: ['/express-entry-draws', 'Express Entry draw types'],
  },
  sinp: {
    file: 'sinp-calculator', name: 'Saskatchewan SINP EOI calculator',
    lead: 'SINP points', accent: 'calculator.',
    lede: 'Calculate your Saskatchewan Immigrant Nominee Program Expression of Interest score out of 110 and check the 60-point minimum.',
    formTitle: 'Saskatchewan SINP: EOI points', formSub: 'International Skilled Worker EOI. 60 of 110 to qualify.',
    about: `## How the SINP EOI score works

The Saskatchewan Immigrant Nominee Program scores International Skilled Worker Expressions of Interest out of **110**. You need at least **60** to enter the pool:

- **Education and training**, up to 23.
- **Skilled work experience**, up to 15: two points for each of the last five years, plus points for earlier years.
- **Language ability**, up to 30, across your first and second official languages.
- **Age**, up to 12: full points from 22 to 34.
- **Connection to Saskatchewan**, up to 30: a job offer, close family, or past work or study in the province.

Saskatchewan invites the highest scores from the pool in periodic draws. A nomination through an Express Entry-linked stream adds 600 CRS points.`,
    faq: [
      ['What is the minimum SINP score?', '60 out of 110. That only gets you into the Expression of Interest pool; draws invite the highest-scoring candidates, so cutoffs are usually higher.'],
      ['Do I need a job offer for SINP?', 'Not for the Occupations In-Demand or Express Entry categories. A Saskatchewan job offer is worth up to 30 points for connection to the province, which is the largest single bonus.'],
      ['Does SINP help with Express Entry?', 'Yes. A nomination through the Saskatchewan Express Entry category adds 600 CRS points.'],
    ],
    guide: ['/express-entry-draws', 'Express Entry draw types'],
  },
};
const calcAboutMd = (id) => {
  const i = CALC_INFO[id];
  return `${i.about}

## Questions

${i.faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n')}

## Other calculators

${Object.entries(CALC_INFO).filter(([k]) => k !== id).map(([k, x]) => `- [${x.name}](${CALC_ROUTES[k]})`).join('\n')}
`;
};

function calculatorPage(id) {
  const info = CALC_INFO[id];
  // No tab strip: the header's Calculators menu and the "Other calculators" list under
  // the explainer link the four pages.
  const body = `${nav(`calc-${id}`, 'app')}
<div style="min-height:100vh;position:relative">
<div style="position:relative;z-index:1">
${pageHero(info.lead, info.accent, info.lede)}
<section id="calc" class="calcbody" style="max-width:1080px;margin:0 auto;padding:28px 24px 40px;display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:start">
  <div>
    <div style="margin-bottom:18px">
      <h2 id="calc-title" style="font-family:'Satoshi',sans-serif;font-size:24px;font-weight:900;letter-spacing:-.5px;margin:0 0 4px">${info.formTitle}</h2>
      <p id="calc-sub" style="font-size:14px;color:var(--text2);margin:0">${info.formSub}</p>
    </div>
    ${calcForms()[id].replace('style="display:none;flex-direction', 'style="display:flex;flex-direction')}
  </div>
  <div class="calcresult" id="calc-result" data-reveal style="position:sticky;top:88px;scroll-margin-top:80px">
    <div style="background:linear-gradient(155deg,var(--grad1),var(--grad2));border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:var(--shadow)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span id="r-label" style="font-size:11.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted)">Comprehensive Ranking System</span>
        <span id="r-badge"></span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px">
        <span id="r-total" style="font-family:'Satoshi',sans-serif;font-size:64px;font-weight:900;letter-spacing:-3px;color:var(--text);line-height:1">0</span>
        <span id="r-max" style="font-size:17px;color:var(--muted);font-weight:600">/ 1,200</span>
      </div>
      <div style="height:8px;background:var(--bg3);border-radius:6px;overflow:hidden;margin:14px 0 6px"><div id="r-bar" style="height:100%;width:0"></div></div>
      <p id="r-note" style="font-size:12.5px;line-height:1.5;color:var(--text2);margin:8px 0 0"></p>
      <p id="r-boost" class="rboost" hidden></p>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:24px;padding:20px;margin-top:16px">
      <div style="font-size:12.5px;font-weight:700;color:var(--text);margin-bottom:14px">Points breakdown</div>
      <div id="r-rows" style="display:flex;flex-direction:column;gap:14px"></div>
    </div>
    <a class="link-accent" href="/" style="display:block;text-align:center;font-size:12.5px;color:var(--muted);margin-top:16px">Estimate only · verify with the official tool ↗</a>
  </div>
</section>
<section class="wrap calc-about"><article class="doc-card">${addHeadingIds(marked.parse(calcAboutMd(id)))}</article></section>
</div>
${footerFull()}
</div>
<a class="scorebar" id="scorebar" href="#calc-result" aria-label="See your score breakdown">
  <span style="display:flex;flex-direction:column;min-width:0"><span id="sb-label" style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Comprehensive Ranking System</span><span style="font-size:12.5px;color:var(--text2)">Tap for the breakdown</span></span>
  <span style="display:flex;align-items:baseline;gap:5px;white-space:nowrap;flex-shrink:0"><span id="sb-total" class="num" style="font-size:30px;line-height:1;color:var(--text)">0</span><span id="sb-max" style="font-size:13px;color:var(--muted);font-weight:600">/ 1,200</span></span>
</a>
${calcScript(id)}`;
  // Old /calculators#fsw links arrive here after the /calculators 301; send them on.
  const legacy = id === 'crs'
    ? `<script>(function(){var m=${JSON.stringify({ fsw: CALC_ROUTES.fsw, bc: CALC_ROUTES.bc, sinp: CALC_ROUTES.sinp })};var h=location.hash.slice(1);if(m[h])location.replace(m[h]);})();</script>`
    : '';
  return shell({ ...page(info.file), head2: legacy, jsonld: calcJsonLd(id), body: noDashes(body) });
}

// ------------------------------------------------------------------ DOCS
function doc(file, mdFile) {
  const md = docMd(mdFile);
  const body = `${nav('', 'calc')}
<div style="min-height:100vh;position:relative">
<main class="doc"><article class="doc-card">${addHeadingIds(marked.parse(md))}</article></main>
${footerFull()}
</div>`;
  return shell({ ...page(file), body });
}

// ------------------------------------------------------------------ AGENT SURFACES
// Agents get the same six URLs as browsers, but as markdown: a request carrying
// `Accept: text/markdown` is 307'd to the .md twin built here. It has to be a redirect,
// not a rewrite — Vercel evaluates vercel.json rewrites *after* the filesystem phase, so
// index.html would already have won. The twins are generated from the same constants as
// the HTML so the two can't drift.
const docMd = (mdFile) => readFileSync(resolve(DOCS, mdFile), 'utf8');
const plain = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const noIcon = (s) => plain(s).replace(/^[^\p{L}\d]+/u, '');
const mdList = (items) => items.map((i) => `- ${i}`).join('\n');
const mdTable = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const MD_FOOTER = `---

Unofficial. Not affiliated with, endorsed by, or connected to IRCC or the Government of Canada.
All scores, predictions and timelines are estimates for guidance only and are not immigration
advice. Verify with the official IRCC tools at canada.ca before making decisions.

Contact: ${CONTACT} · iOS app: ${APP_STORE_URL}`;

const mdHead = (file) => {
  const p = page(file);
  return `# ${p.title}\n\n> ${p.description}\n`;
};

// The four grids, keyed to the STATE0 shapes the in-browser calculators actually use,
// so the input list an agent reads is the input list the form renders.
const CALC_META = [
  ['crs', 'CRS — Comprehensive Ranking System', '1,200', 'The official IRCC Express Entry formula: core human capital, spouse factors, skill transferability and additional points.'],
  ['fsw', 'FSW 67-point grid', '100 (67 to be eligible)', 'Federal Skilled Worker six selection factors — the eligibility gate before Express Entry ranking.'],
  ['sirs', 'BC PNP SIRS', '200', 'British Columbia Skills Immigration Registration System, scored on economic and human-capital factors.'],
  ['sinp', 'Saskatchewan SINP EOI', '110 (60 to be eligible)', 'Saskatchewan International Skilled Worker Expression of Interest points assessment.'],
];

const homeMd = () => `${mdHead('index')}
CRS Pulse is a free iPhone app and browser toolkit for people in (or heading for) the
Canadian Express Entry pool. It scores a profile against the official IRCC and provincial
point grids, tracks every round of invitations, and follows a PR application from profile
to landing. Everything you enter stays on the device, and there is no account to create.
The app carries Google AdMob banner ads; nothing else tracks you.

- Website: ${SITE}/
- iOS App Store: ${APP_STORE_URL}
- Agent guidance: ${SITE}/llms.txt

## Calculators

${mdList(CALC_META.map(([, name, max, desc]) => `**${name}** — max ${max}. ${desc}`))}

Each has its own page: ${Object.values(CALC_ROUTES).map((r) => `${SITE}${r}`).join(', ')}. They run in the browser; inputs are never uploaded.

## What the app does

${mdList(FEATURES_SMALL.map(([, title, desc]) => `**${title}** — ${plain(desc)}`))}

## Recent Express Entry draws

${mdTable(['Round', 'Date', 'Category', 'Invitations', 'Cutoff CRS'], HOME_DRAWS.map(([no, date, cat, invited, cutoff]) => [no, date, cat, invited, cutoff]))}

Mirrored from IRCC as of ${FEED.updatedFull ?? FEED.updated}. Full history and trends: ${SITE}/draws

## Privacy

${mdList(PRIVACY_POINTS)}

Full policy: ${SITE}/privacy

## FAQ

${FAQ.map(([q, a]) => `### ${q}\n\n${plain(a)}`).join('\n\n')}

${MD_FOOTER}
`;

const calcMd = (id) => {
  const i = CALC_INFO[id];
  const meta = CALC_META.find(([k]) => k === (id === 'bc' ? 'sirs' : id));
  return `${mdHead(i.file)}
Runs live in the browser at ${SITE}${CALC_ROUTES[id]}. Nothing is sent to a server. Estimates for
planning; confirm a final score with the official IRCC or provincial tool.

Maximum: **${meta[2]}**

Inputs: ${Object.keys(STATE0[meta[0]]).join(', ')}.

${absMdLinks(calcAboutMd(id))}
${MD_FOOTER}
`;
};
const absMdLinks = (md) => md.replace(/\]\(\//g, `](${SITE}/`);

const drawsMd = () => `${mdHead('draws')}
The app pulls rounds of invitations straight from IRCC's public JSON feed and pushes an
alert within about 15 minutes of publication. The figures below mirror that feed as of
${FEED.updatedFull ?? FEED.updated}; canada.ca is authoritative for anything newer.

Year to date (${FEED.ytd.year}): **${num(FEED.ytd.invitations)} invitations** across
**${FEED.ytd.rounds} rounds** in ${FEED.ytd.categories} categories. Candidate pool:
**${num(FEED.poolTotal)}** profiles${FEED.distributionAsOf ? ` as of ${FEED.distributionAsOf}` : ''}.

## Rounds of invitations

${mdTable(['Round', 'Date', 'Category', 'Invitations', 'Cutoff CRS'], ALL_DRAWS.map((d) => [d.no, d.date, d.label, d.invited, d.cutoff]))}

Category filters on this page: ${DRAW_FILTERS.join(', ')}.

## Pool distribution by CRS band

${mdTable(['CRS range', 'Candidates'], POOL.map(([label, count]) => [label, count]))}

## What the numbers say

${mdList(INSIGHTS.map(([, title, body]) => `**${title}** — ${plain(body)}`))}

${MD_FOOTER}
`;

const featuresMd = () => `${mdHead('features')}
CRS Pulse mirrors the real IRCC process at every step. Free on iPhone, no account.

${FEATURE_BLOCKS.map((b) => `## ${noIcon(b.tag)}

**${plain(b.title)}**

${plain(b.body)}

${mdList(b.points.map(plain))}`).join('\n\n')}

${MD_FOOTER}
`;

const analyticsMd = () => `${mdHead('analytics')}
Worked out from the last ${DRAWS.length} rounds IRCC published (${ANALYTICS.first.date} to
${DRAWS[0].date}), mirrored as of ${FEED.updatedFull ?? FEED.updated}.

- **${num(ANALYTICS.invited)} invitations** across these rounds.
- **${ANALYTICS.avgGap} days** between rounds on average; the longest gap was ${ANALYTICS.longestGap} days.
- Lowest cutoff: **${ANALYTICS.lowest.crs}**, a ${ANALYTICS.lowest.cat} round on ${ANALYTICS.lowest.date}.

## Cutoffs by category

${mdTable(['Category', 'Rounds', 'Invitations', 'Lowest', 'Average', 'Highest', 'Latest round'], ANALYTICS.cats.map((c) => [c.cat, c.rounds, num(c.invited), c.min, c.avg, c.max, `#${c.last.no}, ${c.last.date}`]))}

## Reading a score against these rounds

A score clears a round when it is at or above that round's cutoff (ties are broken by
profile date). Category rounds only invite candidates eligible for that category, and a
provincial nomination adds 600 points, which is why PNP cutoffs sit above 700. The page
at ${SITE}/analytics runs this comparison in the browser for any score, and places it in
the pool of ${num(FEED.poolTotal)} profiles using IRCC's CRS distribution.

${MD_FOOTER}
`;

const checklistsMd = () => `${mdHead('checklists')}
General guidance compiled from IRCC document requirements. Once you have an ITA or start an
application, the personalized checklist in your IRCC account is the official list.

${CHECKLIST_PROGRAMS.map((p) => `## ${p.label}

${p.intro}

${p.sections.map((s) => `### ${s.title}

${mdList(s.items.map((i) => (i.hint ? `${i.label} (${i.hint})` : i.label)))}`).join('\n\n')}`).join('\n\n')}

${MD_FOOTER}
`;

const processingMd = () => `${mdHead('processing-times')}
IRCC processing times mirrored from IRCC's published figures as of ${PT_FEED.updated}.
IRCC's figure is the time it took to finalise 80% of recent applications. Rows marked
"app estimate" are not in IRCC's published table and use the app's typical figure.

${PT.map((c) => `## ${c.label}

${mdTable(['Application', 'Processing time', 'People waiting', 'Notes'], c.types.map((t) => [t.label, fmtMonths(t.months), t.peopleWaiting ? num(t.peopleWaiting) : '', [t.method, t.varies ? 'varies by country' : '', t.live ? '' : 'app estimate'].filter(Boolean).join('; ')]))}

Typical stages: ${c.types[0].stages.map(([l]) => l).join(' → ')}.`).join('\n\n')}

${MD_FOOTER}
`;

const timelineMd = () => `${mdHead('timeline')}
The page at ${SITE}/timeline keeps a private log of these dates in the browser, shows the
days between steps, and measures progress against IRCC's processing time for the program
(${SITE}/processing-times.md). The order varies by file: medicals can come before AOR, and
applicants inside Canada usually get the PR portal instead of a passport request.

## Milestones, in the usual order

${MILESTONES_WEB.filter(([t]) => t !== 'Custom').map(([, label, , , desc]) => `- **${label}**: ${desc}`).join('\n')}

${MD_FOOTER}
`;

const MD_PAGES = {
  'index.md': homeMd,
  ...Object.fromEntries(Object.keys(CALC_ROUTES).map((id) => [`${CALC_INFO[id].file}.md`, () => calcMd(id)])),
  'draws.md': drawsMd,
  'analytics.md': analyticsMd,
  'checklists.md': checklistsMd,
  'processing-times.md': processingMd,
  'timeline.md': timelineMd,
  'features.md': featuresMd,
  ...Object.fromEntries(GUIDE_PAGES.map((g) => [`${g.file}.md`, () => guideMd(g)])),
  'privacy.md': () => docMd('PRIVACY_POLICY.md'),
  'terms.md': () => docMd('TERMS_OF_USE.md'),
};

// ------------------------------------------------------------------ llms.txt
// llmstxt.org layout: H1 name, blockquote summary, prose, then H2 link sections.
// The "When to use this" section is the part agents actually route on.
const llmsTxt = () => `# CRS Pulse

> Free Canadian Express Entry toolkit: the official CRS formula plus the FSW 67-point,
> BC PNP SIRS and Saskatchewan SINP grids, live IRCC rounds of invitations with push
> alerts, and a PR application tracker. iPhone app plus in-browser calculators.

CRS Pulse is an independent product. It is not affiliated with, endorsed by, or connected
to IRCC or the Government of Canada, and nothing it produces is immigration advice.
Every page on this site is also available as Markdown.

## When to use this

Reach for CRS Pulse when the question is about **Canadian Express Entry scoring, draw
history, or PR application timing**. Specifically:

- **Scoring a candidate profile.** Turn age, education, CLB language levels, Canadian and
  foreign work experience, spouse factors and a provincial nomination into a CRS score out
  of 1,200 — see ${SITE}/crs-calculator.md for the exact input list (and the FSW, BC PNP and
  SINP pages for the other grids).
- **Checking eligibility before ranking.** The FSW 67-point grid decides whether a profile
  can enter the Federal Skilled Worker pool at all; CRS only ranks profiles already in it.
- **Comparing a score against real cutoffs.** ${SITE}/draws.md carries round number, date,
  category, invitations issued and cutoff CRS, plus the pool distribution by CRS band, so a
  score can be placed against what actually got invited.
- **Explaining category-based draws.** Why a French-language or healthcare round can cut off
  near 380–480 while a general round sits above 500, and why nomination rounds exceed 700.
- **Provincial nominee scoring.** BC PNP SIRS (200 points) and Saskatchewan SINP EOI
  (110 points, 60 to qualify).
- **Application-stage questions.** IRCC processing times for every application type
  (${SITE}/processing-times.md), per-program document checklists
  (${SITE}/checklists.md), and the ITA → e-APR → AOR → biometrics → medical → PPR
  milestone sequence (${SITE}/timeline.md).
- **Draw statistics.** Cutoffs by category, cadence and invitation counts:
  ${SITE}/analytics.md.

How to call it:

- Add \`Accept: text/markdown\` to a request for any page URL and you get Markdown back
  (a 307 points you at the twin, so follow redirects). Appending \`.md\` to the path works
  just as well: \`${SITE}/draws.md\`.
- Start here: this file, then ${SITE}/sitemap.xml for the full URL list.
- Draw figures mirror IRCC's public feed as of ${FEED.updatedFull ?? FEED.updated} (latest
  round #${DRAWS[0].no}). For anything newer, use the app — it reads IRCC's feed directly —
  or canada.ca.

## When not to use this

- Case-specific legal or immigration advice, or anything binding — CRS Pulse produces
  estimates only.
- The authoritative value of a score or a live application status. IRCC's own tools are
  the source of truth; always confirm there before acting.
- Non-Canadian immigration programs.

## Pages

${PAGES.map((p) => `- [${p.title}](${SITE}${mdPath(p)}): ${p.llm}`).join('\n')}

## Optional

- [CRS Pulse on the App Store](${APP_STORE_URL}): the iPhone app, with push alerts and the
  application tracker that the website does not carry.
- [Contact](mailto:${CONTACT}): questions, corrections, or bug reports.
`;

// ------------------------------------------------------------------ sitemap + robots
const sitemapXml = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url>
    <loc>${SITE}${p.path}</loc>
    <lastmod>${BUILT}</lastmod>
    <changefreq>${p.priority === '0.5' ? 'yearly' : 'weekly'}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

const robotsTxt = () => `# CRS Pulse — https://www.crspulse.com
# Agent guidance and when-to-use: ${SITE}/llms.txt
User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;

// ------------------------------------------------------------------ 404
// Static Vercel serves this with a real 404 status. The body is a site map rather than a
// dead end, and it ends with the same links in markdown so an agent that lands here can
// recover without parsing the design.
function notFoundPage() {
  const links = [
    ...PAGES.map((p) => [p.path, p.title.replace(/\s*[|\u2014]\s*CRS Pulse$/, ''), p.llm]),
    ['/llms.txt', 'llms.txt', 'What this site is for and when an agent should use it.'],
    ['/sitemap.xml', 'sitemap.xml', 'Every indexable URL with its last-modified date.'],
  ];
  const agentMd = [
    '# 404 — page not found',
    '',
    'This path does not exist on crspulse.com. Start from one of these:',
    '',
    ...PAGES.map((p) => `- [${p.title.replace(/\s*[|\u2014]\s*CRS Pulse$/, '')}](${SITE}${mdPath(p)})`),
    `- [llms.txt](${SITE}/llms.txt) — when to use this site, and how to request Markdown`,
    `- [sitemap.xml](${SITE}/sitemap.xml) — every indexable URL`,
  ].join('\n');
  const body = `${nav('', 'calc')}
<div style="min-height:100vh;position:relative">
<main style="position:relative;z-index:1;max-width:820px;margin:0 auto;padding:80px 24px 72px">
  <h1 class="split" style="font-size:clamp(42px,5.6vw,72px);line-height:1.02;margin:0 0 18px">This page doesn't <em style="font-style:normal;color:var(--accentInk)">exist.</em></h1>
  <p style="font-size:16.5px;line-height:1.6;color:var(--text2);margin:0 0 30px;max-width:620px">The link may be old or mistyped. Everything on crspulse.com lives at one of these pages:</p>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${links.map(([href, label, desc]) => `<a class="lift" href="${href}" style="display:block;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;color:var(--text)"><div style="font-size:15px;font-weight:700;margin-bottom:3px">${label}</div><div style="font-size:13px;line-height:1.5;color:var(--text2)">${desc}</div></a>`).join('')}
  </div>
  <div style="margin-top:34px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">For AI agents</div>
    <pre style="margin:0;overflow-x:auto;font-size:12.5px;line-height:1.6;color:var(--text2);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap">${agentMd.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
  </div>
</main>
${footerFull()}
</div>`;
  return shell({ title: 'Page not found — CRS Pulse', description: 'That page does not exist on crspulse.com. Jump to the calculators, live IRCC draws, features or legal pages.', noindex: true, body });
}

// ------------------------------------------------------------------ JSON-LD
// Homepage identity graph: the product, who publishes it, the site, and the FAQ that is
// already rendered on the page (same source array, so the markup can't drift from it).
// Home > page, so results show the site path instead of a bare URL.
const crumbsJsonLd = (path, title) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'CRS Pulse', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: title.replace(/\s*[|\u2014]\s*CRS Pulse$/, ''), item: `${SITE}${path}` },
  ],
});

// One calculator page: the free web application plus its FAQ.
const calcJsonLd = (id) => {
  const i = CALC_INFO[id];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: i.name,
        description: page(i.file).description,
        url: `${SITE}${CALC_ROUTES[id]}`,
        applicationCategory: 'UtilitiesApplication',
        browserRequirements: 'Requires JavaScript',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
        publisher: { '@id': `${SITE}/#org` },
      },
      {
        '@type': 'FAQPage',
        mainEntity: i.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };
};

const homeJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['SoftwareApplication', 'MobileApplication'],
      '@id': `${SITE}/#app`,
      name: 'CRS Pulse',
      alternateName: 'CRS Pulse — Express Entry Calculator',
      url: `${SITE}/`,
      description: page('index').description,
      applicationCategory: 'UtilitiesApplication',
      applicationSubCategory: 'Immigration calculator',
      operatingSystem: 'iOS 16+',
      installUrl: APP_STORE_URL,
      downloadUrl: APP_STORE_URL,
      inLanguage: ['en', 'fr'],
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: APP_STORE_URL },
      featureList: FEATURES_SMALL.map(([, title, desc]) => `${title}: ${plain(desc)}`),
      publisher: { '@id': `${SITE}/#org` },
      sameAs: [APP_STORE_URL],
    },
    {
      '@type': 'Organization',
      '@id': `${SITE}/#org`,
      name: 'CRS Pulse',
      url: `${SITE}/`,
      logo: `${SITE}/img/logo.svg`,
      email: CONTACT,
      description: 'Independent publisher of CRS Pulse, an Express Entry CRS calculator and IRCC draw tracker. Not affiliated with IRCC or the Government of Canada.',
      sameAs: [APP_STORE_URL],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: 'CRS Pulse',
      description: page('index').description,
      inLanguage: 'en',
      publisher: { '@id': `${SITE}/#org` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE}/#faq`,
      mainEntity: FAQ.map(([q, a]) => ({
        '@type': 'Question',
        name: plain(q),
        acceptedAnswer: { '@type': 'Answer', text: plain(a) },
      })),
    },
  ],
});

// ------------------------------------------------------------------ build
mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(OUT, 'img'), { recursive: true });
// Every image the site ships is committed under web/assets, so this is a plain copy: a
// missing one is a broken checkout and should fail the build.
//
// It used to also pull a licensed Apple bezel back from the live site, because that image
// was gitignored and therefore absent from every checkout. That was a circular dependency
// — the only copy lived on the deployment it was needed to produce — and it bit us on
// 2026-09-21, when the site went down and took the image with it. The phone frame in
// PHONE_MOCK is drawn in CSS now, so nothing the build needs lives outside the repo.
function copyAsset(from, to) {
  cpSync(resolve(ASSETS, from), resolve(OUT, to));
}

copyAsset('logo.svg', 'img/logo.svg');
// Social preview (1200x630). Regenerate from og-source.html with headless Chrome:
// chrome --headless=new --window-size=1200,630 --screenshot=og.png og-source.html
copyAsset('og.png', 'img/og.png');
// 64px: the mark never renders above 32 CSS px. The 128px original stays for og-source.
copyAsset('logo-mark-64.png', 'img/logo-mark.png');
mkdirSync(resolve(OUT, 'fonts'), { recursive: true });
for (const w of [500, 700, 900]) copyAsset(`fonts/satoshi-${w}.woff2`, `fonts/satoshi-${w}.woff2`);
// GSAP for the home page's scroll story, self-hosted from the npm package.
mkdirSync(resolve(OUT, 'js'), { recursive: true });
cpSync(resolve(here, 'node_modules/gsap/dist/gsap.min.js'), resolve(OUT, 'js/gsap.min.js'));
cpSync(resolve(here, 'node_modules/gsap/dist/ScrollTrigger.min.js'), resolve(OUT, 'js/ScrollTrigger.min.js'));
copyAsset('favicon.png', 'favicon.png');
copyAsset('apple-touch-icon.png', 'apple-touch-icon.png');
// Real captures of the shipping iOS build, shown in the app section. WebP because they
// are the page's only raster payload; the PNG originals stay under assets/screenshots
// for the store listings.
copyAsset('screenshots/02_home.webp', 'img/app-home.webp');
copyAsset('screenshots/03_draws.webp', 'img/app-draws.webp');
copyAsset('screenshots/05_analytics_plan.webp', 'img/app-analytics.webp');
copyAsset('screenshots/06_timeline.webp', 'img/app-timeline.webp');
writeFileSync(resolve(OUT, 'index.html'), home());
for (const id of Object.keys(CALC_ROUTES)) writeFileSync(resolve(OUT, `${CALC_INFO[id].file}.html`), calculatorPage(id));
writeFileSync(resolve(OUT, 'draws.html'), drawsPage());
writeFileSync(resolve(OUT, 'analytics.html'), analyticsPage());
writeFileSync(resolve(OUT, 'checklists.html'), checklistsPage());
writeFileSync(resolve(OUT, 'processing-times.html'), processingPage());
writeFileSync(resolve(OUT, 'timeline.html'), timelinePage());
writeFileSync(resolve(OUT, 'features.html'), featuresPage());
for (const g of GUIDE_PAGES) writeFileSync(resolve(OUT, `${g.file}.html`), guidePage(g));
writeFileSync(resolve(OUT, 'privacy.html'), doc('privacy', 'PRIVACY_POLICY.md'));
writeFileSync(resolve(OUT, 'terms.html'), doc('terms', 'TERMS_OF_USE.md'));
writeFileSync(resolve(OUT, '404.html'), notFoundPage());
// Markdown twins — reached from the HTML URL when the request carries
// Accept: text/markdown (see vercel.json redirects), and directly at the .md path.
for (const [name, render] of Object.entries(MD_PAGES)) writeFileSync(resolve(OUT, name), render());
writeFileSync(resolve(OUT, 'llms.txt'), llmsTxt());
writeFileSync(resolve(OUT, 'sitemap.xml'), sitemapXml());
writeFileSync(resolve(OUT, 'robots.txt'), robotsTxt());
// Authorized-seller declarations. app-ads.txt is for the app's AdMob account
// (crspulse.com must be the developer website on the store listings for AdMob to
// crawl it); ads.txt is for AdSense on this site.
const sellerLine = (pub) => `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
writeFileSync(resolve(OUT, 'app-ads.txt'), sellerLine(ADMOB_PUB));
writeFileSync(resolve(OUT, 'ads.txt'), sellerLine(ADSENSE_CLIENT.replace('ca-', '')));
console.log(`Built ${PAGES.length} pages (html + md), 404, llms.txt, sitemap.xml, robots.txt → web/public/`);
