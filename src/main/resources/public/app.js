const CH=['🐱','🐶','🦊','🐼','🐸','🐵','🐰','🐻','🐯','🦁','🐷','🐮','🐨','🐭','🐺','🦝','🐧','🐥','🦄','🤖','🦉','🦛','🐲','🐝'],
CHN=['Cat','Dog','Fox','Panda','Frog','Monkey','Bunny','Bear','Tiger','Lion','Pig','Cow','Koala','Mouse','Wolf','Raccoon','Penguin','Chick','Unicorn','Robot','Owl','Hippo','Dragon','Bee'],TEAMS={red:'#ef4444',blue:'#3b82f6',green:'#22c55e',yellow:'#eab308'},TSH={red:'●',blue:'■',green:'▲',yellow:'◆'};
const $=id=>document.getElementById(id);
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(IOS){document.querySelectorAll('#rotate .ios').forEach(e=>e.style.display='block');if(!navigator.standalone)$('iosTip').style.display='block'}
/* Forced landscape: if the phone is upright, rotate the UI with CSS and translate touch coordinates to match. */
const Orient=(()=>{const de=document.documentElement;let on=false;
  function apply(){const w=innerWidth,h=innerHeight;on=h>w&&w<=900;de.classList.toggle('lsx',on);if(on){de.style.setProperty('--lw',h+'px');de.style.setProperty('--lh',w+'px')}
  const ew=on?h:w,eh=on?w:h;de.style.setProperty('--vw',ew/100+'px');de.style.setProperty('--vh',eh/100+'px');de.classList.toggle('short',eh<=450);de.classList.toggle('tiny',eh<=360);de.classList.toggle('tall',eh>=600)}
  addEventListener('resize',apply);addEventListener('orientationchange',()=>setTimeout(apply,200));apply();
  return{on:()=>on,w:()=>on?innerHeight:innerWidth,h:()=>on?innerWidth:innerHeight,pt:e=>on?{x:e.clientY,y:innerWidth-e.clientX}:{x:e.clientX,y:e.clientY}}})();
const Net={ping:-1};
let ws,S=null,lastAct=0,token=null,tries=0,rc=0;
try{token=sessionStorage.getItem('tmp_tok')}catch(e){}
function setTok(t){token=t;try{t?sessionStorage.setItem('tmp_tok',t):sessionStorage.removeItem('tmp_tok')}catch(e){}}
function clearTok(){setTok(null);rc=0}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));if(typeof Music!=='undefined'){const g=id==='game';Music.want(true,g?'match':'lobby')}}
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),2600)}
const MAPS=[["forest", "Forest", "Bushes hide you from far players"], ["desert", "Desert", "Quicksand slows you down"], ["snow", "Snow", "Icy patches make you slide"], ["lava", "Lava", "Deadly lava pools"], ["swamp", "Swamp", "Mud slows you down"], ["beach", "Beach", "Tide pools slow you down"], ["candy", "Candy Land", "Launch pads bounce you"], ["space", "Moon Base", "Portals teleport you in pairs"], ["autumn", "Autumn", "Bushes hide you from far players"], ["ruins", "Ancient Ruins", "Portals teleport you in pairs"], ["reef", "Coral Reef", "Launch pads bounce you"], ["mansion", "Haunted Mansion", "Moving floors push you around"]],MAPART={"forest": ["#bae6fd", "<path d=\"M0 80Q50 62 100 80T200 76V120H0Z\" fill=\"#4ade80\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"37\" y=\"62\" width=\"6\" height=\"14\" fill=\"#92400e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"40,34 25,66 55,66\" fill=\"#16a34a\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"152\" y=\"58\" width=\"6\" height=\"14\" fill=\"#92400e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"155,30 140,62 170,62\" fill=\"#15803d\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"100\" cy=\"86\" r=\"11\" fill=\"#22c55e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "desert": ["#fef3c7", "<circle cx=\"160\" cy=\"26\" r=\"14\" fill=\"#fb923c\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M0 86Q50 68 100 86T200 82V120H0Z\" fill=\"#fcd34d\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"94\" y=\"48\" width=\"12\" height=\"40\" rx=\"6\" fill=\"#4ade80\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"80\" y=\"60\" width=\"10\" height=\"18\" rx=\"5\" fill=\"#4ade80\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "snow": ["#e0f2fe", "<path d=\"M0 80Q50 62 100 80T200 76V120H0Z\" fill=\"#fff\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"110\" cy=\"96\" rx=\"38\" ry=\"9\" fill=\"#bae6fd\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"39\" y=\"62\" width=\"6\" height=\"14\" fill=\"#92400e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"42,34 27,66 57,66\" fill=\"#86efac\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"162\" y=\"60\" width=\"6\" height=\"14\" fill=\"#92400e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"165,32 150,64 180,64\" fill=\"#6ee7b7\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "lava": ["#fb923c", "<polygon points=\"140,84 172,34 200,84\" fill=\"#78350f\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M0 88Q50 70 100 88T200 84V120H0Z\" fill=\"#44403c\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"80\" cy=\"98\" rx=\"42\" ry=\"10\" fill=\"#ef4444\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"80\" cy=\"98\" rx=\"22\" ry=\"5\" fill=\"#fde047\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "swamp": ["#d9f99d", "<path d=\"M0 80Q50 62 100 80T200 76V120H0Z\" fill=\"#84cc16\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"58\" cy=\"96\" rx=\"30\" ry=\"8\" fill=\"#92400e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"146\" cy=\"100\" rx=\"26\" ry=\"7\" fill=\"#92400e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"98\" y=\"58\" width=\"8\" height=\"24\" rx=\"3\" fill=\"#fff7ed\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M88 60a14 14 0 0 1 28 0z\" fill=\"#ef4444\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "beach": ["#bae6fd", "<rect x=\"-4\" y=\"56\" width=\"208\" height=\"30\" rx=\"0\" fill=\"#38bdf8\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M0 86Q60 76 120 88T200 84V120H0Z\" fill=\"#fde68a\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M150 54a22 22 0 0 1 44 0z\" fill=\"#ef4444\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M172 54V92\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "candy": ["#fbcfe8", "<path d=\"M0 80Q50 62 100 80T200 76V120H0Z\" fill=\"#f9a8d4\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M52 56V92M150 62V94\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"52\" cy=\"48\" r=\"14\" fill=\"#fde047\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"150\" cy=\"54\" r=\"12\" fill=\"#a78bfa\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "space": ["#1e1b4b", "<circle cx=\"30\" cy=\"20\" r=\"2\" fill=\"#fde68a\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"120\" cy=\"14\" r=\"2\" fill=\"#fde68a\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"170\" cy=\"36\" r=\"2\" fill=\"#fde68a\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M0 84Q50 66 100 84T200 80V120H0Z\" fill=\"#94a3b8\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"50\" cy=\"100\" rx=\"24\" ry=\"7\" fill=\"#64748b\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"130\" cy=\"66\" rx=\"13\" ry=\"24\" fill=\"none\" stroke=\"#22d3ee\" stroke-width=\"6\"/>"], "autumn": ["#fed7aa", "<path d=\"M0 80Q50 62 100 80T200 76V120H0Z\" fill=\"#d97706\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"43\" y=\"56\" width=\"6\" height=\"14\" fill=\"#92400e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"46\" cy=\"48\" r=\"20\" fill=\"#f97316\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"147\" y=\"60\" width=\"6\" height=\"14\" fill=\"#92400e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"150\" cy=\"52\" r=\"18\" fill=\"#ef4444\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "ruins": ["#fde68a", "<path d=\"M0 80Q50 62 100 80T200 76V120H0Z\" fill=\"#a8a29e\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"44\" y=\"44\" width=\"18\" height=\"44\" rx=\"3\" fill=\"#f5f5f4\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"120\" y=\"52\" width=\"18\" height=\"36\" rx=\"3\" fill=\"#f5f5f4\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"170\" cy=\"70\" rx=\"10\" ry=\"18\" fill=\"none\" stroke=\"#22d3ee\" stroke-width=\"5\"/>"], "reef": ["#67e8f9", "<path d=\"M0 92Q50 74 100 92T200 88V120H0Z\" fill=\"#fcd34d\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"48\" y=\"56\" width=\"12\" height=\"38\" rx=\"6\" fill=\"#f472b6\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"66\" y=\"68\" width=\"10\" height=\"26\" rx=\"5\" fill=\"#fb923c\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"150\" y=\"60\" width=\"12\" height=\"34\" rx=\"6\" fill=\"#f472b6\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"110\" cy=\"30\" r=\"6\" fill=\"#fff\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><circle cx=\"122\" cy=\"18\" r=\"4\" fill=\"#fff\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"], "mansion": ["#312e81", "<rect x=\"60\" y=\"48\" width=\"80\" height=\"48\" rx=\"0\" fill=\"#4c1d95\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"52,50 100,18 148,50\" fill=\"#6d28d9\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"72\" y=\"60\" width=\"14\" height=\"16\" rx=\"0\" fill=\"#fde047\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"114\" y=\"60\" width=\"14\" height=\"16\" rx=\"0\" fill=\"#fde047\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"92\" y=\"76\" width=\"16\" height=\"20\" rx=\"0\" fill=\"#78350f\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"-4\" y=\"96\" width=\"208\" height=\"28\" rx=\"0\" fill=\"#78350f\" stroke=\"#0f172a\" stroke-width=\"3\" stroke-linejoin=\"round\"/>"]};
const SHOTS={};
function mapSvg(k){const a=MAPART[k]||MAPART.forest;return '<span class="mv" data-mk="'+k+'">'+(SHOTS[k]?'<img class="mshot" alt="" src="'+SHOTS[k]+'">':'<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="120" fill="'+a[0]+'"/>'+a[1]+'</svg>')+'</span>'}
function mapCards(box,sel,pick){box.innerHTML='';MAPS.forEach(m=>{const b=document.createElement('button');b.type='button';b.className='mc2'+(m[0]===sel?' sel':'');b.innerHTML='<span class="th">'+mapSvg(m[0])+'</span><span class="nmx">'+m[1]+'</span>';b.setAttribute('aria-pressed',String(m[0]===sel));b.onclick=()=>pick(m[0]);box.append(b)})}
function open(first){
  const w=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');ws=w;
  w.onopen=()=>{tries=0;w.send(first||JSON.stringify({t:'resume',token}))};
  w.onmessage=e=>on(JSON.parse(e.data));
  w.onclose=()=>{if(ws===w)lost()};
  w.onerror=()=>{if(!S&&!rc)toast('Cannot reach server')};
}
function go(m){
  if(rc)return; // reconnecting: nothing is sent until the seat is back
  const s=JSON.stringify(m);
  if(ws&&ws.readyState===1){ws.send(s);return}
  if(ws&&ws.readyState===0){ws.addEventListener('open',()=>ws.send(s),{once:true});return}
  open(s);
}
// the connection dropped: keep the screen and try to take the seat back (the server holds it for 15 seconds)
function lost(){
  if(S&&token){
    rc=1;
    if(++tries>8){clearTok();S=null;GameUI.stop();show('home');toast('Disconnected');return}
    if(tries===1)toast('Connection lost — reconnecting…');
    setTimeout(()=>{if(rc)open()},Math.min(1200*tries,3500));
  }else{rc=0;if(S){S=null;GameUI.stop();show('home');toast('Disconnected')}}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S&&token&&!rc&&(!ws||ws.readyState>1))lost()});
function on(m){
  if(m.t==='lobby'){const first=!S||GameUI.active;S=m;render();if(pend&&S.hostId===S.you){go({t:'settings',map:pend.map,mode:pend.mode,target:pend.target});pend=null}if(first){if(!GameUI.active)$('log').innerHTML='';GameUI.stop();show('lobby')}}
  else if(['init','round','state','ev','scores'].includes(m.t))GameUI.on(m);
  else if(m.t==='chat'){const d=document.createElement('div'),b=document.createElement('b');b.textContent=m.from+': ';d.append(b,m.text);const l=$('log');l.append(d);l.scrollTop=l.scrollHeight}
  else if(m.t==='pong'){Net.ping=Date.now()-m.ts}
  else if(m.t==='welcome'){setTok(m.token);if(rc){rc=0;toast('Reconnected ✅')}try{const a=localStorage.getItem('tmp_acc');if(a!==null&&a!=='-1')go({t:'profile',acc:+a})}catch(e){}if(ME&&ME.favorite>=0)go({t:'profile',character:ME.favorite});if(practice){practice=false;for(let i=0;i<3;i++)go({t:'addbot'});go({t:'settings',map:'forest',mode:'solo',target:2});go({t:'start'})}}
  else if(m.t==='resumefail'){clearTok();S=null;GameUI.stop();show('home');toast(m.msg);if(ws)ws.close()}
  else if(m.t==='kicked'){clearTok();S=null;GameUI.stop();show('home');toast(m.msg)}
  else if(m.t==='error'){pend=null;toast(m.msg);if(!S&&!rc&&ws)ws.close()}
}
function btn(cls,txt,fn){const b=document.createElement('button');b.className=cls;b.textContent=txt;b.onclick=fn;return b}
const MI={solo:'Everyone for themselves. Hold the property for 30 seconds to score.',team:'Teammates never steal from each other. Your team shares the score.',blitz:'⚡ 15 second rounds and everyone is fast. Pure chaos!',shrink:'🌊 Water closes in every round. Hold the middle to survive!',potato:'🥔 The longer you hold the property, the slower you get. Pass it on!',double:'🏠🏠 Two properties are in play at once. Hold one until time runs out to score!',survivor:'🏆 The arena closes in. The last player standing wins the round!',hotswap:'🔀 The property jumps to a random player every 9 seconds.',arena:'🥊 A tiny map with non-stop action.',chaos:'🎪 Lucky blocks twice as often and special moves recharge twice as fast.'};
function render(){
  const me=S.players.find(p=>p.id===S.you),host=S.hostId===S.you,team=S.mode==='team';
  $('rc').textContent=S.code;$('pc').textContent=S.players.length+'/'+(S.max||15);
  const pl=$('plist');pl.innerHTML='';
  S.players.forEach(p=>{
    const d=document.createElement('div');d.className='pl'+(p.off?' off':'');
    const av=document.createElement('span');av.className='av';av.textContent=CH[p.character];av.style.background=team?TEAMS[p.team]:'#bae6fd';
    const nm=document.createElement('span');nm.className='nm';nm.textContent=(team?TSH[p.team]+' ':'')+p.name+(p.bot?' 🤖':'')+(p.id===S.you?' (you)':'')+(p.id===S.hostId?' 👑':'')+(p.off?' (reconnecting…)':'');
    d.append(av,nm);
    if(p.ready&&!p.bot)d.append(Object.assign(document.createElement('span'),{className:'rdy',textContent:'✅ Ready'}));
    else if(!p.bot)d.append(Object.assign(document.createElement('span'),{className:'rdy wait',textContent:'Waiting'}));
     if(host&&p.id!==S.you){const k=btn('kick','✕',()=>go({t:'kick',id:p.id}));k.title=p.bot?'Remove bot':'Kick player';k.setAttribute('aria-label',k.title);d.append(k)}
    pl.append(d);
  });
  const ch=$('chars');ch.innerHTML='';
  CH.forEach((e,i)=>{const taken=S.players.some(p=>p.id!==S.you&&p.character===i);
    const b=btn('chip'+(me.character===i?' sel':'')+(taken?' taken':''),e,()=>go({t:'profile',character:i}));b.title=CHN[i]+(taken?' (taken)':'');b.disabled=taken;ch.append(b)});
  const ai=ABIL[me.character%ABIL.length];$('abInfo').textContent='Special move: '+ai[0]+' '+ai[1]+' — '+ai[2]+' ('+ai[3]+'s recharge, key Q)';
  const ac=$('accs');ac.innerHTML='';const myAcc=me.acc==null?-1:me.acc;
  const accBtn=(lbl,title,val)=>{const b=btn('chip'+(myAcc===val?' sel':''),lbl,()=>{try{localStorage.setItem('tmp_acc',String(val))}catch(e){}go({t:'profile',acc:val})});b.title=title;ac.append(b)};
  accBtn('🎲','Surprise me (automatic)',-1);ACC.forEach((a,i)=>accBtn(a[0],a[1],i));
  const tm=$('teams');tm.innerHTML='';
  Object.keys(TEAMS).forEach(k=>{const b=btn('dot'+(me.team===k?' sel':''),'',()=>go({t:'profile',team:k}));b.style.background=TEAMS[k];b.textContent=TSH[k];b.className+=' tsh';b.disabled=!team;tm.append(b)});
  
  $('modeInfo').textContent=MI[S.mode]||'';
  if(typeof R3D!=='undefined'){try{if(!render.pv){render.pv=1;if(!R3D.previewStart($('prev')))$('prev').style.display='none'}R3D.previewSet(me.character,team?TEAMS[me.team]:'#334155',me.id,me.acc)}catch(err){console.error(err);$('prev').style.display='none'}}
  $('pfb').textContent=CH[me.character];$('pfb').style.display=$('prev').style.display==='none'?'flex':'none';$('map').value=S.map;syncMap();$('mode').value=S.mode;$('target').value=S.target;$('tv').textContent=S.target;
  ['map','mode','target'].forEach(i=>$(i).disabled=!host);
  const nr=S.players.filter(p=>p.ready||p.bot).length;
  $('start').style.display=host?'':'none';$('start').textContent='Start Match ('+nr+'/'+S.players.length+' ready)';
  $('addbot').style.display=host?'':'none';$('addbot').disabled=S.players.length>=(S.max||15);
  $('ready').textContent=me.ready?'✅ Ready (tap to cancel)':'I’m ready';
}
const settings=()=>go({t:'settings',map:$('map').value,mode:$('mode').value,target:+$('target').value});
['map','mode','target'].forEach(i=>$(i).onchange=settings);
$('target').oninput=()=>$('tv').textContent=$('target').value;
const ACC=[['🎀','Bow'],['🎉','Party hat'],['👓','Glasses'],['🌸','Flower'],['⭐','Star clips'],['👑','Crown'],['🎩','Top hat'],['🐱','Cat band'],['😇','Halo'],['🕶️','Sunglasses'],['🧙','Wizard hat'],['🚫','No accessory']];
let practice=false,pend=null;
const UID=(()=>{let u='';try{u=localStorage.getItem('tmp_uid')||''}catch(e){}if(!u){u=((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Math.random()).slice(2)+Date.now().toString(36)).replace(/[^A-Za-z0-9]/g,'');try{localStorage.setItem('tmp_uid',u)}catch(e){}}return u})();
$('create').onclick=()=>{buildHost();show('host');shootMaps(HS.map)};
$('practice').onclick=()=>{practice=true;pend=null;go({t:'create',name:myName(),uid:UID,acct:AT})};
$('lbBtn').onclick=()=>{$('lb').classList.add('on');const b=$('lbBody');b.textContent='Loading…';
 fetch('/api/leaderboard?uid='+encodeURIComponent(UID)).then(r=>r.json()).then(d=>{
  b.textContent='';const add=(t,c)=>{const p=document.createElement('div');p.className=c||'lbr';p.textContent=t;b.append(p);return p};
  if(!d.on){add('The leaderboard is not set up yet. The server owner needs to add a database.','sub');return}
  if(d.error){add('Could not load the leaderboard. Try again soon.','sub');return}
  if(d.me)add('You: '+d.me.wins+' wins · '+d.me.matches+' matches · '+d.me.steals+' steals · '+d.me.blocks+' lucky blocks','lbme');
  add('Top players','lbh');
  if(!d.top.length)add('No matches recorded yet. Play one!','sub');
  d.top.forEach((r,i)=>add((['🥇','🥈','🥉'][i]||(i+1)+'.')+' '+r.name+' — '+r.wins+' wins ('+r.matches+' matches, '+r.steals+' steals)'));
  if(d.recent&&d.recent.length){add('Recent matches','lbh');d.recent.forEach(r=>add('🗺️ '+r.map+' · '+r.mode+' · winner '+r.winner+' · '+r.players+' players'))}
 }).catch(()=>{b.textContent='Could not load the leaderboard.'})};
$('lbClose').onclick=()=>$('lb').classList.remove('on');
/* ---- account: create, read, update, delete, login, logout (saved by the server in a file) ---- */
let AT='';try{AT=localStorage.getItem('tmp_acct')||''}catch(e){}
let ME=null;
const api=(method,url,body)=>fetch(url,{method,headers:{'Content-Type':'application/json','X-Token':AT},body:body?JSON.stringify(body):undefined}).then(r=>r.json().then(j=>{if(!r.ok)throw new Error(j.error||'Something went wrong');return j}));
function setAcct(token,profile){AT=token||'';ME=profile||null;try{if(ME)localStorage.setItem('tmp_acct',AT);else localStorage.removeItem('tmp_acct')}catch(e){}
 paintProfile()}
if(AT)api('GET','/api/account').then(p=>setAcct(AT,p)).catch(()=>setAcct('',null));
let acctMode='login';
function renderAcct(msg,isErr){
 const b=$('acctBody');b.textContent='';if(ME)$('acct').querySelector('h1').textContent='Account';
 const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
 const field=(label,type,val,max)=>{const l=mk('label','field',label),i=document.createElement('input');i.type=type;i.value=val||'';i.maxLength=max||(type==='password'?64:16);l.append(i);b.append(l);return i};
 const btnE=(text,cls,fn)=>{const x=mk('button',cls,text);x.onclick=fn;b.append(x);return x};
 if(msg)b.append(mk('div',isErr?'lbme err':'lbme',msg));
 if(!ME){
  const reg=acctMode==='register';$('acct').querySelector('h1').textContent=reg?'Create account':'Log in';
  if(!reg){const lu=field('Username','text'),lp=field('Password','password');
   const go1=()=>api('POST','/api/account/login',{username:lu.value.trim(),password:lp.value}).then(j=>{setAcct(j.token,j.profile);renderAcct('Welcome back, '+j.profile.displayName+'!')}).catch(e=>renderAcct(e.message,true));
   btnE('Log in','pri',go1);lp.addEventListener('keydown',e=>{if(e.key==='Enter')go1()});
   btnE('No account yet? Register','',()=>{acctMode='register';renderAcct()});setTimeout(()=>lu.focus(),50)}
  else{const ru=field('Username (3-16 letters, numbers or _)','text'),rp=field('Password (6 or more characters)','password'),rd=field('Display name shown in games','text','',12);
   btnE('Create account','pri',()=>api('POST','/api/account/register',{username:ru.value.trim(),password:rp.value,displayName:rd.value.trim()}).then(j=>{setAcct(j.token,j.profile);renderAcct('Account created! You are logged in.')}).catch(e=>renderAcct(e.message,true)));
   btnE('Already have an account? Log in','',()=>{acctMode='login';renderAcct()});setTimeout(()=>ru.focus(),50)}
  return}
 b.append(mk('div','lbme','👤 '+ME.username+' · joined '+new Date(ME.created).toLocaleDateString()));
 b.append(mk('div','lbr','Display name: '+ME.displayName));
 b.append(mk('div','lbr','Favorite animal: '+(ME.favorite>=0?CH[ME.favorite]+' '+CHN[ME.favorite]:'none')));
 b.append(mk('div','lbr','Matches '+ME.matches+' · Wins '+ME.wins+' · Steals '+ME.steals));
 b.append(mk('div','lbh','Edit profile'));
 const ed=field('Display name','text',ME.displayName,12);
 const fs=document.createElement('select');[['-1','No favorite']].concat(CH.map((c,i)=>[String(i),c+' '+CHN[i]])).forEach(o=>{const op=document.createElement('option');op.value=o[0];op.textContent=o[1];fs.append(op)});fs.value=String(ME.favorite);
 const fl=mk('label','field','Favorite animal');fl.append(fs);b.append(fl);
 const cp=field('Current password (only needed to change it)','password'),np=field('New password','password');
 btnE('Save changes','pri',()=>api('PUT','/api/account',{displayName:ed.value.trim(),favorite:+fs.value,currentPassword:cp.value,newPassword:np.value}).then(p=>{setAcct(AT,p);renderAcct('Saved ✅')}).catch(e=>renderAcct(e.message,true)));
 btnE('Log out','',()=>api('POST','/api/account/logout').catch(()=>0).then(()=>{setAcct('',null);renderAcct('You are logged out.')}));
 b.append(mk('div','lbh','Delete account'));
 const dp=field('Type your password to delete','password');
 btnE('Delete my account','dng',()=>{if(!confirm('Delete your account for good?'))return;api('DELETE','/api/account',{password:dp.value}).then(()=>{setAcct('',null);renderAcct('Account deleted.')}).catch(e=>renderAcct(e.message,true))})}
$('acctBtn').onclick=()=>{acctMode='login';$('acct').classList.add('on');renderAcct()};
$('regBtn').onclick=()=>{acctMode='register';$('acct').classList.add('on');renderAcct()};
$('setBtn').onclick=()=>$('gearH').click();
$('tutBtn').onclick=()=>{const b=document.querySelector('.help-home');if(b)b.click()};
$('acctClose').onclick=()=>$('acct').classList.remove('on');
$('ready').onclick=()=>go({t:'ready'});
$('addbot').onclick=()=>go({t:'addbot'});
$('invite').onclick=()=>{const url=location.origin+location.pathname+'?code='+S.code;
  if(navigator.share){navigator.share({title:'That’s My Property',text:'Join my room '+S.code,url}).catch(()=>{})}
  else{navigator.clipboard&&navigator.clipboard.writeText(url);toast('Invite link copied')}};
$('leave').onclick=()=>{pend=null;go({t:'leave'});S=null;clearTok();if(ws)ws.close();show('home')};
setInterval(()=>{if(S&&!rc&&ws&&ws.readyState===1)ws.send(JSON.stringify({t:'ping',ts:Date.now()}))},2000);
if(token){rc=1;open()} // page was refreshed: try to take the old seat back
$('start').onclick=()=>go({t:'start'});
$('copy').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(S.code);toast('Code copied')};
const sendChat=()=>{const v=$('msg').value.trim();if(v){go({t:'chat',text:v});$('msg').value=''}};
$('send').onclick=sendChat;$('msg').onkeydown=e=>{if(e.key==='Enter')sendChat()};
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{const n=Date.now();if(S&&n-lastAct>10000){lastAct=n;go({t:'active'})}}));
document.addEventListener('click',()=>{try{const p=screen.orientation.lock('landscape');if(p&&p.catch)p.catch(()=>{})}catch(e){}},{once:true});


/* real 3D renders of each map (the same scenery the match uses); the drawn pictures show until each one is ready */
let shotRun=false;
const mapScreenOpen=()=>['host','lobby'].some(id=>$(id).classList.contains('on'))||$('mapPick').classList.contains('on');
function shootMaps(first){if(shotRun||typeof R3D==='undefined'||!R3D.mapShot)return;const keys=MAPS.map(m=>m[0]).filter(k=>!SHOTS[k]);if(!keys.length)return;
 const i=keys.indexOf(first);if(i>0){keys.splice(i,1);keys.unshift(first)}
 shotRun=true;
 const next=()=>{if(document.hidden||!mapScreenOpen()){shotRun=false;return}const k=keys.shift();if(!k){shotRun=false;return}
  let u=null;try{u=R3D.mapShot(k,360,216)}catch(e){}
  if(u){SHOTS[k]=u;document.querySelectorAll('.mv[data-mk="'+k+'"]').forEach(e=>{e.innerHTML='<img class="mshot" alt="" src="'+u+'">'})}
  setTimeout(next,250)};
 setTimeout(next,250)}
/* ---- Sunny Meadow screens: profile card, Host a room, Join a room, map picker, 3D preview controls ---- */
const guestName=()=>{let g='';try{g=localStorage.getItem('tmp_guest')||''}catch(e){}if(!g){g='Guest'+Math.floor(1000+Math.random()*9000);try{localStorage.setItem('tmp_guest',g)}catch(e){}}return g};
const myName=()=>ME?ME.displayName:guestName();
function paintProfile(){const n=myName();$('pname').textContent=n;$('pav').textContent=n.charAt(0).toUpperCase();$('psub').textContent=ME?'Logged in':'Playing as a guest';$('jname').textContent=n;$('acctTxt').textContent=ME?'Account':'Log in';$('regBtn').style.display=ME?'none':'';$('outBtn').style.display=ME?'':'none'}
paintProfile();
$('outBtn').onclick=()=>api('POST','/api/account/logout').catch(()=>0).then(()=>setAcct('',null));
const HS={map:'forest',mode:'solo',target:5};
function buildHost(){mapCards($('hMaps'),HS.map,k=>{HS.map=k;buildHost()});const m=MAPS.find(x=>x[0]===HS.map);$('hArt').innerHTML=mapSvg(m[0]);$('hName').textContent=m[1];$('hTag').textContent=m[2];
 const mc=$('hModes');mc.innerHTML='';[...$('mode').options].forEach(o=>{const b=document.createElement('button');b.type='button';b.className='mchip'+(o.value===HS.mode?' sel':'');b.textContent=o.textContent;b.setAttribute('aria-pressed',String(o.value===HS.mode));b.onclick=()=>{HS.mode=o.value;buildHost()};mc.append(b)});
 const rn=$('hRace');rn.innerHTML='';for(let i=1;i<=10;i++){const b=document.createElement('button');b.type='button';b.className='rnum'+(i===HS.target?' sel':'');b.textContent=i;b.setAttribute('aria-pressed',String(i===HS.target));b.onclick=()=>{HS.target=i;buildHost()};rn.append(b)}}
$('hostGo').onclick=()=>{pend={map:HS.map,mode:HS.mode,target:HS.target};go({t:'create',name:myName(),uid:UID,acct:AT})};
$('hostBack').onclick=()=>show('home');
const cbs=[...document.querySelectorAll('#joinS .cb')];
const fillCode=t=>{t=(t||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);cbs.forEach((x,j)=>x.value=t[j]||'');return t};
cbs.forEach((c,i)=>{c.addEventListener('input',()=>{c.value=c.value.toUpperCase().replace(/[^A-Z]/g,'').slice(-1);if(c.value&&cbs[i+1])cbs[i+1].focus()});
 c.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!c.value&&cbs[i-1]){cbs[i-1].focus();cbs[i-1].value=''}else if(e.key==='Enter')$('joinGo').click()});
 c.addEventListener('paste',e=>{e.preventDefault();const t=fillCode((e.clipboardData||window.clipboardData).getData('text'));cbs[Math.min(t.length,3)].focus()})});
$('join').onclick=()=>{paintProfile();show('joinS');cbs[0].focus()};
$('joinBack').onclick=()=>show('home');
$('joinGo').onclick=()=>{const code=cbs.map(c=>c.value).join('');if(code.length!==4){toast('Enter the 4-letter room code');return}go({t:'join',name:myName(),code,uid:UID,acct:AT})};
{const c=new URLSearchParams(location.search).get('code');if(c){fillCode(c);paintProfile();show('joinS')}}
function syncMap(){if(!S)return;shootMaps(S.map);const m=MAPS.find(x=>x[0]===S.map)||MAPS[0],host=S.hostId===S.you;$('mapArt').innerHTML=mapSvg(m[0]);$('mapName').textContent=m[1];$('mapTag').textContent=m[2];$('mapBtn').disabled=!host;$('mapChg').style.display=host?'':'none'}
let pk='forest';
function buildPick(){mapCards($('pMaps'),pk,k=>{pk=k;buildPick()});const m=MAPS.find(x=>x[0]===pk);$('pArt').innerHTML=mapSvg(pk);$('pName').textContent=m[1];const t=$('pTags');t.innerHTML='';[m[2],'Bigger with more players','A natural disaster each round'].forEach((x,i)=>{const s=document.createElement('span');s.className='mchip'+(i?'':' sel');s.textContent=x;t.append(s)})}
$('mapBtn').onclick=()=>{if(S&&S.hostId===S.you){pk=S.map;buildPick();$('mapPick').classList.add('on');shootMaps(pk)}};
$('mapUse').onclick=()=>{$('map').value=pk;settings();$('mapPick').classList.remove('on')};
$('mapX').onclick=()=>$('mapPick').classList.remove('on');
$('mapPick').addEventListener('pointerdown',e=>{if(e.target===$('mapPick'))$('mapPick').classList.remove('on')});
$('rotL').onclick=()=>{if(typeof R3D!=='undefined'&&R3D.previewRotate)R3D.previewRotate(-.7)};
$('rotR').onclick=()=>{if(typeof R3D!=='undefined'&&R3D.previewRotate)R3D.previewRotate(.7)};
;window.__ld_app=1;
