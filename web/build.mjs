// Builds the CRS Pulse public site into web/public/:
//   /          → marketing landing page (hand-authored below)
//   /privacy   → rendered from docs/PRIVACY_POLICY.md
//   /terms     → rendered from docs/TERMS_OF_USE.md
// The legal markdown stays the single source of truth; Vercel runs this on every
// deploy, so editing a policy and pushing republishes the site.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const here = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(here, '../docs');
const OUT = resolve(here, 'public');

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.crspulse.app';
const CONTACT = 'contact@crspulse.com';

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Give h2–h6 stable ids so in-document anchor links (e.g. #advertising) resolve.
const addHeadingIds = (html) =>
  html.replace(/<(h[2-6])>(.*?)<\/\1>/g, (_m, tag, inner) => `<${tag} id="${slug(inner)}">${inner}</${tag}>`);

const BASE_CSS = `
  :root { --navy:#0A1628; --navy2:#10213e; --blue:#1A6DFF; --ink:#1b2330; --muted:#5b6676; --line:#e6e9ef; --bg:#f7f8fb; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; scroll-behavior:smooth; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  a { color:var(--blue); text-decoration:none; }
  a:hover { text-decoration:underline; }
  header.site { background:var(--navy); color:#fff; }
  header.site .bar { max-width:980px; margin:0 auto; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
  header.site .brand { font-weight:700; letter-spacing:.2px; color:#fff; font-size:1.05rem; }
  header.site nav a { color:#cdd7ea; margin-left:18px; font-size:14px; }
  header.site nav a:hover { color:#fff; }
  footer { max-width:980px; margin:0 auto; padding:28px 20px 56px; color:var(--muted); font-size:13px; text-align:center; }
  footer a { color:var(--muted); text-decoration:underline; }
`;

const DOC_CSS = `
  main.doc { max-width:760px; margin:0 auto; padding:32px 20px 8px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:28px 28px 32px; box-shadow:0 1px 2px rgba(16,30,60,.04); }
  .card h1 { font-size:1.7rem; line-height:1.25; margin:.2em 0 .6em; }
  .card h2 { font-size:1.2rem; margin:1.8em 0 .5em; }
  .card h3 { font-size:1.02rem; margin:1.4em 0 .4em; }
  .card hr { border:0; border-top:1px solid var(--line); margin:2em 0; }
  .card code { background:#eef1f6; padding:.1em .35em; border-radius:5px; font-size:.9em; }
  .card ul, .card ol { padding-left:1.3em; }
  .card li { margin:.25em 0; }
  .card blockquote { margin:1em 0; padding:.5em 1em; border-left:3px solid var(--blue); background:#f0f5ff; color:var(--muted); }
`;

const LANDING_CSS = `
  .hero { background:linear-gradient(160deg,var(--navy),var(--navy2)); color:#fff; }
  .hero .wrap { max-width:980px; margin:0 auto; padding:72px 20px 80px; text-align:center; }
  .hero .eyebrow { text-transform:uppercase; letter-spacing:.14em; font-size:12px; font-weight:700; color:#7fa6ff; margin:0 0 14px; }
  .hero h1 { font-size:clamp(2.2rem,6vw,3.4rem); line-height:1.05; margin:0 0 16px; font-weight:800; }
  .hero p.sub { font-size:clamp(1rem,2.4vw,1.2rem); color:#c7d3e8; max-width:620px; margin:0 auto 30px; }
  .btn { display:inline-block; background:var(--blue); color:#fff; font-weight:700; padding:14px 26px; border-radius:12px; font-size:1rem; }
  .btn:hover { background:#0f5bea; text-decoration:none; }
  .hero .note { margin:18px 0 0; font-size:13px; color:#8ea3c4; }
  .features { max-width:980px; margin:0 auto; padding:64px 20px 24px; }
  .features h2 { text-align:center; font-size:1.5rem; margin:0 0 8px; }
  .features .lede { text-align:center; color:var(--muted); margin:0 auto 36px; max-width:560px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px; }
  .feat { background:#fff; border:1px solid var(--line); border-radius:14px; padding:22px; box-shadow:0 1px 2px rgba(16,30,60,.04); }
  .feat h3 { margin:0 0 8px; font-size:1.05rem; }
  .feat p { margin:0; color:var(--muted); font-size:.95rem; }
  .privacy-band { max-width:980px; margin:24px auto 0; padding:0 20px; }
  .privacy-band .inner { background:#eef3ff; border:1px solid #d7e3ff; border-radius:14px; padding:24px; text-align:center; color:#274690; }
  .privacy-band strong { color:var(--navy); }
`;

function shell({ title, description, css, headerNav, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index, follow">
<title>${title}</title>
<meta name="description" content="${description}">
<style>${BASE_CSS}${css}</style>
</head>
<body>
<header class="site">
  <div class="bar">
    <a class="brand" href="/">CRS Pulse</a>
    <nav>${headerNav}</nav>
  </div>
</header>
${body}
<footer>
  © ${new Date().getFullYear()} CRS Pulse · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="mailto:${CONTACT}">${CONTACT}</a>
</footer>
</body>
</html>
`;
}

const FEATURES = [
  ['CRS score calculator', 'The official IRCC Comprehensive Ranking System formula — your score updates live as you adjust age, language, education and experience.'],
  ['Every eligibility grid', 'FSW 67-point, BC PNP SIRS (200-pt), and SINP EOI (110-pt) calculators, all computed on your device.'],
  ['Live IRCC draws', 'Every Express Entry round with category filters and cutoff trends, fetched straight from IRCC.'],
  ['Instant draw alerts', 'Push notifications the moment a new draw is published — never miss a round.'],
  ['Application tracker', 'A milestone timeline, processing-time estimates, and per-program document checklists.'],
  ['Premium analytics', 'Your odds of an ITA and where your score sits in the Express Entry pool — a one-time unlock.'],
];

function landing() {
  const body = `
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">Canada Express Entry</p>
    <h1>Your Express Entry command center</h1>
    <p class="sub">Calculate your CRS score, follow live IRCC draws, and get notified the moment a new round drops — all in one privacy-first app.</p>
    <a class="btn" href="${PLAY_URL}">Get it on Google Play</a>
    <p class="note">Free · No account · Your data stays on your device · iOS coming soon</p>
  </div>
</section>
<main>
  <section class="features">
    <h2>Everything for your PR journey</h2>
    <p class="lede">From your first CRS estimate to tracking your application — CRS Pulse covers it.</p>
    <div class="grid">
      ${FEATURES.map(([h, p]) => `<div class="feat"><h3>${h}</h3><p>${p}</p></div>`).join('\n      ')}
    </div>
  </section>
  <section class="privacy-band">
    <div class="inner">
      <strong>Privacy-first by design.</strong> Your CRS profile and every calculation stay on your device. We never collect your immigration data — the only thing sent to our servers is an anonymous push token, and only if you enable alerts.
    </div>
  </section>
</main>`;
  return shell({
    title: 'CRS Pulse — Express Entry CRS Calculator & IRCC Draw Tracker',
    description: 'Calculate your Canada Express Entry CRS score, track live IRCC draws, and get push alerts for new rounds. Free, private, on-device.',
    css: LANDING_CSS,
    headerNav: `<a href="${PLAY_URL}">Get the app</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a>`,
    body,
  });
}

function doc(mdFile, title) {
  const md = readFileSync(resolve(DOCS, mdFile), 'utf8');
  return shell({
    title: `${title} — CRS Pulse`,
    description: `${title} for CRS Pulse — the Express Entry CRS calculator and IRCC draw tracker.`,
    css: DOC_CSS,
    headerNav: `<a href="/privacy">Privacy</a><a href="/terms">Terms</a>`,
    body: `<main class="doc"><article class="card">${addHeadingIds(marked.parse(md))}</article></main>`,
  });
}

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'index.html'), landing());
writeFileSync(resolve(OUT, 'privacy.html'), doc('PRIVACY_POLICY.md', 'Privacy Policy'));
writeFileSync(resolve(OUT, 'terms.html'), doc('TERMS_OF_USE.md', 'Terms of Use'));
console.log('Built index.html (landing), privacy.html, terms.html → web/public/');
