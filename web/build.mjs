// Builds the CRS Pulse public site into web/public/:
//   /             → home (hero + features + calculators + draws preview + FAQ)
//   /calculators  → live in-browser CRS / FSW / BC PNP SIRS / SINP EOI calculators
//   /draws        → live IRCC draw tracking, cutoff trend + pool composition
//   /features     → feature tour
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
  {
    file: 'calculators', path: '/calculators', priority: '0.9',
    title: `CRS Calculator ${YEAR}: Express Entry, FSW, BC PNP & SINP`,
    description: 'Free CRS score calculator for Express Entry, plus the FSW 67-point grid, BC PNP SIRS and Saskatchewan SINP EOI points. Runs in your browser, nothing uploaded.',
    llm: 'The four point grids with their inputs, maximums and pass marks. Run them in-browser, no upload.',
  },
  {
    file: 'draws', path: '/draws', priority: '0.9',
    title: `Express Entry Draws ${YEAR}: Latest CRS Cutoffs | CRS Pulse`,
    description: `Latest Express Entry draw #${LATEST.number} (${SHORT_DATE}): ${LATEST.label}, CRS ${LATEST.crs}, ${fmtN(LATEST.size)} ITAs. Every round from IRCC with cutoff trends and pool data.`,
    llm: 'Round-by-round draw table (number, date, category, invitations, cutoff), pool distribution and trend notes.',
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
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
  font-size:16px; line-height:1.6; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
a{ color:var(--accentInk); text-decoration:none; }
a:hover{ color:var(--accent); }
::selection{ background:var(--accent); color:#fff; }
h1,h2,h3,h4{ margin:0; font-family:'Space Grotesk',sans-serif; color:var(--text); letter-spacing:-.02em; line-height:1.15; }
p{ margin:0; }
/* numerals: one class for every figure on the site, so columns of numbers line up */
.num{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
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
.wordmark{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:18.5px; letter-spacing:-.45px; line-height:1; }
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
.headcta{ padding:0 15px; height:34px; font-size:14px; border-radius:9px; gap:7px; }
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
.faq summary::after{ content:"+"; font-family:'Space Grotesk',sans-serif; font-size:20px; color:var(--accentInk); flex-shrink:0; transition:transform .2s ease; }
.faq[open] summary::after{ transform:rotate(45deg); }
.faq summary:hover{ color:var(--accentInk); }
.faq .a{ padding:0 0 18px; font-size:15px; line-height:1.65; color:var(--text2); max-width:70ch; }
/* calculator controls */
.chip{ cursor:pointer; padding:9px 14px; border-radius:8px; border:1px solid var(--border); background:var(--input); color:var(--text2); font-size:13px; font-weight:600; transition:all .15s ease; }
.chip.on{ border-color:var(--accentBtn); background:var(--accentBtn); color:#fff; }
.calctab{ cursor:pointer; padding:12px 16px; border:none; background:none; border-bottom:2px solid transparent; color:var(--text2); font-size:14.5px; font-weight:600; display:flex; align-items:center; gap:8px; }
.calctab.on{ border-bottom-color:var(--accent); color:var(--text); font-weight:700; }
.filterchip{ cursor:pointer; padding:7px 14px; border-radius:999px; border:1px solid var(--border); background:var(--card); color:var(--text2); font-size:13px; font-weight:600; }
.filterchip.on{ border-color:var(--accentBtn); background:var(--accentBtn); color:#fff; }
/* doc pages */
.doc{ max-width:760px; margin:0 auto; padding:40px 24px 72px; }
.doc-card{ background:var(--card); }
.doc-card h1{ font-size:2rem; margin:.1em 0 .8em; }
.doc-card h2{ font-size:1.2rem; margin:2em 0 .6em; }
.doc-card h3{ font-size:1.02rem; margin:1.5em 0 .5em; }
.doc-card p,.doc-card li{ color:var(--text2); font-size:15.5px; line-height:1.7; }
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
`;

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

// ------------------------------------------------------------------ chrome
// No decorative layer: the old drifting colour blobs and the skyline photo backdrop are
// gone. Hierarchy on this site comes from type, hairlines and alignment.
const CHECK = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>`;

function nav(active, cta) {
  const links = [['/calculators', 'Calculators', 'calc'], ['/draws', 'Draws', 'draws'], ['/features', 'Features', 'features']];
  const link = ([href, label, key], cls) =>
    `<a class="${cls}" href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  // The practical CTA (run the calculator) on content pages, the App Store on the app pages.
  const ctaBtn = cta === 'app'
    ? `<a class="btn btn-accent headcta" href="${APP_STORE_URL}">${APPLE(15)}<span>Get the app</span></a>`
    : `<a class="btn btn-accent headcta" href="/calculators">Calculate CRS</a>`;
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
    <div class="navlinks">${links.map((l) => link(l, 'navlink')).join('')}</div>
    <div class="headright">
      ${live}
      ${themeBtn('head-theme')}
      ${ctaBtn}
      <details class="menu">
        <summary aria-label="Open menu"><span class="burger" aria-hidden="true"><i></i><i></i></span></summary>
        <div class="menupanel">
          ${links.map((l) => link(l, 'menulink')).join('')}
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
    <span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;color:var(--text)">CRS Pulse</span>
    <p style="font-size:12.5px;line-height:1.6;color:var(--muted);max-width:640px">${note}</p>
    <a class="foot-link totop" href="#" style="font-size:12.5px">${icon('arrowUp', 15)}Back to top</a>
  </div>
</footer>`;

const footerFull = () => `
<footer style="border-top:1px solid var(--border);background:var(--bg2)">
  <div class="wrap" style="padding:44px 24px 26px">
    <div class="footgrid" style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:28px;margin-bottom:32px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <img src="/img/logo-mark.png" width="22" height="22" alt="" style="border-radius:6px;display:block">
          <span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:17px;color:var(--text)">CRS Pulse</span>
        </div>
        <p style="font-size:13.5px;line-height:1.6;color:var(--text2);max-width:260px">An Express Entry score calculator, IRCC draw tracker and application timeline for people applying for Canadian permanent residence.</p>
      </div>
      <div>
        <div class="klabel" style="color:var(--text);margin-bottom:12px">Product</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13.5px">
          <a class="foot-link" href="/calculators">Calculators</a>
          <a class="foot-link" href="/draws">Draws &amp; trends</a>
          <a class="foot-link" href="/features">Features</a>
          <a class="foot-link" href="/#faq">FAQ</a>
        </div>
      </div>
      <div>
        <div class="klabel" style="color:var(--text);margin-bottom:12px">Calculators</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13.5px">
          <a class="foot-link" href="/calculators">CRS (Express Entry)</a>
          <a class="foot-link" href="/calculators#fsw">FSW 67-point grid</a>
          <a class="foot-link" href="/calculators#bc">BC PNP SIRS</a>
          <a class="foot-link" href="/calculators#sinp">Saskatchewan SINP</a>
        </div>
      </div>
      <div>
        <div class="klabel" style="color:var(--text);margin-bottom:12px">App &amp; legal</div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:13.5px">
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
${head2}
${[jsonld, path && path !== '/' ? crumbsJsonLd(path, title) : null].filter(Boolean).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
${THEME_INIT}
${VERCEL_ANALYTICS}
${POSTHOG_WEB}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
${body}
${THEME_SCRIPT}
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

// ------------------------------------------------------------------ home components
// Real captures of the shipping iOS build in a CSS-drawn frame. Every screenshot on this
// site is the actual app — no stock device photography, no invented UI.
const SHOTS = {
  home: ['/img/app-home.webp', 'The CRS Pulse home screen: a CRS score of 525 and a Canadian Experience Class application submitted May 5, 2026, with its final decision on August 25 and COPR on October 1'],
  draws: ['/img/app-draws.webp', 'The draws screen, listing the latest Express Entry rounds with cutoff, invitations and category'],
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
<a class="card card-lift lift" href="/calculators" style="display:block;color:var(--text);overflow:hidden">
  <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;padding:12px 18px;background:var(--bg2);border-bottom:1px solid var(--hairline)">
    <span style="font-size:13px;font-weight:600">CRS — Express Entry score</span>
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
const HOME_HEAD = `<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@500,700,900&display=swap" rel="stylesheet">
<script>document.documentElement.classList.add('js')</script>
<style>
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
/* motion runtime */
.js .s5 [data-r]{ opacity:0; transform:translateY(26px); transition:opacity .9s cubic-bezier(.16,1,.3,1) var(--d,0ms), transform .9s cubic-bezier(.16,1,.3,1) var(--d,0ms); }
.js .s5 [data-r].in{ opacity:1; transform:none; }
.js .s5 .split .w{ display:inline-block; overflow:hidden; vertical-align:top; padding-bottom:.08em; margin-bottom:-.08em; }
.js .s5 .split .w > span{ display:inline-block; transform:translateY(105%); transition:transform 1s cubic-bezier(.16,1,.3,1) var(--d,0ms); }
.js .s5 .split.in .w > span{ transform:none; }
@media (prefers-reduced-motion: reduce){ .js .s5 [data-r], .js .s5 .split .w > span{ opacity:1!important; transform:none!important; transition:none!important; } }
@media (max-width:960px){
  .s5-hero{ grid-template-columns:minmax(0,1fr); min-height:auto; padding-top:30px; } .s5-live{ grid-template-columns:repeat(2,minmax(0,1fr)); } .s5-live > div{ padding:22px 16px; } .s5-live b{ font-size:32px; }
  .s5-live > div:nth-child(3){ border-left:0; } .s5-live > div:nth-child(n+3){ border-top:1px solid var(--border); }
  .s5-story{ grid-template-columns:minmax(0,1fr); padding-top:60px; } .s5-pin{ display:none; } .s5-chap{ min-height:auto; padding:40px 0; } .s5-mphone{ display:flex; justify-content:center; margin-top:36px; }
  .s5-pts{ grid-template-columns:1fr; } .s5-faq{ grid-template-columns:minmax(0,1fr); } .s5-end{ grid-template-columns:1fr; padding:52px 28px; } }
</style>`;
const HOME_SCRIPTS = `<script src="/js/gsap.min.js" defer></script><script src="/js/ScrollTrigger.min.js" defer></script>
<script>
window.addEventListener('DOMContentLoaded', function(){
  var R = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.s5 .split').forEach(function(el){ var i = 0;
    el.innerHTML = el.innerHTML.trim().split(/(\\s+|<[^>]+>)/).filter(Boolean).map(function(t){ if(/^</.test(t)) return t; if(/^\\s+$/.test(t)) return ' '; return '<span class="w"><span style="--d:' + (i++ * 55) + 'ms">' + t + '</span></span>'; }).join(''); });
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .16, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.s5 [data-r], .s5 .split').forEach(function(el){ if(el.dataset.r) el.style.setProperty('--d', el.dataset.r + 'ms'); R ? el.classList.add('in') : io.observe(el); });
  var fmt = function(n){ return n.toLocaleString('en-CA'); };
  document.querySelectorAll('.s5 [data-count]').forEach(function(el){ var end = +el.dataset.count; if(R) return; el.textContent = '0';
    var o = new IntersectionObserver(function(es){ if(!es[0].isIntersecting) return; o.disconnect(); var t0 = performance.now();
      (function step(t){ var p = Math.min(1, (t - t0) / 1500), k = 1 - Math.pow(1 - p, 4); el.textContent = fmt(Math.round(end * k)); if(p < 1) requestAnimationFrame(step); })(t0); }, { threshold: .6 });
    o.observe(el); });
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

  const body = `${nav('', 'app')}
<main class="s5">
<div class="wrap">
  <section class="s5-hero">
    <div><h1 class="split">Your Express Entry journey, <em>in one app.</em></h1>
      <p data-r="500" class="s5-sub">Your CRS on IRCC’s official grid, every draw within minutes, your file tracked to the decision.</p>
      <div data-r="650" style="display:flex;gap:12px;flex-wrap:wrap"><a class="s5-btn s5-red" href="${APP_STORE_URL}">${APPLE(18)} Download for iPhone</a><a class="s5-btn s5-soft" href="/calculators">Calculate my CRS</a></div></div>
    <div class="s5-stage" data-r="0">${phone('home', 320)}</div>
  </section>
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
    <div class="s5-snap">${[['CRS', 'Express Entry', '1,200', 'The Comprehensive Ranking System IRCC uses to rank every profile in the pool.', ''], ['FSW', '67-point grid', '100', 'Federal Skilled Worker eligibility: six selection factors, 67 to qualify.', '#fsw'], ['BC PNP', 'SIRS', '200', 'British Columbia’s Skills Immigration Registration System score.', '#bc'], ['SINP', 'EOI', '110', 'Saskatchewan’s International Skilled Worker points assessment.', '#sinp']].map(([a, b, mx, d, h], i) => `<a href="/calculators${h}" data-r="${i * 90}"><b style="font-size:20px">${a}</b><span style="opacity:.75">${b}</span><p>${d}</p><span class="s5-max">${mx}</span></a>`).join('')}</div></section>
  <section class="s5-priv"><p class="s5-big" id="privline">${privacy.split(' ').map((w) => `<span class="wd${/yours|never/.test(w) ? ' red' : ''}">${w}</span>`).join(' ')}</p>
    <div class="s5-pts">${PRIVACY_POINTS.map((p, i) => `<p data-r="${i * 80}"><span style="color:var(--success);flex-shrink:0;margin-top:3px">${icon('lock', 19)}</span><span>${p}</span></p>`).join('')}</div></section>
  <section class="s5-faq" id="faq"><h2 data-r="0">Questions people ask.</h2>${FAQ.map(([q, a], i) => `<details data-r="${(i % 2) * 80}"><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
  <section class="s5-end" data-r="0"><h2>Check your CRS score tonight.</h2><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="s5-btn s5-white" href="${APP_STORE_URL}">${APPLE(18)} App Store</a><a class="s5-btn" style="background:rgba(255,255,255,.14);color:#fff" href="/calculators">Calculators</a></div></section>
</div>
</main>
${footerFull()}`;
  return shell({ ...page('index'), jsonld: homeJsonLd(), body: noDashes(body), head2: HOME_HEAD, scripts: HOME_SCRIPTS });
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
      <div style="font-family:'Space Grotesk',sans-serif;font-size:48px;font-weight:700;color:var(--success);letter-spacing:-2px;line-height:1">High</div>
      <div style="height:8px;background:var(--bg3);border-radius:5px;overflow:hidden;margin:14px 0 8px"><div style="height:100%;width:78%;background:var(--success);border-radius:5px"></div></div>
      <div style="font-size:12.5px;color:var(--text2)">Score 512 · 41 above the trend cutoff · top 18% of the pool</div></div>`,
  },
];

function featuresPage() {
  const block = (b) => `
<div class="fblock" data-reveal style="display:flex;gap:56px;align-items:center;padding:44px 0;border-top:1px solid var(--hairline);${b.reverse ? 'flex-direction:row-reverse' : ''}">
  <div style="flex:1;min-width:0">
    <div class="eyebrow" style="display:flex;align-items:center;gap:8px">${icon(b.icon, 16)}${b.tag}</div>
    <h2 style="font-family:'Space Grotesk',sans-serif;font-size:28px;line-height:1.12;letter-spacing:-.8px;font-weight:700;margin:0 0 12px">${b.title}</h2>
    <p style="font-size:15.5px;line-height:1.6;color:var(--text2);margin:0 0 18px">${b.body}</p>
    <div style="display:flex;flex-direction:column;gap:9px">${b.points.map((p) => `<div style="display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--text2)"><span style="color:var(--success);margin-top:3px;flex-shrink:0">${CHECK}</span><span>${p}</span></div>`).join('')}</div>
  </div>
  <div class="fvisual" style="flex:0 0 320px;max-width:320px;width:100%">${b.visual}</div>
</div>`;
  const body = `${nav('features', 'calc')}
<div style="min-height:100vh;position:relative">
<div style="position:relative;z-index:1">
<section style="max-width:1200px;margin:0 auto;padding:52px 24px 24px">
  ${eyebrow('Features')}
  <h1 style="font-family:'Space Grotesk',sans-serif;font-size:44px;line-height:1.04;letter-spacing:-1.8px;font-weight:700;margin:0 0 14px">From your first estimate to <span style="color:var(--accentInk)">landing day</span></h1>
  <p style="font-size:16.5px;line-height:1.6;color:var(--text2);margin:0;max-width:660px">CRS Pulse mirrors the real IRCC process at every step. Here's everything the app does — the same information you get on your iPhone, laid out in one place.</p>
</section>
<section style="max-width:1200px;margin:0 auto;padding:20px 24px;display:flex;flex-direction:column;gap:20px">
  ${FEATURE_BLOCKS.map(block).join('')}
</section>
<section style="max-width:1200px;margin:0 auto;padding:60px 24px 80px">
  <div style="background:linear-gradient(150deg,var(--grad1),var(--grad2));border:1px solid var(--border);border-radius:24px;padding:52px 40px;text-align:center">
    <h2 style="font-family:'Space Grotesk',sans-serif;font-size:34px;letter-spacing:-1px;font-weight:700;margin:0 0 14px">Have it all in your pocket</h2>
    <p style="font-size:16px;color:var(--text2);margin:0 auto 26px;max-width:460px">Free on iPhone. No account, and your profile stays on your device.</p>
    <div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center">${appBtn()}${accentBtn('/calculators', 'Try the calculators →')}</div>
  </div>
</section>
</div>
${footerSlim('Unofficial and not affiliated with IRCC or the Government of Canada. Estimates only — not immigration advice. © ' + new Date().getFullYear() + ' CRS Pulse.')}
</div>`;
  return shell({ ...page('features'), body });
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
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end"><span style="font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;color:var(--text)">${d.cutoff}</span><div style="width:100%;height:${h}px;border-radius:7px 7px 3px 3px;background:${isCat ? 'var(--catbar)' : 'var(--accent)'}"></div><span style="font-size:10.5px;color:var(--muted);text-align:center;line-height:1.2">${d.date.replace(/, 20\d\d/, '')}</span></div>`;
  }).join('');
  const poolMax = Math.max(...POOL.map((p) => p[2]));
  const stat = (label, val, sub, big) => `<div style="background:${big ? 'linear-gradient(155deg,var(--grad1),var(--grad2))' : 'var(--card)'};border:1px solid var(--border);border-radius:16px;padding:20px"><div style="font-size:11.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${label}</div><div style="font-family:'Space Grotesk',sans-serif;font-size:34px;font-weight:700;letter-spacing:-1.5px;color:${big ? 'var(--accent)' : 'var(--text)'}">${val}</div><div style="font-size:12.5px;color:var(--text2);margin-top:2px">${sub}</div></div>`;

  const body = `${nav('draws', 'app')}
<div style="min-height:100vh;position:relative">
<div style="position:relative;z-index:1">
<section style="max-width:1200px;margin:0 auto;padding:52px 24px 20px">
  ${eyebrow('Draws &amp; Trends')}
  <h1 style="font-family:'Space Grotesk',sans-serif;font-size:44px;line-height:1.04;letter-spacing:-1.8px;font-weight:700;margin:0 0 14px">Rounds of invitations, <span style="color:var(--accentInk)">live from IRCC</span></h1>
  <p style="font-size:16.5px;line-height:1.6;color:var(--text2);margin:0;max-width:660px">The app pulls every round directly from the official IRCC public feed. Filter by category, watch cutoff trends and draw cadence, and see where you sit in the pool. The figures below mirror IRCC's feed as of ${FEED.updatedFull ?? FEED.updated}; the app refreshes live.</p>
</section>

<section style="max-width:1200px;margin:0 auto;padding:14px 24px 8px">
  <div class="statgrid" data-reveal style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
    ${stat(`Latest draw · ${latest.date.replace(/, \d{4}$/, '')}`, latest.cutoff, `${latest.label} · ${latest.invited} invited`, true)}
    ${stat(`ITAs in ${FEED.ytd.year}`, num(FEED.ytd.invitations), `across ${FEED.ytd.rounds} rounds YTD`)}
    ${stat('Candidate pool', num(FEED.poolTotal), `profiles competing${FEED.distributionAsOf ? ` · ${FEED.distributionAsOf}` : ''}`)}
    ${stat('Active categories', String(FEED.ytd.categories), `for ${FEED.ytd.year} selection`)}
  </div>
</section>

<section style="max-width:1200px;margin:0 auto;padding:32px 24px 8px">
  <div data-reveal style="background:var(--card);border:1px solid var(--border);border-radius:18px;padding:24px">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:22px">
      <div><h2 style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;margin:0 0 4px">CRS cutoff trend</h2><p style="font-size:13px;color:var(--text2);margin:0">Minimum score by round — most recent 10 draws (left → right)</p></div>
      <div style="display:flex;gap:16px;font-size:12px;color:var(--text2)"><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--accent)"></span>General / CEC</span><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--catbar)"></span>Category &amp; provincial</span></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px;height:200px">${chart}</div>
  </div>
</section>

<section style="max-width:1200px;margin:0 auto;padding:32px 24px">
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px">
    ${DRAW_FILTERS.map((c, i) => `<button class="filterchip${i === 0 ? ' on' : ''}" onclick="filterDraws('${c}',this)">${c}</button>`).join('')}
  </div>
  <div class="drawscroll" style="background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden">
    <div class="drawinner" id="drawtable">
      <div style="display:grid;grid-template-columns:70px 96px 1fr 120px 100px;gap:12px;padding:14px 22px;border-bottom:1px solid var(--border);color:var(--muted);font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase"><span>Round</span><span>Date</span><span>Category</span><span style="text-align:right">Invitations</span><span style="text-align:right">Cutoff</span></div>
      ${ALL_DRAWS.map((d, i) => `<div class="drawrow" data-cat="${d.cat}" style="display:grid;grid-template-columns:70px 96px 1fr 120px 100px;gap:12px;padding:14px 22px;border-bottom:1px solid var(--border);align-items:center"><div style="font-weight:700;font-size:14px;color:var(--text)">#${d.no}</div><div style="font-size:13px;color:var(--text2)">${d.date}</div><div style="display:flex;align-items:center;gap:9px"><span style="width:9px;height:9px;border-radius:50%;background:${d.dot};flex-shrink:0"></span><span style="font-size:14.5px;font-weight:600;color:var(--text)">${d.cat}</span></div><div style="text-align:right;font-size:14px;color:var(--text2)">${d.invited}</div><div style="text-align:right"><span style="font-family:'Space Grotesk',sans-serif;font-size:19px;font-weight:700;color:${i === 0 ? 'var(--accentInk)' : 'var(--text)'}">${d.cutoff}</span></div></div>`).join('')}
      <div style="padding:13px 22px;color:var(--muted);font-size:11.5px">Last ${ALL_DRAWS.length} rounds, mirrored from IRCC on ${FEED.updatedFull ?? FEED.updated} · in the app this table syncs the live IRCC feed with pull-to-refresh.</div>
    </div>
  </div>
</section>

<section style="max-width:1200px;margin:0 auto;padding:8px 24px 40px">
  <div class="poolgrid" data-reveal style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div style="background:var(--card);border:1px solid var(--border);border-radius:18px;padding:24px">
      <h2 style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;margin:0 0 4px">Pool composition</h2>
      <p style="font-size:13px;color:var(--text2);margin:0 0 20px">Candidates by CRS range — a recent IRCC snapshot</p>
      <div style="display:flex;flex-direction:column;gap:16px">${POOL.map(([range, count, n]) => `<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:var(--text2);font-weight:600">${range}</span><span style="color:var(--text);font-weight:700;font-family:'Space Grotesk',sans-serif">${count}</span></div><div style="height:8px;background:var(--bg3);border-radius:5px;overflow:hidden"><div style="height:100%;border-radius:5px;width:${Math.round((n / poolMax) * 100)}%;background:linear-gradient(90deg,var(--accent2),var(--accent))"></div></div></div>`).join('')}</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:18px;padding:24px">
      <h2 style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;margin:0 0 4px">What the trends tell you</h2>
      <p style="font-size:13px;color:var(--text2);margin:0 0 18px">Analytics in the app turn this into your personal odds</p>
      <div style="display:flex;flex-direction:column;gap:14px">${INSIGHTS.map(([ico, title, bodyt]) => `<div style="display:flex;gap:12px;align-items:flex-start"><span style="width:32px;height:32px;border-radius:9px;background:var(--accentSoft);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon(ico, 17)}</span><div><div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:2px">${title}</div><div style="font-size:13px;line-height:1.5;color:var(--text2)">${bodyt}</div></div></div>`).join('')}</div>
      <a class="link-accent" href="/features" style="display:inline-flex;align-items:center;gap:6px;margin-top:20px;font-size:14px;font-weight:600">See analytics features →</a>
    </div>
  </div>
</section>
</div>
${footerSlim('Unofficial and not affiliated with IRCC or the Government of Canada. Draw figures are for guidance only — verify at canada.ca. © ' + new Date().getFullYear() + ' CRS Pulse.')}
</div>
<script>
function filterDraws(cat,btn){document.querySelectorAll('#drawtable .drawrow').forEach(function(r){r.style.display=(cat==='All'||r.getAttribute('data-cat')===cat)?'':'none'});document.querySelectorAll('.filterchip').forEach(function(c){c.classList.remove('on')});btn.classList.add('on')}
</script>`;
  return shell({ ...page('draws'), body });
}

// ------------------------------------------------------------------ CALCULATORS
// Option lists (verbatim from the design component).
const CLB_OPTS = [{ v: 0, l: 'Below CLB 4' }, { v: 4, l: 'CLB 4' }, { v: 5, l: 'CLB 5' }, { v: 6, l: 'CLB 6' }, { v: 7, l: 'CLB 7' }, { v: 8, l: 'CLB 8' }, { v: 9, l: 'CLB 9' }, { v: 10, l: 'CLB 10+' }];
const CRS_EDU_OPTS = [{ v: 'less_than_secondary', l: 'Less than secondary' }, { v: 'secondary', l: 'Secondary / high school' }, { v: '1year', l: '1-year post-secondary' }, { v: '2year', l: '2-year post-secondary' }, { v: 'bachelors', l: "Bachelor's degree" }, { v: 'two_or_more', l: 'Two or more credentials' }, { v: 'masters', l: "Master's / professional" }, { v: 'phd', l: 'Doctoral (PhD)' }];
const CWE_OPTS = [{ v: 0, l: 'None' }, { v: 1, l: '1 year' }, { v: 2, l: '2 years' }, { v: 3, l: '3 years' }, { v: 4, l: '4 years' }, { v: 5, l: '5+ years' }];
const FSW_EDU_OPTS = [{ v: 'phd', l: 'Doctoral (PhD)' }, { v: 'masters_professional', l: "Master's / professional" }, { v: 'two_or_more', l: 'Two or more credentials' }, { v: 'bachelors_3yr', l: '3-year+ degree' }, { v: 'diploma_2yr', l: '2-year diploma' }, { v: 'diploma_1yr', l: '1-year diploma' }, { v: 'secondary', l: 'Secondary' }];
const FSW_WORK_OPTS = [{ v: 'none', l: 'None' }, { v: '1', l: '1 year' }, { v: '2_3', l: '2–3 years' }, { v: '4_5', l: '4–5 years' }, { v: '6plus', l: '6+ years' }];
const FSW_CLB_OPTS = [{ v: 'clb9plus', l: 'CLB 9+' }, { v: 'clb8', l: 'CLB 8' }, { v: 'clb7', l: 'CLB 7' }, { v: 'below7', l: 'Below CLB 7' }];
const SIRS_WORK_OPTS = [{ v: 'none', l: 'None' }, { v: '1_2', l: '1–2 years' }, { v: '2_3', l: '2–3 years' }, { v: '3_4', l: '3–4 years' }, { v: '4_5', l: '4–5 years' }, { v: '5plus', l: '5+ years' }];
const SIRS_EDU_OPTS = [{ v: 'doctorate', l: 'Doctorate' }, { v: 'masters', l: "Master's" }, { v: 'postgrad_cert', l: 'Post-grad certificate' }, { v: 'bachelors', l: "Bachelor's" }, { v: 'associate', l: 'Associate degree' }, { v: 'diploma_cert', l: 'Diploma / certificate' }, { v: 'secondary', l: 'Secondary' }];
const SIRS_CLB_OPTS = [{ v: 'clb9plus', l: 'CLB 9+' }, { v: 'clb8', l: 'CLB 8' }, { v: 'clb7', l: 'CLB 7' }, { v: 'clb6', l: 'CLB 6' }, { v: 'clb5', l: 'CLB 5' }, { v: 'clb4', l: 'CLB 4' }, { v: 'below4', l: 'Below CLB 4' }];
const SINP_EDU_OPTS = [{ v: 'masters_phd', l: "Master's / PhD" }, { v: 'bachelors', l: "Bachelor's (3-4 yr)" }, { v: 'trade_cert', l: 'Trade certificate' }, { v: 'diploma_2yr', l: '2-year diploma' }, { v: 'diploma_1yr', l: '1-year diploma' }, { v: 'none', l: 'None' }];
const SINP_AGE_OPTS = [{ v: 'under18', l: 'Under 18' }, { v: '18_21', l: '18–21' }, { v: '22_34', l: '22–34' }, { v: '35_45', l: '35–45' }, { v: '46_50', l: '46–50' }, { v: 'over50', l: 'Over 50' }];
const SINP_CLB_OPTS = [{ v: 'clb8plus', l: 'CLB 8+' }, { v: 'clb7', l: 'CLB 7' }, { v: 'clb6', l: 'CLB 6' }, { v: 'clb5', l: 'CLB 5' }, { v: 'clb4', l: 'CLB 4' }, { v: 'below4', l: 'Below CLB 4 / none' }];
const YEAR_OPTS = [{ v: 0, l: '0 years' }, { v: 1, l: '1 year' }, { v: 2, l: '2 years' }, { v: 3, l: '3 years' }, { v: 4, l: '4 years' }, { v: 5, l: '5 years' }];

const STATE0 = {
  crs: { maritalStatus: 'single', age: 29, education: 'bachelors', canadianEducation: 'none', firstLang: { speaking: 9, listening: 9, reading: 9, writing: 9 }, hasSecondLang: false, secondLang: { speaking: 0, listening: 0, reading: 0, writing: 0 }, canadianWorkExp: 1, foreignWorkExp: 1, spouseEducation: 'bachelors', spouseLang: { speaking: 0, listening: 0, reading: 0, writing: 0 }, spouseCanadianWorkExp: 0, hasProvincialNomination: false, hasSiblingInCanada: false, hasTradeCert: false, frenchNCLC7: false },
  fsw: { age: 30, education: 'bachelors_3yr', workYears: '4_5', langLevel: 'clb9plus', secondLangClb5: false, hasArrangedEmployment: false, studiedInCanada: false, workedInCanada: false, hasRelativeInCanada: false, spouseLangClb4: false, spouseStudiedInCanada: false, spouseWorkedInCanada: false },
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
const lblSelect = (field, cur, opts, label, style = SEL, lblStyle = LBL) =>
  `<label style="${lblStyle}">${label}<select data-field="${field}" style="${style}">${opts.map((o) => optTag(o, cur)).join('')}</select></label>`;
const lblInput = (field, cur, label, attrs) =>
  `<label style="${LBL}">${label}<input data-field="${field}" value="${cur}" ${attrs} style="${INP}"></label>`;
const rawSelect = (field, cur, opts) => `<select data-field="${field}" style="${SEL}">${opts.map((o) => optTag(o, cur)).join('')}</select>`;
const chip = (field, label) => `<button class="chip" data-field="${field}">${label}</button>`;
const langGrid = (prefix, obj, opts = CLB_OPTS, pre = '') =>
  ['speaking', 'listening', 'reading', 'writing'].map((k) => lblSelect(`${prefix}.${k}`, obj[k], opts, `${pre}${k[0].toUpperCase()}${k.slice(1)}`, SEL_SM, LBL_SM)).join('');

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
      ${lblSelect('crs.canadianEducation', c.canadianEducation, [{ v: 'none', l: 'None' }, { v: '1_2year', l: '1–2 year credential' }, { v: '3year_plus', l: '3-year+ / graduate' }], 'Canadian education')}
    </div>
  </div>
  <div style="${CARD}">
    <div style="font-size:12.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">First official language</div>
    <p style="font-size:12px;color:var(--muted);margin:0 0 14px">Enter your CLB / NCLC level per ability (convert IELTS · CELPIP · PTE · TEF in-app).</p>
    <div class="fields4" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">${langGrid('crs.firstLang', c.firstLang)}</div>
    <button class="chip" id="crs-second-chip" data-field="crs.hasSecondLang" style="margin-top:14px">+ Add a second official language</button>
    <div id="crs-second" style="display:none">
      <div class="fields4" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-top:14px">${langGrid('crs.secondLang', c.secondLang, CLB_OPTS, '2nd ')}</div>
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
      <div style="font-size:12px;color:var(--text2);font-weight:600;margin-bottom:8px">Spouse language (CLB, all four abilities)</div>
      <div class="fields4" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">${langGrid('crs.spouseLang', c.spouseLang)}</div>
    </div>
  </div>
  <div style="${CARD}">
    <div style="font-size:12.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">Additional points</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${chip('crs.hasProvincialNomination', 'Provincial nomination (+600)')}${chip('crs.hasSiblingInCanada', 'Sibling in Canada (+15)')}${chip('crs.hasTradeCert', 'Trade certificate')}${chip('crs.frenchNCLC7', 'French NCLC 7+ all abilities')}
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
      ${lblSelect('fsw.langLevel', f.langLevel, FSW_CLB_OPTS, 'First-language ability (lowest of 4)')}
    </div>
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

  return crsForm + fswForm + bcForm + sinpForm;
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
    if (i.frenchNCLC7) addPts += (minClb>=5 ? 50 : 25);
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

// Client engine: calc functions verbatim from the design component.
const CALC_SCRIPT = `<script>
(function(){
  var state = ${JSON.stringify(STATE0)};
  var active = 'crs';
  var TITLES = { crs:'CRS — Express Entry score', fsw:'Federal Skilled Worker — 67-point grid', bc:'BC PNP — SIRS score', sinp:'Saskatchewan SINP — EOI points' };
  var SUBS = { crs:'Official IRCC Comprehensive Ranking System, out of 1,200.', fsw:'Six selection factors — 67 of 100 needed to be eligible.', bc:'Skills Immigration Registration System, out of 200.', sinp:'International Skilled Worker EOI — 60 of 110 to qualify.' };

  function getPath(f){ return f.split('.').reduce(function(o,k){ return o==null?o:o[k]; }, state); }
  function setPath(f,v){ var p=f.split('.'); var o=state; for(var i=0;i<p.length-1;i++){ o=o[p[i]]; } o[p[p.length-1]]=v; }
  function bar(pct,color){ return 'height:100%;border-radius:6px;width:'+Math.max(0,Math.min(100,pct))+'%;background:'+color; }

${CRS_CALC_SRC}
  function fswCalc(i){
    var LANG = { clb9plus:6, clb8:5, clb7:4, below7:0 };
    var EDU = { phd:25, masters_professional:23, two_or_more:22, bachelors_3yr:21, diploma_2yr:19, diploma_1yr:15, secondary:5 };
    var WORK = { none:0, '1':9, '2_3':11, '4_5':13, '6plus':15 };
    var agePts = (i.age<18||i.age>=47)?0:(i.age<=35?12:Math.max(0,12-(i.age-35)));
    var per = LANG[i.langLevel]; var language = Math.min(28, per*4 + (i.secondLangClb5?4:0));
    var education = EDU[i.education];
    var work = WORK[i.workYears];
    var arranged = i.hasArrangedEmployment?10:0;
    var adapt = Math.min(10,
      (i.spouseLangClb4?5:0)+(i.studiedInCanada?5:0)+(i.spouseStudiedInCanada?5:0)+
      (i.workedInCanada?10:0)+(i.spouseWorkedInCanada?5:0)+(i.hasArrangedEmployment?5:0)+(i.hasRelativeInCanada?5:0));
    var total = language+education+work+agePts+arranged+adapt;
    return { total:total, pass: total>=67 && i.langLevel!=='below7' && i.workYears!=='none', rows:[
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
      var r=crsCalc(state.crs); var strong=r.total>=520, near=r.total>=470;
      return { label:'Comprehensive Ranking System', total:r.total, max:'1,200',
        badgeText: strong?'Competitive':near?'In range':'Build it up',
        badgeStyle:'padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:'+(strong?'var(--successSoft)':near?'var(--warningSoft)':'var(--bg3)')+';color:'+(strong?'var(--success)':near?'var(--warningInk)':'var(--text2)'),
        barPct:Math.round(r.total/1200*100),
        note: strong?'At or above many recent general/CEC cutoffs. A provincial nomination adds 600 points.':'Recent CEC cutoffs sat around 507–518; category draws can go far lower. A nomination adds 600 points.',
        rows:r.rows, grad:grad };
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
    document.getElementById('r-rows').innerHTML=res.rows.map(function(x){
      var pct=x.max?Math.round(x.val/x.max*100):0;
      return '<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:var(--text2)">'+x.label+'</span><span style="color:var(--text);font-weight:700"><span style="font-family:\\'Space Grotesk\\',sans-serif">'+x.val+'</span> <span style="color:var(--muted);font-weight:500">/ '+x.max+'</span></span></div><div style="height:5px;background:var(--bg3);border-radius:4px;overflow:hidden"><div style="'+bar(pct,'var(--accent)')+'"></div></div></div>';
    }).join('');
  }
  function syncVis(){
    var sp=document.getElementById('crs-spouse'); if(sp) sp.style.display=state.crs.maritalStatus==='married'?'':'none';
    var sc=document.getElementById('crs-second'); if(sc) sc.style.display=state.crs.hasSecondLang?'':'none';
  }
  function setTab(id){
    active=id;
    document.querySelectorAll('.calctab').forEach(function(t){ var on=t.getAttribute('data-tab')===id; t.classList.toggle('on', on); t.setAttribute('aria-pressed', on); });
    if(history.replaceState) history.replaceState(null, '', id==='crs' ? location.pathname : '#'+id);
    ['crs','fsw','bc','sinp'].forEach(function(k){ var el=document.getElementById('form-'+k); if(el) el.style.display=(k===id)?'flex':'none'; });
    document.getElementById('calc-title').textContent=TITLES[id];
    document.getElementById('calc-sub').textContent=SUBS[id];
    syncVis(); render();
  }

  var root=document.getElementById('calc');
  root.addEventListener('change', function(e){
    var t=e.target; var f=t.getAttribute('data-field'); if(!f) return;
    var raw=t.value; var n=Number(raw); var val=(raw!==''&&!isNaN(n))?n:raw;
    setPath(f,val); syncVis(); render();
  });
  root.querySelectorAll('.chip[data-field]').forEach(function(b){
    b.addEventListener('click', function(){
      var f=b.getAttribute('data-field'); setPath(f,!getPath(f)); b.classList.toggle('on', !!getPath(f));
      if(f==='crs.hasSecondLang'){ b.textContent=getPath(f)?'✓ Second official language added':'+ Add a second official language'; }
      syncVis(); render();
    });
  });
  document.querySelectorAll('.calctab').forEach(function(tb){ tb.addEventListener('click', function(){ setTab(tb.getAttribute('data-tab')); }); });
  // Phones: the score bar pins to the bottom while the result card is off-screen.
  var sb=document.getElementById('scorebar'), rc=document.getElementById('calc-result');
  if(sb && rc && 'IntersectionObserver' in window){
    new IntersectionObserver(function(es){ sb.classList.toggle('hide', es[0].isIntersecting); }).observe(rc);
  }
  // /calculators#fsw (footer, other pages) opens that grid directly.
  var fromHash=location.hash.slice(1);
  if(TITLES[fromHash] && fromHash!=='crs') setTab(fromHash); else { syncVis(); render(); }
})();
</script>`;

function calculatorsPage() {
  const tabs = [['crs', 'calc', 'CRS'], ['fsw', 'checkCircle', 'FSW 67-point'], ['bc', 'compass', 'BC PNP SIRS'], ['sinp', 'pin', 'Saskatchewan SINP']]
    .map(([id, ico, label], i) => `<button class="calctab${i === 0 ? ' on' : ''}" data-tab="${id}" aria-pressed="${i === 0}">${icon(ico, 17)} ${label}</button>`).join('');
  const body = `${nav('calc', 'app')}
<div style="min-height:100vh;position:relative">
<div style="position:relative;z-index:1">
<section style="max-width:1200px;margin:0 auto;padding:52px 24px 24px">
  ${eyebrow('Calculators')}
  <h1 style="font-family:'Space Grotesk',sans-serif;font-size:44px;line-height:1.04;letter-spacing:-1.8px;font-weight:700;margin:0 0 14px">Score yourself against <span style="color:var(--accentInk)">every grid</span></h1>
  <p style="font-size:16.5px;line-height:1.6;color:var(--text2);margin:0;max-width:640px">Pick a program below. Everything computes live in your browser — nothing is sent anywhere. These are estimates for planning; always confirm with the official IRCC or provincial tool.</p>
</section>
<section style="max-width:1200px;margin:0 auto;padding:0 24px">
  <div class="calctabs" style="display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--border)">${tabs}</div>
</section>
<section id="calc" class="calcbody" style="max-width:1200px;margin:0 auto;padding:28px 24px 40px;display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:start">
  <div>
    <div style="margin-bottom:18px">
      <h2 id="calc-title" style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;letter-spacing:-.5px;margin:0 0 4px">CRS — Express Entry score</h2>
      <p id="calc-sub" style="font-size:14px;color:var(--text2);margin:0">Official IRCC Comprehensive Ranking System, out of 1,200.</p>
    </div>
    ${calcForms()}
  </div>
  <div class="calcresult" id="calc-result" data-reveal style="position:sticky;top:88px;scroll-margin-top:80px">
    <div style="background:linear-gradient(155deg,var(--grad1),var(--grad2));border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:var(--shadow)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span id="r-label" style="font-size:11.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted)">Comprehensive Ranking System</span>
        <span id="r-badge"></span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px">
        <span id="r-total" style="font-family:'Space Grotesk',sans-serif;font-size:64px;font-weight:700;letter-spacing:-3px;color:var(--text);line-height:1">0</span>
        <span id="r-max" style="font-size:17px;color:var(--muted);font-weight:600">/ 1,200</span>
      </div>
      <div style="height:8px;background:var(--bg3);border-radius:6px;overflow:hidden;margin:14px 0 6px"><div id="r-bar" style="height:100%;width:0"></div></div>
      <p id="r-note" style="font-size:12.5px;line-height:1.5;color:var(--text2);margin:8px 0 0"></p>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:18px;padding:20px;margin-top:16px">
      <div style="font-size:12.5px;font-weight:700;color:var(--text);margin-bottom:14px">Points breakdown</div>
      <div id="r-rows" style="display:flex;flex-direction:column;gap:14px"></div>
    </div>
    <a class="link-accent" href="/" style="display:block;text-align:center;font-size:12.5px;color:var(--muted);margin-top:16px">Estimate only · verify with the official tool ↗</a>
  </div>
</section>
</div>
${footerSlim('Unofficial and not affiliated with IRCC or the Government of Canada. Estimates only — not immigration advice. © ' + new Date().getFullYear() + ' CRS Pulse.')}
</div>
<a class="scorebar" id="scorebar" href="#calc-result" aria-label="See your score breakdown">
  <span style="display:flex;flex-direction:column;min-width:0"><span id="sb-label" style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Comprehensive Ranking System</span><span style="font-size:12.5px;color:var(--text2)">Tap for the breakdown</span></span>
  <span style="display:flex;align-items:baseline;gap:5px;white-space:nowrap;flex-shrink:0"><span id="sb-total" class="num" style="font-size:30px;line-height:1;color:var(--text)">0</span><span id="sb-max" style="font-size:13px;color:var(--muted);font-weight:600">/ 1,200</span></span>
</a>
${CALC_SCRIPT}`;
  return shell({ ...page('calculators'), jsonld: calcJsonLd(), body });
}

// ------------------------------------------------------------------ DOCS
function doc(file, mdFile) {
  const md = docMd(mdFile);
  const body = `${nav('', 'calc')}
<div style="min-height:100vh;position:relative">
<main class="doc"><article class="doc-card">${addHeadingIds(marked.parse(md))}</article></main>
${footerSlim('Unofficial and not affiliated with IRCC or the Government of Canada. Estimates only — not immigration advice. © ' + new Date().getFullYear() + ' CRS Pulse.')}
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

All four run in the browser at ${SITE}/calculators — inputs are never uploaded.

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

const calculatorsMd = () => `${mdHead('calculators')}
Four point grids, each computed live in the browser. Nothing is sent to a server. These are
estimates for planning — confirm a final score with the official IRCC or provincial tool.

${CALC_META.map(([key, name, max, desc]) => `## ${name}

Maximum: **${max}**

${desc}

Inputs: ${Object.keys(STATE0[key]).join(', ')}.`).join('\n\n')}

## Which grid applies

- Everyone in the Express Entry pool is ranked by **CRS**.
- **FSW 67** is the eligibility test for the Federal Skilled Worker program; it does not
  affect CRS ranking.
- **BC PNP SIRS** and **SINP EOI** are provincial nominee streams. A provincial nomination
  adds 600 CRS points, which is why nomination rounds show cutoffs above 700.

Try them: ${SITE}/calculators

${MD_FOOTER}
`;

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

const MD_PAGES = {
  'index.md': homeMd,
  'calculators.md': calculatorsMd,
  'draws.md': drawsMd,
  'features.md': featuresMd,
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
  of 1,200 — see ${SITE}/calculators.md for the exact input list per grid.
- **Checking eligibility before ranking.** The FSW 67-point grid decides whether a profile
  can enter the Federal Skilled Worker pool at all; CRS only ranks profiles already in it.
- **Comparing a score against real cutoffs.** ${SITE}/draws.md carries round number, date,
  category, invitations issued and cutoff CRS, plus the pool distribution by CRS band, so a
  score can be placed against what actually got invited.
- **Explaining category-based draws.** Why a French-language or healthcare round can cut off
  near 380–480 while a general round sits above 500, and why nomination rounds exceed 700.
- **Provincial nominee scoring.** BC PNP SIRS (200 points) and Saskatchewan SINP EOI
  (110 points, 60 to qualify).
- **Application-stage questions.** Processing-time estimates, per-program document
  checklists, and the ITA → e-APR → AOR → biometrics → medical → PPR milestone sequence:
  ${SITE}/features.md.

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
  ${eyebrow('Error 404')}
  <h1 style="font-family:'Space Grotesk',sans-serif;font-size:44px;line-height:1.04;letter-spacing:-1.8px;font-weight:700;margin:0 0 14px">This page doesn't <span style="color:var(--accentInk)">exist</span></h1>
  <p style="font-size:16.5px;line-height:1.6;color:var(--text2);margin:0 0 30px;max-width:620px">The link may be old or mistyped. Everything on crspulse.com lives at one of these pages:</p>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${links.map(([href, label, desc]) => `<a class="lift" href="${href}" style="display:block;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;color:var(--text)"><div style="font-size:15px;font-weight:700;margin-bottom:3px">${label}</div><div style="font-size:13px;line-height:1.5;color:var(--text2)">${desc}</div></a>`).join('')}
  </div>
  <div style="margin-top:34px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">For AI agents</div>
    <pre style="margin:0;overflow-x:auto;font-size:12.5px;line-height:1.6;color:var(--text2);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap">${agentMd.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
  </div>
</main>
${footerSlim('Unofficial and not affiliated with IRCC or the Government of Canada. Estimates only — not immigration advice. © ' + new Date().getFullYear() + ' CRS Pulse.')}
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

// The four in-browser calculators as free web applications.
const calcJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    ['CRS calculator (Express Entry)', 'Comprehensive Ranking System score out of 1,200, using IRCC\u2019s published grid.'],
    ['FSW 67-point calculator', 'Federal Skilled Worker selection grid: six factors, 67 points to be eligible.'],
    ['BC PNP SIRS calculator', 'British Columbia Skills Immigration Registration System score out of 200.'],
    ['SINP EOI points calculator', 'Saskatchewan Immigrant Nominee Program Expression of Interest score out of 110.'],
  ].map(([name, description]) => ({
    '@type': 'WebApplication',
    name,
    description,
    url: `${SITE}/calculators`,
    applicationCategory: 'UtilitiesApplication',
    browserRequirements: 'Requires JavaScript',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
    publisher: { '@id': `${SITE}/#org` },
  })),
});

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
copyAsset('logo-mark.png', 'img/logo-mark.png');
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
writeFileSync(resolve(OUT, 'calculators.html'), calculatorsPage());
writeFileSync(resolve(OUT, 'draws.html'), drawsPage());
writeFileSync(resolve(OUT, 'features.html'), featuresPage());
writeFileSync(resolve(OUT, 'privacy.html'), doc('privacy', 'PRIVACY_POLICY.md'));
writeFileSync(resolve(OUT, 'terms.html'), doc('terms', 'TERMS_OF_USE.md'));
writeFileSync(resolve(OUT, '404.html'), notFoundPage());
// Markdown twins — reached from the HTML URL when the request carries
// Accept: text/markdown (see vercel.json redirects), and directly at the .md path.
for (const [name, render] of Object.entries(MD_PAGES)) writeFileSync(resolve(OUT, name), render());
writeFileSync(resolve(OUT, 'llms.txt'), llmsTxt());
writeFileSync(resolve(OUT, 'sitemap.xml'), sitemapXml());
writeFileSync(resolve(OUT, 'robots.txt'), robotsTxt());
// AdMob authorized-seller declaration; crspulse.com must be the developer website
// on the App Store / Play listings for AdMob to crawl it.
writeFileSync(resolve(OUT, 'app-ads.txt'), 'google.com, pub-4874088724567128, DIRECT, f08c47fec0942fa0\n');
console.log(`Built ${PAGES.length} pages (html + md), 404, llms.txt, sitemap.xml, robots.txt → web/public/`);
