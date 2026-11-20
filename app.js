(function(){
'use strict';
/* DTZ-Puls: daily lessons + free practice for the Deutsch-Test für Zuwanderer (A2–B1).
   Fork of the Pulse engine: Supabase auth + RLS progress sync, observer view, review queue.
   UI and explanations in 12 languages; all exam material stays German. */

/* ---------- languages ---------- */
var LANGS=[['ru','Русский'],['uk','Українська'],['en','English'],['tr','Türkçe'],['ar','العربية',1],['ur','اردو',1],['fa','فارسی',1],['hr','Hrvatski'],['sr','Srpski'],['my','မြန်မာ'],['es','Español'],['hi','हिन्दी']];
var I18N=window.DTZ_I18N||{}, LANG='ru';
var FONTS={ar:'Noto+Sans+Arabic:wght@400;600;700',ur:'Noto+Nastaliq+Urdu:wght@400;600',fa:'Vazirmatn:wght@400;600;700',my:'Noto+Sans+Myanmar:wght@400;600;700',hi:'Noto+Sans+Devanagari:wght@400;600;700'};
function t(k,v){var s=(I18N[LANG]&&I18N[LANG][k])||(I18N.en&&I18N.en[k])||(I18N.ru&&I18N.ru[k])||k;
  if(v)s=s.replace(/\{(\w+)\}/g,function(_,n){return v[n]!=null?v[n]:'';});return s;}
function L(x){if(x==null)return '';if(typeof x==='string')return x;return x[LANG]||x.en||x.ru||'';}
function isRtl(l){for(var i=0;i<LANGS.length;i++)if(LANGS[i][0]===l)return !!LANGS[i][2];return false;}
function setLang(l,keep){if(!I18N[l]&&l!=='ru'&&l!=='en')l='en';LANG=l;
  var h=document.documentElement;h.lang=l;h.dir=isRtl(l)?'rtl':'ltr';
  if(FONTS[l]&&!document.getElementById('font-'+l)){var k=document.createElement('link');k.id='font-'+l;k.rel='stylesheet';k.href='https://fonts.googleapis.com/css2?family='+FONTS[l]+'&display=swap';document.head.appendChild(k);}
  h.style.setProperty('--f-local',FONTS[l]?'"'+decodeURIComponent(FONTS[l].split(':')[0]).replace(/\+/g,' ')+'"':'"Golos Text"');
  try{localStorage.setItem('dtz-lang',l);}catch(e){}
  if(!keep&&S){S.lang=l;save();}}

/* ---------- themes + avatars ---------- */
var THEMES=[['auto',''],['flag','Schwarz-Rot-Gold',['#f4f3ee','#151515','#dd0000','#ffce00']],['karo','Karopapier',['#f5f6f2','#1f45a0','#c7342b','#f6dc2a']],['ostsee','Ostsee',['#eef5f7','#0e7490','#d9480f','#f2c14e']],
  ['nacht','Nacht',['#121212','#ffce00','#ff4d4d','#f2f0ea']],['wald','Schwarzwald',['#0f1712','#7bd389','#ff7b5c','#e0c060']],['berlin','Berlin',['#101018','#b69cff','#ff5c8a','#ffd166']]];
var AVATARS=['🦊','🐻','🐼','🦁','🐯','🐸','🐵','🦉','🐧','🐢','🐙','🦄','🐝','🦋','🌻','🌵','🍀','⚽','🎸','🚗','🚲','☕','📚','🚀'];
function applyTheme(th){var r=document.documentElement;if(!th||th==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',th);try{localStorage.setItem('dtz-theme',th||'auto');}catch(e){}}

/* ---------- course ---------- */
var C={weeks:[],bank:{},rules:{},exam:'2026-12-19'}, BANK={}, WK=[], ALL=[], LBY={}, TOTAL=0, KEY='dtz-puls-v1', CKEY='dtz-puls-course-v1', courseErr='';
var SECTIONS=['kasus','satz','hoeren','lesen','wort','sprechen','schreiben'];
function setCourse(c){if(!c||!c.weeks)return false;C=c;BANK={};LBY={};WK=c.weeks;ALL=[];TOTAL=0;
  Object.keys(c.bank||{}).forEach(function(sec){(c.bank[sec]||[]).forEach(function(x){x._k=x.id;x._s=sec;BANK[x.id]=x;});});
  c.weeks.forEach(function(w,wi){w.days.forEach(function(d){d.week=wi;d.idx=ALL.length;ALL.push(d);LBY[d.id]=d;TOTAL++;
    d._tasks=(d.tasks||[]).map(function(id){return BANK[id];}).filter(Boolean);});});
  return true;}
if(window.COURSE)setCourse(window.COURSE);
function rule(id){var r=(C.rules||{})[id];return r?L(r):'';}
function explain(x){var parts=[];(x.r||[]).forEach(function(id){var s=rule(id);if(s)parts.push(s);});if(x.e)parts.push(L(x.e));return parts.join(' · ');}

/* ---------- helpers ---------- */
var $=function(s){return document.querySelector(s);};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function ds(d){var m=d.getMonth()+1,x=d.getDate();return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(x<10?'0':'')+x;}
function today(){return ds(new Date());}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var q=a[i];a[i]=a[j];a[j]=q;}return a;}
function daysLeft(){var e=new Date((C.exam||'2026-12-19')+'T00:00:00'),n=new Date();n.setHours(0,0,0,0);return Math.max(0,Math.round((e-n)/864e5));}
function def(){return {name:'',lang:'',xp:0,done:{},days:{},frozen:{},freezes:0,missed:{},seen:{},prac:{},newDay:'',newN:0,best:0,perfect:0,reviews:0,t:0};}
function fix(o){var d=def();o=o&&typeof o==='object'?JSON.parse(JSON.stringify(o)):{};var r=Object.assign(d,o);
  ['done','days','frozen','missed','seen','prac'].forEach(function(k){if(!r[k]||typeof r[k]!=='object'||Array.isArray(r[k]))r[k]={};});
  r.xp=+r.xp||0;return r;}

/* ---------- state + sync (same model as Pulse: last write wins on client timestamp) ---------- */
var S=def(), SB=null, ME=null, EMAIL='', OWNER=false, syncState='local', pushT=null, pushing=false, again=false, loginErr='', loginBusy=false, loginEm='';
try{var raw=localStorage.getItem(KEY);if(raw)S=fix(JSON.parse(raw));}catch(e){}
var LANGCHOSEN=false;
(function(){var l=S.lang;try{l=l||localStorage.getItem('dtz-lang');}catch(e){}LANGCHOSEN=!!l;
  if(!l)l='en';
  setLang(l,true);
  var th=S.theme;try{th=th||localStorage.getItem('dtz-theme');}catch(e){}applyTheme(th||'auto');})();
function cfgOk(){var c=window.PULS_CONFIG||{};return !!(c.url&&c.anonKey&&c.url.indexOf('YOUR')<0&&window.supabase&&window.supabase.createClient);}
function save(){S.t=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}schedulePush();}
function adopt(c){S=fix(c);if(S.lang&&S.lang!==LANG)setLang(S.lang,true);if(S.theme)applyTheme(S.theme);try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function schedulePush(){if(!SB||!ME)return;clearTimeout(pushT);pushT=setTimeout(push,600);}
function push(){if(!SB||!ME)return;if(pushing){again=true;return;}pushing=true;again=false;
  SB.from('progress').upsert({user_id:ME,state:JSON.parse(JSON.stringify(S)),updated_at:new Date().toISOString()})
  .then(function(r){syncState=r.error?'error':'cloud';},function(){syncState='error';})
  .then(function(){pushing=false;if(again)push();if(view==='progress')render();});}
function pull(){if(!SB||!ME)return;
  SB.from('progress').select('state').eq('user_id',ME).maybeSingle().then(function(r){
    if(r.error){syncState='error';if(view==='progress')render();return;}
    var c=r.data&&r.data.state;
    if(c&&(c.t||0)>(S.t||0)){adopt(c);syncState='cloud';if(view!=='run'&&view!=='result')render();}
    else if(S.t&&(!c||(c.t||0)<S.t))push();
    else{syncState='cloud';if(view==='progress')render();}
  },function(){syncState='error';});}
/* presence: who has the app open right now (Supabase Realtime, no table) */
var PCH=null, ONLINE={};
function presStart(){if(!SB||!ME||PCH||!SB.channel)return;try{
  PCH=SB.channel('dtz-online',{config:{presence:{key:ME}}});
  PCH.on('presence',{event:'sync'},function(){var st=PCH.presenceState()||{},o={};Object.keys(st).forEach(function(k){o[k]=1;});ONLINE=o;presPaint();});
  PCH.subscribe(function(status){if(status==='SUBSCRIBED'&&!document.hidden)PCH.track({at:Date.now()});});}catch(e){PCH=null;}}
function presStop(){if(PCH){try{SB.removeChannel(PCH);}catch(e){}PCH=null;ONLINE={};}}
var BEAT=null;
function beat(){if(!SB||!ME||document.hidden)return;
  SB.from('progress').select('state').eq('user_id',ME).maybeSingle().then(function(r){if(r.error)return;var c=r.data&&r.data.state;
    if(c&&(c.t||0)>(S.t||0))adopt(c);S.lastOn=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}push();},function(){});}
function beatStart(){clearInterval(BEAT);setTimeout(beat,1500);BEAT=setInterval(beat,5*60000);}
function presPaint(){document.querySelectorAll('[data-uid]').forEach(function(el){var on=!!ONLINE[el.dataset.uid];el.classList.toggle('on',on);el.title=on?t('w.online'):'';});document.querySelectorAll('[data-seen]').forEach(function(el){var on=!!ONLINE[el.dataset.seen];el.textContent=on?t('w.now'):t('w.seen',{t:ago(+el.dataset.ts)});el.classList.toggle('onl',on);});}
document.addEventListener('visibilitychange',function(){if(!PCH)return;try{if(document.hidden)PCH.untrack();else PCH.track({at:Date.now()});}catch(e){}});
document.addEventListener('visibilitychange',function(){if(!document.hidden&&ME)beat();});
function onSession(sess){var id=sess&&sess.user?sess.user.id:null;
  if(!id){presStop();ME=null;EMAIL='';OWNER=false;syncState='local';view='login';render();return;}
  if(id===ME&&view!=='boot'&&view!=='login')return;
  ME=id;EMAIL=sess.user.email||'';setTimeout(presStart,0);beatStart();
  if(S.uid&&S.uid!==ME){var l=LANG;S=def();S.lang=l;try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
  S.uid=ME;S.email=EMAIL;if(!S.lang)S.lang=LANG;if(!S.name&&sess.user.user_metadata&&sess.user.user_metadata.name)S.name=String(sess.user.user_metadata.name).slice(0,30);
  SB.from('observers').select('user_id').eq('user_id',ME).maybeSingle().then(function(r){OWNER=!!(r&&r.data);},function(){OWNER=false;})
  .then(loadCourse)
  .then(function(ok){if(!ok){view='nocourse';render();return;}
    syncState='connecting';pull();
    if(view==='login'){view='path';try{history.replaceState(null,'','#path');}catch(e){}}else if(view==='boot'||view==='nocourse')view=fromHash();render();});}
function loadCourse(){
  return SB.from('course_content').select('data').eq('id','dtz').maybeSingle().then(function(r){
    if(!r.error&&r.data&&setCourse(r.data.data)){courseErr='';try{localStorage.setItem(CKEY,JSON.stringify(r.data.data));}catch(e){}return true;}
    courseErr=r.error?t('err.server',{m:r.error.message||''}):t('err.nocontent');
    return fromCache();
  },function(){courseErr=t('err.offline');return fromCache();});}
function fromCache(){try{var c=JSON.parse(localStorage.getItem(CKEY)||'null');if(c&&setCourse(c)){toast(t('toast.cache'));return true;}}catch(e){}return false;}
function initCloud(){if(!cfgOk())return;var c=window.PULS_CONFIG;
  SB=window.supabase.createClient(c.url,c.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  view='boot';render();
  SB.auth.getSession().then(function(r){onSession(r&&r.data&&r.data.session);},function(){onSession(null);});
  SB.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_OUT')onSession(null);});
  document.addEventListener('visibilitychange',function(){if(document.hidden)return;pull();if(OWNER&&view==='watch')loadWatch();});
  window.addEventListener('online',function(){pull();});}
function doLogin(){var em=$('#em').value.trim(),pw=$('#pw').value;loginEm=em;if(!em||!pw){loginErr=t('login.empty');render();return;}
  loginBusy=true;loginErr='';render();
  SB.auth.signInWithPassword({email:em,password:pw}).then(function(r){loginBusy=false;
    if(r.error){loginErr=/invalid/i.test(r.error.message)?t('login.wrong'):t('login.fail',{m:r.error.message});render();return;}
    onSession(r.data.session);},function(){loginBusy=false;loginErr=t('err.offline');render();});}

/* ---------- streak, levels ---------- */
var LEVELS=[0,150,400,800,1300,2000,2800,3800,5000,6500];
function active(k,st){st=st||S;return st.days[k]!==undefined||!!(st.frozen&&st.frozen[k]);}
function streak(st){st=st||S;var d=new Date();if(!active(ds(d),st)){d=addDays(d,-1);if(!active(ds(d),st))return 0;}var n=0;while(active(ds(d),st)){if(st.days[ds(d)]!==undefined)n++;d=addDays(d,-1);}return n;}
function applyFreezes(){var keys=Object.keys(S.days).concat(Object.keys(S.frozen)).sort();if(!keys.length||!S.freezes)return;var last=keys[keys.length-1],gap=[],d=addDays(new Date(),-1);
  while(ds(d)>last&&gap.length<6){gap.push(ds(d));d=addDays(d,-1);}
  if(gap.length&&gap.length<=S.freezes){gap.forEach(function(k){S.frozen[k]=1;});S.freezes-=gap.length;save();}}
function level(st){st=st||S;var i=0;for(var k=0;k<LEVELS.length;k++)if(st.xp>=LEVELS[k])i=k;return {i:i,name:t('lvl.'+i),from:LEVELS[i],to:LEVELS[i+1]||null};}
/* pace: the daily limit grows when the exam is close; optional review days are skipped when behind */
function remaining(st){st=st||S;var n=0;for(var i=0;i<ALL.length;i++)if(!st.done[ALL[i].id])n++;return n;}
function behind(st){return remaining(st)>Math.max(1,daysLeft())*2;}
function capToday(){return Math.min(6,Math.max(2,Math.ceil(remaining()/Math.max(1,daysLeft()))));}
function nextIdx(st){st=st||S;var skip=behind(st),first=-1;for(var i=0;i<ALL.length;i++)if(!st.done[ALL[i].id]){if(first<0)first=i;if(skip&&ALL[i].opt)continue;return i;}return first;}
function newToday(){return S.newDay===today()?S.newN:0;}
function doneCount(st){st=st||S;var n=0;Object.keys(st.done||{}).forEach(function(id){if(LBY[id])n++;});return n;}

/* ---------- speech (browser voice, German) ---------- */
var deVoice=null, sayEl=null, sayStop=false;
function loadVoices(){try{var vs=speechSynthesis.getVoices();deVoice=vs.filter(function(v){return /^de(-|_)DE/i.test(v.lang);})[0]||vs.filter(function(v){return /^de/i.test(v.lang);})[0]||null;}catch(e){}}
try{loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}catch(e){}
function stopSay(){sayStop=true;try{speechSynthesis.cancel();}catch(e){}if(sayEl){sayEl.classList.remove('playing');sayEl=null;}}
function say(el,text,rate){if(sayEl===el){stopSay();return false;}stopSay();sayStop=false;
  try{var u=new SpeechSynthesisUtterance(String(text).replace(/—/g,', '));u.lang='de-DE';if(deVoice)u.voice=deVoice;u.rate=(rate||1)*.95;
    u.onend=u.onerror=function(){if(sayEl===el){el.classList.remove('playing');sayEl=null;}};
    sayEl=el;el.classList.add('playing');speechSynthesis.speak(u);return true;}
  catch(e){toast(t('toast.nospeech'));return false;}}

/* ---------- routing ---------- */
var VIEWS=['path','practice','notes','top','progress','watch'], view='path', R=null, T=null, RES=null, toastT=null, BACK='path';
function fromHash(){var h=(location.hash||'').slice(1);return VIEWS.indexOf(h)>=0?h:'path';}
window.addEventListener('hashchange',function(){if(view==='run'||view==='result')return;stopSay();view=fromHash();render();});
function toast(m){var o=$('.toast');if(o)o.remove();var d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=m;document.body.appendChild(d);clearTimeout(toastT);toastT=setTimeout(function(){d.remove();},3600);}

/* ---------- ECG strip ---------- */
function stripSvg(st){st=st||S;var n=14,w=560/n,y=46,p='M0 '+y,lab='',tt=new Date();
  for(var i=0;i<n;i++){var d=addDays(tt,i-(n-1)),k=ds(d),x=i*w;
    if(st.days[k]!==undefined){var h=Math.min(36,16+(st.days[k]||0)/5);p+=' L'+(x+w*.2)+' '+y+' Q'+(x+w*.28)+' '+(y-6)+' '+(x+w*.36)+' '+y+' L'+(x+w*.44)+' '+(y+5)+' L'+(x+w*.52)+' '+(y-h)+' L'+(x+w*.6)+' '+(y+9)+' L'+(x+w*.66)+' '+y+' Q'+(x+w*.78)+' '+(y-9)+' '+(x+w*.9)+' '+y+' L'+(x+w)+' '+y;}
    else if(st.frozen&&st.frozen[k]){p+=' L'+(x+w*.4)+' '+y+' Q'+(x+w*.5)+' '+(y-5)+' '+(x+w*.6)+' '+y+' L'+(x+w)+' '+y;}
    else p+=' L'+(x+w)+' '+y;
    lab+='<text x="'+(x+w/2)+'" y="70" text-anchor="middle">'+d.getDate()+'</text>';}
  return '<svg class="strip" viewBox="0 0 560 76" preserveAspectRatio="none" role="img" aria-label="'+esc(t('strip.aria'))+'"><line class="today" x1="'+(560-w)+'" y1="4" x2="'+(560-w)+'" y2="60"/><path d="'+p+'"/>'+lab+'</svg>';}

/* ---------- screens ---------- */
var BRAND='<div class="brand"><svg viewBox="0 0 28 16"><path d="M0 9h7l2-3 3 9 3-14 3 8h10"/></svg>DTZ-Puls</div>';
function langSelect(id){return '<label class="sr" for="'+id+'">'+esc(t('set.lang'))+'</label><select class="txt sel'+(id==='lgh'?' lgh':'')+'" id="'+id+'" data-ch="lang" title="Language">'+LANGS.map(function(l){return '<option value="'+l[0]+'"'+(l[0]===LANG?' selected':'')+'>'+(id==='lgh'?l[0].toUpperCase():l[1])+'</option>';}).join('')+'</select>';}
function header(){var nm=(S.name||'').trim().split(/\s+/)[0]||t('tab.progress'),on=view==='progress';
  return '<div class="top hdr"><div class="hl">'+BRAND+'<div class="chips">'+langSelect('lgh')+'<span class="chip num" title="'+esc(t('chip.exam'))+'"><b>⏳</b> '+daysLeft()+'</span><span class="chip num" title="'+esc(t('chip.streak'))+'"><b>♥</b> '+streak()+'</span><span class="chip xp num" title="XP"><b>★</b> '+S.xp+'</span></div></div>'+
  '<button class="mebtn'+(on?' on':'')+'" data-a="tab" data-v="progress" aria-label="'+esc(t('tab.progress'))+'"'+(on?' aria-current="page"':'')+'><span class="meav avc" aria-hidden="true">'+esc(S.avatar||'👤')+'</span><span class="mename" dir="auto">'+esc(nm)+'</span></button></div>';}
function vNoCourse(){var noCfg=!cfgOk();
  return '<div class="top">'+BRAND+'</div><section class="card hero"><h1>'+esc(noCfg?t('nc.cfg.h'):t('nc.h'))+'</h1><p class="small muted" style="margin:0">'+esc(noCfg?t('nc.cfg.p'):courseErr)+'</p>'+(noCfg?'':'<div class="foot"><button class="btn" data-a="retry">'+esc(t('btn.retry'))+'</button>'+(ME?'<button class="btn ghost" data-a="logout">'+esc(t('btn.logout'))+'</button>':'')+'</div>')+'</section>';}
function langGrid(){return '<div class="langs">'+LANGS.map(function(l){return '<button class="lgb'+(l[0]===LANG?' on':'')+'" data-a="pick-lang" data-v="'+l[0]+'" lang="'+l[0]+'" dir="'+(l[2]?'rtl':'ltr')+'">'+l[1]+'</button>';}).join('')+'</div>';}
var LANGHEAD='🌐 Sprache · Language · Язык · Dil · اللغة · زبان · Jezik · Idioma · भाषा';
function vLogin(){if(!LANGCHOSEN)return '<div class="top">'+BRAND+'</div><section class="card hero"><h1 style="font-size:20px">'+LANGHEAD+'</h1>'+langGrid()+'</section>';return '<div class="top">'+BRAND+langSelect('lg0')+'</div>'+
  '<section class="card hero"><div class="eyebrow">'+esc(t('login.eyebrow'))+'</div><h1>'+esc(t('login.h'))+'</h1><p class="small muted" style="margin:0">'+esc(t('login.p'))+'</p>'+
  '<form id="lf" style="display:flex;flex-direction:column;gap:10px"><label class="small" for="em">Email</label><input class="txt" style="max-width:none" id="em" type="email" dir="ltr" autocomplete="username" inputmode="email" required value="'+esc(loginEm)+'">'+
  '<label class="small" for="pw">'+esc(t('login.pw'))+'</label><input class="txt" style="max-width:none" id="pw" type="password" dir="ltr" autocomplete="current-password" required>'+
  (loginErr?'<p class="small" role="alert" style="margin:0;color:var(--bad)">'+esc(loginErr)+'</p>':'')+
  '<button class="btn" type="submit"'+(loginBusy?' disabled':'')+'>'+esc(loginBusy?t('login.busy'):t('login.btn'))+'</button></form><p class="small muted" style="margin:0">'+esc(t('login.noacc'))+'</p></section><p class="small muted" lang="de" dir="ltr" style="margin:0">Privates, kostenloses Lernprojekt. Nicht offiziell, nicht verbunden mit BAMF, g.a.s.t. oder telc.</p>';}
function vBoot(){return '<div class="card">'+esc(t('boot'))+'</div>';}

function dayRow(D){var done=!!S.done[D.id],ni=nextIdx(),nx=ni===D.idx,skipped=!done&&D.opt&&D.idx<ni,cls=done?'done':nx?'next':skipped?'opt':'lock';
  var st=done?(S.done[D.id].p?t('day.perfect'):t('day.done')):skipped?t('day.opt'):nx?(D.boss?t('day.boss'):t('day.min',{n:D.min||20})):t('day.locked');
  return '<button class="day '+cls+'" data-a="open" data-i="'+D.idx+'"'+(cls==='lock'?' aria-disabled="true"':'')+'><span class="n">'+(done?'✓':D.idx+1)+'</span><span class="grow"><span class="tt">'+esc(L(D.title))+'</span><br><span class="st">'+esc(st)+'</span></span>'+(D.tag?'<span class="tag">'+esc(t('sec.'+D.tag))+'</span>':'')+'</button>';}
function vPath(){var ni=nextIdx(),did=S.days[today()]!==undefined,cap=newToday()>=capToday(),h=header(),dc=doneCount();
  var rev=dc?'<button class="linkbtn" data-a="review">'+esc(t('btn.review'))+'</button>':'';
  var pace=ni>=0&&(capToday()>2||behind())?'<p class="small" style="margin:0;color:var(--pulse)"><b>'+esc(t('path.pace',{n:capToday()}))+'</b></p>':'';
  if(S.tour&&!S.tourDone&&TOUR<0)h+='<button class="tourcard" data-a="tour"><span class="tci" aria-hidden="true">🎓</span><span class="grow"><b>'+esc(t('tour.card'))+'</b><br><span class="small">'+esc(t('tour.cardsub'))+'</span></span><span class="tcb" aria-hidden="true">▶</span></button>';
  var body;
  if(ni<0){body='<div class="eyebrow">🏁</div><h2 class="daytitle">'+esc(t('path.alldone'))+'</h2><div class="foot"><button class="btn" data-a="review">'+esc(t('btn.review'))+'</button></div>';}
  else if(!did){var D=ALL[ni];
    body='<div class="eyebrow">'+esc(t('path.today',{n:ni+1}))+'</div><h2 class="daytitle">'+esc(L(D.title))+'</h2><p class="small muted" style="margin:0">'+esc(t('path.dur',{m:D.min||20}))+'</p>'+pace+
      (dc<3?'<p class="small muted" style="margin:0">'+esc(t('path.min'))+'</p>':'')+
      '<div class="foot"><button class="btn big-cta" data-a="open" data-i="'+ni+'">'+esc(t('path.start',{n:ni+1}))+' →</button></div>'+rev;}
  else{body='<div class="eyebrow">✅</div><h2 class="daytitle">'+esc(t('path.donet',{n:Math.max(1,ni)}))+'</h2><p class="small" style="margin:0">'+esc(cap?t('path.cap',{n:ni+1}):t('path.did'))+'</p>'+pace+
      '<div class="foot">'+(cap?'<button class="btn ghost" data-a="tab" data-v="practice">'+esc(t('tab.practice'))+'</button>':'<button class="btn ghost" data-a="open" data-i="'+ni+'">'+esc(t('path.more',{n:ni+1}))+'</button>')+'</div>'+rev;}
  var exam='<p class="examline"><span aria-hidden="true">⏳</span> <b class="num">'+daysLeft()+'</b> '+esc(t('path.days'))+'</p>';
  h+='<section class="card hero todayc'+(did&&ni>=0?' done':'')+'">'+exam+'<div class="todaygo">'+body+'</div></section>';
  WK.forEach(function(w,wi){var d=w.days.filter(function(x){return S.done[x.id];}).length;
    h+='<section class="week"><div><div class="eyebrow">'+esc(t('path.week',{n:wi+1}))+' · <span class="num">'+d+' / '+w.days.length+'</span></div><h2>'+esc(L(w.title))+'</h2>'+(w.sub?'<p class="small muted" style="margin:4px 0 0">'+esc(L(w.sub))+'</p>':'')+'</div><div class="days">'+w.days.map(dayRow).join('')+'</div></section>';});
  return h;}

/* free practice */
function secStats(sec){var a=(C.bank[sec]||[]),seen=0,miss=0;a.forEach(function(x){if(S.seen[x._k])seen++;if(S.missed[x._k])miss++;});return {n:a.length,seen:seen,miss:miss};}
var SEC_ICON={kasus:'der·den·dem',satz:'weil … ist',hoeren:'♪',lesen:'¶',wort:'A↔Б',sprechen:'„…“',schreiben:'✎'};
function vPractice(){var h=header()+'<section><div class="eyebrow">'+esc(t('tab.practice'))+'</div><h1>'+esc(t('prac.h'))+'</h1><p class="small muted" style="margin:6px 0 0;max-width:60ch">'+esc(t('prac.p'))+'</p></section><div class="secs">';
  SECTIONS.forEach(function(sec){var st=secStats(sec);if(!st.n)return;
    h+='<button class="sec" data-a="prac" data-v="'+sec+'"><span class="ico" lang="de" dir="ltr">'+esc(SEC_ICON[sec])+'</span><span class="grow"><span class="tt">'+esc(t('sec.'+sec))+'</span><br><span class="st">'+esc(t('sec.'+sec+'.d'))+'</span></span><span class="num small muted" style="text-align:end">'+st.seen+'/'+st.n+(st.miss?'<br><span style="color:var(--bad)">'+esc(t('prac.miss',{n:st.miss}))+'</span>':'')+'</span></button>';});
  h+='</div><section class="card"><h3>'+esc(t('prac.mock.h'))+'</h3><p class="small" style="margin:6px 0 10px">'+esc(t('prac.mock.p'))+'</p><div class="row"><a class="btn small ghost" href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/PDF/DTZ_UEbungssatz_1_Erwachsene.pdf" target="_blank" rel="noopener">Übungssatz 1 PDF</a><a class="btn small ghost" href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/Audio/gast_Deutsch-Test_fuer_Zuwanderer_UEbungssatz_1.mp3" target="_blank" rel="noopener">MP3 1</a><a class="btn small ghost" href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/PDF/DTZ_UEbungssatz_2_Erwachsene.pdf" target="_blank" rel="noopener">Übungssatz 2 PDF</a><a class="btn small ghost" href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/Audio/gast_Deutsch-Test_fuer_Zuwanderer_UEbungssatz_2.mp3" target="_blank" rel="noopener">MP3 2</a></div></section>';
  return h;}

/* progress + settings */
function badges(){var s=Math.max(S.best,streak()),dn=doneCount(),seen=Object.keys(S.seen).length;return [
  [t('b.first'),dn>=1],[t('b.s3'),s>=3],[t('b.s7'),s>=7],[t('b.s14'),s>=14],[t('b.clean'),S.perfect>=1],[t('b.clean5'),S.perfect>=5],[t('b.w1'),dn>=7],[t('b.half'),dn>=Math.ceil(TOTAL/2)],[t('b.all'),TOTAL>0&&dn>=TOTAL],[t('b.t100'),seen>=100],[t('b.t300'),seen>=300]];}
function syncLine(){return {local:t('sync.local'),connecting:t('sync.conn'),cloud:t('sync.cloud'),error:t('sync.err'),owner:t('sync.owner')}[syncState]||'';}
function vProg(){var lv=level(),dn=doneCount(),seen=Object.keys(S.seen).length,pct=lv.to?Math.round((S.xp-lv.from)/(lv.to-lv.from)*100):100;
  var h=header()+'<section class="card hero"><div class="row" style="gap:14px;flex-wrap:nowrap"><div class="me-av" aria-hidden="true">'+esc(S.avatar||'🙂')+'</div><div class="grow"><div class="eyebrow">'+esc(t('tab.progress'))+'</div><h1 style="margin:2px 0">'+esc(S.name||t('prog.you'))+'</h1><div class="small"><b>'+esc(t('lvl.label',{n:lv.i+1}))+'</b> '+esc(lv.name)+' · <span class="num muted">'+S.xp+' XP</span></div></div></div><div class="bar"><i style="width:'+pct+'%"></i></div></section>'+
    '<div class="eyebrow" style="margin-top:4px">'+esc(t('prof.prog'))+'</div>';
  h+='<div class="stats"><div class="stat"><b class="num">'+dn+' / '+TOTAL+'</b><span class="small muted">'+esc(t('prog.days'))+'</span></div><div class="stat"><b class="num">'+seen+'</b><span class="small muted">'+esc(t('prog.tasks'))+'</span></div><div class="stat"><b class="num">'+Math.max(S.best,streak())+'</b><span class="small muted">'+esc(t('prog.best'))+'</span></div></div>';
  var cells='',tt=new Date(),start=addDays(tt,-(((tt.getDay()+6)%7)+28));
  for(var i=0;i<35;i++){var d=addDays(start,i),k=ds(d);cells+='<i class="'+(S.days[k]!==undefined?'a':S.frozen[k]?'f':'')+(k===today()?' t':'')+'" title="'+k+'"></i>';}
  h+='<section class="card"><h3>'+esc(t('prof.pulse'))+'</h3><div style="margin-top:10px">'+stripSvg()+'</div><p class="small muted" style="margin:8px 0 0"><b class="num" style="color:var(--pulse)">♥ '+streak()+'</b> '+esc(t('chip.streak'))+'</p></section>';
  h+='<section class="card"><h3>'+esc(t('prog.heat'))+'</h3><div class="heat" style="margin-top:10px">'+cells+'</div></section>';
  var bySec=SECTIONS.map(function(sec){var st=secStats(sec);return st.n?'<div><div class="row small" style="justify-content:space-between"><span>'+esc(t('sec.'+sec))+'</span><span class="num muted">'+st.seen+' / '+st.n+'</span></div><div class="bar acc" style="margin-top:4px"><i style="width:'+Math.round(st.seen/st.n*100)+'%"></i></div></div>':'';}).join('');
  h+='<section class="card" style="display:flex;flex-direction:column;gap:10px"><h3>'+esc(t('prog.secs'))+'</h3>'+bySec+'</section>';
  h+='<section><h3 style="margin-bottom:8px">'+esc(t('prog.badges'))+'</h3><div class="badges">'+badges().map(function(b){return '<div class="badge'+(b[1]?'':' off')+'"><b>'+(b[1]?'✓ ':'')+esc(b[0])+'</b></div>';}).join('')+'</div></section>';
  h+='<section class="card" style="display:flex;flex-direction:column;gap:12px"><h3>'+esc(t('set.h'))+'</h3>'+
    '<div><div class="small" style="margin-bottom:6px"><b>'+esc(t('prof.theme'))+'</b></div><div class="themes">'+THEMES.map(function(x){var cur=(S.theme||'auto')===x[0];return '<button class="th" data-a="theme" data-v="'+x[0]+'" aria-pressed="'+cur+'"><span class="sw">'+(x[2]?x[2].map(function(c){return '<i style="background:'+c+'"></i>';}).join(''):'<i style="background:#f4f3ee"></i><i style="background:#151515"></i>')+'</span>'+esc(x[1]||t('th.auto'))+'</button>';}).join('')+'</div></div>'+
    '<div><div class="small" style="margin-bottom:6px"><b>'+esc(t('prof.avatar'))+'</b></div><div class="avs">'+AVATARS.map(function(a){return '<button class="av" data-a="avatar" data-v="'+a+'" aria-pressed="'+(S.avatar===a)+'">'+a+'</button>';}).join('')+'</div></div>'+
    '<div class="row"><span class="small" style="min-width:90px">'+esc(t('set.lang'))+'</span>'+langSelect('lg1')+'</div>'+
    '<div class="row"><label for="nm" class="small" style="min-width:90px">'+esc(t('set.name'))+'</label><input class="txt" id="nm" value="'+esc(S.name)+'" maxlength="30"><button class="btn small" data-a="name">'+esc(t('btn.save'))+'</button></div>'+
    '<p class="small muted" style="margin:0">'+esc(syncLine())+(EMAIL?' · '+esc(EMAIL):'')+'</p>'+
    '<details><summary class="small">'+esc(t('set.code'))+'</summary><p class="small muted">'+esc(t('set.code.p'))+'</p><textarea id="code" class="txt" style="max-width:none;min-height:80px" dir="ltr" spellcheck="false"></textarea><div class="row" style="margin-top:8px"><button class="btn small ghost" data-a="exp">'+esc(t('set.exp'))+'</button><button class="btn small" data-a="imp">'+esc(t('set.imp'))+'</button></div></details>'+
    (SB&&ME?'<details><summary class="small">'+esc(t('pw.h'))+'</summary><form id="pwf" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><input type="email" autocomplete="username" value="'+esc(EMAIL)+'" hidden><input class="txt" style="max-width:none" id="pw1" type="password" dir="ltr" autocomplete="new-password" placeholder="'+esc(t('pw.new'))+'"><input class="txt" style="max-width:none" id="pw2" type="password" dir="ltr" autocomplete="new-password" placeholder="'+esc(t('pw.rep'))+'"><button class="btn small" type="submit">'+esc(t('pw.btn'))+'</button></form></details>':'')+
    '<div class="row"><button class="btn small ghost" data-a="tour">'+esc(t('tour.again'))+'</button>'+(SB&&ME?'<button class="btn small ghost" data-a="logout">'+esc(t('btn.logout'))+'</button>':'')+'<button class="btn small ghost" data-a="reset" style="color:var(--bad)">'+esc(t('set.reset'))+'</button></div></section>';
  return h;}

/* observer */
var W={docs:null,at:0,err:'',ch:null,poll:null,busy:false};
function ago(ts){if(!ts)return '—';var m=Math.round((Date.now()-ts)/60000);if(m<1)return t('ago.now');if(m<60)return t('ago.min',{n:m});var hh=Math.round(m/60);if(hh<24)return t('ago.h',{n:hh});return t('ago.d',{n:Math.round(hh/24)});}
function loadWatch(){if(!SB||!OWNER||W.busy)return;W.busy=true;
  SB.from('progress').select('user_id,state,updated_at').then(function(r){W.busy=false;
    if(r.error){W.err=r.error.message||'error';}else{W.err='';W.at=Date.now();
      W.docs=(r.data||[]).filter(function(x){return x.user_id!==ME&&x.state;}).map(function(x){var o=fix(x.state);o._id=x.user_id;return o;});}
    if(view==='watch')renderKeep();},function(){W.busy=false;W.err='offline';if(view==='watch')render();});}
/* re-render without losing what the observer is typing: open <details>, field values, focus */
function renderKeep(){var app=$('#app');if(!app){render();return;}
  var det=[].map.call(app.querySelectorAll('details'),function(d){return d.open;});
  var vals={};app.querySelectorAll('input,select,textarea').forEach(function(f,i){var k=f.id||f.name||('#'+i);vals[k]=f.type==='checkbox'||f.type==='radio'?{c:f.checked}:{v:f.value};});
  var ae=document.activeElement,fk=ae&&app.contains(ae)?(ae.id||ae.name):null,sel=null;try{if(fk&&ae.selectionStart!=null)sel=[ae.selectionStart,ae.selectionEnd];}catch(e){}
  var y=window.scrollY;render();
  [].forEach.call(app.querySelectorAll('details'),function(d,i){if(det[i]!=null)d.open=det[i];});
  app.querySelectorAll('input,select,textarea').forEach(function(f,i){var k=f.id||f.name||('#'+i),o=vals[k];if(!o)return;if('c' in o)f.checked=o.c;else if(f.type!=='file')f.value=o.v;});
  if(fk){var n=document.getElementById(fk)||app.querySelector('[name="'+fk+'"]');if(n){try{n.focus({preventScroll:true});if(sel)n.setSelectionRange(sel[0],sel[1]);}catch(e){}}}
  window.scrollTo(0,y);}
function startWatch(){if(!SB||!OWNER)return;if(!W.docs&&!W.busy)loadWatch();
  if(!W.ch&&SB.channel){try{W.ch=SB.channel('progress-watch').on('postgres_changes',{event:'*',schema:'public',table:'progress'},function(){clearTimeout(W.deb);W.deb=setTimeout(loadWatch,4000);}).subscribe();}catch(e){W.ch=null;}}
  if(!W.poll)W.poll=setInterval(function(){if(view==='watch'&&!document.hidden)loadWatch();},60000);}
function learnerRow(st){var name=st.name||st.email||'—',s=streak(st),dn=doneCount(st),td=st.days[today()]!==undefined,wk=0,tt=new Date();for(var i=0;i<7;i++)if(st.days[ds(addDays(tt,-i))]!==undefined)wk++;
  var miss={};Object.keys(st.missed||{}).forEach(function(k){var x=BANK[k];if(x)miss[x._s]=(miss[x._s]||0)+1;});
  return '<section class="card" style="display:flex;flex-direction:column;gap:8px"><div class="row" style="justify-content:space-between"><h2>'+(st.avatar?esc(st.avatar)+' ':'')+esc(name)+'</h2><span class="chip" style="'+(td?'border-color:var(--ok);color:var(--ok)':'')+'">'+esc(td?t('w.today'):t('w.notyet'))+'</span></div>'+
    '<p class="small muted" style="margin:0">'+esc(t('w.last',{t:ago(st.t)}))+' · '+(st.lang?esc(st.lang.toUpperCase()):'')+' · '+esc(st.tourDone?t('w.tour'):t('w.notour'))+'</p>'+stripSvg(st)+
    '<div class="stats"><div class="stat"><b class="num" style="color:var(--pulse)">'+s+'</b><span class="small muted">'+esc(t('chip.streak'))+'</span></div><div class="stat"><b class="num">'+dn+' / '+TOTAL+'</b><span class="small muted">'+esc(t('prog.days'))+'</span></div><div class="stat"><b class="num">'+wk+'/7</b><span class="small muted">'+esc(t('w.week'))+'</span></div></div>'+
    (Object.keys(miss).length?'<div class="row small">'+Object.keys(miss).map(function(k){return '<span class="tag">'+esc(t('sec.'+k))+': '+miss[k]+'</span>';}).join('')+'</div>':'')+'</section>';}
function vWatch(){if(!OWNER)return header()+'<div class="card">'+esc(t('w.only'))+'</div>';startWatch();
  var h=header()+'<section><div class="eyebrow">'+esc(t('tab.watch'))+'</div><h1>'+esc(t('w.h'))+'</h1>'+(W.at?'<p class="small muted" style="margin:6px 0 0">'+esc(t('w.at',{t:ago(W.at)}))+'</p>':'')+'<p class="small muted wleg" style="margin:6px 0 0"><span class="wst on"></span> '+esc(t('w.online'))+' · <span class="wtd">'+esc(t('w.today'))+'</span></p></section>'+vAdd()+vUpload();
  if(W.err)return h+'<div class="card">'+esc(t('w.err'))+'</div>';
  if(!W.docs)return h+'<div class="card">'+esc(t('boot'))+'</div>';
  if(!W.docs.length)return h+'<div class="card">'+esc(t('w.none'))+'</div>';
  var td=today(),act=W.docs.filter(function(x){return x.days[td]!==undefined;}).length,sort=W.sort||'recent';
  var keyf={recent:function(x){return x.t||0;},streak:function(x){return streak(x);},days:function(x){return doneCount(x)*1e6+(x.xp||0);},name:function(x){return 0;}}[sort];
  var docs=W.docs.slice().sort(sort==='name'?function(a,b){return String(a.name||a.email||'').localeCompare(String(b.name||b.email||''));}:function(a,b){return keyf(b)-keyf(a);});
  h+='<div class="wsum"><b class="num">'+act+' / '+W.docs.length+'</b><span class="small">'+esc(t('w.sum'))+'</span></div>';
  h+='<div class="row small" style="gap:6px"><span class="muted">'+esc(t('w.sort'))+'</span>'+['recent','streak','days','name'].map(function(k){return '<button class="chipbtn'+(sort===k?' on':'')+'" data-a="wsort" data-v="'+k+'">'+esc(t('w.s.'+k))+'</button>';}).join('')+'</div>';
  return h+'<div class="wlist">'+docs.map(learnerLine).join('')+'</div>';}
function learnerLine(st){var id=st._id,open=W.open&&W.open[id],name=st.name||st.email||'—',s=streak(st),dn=doneCount(st),td=st.days[today()]!==undefined,seenTs=Math.max(st.lastOn||0,st.t||0),dots='',tt=new Date();
  for(var i=6;i>=0;i--){dots+='<i class="'+(st.days[ds(addDays(tt,-i))]!==undefined?'a':'')+'"></i>';}
  var row='<button class="wline'+(open?' open':'')+'" data-a="wopen" data-v="'+esc(id)+'" aria-expanded="'+(!!open)+'"><span class="wst'+(ONLINE[id]?' on':'')+'" data-uid="'+esc(id)+'" title="'+(ONLINE[id]?esc(t('w.online')):'')+'"></span><span class="wav">'+esc(st.avatar||'🙂')+'</span><span class="grow wnm"><b>'+esc(name)+'</b>'+(td?'<span class="wtd">'+esc(t('w.today'))+'</span>':'')+'<span class="small muted wseen'+(ONLINE[id]?' onl':'')+'" data-seen="'+esc(id)+'" data-ts="'+seenTs+'">'+esc(ONLINE[id]?t('w.now'):t('w.seen',{t:ago(seenTs)}))+'</span></span><span class="wdots" aria-label="'+esc(t('w.week'))+'">'+dots+'</span><span class="wnum num wxp" title="XP">★'+(st.xp||0)+'</span><span class="wnum num" title="'+esc(t('chip.streak'))+'">♥'+s+'</span><span class="wnum num" title="'+esc(t('prog.days'))+'">'+dn+'/'+TOTAL+'</span></button>';
  return row+(open?learnerRow(st):'');}

/* points race: opt-in, only name + points (SQL function leaderboard) */
var TOP={rows:null,at:0,err:'',busy:false,period:'week'};
function loadTop(){if(!SB||!ME||TOP.busy)return;TOP.busy=true;
  SB.rpc('leaderboard').then(function(r){TOP.busy=false;if(r.error){TOP.err=r.error.message||'error';}else{TOP.err='';TOP.rows=r.data||[];TOP.at=Date.now();}if(view==='top')render();},
    function(){TOP.busy=false;TOP.err='offline';if(view==='top')render();});}
function vTop(){var h=header()+'<section><div class="eyebrow">'+esc(t('tab.top'))+'</div><h1>'+esc(t('top.h'))+'</h1><p class="small muted" style="margin:6px 0 0">'+esc(t('top.p'))+'</p></section>';
  if(S.rank!=='1'){return h+'<section class="card" style="display:flex;flex-direction:column;gap:10px">'+(S.name?'':'<label class="small" for="tn">'+esc(t('top.name'))+'</label><input class="txt" id="tn" maxlength="30" style="max-width:none">')+'<button class="btn" data-a="topjoin">'+esc(t('top.join'))+'</button></section>';}
  if(!TOP.rows&&!TOP.err){loadTop();return h+'<div class="card">'+esc(t('boot'))+'</div>';}
  if(TOP.err)return h+'<div class="card">'+esc(t('top.err'))+'</div>';
  if(Date.now()-TOP.at>60000)loadTop();
  var key=TOP.period==='week'?'week_xp':'xp',rows=TOP.rows.slice().sort(function(a,b){return (b[key]||0)-(a[key]||0);});
  h+='<div class="seg2" role="group"><button data-a="topper" data-v="week" aria-pressed="'+(TOP.period==='week')+'">'+esc(t('top.week'))+'</button><button data-a="topper" data-v="all" aria-pressed="'+(TOP.period==='all')+'">'+esc(t('top.all'))+'</button></div>';
  if(!rows.length)return h+'<div class="card">'+esc(t('top.empty'))+'</div>';
  var medal=['🥇','🥈','🥉'];
  h+='<ol class="race">'+rows.map(function(r,i){var top=rows[0][key]||1,pct=Math.max(4,Math.round((r[key]||0)/top*100));
    return '<li class="'+(r.me?'me':'')+(i<3?' podium':'')+'"><span class="pos num">'+(medal[i]||(i+1))+'</span><span class="grow"><span class="nm">'+(r.avatar?esc(r.avatar)+' ':'')+esc(r.name)+(r.me?' · '+esc(t('top.you')):'')+'</span><span class="track"><i style="width:'+pct+'%"></i></span></span><b class="num">'+(r[key]||0)+'</b></li>';}).join('')+'</ol>';
  return h+'<div class="row"><button class="btn small ghost" data-a="topleave">'+esc(t('top.leave'))+'</button></div>';}

function doPw(){var a=$('#pw1').value,b=$('#pw2').value;if(a.length<8)return toast(t('pw.short'));if(a!==b)return toast(t('pw.diff'));
  SB.auth.updateUser({password:a}).then(function(r){if(r.error){toast(t('pw.err',{m:r.error.message}));return;}$('#pw1').value='';$('#pw2').value='';toast(t('pw.ok'));},function(e){toast(t('pw.err',{m:String(e&&e.message||e)}));});}

/* upload a new course version (observer only; RLS policy "course: observers update") */
function vUpload(){return '<details class="card"><summary>'+esc(t('up.h'))+'</summary><p class="small muted">'+esc(t('up.p'))+'</p><label class="btn small ghost" style="display:inline-flex;align-items:center;cursor:pointer">'+esc(t('up.btn'))+'<input type="file" id="upf" accept=".json,application/json" hidden></label></details>';}
function doUpload(file){var rd=new FileReader();rd.onload=function(){var c=null;try{c=JSON.parse(rd.result);}catch(e){}
  if(!c||!Array.isArray(c.weeks)||!c.bank||!c.rules)return toast(t('up.bad'));
  SB.from('course_content').upsert({id:'dtz',data:c,updated_at:new Date().toISOString()}).then(function(r){
    if(r.error)return toast(t('up.err',{m:r.error.message}));
    setCourse(c);try{localStorage.setItem(CKEY,JSON.stringify(c));}catch(e){}render();toast(t('up.ok',{n:TOTAL}));},function(e){toast(t('up.err',{m:String(e&&e.message||e)}));});};
  rd.readAsText(file);}

/* add learner (observer only, via Edge Function create-learner) */
var ADD={busy:false,res:null,err:''};
function vAdd(){var h='<details class="card"'+(ADD.res||ADD.err?' open':'')+'><summary>'+esc(t('add.h'))+'</summary><p class="small muted">'+esc(t('add.p'))+'</p>'+
  '<form id="af" style="display:flex;flex-direction:column;gap:8px"><input class="txt" style="max-width:none" id="ae" type="email" dir="ltr" placeholder="'+esc(t('add.email'))+'" autocomplete="off" required>'+
  '<input class="txt" style="max-width:none" id="an" placeholder="'+esc(t('add.name'))+'" maxlength="30" autocomplete="off">'+
  '<input class="txt" style="max-width:none" id="ap" dir="ltr" placeholder="'+esc(t('add.pw'))+'" autocomplete="new-password">'+
  '<button class="btn" type="submit"'+(ADD.busy?' disabled':'')+'>'+esc(ADD.busy?t('add.busy'):t('add.btn'))+'</button></form>';
  if(ADD.err)h+='<p class="small" role="alert" style="color:var(--bad)">'+esc(ADD.err)+'</p>';
  if(ADD.res){h+='<p class="small"><b>'+esc(t('add.ok'))+'</b></p><textarea class="txt" id="amsg" style="max-width:none;min-height:110px" dir="ltr" readonly>'+esc(addMsg(ADD.res))+'</textarea><div class="row" style="margin-top:8px"><button class="btn small" data-a="addcopy">'+esc(t('add.copy'))+'</button></div>';}
  return h+'</details>';}
function addMsg(r){return 'DTZ-Puls\n'+location.origin+location.pathname+'\nEmail: '+r.email+'\nPasswort / Password: '+r.password+'\n\nSprache ändern / change language: oben im Menü.';}
function doAdd(){var em=$('#ae').value.trim(),nm=$('#an').value.trim(),pw=$('#ap').value.trim();if(!em)return;
  if(!SB||!SB.functions)return;ADD={busy:true,res:null,err:''};render();
  SB.auth.getUser().then(function(u){if(u&&u.error){ADD={busy:false,res:null,err:''};SB.auth.signOut({scope:'local'}).then(function(){},function(){});onSession(null);toast(t('login.again'));return null;}
  return SB.functions.invoke('create-learner',{body:{email:em,name:nm,password:pw}}).then(function(r){
    var d=r.data,e=r.error;
    if(e){var ctx=e.context;var p=ctx&&ctx.json?ctx.json():Promise.resolve(null);
      return p.then(function(j){var code=j&&j.error;ADD={busy:false,res:null,err:code==='exists'?t('add.exists'):/not found|404|FunctionsFetchError|Failed to send/i.test(String(e.message)+String(e.name))?t('add.nofn'):t('add.err',{m:(code||e.message||'?')+(j&&j.detail?' ('+j.detail+')':'')})};render();},function(){ADD={busy:false,res:null,err:t('add.err',{m:e.message||'?'})};render();});}
    ADD={busy:false,res:d,err:''};render();loadWatch();
  });},function(e){ADD={busy:false,res:null,err:t('add.err',{m:String(e&&e.message||e)})};render();});}

/* ---------- lesson / practice runner ---------- */
function openLesson(i){var D=ALL[i],isNew=!S.done[D.id];
  if(isNew&&i!==nextIdx()&&!(D.opt&&i<nextIdx()))return toast(t('toast.prev'));
  if(isNew&&newToday()>=capToday())return toast(t('toast.cap'));
  var q=(D.cards||[]).map(function(c){return {k:'card',c:c};}).concat(D._tasks.map(function(x){return {k:'task',t:x,first:true};}));
  startRun({id:D.id,title:L(D.title),kind:'lesson',boss:!!D.boss},q,isNew);}
function startRun(meta,q,isNew){stopSay();if(view!=='run'&&view!=='result'){BACK=view;try{history.pushState({dtzRun:1},'');}catch(e){}}R={L:meta,q:q,pos:0,ok:0,fixed:0,isNew:!!isNew};T=null;view='run';render();window.scrollTo(0,0);}
function leaveRun(){stopSay();clearInterval(tmrI);var wasRun=view==='run';R=null;T=null;view=BACK||'path';try{if(location.hash.slice(1)!==view)history.replaceState(null,'','#'+view);}catch(e){}render();window.scrollTo(0,0);return wasRun;}
window.addEventListener('popstate',function(){if(view==='run'||view==='result'){if(leaveRun())toast(t('toast.quit'));}});
function pickFrom(pool,n){var miss=shuffle(pool.filter(function(x){return S.missed[x._k];})),fresh=shuffle(pool.filter(function(x){return !S.missed[x._k]&&!S.seen[x._k];})),old=pool.filter(function(x){return !S.missed[x._k]&&S.seen[x._k];}).sort(function(a,b){return (S.seen[a._k]||'').localeCompare(S.seen[b._k]||'');});
  return miss.slice(0,Math.ceil(n/2)).concat(fresh,old).slice(0,n);}
function openPractice(sec){var pool=C.bank[sec]||[];if(!pool.length)return;var n={sprechen:3,schreiben:1,lesen:4,hoeren:5}[sec]||8;
  var tasks=shuffle(pickFrom(pool,n));startRun({id:'prac-'+sec,title:t('sec.'+sec),kind:'practice',sec:sec},tasks.map(function(x){return {k:'task',t:x,first:true};}),false);}
function openReview(){var pool=[];ALL.forEach(function(d){if(S.done[d.id])d._tasks.forEach(function(x){pool.push(x);});});
  if(!pool.length)return toast(t('toast.noreview'));
  var tasks=pickFrom(pool,8);startRun({id:'review',title:t('btn.review'),kind:'review'},shuffle(tasks).map(function(x){return {k:'task',t:x,first:true};}),false);}

function initTask(x){T={done:false,right:false};
  if(x.t==='mc'||x.t==='listen'||x.t==='read'){T.opts=shuffle(x.o.map(function(_,i){return i;}));T.sel=-1;T.plays=0;}
  if(x.t==='order'){T.pool=shuffle(x.w.map(function(_,i){return i;}));if(T.pool.every(function(v,i){return v===i;}))T.pool.reverse();T.ans=[];}
  if(x.t==='match'){T.right_=shuffle(x.pairs.map(function(_,i){return i;}));T.l=-1;T.ok={};T.err=0;T.bad=null;}
  if(x.t==='fill'){T.val='';T.chips=x.o?shuffle(x.o):null;}
  if(x.t==='speak'){T.shown=false;T.left=x.time||60;}
  if(x.t==='write'){T.sel=x.b.map(function(){return -1;});T.vals={};T.tries={};T.ok=false;}}
function sayBtn(text,label,cls){return '<button class="btn small ghost say '+(cls||'')+'" data-a="say" data-txt="'+esc(text)+'">▶ '+esc(label||t('btn.listen'))+'</button>';}
function de(s){return '<span lang="de" dir="ltr">'+s+'</span>';}
function vTask(st){var x=st.t,h='<div class="eyebrow">'+esc(st.first?t('sec.'+(x._s||'kasus')):t('run.again'))+'</div>';
  if(x.t==='mc'){h+='<h2>'+de(esc(x.q))+'</h2>'+(x.qx?'<p class="small muted">'+esc(L(x.qx))+'</p>':'')+optsHtml(x);}
  if(x.t==='listen'){h+='<h2>'+de(esc(x.q))+'</h2><p class="small muted">'+esc(L(x.k)||t('run.listen'))+'</p><div class="row"><button class="play" data-a="play" aria-label="'+esc(t('btn.listen'))+'"><svg viewBox="0 0 24 24"><path class="pl" d="M8 5v14l11-7z"/><rect class="st" x="6" y="6" width="12" height="12" rx="2"/></svg></button><span class="small muted num">'+(T.plays?esc(t('run.plays',{n:T.plays})):esc(t('run.first')))+'</span></div>'+optsHtml(x)+(T.done?'<div class="tx" lang="de" dir="ltr">'+esc(x.text)+'</div>':'');}
  if(x.t==='read'){h+='<div class="tx read" lang="de" dir="ltr">'+esc(x.text).replace(/\n/g,'<br>')+'</div><h2>'+de(esc(x.q))+'</h2>'+optsHtml(x);}
  if(x.t==='fill'){var inp='<input id="fillin" class="gap" aria-label="'+esc(t('run.gap'))+'" autocomplete="off" autocapitalize="off" spellcheck="false" value="'+esc(T.val)+'"'+(T.done?' disabled':'')+'>';
    h+='<h2 class="sent">'+de(esc(x.s).replace('___',inp))+'</h2>'+(x.qx?'<p class="small muted">'+esc(L(x.qx))+'</p>':'');
    if(T.chips&&!T.done)h+='<div class="row">'+T.chips.map(function(c){return '<button class="chipbtn" data-a="chip" data-v="'+esc(c)+'" lang="de">'+esc(c)+'</button>';}).join('')+'</div>';
    if(T.done&&!T.right)h+='<p class="small">'+esc(t('run.right'))+' <b lang="de">'+esc(x.a[0])+'</b></p>';}
  if(x.t==='order'){h+='<h2>'+esc(L(x.qx)||t('run.order'))+'</h2><div class="lines words" dir="ltr" lang="de" aria-label="'+esc(t('run.yours'))+'">'+(T.ans.length?T.ans.map(function(j){return '<button class="ln" data-a="unpick" data-j="'+j+'"'+(T.done?' disabled':'')+'>'+esc(x.w[j])+'</button>';}).join(''):'<span class="small muted">'+esc(t('run.tap'))+'</span>')+'</div><div class="pool words" dir="ltr" lang="de">'+T.pool.filter(function(j){return T.ans.indexOf(j)<0;}).map(function(j){return '<button class="ln" data-a="pick" data-j="'+j+'"'+(T.done?' disabled':'')+'>'+esc(x.w[j])+'</button>';}).join('')+'</div>';
    if(T.done&&!T.right)h+='<p class="small">'+esc(t('run.right'))+' <b lang="de" dir="ltr">'+esc(x.w.join(' '))+'</b></p>';}
  if(x.t==='match'){h+='<h2>'+esc(t('run.match'))+'</h2><div class="match">';for(var i=0;i<x.pairs.length;i++){var r=T.right_[i];
      h+='<button class="'+(T.ok[i]?'good':T.l===i?'sel':'')+'" data-a="ml" data-j="'+i+'"'+(T.ok[i]?' disabled':'')+' lang="de" dir="ltr">'+esc(x.pairs[i][0])+'</button><button class="'+(T.ok[r]?'good':T.bad===r?'wrong':'')+'" data-a="mr" data-j="'+r+'"'+(T.ok[r]?' disabled':'')+'>'+esc(L(x.pairs[r][1]))+'</button>';}
    h+='</div>';}
  if(x.t==='speak')h+=vSpeak(x);
  if(x.t==='write')h+=vWrite(x);
  if(T.done&&x.t!=='speak'&&x.t!=='write'){var ex=explain(x);
    h+='<div class="fb '+(T.right?'ok':'bad')+'" role="status"><b>'+esc(T.right?t('run.ok'):t('run.no'))+'</b>'+(ex?'<span>'+esc(ex)+'</span>':'')+(T.right?'':'<span class="small">'+esc(t('run.back'))+'</span>')+'</div>';
    if(x.t==='listen')h+='<div>'+sayBtn(x.text,t('run.shadow'))+'</div>';
    h+='<div class="foot"><button class="btn" data-a="next">'+esc(t('btn.next'))+'</button></div>';}
  else if(!T.done&&x.t!=='match'&&x.t!=='speak'&&x.t!=='write'){var ready=(x.t==='mc'||x.t==='listen'||x.t==='read')?T.sel>=0:x.t==='order'?T.ans.length===x.w.length:true;
    h+='<div class="foot"><button class="btn" data-a="check"'+(ready?'':' disabled')+'>'+esc(t('btn.check'))+'</button></div>';}
  else if(T.done&&x.t==='match')h+='<div class="foot"><button class="btn" data-a="next">'+esc(t('btn.next'))+'</button></div>';
  return h;}
function optsHtml(x){return '<div class="opts" lang="de" dir="ltr">'+T.opts.map(function(j){var cl=T.done?(j===x.a?' good':j===T.sel?' wrong':''):(j===T.sel?' sel':'');return '<button class="opt'+cl+'" data-a="sel" data-j="'+j+'"'+(T.done?' disabled':'')+'>'+esc(x.o[j])+'</button>';}).join('')+'</div>';}
function vSpeak(x){var h='<h2>'+esc(t('speak.teil'+x.teil))+'</h2>';
  if(x.img)h+='<img class="bild" src="'+esc(x.img)+'" alt="'+esc(x.alt||'')+'" loading="lazy">';
  else if(x.sc)h+='<div class="scene" aria-hidden="true">'+esc(x.sc)+'</div>';
  h+='<div class="prompt" lang="de" dir="ltr">'+esc(x.q).replace(/\n/g,'<br>')+'</div>'+(x.pts?'<ul class="pts" lang="de" dir="ltr">'+x.pts.map(function(p){return '<li>'+esc(p)+'</li>';}).join('')+'</ul>':'');
  h+='<p class="small muted">'+esc(t('speak.how'+x.teil))+'</p>';
  h+='<div class="row">'+sayBtn(x.q,t('speak.hear'))+'<button class="btn small ghost" data-a="timer" id="tmr">⏱ '+fmt(T.left)+'</button></div>';
  if(!T.shown)h+='<div class="foot"><button class="btn" data-a="model">'+esc(x.teil===2?t('speak.desc'):t('speak.model'))+'</button></div>';
  else{h+='<div class="tx" lang="de" dir="ltr"><div class="eyebrow" dir="auto">'+esc(t('speak.modelh'))+'</div>'+(x.model||[]).map(function(m,i){return '<p>'+(x.steps?'<b>'+esc(x.steps[i]||'')+'</b><br>':'')+esc(m)+'</p>';}).join('')+'</div><div>'+sayBtn((x.model||[]).join(' '),t('speak.hearmodel'))+'</div>'+
    '<p class="small">'+esc(t('speak.rate'))+'</p><div class="foot"><button class="btn" data-a="srate" data-v="1">'+esc(t('speak.good'))+'</button><button class="btn ghost" data-a="srate" data-v="0">'+esc(t('speak.hard'))+'</button></div>';}
  return h;}
function fmt(s){return Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60;}
function gapHtml(s,pi){var gi=0;return esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g,function(_,a,hn){var id=pi+'_'+(gi++),v=T.vals[id]||'',cls=T.tries[id]==null?'':(T.tries[id]==='ok'?' good':' bad');
  return '<input class="gap'+cls+'" data-g="'+id+'" data-ans="'+esc(a)+'" value="'+esc(v)+'" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="'+esc(t('run.gap'))+'"'+(T.ok?' disabled':'')+'><span class="hint" dir="auto">'+esc(hn)+(T.tries[id]>=2?' → <b>'+esc(a)+'</b>':'')+'</span>';});}
function vWrite(x){var h='<h2>'+esc(t('write.h'))+'</h2><div class="prompt" lang="de" dir="ltr">'+esc(x.sit)+'<ul class="pts">'+x.p.map(function(p){return '<li>'+esc(p)+'</li>';}).join('')+'</ul></div><p class="small muted">'+esc(t('write.how'))+'</p>';
  h+='<div class="wb" lang="de" dir="ltr"><div class="pt"><div class="eyebrow">'+esc(t('write.greet'))+'</div>'+esc(x.g)+'</div>';
  x.b.forEach(function(opts,i){h+='<div class="pt"><div class="eyebrow" dir="auto">'+esc(t('write.point',{n:i+1}))+' · '+esc(x.p[i])+'</div><div class="ideas">'+opts.map(function(o,j){return '<button class="idea'+(T.sel[i]===j?' on':'')+'" data-a="idea" data-p="'+i+'" data-j="'+j+'" dir="auto">'+esc(L(o[0]))+'</button>';}).join('')+'</div>'+(T.sel[i]>=0?'<div class="sent">'+gapHtml(opts[T.sel[i]][1],i)+'</div>':'')+'</div>';});
  h+='<div class="pt"><div class="eyebrow" dir="auto">'+esc(t('write.close'))+'</div>'+esc(x.c).replace(/\n/g,'<br>')+'</div></div>';
  if(T.ok){var full=assemble(x);h+='<div class="tx" lang="de" dir="ltr">'+esc(full).replace(/\n/g,'<br>')+'</div><div>'+sayBtn(full,t('btn.listen'))+'</div><p class="small">'+esc(t('write.after'))+'</p><div class="foot"><button class="btn" data-a="next">'+esc(t('btn.next'))+'</button></div>';}
  else h+='<div class="foot"><button class="btn" data-a="wcheck">'+esc(t('btn.check'))+'</button></div>';
  return h;}
function assemble(x){return x.g+'\n\n'+x.b.map(function(o,i){return o[T.sel[i]][1].replace(/\{([^|}]+)\|[^}]+\}/g,'$1');}).join(' ')+'\n\n'+x.c;}
function vRun(){var st=R.q[R.pos],pct=Math.round(R.pos/R.q.length*100);
  var h='<div class="runhead"><button class="x" data-a="quit">✕ '+esc(t('run.quit'))+'</button><div class="bar acc grow"><i style="width:'+pct+'%"></i></div></div><section class="lesson">';
  if(st.k==='card'){var c=st.c;h+='<div class="eyebrow">'+esc(R.L.title)+'</div><h1>'+esc(L(c.h))+'</h1>'+(c.t?'<p>'+esc(L(c.t))+'</p>':'')+(c.de?'<div class="tx" lang="de" dir="ltr">'+c.de.map(function(l){return esc(l);}).join('<br>')+'</div>'+sayBtn(c.de.join(' '),t('btn.listen')):'')+'<div class="foot"><button class="btn" data-a="next">'+esc(t('btn.next'))+'</button></div>';}
  else{if(!T)initTask(st.t);h+=vTask(st);}
  return h+'</section>';}
function norm(s){return String(s).trim().toLowerCase().replace(/ß/g,'ss').replace(/[.,!?;:'"„“”‚‘’«»]/g,'').replace(/\s+/g,' ');}
function settle(right){var st=R.q[R.pos],x=st.t;T.done=true;T.right=right;S.seen[x._k]=today();
  if(right){if(st.first)R.ok++;else R.fixed++;if(S.missed[x._k]&&(R.L.kind!=='lesson'||!st.first))delete S.missed[x._k];}
  else{S.missed[x._k]=(S.missed[x._k]||0)+1;R.q.push({k:'task',t:x,first:false});}
  render();}
function check(){var x=R.q[R.pos].t,ok=false;
  if(x.t==='mc'||x.t==='listen'||x.t==='read'){if(x.t==='listen'&&!T.plays)return toast(t('toast.listenfirst'));ok=T.sel===x.a;stopSay();}
  if(x.t==='fill'){T.val=$('#fillin').value;var v=norm(T.val);if(!v)return toast(t('toast.empty'));ok=x.a.some(function(a){return norm(a)===v;});}
  if(x.t==='order'){var got=norm(T.ans.map(function(j){return x.w[j];}).join(' '));ok=[x.w.join(' ')].concat(x.alt||[]).some(function(a){return norm(a)===got;});}
  settle(ok);}
function next(){stopSay();clearInterval(tmrI);T=null;R.pos++;if(R.pos>=R.q.length)finish();else{render();window.scrollTo(0,0);}}
function finish(){var D=R.L,td=today(),first=S.days[td]===undefined,gain,tasks=R.ok+R.fixed,perfect=R.fixed===0&&tasks>0;
  if(D.kind==='review'){gain=tasks*3;S.reviews++;}
  else if(D.kind==='practice'){gain=R.ok*5+R.fixed*2;S.prac[D.sec]=(S.prac[D.sec]||0)+1;}
  else if(!R.isNew)gain=5;else gain=R.ok*10+R.fixed*5+(D.boss?50:20);
  S.xp+=gain;S.days[td]=(S.days[td]||0)+gain;
  if(R.isNew&&D.kind==='lesson'){S.done[D.id]={d:td,p:perfect?1:0};if(perfect)S.perfect++;if(S.newDay!==td){S.newDay=td;S.newN=0;}S.newN++;}
  var s=streak(),fz=false;if(s>S.best)S.best=s;if(first&&s>0&&s%7===0&&S.freezes<2){S.freezes++;fz=true;}
  save();RES={gain:gain,ok:R.ok,tasks:tasks,streak:s,fz:fz,title:D.title,kind:D.kind,sec:D.sec,isNew:R.isNew,perfect:perfect};R=null;view='result';render();window.scrollTo(0,0);}
function vResult(){var r=RES,lv=level(),ni=nextIdx(),more=ni>=0&&newToday()<capToday();
  var head=r.kind==='review'?t('res.review'):r.kind==='practice'?t('res.prac'):r.isNew?t('res.day'):t('res.again');
  return '<section class="result"><svg class="ecg" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 55 H90 Q100 42 110 55 H128 L138 64 L152 8 L166 78 L176 55 H196 Q214 34 232 55 H400"/></svg><div><div class="eyebrow">'+esc(r.title)+'</div><h1>'+esc(head)+'</h1><p style="margin:8px 0 0">'+esc(t('res.streak',{n:r.streak}))+(r.fz?' '+esc(t('res.freeze')):'')+(r.perfect?' '+esc(t('res.perfect')):'')+'</p></div>'+
  (r.tasks&&r.kind!=='review'?'<div class="stamp" lang="de" dir="ltr">'+(r.perfect?'SEHR GUT':'BESTANDEN')+'</div>':'')+'<div class="stats"><div class="stat"><b class="num">+'+r.gain+'</b><span class="small muted">XP</span></div><div class="stat"><b class="num">'+r.ok+' / '+r.tasks+'</b><span class="small muted">'+esc(t('res.first'))+'</span></div><div class="stat"><b class="num">'+daysLeft()+'</b><span class="small muted">'+esc(t('path.days'))+'</span></div></div>'+
  '<div class="card"><div class="row small" style="justify-content:space-between"><span><b>'+esc(t('lvl.label',{n:lv.i+1}))+'</b> '+esc(lv.name)+'</span><span class="muted num">'+S.xp+(lv.to?' / '+lv.to:'')+' XP</span></div><div class="bar" style="margin-top:6px"><i style="width:'+(lv.to?Math.round((S.xp-lv.from)/(lv.to-lv.from)*100):100)+'%"></i></div></div>'+
  '<div class="foot"><button class="btn" data-a="home">'+esc(t('btn.home'))+'</button>'+(r.kind==='practice'?'<button class="btn ghost" data-a="prac" data-v="'+r.sec+'">'+esc(t('res.more'))+'</button>':(more&&r.kind==='lesson'?'<button class="btn ghost" data-a="open" data-i="'+ni+'">'+esc(t('res.next'))+'</button>':''))+'</div></section>';}

/* cheat sheets */
var NCAT='all', NQ='', NOTE=null, NCATS=['gram','write','speak','exam'];
function notes(){return (C.notes||[]).filter(function(n){return n&&n.id;});}
function md(x){return esc(x).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');}
function plain(x){return String(x).replace(/\*\*/g,'').replace(/…/g,' ');}
function nHay(n){var b=(n.b||[]).map(function(x){return (x.h||'')+' '+(x.head||[]).join(' ')+' '+(x.r||[]).map(function(r){return r.join(' ');}).join(' ')+' '+(x.l||[]).join(' ');}).join(' ');
  return (n.de+' '+L(n.tip)+' '+b).replace(/\*\*/g,'').toLowerCase();}
function vNotes(){var ns=notes(),h=header()+'<section><div class="eyebrow">'+esc(t('tab.notes'))+'</div><h1>'+esc(t('notes.h'))+'</h1><p class="small muted" style="margin:6px 0 0;max-width:60ch">'+esc(t('notes.p'))+'</p></section>';
  if(!ns.length)return h+'<section class="card"><p class="small" style="margin:0">'+esc(t('notes.none'))+'</p></section>';
  h+='<input class="txt nsearch" id="nq" type="search" dir="auto" autocomplete="off" placeholder="'+esc(t('notes.search'))+'" value="'+esc(NQ)+'">';
  h+='<div class="ncats" role="tablist">'+['all'].concat(NCATS).map(function(c){return '<button class="chip'+(NCAT===c?' on':'')+'" role="tab" aria-selected="'+(NCAT===c)+'" data-a="ncat" data-v="'+c+'">'+esc(c==='all'?t('notes.all'):t('notes.cat.'+c))+'</button>';}).join('')+'</div><div class="secs nlist">';
  ns.forEach(function(n){var hide=(NCAT!=='all'&&n.cat!==NCAT)||(NQ&&nHay(n).indexOf(NQ.toLowerCase())<0);
    h+='<button class="sec nrow" data-a="note" data-v="'+esc(n.id)+'" data-cat="'+esc(n.cat)+'" data-q="'+esc(nHay(n))+'"'+(hide?' hidden':'')+'><span class="ico nico" aria-hidden="true">'+esc(n.ico||'📒')+'</span><span class="grow"><span class="tt" lang="de" dir="ltr">'+esc(n.de)+'</span><span class="st">'+esc(nShort(n))+'</span></span><span aria-hidden="true" class="muted chev">›</span></button>';});
  h+='</div><p class="small muted nempty"'+(nVisible()?' hidden':'')+'>'+esc(t('notes.empty'))+'</p>';return h;}
function nShort(n){var x=L(n.tip)||'';var m=x.match(/^[^.。।။۔!?]+/);return m?m[0]:x;}
function nVisible(){return notes().some(function(n){return !((NCAT!=='all'&&n.cat!==NCAT)||(NQ&&nHay(n).indexOf(NQ.toLowerCase())<0));});}
function nFilter(){document.querySelectorAll('.nrow').forEach(function(b){b.hidden=(NCAT!=='all'&&b.dataset.cat!==NCAT)||(NQ&&b.dataset.q.indexOf(NQ.toLowerCase())<0);});var e=document.querySelector('.nempty');if(e)e.hidden=nVisible();}
function vNote(){var n=notes().filter(function(x){return x.id===NOTE;})[0];if(!n)return vNotes();
  var h=header()+'<button class="btn small ghost nback" data-a="nback">← '+esc(t('notes.back'))+'</button><section class="card note"><div class="eyebrow">'+esc(n.ico||'')+' '+esc(t('notes.cat.'+n.cat))+'</div><h1 lang="de" dir="ltr">'+esc(n.de)+'</h1><p class="ntip">'+esc(L(n.tip))+'</p></section>';
  (n.b||[]).forEach(function(b){h+='<section class="card nblock" lang="de" dir="ltr">'+(b.h?'<h3>'+md(b.h)+'</h3>':'');
    if(b.t==='tab'){h+='<div class="ntab'+((b.head||[]).length>=4?' nw':'')+'"><table><thead><tr>'+(b.head||[]).map(function(c){return '<th>'+md(c)+'</th>';}).join('')+'</tr></thead><tbody>'+(b.r||[]).map(function(r){return '<tr>'+r.map(function(c,i){return i===0&&r.length>2?'<th scope="row">'+md(c)+'</th>':'<td>'+md(c)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
    else if(b.t==='say'){h+='<div class="nsay">'+(b.l||[]).map(function(x){return '<button class="nline" data-a="say" data-txt="'+esc(plain(x))+'"><span class="nplay" aria-hidden="true">▶</span><span>'+md(x)+'</span></button>';}).join('')+'</div>';}
    else h+='<ul class="nlst">'+(b.l||[]).map(function(x){return '<li>'+md(x)+'</li>';}).join('')+'</ul>';
    h+='</section>';});
  return h;}
function openNote(id){stopSay();if(view!=='note'){try{history.pushState({dtzNote:1},'');}catch(e){}}NOTE=id;view='note';render();window.scrollTo(0,0);}
function closeNote(){stopSay();NOTE=null;view='notes';render();window.scrollTo(0,0);}
window.addEventListener('popstate',function(){if(view==='note')closeNote();});

/* first-visit tour */
var TOURQ=false, TOUR=-1, TOURN=8, TOURI=['🌐','👋','📅','🏋️','📒','🏁','👤','🗣️'], TOURK=['','0','1','2','n','3','4','5'];
var TOURT=[null,null,'.hero .todaygo','#tabs [data-v="practice"]','#tabs [data-v="notes"]','#tabs [data-v="top"]','#app .hdr .mebtn',null];
function vTour(){if(TOUR<0)return '';var last=TOUR===TOURN-1;
  var spot=TOURT[TOUR]&&document.querySelector(TOURT[TOUR]);
  return '<div class="tour'+(spot?' spot':'')+'" role="dialog" aria-modal="true" aria-labelledby="tourh">'+(spot?'<div class="hole"></div>':'')+'<div class="tourbox">'+(spot?'<span class="tarr"></span>':'')+'<div class="tourico" aria-hidden="true">'+TOURI[TOUR]+'</div>'+(TOUR===0?'<h2 id="tourh" style="font-size:17px">'+LANGHEAD+'</h2>'+langGrid():'<h2 id="tourh">'+esc(t('tour.h'+TOURK[TOUR]))+'</h2><p>'+esc(t('tour.p'+TOURK[TOUR]))+'</p>')+
    '<div class="tourdots">'+Array.from({length:TOURN},function(_,i){return '<i class="'+(i===TOUR?'on':'')+'"></i>';}).join('')+'</div>'+
    '<p class="tourrw">'+esc(t('tour.step',{n:TOUR+1,m:TOURN}))+'</p>'+
    (TOURQ?'<div class="tourq"><p>'+esc(t('tour.skipq'))+'</p><div class="foot"><button class="btn" data-a="tourcont">'+esc(t('tour.cont'))+'</button><button class="linkbtn" data-a="tourskip">'+esc(t('tour.skipyes'))+'</button></div></div>':
    '<div class="foot">'+(last||TOUR===0?'':'<button class="linkbtn" data-a="tourask">'+esc(t('tour.skip'))+'</button>')+'<button class="btn" data-a="tournext">'+esc(last?t('tour.go'):t('tour.next'))+'</button></div>')+'</div></div>';}
/* place the highlight over the target and the tip next to it */
function placeTour(){var box=document.querySelector('.tour.spot');if(!box)return;var el=document.querySelector(TOURT[TOUR]);if(!el)return;
  var r=el.getBoundingClientRect(),vh=window.innerHeight,vw=document.documentElement.clientWidth||window.innerWidth,pad=6,hole=box.querySelector('.hole'),tip=box.querySelector('.tourbox'),arr=box.querySelector('.tarr');
  hole.style.left=(r.left-pad)+'px';hole.style.top=(r.top-pad)+'px';hole.style.width=(r.width+pad*2)+'px';hole.style.height=(r.height+pad*2)+'px';
  var w=Math.min(360,vw-24);tip.style.width=w+'px';var cx=r.left+r.width/2,left=Math.max(12,Math.min(vw-w-12,cx-w/2));tip.style.left=left+'px';
  arr.style.left=Math.max(16,Math.min(w-28,cx-left-8))+'px';
  var above=r.top-pad-14-12,below=vh-r.bottom-pad-14-12;
  if(above>below){tip.style.top='auto';tip.style.bottom=(vh-r.top+pad+14)+'px';tip.style.maxHeight=above+'px';arr.className='tarr down';}
  else{tip.style.bottom='auto';tip.style.top=(r.bottom+pad+14)+'px';tip.style.maxHeight=below+'px';arr.className='tarr up';}
  tip.style.overflow='';if(tip.scrollHeight>tip.clientHeight+2){tip.style.overflow='auto';arr.style.display='none';}else arr.style.display='';}
window.addEventListener('resize',placeTour);window.addEventListener('scroll',placeTour,{passive:true});
function maybeTour(){if(!S.tour&&TOUR<0&&ALL.length&&VIEWS.indexOf(view)>=0&&view!=='watch'){if(view!=='path'){view='path';try{history.replaceState(null,'','#path');}catch(e){}}TOUR=LANGCHOSEN?1:0;}}

/* ---------- render + events ---------- */
function render(){maybeTour();var a=$('#app'),tabs=$('#tabs'),inRun=view==='run'||view==='result'||view==='login'||view==='boot'||view==='nocourse';tabs.hidden=inRun;tabs.style.display=inRun?'none':'';
  a.innerHTML=view==='nocourse'?vNoCourse():view==='login'?vLogin():view==='boot'?vBoot():view==='run'?vRun():view==='result'?vResult():view==='practice'?vPractice():view==='notes'?vNotes():view==='note'?vNote():view==='top'?vTop():view==='progress'?vProg():view==='watch'?vWatch():vPath();
  tabs.classList.add('ready');
  tabs.querySelectorAll('button').forEach(function(b){b.textContent=t('tab.'+b.dataset.v);if(b.dataset.v===view||(view==='note'&&b.dataset.v==='notes'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  var wt=$('#watchtab');if(wt)wt.hidden=!OWNER;
  document.title='DTZ-Puls';
  var old=document.querySelector('.tour');if(old)old.remove();if(TOUR>=0){var tg=TOURT[TOUR]&&document.querySelector(TOURT[TOUR]);if(tg&&tg.closest('#app'))window.scrollBy(0,tg.getBoundingClientRect().top-80);document.body.insertAdjacentHTML('beforeend',vTour());placeTour();}
  var f=$('#fillin');if(f&&!f.disabled&&view==='run')f.focus({preventScroll:true});}
var tmrI=null, resetArmed=false, impArmed=false;
function importCode(v){var o=null;try{o=JSON.parse(decodeURIComponent(escape(atob(v))));}catch(e){}
  if(!o||typeof o!=='object')return null;
  if(o.src==='dtz-trainer'){var n=fix(S);n.xp=Math.max(n.xp,(+o.xp||0));Object.keys(o.days||{}).forEach(function(k){if(n.days[k]===undefined)n.days[k]=10;});if(o.name&&!n.name)n.name=o.name;return n;}
  if(typeof o.xp==='number'&&typeof o.days==='object')return fix(o);return null;}
var A={
  tab:function(el){stopSay();view=el.dataset.v;try{location.hash=view;}catch(e){}render();window.scrollTo(0,0);},
  open:function(el){if(el.getAttribute('aria-disabled'))return toast(t('toast.prev'));openLesson(+el.dataset.i);},
  prac:function(el){openPractice(el.dataset.v);},
  review:openReview, next:next, check:check,
  home:function(){leaveRun();try{if(history.state&&history.state.dtzRun)history.back();}catch(e){}},
  quit:function(){leaveRun();try{if(history.state&&history.state.dtzRun)history.back();}catch(e){}toast(t('toast.quit'));},
  sel:function(el){if(T.done)return;T.sel=+el.dataset.j;render();},
  chip:function(el){if(T.done)return;T.val=el.dataset.v;render();},
  pick:function(el){if(T.done)return;T.ans.push(+el.dataset.j);render();},
  unpick:function(el){if(T.done)return;T.ans=T.ans.filter(function(j){return j!==+el.dataset.j;});render();},
  ml:function(el){T.l=+el.dataset.j;T.bad=null;render();},
  mr:function(el){if(T.l<0)return toast(t('toast.left'));var j=+el.dataset.j,st=R.q[R.pos],x=st.t;
    if(j===T.l){T.ok[j]=1;T.l=-1;T.bad=null;if(Object.keys(T.ok).length===x.pairs.length){var clean=T.err===0;T.done=true;T.right=true;S.seen[x._k]=today();if(clean&&st.first)R.ok++;else R.fixed++;if(!clean)S.missed[x._k]=(S.missed[x._k]||0)+1;else delete S.missed[x._k];}}
    else{T.err++;T.bad=j;}render();},
  say:function(el){say(el,el.dataset.txt,.92);},
  play:function(el){var x=R.q[R.pos].t;if(say(el,x.text,1)){T.plays++;var s=el.parentNode.querySelector('.num');if(s)s.textContent=t('run.plays',{n:T.plays});}},
  timer:function(el){clearInterval(tmrI);T.left=(R.q[R.pos].t.time||60);var me=T;el.textContent='⏱ '+fmt(T.left);
    tmrI=setInterval(function(){if(T!==me){clearInterval(tmrI);return;}T.left--;var b=$('#tmr');if(b){b.textContent='⏱ '+fmt(Math.max(0,T.left));if(T.left<=10)b.style.color='var(--bad)';}if(T.left<=0){clearInterval(tmrI);toast(t('toast.time'));}},1000);},
  model:function(){T.shown=true;clearInterval(tmrI);render();},
  srate:function(el){var good=el.dataset.v==='1';var st=R.q[R.pos];S.seen[st.t._k]=today();if(good){if(st.first)R.ok++;else R.fixed++;delete S.missed[st.t._k];}else{S.missed[st.t._k]=(S.missed[st.t._k]||0)+1;R.fixed++;}next();},
  idea:function(el){var i=+el.dataset.p;T.sel[i]=+el.dataset.j;render();var g=document.querySelector('[data-g^="'+i+'_"]');if(g)g.focus({preventScroll:true});},
  wcheck:function(){var x=R.q[R.pos].t;if(T.sel.some(function(v){return v<0;}))return toast(t('toast.ideas'));var bad=0;
    document.querySelectorAll('input[data-g]').forEach(function(inp){var id=inp.dataset.g;T.vals[id]=inp.value;if(norm(inp.value)===norm(inp.dataset.ans))T.tries[id]='ok';else{bad++;T.tries[id]=(typeof T.tries[id]==='number'?T.tries[id]:0)+1;}});
    if(bad){render();return toast(t('toast.gaps',{n:bad}));}
    T.ok=true;var st=R.q[R.pos];S.seen[x._k]=today();var hadErr=Object.keys(T.tries).some(function(k){return T.tries[k]!=='ok'||false;});if(st.first)R.ok++;else R.fixed++;delete S.missed[x._k];render();},
  logout:function(){if(!SB)return;try{history.replaceState(null,'','#path');}catch(e){}try{localStorage.removeItem(CKEY);}catch(e){}setCourse({weeks:[],bank:{},rules:{}});SB.auth.signOut({scope:'local'}).then(function(){},function(){});onSession(null);},
  retry:function(){view='boot';render();SB.auth.getSession().then(function(r){ME=null;onSession(r&&r.data&&r.data.session);});},
  addcopy:function(){var ta=$('#amsg');ta.select();try{navigator.clipboard.writeText(ta.value).then(function(){toast(t('toast.copied'));},function(){toast(t('toast.copyman'));});}catch(e){toast(t('toast.copyman'));}},
  topjoin:function(){var n=$('#tn');if(n){var v=n.value.trim().slice(0,30);if(!v)return toast(t('top.name'));S.name=v;}S.rank='1';save();TOP.rows=null;render();setTimeout(loadTop,1500);},
  topleave:function(){S.rank='0';save();TOP.rows=null;render();},
  topper:function(el){TOP.period=el.dataset.v;render();},
  'pick-lang':function(el){LANGCHOSEN=true;setLang(el.dataset.v);render();},
  tournext:function(){TOURQ=false;if(TOUR<TOURN-1){TOUR++;render();}else{TOUR=-1;S.tour=1;S.tourDone=1;save();render();toast(t('tour.done'));}},
  tourask:function(){TOURQ=true;render();},
  tourcont:function(){TOURQ=false;render();},
  tourskip:function(){TOURQ=false;TOUR=-1;S.tour=1;save();render();},
  note:function(el){openNote(el.dataset.v);},
  ncat:function(el){NCAT=el.dataset.v;document.querySelectorAll('.ncats .chip').forEach(function(c){var on=c.dataset.v===NCAT;c.classList.toggle('on',on);c.setAttribute('aria-selected',on);});nFilter();},
  nback:function(){try{if(history.state&&history.state.dtzNote){history.back();return;}}catch(e){}closeNote();},
  tour:function(){TOURQ=false;TOUR=LANGCHOSEN?1:0;view='path';try{location.hash='path';}catch(e){}render();},
  wsort:function(el){W.sort=el.dataset.v;render();},
  wopen:function(el){W.open=W.open||{};W.open[el.dataset.v]=!W.open[el.dataset.v];render();},
  theme:function(el){S.theme=el.dataset.v;applyTheme(S.theme);save();render();},
  avatar:function(el){S.avatar=el.dataset.v;save();render();},
  exp:function(){var code=btoa(unescape(encodeURIComponent(JSON.stringify(S)))),ta=$('#code');ta.value=code;ta.select();
    try{navigator.clipboard.writeText(code).then(function(){toast(t('toast.copied'));},function(){toast(t('toast.copyman'));});}catch(e){toast(t('toast.copyman'));}},
  imp:function(){var v=$('#code').value.replace(/\s+/g,'');if(!v)return toast(t('toast.paste'));var o=importCode(v);
    if(!o)return toast(t('toast.badcode'));
    if(o.xp<S.xp&&!impArmed){impArmed=true;setTimeout(function(){impArmed=false;},6000);return toast(t('toast.lessxp',{a:o.xp,b:S.xp}));}
    impArmed=false;var uid=S.uid,em=S.email;S=o;S.uid=uid;S.email=em;S.lang=S.lang||LANG;save();render();toast(t('toast.imported',{n:S.xp}));},
  name:function(){S.name=$('#nm').value.trim().slice(0,30);save();render();toast(t('toast.saved'));},
  reset:function(el){if(!resetArmed){resetArmed=true;el.textContent=t('set.reset2');setTimeout(function(){resetArmed=false;},5000);return;}resetArmed=false;var n=S.name,l=S.lang;S=def();S.name=n;S.lang=l;save();render();toast(t('toast.reset'));}
};
document.addEventListener('click',function(e){var el=e.target.closest('[data-a]');if(!el||el.disabled)return;var f=A[el.dataset.a];if(f)f(el);});
document.addEventListener('change',function(e){if(e.target.id==='upf'&&e.target.files&&e.target.files[0]){doUpload(e.target.files[0]);e.target.value='';return;}if(e.target.dataset&&e.target.dataset.ch==='lang'){setLang(e.target.value);render();}});
document.addEventListener('submit',function(e){if(e.target.id==='lf'){e.preventDefault();doLogin();}if(e.target.id==='af'){e.preventDefault();doAdd();}if(e.target.id==='pwf'){e.preventDefault();doPw();}});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='fillin'){e.preventDefault();check();}});
document.addEventListener('input',function(e){if(e.target.id==='nq'){NQ=e.target.value.trim();nFilter();return;}if(e.target.id==='fillin'&&T)T.val=e.target.value;if(e.target.dataset&&e.target.dataset.g&&T&&T.vals)T.vals[e.target.dataset.g]=e.target.value;});

window.DTZ_APP={t:t,L:L,setCourse:setCourse,state:function(){return S;},current:function(){return R&&R.q[R.pos];}};
applyFreezes();view=cfgOk()?'boot':(ALL.length?fromHash():'nocourse');render();initCloud();
})();
