// Builds the CRS Pulse public site into web/public/:
//   /             → home hub (hero + links to the pages below)
//   /features     → feature tour
//   /draws        → live IRCC draw tracking
//   /calculators  → the four eligibility calculators
//   /faq          → FAQ (mirrors mobile/src/i18n/en.ts "faq" strings)
//   /privacy      → rendered from docs/PRIVACY_POLICY.md
//   /terms        → rendered from docs/TERMS_OF_USE.md
// The legal markdown stays the single source of truth; Vercel runs this on every
// deploy, so editing a policy and pushing republishes the site.
//
// Brand comes straight from the app: logo mark is mobile/assets/logo.svg
// (red leaf #E8312E, navy gap #0A1628, teal pulse line #35C2DC — the secondary
// accent). Primary accent matches the logo red; teal is used as the secondary.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import QRCode from 'qrcode';

const here = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(here, '../docs');
const OUT = resolve(here, 'public');
const ASSETS = resolve(here, 'assets');

const APP_STORE_URL = 'https://apps.apple.com/app/crs-pulse-ircc-tracker/id6784619403';
const CONTACT = 'contact@crspulse.com';

// QR SVG is embedded inline (matches the rest of the site's inline-icon convention) —
// generated once at build time, no client-side JS or extra image request.
const APP_STORE_QR_SVG = (await QRCode.toString(APP_STORE_URL, {
  type: 'svg', margin: 0, color: { dark: '#0A1628', light: '#FFFFFF' },
})).replace('<svg ', '<svg width="112" height="112" ');

const slug = (s) =>
  s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const addHeadingIds = (html) =>
  html.replace(/<(h[2-6])>(.*?)<\/\1>/g, (_m, tag, inner) => `<${tag} id="${slug(inner)}">${inner}</${tag}>`);

const apple = (s = 15) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.86-.07 1.68-.75 3.04-.83 1.65-.13 2.9.65 3.71 1.94-1.94 1.16-1.64 3.66.32 4.86-.38 1.08-.9 2.15-1.65 3.2zm-3.62-14.6c-.05-1.7 1.4-3.1 3.14-3.18.28 1.88-1.65 3.4-3.14 3.18z"/></svg>`;

const dlBtn = (cls, label = 'Download on the App Store') => `<a class="pill ${cls}" href="${APP_STORE_URL}">${apple()}<span>${label}</span></a>`;

const advIcon = (d, s = 17) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

// Logo mark — exact paths from mobile/assets/logo.svg (maple leaf + heartbeat
// pulse line). IDs are suffixed per instance since header + footer both embed it.
const LOGO_MARK = (size, id) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true">
  <defs>
    <path id="leaf-${id}" d="M256 30 L230 96 L198 74 L210 148 L156 100 L165 152 L98 136 L122 196 L72 208 L178 286 L160 350 L240 326 L249 360 L263 360 L272 326 L352 350 L334 286 L440 208 L390 196 L414 136 L347 152 L356 100 L302 148 L314 74 L282 96 Z" />
    <path id="stem-${id}" d="M249 354 L263 354 L261 482 L251 482 Z" />
    <clipPath id="clip-${id}"><use href="#leaf-${id}" /><use href="#stem-${id}" /></clipPath>
  </defs>
  <use href="#leaf-${id}" fill="#E8312E" />
  <use href="#stem-${id}" fill="#E8312E" />
  <g clip-path="url(#clip-${id})">
    <path fill="none" stroke="#0A1628" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" d="M30 300 H148 L184 248 L220 330 L256 146 L292 402 L324 266 L342 300 H482" />
  </g>
  <path fill="none" stroke="#35C2DC" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" d="M30 300 H148 L184 248 L220 330 L256 146 L292 402 L324 266 L342 300 H482" />
</svg>`;

const logoLockup = (id, size = 26) => `${LOGO_MARK(size, id)}<span class="logo-word">CRS Pulse</span>`;

const SITE_CSS = `
  :root{
    --accent:#E8312E; --accent-700:#C2201E; --soft:#FDECEC;
    --accent2:#35C2DC; --accent2-700:#1F9BB3; --soft2:#E3F7FB;
    --navy:#0A1628;
    --ink:#111214; --page:#F5F6F8; --card:#FFFFFF; --cream:#FBF3E7;
    --muted:#5c5f66; --coral:#F2695C; --up:#1fa96b; --up-dark:#4ade80; --line:#e6e8ee;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
  body{margin:0;background:var(--page);color:var(--ink);
    font:16px/1.6 "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}
  img,svg{display:block}
  :focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:6px}
  .wrap{max-width:1400px;margin:0 auto;padding:0 24px}
  h1,h2,h3{font-weight:600;letter-spacing:-.02em;line-height:1.12;margin:0}

  .pill{display:inline-flex;align-items:center;gap:9px;border-radius:999px;padding:11px 22px;font-size:14px;font-weight:500;
    cursor:pointer;transition:transform .15s ease,background .15s ease;white-space:nowrap}
  .pill:hover{transform:translateY(-1px)}
  .pill.dark{background:var(--navy);color:#fff}
  .pill.dark:hover{background:#000}
  .pill.light{background:#fff;color:var(--navy)}
  .pill.lg{padding:14px 28px;font-size:15px}

  /* header */
  header.pf{position:sticky;top:0;z-index:50;background:rgba(245,246,248,.9);backdrop-filter:blur(8px)}
  header.pf .bar{max-width:1400px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px}
  .logo{display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:1.05rem;letter-spacing:-.01em;white-space:nowrap}
  .logo-word{color:inherit}
  header.pf nav{display:flex;gap:4px}
  header.pf nav a{font-size:14px;color:#3a3c40;padding:8px 13px;border-radius:999px}
  header.pf nav a:hover,header.pf nav a[aria-current]{background:rgba(0,0,0,.06)}
  .hbtns{display:flex;gap:10px;align-items:center}
  @media (max-width:760px){header.pf nav{display:none}}

  /* hero — light, centered, single-screenshot style */
  body.home header.pf{background:rgba(251,243,231,.92)}
  .hero2wrap{background:var(--cream)}
  .hero2{padding:70px 24px 0;text-align:center;position:relative}
  .hero2 h1{font-size:clamp(2.3rem,5vw,3.5rem);font-weight:600;color:var(--ink);max-width:800px;margin:0 auto}
  .hero2 p{max-width:560px;color:var(--muted);font-size:15.5px;margin:20px auto 0}
  .hero2-ctas{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:30px;flex-wrap:wrap}
  .hero2-ctas .textlink{font-size:14px;font-weight:600;color:var(--ink)}
  .hero2-ctas .textlink:hover{text-decoration:underline}
  .hero2-badge{position:absolute;top:130px;width:60px;height:60px;background:var(--navy);border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 14px 30px rgba(6,20,48,.25)}
  .hero2-badge.left{left:9%;transform:rotate(-14deg)}
  .hero2-badge.right{right:9%;transform:rotate(14deg)}
  .phonefr{width:260px;margin:44px auto 0;position:relative;aspect-ratio:600/1226;z-index:1}
  .phonefr .dv-shot{position:absolute;display:block;top:7.97%;left:5.33%;width:89.26%;height:89.49%;object-fit:cover;object-position:top;border-radius:8%}
  .phonefr .dv-frame{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;filter:drop-shadow(0 30px 60px rgba(6,20,48,.28))}
  .phonefr.hero-crop{height:425px;aspect-ratio:auto;overflow:hidden}
  .phonefr.hero-crop .dv-inner{position:absolute;top:0;left:0;width:100%;aspect-ratio:600/1226}
  @media (max-width:760px){.hero2-badge{display:none}}

  /* page hero — simpler colored band used by sub-pages */
  .page-hero{margin:10px 0 20px;border-radius:28px;padding:52px 56px;color:#fff}
  .page-hero.red{background:linear-gradient(150deg,var(--accent),var(--accent-700))}
  .page-hero.teal{background:linear-gradient(150deg,var(--accent2),var(--accent2-700))}
  .page-hero.navy{background:var(--navy)}
  .page-hero h1{font-size:clamp(2rem,4.2vw,2.7rem)}
  .page-hero p{max-width:580px;color:rgba(255,255,255,.85);font-size:15px;margin:16px 0 0}

  /* stats row (below hero) */
  .statrow{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin:70px 0 10px;padding-left:24px}
  .statrow .stat b{display:block;font-size:clamp(1.5rem,3vw,2rem);font-weight:700;color:var(--navy)}
  .statrow .stat span{display:block;font-size:13px;color:var(--muted);margin-top:4px}
  .statrow .stat:not(:last-child){border-right:1px solid var(--line)}

  /* section intro (centered heading + sub) */
  .sec-intro{text-align:center;max-width:640px;margin:90px auto 34px}
  .sec-intro h2{font-size:clamp(1.7rem,3.6vw,2.3rem)}
  .sec-intro p{color:var(--muted);font-size:14.5px;margin:14px 0 0}

  /* feature grid (3x3) */
  .featgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:0 0 90px}
  .featcard{background:var(--card);border-radius:18px;overflow:hidden;border:1px solid var(--line)}
  .featcard .visual{height:118px;display:flex;align-items:center;justify-content:center;background:var(--soft);color:var(--accent);overflow:hidden}
  .featcard .visual.tl{background:var(--soft2);color:var(--accent2-700)}
  .featcard .visual.nvy{background:#E8EBF2;color:var(--navy)}
  .featcard .body{padding:22px 26px 26px}
  .featcard h3{font-size:1.05rem;margin-bottom:8px}
  .featcard p{color:var(--muted);font-size:13.5px;margin:0}

  /* differentiator flat cards */
  .diffgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:0 0 90px}
  .diffcard{background:var(--card);border-radius:18px;padding:24px}
  .diffcard .ico{color:var(--accent);margin-bottom:14px}
  .diffcard h3{font-size:1rem;margin-bottom:8px}
  .diffcard p{color:var(--muted);font-size:13px;margin:0}

  /* screenshot showcase */
  .shots-cta{text-align:center;margin:0 0 20px}
  .shotstrip{display:flex;justify-content:center;align-items:center;gap:16px;margin:0 0 20px;padding:20px 0}
  .shotstrip .shot{flex:none;width:260px;position:relative;aspect-ratio:600/1226;opacity:.75;transition:opacity .2s ease;cursor:pointer}
  .shotstrip .shot .dv-shot{position:absolute;display:block;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:top;border-radius:20px;pointer-events:none;box-shadow:0 10px 26px rgba(6,20,48,.12)}
  .shotstrip .shot .dv-frame{display:none;position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
  .shotstrip .shot.active{opacity:1;width:340px}
  .shotstrip .shot.active .dv-shot{top:7.97%;left:5.33%;width:89.26%;height:89.49%;border-radius:8%;box-shadow:none}
  .shotstrip .shot.active .dv-frame{display:block;filter:drop-shadow(0 30px 60px rgba(6,20,48,.3))}
  .shot-dots{display:flex;justify-content:center;gap:8px;margin:0 0 90px}
  .shot-dots span{width:22px;height:6px;border-radius:999px;background:var(--line);cursor:pointer;transition:all .2s ease}
  .shot-dots span.on{background:var(--accent);width:32px}

  @media (max-width:1500px){
    .shotstrip .shot:first-child,.shotstrip .shot:last-child{display:none}
  }
  @media (max-width:900px){
    .statrow{grid-template-columns:repeat(2,1fr)}
    .statrow .stat:nth-child(odd){border-right:1px solid var(--line)}
    .statrow .stat:nth-child(-n+2){padding-bottom:14px;border-bottom:1px solid var(--line)}
    .featgrid,.diffgrid{grid-template-columns:1fr 1fr}
    .shotstrip{gap:10px}
    .shotstrip .shot{width:110px}
    .shotstrip .shot.active{width:130px}
    .shotstrip .shot:first-child,.shotstrip .shot:last-child{display:none}
  }

  /* calculator detail grid (/calculators) */
  .calcgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin:20px 0 90px}
  .calccard{background:var(--card);border-radius:20px;padding:26px}
  .calccard .tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--accent);background:var(--soft);padding:4px 10px;border-radius:999px;margin-bottom:12px}
  .calccard h3{font-size:1.1rem;margin-bottom:8px}
  .calccard p{color:var(--muted);font-size:13.5px;margin:0}

  /* get-the-app band (QR download) — full-bleed 100% width, centered composition */
  .getapp-wrap{background:var(--navy);margin:0 0 90px;position:relative;overflow:hidden}
  .getapp-wrap::before{content:"";position:absolute;top:-120px;left:8%;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(232,49,46,.25),transparent 70%);pointer-events:none}
  .getapp-wrap::after{content:"";position:absolute;bottom:-140px;right:8%;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(53,194,220,.22),transparent 70%);pointer-events:none}
  .getapp{padding:90px 0;display:grid;grid-template-columns:1.15fr .85fr;gap:40px;align-items:center;position:relative;z-index:1}
  .getapp-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#cdd6e6;font-size:12.5px;font-weight:600;padding:7px 16px;border-radius:999px;margin-bottom:22px}
  .getapp h2{font-size:clamp(2.2rem,4.6vw,3.2rem);background:linear-gradient(135deg,var(--accent2),var(--accent));-webkit-background-clip:text;background-clip:text;color:transparent}
  .getapp-sub{color:#9fb0cc;font-size:15.5px;max-width:440px;margin:16px 0 40px}
  .getapp-card{display:inline-flex;align-items:center;gap:26px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:22px 30px;text-align:left}
  .getapp-art{position:relative;display:flex;justify-content:center}
  .getapp-art .phonefr{margin:0}
  .getapp-qr{background:#fff;border-radius:12px;padding:10px;display:inline-flex;flex:none}
  .getapp-card-info b{display:block;color:#fff;font-size:16px;margin-bottom:4px}
  .getapp-scan{display:block;color:#9fb0cc;font-size:13px;margin-bottom:16px}
  .getapp-card-info .pill{margin-top:14px}

  /* faq */
  .faq-list{max-width:800px;margin:20px auto 90px;display:flex;flex-direction:column;gap:12px}
  .faq-item{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:2px 24px}
  .faq-item summary{cursor:pointer;list-style:none;padding:19px 0;font-weight:600;font-size:15.5px;display:flex;justify-content:space-between;align-items:center;gap:16px}
  .faq-item summary::-webkit-details-marker{display:none}
  .faq-item summary::after{content:"+";font-size:22px;font-weight:400;color:var(--accent);flex:none}
  .faq-item[open] summary::after{content:"–"}
  .faq-item p{color:var(--muted);font-size:14.5px;line-height:1.7;margin:0 0 22px}

  /* final cta */
  .finalcta{text-align:center;margin:100px 0 90px}
  .finalcta h2{font-size:clamp(1.8rem,3.8vw,2.4rem);margin-bottom:14px}
  .finalcta p{color:var(--muted);font-size:15px;margin:0 0 30px}

  /* footer */
  footer.pf{background:var(--navy);color:#9fb0cc}
  footer.pf .inner{max-width:1400px;margin:0 auto;padding:52px 24px 40px;display:grid;grid-template-columns:1.2fr 1fr 1fr 1.3fr;gap:36px}
  footer.pf .logo-word{color:#fff}
  footer.pf .tag{font-size:13px;color:#7c8aa5;max-width:220px;margin-top:14px}
  footer.pf h4{color:#fff;font-size:13.5px;font-weight:600;margin:0 0 14px}
  footer.pf .col a{display:block;font-size:13px;color:#9fb0cc;margin-bottom:10px}
  footer.pf .col a:hover{color:#fff}
  footer.pf .footer-getapp p{font-size:13px;color:#9fb0cc;margin:14px 0 0}
  footer.pf .copy{grid-column:1/-1;border-top:1px solid #16233c;padding-top:20px;font-size:12px;color:#7c8aa5}
  footer.pf .copy a{color:#9fb0cc}

  /* doc pages (privacy / terms) */
  main.doc{max-width:840px;margin:0 auto;padding:36px 24px 70px}
  .doc-card{background:#fff;border-radius:22px;padding:42px 44px 46px;box-shadow:0 10px 30px rgba(6,20,48,.06)}
  .doc-card h1{font-size:2rem;line-height:1.15;margin:.1em 0 .8em}
  .doc-card h2{font-size:1.25rem;margin:2em 0 .6em}
  .doc-card h3{font-size:1.05rem;margin:1.5em 0 .5em}
  .doc-card p,.doc-card li{color:#33363c;font-size:15px}
  .doc-card a{color:var(--accent);font-weight:500}
  .doc-card a:hover{text-decoration:underline}
  .doc-card hr{border:0;border-top:1px solid var(--line);margin:2em 0}
  .doc-card code{background:var(--page);padding:.1em .4em;border-radius:6px;font-size:.9em}
  .doc-card ul,.doc-card ol{padding-left:1.3em}
  .doc-card li{margin:.3em 0}
  .doc-card blockquote{margin:1em 0;padding:.6em 1.1em;border-left:3px solid var(--accent);background:var(--soft);color:#33363c;border-radius:0 10px 10px 0}
  @media (max-width:560px){.doc-card{padding:28px 22px 32px}}

  @media (max-width:900px){
    .page-hero{padding:36px 28px}
    .calcgrid{grid-template-columns:1fr;gap:10px}
    .getapp{grid-template-columns:1fr;padding:60px 0;text-align:center}
    .getapp-sub{margin-left:auto;margin-right:auto}
    .getapp-card{flex-direction:column;text-align:center;gap:16px;padding:26px 24px;margin:0 auto}
    .getapp-art{margin-top:36px}
    footer.pf .inner{grid-template-columns:1fr 1fr}
  }
  @media (prefers-reduced-motion:reduce){
    html{scroll-behavior:auto}
    *{transition:none!important}
    .pill:hover{transform:none}
  }
`;

const NAV_LINKS = [
  ['/features', 'Features'],
  ['/draws', 'Live Draws'],
  ['/calculators', 'Calculators'],
  ['/faq', 'FAQ'],
];

function header(activePath) {
  const nav = NAV_LINKS.map(([href, label]) =>
    `<a href="${href}"${href === activePath ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `
<header class="pf">
  <div class="bar">
    <a class="logo" href="/">${logoLockup('h')}</a>
    <nav>${nav}</nav>
    <div class="hbtns">${dlBtn('dark')}</div>
  </div>
</header>`;
}

const FOOTER = `
<footer class="pf">
  <div class="inner">
    <div>
      <a class="logo" href="/">${logoLockup('f')}</a>
      <p class="tag">The Express Entry companion — CRS calculator, live draws and instant alerts.</p>
    </div>
    <div class="col">
      <h4>Explore</h4>
      <a href="/features">Features</a><a href="/draws">Live Draws</a><a href="/calculators">Calculators</a><a href="/faq">FAQ</a>
    </div>
    <div class="col">
      <h4>Company</h4>
      <a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="mailto:${CONTACT}">Contact</a><a href="mailto:${CONTACT}?subject=CRS%20Pulse%20issue">Report an Issue</a>
    </div>
    <div class="footer-getapp">
      <h4>Get the App</h4>
      ${dlBtn('light', 'Download on the App Store')}
      <p>Free on the App Store</p>
    </div>
    <div class="copy">© ${new Date().getFullYear()} CRS Pulse · <a href="mailto:${CONTACT}">${CONTACT}</a> · Scores are estimates only, not immigration advice. Not affiliated with IRCC.</div>
  </div>
</footer>`;

function shell({ title, description, path, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#E8312E">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>${SITE_CSS}</style>
</head>
<body${path === '/' ? ' class="home"' : ''}>
${header(path)}
${body}
${FOOTER}
</body>
</html>
`;
}

const ADVANTAGES = [
  ['<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14v4"/><path d="M8 18h.01"/><path d="M12 18h.01"/>', 'Your Score in Minutes',
    'No account, no sign-up. Enter your profile once and watch your CRS score update live as you adjust age, language or education.'],
  ['<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', 'Never Miss a Draw',
    'A push notification lands on your phone the moment IRCC publishes a new Express Entry round — cutoff, category and invitations.'],
  ['<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>', 'Completely Free',
    'Every calculator, every draw, every feature. No subscriptions, no hidden fees, no locked screens.'],
  ['<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>', 'Private by Design',
    'Your profile and scores never leave your phone. We don’t collect your immigration data — there is nothing to leak.'],
];

const STATS = [
  ['4', 'Eligibility Calculators'],
  ['Every 15 min', 'IRCC Draws Checked'],
  ['100%', 'On-Device & Private'],
  ['Free', 'To Download'],
];

// "scene" = a small self-drawn SVG illustration (not a screenshot) evoking the feature.
const SCENE_DRAWS = `<svg viewBox="0 0 96 64" width="72" height="48" fill="none" aria-hidden="true">
  <rect x="4" y="6" width="88" height="24" rx="6" fill="currentColor" opacity=".12"/>
  <rect x="4" y="6" width="4" height="24" rx="2" fill="currentColor"/>
  <rect x="16" y="12" width="30" height="5" rx="2.5" fill="currentColor" opacity=".7"/>
  <rect x="16" y="21" width="18" height="4" rx="2" fill="currentColor" opacity=".4"/>
  <rect x="66" y="13" width="22" height="10" rx="5" fill="currentColor" opacity=".3"/>
  <rect x="4" y="38" width="88" height="20" rx="6" fill="currentColor" opacity=".07"/>
  <rect x="16" y="44" width="24" height="4" rx="2" fill="currentColor" opacity=".3"/>
</svg>`;
const SCENE_GAUGE = `<svg viewBox="0 0 96 64" width="72" height="48" fill="none" aria-hidden="true">
  <path d="M14 54a34 34 0 0 1 68 0" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity=".18"/>
  <path d="M14 54a34 34 0 0 1 44-32" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
  <circle cx="58" cy="22" r="3.5" fill="currentColor"/>
</svg>`;
const SCENE_TIMELINE = `<svg viewBox="0 0 96 64" width="72" height="48" fill="none" aria-hidden="true">
  <line x1="20" y1="10" x2="20" y2="54" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".25"/>
  <circle cx="20" cy="12" r="6" fill="currentColor"/>
  <circle cx="20" cy="32" r="6" fill="currentColor" opacity=".55"/>
  <circle cx="20" cy="52" r="6" fill="currentColor" opacity=".25"/>
  <rect x="36" y="7" width="46" height="9" rx="4.5" fill="currentColor" opacity=".7"/>
  <rect x="36" y="27" width="34" height="9" rx="4.5" fill="currentColor" opacity=".4"/>
  <rect x="36" y="47" width="40" height="9" rx="4.5" fill="currentColor" opacity=".2"/>
</svg>`;
const SCENE_CHECKLIST = `<svg viewBox="0 0 96 64" width="72" height="48" fill="none" aria-hidden="true">
  <rect x="8" y="8" width="80" height="18" rx="5" fill="currentColor" opacity=".08"/>
  <rect x="16" y="13" width="10" height="8" rx="2.5" fill="currentColor"/>
  <path d="M19 17l1.6 1.6L23 15.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="34" y="14" width="40" height="6" rx="3" fill="currentColor" opacity=".5"/>
  <rect x="8" y="30" width="80" height="18" rx="5" fill="currentColor" opacity=".08"/>
  <rect x="16" y="35" width="10" height="8" rx="2.5" fill="currentColor" opacity=".3"/>
  <rect x="34" y="36" width="30" height="6" rx="3" fill="currentColor" opacity=".3"/>
</svg>`;
const SCENE_CLOCK = `<svg viewBox="0 0 96 64" width="72" height="48" fill="none" aria-hidden="true">
  <circle cx="48" cy="32" r="22" stroke="currentColor" stroke-width="4" opacity=".2"/>
  <path d="M48 32V17" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M48 32l11 7" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <circle cx="48" cy="32" r="3" fill="currentColor"/>
</svg>`;
const SCENE_BARS = `<svg viewBox="0 0 96 64" width="72" height="48" fill="none" aria-hidden="true">
  <rect x="10" y="34" width="14" height="20" rx="3" fill="currentColor" opacity=".3"/>
  <rect x="32" y="20" width="14" height="34" rx="3" fill="currentColor" opacity=".55"/>
  <rect x="54" y="8" width="14" height="46" rx="3" fill="currentColor"/>
  <rect x="76" y="26" width="14" height="28" rx="3" fill="currentColor" opacity=".4"/>
</svg>`;

const FEATURES = [
  ['<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>', 'Four Calculators, One App',
    'CRS, FSW 67-point, BC PNP SIRS and SINP EOI — check your score for every program before you apply.'],
  ['<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>', 'Live IRCC Draws',
    'Every Express Entry round the moment it is published — cutoff, category and invitations issued.', SCENE_DRAWS],
  ['<line x1="6" y1="20" x2="6" y2="15"/><line x1="12" y1="20" x2="12" y2="9"/><line x1="18" y1="20" x2="18" y2="4"/>', 'Personal Analytics',
    'See how your score stacks up against recent cutoffs and which category gives you the best shot.', SCENE_GAUGE],
  ['<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h8"/><path d="M8 14h5"/>', 'Application Tracker',
    'A milestone timeline for ITA, AOR, biometrics and beyond, with estimated decision dates.', SCENE_TIMELINE],
  ['<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', 'Document Checklists',
    'Per-program checklists so you know exactly what to prepare, with progress tracking built in.', SCENE_CHECKLIST],
  ['<path d="M12 20v-6M6 20V10M18 20V4"/>', 'IRCC Processing Times',
    'Live processing-time estimates by category and application type, straight from IRCC.', SCENE_CLOCK],
  ['<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/>', 'Express Entry Pool Insights',
    'See how the pool is distributed by score band alongside the latest Immigration Levels Plan.', SCENE_BARS],
  ['<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', 'Push Notifications',
    'An alert lands on your phone the instant IRCC publishes a new round — no refreshing required.'],
  ['<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>', 'Private by Design',
    'Your profile and scores stay on your phone. Only an anonymous push token ever reaches our server.'],
];

const ICO_CYCLE = ['', 'tl', 'nvy'];
const featgrid = () =>
  FEATURES.map(([ic, h, p, scene], i) => {
    const inner = scene || advIcon(ic, 34);
    return `<div class="featcard"><div class="visual ${ICO_CYCLE[i % 3]}">${inner}</div><div class="body"><h3>${h}</h3><p>${p}</p></div></div>`;
  }).join('\n  ');

const SHOTS = [
  ['01_welcome.png', 'Welcome screen introducing CRS Pulse'],
  ['02_home.png', 'Home screen with your CRS score and recent draws'],
  ['03_draws.png', 'Live IRCC draws with category filters'],
  ['05_analytics_plan.png', 'Personalized odds and forecast for your next draw'],
  ['06_timeline.png', 'Application timeline milestones'],
  ['07_settings.png', 'Settings and notification preferences'],
  ['08_menu.png', 'Menu with checklists, processing times and support'],
];

const CATEGORIES = ['General', 'Canadian Experience Class', 'French-language', 'Healthcare', 'STEM', 'Trades', 'Education', 'Agriculture', 'Provincial Nominee'];

const CALCULATORS = [
  ['CRS', 'Comprehensive Ranking System', 'The official IRCC formula — age, education, language ability, work experience and additional factors like a provincial nomination, out of a maximum 1,200 points.'],
  ['FSW', 'Federal Skilled Worker (67-point grid)', 'Six selection factors — age, education, language, experience, arranged employment and adaptability — need 67 of 100 to qualify.'],
  ['BC PNP SIRS', 'British Columbia', 'The 200-point Skills Immigration Registration System grid used to rank candidates in BC’s provincial nomination draws.'],
  ['SINP EOI', 'Saskatchewan', 'The 110-point Expression of Interest grid — a minimum of 60 points is needed to enter the SINP pool.'],
];

// FAQ content mirrors mobile/src/i18n/en.ts "faq" section verbatim.
const FAQ = [
  ['What is a CRS score?', 'The Comprehensive Ranking System (CRS) is how IRCC ranks candidates in the Express Entry pool, out of a maximum of 1,200 points. Points come from age, education, language ability, work experience, and additional factors like a provincial nomination. In each draw, IRCC invites the highest-ranked candidates to apply for permanent residency.'],
  ['How accurate is the calculator?', 'CRS Pulse uses the current official IRCC CRS grid. Your result should match the official IRCC tool when you enter the same answers. The score shown here is an estimate for planning purposes — always confirm with the official IRCC CRS tool before making decisions.'],
  ['Where does the draw data come from?', 'Draw history is fetched directly from the official IRCC public data feed on canada.ca. Nothing is edited or estimated — you see the same rounds of invitations IRCC publishes.'],
  ['How do draw notifications work?', 'If you enable notifications, your device registers an anonymous push token with our server. When IRCC publishes a new draw, we send an alert. No personal or profile data ever leaves your device — only the anonymous token.'],
  ['What are category-based draws?', 'Besides general draws, IRCC runs targeted draws for categories like French-language proficiency, healthcare, STEM, trades, education, and agriculture occupations. These often have lower CRS cut-offs, so qualifying for a category can mean an invitation at a lower score.'],
  ['Why is my score different from the IRCC tool?', 'Double-check each answer — small differences (language test scores, ECA outcome, work history dates) shift points significantly. Also make sure the app is updated, since IRCC occasionally changes the grid. The official IRCC tool is always the final word.'],
  ['How can I improve my CRS score?', 'The biggest levers: retake your language test for higher CLB levels, gain another year of skilled work experience, complete a higher credential, add French as a second language, or get a provincial nomination (+600 points). The calculator lets you try what-if scenarios to see each impact.'],
  ['Does the app work offline?', 'Yes. The calculator works fully offline, and the latest fetched draw history is cached on your device. You only need a connection to refresh draws or receive notifications.'],
  ['Is CRS Pulse free?', 'Yes — CRS Pulse is completely free. Every feature, from draw tracking and the calculators to analytics and push alerts, comes at no charge, with no ads, no in-app purchases, and no subscription. It is an independent tool and is not affiliated with IRCC or the Government of Canada.'],
];

function finalCta() {
  return `
<section class="finalcta">
  <h2>Start with Your CRS Score,<br>Free in Two Minutes</h2>
  <p>Download CRS Pulse and see where you stand against the latest cutoffs today.</p>
  ${dlBtn('dark lg', 'Download on the App Store')}
</section>`;
}

function home() {
  const body = `
<div class="hero2wrap">
  <div class="wrap hero2">
    <span class="hero2-badge left" aria-hidden="true">${apple(24)}</span>
    <span class="hero2-badge right" aria-hidden="true">${advIcon('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', 24)}</span>
    <h1>Your CRS Score,<br>Now in Your Pocket.</h1>
    <p>The Express Entry companion for your journey to Canadian PR. Calculate your CRS score with the official IRCC formula, follow every draw live, and get an alert the second a new round drops.</p>
    <div class="hero2-ctas">
      ${dlBtn('dark lg', 'Download on the App Store')}
      <a class="textlink" href="/features">Explore Features</a>
    </div>
    <div class="phonefr hero-crop">
      <div class="dv-inner">
        <img class="dv-shot" src="/img/screenshots/hero_home.png" alt="CRS Pulse home screen showing your CRS score and recent draws">
        <img class="dv-frame" src="/img/frame/iphone17pro.png" alt="">
      </div>
    </div>
  </div>
</div>

<main class="wrap">

<section class="statrow" aria-hidden="true">
  ${STATS.map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('\n  ')}
</section>

<div class="sec-intro" id="features">
  <h2>Everything You Need<br>on the Road to PR</h2>
  <p>One free app for every stage of the Express Entry journey — from your first score to the day your ITA arrives</p>
</div>
<section class="featgrid">
  ${featgrid()}
</section>

<div class="sec-intro">
  <h2>What Makes CRS Pulse Different?</h2>
  <p>Built for Express Entry applicants — everything you need to plan your application, nothing you don't</p>
</div>
<section class="diffgrid">
  ${ADVANTAGES.map(([ic, h, p]) => `<div class="diffcard"><span class="ico">${advIcon(ic, 26)}</span><h3>${h}</h3><p>${p}</p></div>`).join('\n  ')}
</section>

<div class="sec-intro">
  <h2>See It In Action</h2>
  <p>A look inside the app — your score, live draws, analytics and application tracking</p>
</div>
<section class="shotstrip" id="shotstrip">
  ${[0, 1, 2, 3, 4].map((slot) => `<div class="shot${slot === 2 ? ' active' : ''}" data-slot="${slot}"><img class="dv-shot" src="/img/screenshots/${SHOTS[slot][0]}" alt="${SHOTS[slot][1]}" loading="lazy"><img class="dv-frame" src="/img/frame/iphone17pro.png" alt=""></div>`).join('\n  ')}
</section>
<div class="shot-dots" id="shot-dots">${SHOTS.map((_, i) => `<span data-i="${i}" class="${i === 2 ? 'on' : ''}"></span>`).join('')}</div>
<script>
(function(){
  var strip = document.getElementById('shotstrip');
  var dotsWrap = document.getElementById('shot-dots');
  if (!strip || !dotsWrap) return;
  var shots = ${JSON.stringify(SHOTS)};
  var slots = Array.prototype.slice.call(strip.querySelectorAll('.shot'));
  var imgs = slots.map(function(s){ return s.querySelector('.dv-shot'); });
  var dotEls = Array.prototype.slice.call(dotsWrap.querySelectorAll('span'));
  var n = shots.length, current = 2, timer;
  function render(){
    for (var slot = 0; slot < 5; slot++){
      var logical = ((current + (slot - 2)) % n + n) % n;
      imgs[slot].src = '/img/screenshots/' + shots[logical][0];
      imgs[slot].alt = shots[logical][1];
      slots[slot].dataset.logical = logical;
    }
    dotEls.forEach(function(d){ d.classList.toggle('on', +d.dataset.i === current); });
  }
  function goTo(i){ current = ((i % n) + n) % n; render(); }
  function play(){ timer = setInterval(function(){ goTo(current + 1); }, 3000); }
  function restart(i){ clearInterval(timer); goTo(i); play(); }
  render();
  play();
  slots.forEach(function(s){ s.addEventListener('click', function(){ restart(+s.dataset.logical); }); });
  dotEls.forEach(function(d){ d.addEventListener('click', function(){ restart(+d.dataset.i); }); });
})();
</script>
<div class="shots-cta">${dlBtn('dark lg', 'Download on the App Store')}</div>

</main>

<div class="getapp-wrap">
  <section class="wrap getapp">
    <div>
      <span class="getapp-eyebrow">${apple(14)}Available now on iOS</span>
      <h2>Get CRS Pulse</h2>
      <p class="getapp-sub">Free on the App Store — calculate your CRS score, track live draws and get instant alerts, all on your iPhone.</p>
      <div class="getapp-card">
        <div class="getapp-qr">${APP_STORE_QR_SVG}</div>
        <div class="getapp-card-info">
          <b>Scan to install</b>
          <span class="getapp-scan">Free on the App Store</span>
          ${dlBtn('light', 'Download on the App Store')}
        </div>
      </div>
    </div>
    <div class="getapp-art" aria-hidden="true">
      <div class="phonefr hero-crop">
        <div class="dv-inner">
          <img class="dv-shot" src="/img/screenshots/hero_home.png" alt="">
          <img class="dv-frame" src="/img/frame/iphone17pro.png" alt="">
        </div>
      </div>
    </div>
  </section>
</div>

<div class="wrap">

<div class="sec-intro">
  <h2>Frequently Asked Questions</h2>
  <p>Clear answers about CRS scoring accuracy, draw data, notifications and privacy</p>
</div>
<div class="faq-list">
  ${FAQ.map(([q, a]) => `<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('\n  ')}
</div>

</div>`;

  return shell({
    title: 'CRS Pulse — Express Entry CRS Calculator & IRCC Draw Tracker',
    description: 'Calculate your Canada Express Entry CRS score, track live IRCC draws, and get push alerts for new rounds. Free, private, and on-device.',
    path: '/',
    body,
  });
}

// ponytail: draws and faq pages are still placeholders — header/footer only, content TBD.
// Real copy is ready to drop back in: CATEGORIES and FAQ arrays above still hold everything moved out of them.
const emptyMain = `<main class="wrap" style="min-height:40vh"></main>`;

function featuresPage() {
  const body = `
<main class="wrap">
<div class="page-hero red">
  <h1>Every Tool for Your Express Entry Journey</h1>
  <p>CRS Pulse bundles everything you need to plan, track and act on your path to Canadian permanent residency — free, on-device, and always up to date with IRCC.</p>
</div>

<section class="featgrid" style="margin-top:20px">
  ${featgrid()}
</section>

${finalCta()}
</main>`;
  return shell({
    title: 'Features — CRS Pulse',
    description: 'Everything CRS Pulse does: CRS scoring, live IRCC draws, push alerts, an application tracker, and personal analytics — free.',
    path: '/features',
    body,
  });
}

function drawsPage() {
  return shell({
    title: 'Live Draws — CRS Pulse',
    description: 'Every Express Entry draw, fetched straight from IRCC, with category filters, cutoff trends and instant push alerts.',
    path: '/draws',
    body: emptyMain,
  });
}

function calculatorsPage() {
  const body = `
<main class="wrap">
<div class="page-hero teal">
  <h1>Four Calculators. One Official Source Each.</h1>
  <p>Check your eligibility for every major Express Entry and provincial nominee program — each grid calculated with the officially published formula, entirely on your device.</p>
</div>

<section class="calcgrid" style="margin-top:20px">
  ${CALCULATORS.map(([tag, h, p]) => `<div class="calccard"><span class="tag">${tag}</span><h3>${h}</h3><p>${p}</p></div>`).join('\n  ')}
</section>

${finalCta()}
</main>`;
  return shell({
    title: 'Calculators — CRS Pulse',
    description: 'CRS, FSW 67-point, BC PNP SIRS and SINP EOI — four official Express Entry and provincial nominee calculators, all on your device.',
    path: '/calculators',
    body,
  });
}

function faqPage() {
  return shell({
    title: 'FAQ — CRS Pulse',
    description: 'Answers to common questions about CRS scoring accuracy, draw data, notifications, category-based draws and privacy.',
    path: '/faq',
    body: emptyMain,
  });
}

function doc(mdFile, title, path) {
  const md = readFileSync(resolve(DOCS, mdFile), 'utf8');
  return shell({
    title: `${title} — CRS Pulse`,
    description: `${title} for CRS Pulse — the Express Entry CRS calculator and IRCC draw tracker.`,
    path,
    body: `<main class="doc"><article class="doc-card">${addHeadingIds(marked.parse(md))}</article></main>`,
  });
}

mkdirSync(OUT, { recursive: true });
cpSync(resolve(ASSETS, 'screenshots'), resolve(OUT, 'img/screenshots'), { recursive: true });
cpSync(resolve(ASSETS, 'frame'), resolve(OUT, 'img/frame'), { recursive: true });
writeFileSync(resolve(OUT, 'index.html'), home());
writeFileSync(resolve(OUT, 'features.html'), featuresPage());
writeFileSync(resolve(OUT, 'draws.html'), drawsPage());
writeFileSync(resolve(OUT, 'calculators.html'), calculatorsPage());
writeFileSync(resolve(OUT, 'faq.html'), faqPage());
writeFileSync(resolve(OUT, 'privacy.html'), doc('PRIVACY_POLICY.md', 'Privacy Policy', '/privacy'));
writeFileSync(resolve(OUT, 'terms.html'), doc('TERMS_OF_USE.md', 'Terms of Use', '/terms'));
console.log('Built index, features, draws, calculators, faq, privacy, terms → web/public/');
