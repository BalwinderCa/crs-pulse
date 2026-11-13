// /pulse-hq (rewritten here by vercel.json): the login form, or the dashboard shell once
// signed in. The shell holds no data; its script fetches /api/ops-stats, which checks the
// session cookie itself. Not linked from the site, not in the sitemap, noindex.
import { randomBytes } from 'node:crypto';
import { isAuthed, privateHeaders } from './_ops-auth.mjs';

const CSS = `
:root{color-scheme:light;--bg:#f4f4f2;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--ink3:#7a7975;--line:#e4e3df;
--s1:#2a78d6;--s2:#eb6834;--good:#0a7a3a;--bad:#c2312f;--focus:#2a78d6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#111110;--surface:#1a1a19;--ink:#f0efec;
--ink2:#c3c2b7;--ink3:#8f8e86;--line:#2c2c2a;--s1:#3987e5;--s2:#d95926;--good:#3fbf6f;--bad:#e66767}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#111110;--surface:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#8f8e86;--line:#2c2c2a;
--s1:#3987e5;--s2:#d95926;--good:#3fbf6f;--bad:#e66767}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:15px/1.45 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:24px 16px 48px}
header{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
h1{font-size:20px;margin:0;letter-spacing:-.01em}h2{font-size:14px;font-weight:600;margin:0 0 2px}
.sub{color:var(--ink3);font-size:13px}
button{font:inherit;cursor:pointer;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 12px}
button:focus-visible,input:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:12px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;min-width:0}
.kpi .v{font-size:28px;font-weight:650;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:4px}
.kpi .l{color:var(--ink2);font-size:13px}.kpi .d{font-size:12px;color:var(--ink3);font-variant-numeric:tabular-nums}
.up{color:var(--good)}.down{color:var(--bad)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-bottom:12px}
.wide{grid-column:1/-1}
svg{display:block;width:100%;height:auto;overflow:visible}
.axis{fill:var(--ink3);font-size:11px;font-variant-numeric:tabular-nums}.grid-l{stroke:var(--line);stroke-width:1}
.legend{display:flex;gap:14px;font-size:12px;color:var(--ink2);margin:6px 0 4px}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.bars{display:grid;grid-template-columns:minmax(0,max-content) 1fr auto;gap:6px 10px;align-items:center;font-size:13px;margin-top:10px}
.bars .k{color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.bars .t{height:10px;background:var(--line);border-radius:4px;overflow:hidden}.bars .f{height:100%;background:var(--s1);border-radius:4px}
.bars .n{font-variant-numeric:tabular-nums;text-align:right;color:var(--ink)}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}th,td{text-align:left;padding:6px 4px;border-bottom:1px solid var(--line)}
th{color:var(--ink3);font-weight:500}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--surface);font-size:12px;padding:6px 8px;border-radius:6px;opacity:0;transition:opacity .08s;z-index:9;white-space:nowrap}
.msg{padding:40px 0;text-align:center;color:var(--ink2)}
.login{max-width:360px;margin:12vh auto 0;padding:0 16px}
.login form{display:grid;gap:12px;margin-top:16px}
.login label{display:grid;gap:4px;font-size:13px;color:var(--ink2)}
.login input{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
.login button{background:var(--ink);color:var(--surface);border-color:var(--ink);padding:10px}
.err{color:var(--bad);font-size:13px;min-height:1.2em}
`;

const page = (nonce, body, script) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Pulse HQ</title><style>${CSS}</style></head><body>${body}
<script nonce="${nonce}">${script}</script></body></html>`;

const LOGIN_JS = `
const f=document.getElementById('f'),e=document.getElementById('e'),b=f.querySelector('button');
f.addEventListener('submit',async ev=>{ev.preventDefault();e.textContent='';b.disabled=true;b.textContent='Checking…';
try{const r=await fetch('/api/ops-login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
body:JSON.stringify({passphrase:f.passphrase.value,code:f.code.value})});
if(r.ok){location.reload();return}e.textContent=r.status===401?'Passphrase or code is wrong.':'Login is not available right now.';}
catch{e.textContent='Network error.'}f.code.value='';b.disabled=false;b.textContent='Sign in';f.code.focus();});`;

const LOGIN = `<main class="login"><h1>Pulse HQ</h1><div class="sub">CRS Pulse app stats. Private.</div>
<form id="f" autocomplete="on"><label>Passphrase<input name="passphrase" type="password" autocomplete="current-password" required autofocus></label>
<label>Authenticator code<input name="code" inputmode="numeric" pattern="[0-9 ]{6,7}" maxlength="7" autocomplete="one-time-code" required></label>
<div class="err" id="e" role="alert"></div><button type="submit">Sign in</button></form></main>`;

const DASH = `<div class="wrap"><header><div><h1>Pulse HQ</h1><div class="sub" id="meta">Loading PostHog stats…</div></div>
<div><button id="out">Sign out</button></div></header><main id="app"><div class="msg">Loading…</div></main></div><div id="tip" role="tooltip"></div>`;

const DASH_JS = `
const $=s=>document.querySelector(s),fmt=n=>Number(n).toLocaleString('en-CA');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tip=$('#tip');
document.addEventListener('mousemove',ev=>{const t=ev.target.closest('[data-tip]');if(!t){tip.style.opacity=0;return}
tip.textContent=t.dataset.tip;tip.style.opacity=1;const w=tip.offsetWidth;
tip.style.left=Math.min(innerWidth-w-8,ev.clientX+12)+'px';tip.style.top=(ev.clientY-34)+'px';});
$('#out').onclick=async()=>{await fetch('/api/ops-logout',{method:'POST',credentials:'same-origin'});location.reload()};
const day=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-CA',{month:'short',day:'numeric',timeZone:'UTC'});

function delta(cur,prev){if(!prev)return'<span class="d">no prior week</span>';const p=Math.round((cur-prev)/prev*100);
const cls=p>0?'up':p<0?'down':'';return '<span class="d"><span class="'+cls+'">'+(p>0?'▲ +':p<0?'▼ ':'')+p+'%</span> vs prior 7 days ('+fmt(prev)+')</span>'}
const kpi=(l,v,d)=>'<div class="card kpi"><div class="l">'+l+'</div><div class="v">'+v+'</div>'+(d||'')+'</div>';

function ticks(max){const raw=max/4,m=Math.pow(10,Math.floor(Math.log10(raw||1))),s=[1,2,5,10].map(x=>x*m).find(x=>x>=raw)||m;
const top=Math.max(s,Math.ceil(max/s)*s);const out=[];for(let v=0;v<=top;v+=s)out.push(v);return out}

// Columns over days: one series, or two stacked with a 2px surface gap.
function columns(rows,keys,labels){const W=400,H=210,L=30,B=22,T=8,pw=W-L-8,ph=H-B-T;
const tot=rows.map(r=>keys.reduce((a,k)=>a+r[k],0)),tk=ticks(Math.max(1,...tot)),top=tk[tk.length-1],bw=pw/rows.length;
let g=tk.map(v=>{const y=T+ph-v/top*ph;return '<line class="grid-l" x1="'+L+'" x2="'+(W-8)+'" y1="'+y+'" y2="'+y+'"/><text class="axis" x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end">'+v+'</text>'}).join('');
rows.forEach((r,i)=>{let base=T+ph;const x=L+i*bw+bw*.18,w=bw*.64;
keys.forEach((k,j)=>{const h=r[k]/top*ph;if(h<=0)return;const gap=j>0?2:0;const y=base-h;
g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(0,h-gap).toFixed(1)+'" rx="'+(j===keys.length-1||keys.length===1?3:0)+'" fill="var(--s'+(j+1)+')"/>';base=y;});
g+='<rect x="'+(L+i*bw)+'" y="'+T+'" width="'+bw+'" height="'+ph+'" fill="transparent" data-tip="'+esc(day(r.d)+' · '+keys.map((k,j)=>labels[j]+' '+fmt(r[k])).join(' · '))+'"/>';
if(i%7===0)g+='<text class="axis" x="'+(L+i*bw+bw/2)+'" y="'+(H-6)+'" text-anchor="middle">'+day(r.d)+'</text>'});
const leg=keys.length>1?'<div class="legend">'+labels.map((l,j)=>'<span><i style="background:var(--s'+(j+1)+')"></i>'+l+'</span>').join('')+'</div>':'';
return leg+'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(labels.join(', '))+' per day">'+g+'</svg>'}

// Daily users as a 2px line with point hover.
function line(rows,key,label){const W=1000,H=240,L=36,B=24,T=10,pw=W-L-12,ph=H-B-T;
const tk=ticks(Math.max(1,...rows.map(r=>r[key]))),top=tk[tk.length-1],step=pw/Math.max(1,rows.length-1);
const X=i=>L+i*step,Y=v=>T+ph-v/top*ph;
let g=tk.map(v=>'<line class="grid-l" x1="'+L+'" x2="'+(W-12)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text class="axis" x="'+(L-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+v+'</text>').join('');
const pts=rows.map((r,i)=>X(i).toFixed(1)+','+Y(r[key]).toFixed(1));
g+='<polygon points="'+L+','+(T+ph)+' '+pts.join(' ')+' '+X(rows.length-1)+','+(T+ph)+'" fill="var(--s1)" opacity=".08"/>';
g+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round"/>';
let mx=0;rows.forEach((r,i)=>{if(r[key]>rows[mx][key])mx=i});
rows.forEach((r,i)=>{g+='<rect x="'+(X(i)-step/2)+'" y="'+T+'" width="'+step+'" height="'+ph+'" fill="transparent" data-tip="'+esc(day(r.d)+' · '+fmt(r[key])+' '+label)+'"/>';
if(i%5===0||i===rows.length-1)g+='<text class="axis" x="'+X(i)+'" y="'+(H-6)+'" text-anchor="middle">'+day(r.d)+'</text>'});
const last=rows.length-1;
[mx,last].forEach(i=>{g+='<circle cx="'+X(i)+'" cy="'+Y(rows[i][key])+'" r="4.5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2" pointer-events="none"/>'+
'<text class="axis" x="'+X(i)+'" y="'+(Y(rows[i][key])-10)+'" text-anchor="middle" style="fill:var(--ink)">'+rows[i][key]+'</text>'});
return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+label+' per day">'+g+'</svg>'}

function hbars(items,limit,unit){const top=items.slice(0,limit),max=Math.max(1,...top.map(i=>i.n));
return '<div class="bars">'+top.map(i=>'<div class="k" title="'+esc(i.key)+'">'+esc(i.key)+'</div><div class="t" data-tip="'+esc(i.key+' · '+fmt(i.n)+' '+unit)+'"><div class="f" style="width:'+(i.n/max*100).toFixed(1)+'%"></div></div><div class="n">'+fmt(i.n)+'</div>').join('')+'</div>'}
const card=(t,s,body,cls)=>'<section class="card'+(cls?' '+cls:'')+'"><h2>'+t+'</h2><div class="sub">'+s+'</div>'+body+'</section>';
const dur=s=>s<60?s+' s':Math.floor(s/60)+' min '+(s%60?s%60+' s':'');

function render(d){const s=d.summary,r=d.retention,ss=d.sessions,pct=(a,b)=>b?Math.round(a/b*100)+'%':'–';
$('#meta').textContent='Last 7 days (UTC days, today partial). Updated '+new Date(d.generatedAt).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'})+' · Excludes Apple review and Play pre-launch devices.';
const evs='<table><thead><tr><th>Event</th><th class="num">Count</th><th class="num">Users</th></tr></thead><tbody>'+
d.events.map(e=>'<tr><td>'+esc(e.key)+'</td><td class="num">'+fmt(e.n)+'</td><td class="num">'+fmt(e.users)+'</td></tr>').join('')+'</tbody></table>';
$('#app').innerHTML='<div class="kpis">'+
kpi('Active users',fmt(s.users_7),delta(s.users_7,s.users_prev))+
kpi('App opens',fmt(s.opens_7),delta(s.opens_7,s.opens_prev))+
kpi('Installs',fmt(s.installs_7),delta(s.installs_7,s.installs_prev))+
kpi('Sessions',fmt(s.sessions_7),delta(s.sessions_7,s.sessions_prev))+
kpi('Users, 30 days',fmt(s.users_30),'<span class="d">median session '+dur(ss.median_s)+'</span>')+'</div>'+
'<div class="grid">'+card('Daily active users','Last 30 days, hover a day for the count',line(d.daily,'users','users'),'wide')+
card('Installs per day','First launch after install',columns(d.daily,['installs'],['Installs']))+
card('Ads loaded per day','ad_shown fires on load, not on an impression',columns(d.daily,['ads_native','ads_app_open'],['Native','App open']))+
card('Milestones added per day','The action most tied to coming back',columns(d.daily,['milestones'],['Milestones']))+
card('Pushes opened per day','Taps on any push; spikes follow a new-draw push',columns(d.daily,['push_opened'],['Push opens']))+'</div>'+
'<div class="grid">'+card('Screens','Users who viewed each screen, 7 days',hbars(d.screen,12,'users'))+
card('Custom events','7 days',evs)+'</div>'+
'<div class="grid">'+card('Countries','Users, 7 days',hbars(d.country,10,'users'))+
card('Platform','Users, 7 days',hbars(d.os,5,'users'))+
card('App version','Version each user was last seen on',hbars(d.version,6,'users'))+'</div>'+
'<div class="grid">'+card('Days active in the week','How many of the last 7 days each user opened the app',hbars(d.daysActive.map(x=>({key:x.key+(x.key==='1'?' day':' days'),n:x.n})),7,'users'))+
card('New-install retention','Installed 8–30 days ago ('+fmt(r.cohort)+' users)','<div class="kpis" style="margin-top:12px">'+
kpi('Back in week 1',pct(r.week1,r.cohort),'<span class="d">'+fmt(r.week1)+' users, days 1–7</span>')+
kpi('Active after day 7',pct(r.later,r.cohort),'<span class="d">'+fmt(r.later)+' users</span>')+'</div>')+'</div>';}

fetch('/api/ops-stats',{credentials:'same-origin'}).then(async r=>{if(r.status===401){location.reload();return}
if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||r.status);render(await r.json())})
.catch(e=>{$('#app').innerHTML='<div class="msg">Could not load stats: '+esc(e.message)+'</div>';$('#meta').textContent=''});`;

export default function handler(req, res) {
  privateHeaders(res);
  const nonce = randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const authed = isAuthed(req);
  res.status(200).send(authed ? page(nonce, DASH, DASH_JS) : page(nonce, LOGIN, LOGIN_JS));
}
