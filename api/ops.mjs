// /pulse-hq (rewritten here by vercel.json): the login form, or the dashboard shell once
// signed in. The shell holds no data; its script fetches /api/ops-stats, which checks the
// session cookie itself. Not linked from the site, not in the sitemap, noindex.
import { randomBytes } from 'node:crypto';
import { isAuthed, isTrustedDevice, privateHeaders } from './_ops-auth.mjs';

const CSS = `
:root{color-scheme:light;--bg:#f4f4f2;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--ink3:#7a7975;--line:#e4e3df;
--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--good:#0a7a3a;--bad:#c2312f;--focus:#2a78d6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#111110;--surface:#1a1a19;--ink:#f0efec;
--ink2:#c3c2b7;--ink3:#8f8e86;--line:#2c2c2a;--s1:#3987e5;--s2:#d95926;--s3:#199e70;--good:#3fbf6f;--bad:#e66767}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#111110;--surface:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#8f8e86;--line:#2c2c2a;
--s1:#3987e5;--s2:#d95926;--s3:#199e70;--good:#3fbf6f;--bad:#e66767}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:15px/1.45 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.shell{display:grid;grid-template-columns:216px minmax(0,1fr);min-height:100vh}
.side{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:20px;padding:24px 14px;border-right:1px solid var(--line);background:var(--surface)}
.brand{font-weight:650;font-size:17px;padding:0 10px;display:flex;flex-direction:column}.brand span{font-weight:400;font-size:12px;color:var(--ink3)}
.side nav{display:flex;flex-direction:column;gap:4px}
.side nav a{display:grid;grid-template-columns:10px 1fr;column-gap:10px;align-items:center;padding:9px 10px;border-radius:8px;color:var(--ink2);text-decoration:none;font-size:14px}
.side nav a small{grid-column:2;font-size:11px;color:var(--ink3)}
.side nav a:hover{background:var(--bg)}.side nav a[aria-current="page"]{background:var(--bg);color:var(--ink);font-weight:600}
.side nav a:focus-visible{outline:2px solid var(--focus);outline-offset:1px}
.dot{width:10px;height:10px;border-radius:3px;grid-row:1/3}
.side-foot{margin-top:auto;display:flex;flex-direction:column;gap:8px}.side-foot button{width:100%;font-size:13px}
.main{max-width:1120px;width:100%;margin:0 auto;padding:24px 20px 48px;min-width:0}
header{margin-bottom:20px}
@media (max-width:760px){.shell{grid-template-columns:minmax(0,1fr)}
.side{position:sticky;height:auto;flex-direction:row;align-items:center;gap:8px;padding:10px 16px;border-right:0;border-bottom:1px solid var(--line);z-index:5;flex-wrap:wrap}
.brand{display:none}.side nav{flex-direction:row;flex:1}.side nav a{grid-template-columns:10px auto;padding:7px 10px}.side nav a small{display:none}.dot{grid-row:auto}
.side-foot{margin:0;flex-direction:row}.side-foot button{width:auto;font-size:12px;padding:5px 8px}.side-foot #forget{display:none}
.main{padding:16px 16px 40px}}
h1{font-size:20px;margin:0;letter-spacing:-.01em}h2{font-size:14px;font-weight:600;margin:0 0 2px}
.sub{color:var(--ink3);font-size:13px}
button{font:inherit;cursor:pointer;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 12px}
button:focus-visible,input:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px;margin-bottom:12px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;min-width:0;overflow-x:auto}
.kpi .v{font-size:28px;font-weight:650;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:4px}
.kpi .l{color:var(--ink2);font-size:13px}.kpi .d{font-size:12px;color:var(--ink3);font-variant-numeric:tabular-nums}
.up{color:var(--good)}.down{color:var(--bad)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin-bottom:12px}
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
.login label.check{display:flex;gap:8px;align-items:center;color:var(--ink2)}.login label.check input{width:16px;height:16px;padding:0}
details.card summary{cursor:pointer;list-style:none;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}details.card summary::-webkit-details-marker{display:none}
details.card summary h2::before{content:'▸ ';color:var(--ink3)}details.card[open] summary h2::before{content:'▾ '}
.grid.two{grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
h2.sec{font-size:16px;margin:28px 0 2px}.sec-sub{margin-bottom:12px}code{font-size:12px}
`;

const page = (nonce, body, script) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Pulse HQ</title><style>${CSS}</style></head><body>${body}
<script nonce="${nonce}">${script}</script></body></html>`;

const LOGIN_JS = `
const f=document.getElementById('f'),e=document.getElementById('e'),b=f.querySelector('button');
f.addEventListener('submit',async ev=>{ev.preventDefault();e.textContent='';b.disabled=true;b.textContent='Checking…';
try{const r=await fetch('/api/ops-login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
body:JSON.stringify({passphrase:f.passphrase?f.passphrase.value:undefined,code:f.code.value,remember:!!(f.remember&&f.remember.checked)})});
if(r.ok){location.reload();return}const j=await r.json().catch(()=>({}));
if(r.status===401&&j.passphraseNeeded&&!f.passphrase){location.reload();return}
e.textContent=r.status===401?(f.passphrase?'Passphrase or code is wrong.':'That code is wrong.'):'Login is not available right now.';}
catch{e.textContent='Network error.'}f.code.value='';b.disabled=false;b.textContent='Sign in';f.code.focus();});`;

const CODE_FIELD = (autofocus) => `<label>Authenticator code<input name="code" inputmode="numeric" pattern="[0-9 ]{6,7}" maxlength="7" autocomplete="one-time-code" required${autofocus ? ' autofocus' : ''}></label>`;

// Full login: passphrase + code, with the option to remember this browser for 90 days.
const LOGIN_FULL = `<main class="login"><h1>Pulse HQ</h1><div class="sub">CRS Pulse app stats. Private.</div>
<form id="f" autocomplete="on"><label>Passphrase<input name="passphrase" type="password" autocomplete="current-password" required autofocus></label>
${CODE_FIELD(false)}<label class="check"><input type="checkbox" name="remember" checked> Remember this device for 90 days (code only next time)</label>
<div class="err" id="e" role="alert"></div><button type="submit">Sign in</button></form></main>`;

// Remembered device: the code alone.
const LOGIN_CODE = `<main class="login"><h1>Pulse HQ</h1><div class="sub">This device is remembered. Enter your authenticator code.</div>
<form id="f" autocomplete="on">${CODE_FIELD(true)}
<div class="err" id="e" role="alert"></div><button type="submit">Sign in</button></form></main>`;

const DASH = `<div class="shell"><aside class="side"><div class="brand">Pulse HQ<span>CRS Pulse</span></div>
<nav aria-label="Dashboards"><a href="#posthog" data-view="posthog"><span class="dot" style="background:var(--s1)"></span>App usage<small>PostHog</small></a>
<a href="#admob" data-view="admob"><span class="dot" style="background:var(--s2)"></span>Revenue<small>AdMob</small></a>
<a href="#rewarded" data-view="rewarded"><span class="dot" style="background:var(--s3)"></span>Rewarded ad<small>3 days without ads</small></a></nav>
<div class="side-foot"><button id="forget" title="Ask for the passphrase again next time on this browser">Forget this device</button><button id="out">Sign out</button></div></aside>
<div class="main"><header><h1 id="title">App usage</h1><div class="sub" id="meta">Loading…</div></header><main id="app"><div class="msg">Loading…</div></main></div></div>
<div id="tip" role="tooltip"></div>`;

const DASH_JS = `
const $=s=>document.querySelector(s),fmt=n=>Number(n).toLocaleString('en-CA');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tip=$('#tip');
document.addEventListener('mousemove',ev=>{const t=ev.target.closest('[data-tip]');if(!t){tip.style.opacity=0;return}
tip.textContent=t.dataset.tip;tip.style.opacity=1;const w=tip.offsetWidth;
tip.style.left=Math.min(innerWidth-w-8,ev.clientX+12)+'px';tip.style.top=(ev.clientY-34)+'px';});
const out=forget=>fetch('/api/ops-logout',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({forget})}).then(()=>location.reload());
$('#out').onclick=()=>out(false);$('#forget').onclick=()=>out(true);
const day=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-CA',{month:'short',day:'numeric',timeZone:'UTC'});

function delta(cur,prev){if(!prev)return'<span class="d">no prior week</span>';const p=Math.round((cur-prev)/prev*100);
const cls=p>0?'up':p<0?'down':'';return '<span class="d"><span class="'+cls+'">'+(p>0?'▲ +':p<0?'▼ ':'')+p+'%</span> vs prior 7 days ('+fmt(prev)+')</span>'}
const kpi=(l,v,d)=>'<div class="card kpi"><div class="l">'+l+'</div><div class="v">'+v+'</div>'+(d||'')+'</div>';

function ticks(max){const raw=max/4,m=Math.pow(10,Math.floor(Math.log10(raw||1))),s=[1,2,5,10].map(x=>x*m).find(x=>x>=raw)||m;
const top=Math.max(s,Math.ceil(max/s)*s);const out=[];for(let i=0;i*s<=top+1e-9;i++)out.push(i*s);return out}

// Columns over days (or months via o.lab): one series, or stacked with a 2px surface gap.
// o: {fv: value formatter, money: dollar axis, wide: full-width viewBox, lab: x label}
function columns(rows,keys,labels,o){o=o||{};const fv=o.fv||fmt,lab=o.lab||day,money=!!o.money,W=o.wide?1000:400,H=o.wide?240:210,L=o.wide?48:36,B=22,T=8,pw=W-L-8,ph=H-B-T;
const tot=rows.map(r=>keys.reduce((a,k)=>a+r[k],0)),tk=ticks(Math.max(money?0.05:1,...tot)),top=tk[tk.length-1],bw=pw/rows.length,every=rows.length<=12?1:7;
const tl=v=>money?'$'+v.toFixed(v>=10?0:2):+v.toFixed(2);
let g=tk.map(v=>{const y=T+ph-v/top*ph;return '<line class="grid-l" x1="'+L+'" x2="'+(W-8)+'" y1="'+y+'" y2="'+y+'"/><text class="axis" x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end">'+tl(v)+'</text>'}).join('');
rows.forEach((r,i)=>{let base=T+ph;const x=L+i*bw+bw*.18,w=bw*.64;
keys.forEach((k,j)=>{const h=r[k]/top*ph;if(h<=0)return;const gap=j>0?2:0;const y=base-h;
g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(0,h-gap).toFixed(1)+'" rx="'+(j===keys.length-1||keys.length===1?3:0)+'" fill="var(--s'+(j+1)+')"/>';base=y;});
g+='<rect x="'+(L+i*bw)+'" y="'+T+'" width="'+bw+'" height="'+ph+'" fill="transparent" data-tip="'+esc(lab(r.d)+' · '+keys.map((k,j)=>labels[j]+' '+fv(r[k])).join(' · '))+'"/>';
if(i%every===0)g+='<text class="axis" x="'+(L+i*bw+bw/2)+'" y="'+(H-6)+'" text-anchor="middle">'+lab(r.d)+'</text>'});
const leg=keys.length>1?'<div class="legend">'+labels.map((l,j)=>'<span><i style="background:var(--s'+(j+1)+')"></i>'+l+'</span>').join('')+'</div>':'';
return leg+'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(labels.join(', '))+'">'+g+'</svg>'}

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

const money=(v,c)=>new Intl.NumberFormat('en-CA',{style:'currency',currency:c||'CAD',minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const pc=v=>(v*100).toFixed(v>0&&v<0.1?1:0)+'%';
const monthLab=k=>new Date(k+'-01T00:00:00Z').toLocaleDateString('en-CA',{month:'short',year:'2-digit',timeZone:'UTC'});
function admobSection(a,err,users7){
if(!a)return '<div class="card msg" style="margin-bottom:12px">'+esc(err||'AdMob not connected')+'. Run <code>node scripts/admob-setup.mjs</code> to connect it.</div>';
const m=v=>money(v,a.currency),na='<div class="msg">Not available right now.</div>';
const label=k=>k.replace(/_/g,' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
const tbl=(rows,first,lab,limit,share)=>{const tot=share?rows.reduce((x,r)=>x+r.earnings,0):0;
return '<table><thead><tr><th>'+first+'</th><th class="num">Earnings</th>'+(share?'<th class="num">Share</th>':'')+'<th class="num">Impr.</th><th class="num">eCPM</th><th class="num">Match</th><th class="num">Show</th><th class="num">Clicks</th></tr></thead><tbody>'+
rows.slice(0,limit||99).map(r=>'<tr><td>'+esc(lab(r.key))+'</td><td class="num">'+m(r.earnings)+'</td>'+(share?'<td class="num">'+(tot?pc(r.earnings/tot):'–')+'</td>':'')+'<td class="num">'+fmt(r.impressions)+'</td><td class="num">'+m(r.ecpm)+'</td><td class="num">'+pc(r.matchRate)+'</td><td class="num">'+pc(r.showRate)+'</td><td class="num">'+fmt(r.clicks)+'</td></tr>').join('')+'</tbody></table>'};
const best=a.days.reduce((b,x)=>x.earnings>b.earnings?x:b,a.days[0]);
const d7=a.prev7.earnings?delta(a.last7.earnings,a.prev7.earnings).replace('('+fmt(a.prev7.earnings)+')','('+m(a.prev7.earnings)+')'):'<span class="d">no prior week</span>';
const daily='<details class="card wide"><summary><h2>Daily detail</h2><span class="sub">Every day of the last 30, newest first</span></summary><table><thead><tr><th>Day</th><th class="num">Earnings</th><th class="num">iOS</th><th class="num">Android</th><th class="num">Requests</th><th class="num">Impr.</th><th class="num">Match</th><th class="num">Show</th><th class="num">eCPM</th><th class="num">Clicks</th></tr></thead><tbody>'+
a.days.slice().reverse().map(x=>'<tr><td>'+day(x.d)+'</td><td class="num">'+m(x.earnings)+'</td><td class="num">'+m(x.ios)+'</td><td class="num">'+m(x.android)+'</td><td class="num">'+fmt(x.requests)+'</td><td class="num">'+fmt(x.impressions)+'</td><td class="num">'+(x.requests?pc(x.matched/x.requests):'–')+'</td><td class="num">'+(x.matched?pc(x.impressions/x.matched):'–')+'</td><td class="num">'+m(x.ecpm)+'</td><td class="num">'+fmt(x.clicks)+'</td></tr>').join('')+'</tbody></table></details>';
const l7=a.last7;
return '<div class="sub sec-sub">CRS Pulse apps only · estimated · '+esc(a.currency)+' · days in '+esc(a.timeZone)+'</div>'+
'<div class="kpis">'+kpi('Today so far',m(a.today.earnings),'<span class="d">'+fmt(a.today.impressions)+' impressions</span>')+
kpi('Yesterday',m(a.yesterday.earnings),'<span class="d">'+fmt(a.yesterday.impressions)+' impressions · '+fmt(a.yesterday.clicks)+' clicks</span>')+
kpi('Last 7 days',m(l7.earnings),d7)+
kpi('This month so far',m(a.monthToDate.earnings),'<span class="d">last 30 days '+m(a.last30.earnings)+'</span>')+
kpi('Last month',m(a.lastMonth.earnings),'<span class="d">'+fmt(a.lastMonth.impressions)+' impressions</span>')+'</div>'+
'<h2 class="sec">Last 7 days</h2><div class="sub sec-sub">How well each ad request turns into money</div>'+
'<div class="kpis">'+kpi('eCPM',m(l7.ecpm),'<span class="d">earnings per 1,000 impressions</span>')+
kpi('Match rate',pc(l7.matchRate),'<span class="d">'+fmt(l7.matched)+' of '+fmt(l7.requests)+' requests filled</span>')+
kpi('Show rate',pc(l7.showRate),'<span class="d">'+fmt(l7.impressions)+' of '+fmt(l7.matched)+' filled ads seen</span>')+
kpi('Click rate',pc(l7.ctr),'<span class="d">'+fmt(l7.clicks)+' clicks</span>')+
kpi('Per 100 users',users7?m(l7.earnings/users7*100):'–','<span class="d">'+(users7?fmt(users7)+' active users (PostHog)':'no PostHog users')+'</span>')+'</div>'+
'<div class="grid">'+card('Earnings per day','Last 30 days by platform · best day '+day(best.d)+' ('+m(best.earnings)+')',columns(a.days,['ios','android'],['iOS','Android'],{fv:m,money:true,wide:true}),'wide')+'</div>'+
'<div class="grid two">'+card('Impressions per day','Last 30 days',columns(a.days,['impressions'],['Impressions']))+
card('eCPM per day','Earnings per 1,000 impressions; small days swing a lot',columns(a.days,['ecpm'],['eCPM'],{fv:m,money:true}))+'</div>'+
'<div class="grid two">'+card('Earnings by month','Last 6 months, this month so far',a.months?columns(a.months.map(x=>({d:x.key,earnings:x.earnings})),['earnings'],['Earnings'],{fv:m,money:true,lab:monthLab}):na)+
card('Top countries','Last 30 days',a.countries?tbl(a.countries,'Country',k=>k,10,true):na)+'</div>'+
'<div class="grid">'+card('Ad units','Last 30 days',a.adUnits?tbl(a.adUnits,'Ad unit',k=>k,20,true):na,'wide')+'</div>'+
'<div class="grid two">'+card('By ad format','Last 7 days',tbl(a.formats,'Format',label))+
card('By app','Last 7 days'+(a.other7.earnings?' · other apps on the account earned '+m(a.other7.earnings)+', not counted above':''),tbl(a.apps,'App',k=>k))+'</div>'+
'<div class="grid">'+daily+'</div>';}
// Settings rewarded ad ("3 days without ads"): PostHog taps/outcomes plus AdMob earnings.
function rewardedSection(a,r,days){
if(!r)return '';
const m=v=>money(v,a?a.currency:'CAD'),pcOf=(x,y)=>y?pc(x/y):'–';
const fmt7=a&&a.formats?a.formats.find(f=>f.key==='REWARDED'):null;
const units=a&&a.adUnits?a.adUnits.filter(u=>/rewarded/i.test(u.key)):[];
const u30=units.reduce((t,u)=>({earnings:t.earnings+u.earnings,impressions:t.impressions+u.impressions}),{earnings:0,impressions:0});
const byDay=Object.fromEntries(r.daily.map(x=>[x.d,x]));
const rows=days.map(d=>byDay[d]||{d,earned:0,dismissed:0,unavailable:0});
const since=r.first_at?'First tap '+new Date(r.first_at.replace(' ','T')+'Z').toLocaleDateString('en-CA',{month:'short',day:'numeric'}):'No taps yet: the offer reached 1.0.15 phones with the Nov 13 update';
return '<div class="sub sec-sub">Settings: “3 days without ads” · '+esc(since)+' · '+fmt(r.settings_users_7)+' users opened Settings on 1.0.15 this week</div>'+
'<div class="kpis">'+kpi('Watch ad taps',fmt(r.taps_7),'<span class="d">7 days · '+fmt(r.tap_users_7)+' users · '+fmt(r.taps_all)+' since launch</span>')+
kpi('Watched to the end',fmt(r.earned_7),'<span class="d">'+pcOf(r.earned_7,r.earned_7+r.dismissed_7)+' of ads that played · '+fmt(r.earned_all)+' since launch</span>')+
kpi('Closed early',fmt(r.dismissed_7),'<span class="d">7 days · '+fmt(r.dismissed_all)+' since launch</span>')+
kpi('No ad available',fmt(r.unavailable_7),'<span class="d">'+pcOf(r.unavailable_7,r.taps_7)+' of taps · '+fmt(r.unavailable_all)+' since launch</span>')+
kpi('Ad-free right now',fmt(r.ad_free_now),'<span class="d">users who earned it in the last 3 days</span>')+'</div>'+
'<div class="kpis">'+kpi('Rewarded earnings, 7 days',fmt7?m(fmt7.earnings):m(0),'<span class="d">'+(fmt7?fmt(fmt7.impressions)+' impressions · eCPM '+m(fmt7.ecpm):'no rewarded impressions yet')+' (AdMob)</span>')+
kpi('Rewarded earnings, 30 days',m(u30.earnings),'<span class="d">'+fmt(u30.impressions)+' impressions · eCPM '+(u30.impressions?m(u30.earnings/u30.impressions*1000):'–')+'</span>')+
kpi('Earnings per completed watch',r.earned_7&&fmt7?m(fmt7.earnings/r.earned_7):'–','<span class="d">7 days, AdMob ÷ PostHog</span>')+'</div>'+
'<div class="grid">'+card('Rewarded ad results per day','Last 30 days, PostHog (UTC days)',columns(rows,['earned','dismissed','unavailable'],['Watched to end','Closed early','No ad available'],{wide:true}),'wide')+'</div>';}
function render(d){const s=d.summary,r=d.retention,ss=d.sessions,pct=(a,b)=>b?Math.round(a/b*100)+'%':'–';
const upd='Updated '+new Date(d.generatedAt).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'});
const evs='<table><thead><tr><th>Event</th><th class="num">Count</th><th class="num">Users</th></tr></thead><tbody>'+
d.events.map(e=>'<tr><td>'+esc(e.key)+'</td><td class="num">'+fmt(e.n)+'</td><td class="num">'+fmt(e.users)+'</td></tr>').join('')+'</tbody></table>';
views.posthog={title:'App usage',meta:'PostHog · UTC days · excludes Apple review and Play pre-launch devices · '+upd,html:'<div class="kpis">'+
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
'<h2 class="sec">Engagement</h2><div class="sub sec-sub">PostHog, last 7 days.</div>'+
'<div class="grid">'+card('Screens','Users who viewed each screen, 7 days',hbars(d.screen,12,'users'))+
card('Custom events','7 days',evs)+'</div>'+
'<div class="grid">'+card('Countries','Users, 7 days',hbars(d.country,10,'users'))+
card('Platform','Users, 7 days',hbars(d.os,5,'users'))+
card('App version','Version each user was last seen on',hbars(d.version,6,'users'))+'</div>'+
'<div class="grid">'+card('Days active in the week','How many of the last 7 days each user opened the app',hbars(d.daysActive.map(x=>({key:x.key+(x.key==='1'?' day':' days'),n:x.n})),7,'users'))+
card('New-install retention','Installed 8–30 days ago ('+fmt(r.cohort)+' users)','<div class="kpis" style="margin-top:12px">'+
kpi('Back in week 1',pct(r.week1,r.cohort),'<span class="d">'+fmt(r.week1)+' users, days 1–7</span>')+
kpi('Active after day 7',pct(r.later,r.cohort),'<span class="d">'+fmt(r.later)+' users</span>')+'</div>')+'</div>'};
views.admob={title:'Revenue',meta:'AdMob · '+(d.admob?'Pacific-time days · ':'')+upd,html:admobSection(d.admob,d.admobError,s.users_7)};
views.rewarded={title:'Rewarded ad',meta:'PostHog taps and results (UTC days) · AdMob earnings (Pacific days) · '+upd,html:rewardedSection(d.admob,d.rewarded,d.daily.map(x=>x.d))};
show();}
const views={};
const current=()=>({'#admob':'admob','#rewarded':'rewarded'})[location.hash]||'posthog';
function show(){const k=current(),v=views[k];
document.querySelectorAll('.side nav a').forEach(a=>a.dataset.view===k?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
$('#title').textContent=v?v.title:({admob:'Revenue',rewarded:'Rewarded ad'})[k]||'App usage';document.title=(v?v.title:'Pulse HQ')+' · Pulse HQ';
if(v){$('#meta').textContent=v.meta;$('#app').innerHTML=v.html;}}
addEventListener('hashchange',()=>{show();scrollTo(0,0)});show();

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
  const login = isTrustedDevice(req) ? LOGIN_CODE : LOGIN_FULL;
  res.status(200).send(authed ? page(nonce, DASH, DASH_JS) : page(nonce, login, LOGIN_JS));
}
