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
  s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const addHeadingIds = (html) =>
  html.replace(/<(h[2-6])>(.*?)<\/\1>/g, (_m, tag, inner) => `<${tag} id="${slug(inner)}">${inner}</${tag}>`);

// ── Inline SVG icons (Lucide-style, 1.75 stroke, currentColor) ────────────────
const ICON = {
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14v4"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  checklist: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  chart: '<line x1="6" y1="20" x2="6" y2="15"/><line x1="12" y1="20" x2="12" y2="9"/><line x1="18" y1="20" x2="18" y2="4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
};
const svg = (name, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

const playButton = (cls = 'btn') =>
  `<a class="${cls}" href="${PLAY_URL}"><span class="btn-ico">${svg('play', 18)}</span><span>Get it on Google&nbsp;Play</span></a>`;

// ── Shared CSS ────────────────────────────────────────────────────────────────
const BASE_CSS = `
  :root {
    --navy:#0A1628; --navy2:#102a4d; --blue:#1A6DFF; --blue-700:#0f57e6;
    --ink:#0f1722; --muted:#586375; --line:#e7eaf0; --bg:#ffffff; --surface:#f5f8fd;
    --soft:#eaf1ff; --green:#16a34a; --radius:16px;
    --shadow:0 1px 2px rgba(13,30,60,.05),0 8px 24px rgba(13,30,60,.06);
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:16px/1.65 "IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;}
  a{color:var(--blue);text-decoration:none}
  a:hover{text-decoration:underline}
  img,svg{display:block}
  :focus-visible{outline:3px solid var(--blue);outline-offset:2px;border-radius:6px}
  .wrap{max-width:1080px;margin:0 auto;padding:0 22px}

  header.site{position:sticky;top:0;z-index:50;background:rgba(10,22,40,.92);backdrop-filter:saturate(140%) blur(8px);color:#fff;border-bottom:1px solid rgba(255,255,255,.08)}
  header.site .bar{max-width:1080px;margin:0 auto;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .brand{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:.2px;color:#fff;font-size:1.06rem}
  .brand:hover{text-decoration:none}
  .brand .dot{width:10px;height:10px;border-radius:50%;background:var(--blue);box-shadow:0 0 0 4px rgba(26,109,255,.25)}
  header.site nav{display:flex;align-items:center;gap:6px}
  header.site nav a{color:#c7d3e8;font-size:14px;padding:8px 12px;border-radius:9px}
  header.site nav a:hover{color:#fff;background:rgba(255,255,255,.08);text-decoration:none}
  header.site nav a.cta{background:var(--blue);color:#fff;font-weight:600}
  header.site nav a.cta:hover{background:var(--blue-700)}
  @media (max-width:560px){header.site nav a.ghost{display:none}}

  .btn{display:inline-flex;align-items:center;gap:10px;background:var(--blue);color:#fff;font-weight:600;
    padding:14px 24px;border-radius:13px;font-size:1.02rem;cursor:pointer;transition:background .2s ease,transform .2s ease;
    box-shadow:0 8px 20px rgba(26,109,255,.28)}
  .btn:hover{background:var(--blue-700);text-decoration:none;transform:translateY(-1px)}
  .btn .btn-ico{display:inline-flex}
  .btn.light{background:#fff;color:var(--navy);box-shadow:0 8px 20px rgba(0,0,0,.18)}
  .btn.light:hover{background:#eef3ff}

  footer{background:var(--navy);color:#9fb0cc}
  footer .inner{max-width:1080px;margin:0 auto;padding:34px 22px;display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center;justify-content:space-between;font-size:14px}
  footer a{color:#c7d3e8}
  footer .links a{margin-left:18px}
  @media (max-width:560px){footer .inner{flex-direction:column;align-items:flex-start} footer .links a{margin:0 18px 0 0}}
`;

const DOC_CSS = `
  main.doc{max-width:760px;margin:0 auto;padding:36px 22px 12px}
  .card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:30px 30px 34px;box-shadow:var(--shadow)}
  .card h1{font-size:1.8rem;line-height:1.2;margin:.1em 0 .7em;letter-spacing:-.01em}
  .card h2{font-size:1.22rem;margin:1.9em 0 .5em}
  .card h3{font-size:1.03rem;margin:1.4em 0 .4em}
  .card hr{border:0;border-top:1px solid var(--line);margin:2em 0}
  .card code{background:var(--surface);padding:.1em .4em;border-radius:6px;font-size:.9em}
  .card ul,.card ol{padding-left:1.3em}
  .card li{margin:.25em 0}
  .card a{font-weight:500}
  .card blockquote{margin:1em 0;padding:.5em 1em;border-left:3px solid var(--blue);background:var(--soft);color:var(--muted)}
`;

const LANDING_CSS = `
  .hero{position:relative;background:radial-gradient(1200px 600px at 78% -10%,#16335c,transparent),linear-gradient(165deg,var(--navy),var(--navy2));color:#fff;overflow:hidden}
  .hero::after{content:"";position:absolute;inset:0;background:radial-gradient(700px 360px at 80% 0,rgba(26,109,255,.28),transparent 60%);pointer-events:none}
  .hero .grid{position:relative;display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center;padding:72px 0 84px}
  .eyebrow{display:inline-block;text-transform:uppercase;letter-spacing:.16em;font-size:12px;font-weight:600;color:#8fb4ff;background:rgba(26,109,255,.12);border:1px solid rgba(26,109,255,.3);padding:6px 12px;border-radius:999px;margin:0 0 18px}
  .hero h1{font-size:clamp(2.2rem,5.2vw,3.5rem);line-height:1.04;letter-spacing:-.02em;font-weight:700;margin:0 0 18px}
  .hero h1 .hl{color:#7fa6ff}
  .hero p.sub{font-size:clamp(1.02rem,2.2vw,1.2rem);color:#c7d3e8;max-width:540px;margin:0 0 28px}
  .cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .cta-row .note{color:#8ea3c4;font-size:13.5px}
  .trust{display:flex;flex-wrap:wrap;gap:8px 10px;margin:26px 0 0;padding:0;list-style:none}
  .trust li{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:#cdd9ef;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);padding:7px 12px;border-radius:999px}
  .trust svg{color:#7fe0a8}

  /* device mockup */
  .device-col{display:flex;justify-content:center}
  .device{width:280px;max-width:78vw;background:#0b1a30;border:1px solid rgba(255,255,255,.14);border-radius:40px;padding:12px;box-shadow:0 30px 70px rgba(0,0,0,.45);position:relative}
  .device::before{content:"";position:absolute;top:16px;left:50%;transform:translateX(-50%);width:96px;height:6px;border-radius:999px;background:rgba(255,255,255,.18)}
  .screen{background:linear-gradient(180deg,#0e1f3a,#0a1628);border-radius:30px;padding:26px 16px 18px;overflow:hidden}
  .scr-head{display:flex;align-items:center;justify-content:space-between;color:#fff;margin:0 4px 14px}
  .scr-head .b{display:flex;align-items:center;gap:7px;font-weight:600;font-size:14px}
  .scr-head .b .dot{width:8px;height:8px;border-radius:50%;background:var(--blue)}
  .scr-head .bell{color:#9fb0cc}
  .score-card{background:linear-gradient(135deg,#1a6dff,#0f57e6);border-radius:18px;padding:18px;color:#fff;box-shadow:0 12px 24px rgba(26,109,255,.35)}
  .score-card .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#cfe0ff}
  .score-card .num{font-size:46px;font-weight:700;line-height:1;margin:6px 0 8px;font-variant-numeric:tabular-nums}
  .score-card .pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:500}
  .scr-sub{color:#9fb0cc;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:18px 4px 8px}
  .draw-row{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 13px;margin-bottom:8px}
  .draw-row .l .n{color:#fff;font-weight:600;font-size:13px}
  .draw-row .l .c{color:#9fb0cc;font-size:11px}
  .draw-row .cut{color:#fff;font-weight:700;font-size:16px;font-variant-numeric:tabular-nums}
  .draw-row .cut span{display:block;color:#9fb0cc;font-size:9px;font-weight:500;text-align:right;letter-spacing:.08em}

  /* sections */
  section.block{padding:72px 0}
  .sec-head{text-align:center;max-width:620px;margin:0 auto 44px}
  .sec-head h2{font-size:clamp(1.6rem,3.6vw,2.1rem);letter-spacing:-.02em;margin:0 0 12px}
  .sec-head p{color:var(--muted);font-size:1.05rem;margin:0}
  .features{background:var(--surface)}
  .fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
  .feat{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
  .feat:hover{transform:translateY(-3px);border-color:#cfe0ff;box-shadow:0 12px 30px rgba(13,30,60,.1)}
  .feat .chip{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--soft);color:var(--blue);margin:0 0 16px}
  .feat h3{margin:0 0 8px;font-size:1.1rem;letter-spacing:-.01em}
  .feat p{margin:0;color:var(--muted);font-size:.96rem}

  .privacy{background:#fff}
  .privacy .panel{display:flex;gap:18px;align-items:flex-start;background:var(--soft);border:1px solid #d7e3ff;border-radius:var(--radius);padding:26px 28px}
  .privacy .panel .chip{flex:none;width:46px;height:46px;border-radius:13px;background:#fff;color:var(--blue);display:flex;align-items:center;justify-content:center;border:1px solid #d7e3ff}
  .privacy .panel h3{margin:0 0 6px;color:var(--navy);font-size:1.12rem}
  .privacy .panel p{margin:0;color:#3a4a66}

  .cta-band{background:linear-gradient(165deg,var(--navy),var(--navy2));color:#fff;text-align:center}
  .cta-band .inner{padding:72px 22px}
  .cta-band h2{font-size:clamp(1.7rem,3.6vw,2.2rem);letter-spacing:-.02em;margin:0 0 12px}
  .cta-band p{color:#c7d3e8;margin:0 auto 26px;max-width:480px}

  @media (max-width:820px){
    .hero .grid{grid-template-columns:1fr;gap:14px;padding:54px 0 64px;text-align:center}
    .hero p.sub{margin-left:auto;margin-right:auto}
    .cta-row{justify-content:center}
    .trust{justify-content:center}
    .device-col{order:2;margin-top:30px}
  }
  @media (prefers-reduced-motion:reduce){
    html{scroll-behavior:auto}
    *{transition:none!important}
    .btn:hover,.feat:hover{transform:none}
  }
`;

function shell({ title, description, css, headerNav, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0A1628">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>${BASE_CSS}${css}</style>
</head>
<body>
<header class="site">
  <div class="bar">
    <a class="brand" href="/"><span class="dot"></span>CRS Pulse</a>
    <nav>${headerNav}</nav>
  </div>
</header>
${body}
<footer>
  <div class="inner">
    <span>© ${new Date().getFullYear()} CRS Pulse · <a href="mailto:${CONTACT}">${CONTACT}</a></span>
    <span class="links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="${PLAY_URL}">Google Play</a></span>
  </div>
</footer>
</body>
</html>
`;
}

const FEATURES = [
  ['calculator', 'CRS score calculator', 'The official IRCC Comprehensive Ranking System formula — your score updates live as you adjust age, language, education and experience.'],
  ['grid', 'Every eligibility grid', 'FSW 67-point, BC PNP SIRS (200-pt) and SINP EOI (110-pt) calculators, all computed on your device.'],
  ['trending', 'Live IRCC draws', 'Every Express Entry round with category filters and cutoff trends, fetched straight from IRCC.'],
  ['bell', 'Instant draw alerts', 'Push notifications the moment a new draw is published — never miss a round again.'],
  ['checklist', 'Application tracker', 'A milestone timeline, processing-time estimates and per-program document checklists.'],
  ['chart', 'Personal analytics', 'Your odds of an ITA and where your score sits in the Express Entry pool — free, like everything else in the app.'],
];

function landing() {
  const body = `
<section class="hero">
  <div class="wrap">
    <div class="grid">
      <div class="copy">
        <span class="eyebrow">Canada Express Entry</span>
        <h1>Know your CRS score.<br><span class="hl">Catch every draw.</span></h1>
        <p class="sub">CRS Pulse calculates your Express Entry score, tracks live IRCC draws, and alerts you the second a new round drops — all in one private, on-device app.</p>
        <div class="cta-row">
          ${playButton()}
          <span class="note">Free · No account · iOS coming soon</span>
        </div>
        <ul class="trust">
          <li>${svg('shield', 15)} Official IRCC formula</li>
          <li>${svg('shield', 15)} Data stays on your device</li>
          <li>${svg('shield', 15)} No sign-up required</li>
        </ul>
      </div>
      <div class="device-col">
        <div class="device" role="img" aria-label="CRS Pulse app preview showing a CRS score and recent Express Entry draws">
          <div class="screen">
            <div class="scr-head">
              <span class="b"><span class="dot"></span>CRS Pulse</span>
              <span class="bell">${svg('bell', 18)}</span>
            </div>
            <div class="score-card">
              <div class="lbl">Your CRS score</div>
              <div class="num">481</div>
              <span class="pill">${svg('trending', 14)} Updated live</span>
            </div>
            <div class="scr-sub">Latest draws</div>
            <div class="draw-row"><div class="l"><div class="n">Round #420</div><div class="c">Canadian Experience Class</div></div><div class="cut">516<span>CRS</span></div></div>
            <div class="draw-row"><div class="l"><div class="n">Round #418</div><div class="c">French-language</div></div><div class="cut">409<span>CRS</span></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="block features" id="features">
  <div class="wrap">
    <div class="sec-head">
      <h2>Everything for your PR journey</h2>
      <p>From your first CRS estimate to tracking your application — CRS Pulse covers it.</p>
    </div>
    <div class="fgrid">
      ${FEATURES.map(([ic, h, p]) => `<div class="feat"><div class="chip">${svg(ic, 24)}</div><h3>${h}</h3><p>${p}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="block privacy">
  <div class="wrap">
    <div class="panel">
      <div class="chip">${svg('shield', 24)}</div>
      <div>
        <h3>Privacy-first by design</h3>
        <p>Your CRS profile and every calculation stay on your device. We never collect your immigration data — the only thing sent to our servers is an anonymous push token, and only if you turn on draw alerts.</p>
      </div>
    </div>
  </div>
</section>

<section class="cta-band">
  <div class="inner">
    <h2>Start with your CRS score today</h2>
    <p>Free to download. See where you stand against the latest Express Entry cutoffs in minutes.</p>
    ${playButton('btn light')}
  </div>
</section>`;
  return shell({
    title: 'CRS Pulse — Express Entry CRS Calculator & IRCC Draw Tracker',
    description: 'Calculate your Canada Express Entry CRS score, track live IRCC draws, and get push alerts for new rounds. Free, private, and on-device.',
    css: LANDING_CSS,
    headerNav: `<a class="ghost" href="#features">Features</a><a class="ghost" href="/privacy">Privacy</a><a class="cta" href="${PLAY_URL}">Get the app</a>`,
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
