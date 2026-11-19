// admin.crspulse.com (crspulse.com/pulse-hq redirects here): the login
// form, or the dashboard shell once signed in. The shell holds no data; its script fetches
// /api/ops-stats, which checks the session cookie itself. Not linked from the site, not in
// the sitemap, noindex. Look: the Creliq "Revenue Analytics Dashboard" Dribbble shot
// (soft grey canvas, white rounded cards, black pill toggles, gauge + smooth area chart).
import { randomBytes } from 'node:crypto';
import { isAuthed, isTrustedDevice, privateHeaders } from './_ops-auth.mjs';

const LIGHT = `color-scheme:light;--bg:#f3f3f1;--side:#f3f3f1;--surface:#ffffff;--raise:#f7f7f5;--ink:#111110;--ink2:#55544f;--ink3:#86857f;
--line:#ebeae6;--track:#ecebe7;--shadow:0 1px 2px rgba(17,17,16,.04),0 4px 14px rgba(17,17,16,.04);
--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--good:#0a7a3a;--bad:#c2312f;--focus:#2a78d6`;
const DARK = `color-scheme:dark;--bg:#0e0e0d;--side:#0e0e0d;--surface:#1a1a19;--raise:#232321;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#8f8e86;
--line:#2a2a28;--track:#2c2c2a;--shadow:0 1px 2px rgba(0,0,0,.3);
--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--good:#3fbf6f;--bad:#e66767;--focus:#3987e5`;

const CSS = `
:root{${LIGHT}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
button{font:inherit;cursor:pointer;color:var(--ink)}
button:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.ico{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.mark{width:30px;height:30px;border-radius:9px;background:var(--ink);color:var(--surface);display:grid;place-items:center;flex:none}
.mark .ico{width:18px;height:18px;stroke-width:2.2}

/* Shell: sidebar on the grey canvas, the main area as one big white panel */
.shell{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh}
.side{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:22px;padding:20px 14px;background:var(--side)}
.brand{display:flex;align-items:center;gap:10px;padding:2px 8px;font-weight:650;font-size:15px}
.brand small{display:block;font-weight:400;font-size:11.5px;color:var(--ink3)}
.side nav{display:flex;flex-direction:column;gap:2px}
.navi{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;color:var(--ink2);text-decoration:none;font-size:13.5px}
.navi:hover{background:var(--raise)}
.navi[aria-current="page"]{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:var(--shadow)}
.navi small{margin-left:auto;font-size:11px;color:var(--ink3);font-weight:400}
.side-foot{margin-top:auto;display:flex;flex-direction:column;gap:2px}
.side-foot button{border:0;background:none;text-align:left;width:100%}
.panel{margin:12px 12px 12px 0;background:var(--surface);border-radius:20px;box-shadow:var(--shadow);min-width:0;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid var(--line)}
.top h1{font-size:18px;margin:0;letter-spacing:-.01em;flex:1}
.main{padding:20px 24px 40px;max-width:1240px;width:100%;min-width:0}
.ovr{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.ovr h2{font-size:16px;margin:0}

/* Pill segmented control (Days / Week / Month) */
.seg{display:inline-flex;gap:6px}
.seg button{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:5px 13px;font-size:12.5px;color:var(--ink2)}
.seg button:hover{color:var(--ink)}
.seg button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.seg button:disabled{opacity:.4;cursor:default}
.seg.icons button{padding:6px 8px;display:grid;place-items:center}

h2{font-size:14px;font-weight:600;margin:0}
.sub{color:var(--ink3);font-size:12.5px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px;min-width:0;overflow-x:auto}
.card-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:2px}.card-h h2{flex:1}

/* KPI tiles */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:12px;margin-bottom:12px;padding:6px;background:var(--raise);border-radius:18px}
.kpi{background:var(--surface);border-radius:14px;padding:14px 16px;box-shadow:var(--shadow);min-width:0}
.kpi .l{display:flex;align-items:center;gap:8px;color:var(--ink);font-size:13px;font-weight:500}
.kpi .l .ico{color:var(--ink2)}
.kpi .v{font-size:26px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin:10px 0 2px}
.d{font-size:12px;color:var(--ink3);font-variant-numeric:tabular-nums}
.up{color:var(--good);font-weight:600}.down{color:var(--bad);font-weight:600}
.minis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px;margin-bottom:12px}
.mini{border:1px solid var(--line);border-radius:14px;padding:12px 14px;min-width:0}
.mini .l{font-size:12px;color:var(--ink3)}.mini .v{font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;margin:2px 0}

.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin-bottom:12px}
.grid.two{grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.grid.hero{grid-template-columns:minmax(0,1fr) minmax(0,2fr)}
@media (max-width:1060px){.grid.hero{grid-template-columns:minmax(0,1fr)}}
.wide{grid-column:1/-1}
h2.sec{font-size:16px;margin:28px 0 2px}.sec-sub{margin-bottom:12px}code{font-size:12px}

/* Charts */
svg{display:block;width:100%;height:auto;overflow:visible}
.axis{fill:var(--ink3);font-size:11px;font-variant-numeric:tabular-nums}
.axis.big{font-size:20px}
.grid-l{stroke:var(--line);stroke-width:1}
.legend{display:flex;gap:14px;font-size:12px;color:var(--ink2);margin:8px 0 4px}.legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}
.area-wrap{position:relative;margin-top:12px;touch-action:pan-y}
.guide line{stroke:var(--s1);stroke-width:1.5;stroke-dasharray:3 4}
.guide circle{fill:var(--s1);stroke:var(--surface);stroke-width:3}
.bub{position:absolute;pointer-events:none;background:var(--surface);border:1px solid var(--line);box-shadow:0 6px 20px rgba(0,0,0,.08);border-radius:10px;padding:6px 10px;white-space:nowrap;transform:translate(-50%,calc(-100% - 14px))}
.bub.l{transform:translate(-12%,calc(-100% - 14px))}.bub.r{transform:translate(-88%,calc(-100% - 14px))}
.bub small{display:block;font-size:10.5px;color:var(--ink3);text-transform:uppercase;letter-spacing:.03em}
.bub b{font-size:17px;font-weight:600;font-variant-numeric:tabular-nums}
.gauge{position:relative;max-width:300px;margin:14px auto 0}
.gauge .c{position:absolute;left:0;right:0;bottom:0;text-align:center}
.gauge .c b{display:block;font-size:30px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.1}
.src{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:9px;font-size:13px}
.src li{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:10px;align-items:center}
.src i{width:8px;height:8px;border-radius:50%}
.src span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink2)}
.src em{font-style:normal;color:var(--ink3);font-variant-numeric:tabular-nums;min-width:38px;text-align:right}
.src b{font-weight:500;font-variant-numeric:tabular-nums;min-width:64px;text-align:right}
.bars{display:grid;grid-template-columns:minmax(0,max-content) 1fr auto;gap:8px 12px;align-items:center;font-size:13px;margin-top:12px}
.bars .k{color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.bars .t{height:8px;background:var(--track);border-radius:999px;overflow:hidden}.bars .f{height:100%;background:var(--s1);border-radius:999px}
.bars .n{font-variant-numeric:tabular-nums;text-align:right}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}
th{color:var(--ink3);font-weight:500;font-size:12px}tr:last-child td{border-bottom:0}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
#tip{position:fixed;pointer-events:none;background:var(--surface);color:var(--ink);border:1px solid var(--line);box-shadow:0 6px 20px rgba(0,0,0,.1);font-size:12px;padding:6px 9px;border-radius:8px;opacity:0;transition:opacity .08s;z-index:9;white-space:nowrap}
.msg{padding:40px 0;text-align:center;color:var(--ink2)}
details.card summary{cursor:pointer;list-style:none;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}details.card summary::-webkit-details-marker{display:none}
details.card summary h2::before{content:'▸ ';color:var(--ink3)}details.card[open] summary h2::before{content:'▾ '}

/* Phone: sidebar becomes a top bar, the panel goes edge to edge */
@media (max-width:760px){.shell{grid-template-columns:minmax(0,1fr)}
.side{position:sticky;height:auto;flex-direction:row;align-items:center;gap:8px;padding:10px 16px;z-index:5;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.brand span{display:none}.side nav{flex-direction:row;flex:1}.navi{padding:7px 10px}.navi small{display:none}
.side-foot{margin:0;flex-direction:row}.side-foot .navi span,.side-foot #forget{display:none}
.panel{margin:0;border-radius:0;box-shadow:none}.top{padding:12px 16px}.main{padding:16px 16px 40px}}

/* Sidebar group (Community: Dashboard, Timelines) */
.navgroup summary{list-style:none;cursor:pointer}.navgroup summary::-webkit-details-marker{display:none}
.navgroup .caret{margin-left:auto;color:var(--ink3);font-size:11px;transition:transform .15s}
.nbadge{margin-left:auto;min-width:18px;padding:1px 6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:600;line-height:16px;text-align:center}.nbadge+.caret{margin-left:6px}
.navgroup:not([open]) .caret{transform:rotate(-90deg)}
.navi.sub{padding-left:36px}
@media (max-width:760px){.navgroup{display:contents}.navgroup summary{display:none}.navi.sub{padding-left:10px}}

/* Community (CRUD) */
.cm-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.cm-bar input,.cm-f input:not([type=checkbox]),.cm-f textarea,.cs-btn{font:inherit;font-size:13.5px;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);outline:none;transition:border-color .12s,box-shadow .12s;-webkit-appearance:none;appearance:none}
.cm-bar input:hover,.cm-f input:not([type=checkbox]):hover,.cm-f textarea:hover,.cs-btn:hover,.mp-field:hover{border-color:var(--ink3)}
.cm-bar input:focus,.cm-f input:not([type=checkbox]):focus,.cm-f textarea:focus,.cs-btn:focus-visible,.cs-btn[aria-expanded=true],.mp-field:focus-visible,.mp-field[aria-expanded=true]{border-color:var(--focus);box-shadow:0 0 0 3px color-mix(in srgb,var(--focus) 18%,transparent)}
.cm-bar input::placeholder,.cm-f input::placeholder{color:var(--ink3)}
.cm-bar input[type=search]{padding-left:36px;background:var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='9' cy='9' r='5.5' fill='none' stroke='%2386857f' stroke-width='1.6'/%3E%3Cpath d='M13.2 13.2 17 17' stroke='%2386857f' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E") 12px 50%/16px no-repeat}
.cm-bar input[type=search]::-webkit-search-cancel-button{-webkit-appearance:none}
.cm-bar input{flex:1;min-width:180px}.cm-filters{margin-top:-4px}.cm-filters .cs{flex:1 1 150px;min-width:0}
/* Custom select: the real <select> stays in the DOM (hidden) so form values and change events work as before. */
.cs{position:relative;display:block;min-width:130px}.cs>select{display:none}
.cs-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;cursor:pointer}
.cs-btn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-btn svg{width:14px!important;height:14px;flex:none;color:var(--ink3);transition:transform .15s}.cs-btn[aria-expanded=true] svg{transform:rotate(180deg)}
.cs-list{position:absolute;top:calc(100% + 6px);left:0;min-width:100%;max-height:280px;overflow:auto;z-index:6;margin:0;padding:5px;list-style:none;border-radius:12px;border:1px solid var(--line);background:var(--surface);box-shadow:0 12px 32px rgba(0,0,0,.16)}
.cs-list li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:8px;font-size:13.5px;color:var(--ink);cursor:pointer;white-space:nowrap;outline:none}
.cs-list li:hover,.cs-list li:focus{background:var(--raise)}.cs-list li[aria-selected=true]{font-weight:600}
.cs-list li[aria-selected=true]::after{content:'';width:12px;height:7px;border-left:2px solid var(--ink);border-bottom:2px solid var(--ink);transform:rotate(-45deg) translateY(-2px)}
.cm-f input[type=checkbox]{-webkit-appearance:none;appearance:none;width:18px;height:18px;margin:0;flex:none;border-radius:5px;border:1.5px solid var(--ink3);background:var(--surface);cursor:pointer;transition:background .12s,box-shadow .12s}
.cm-f input[type=checkbox]:checked{background:var(--ink);border-color:var(--ink);box-shadow:inset 0 0 0 3px var(--surface)}
.cm-f input[type=checkbox]:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--focus) 25%,transparent)}
.cm-f input[type=checkbox]:checked:focus-visible{box-shadow:inset 0 0 0 3px var(--surface),0 0 0 3px color-mix(in srgb,var(--focus) 25%,transparent)}
.btn.danger{background:var(--bad);border-color:var(--bad);color:#fff}.btn.danger:hover{filter:brightness(1.06);background:var(--bad)}
.cf{width:min(420px,calc(100vw - 32px))}.cf-top{display:flex;gap:14px;align-items:flex-start}
.cf-icon{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--bad) 14%,transparent);color:var(--bad)}
.cf-icon svg{width:20px!important;height:20px}.cf h2{margin:2px 0 6px;font-size:16px}.cf p{margin:0;color:var(--ink2);font-size:13.5px;line-height:1.5}
.cf-who{display:flex;align-items:center;gap:10px;margin-top:14px;padding:10px 12px;border-radius:12px;background:var(--raise)}.cf-who b{font-size:13.5px}.cf-who small{display:block;color:var(--ink3);font-size:12px}
.cf .foot{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}
.btn{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 13px;font-size:12.5px;color:var(--ink);white-space:nowrap}
.btn:hover{background:var(--raise)}.btn.pri{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.btn.bad{color:var(--bad)}.btn:disabled{opacity:.5;cursor:default}
.acts{display:flex;gap:6px;justify-content:flex-end}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:600;background:var(--raise);color:var(--ink2)}
.pill.hid{background:var(--bad);color:var(--surface)}.pill.rep{background:var(--s4);color:#111}
td small{display:block;color:var(--ink3);font-size:11.5px}
tr.rep-row td{background:var(--raise)}
.pager{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:10px;color:var(--ink3);font-size:12.5px}
dialog{border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--ink);padding:22px;width:min(560px,calc(100vw - 32px));box-shadow:0 20px 50px rgba(0,0,0,.25)}
dialog::backdrop{background:rgba(15,15,14,.45)}
.cm-f{display:grid;gap:12px;margin-top:14px}.cm-f label{display:grid;gap:5px;font-size:13px;color:var(--ink2)}
.mp-wrap{position:relative;display:grid;gap:5px;font-size:13px;color:var(--ink2)}
.mp-field{display:flex;align-items:center;justify-content:space-between;gap:8px;font:inherit;font-size:13.5px;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);outline:none;transition:border-color .12s,box-shadow .12s;color:var(--ink);text-align:left;cursor:pointer}
.mp-field:hover{border-color:var(--ink3)}.mp-field svg{width:17px!important;height:17px;flex:none;color:var(--ink3)}.mp-ph{color:var(--ink3)}
.mp{position:absolute;top:calc(100% + 6px);right:0;z-index:5;width:256px;padding:12px;border-radius:14px;border:1px solid var(--line);background:var(--surface);box-shadow:0 12px 32px rgba(0,0,0,.16)}
.mp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.mp-head b{font-size:14px;color:var(--ink)}
.mp-nav{width:30px;height:30px;border-radius:50%;border:0;background:none;color:var(--ink);font-size:20px;line-height:1;cursor:pointer}
.mp-nav:hover:not([disabled]){background:var(--raise)}.mp-nav[disabled]{opacity:.3;cursor:default}
.mp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.mp-grid button{font:inherit;font-size:13px;padding:9px 0;border-radius:9px;border:0;background:none;color:var(--ink);cursor:pointer}
.mp-grid button:hover:not([disabled]){background:var(--raise)}.mp-grid button.now{box-shadow:inset 0 0 0 1px var(--line)}
.mp-grid button.on{background:var(--ink);color:var(--surface);font-weight:600}.mp-grid button[disabled]{color:var(--ink3);opacity:.45;cursor:default}
.mp-foot{display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
.who{display:flex;align-items:center;gap:10px}.bd{flex:none;border-radius:50%;display:block}
.bd-l{display:inline-flex;align-items:center;justify-content:center;background:var(--raise);color:var(--ink2);font-weight:700}
.cm-id{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.cm-id small{color:var(--ink3);font-size:12px}
.cm-f textarea{min-height:190px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
.cm-f label.check{display:flex;gap:8px;align-items:center}.cm-f .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cm-f .foot{display:flex;gap:8px;justify-content:flex-end}

/* Login */
.login{max-width:380px;margin:12vh auto 0;padding:0 16px}
.login .card{padding:28px}
.login .brand{padding:0;margin-bottom:6px}
.login form{display:grid;gap:12px;margin-top:18px}
.login label{display:grid;gap:5px;font-size:13px;color:var(--ink2)}
.login input{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--raise);color:var(--ink)}
.login button{background:var(--ink);color:var(--surface);border:0;border-radius:999px;padding:11px}
.err{color:var(--bad);font-size:13px;min-height:1.2em}
.login label.check{display:flex;gap:8px;align-items:center}.login label.check input{width:16px;height:16px;padding:0}
`;

// Lucide-style 24px stroke icons, inlined (the CSP allows no external images).
const ICONS = {
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  dollar: '<circle cx="12" cy="12" r="9"/><path d="M15 9.2c-.5-1-1.6-1.6-3-1.6-1.8 0-3 .9-3 2.2 0 3.2 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.5 0-2.7-.7-3.1-1.8M12 6v1.6M12 16.6V18"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
const icon = (k) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
const MARK = `<span class="mark">${icon('pulse')}</span>`;

const page = (nonce, body, script) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Pulse HQ</title><style>${CSS}</style>
<script nonce="${nonce}">try{var t=localStorage.getItem('ops-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
</head><body>${body}
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
const LOGIN_HEAD = (sub) => `<div class="brand">${MARK}<span>Pulse HQ<small>CRS Pulse</small></span></div><div class="sub">${sub}</div>`;

// Full login: passphrase + code, with the option to remember this browser for 90 days.
const LOGIN_FULL = `<main class="login"><div class="card">${LOGIN_HEAD('App stats. Private.')}
<form id="f" autocomplete="on"><label>Passphrase<input name="passphrase" type="password" autocomplete="current-password" required autofocus></label>
${CODE_FIELD(false)}<label class="check"><input type="checkbox" name="remember" checked> Remember this device for 90 days (code only next time)</label>
<div class="err" id="e" role="alert"></div><button type="submit">Sign in</button></form></div></main>`;

// Remembered device: the code alone.
const LOGIN_CODE = `<main class="login"><div class="card">${LOGIN_HEAD('This device is remembered. Enter your authenticator code.')}
<form id="f" autocomplete="on">${CODE_FIELD(true)}
<div class="err" id="e" role="alert"></div><button type="submit">Sign in</button></form></div></main>`;

const DASH = `<div class="shell"><aside class="side"><div class="brand">${MARK}<span>Pulse HQ<small>CRS Pulse</small></span></div>
<nav aria-label="Dashboards"><a class="navi" href="#posthog" data-view="posthog">${icon('users')}App usage<small>PostHog</small></a>
<a class="navi" href="#admob" data-view="admob">${icon('dollar')}Revenue<small>AdMob</small></a>
<details class="navgroup" open><summary class="navi">${icon('chat')}Community<span class="nbadge" id="cm-badge" hidden></span><span class="caret" aria-hidden="true">▾</span></summary>
<a class="navi sub" href="#community" data-view="cdash">Dashboard</a>
<a class="navi sub" href="#community-timelines" data-view="community">Timelines<small>D1</small></a></details></nav>
<div class="side-foot"><button class="navi" id="forget" title="Ask for the passphrase again next time on this browser">${icon('key')}<span>Forget this device</span></button>
<button class="navi" id="out">${icon('logout')}<span>Sign out</span></button></div></aside>
<div class="panel"><div class="top"><h1 id="title">App usage</h1>
<div class="seg icons" role="group" aria-label="Theme"><button data-theme-set="dark" aria-label="Dark theme" aria-pressed="false">${icon('moon')}</button><button data-theme-set="light" aria-label="Light theme" aria-pressed="false">${icon('sun')}</button></div></div>
<div class="main"><div class="ovr"><h2>Overview</h2><span class="sub" id="meta">Loading…</span></div><main id="app"><div class="msg">Loading…</div></main></div></div></div>
<div id="tip" role="tooltip"></div>`;

// Icons the client script needs, handed over as data so DASH_JS stays free of markup quirks.
const ICON_JSON = JSON.stringify(Object.fromEntries(Object.keys(ICONS).map((k) => [k, icon(k)])));

// NB: this is a template literal. No backticks and no dollar-brace inside it, and avoid
// backslashes (they're consumed here before the browser ever sees them).
const DASH_JS = `
const ICON=${ICON_JSON};
const $=s=>document.querySelector(s),fmt=n=>Number(n).toLocaleString('en-CA');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f1=n=>n.toFixed(1);
const tip=$('#tip');
document.addEventListener('mousemove',ev=>{const t=ev.target.closest('[data-tip]');if(!t){tip.style.opacity=0;return}
tip.textContent=t.dataset.tip;tip.style.opacity=1;const w=tip.offsetWidth;
tip.style.left=Math.min(innerWidth-w-8,ev.clientX+12)+'px';tip.style.top=(ev.clientY-36)+'px';});
const out=forget=>fetch('/api/ops-logout',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({forget})}).then(()=>location.reload());
$('#out').onclick=()=>out(false);$('#forget').onclick=()=>out(true);

// Theme: follows the system until a choice is made; the choice is remembered per browser.
const mq=matchMedia('(prefers-color-scheme: dark)');
const effTheme=()=>document.documentElement.dataset.theme||(mq.matches?'dark':'light');
function syncTheme(){const t=effTheme();document.querySelectorAll('[data-theme-set]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeSet===t)))}
document.querySelectorAll('[data-theme-set]').forEach(b=>b.onclick=()=>{const t=b.dataset.themeSet;document.documentElement.dataset.theme=t;
try{localStorage.setItem('ops-theme',t)}catch(e){}syncTheme()});
mq.addEventListener('change',syncTheme);syncTheme();

const day=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-CA',{month:'short',day:'numeric',timeZone:'UTC'});
const dayLong=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
const monthLab=k=>new Date(k+'-01T00:00:00Z').toLocaleDateString('en-CA',{month:'short',year:'2-digit',timeZone:'UTC'});
const monthLong=k=>new Date(k+'-01T00:00:00Z').toLocaleDateString('en-CA',{month:'long',year:'numeric',timeZone:'UTC'});

// "↑ 13.8% vs prior 7 days", or a plain note when there is no prior number to compare with.
function delta(cur,prev,o){o=o||{};const vs=o.vs||'vs prior 7 days';
if(!prev)return '<span class="d">'+(o.none||'no prior week')+'</span>';const p=(cur-prev)/prev*100;
const cls=p>0.05?'up':p<-0.05?'down':'',ar=p>0.05?'↑ ':p<-0.05?'↓ ':'';
return '<span class="d"'+(o.prev?' data-tip="'+esc('Prior: '+o.prev)+'"':'')+'><span class="'+cls+'">'+ar+f1(Math.abs(p))+'%</span> '+vs+'</span>'}
const kpi=(ic,l,v,d)=>'<div class="kpi"><div class="l">'+ICON[ic]+esc(l)+'</div><div class="v">'+v+'</div>'+(d||'')+'</div>';
const mini=(l,v,d)=>'<div class="mini"><div class="l">'+esc(l)+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':'')+'</div>';

function ticks(max){const raw=max/4,m=Math.pow(10,Math.floor(Math.log10(raw||1))),s=[1,2,5,10].map(x=>x*m).find(x=>x>=raw)||m;
const top=Math.max(s,Math.ceil(max/s)*s);const out=[];for(let i=0;i*s<=top+1e-9;i++)out.push(i*s);return out}

// Monotone cubic (Fritsch–Carlson): smooth like the reference, but never overshoots below 0.
function mono(P){const n=P.length,r=v=>v.toFixed(1);if(!n)return'';if(n===1)return'M'+r(P[0][0])+','+r(P[0][1]);
const s=[],t=[];for(let i=0;i<n-1;i++)s.push((P[i+1][1]-P[i][1])/(P[i+1][0]-P[i][0]));
t[0]=s[0];t[n-1]=s[n-2];for(let i=1;i<n-1;i++)t[i]=s[i-1]*s[i]<=0?0:(s[i-1]+s[i])/2;
for(let i=0;i<n-1;i++){if(s[i]===0){t[i]=0;t[i+1]=0;continue}const a=t[i]/s[i],b=t[i+1]/s[i],h=a*a+b*b;
if(h>9){const k=3/Math.sqrt(h);t[i]=k*a*s[i];t[i+1]=k*b*s[i]}}
let d='M'+r(P[0][0])+','+r(P[0][1]);for(let i=0;i<n-1;i++){const h=(P[i+1][0]-P[i][0])/3;
d+='C'+r(P[i][0]+h)+','+r(P[i][1]+t[i]*h)+' '+r(P[i+1][0]-h)+','+r(P[i+1][1]-t[i+1]*h)+' '+r(P[i+1][0])+','+r(P[i+1][1])}return d}

// Smooth area chart with pill ranges and a dashed crosshair + value bubble (the hero chart).
// def: {sets:{Days:[{lab,full,v}],...}, cur, money, fv, label}
const charts={};
function areaSvg(id){const c=charts[id],pts=c.sets[c.cur]||[],W=680,H=310,L=c.money?58:44,R=16,T=50,B=30,pw=W-L-R,ph=H-T-B;
if(!pts.length)return '<div class="msg">No data for this range.</div>';
const tk=ticks(Math.max(c.money?0.05:1,...pts.map(p=>p.v))),top=tk[tk.length-1];
const X=i=>pts.length<2?L+pw/2:L+i*pw/(pts.length-1),Y=v=>T+ph-v/top*ph;
const tl=v=>c.money?'$'+v.toFixed(v>=10||v===0?0:2):fmt(+v.toFixed(2));
let g='<defs><linearGradient id="ag-'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--s1);stop-opacity:.2"/><stop offset="1" style="stop-color:var(--s1);stop-opacity:0"/></linearGradient></defs>';
g+=tk.map(v=>'<line class="grid-l" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text class="axis" x="'+(L-10)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+tl(v)+'</text>').join('');
const P=pts.map((p,i)=>[X(i),Y(p.v)]),d=mono(P),every=Math.max(1,Math.ceil(pts.length/6));
if(P.length>1)g+='<path d="'+d+'L'+P[P.length-1][0].toFixed(1)+','+(T+ph)+'L'+P[0][0].toFixed(1)+','+(T+ph)+'Z" fill="url(#ag-'+id+')"/>';
g+='<path d="'+d+'" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
pts.forEach((p,i)=>{if(i%every===0||i===pts.length-1&&pts.length<=12)g+='<text class="axis" x="'+X(i)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(p.lab)+'</text>'});
g+='<g class="guide"><line y1="0" y2="'+(T+ph)+'"/><circle r="6"/></g>';
c.geo={P,W,H,base:T+ph,L,pw};
return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(c.label+', '+c.cur)+'">'+g+'</svg><div class="bub"><small></small><b></b></div>'}
function guideAt(wrap,i){const c=charts[wrap.dataset.chart];if(!c||!c.geo)return;const pts=c.sets[c.cur],G=c.geo,p=G.P[i];if(!p)return;
const gl=wrap.querySelector('.guide'),b=wrap.querySelector('.bub'),fx=p[0]/G.W;
gl.querySelector('line').setAttribute('x1',p[0]);gl.querySelector('line').setAttribute('x2',p[0]);gl.querySelector('line').setAttribute('y1',p[1]);gl.querySelector('line').setAttribute('y2',G.base);
gl.querySelector('circle').setAttribute('cx',p[0]);gl.querySelector('circle').setAttribute('cy',p[1]);
b.style.left=(fx*100)+'%';b.style.top=(p[1]/G.H*100)+'%';b.className='bub'+(fx<.15?' l':fx>.85?' r':'');
b.querySelector('small').textContent=pts[i].full;b.querySelector('b').textContent=c.fv(pts[i].v);}
function restGuide(wrap){const c=charts[wrap.dataset.chart];if(!c)return;const pts=c.sets[c.cur]||[];if(!pts.length)return;
let mx=0;pts.forEach((p,i)=>{if(p.v>pts[mx].v)mx=i});guideAt(wrap,mx)}
document.addEventListener('pointermove',ev=>{const w=ev.target.closest&&ev.target.closest('.area-wrap');if(!w)return;
const c=charts[w.dataset.chart];if(!c||!c.geo)return;const r=w.querySelector('svg').getBoundingClientRect(),G=c.geo;
const x=(ev.clientX-r.left)/r.width*G.W,n=G.P.length;const i=n<2?0:Math.max(0,Math.min(n-1,Math.round((x-G.L)/G.pw*(n-1))));guideAt(w,i)});
document.addEventListener('pointerout',ev=>{const w=ev.target.closest&&ev.target.closest('.area-wrap');if(w&&!w.contains(ev.relatedTarget))restGuide(w)});
function areaCard(id,title,sub,def){charts[id]=def;const keys=Object.keys(def.sets);
const pills='<div class="seg" role="group" aria-label="'+esc(title)+' range">'+keys.map(k=>'<button data-chart="'+id+'" data-k="'+esc(k)+'" aria-pressed="'+(k===def.cur)+'"'+(def.sets[k]&&def.sets[k].length?'':' disabled')+'>'+esc(k)+'</button>').join('')+'</div>';
return '<section class="card"><div class="card-h"><h2>'+esc(title)+'</h2>'+pills+'</div><div class="sub">'+sub+'</div><div class="area-wrap" data-chart="'+id+'">'+areaSvg(id)+'</div></section>'}
document.getElementById('app').addEventListener('click',ev=>{const b=ev.target.closest('button[data-chart]');if(!b||b.disabled)return;
const id=b.dataset.chart,c=charts[id];c.cur=b.dataset.k;
b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
const w=document.querySelector('.area-wrap[data-chart="'+id+'"]');w.innerHTML=areaSvg(id);restGuide(w)});

// Half-ring gauge, segments in fixed series order with round caps and a gap, legend below.
// items: [{key,n}] already sorted; fv formats a value; center/centerSub are HTML.
function gaugeCard(title,sub,items,fv,center,centerSub){const cx=160,cy=160,r=134,sw=16,cap=(sw/2+3)/r*180/Math.PI;
let list=items.filter(i=>i.n>0);if(list.length>5){const rest=list.slice(4);list=list.slice(0,4).concat([{key:'Other',n:rest.reduce((a,i)=>a+i.n,0)}])}
const tot=list.reduce((a,i)=>a+i.n,0),col=j=>list[j].key==='Other'?'var(--ink3)':'var(--s'+(j+1)+')';
const pt=a=>(cx+r*Math.cos(a*Math.PI/180)).toFixed(2)+','+(cy+r*Math.sin(a*Math.PI/180)).toFixed(2);
const arc=(a0,a1)=>'M'+pt(a0)+' A'+r+' '+r+' 0 0 1 '+pt(a1);
let g='';if(!tot)g='<path d="'+arc(180,360)+'" fill="none" stroke="var(--track)" stroke-width="'+sw+'" stroke-linecap="round"/>';
let a=180;list.forEach((it,j)=>{const span=it.n/tot*180;let a0=a+(j?cap:0),a1=a+span-(j<list.length-1?cap:0);
if(a1<=a0){const m=a+span/2;a0=m;a1=m+0.01}
g+='<path d="'+arc(a0,a1)+'" fill="none" stroke="'+col(j)+'" stroke-width="'+sw+'" stroke-linecap="round" data-tip="'+esc(it.key+' · '+fv(it.n)+' · '+f1(it.n/tot*100)+'%')+'"/>';a+=span});
const leg='<ul class="src">'+list.map((it,j)=>'<li><i style="background:'+col(j)+'"></i><span title="'+esc(it.key)+'">'+esc(it.key)+'</span><em>'+(tot?Math.round(it.n/tot*100):0)+'%</em><b>'+fv(it.n)+'</b></li>').join('')+'</ul>';
return '<section class="card"><div class="card-h"><h2>'+esc(title)+'</h2></div><div class="sub">'+sub+'</div><div class="gauge"><svg viewBox="0 0 320 172" role="img" aria-label="'+esc(title)+'">'+g+'</svg><div class="c"><b>'+center+'</b>'+centerSub+'</div></div>'+(list.length?leg:'<div class="msg">Nothing yet this week.</div>')+'</section>'}

// Columns over days (or months via o.lab): one series, or stacked with a 2px surface gap.
function columns(rows,keys,labels,o){o=o||{};const fv=o.fv||fmt,lab=o.lab||day,money=!!o.money,W=o.wide?1000:400,H=o.wide?240:210,L=o.wide?48:36,B=22,T=8,pw=W-L-8,ph=H-B-T;
const tot=rows.map(r=>keys.reduce((a,k)=>a+r[k],0)),tk=ticks(Math.max(money?0.05:1,...tot)),top=tk[tk.length-1],bw=pw/rows.length,every=rows.length<=12?1:7;
const tl=v=>money?'$'+v.toFixed(v>=10?0:2):+v.toFixed(2);
let g=tk.map(v=>{const y=T+ph-v/top*ph;return '<line class="grid-l" x1="'+L+'" x2="'+(W-8)+'" y1="'+y+'" y2="'+y+'"/><text class="axis" x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end">'+tl(v)+'</text>'}).join('');
rows.forEach((r,i)=>{let base=T+ph;const x=L+i*bw+bw*.2,w=bw*.6;
keys.forEach((k,j)=>{const h=r[k]/top*ph;if(h<=0)return;const gap=j>0?2:0;const y=base-h;
g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(0,h-gap).toFixed(1)+'" rx="'+(j===keys.length-1||keys.length===1?3:0)+'" fill="var(--s'+(j+1)+')"/>';base=y;});
g+='<rect x="'+(L+i*bw)+'" y="'+T+'" width="'+bw+'" height="'+ph+'" fill="transparent" data-tip="'+esc(lab(r.d)+' · '+keys.map((k,j)=>labels[j]+' '+fv(r[k])).join(' · '))+'"/>';
if(i%every===0)g+='<text class="axis" x="'+(L+i*bw+bw/2)+'" y="'+(H-6)+'" text-anchor="middle">'+lab(r.d)+'</text>'});
const leg=keys.length>1?'<div class="legend">'+labels.map((l,j)=>'<span><i style="background:var(--s'+(j+1)+')"></i>'+l+'</span>').join('')+'</div>':'';
return leg+'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(labels.join(', '))+'">'+g+'</svg>'}

function hbars(items,limit,unit){const top=items.slice(0,limit),max=Math.max(1,...top.map(i=>i.n));
return '<div class="bars">'+top.map(i=>'<div class="k" title="'+esc(i.key)+'">'+esc(i.key)+'</div><div class="t" data-tip="'+esc(i.key+' · '+fmt(i.n)+' '+unit)+'"><div class="f" style="width:'+(i.n/max*100).toFixed(1)+'%"></div></div><div class="n">'+fmt(i.n)+'</div>').join('')+'</div>'}
const card=(t,s,body,cls)=>'<section class="card'+(cls?' '+cls:'')+'"><h2>'+t+'</h2><div class="sub">'+s+'</div>'+body+'</section>';
const dur=s=>s<60?s+' s':Math.floor(s/60)+' min '+(s%60?s%60+' s':'');

const money=(v,c)=>new Intl.NumberFormat('en-CA',{style:'currency',currency:c||'CAD',minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const pc=v=>(v*100).toFixed(v>0&&v<0.1?1:0)+'%';

function admobSection(a,err,users7){
if(!a)return '<div class="card msg" style="margin-bottom:12px">'+esc(err||'AdMob not connected')+'. Run <code>node scripts/admob-setup.mjs</code> to connect it.</div>';
const m=v=>money(v,a.currency),na='<div class="msg">Not available right now.</div>';
const label=k=>k.replace(/_/g,' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
const tbl=(rows,first,lab,limit,share)=>{const tot=share?rows.reduce((x,r)=>x+r.earnings,0):0;
return '<table><thead><tr><th>'+first+'</th><th class="num">Earnings</th>'+(share?'<th class="num">Share</th>':'')+'<th class="num">Impr.</th><th class="num">eCPM</th><th class="num">Match</th><th class="num">Show</th><th class="num">Clicks</th></tr></thead><tbody>'+
rows.slice(0,limit||99).map(r=>'<tr><td>'+esc(lab(r.key))+'</td><td class="num">'+m(r.earnings)+'</td>'+(share?'<td class="num">'+(tot?pc(r.earnings/tot):'–')+'</td>':'')+'<td class="num">'+fmt(r.impressions)+'</td><td class="num">'+m(r.ecpm)+'</td><td class="num">'+pc(r.matchRate)+'</td><td class="num">'+pc(r.showRate)+'</td><td class="num">'+fmt(r.clicks)+'</td></tr>').join('')+'</tbody></table>'};
const best=a.days.reduce((b,x)=>x.earnings>b.earnings?x:b,a.days[0]);
const daily='<details class="card wide"><summary><h2>Daily detail</h2><span class="sub">Every day of the last 30, newest first</span></summary><table><thead><tr><th>Day</th><th class="num">Earnings</th><th class="num">iOS</th><th class="num">Android</th><th class="num">Requests</th><th class="num">Impr.</th><th class="num">Match</th><th class="num">Show</th><th class="num">eCPM</th><th class="num">Clicks</th></tr></thead><tbody>'+
a.days.slice().reverse().map(x=>'<tr><td>'+day(x.d)+'</td><td class="num">'+m(x.earnings)+'</td><td class="num">'+m(x.ios)+'</td><td class="num">'+m(x.android)+'</td><td class="num">'+fmt(x.requests)+'</td><td class="num">'+fmt(x.impressions)+'</td><td class="num">'+(x.requests?pc(x.matched/x.requests):'–')+'</td><td class="num">'+(x.matched?pc(x.impressions/x.matched):'–')+'</td><td class="num">'+m(x.ecpm)+'</td><td class="num">'+fmt(x.clicks)+'</td></tr>').join('')+'</tbody></table></details>';
const l7=a.last7,p7=a.prev7;
// Revenue growth: daily (30 days), weekly (last four full 7-day blocks), monthly (6 months).
const wk=[];for(let s=a.days.length-28;s<a.days.length;s+=7){const ch=a.days.slice(Math.max(0,s),s+7);if(ch.length)wk.push({lab:day(ch[0].d),full:'Week of '+day(ch[0].d),v:Math.round(ch.reduce((x,y)=>x+y.earnings,0)*100)/100})}
const growth=areaCard('rev','Revenue growth','Estimated earnings · best day '+day(best.d)+' ('+m(best.earnings)+')',{cur:'Days',money:true,fv:m,label:'Earnings',sets:{
Days:a.days.map(x=>({lab:day(x.d),full:dayLong(x.d),v:x.earnings})),Week:wk,
Month:a.months?a.months.map(x=>({lab:monthLab(x.key),full:monthLong(x.key),v:x.earnings})):[]}});
const src=gaugeCard('Revenue by source','By ad format, last 7 days',a.formats.map(f=>({key:label(f.key),n:f.earnings})),m,m(l7.earnings),
'<div class="d" style="margin-top:2px">'+delta(l7.earnings,p7.earnings,{prev:m(p7.earnings)})+'</div>');
return '<div class="kpis">'+kpi('dollar','Earnings, 7 days',m(l7.earnings),delta(l7.earnings,p7.earnings,{prev:m(p7.earnings)}))+
kpi('calendar','This month so far',m(a.monthToDate.earnings),'<span class="d">last month '+m(a.lastMonth.earnings)+'</span>')+
kpi('trend','eCPM, 7 days',m(l7.ecpm),delta(l7.ecpm,p7.ecpm,{prev:m(p7.ecpm)}))+
kpi('target','Match rate, 7 days',pc(l7.matchRate),delta(l7.matchRate,p7.matchRate,{prev:pc(p7.matchRate)}))+'</div>'+
'<div class="grid hero">'+src+growth+'</div>'+
'<div class="minis">'+mini('Today so far',m(a.today.earnings),fmt(a.today.impressions)+' impressions')+
mini('Yesterday',m(a.yesterday.earnings),fmt(a.yesterday.impressions)+' impr. · '+fmt(a.yesterday.clicks)+' clicks')+
mini('Last 30 days',m(a.last30.earnings),fmt(a.last30.impressions)+' impressions')+
mini('Show rate, 7 days',pc(l7.showRate),fmt(l7.impressions)+' of '+fmt(l7.matched)+' filled ads seen')+
mini('Click rate, 7 days',pc(l7.ctr),fmt(l7.clicks)+' clicks')+
mini('Per 100 users',users7?m(l7.earnings/users7*100):'–',users7?fmt(users7)+' active users (PostHog)':'no PostHog users')+'</div>'+
'<div class="grid">'+card('Earnings per day','Last 30 days by platform',columns(a.days,['ios','android'],['iOS','Android'],{fv:m,money:true,wide:true}),'wide')+'</div>'+
'<div class="grid two">'+card('Impressions per day','Last 30 days',columns(a.days,['impressions'],['Impressions']))+
card('eCPM per day','Earnings per 1,000 impressions; small days swing a lot',columns(a.days,['ecpm'],['eCPM'],{fv:m,money:true}))+'</div>'+
'<div class="grid two">'+card('Top countries','Last 30 days',a.countries?tbl(a.countries,'Country',k=>k,10,true):na)+
card('By app','Last 7 days'+(a.other7.earnings?' · other apps on the account earned '+m(a.other7.earnings)+', not counted above':''),tbl(a.apps,'App',k=>k))+'</div>'+
'<div class="grid">'+card('Ad units','Last 30 days',a.adUnits?tbl(a.adUnits,'Ad unit',k=>k,20,true):na,'wide')+'</div>'+
'<div class="grid">'+card('By ad format','Last 7 days',tbl(a.formats,'Format',label),'wide')+'</div>'+
'<div class="grid">'+daily+'</div>';}

function render(d){const s=d.summary,r=d.retention,ss=d.sessions,pct=(a,b)=>b?Math.round(a/b*100)+'%':'–';
const upd='updated '+new Date(d.generatedAt).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'});
const evs='<table><thead><tr><th>Event</th><th class="num">Count</th><th class="num">Users</th></tr></thead><tbody>'+
d.events.map(e=>'<tr><td>'+esc(e.key)+'</td><td class="num">'+fmt(e.n)+'</td><td class="num">'+fmt(e.users)+'</td></tr>').join('')+'</tbody></table>';
const ser=k=>d.daily.map(x=>({lab:day(x.d),full:dayLong(x.d),v:x[k]}));
const growth=areaCard('dau','Daily activity','Last 30 days, UTC days · hover for a day',{cur:'Users',fv:fmt,label:'Daily activity',sets:{Users:ser('users'),Opens:ser('opens'),Installs:ser('installs')}});
const plat=gaugeCard('Users by platform','Last 7 days',d.os.map(o=>({key:o.key,n:o.n})),fmt,fmt(s.users_7),
'<div class="d" style="margin-top:2px">active users · '+fmt(s.users_30)+' in 30 days</div>');
views.posthog={title:'App usage',meta:'PostHog · excludes Apple review and Play pre-launch devices · '+upd,html:'<div class="kpis">'+
kpi('users','Active users, 7 days',fmt(s.users_7),delta(s.users_7,s.users_prev,{prev:fmt(s.users_prev)}))+
kpi('phone','App opens',fmt(s.opens_7),delta(s.opens_7,s.opens_prev,{prev:fmt(s.opens_prev)}))+
kpi('download','Installs',fmt(s.installs_7),delta(s.installs_7,s.installs_prev,{prev:fmt(s.installs_prev)}))+
kpi('activity','Sessions',fmt(s.sessions_7),delta(s.sessions_7,s.sessions_prev,{prev:fmt(s.sessions_prev)}))+'</div>'+
'<div class="grid hero">'+plat+growth+'</div>'+
'<div class="minis">'+mini('Users, 30 days',fmt(s.users_30))+mini('Median session',dur(ss.median_s),fmt(ss.n)+' sessions in 7 days')+
mini('Back in week 1',pct(r.week1,r.cohort),fmt(r.week1)+' of '+fmt(r.cohort)+' installed 8–30 days ago')+
mini('Active after day 7',pct(r.later,r.cohort),fmt(r.later)+' users')+'</div>'+
'<div class="grid">'+card('Installs per day','First launch after install',columns(d.daily,['installs'],['Installs']))+
card('Ads loaded per day','ad_shown fires on load, not on an impression',columns(d.daily,['ads_native','ads_app_open'],['Native','App open']))+
card('Milestones added per day','The action most tied to coming back',columns(d.daily,['milestones'],['Milestones']))+
card('Pushes opened per day','Taps on any push; spikes follow a new-draw push',columns(d.daily,['push_opened'],['Push opens']))+'</div>'+
'<h2 class="sec">Engagement</h2><div class="sub sec-sub">PostHog, last 7 days.</div>'+
'<div class="grid">'+card('Screens','Users who viewed each screen, 7 days',hbars(d.screen,12,'users'))+
card('Custom events','7 days',evs)+'</div>'+
'<div class="grid">'+card('Countries','Users, 7 days',hbars(d.country,10,'users'))+
card('App version','Version each user was last seen on',hbars(d.version,6,'users'))+
card('Days active in the week','How many of the last 7 days each user opened the app',hbars(d.daysActive.map(x=>({key:x.key+(x.key==='1'?' day':' days'),n:x.n})),7,'users'))+'</div>'};
views.admob={title:'Revenue',meta:'AdMob · CRS Pulse apps only · estimated'+(d.admob?' · '+d.admob.currency+' · days in '+d.admob.timeZone:'')+' · '+upd,html:admobSection(d.admob,d.admobError,s.users_7)};
show();}
const views={};let statsErr='';
const current=()=>({'#admob':'admob','#community':'cdash','#community-timelines':'community'})[location.hash]||'posthog';
function show(){const k=current(),v=views[k];
document.querySelectorAll('.side nav a').forEach(a=>a.dataset.view===k?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
// Community has its own data and controls (COMMUNITY_JS); mount it once, so a stats refresh doesn't wipe an edit.
if(k==='community'){$('#title').textContent='Community · Timelines';document.title='Timelines · Pulse HQ';if(!document.getElementById('cm'))setTimeout(cmMount);return}
if(k==='cdash'){$('#title').textContent='Community';document.title='Community · Pulse HQ';if(!document.getElementById('cd'))setTimeout(cdMount);return}
$('#title').textContent=v?v.title:({admob:'Revenue'})[k]||'App usage';document.title=(v?v.title:'Pulse HQ')+' · Pulse HQ';
if(!v){$('#meta').textContent='';$('#app').innerHTML='<div class="msg">'+esc(statsErr||'Loading…')+'</div>';return}
if(v){$('#meta').textContent=v.meta;$('#app').innerHTML=v.html;
// The cached view HTML holds the default range; redraw from the chart's current one.
document.querySelectorAll('.area-wrap').forEach(w=>{const id=w.dataset.chart;w.innerHTML=areaSvg(id);
document.querySelectorAll('button[data-chart="'+id+'"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===charts[id].cur)));restGuide(w)})}}
addEventListener('hashchange',()=>{show();scrollTo(0,0)});show();

fetch('/api/ops-stats',{credentials:'same-origin'}).then(async r=>{if(r.status===401){location.reload();return}
if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||r.status);render(await r.json())})
.catch(e=>{statsErr='Could not load stats: '+e.message;show()});`;

// NB: same rules as DASH_JS (it's appended to it): no backticks, no dollar-brace, no backslashes.
// Functions and var only, so show() can call cmMount before this part has run.
const COMMUNITY_JS = `
// ---- Community dashboard: counts, breakdowns, most-reported (via /api/ops-community?stats=1) ----
var CD_STAGE={none:'No steps',ita:'ITA',aor:'AOR',bio:'Biometrics',medical:'Medical',ppr:'Passport',decision:'Decision'};
var CD_REASON={spam:'Spam or advertising',offensive:'Offensive name',misleading:'Fake or misleading',other:'Something else'};
function cdMount(){$('#meta').textContent='Cloudflare D1 · live';$('#app').innerHTML='<div id="cd"><div class="msg">Loading…</div></div>';
cmApi('GET','stats=1').then(cdRender).catch(function(e){var el=document.getElementById('cd');if(el)el.innerHTML='<div class="msg">Could not load Community stats: '+esc(e.message)+'</div>'})}
function cdRender(d){var el=document.getElementById('cd');if(!el)return;
var pct=function(a,b){return b?Math.round(a/b*100)+'%':'–'};
var none='<div class="msg">Nothing yet.</div>';
var bars=function(list,map){return list.length?hbars(list.map(function(x){return {key:map?(map[x.key]||x.key):String(x.key).toUpperCase(),n:x.n}}),8,'timelines'):none};
var review=d.review.length?'<table><thead><tr><th>Name</th><th>Program</th><th class="num">Reports</th><th>Status</th><th></th></tr></thead><tbody>'+
d.review.map(function(t){return '<tr><td><div class="who">'+buddySvg(t.avatar,t.alias||'Anonymous',28)+'<div><b>'+esc(t.alias||'Anonymous')+'</b><small>'+esc(t.id.slice(0,8))+'</small></div></div></td><td>'+esc(t.program.toUpperCase())+'</td><td class="num">'+t.reports+'</td><td>'+
(t.hidden?'<span class="pill hid">Hidden</span>':'<span class="pill">Visible</span>')+'</td><td><div class="acts"><button class="btn" data-cd-open="'+esc(t.id)+'">Open</button></div></td></tr>'}).join('')+'</tbody></table>'
:'<div class="msg">No reports. Nothing to review.</div>';
el.innerHTML='<div class="kpis">'+kpi('chat','Shared timelines',fmt(d.total),'<span class="d">'+fmt(d.active7)+' updated in the last 7 days</span>')+
kpi('users','Visible in the app',fmt(d.visible),'<span class="d">'+pct(d.visible,d.total)+' of all</span>')+
kpi('key','Hidden',fmt(d.hidden),'<span class="d">by reports or by you</span>')+
kpi('target','Reported',fmt(d.reported),'<span class="d">'+fmt(d.reports7)+' new reports in 7 days</span>')+'</div>'+
'<div class="grid">'+card('Needs review','Most-reported timelines first · 3 reports hide one automatically',review,'wide')+'</div>'+
'<div class="grid">'+card('By program','All shared timelines',bars(d.byProgram))+
card('By stage','Furthest step reached',bars(d.byStage,CD_STAGE))+
card('Report reasons',fmt(d.reportsTotal)+' reports in total',d.byReason.length?hbars(d.byReason.map(function(x){return {key:CD_REASON[x.key]||x.key,n:x.n}}),4,'reports'):none)+'</div>'+
'<div style="margin-top:12px"><a class="btn pri" href="#community-timelines" style="text-decoration:none;display:inline-block">Manage timelines</a></div>';
el.addEventListener('click',function(ev){var b=ev.target.closest('[data-cd-open]');if(!b)return;
CM.q=b.dataset.cdOpen;CM.status='all';CM.offset=0;CM.f={program:'',aor:'',stage:'',sort:''};var old=document.getElementById('cm');if(old)old.remove();location.hash='#community-timelines'})}

// ---- Community: list, create, edit, hide, delete, reports (via /api/ops-community) ----
// Buddy avatars: an SVG copy of mobile/src/features/community/components/BuddyAvatar.tsx. Keep the part lists in step.
var BD_INK='#1F2937',BD_COLORS=['#F97316','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#EF4444','#14B8A6','#0EA5E9','#84CC16'];
var BD_EYES=[
'<circle cx="25" cy="36" r="2.6" fill="I"/><circle cx="39" cy="36" r="2.6" fill="I"/>',
'<g stroke="I" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M22 37 Q25 33 28 37"/><path d="M36 37 Q39 33 42 37"/></g>',
'<circle cx="25" cy="35" r="4.5" fill="#FFFFFF"/><circle cx="39" cy="35" r="4.5" fill="#FFFFFF"/><circle cx="26" cy="36" r="2.2" fill="I"/><circle cx="40" cy="36" r="2.2" fill="I"/>',
'<g stroke="I" stroke-width="2.2" stroke-linecap="round"><path d="M22 36 L28 36"/><path d="M36 36 L42 36"/></g>',
'<g fill="I"><rect x="19" y="32" width="11" height="7" rx="3"/><rect x="34" y="32" width="11" height="7" rx="3"/><path d="M30 34.5 L34 34.5" stroke="I" stroke-width="1.6"/></g>',
'<circle cx="25" cy="36" r="2.6" fill="I"/><path d="M36 37 Q39 33 42 37" stroke="I" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
'<circle cx="25" cy="36" r="2.2" fill="I"/><circle cx="39" cy="36" r="2.2" fill="I"/><g stroke="I" stroke-width="1.6" fill="none"><circle cx="25" cy="36" r="5"/><circle cx="39" cy="36" r="5"/><path d="M30 36 L34 36"/></g>',
'<circle cx="25" cy="37" r="2.4" fill="I"/><circle cx="39" cy="37" r="2.4" fill="I"/><g stroke="I" stroke-width="2" stroke-linecap="round"><path d="M21 31 L28 33"/><path d="M43 31 L36 33"/></g>'];
var BD_MOUTHS=[
'<path d="M27 44 Q32 49 37 44" stroke="I" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
'<path d="M26 43 Q32 52 38 43 Z" fill="I"/>',
'<circle cx="32" cy="46" r="2.4" fill="I"/>',
'<path d="M28 46 L36 46" stroke="I" stroke-width="2.2" stroke-linecap="round"/>',
'<path d="M29.5 46 Q32 52 34.5 46 Z" fill="#F43F5E"/><path d="M27 44 Q32 48 37 44" stroke="I" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
'<path d="M26 45 Q29 48 32 45 Q35 48 38 45" stroke="I" stroke-width="2" fill="none" stroke-linecap="round"/>'];
var BD_EXTRAS=['',
'<g fill="#F472B6" opacity="0.55"><circle cx="20" cy="43" r="3"/><circle cx="44" cy="43" r="3"/></g>',
'<path d="M26 41 Q29 38.5 32 40.5 Q35 38.5 38 41 Q35 43 32 42 Q29 43 26 41 Z" fill="I"/>',
'<g fill="#92400E" opacity="0.6"><circle cx="19" cy="42" r="0.9"/><circle cx="22" cy="44" r="0.9"/><circle cx="18.5" cy="45" r="0.9"/><circle cx="45" cy="42" r="0.9"/><circle cx="42" cy="44" r="0.9"/><circle cx="45.5" cy="45" r="0.9"/></g>'];
var BD_HATS=['',
'<path d="M14 30 Q32 6 50 30 Z" fill="#DC2626"/><rect x="13" y="26" width="38" height="6" rx="3" fill="#FFFFFF"/><circle cx="32" cy="10" r="4" fill="#FFFFFF"/>',
'<g fill="I"><path d="M14 30 Q32 10 50 30 Z"/><rect x="30" y="26" width="24" height="4" rx="2"/></g>',
'<path d="M14 38 Q14 15 32 15 Q50 15 50 38" stroke="I" stroke-width="3.5" fill="none"/><rect x="9" y="33" width="8" height="12" rx="3" fill="I"/><rect x="47" y="33" width="8" height="12" rx="3" fill="I"/>',
'<path d="M32 20 L32 11" stroke="C" stroke-width="2.5" stroke-linecap="round"/><path d="M32 12 Q24 4 21 11 Q27 15 32 12 Z" fill="#16A34A"/><path d="M32 12 Q40 4 43 11 Q37 15 32 12 Z" fill="#22C55E"/>',
'<path d="M19 25 L19 13 L25.5 19 L32 9 L38.5 19 L45 13 L45 25 Z" fill="#FACC15"/><circle cx="32" cy="20" r="1.8" fill="#EF4444"/>',
'<path d="M22 22 L22 27 Q32 31 42 27 L42 22 Z" fill="I"/><path d="M10 19 L32 10 L54 19 L32 28 Z" fill="I"/><path d="M51 20 L51 30" stroke="#FACC15" stroke-width="1.6"/><circle cx="51" cy="31" r="1.8" fill="#FACC15"/>',
'<path d="M44 19 L36 13 L36 25 Z" fill="#DB2777"/><path d="M44 19 L52 13 L52 25 Z" fill="#DB2777"/><circle cx="44" cy="19" r="2.6" fill="#9D174D"/>',
'<path d="M32 5 L23 22 L41 22 Z" fill="#6366F1"/><path d="M27.5 13.5 L36.5 13.5 M25.5 18 L38.5 18" stroke="#FACC15" stroke-width="1.6"/><circle cx="32" cy="5" r="3" fill="#FACC15"/>',
'<ellipse cx="32" cy="11" rx="12" ry="3.5" stroke="#FACC15" stroke-width="2.6" fill="none"/>'];
/** The avatar as an SVG string, or a letter disc when the id isn't a buddy (no avatar = the app shows the initial). */
function buddySvg(id,alias,size){var m=/^b(\\d)(\\d)(\\d)(\\d)(\\d)?$/.exec(id||''),p=m&&m.slice(1).map(function(d){return d===undefined?0:+d});
if(!p||p[0]>9||p[1]>7||p[2]>5||p[3]>9||p[4]>3){var ch=((alias||'').trim()[0]||'?').toUpperCase();
return '<span class="bd bd-l" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*.42)+'px">'+esc(ch)+'</span>'}
var c=BD_COLORS[p[0]],fill=function(x){return x.replace(/"I"/g,'"'+BD_INK+'"').replace(/"C"/g,'"'+c+'"')};
return '<svg class="bd" width="'+size+'" height="'+size+'" style="width:'+size+'px;height:'+size+'px" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="'+c+'2E"/><circle cx="32" cy="38" r="19" fill="'+c+'"/>'+
'<g transform="translate(0 2)">'+fill(BD_EYES[p[1]]+BD_MOUTHS[p[2]]+BD_EXTRAS[p[4]])+'</g>'+fill(BD_HATS[p[3]])+'</svg>'}
var CM={q:'',status:'all',offset:0,data:null,editing:null,timer:0,f:{program:'',aor:'',stage:'',sort:''}};
// The app's feed filters. Stage values are the worker's STOPS; labels match CM_STAGES.
var CM_PROGRAM_LABELS={cec:'CEC',fsw:'FSW',fst:'FST',pnp_ee:'PNP (Express Entry)',pnp:'PNP (base)',aip:'AIP',other:'Other'};
var CM_STOPS=['ita','aor','bio','medical','ppr','decision'];
var CM_SORTS=[['','Recently updated'],['longest','Longest waiting'],['furthest','Furthest along']];
var CM_STAGES=['ITA','AOR','Biometrics','Medical','Passport','Decision'];
var CM_PROGRAMS=['cec','fsw','fst','pnp_ee','pnp','aip','other'];
function cmApi(method,qs,body){
return fetch('/api/ops-community'+(qs?'?'+qs:''),{method:method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
.then(function(r){if(r.status===401){location.reload();throw new Error('Signed out')}if(r.status===204)return null;
return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw new Error(cmMsg(j.error||j.message||('HTTP '+r.status)));return j})})
.then(function(j){if(method!=='GET')cmBadge();return j})}
// Sidebar count of timelines with open reports (replaces the per-report email). Refreshes every 5 minutes and after each write.
function cmBadge(){cmApi('GET','stats=1').then(function(d){var b=document.getElementById('cm-badge');if(!b)return;var n=(d&&d.reported)||0;
b.hidden=!n;b.textContent=n>99?'99+':String(n);b.title=n+' reported timeline'+(n===1?'':'s')+' to review';b.setAttribute('aria-label',b.title)}).catch(function(){})}
cmBadge();setInterval(cmBadge,300000);
function cmMsg(m){return m==='alias not allowed'?'That display name is blocked by the name filter (offensive words, links, contact details, IRCC/official names).':m}
function cmErr(m){document.getElementById('cm-err').textContent=m||''}
function cmDate(ms){return new Date(ms).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})}
function cmMount(){
$('#meta').textContent='Shared timelines in Cloudflare D1 · changes show in the app straight away';
$('#app').innerHTML='<div id="cm"><div class="cm-bar"><input id="cm-q" type="search" placeholder="Search by name or id" aria-label="Search">'+
'<select id="cm-s" aria-label="Status"><option value="all">All</option><option value="visible">Visible</option><option value="hidden">Hidden</option><option value="reported">Reported</option></select>'+
'<button class="btn pri" data-act="new">New timeline</button></div>'+
'<div class="cm-bar cm-filters" id="cm-filters">'+
'<select data-f="program" aria-label="Program"><option value="">All programs</option>'+CM_PROGRAMS.map(function(p){return '<option value="'+p+'">'+CM_PROGRAM_LABELS[p]+'</option>'}).join('')+'</select>'+
'<select data-f="aor" aria-label="AOR month"><option value="">Any AOR month</option></select>'+
'<select data-f="stage" aria-label="Stage"><option value="">Any stage</option>'+CM_STOPS.map(function(v,i){return '<option value="'+v+'">'+CM_STAGES[i]+'</option>'}).join('')+'</select>'+
'<select data-f="sort" aria-label="Sort">'+CM_SORTS.map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>'}).join('')+'</select>'+
'<button class="btn" data-act="clearf" id="cm-clearf" hidden>Clear filters</button></div>'+
'<div id="cm-err" class="err" role="alert"></div>'+
'<section class="card" id="cm-list"><div class="msg">Loading…</div></section></div>'+
'<dialog id="cm-dlg" aria-labelledby="cm-dt"><h2 id="cm-dt">Edit timeline</h2><form class="cm-f" id="cm-form">'+
'<div class="row2"><label>Display name<input name="alias" maxlength="30" placeholder="Generated if empty"></label>'+
'<label>Avatar id<input name="avatar" placeholder="e.g. b32014"></label></div>'+
'<div class="cm-id"><span id="cm-av"></span><button type="button" class="btn" data-act="random">Generate again</button><small>New random name and avatar. You can still type your own.</small></div>'+
'<div class="row2"><label>Program<select name="program">'+CM_PROGRAMS.map(function(p){return '<option value="'+p+'">'+CM_PROGRAM_LABELS[p]+'</option>'}).join('')+'</select></label>'+
'<div class="mp-wrap"><span class="mp-lab" id="mp-lab">AOR month</span><input type="hidden" name="aorMonth">'+
'<button type="button" class="mp-field" id="mp-btn" aria-haspopup="dialog" aria-expanded="false" aria-labelledby="mp-lab mp-btn"><span id="mp-val"></span>'+
'<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>'+
'<div class="mp" id="mp" role="dialog" aria-label="Choose AOR month" hidden></div></div></div>'+
'<label>Steps (JSON: type, day, optional month)<textarea name="steps" spellcheck="false"></textarea></label>'+
'<label class="check" id="cm-hid-l"><input type="checkbox" name="hidden"> Hidden (not shown in the app)</label>'+
'<div class="err" id="cm-ferr" role="alert"></div><div class="foot"><button type="button" class="btn" data-act="close">Cancel</button><button type="submit" class="btn pri">Save</button></div></form></dialog>'+
'<dialog id="cm-cf" class="cf" aria-labelledby="cf-t" aria-describedby="cf-b"><div class="cf-top"><span class="cf-icon"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5 2.8 16h14.4L10 3.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8.5v3.4M10 14.2v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>'+
'<div><h2 id="cf-t"></h2><p id="cf-b"></p></div></div><div id="cf-who"></div>'+
'<div class="foot"><button type="button" class="btn" data-cf="no">Cancel</button><button type="button" class="btn danger" data-cf="yes" id="cf-ok"></button></div></dialog>';
var q=document.getElementById('cm-q'),st=document.getElementById('cm-s');q.value=CM.q;st.value=CM.status;
q.addEventListener('input',function(){clearTimeout(CM.timer);CM.timer=setTimeout(function(){CM.q=q.value.trim();CM.offset=0;cmLoad()},250)});
st.addEventListener('change',function(){CM.status=st.value;CM.offset=0;cmLoad()});
var fb=document.getElementById('cm-filters');fb.querySelectorAll('select').forEach(function(s){s.value=CM.f[s.dataset.f]});
fb.addEventListener('change',function(ev){var k=ev.target.dataset.f;if(!k)return;CM.f[k]=ev.target.value;CM.offset=0;cmLoad()});
csEnhance(document.getElementById('app'));
document.getElementById('cm').addEventListener('click',cmClick);
document.getElementById('cm-dlg').addEventListener('click',function(ev){if(ev.target.closest('[data-act="close"]'))document.getElementById('cm-dlg').close();if(ev.target.closest('[data-act="random"]'))cmRandom()});
document.getElementById('cm-form').addEventListener('submit',cmSave);
mpInit();
document.getElementById('cm-form').addEventListener('input',function(ev){if(ev.target.name==='alias'||ev.target.name==='avatar')cmPreview()});
cmLoad()}
function cmFiltered(){return !!(CM.f.program||CM.f.aor||CM.f.stage)}
// AOR options come from the list response; the current choice stays even when nothing matches it any more.
function cmAorOptions(months){var sel=document.querySelector('#cm-filters [data-f="aor"]');if(!sel)return;var cur=CM.f.aor,ms=months.slice();
if(cur&&cur!=='none'&&ms.indexOf(cur)<0)ms.unshift(cur);
sel.innerHTML='<option value="">Any AOR month</option>'+ms.map(function(m){var p=m.split('-');return '<option value="'+m+'">'+MP_NAMES[+p[1]-1]+' '+p[0]+'</option>'}).join('')+'<option value="none">No AOR month</option>';sel.value=cur;csSync(sel);
document.getElementById('cm-clearf').hidden=!cmFiltered()}
function cmLoad(){cmErr('');var qs=new URLSearchParams({status:CM.status,offset:String(CM.offset)});if(CM.q)qs.set('q',CM.q);
Object.keys(CM.f).forEach(function(k){if(CM.f[k])qs.set(k,CM.f[k])});
return cmApi('GET',qs.toString()).then(function(d){CM.data=d;cmAorOptions(d.aorMonths||[]);cmRender()}).catch(function(e){cmErr('Could not load: '+e.message)})}
function cmRender(){var d=CM.data,el=document.getElementById('cm-list');if(!el)return;
if(!d.items.length){el.innerHTML='<div class="msg">'+(CM.q||CM.status!=='all'||cmFiltered()?'Nothing matches.':'No one has shared a timeline yet.')+'</div>';return}
var rows=d.items.map(function(t){var last=t.steps[t.steps.length-1];
return '<tr data-id="'+t.id+'"><td><div class="who">'+buddySvg(t.avatar,t.alias||'Anonymous',32)+'<div><b>'+esc(t.alias||'Anonymous')+'</b><small>'+esc(t.id.slice(0,8))+(t.avatar?' · '+esc(t.avatar):'')+'</small></div></div></td>'+
'<td>'+esc(t.program.toUpperCase())+'</td><td>'+esc(t.aorMonth||'–')+'</td>'+
'<td>'+esc(CM_STAGES[t.stage]||'–')+'<small>'+esc(last?last.type:'')+' · day '+t.lastDay+'</small></td>'+
'<td>'+cmDate(t.updatedAt)+'</td>'+
'<td class="num">'+(t.reports?'<button class="btn" data-act="reports">'+t.reports+'</button>':'0')+'</td>'+
'<td>'+(t.hidden?'<span class="pill hid">Hidden</span>':'<span class="pill">Visible</span>')+'</td>'+
'<td><div class="acts"><button class="btn" data-act="edit">Edit</button>'+
'<button class="btn" data-act="'+(t.hidden?'unhide':'hide')+'">'+(t.hidden?'Unhide':'Hide')+'</button>'+
'<button class="btn bad" data-act="del">Delete</button></div></td></tr>'}).join('');
var end=Math.min(d.offset+d.items.length,d.total);
el.innerHTML='<table><thead><tr><th>Name</th><th>Program</th><th>AOR</th><th>Stage</th><th>Updated</th><th class="num">Reports</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>'+
'<div class="pager">'+(d.offset+1)+'–'+end+' of '+fmt(d.total)+'<button class="btn" data-act="prev"'+(d.offset?'':' disabled')+'>Previous</button><button class="btn" data-act="next"'+(end<d.total?'':' disabled')+'>Next</button></div>'}
function cmFind(id){return CM.data&&CM.data.items.find(function(t){return t.id===id})}
function cmClick(ev){var b=ev.target.closest('button[data-act]');if(!b||b.disabled)return;var act=b.dataset.act,tr=b.closest('tr'),id=tr&&tr.dataset.id,t=id&&cmFind(id);
if(act==='new')return cmOpen(null);
if(act==='clearf'){CM.f={program:'',aor:'',stage:'',sort:CM.f.sort};CM.offset=0;document.querySelectorAll('#cm-filters select').forEach(function(s){s.value=CM.f[s.dataset.f];csSync(s)});return cmLoad()}
if(act==='prev'){CM.offset=Math.max(0,CM.offset-CM.data.pageSize);return cmLoad()}
if(act==='next'){CM.offset+=CM.data.pageSize;return cmLoad()}
if(act==='edit')return cmOpen(t);
if(act==='hide'||act==='unhide'){b.disabled=true;return cmApi('PATCH','id='+id,{hidden:act==='hide'}).then(cmLoad).catch(function(e){cmErr(e.message);b.disabled=false})}
if(act==='del')return cmConfirm({title:'Delete this timeline?',body:'It disappears from the app. If someone shared it, they will see it as no longer shared. This cannot be undone.',ok:'Delete timeline',who:t})
.then(function(yes){if(!yes)return;b.disabled=true;return cmApi('DELETE','id='+id).then(cmLoad).catch(function(e){cmErr(e.message);b.disabled=false})});
if(act==='reports'){var nx=tr.nextElementSibling;if(nx&&nx.classList.contains('rep-row')){nx.remove();return}
return cmApi('GET','id='+id+'&reports=1').then(function(list){var r=document.createElement('tr');r.className='rep-row';
r.innerHTML='<td colspan="8"><b>Reports</b> '+list.map(function(x){return '<span class="pill rep">'+esc(x.reason)+'</span> <small style="display:inline">'+cmDate(x.createdAt)+'</small>'}).join(' · ')+
' <span class="acts" style="display:inline-flex;margin-left:12px"><button class="btn" data-act="dismiss" data-for="'+id+'">Dismiss reports</button></span></td>';tr.after(r)}).catch(function(e){cmErr(e.message)})}
if(act==='dismiss'){var fid=b.dataset.for;return cmConfirm({title:'Dismiss these reports?',body:'The reports are cleared. This does not un-hide the timeline.',ok:'Dismiss reports',who:cmFind(fid)})
.then(function(yes){if(!yes)return;b.disabled=true;return cmApi('DELETE','id='+fid+'&reports=1').then(cmLoad).catch(function(e){cmErr(e.message);b.disabled=false})})}}
function cmOpen(t){CM.editing=t;var f=document.getElementById('cm-form');document.getElementById('cm-ferr').textContent='';
document.getElementById('cm-dt').textContent=t?'Edit '+(t.alias||'Anonymous'):'New timeline';
f.alias.value=t?t.alias:'';f.avatar.value=t&&t.avatar?t.avatar:'';f.program.value=t?t.program:'cec';f.aorMonth.value=t&&t.aorMonth?t.aorMonth:'';
f.steps.value=JSON.stringify(t?t.steps:[{type:'ITA',day:0},{type:'AOR Received',day:30}],null,1);
f.hidden.checked=!!(t&&t.hidden);cmPreview();csSync(f.program);mpSet(f.aorMonth.value);document.getElementById('cm-hid-l').style.display=t?'':'none';
document.getElementById('cm-dlg').showModal();if(!t)cmRandom()}
// AOR month picker: a year with arrows over a 4×3 month grid. Future months are off (the worker rejects them).
var MP_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],MP={year:0};
function mpNow(){var d=new Date();return d.getFullYear()*12+d.getMonth()}
function mpSet(v){var f=document.getElementById('cm-form');f.aorMonth.value=v||'';var m=/^(\\d{4})-(\\d{2})$/.exec(v||'');
var el=document.getElementById('mp-val');el.textContent=m?MP_NAMES[+m[2]-1]+' '+m[1]:'No AOR month';el.className=m?'':'mp-ph'}
function mpRender(){var box=document.getElementById('mp'),cur=document.getElementById('cm-form').aorMonth.value,now=mpNow(),y=MP.year;
box.innerHTML='<div class="mp-head"><button type="button" class="mp-nav" data-mp="prev" aria-label="Previous year"'+(y<=2015?' disabled':'')+'>‹</button><b>'+y+'</b>'+
'<button type="button" class="mp-nav" data-mp="next" aria-label="Next year"'+(y*12>=now-11?' disabled':'')+'>›</button></div><div class="mp-grid">'+
MP_NAMES.map(function(n,i){var v=y+'-'+(i<9?'0':'')+(i+1),off=y*12+i>now;
return '<button type="button" data-mp="'+v+'" class="'+(v===cur?'on':'')+(y*12+i===now?' now':'')+'"'+(off?' disabled':'')+'>'+n+'</button>'}).join('')+
'</div><div class="mp-foot"><button type="button" class="btn" data-mp="clear">Clear</button><button type="button" class="btn" data-mp="this">This month</button></div>'}
function mpOpen(open){var box=document.getElementById('mp'),btn=document.getElementById('mp-btn');if(open===undefined)open=box.hidden;
if(open){var m=/^(\\d{4})/.exec(document.getElementById('cm-form').aorMonth.value);MP.year=m?+m[1]:Math.floor(mpNow()/12);mpRender()}
box.hidden=!open;btn.setAttribute('aria-expanded',String(open));if(open)(box.querySelector('.on')||box.querySelector('.mp-grid button:not([disabled])')).focus()}
function mpInit(){var box=document.getElementById('mp');document.getElementById('mp-btn').addEventListener('click',function(){mpOpen()});
box.addEventListener('click',function(ev){var b=ev.target.closest('button[data-mp]');if(!b)return;var a=b.dataset.mp;
if(a==='prev'||a==='next'){MP.year+=a==='prev'?-1:1;mpRender();return}
if(a==='clear')mpSet('');else if(a==='this'){var n=mpNow();mpSet(Math.floor(n/12)+'-'+(n%12<9?'0':'')+(n%12+1))}else mpSet(a);
mpOpen(false);document.getElementById('mp-btn').focus()});
// Escape closes the picker only, not the whole popup.
box.addEventListener('keydown',function(ev){if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();mpOpen(false);document.getElementById('mp-btn').focus()}});
document.getElementById('cm-dlg').addEventListener('click',function(ev){if(!box.hidden&&!ev.target.closest('.mp-wrap'))mpOpen(false)})}
// Confirm popup in the dashboard's style (replaces window.confirm). Resolves true on the red button.
function cmConfirm(o){var d=document.getElementById('cm-cf');document.getElementById('cf-t').textContent=o.title;document.getElementById('cf-b').textContent=o.body;
document.getElementById('cf-ok').textContent=o.ok;var t=o.who;
document.getElementById('cf-who').innerHTML=t?'<div class="cf-who">'+buddySvg(t.avatar,t.alias||'Anonymous',36)+'<div><b>'+esc(t.alias||'Anonymous')+'</b><small>'+esc((CM_PROGRAM_LABELS[t.program]||t.program)+(t.aorMonth?' · AOR '+t.aorMonth:'')+' · '+t.id.slice(0,8))+'</small></div></div>':'';
return new Promise(function(done){function end(v){d.removeEventListener('click',onClick);d.removeEventListener('close',onClose);if(d.open)d.close();done(v)}
function onClick(ev){var b=ev.target.closest('[data-cf]');if(b)end(b.dataset.cf==='yes')}
function onClose(){end(false)}
d.addEventListener('click',onClick);d.addEventListener('close',onClose);d.showModal();d.querySelector('[data-cf="no"]').focus()})}
// Custom selects: a button + listbox drawn over each native <select>, which stays (hidden) as the source of truth.
var CS_CHEV='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function csEnhance(root){root.querySelectorAll('select:not([data-cs])').forEach(function(sel){sel.dataset.cs='1';
var w=document.createElement('div');w.className='cs';sel.parentNode.insertBefore(w,sel);
var b=document.createElement('button');b.type='button';b.className='cs-btn';b.setAttribute('aria-haspopup','listbox');b.setAttribute('aria-expanded','false');
if(sel.getAttribute('aria-label'))b.setAttribute('aria-label',sel.getAttribute('aria-label'));
var l=document.createElement('ul');l.className='cs-list';l.setAttribute('role','listbox');l.hidden=true;
// Button first, so a wrapping <label> activates it.
w.appendChild(b);w.appendChild(sel);w.appendChild(l);sel.tabIndex=-1;
b.addEventListener('click',function(){csOpen(w,l.hidden)});
b.addEventListener('keydown',function(ev){if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();csOpen(w,true)}});
l.addEventListener('click',function(ev){var li=ev.target.closest('li');if(li)csPick(w,li.dataset.v)});
l.addEventListener('keydown',function(ev){var items=[].slice.call(l.children),i=items.indexOf(document.activeElement);
if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();var n=items[Math.max(0,Math.min(items.length-1,i+(ev.key==='ArrowDown'?1:-1)))];if(n)n.focus()}
else if(ev.key==='Home'||ev.key==='End'){ev.preventDefault();items[ev.key==='Home'?0:items.length-1].focus()}
else if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();if(i>=0)csPick(w,items[i].dataset.v)}
// Escape closes the list only, not the popup it sits in.
else if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();csOpen(w,false);b.focus()}
else if(ev.key==='Tab')csOpen(w,false)});
csSync(sel)})}
function csSync(sel){var w=sel&&sel.parentNode;if(!w||!w.classList||!w.classList.contains('cs'))return;var o=sel.options[sel.selectedIndex];
var b=w.querySelector('.cs-btn');b.innerHTML='<span>'+esc(o?o.text:'')+'</span>'+CS_CHEV;
// Screen readers hear the field and its value ("Program: CEC"), as with a native select.
if(sel.getAttribute('aria-label'))b.setAttribute('aria-label',sel.getAttribute('aria-label')+': '+(o?o.text:''))}
function csOpen(w,open){var sel=w.querySelector('select'),b=w.querySelector('.cs-btn'),l=w.querySelector('.cs-list');
if(open){document.querySelectorAll('.cs-list:not([hidden])').forEach(function(x){if(x!==l)csOpen(x.parentNode,false)});
l.innerHTML=[].map.call(sel.options,function(o){return '<li role="option" tabindex="-1" data-v="'+esc(o.value)+'" aria-selected="'+(o.selected?'true':'false')+'">'+esc(o.text)+'</li>'}).join('')}
l.hidden=!open;b.setAttribute('aria-expanded',String(open));
if(open)(l.querySelector('[aria-selected=true]')||l.firstChild).focus()}
function csPick(w,v){var sel=w.querySelector('select');csOpen(w,false);w.querySelector('.cs-btn').focus();if(sel.value===v)return;
sel.value=v;csSync(sel);sel.dispatchEvent(new Event('change',{bubbles:true}))}
document.addEventListener('mousedown',function(ev){document.querySelectorAll('.cs-list:not([hidden])').forEach(function(l){if(!l.parentNode.contains(ev.target))csOpen(l.parentNode,false)})});
function cmPreview(){var f=document.getElementById('cm-form');document.getElementById('cm-av').innerHTML=buddySvg(f.avatar.value.trim(),f.alias.value||'Anonymous',56)}
// Fills the form with a generated name + avatar; "Anonymous" is only for people sharing from the app.
function cmRandom(){var f=document.getElementById('cm-form');cmApi('GET','random=1').then(function(r){f.alias.value=r.alias;f.avatar.value=r.avatar;cmPreview()})
.catch(function(e){document.getElementById('cm-ferr').textContent='Could not generate a name: '+e.message})}
function cmSave(ev){ev.preventDefault();var f=ev.target,fe=document.getElementById('cm-ferr'),sb=f.querySelector('[type=submit]'),steps;
try{steps=JSON.parse(f.steps.value)}catch(e){fe.textContent='Steps are not valid JSON.';return}
var av=f.avatar.value.trim(),aor=f.aorMonth.value.trim(),body={alias:f.alias.value.trim(),program:f.program.value,steps:steps},t=CM.editing;
if(t){body.avatar=av||null;body.aorMonth=aor||null;body.hidden=f.hidden.checked}else{if(av)body.avatar=av;if(aor)body.aorMonth=aor}
sb.disabled=true;fe.textContent='';
(t?cmApi('PATCH','id='+t.id,body):cmApi('POST','',body)).then(function(){document.getElementById('cm-dlg').close();return cmLoad()})
.catch(function(e){fe.textContent=e.message}).then(function(){sb.disabled=false})}
`;

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
  res.status(200).send(authed ? page(nonce, DASH, DASH_JS + COMMUNITY_JS) : page(nonce, login, LOGIN_JS));
}
