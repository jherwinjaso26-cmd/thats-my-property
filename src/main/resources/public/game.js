/* "That's My Property" - match client: renders server state on a canvas.
   Uses globals from index.html (S, go, show, CH, TEAMS, TSH, $) and fx.js (SFX, Sprites, Ambient, Minimap, FS, Settings). */
const GameUI=(()=>{
const EF='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',R=18,SPEED=240;
const TH={
 forest:{g:['#3d7a37','#4a8c42','#336b2f'],acc:'#f4e04d',tuft:'#2a5f27',ob:['🌲','🪨'],leaf:['#2f7d32','#3c9a3f','#256628']},
 desert:{g:['#d9b26b','#e3c07e','#c9a059'],acc:'#a86b32',tuft:'#b58b45',ob:['🌵','🪨'],mud:'#b8863f'},
 snow:{g:['#e4eef7','#d3e3f1','#f4f9fd'],acc:'#9ec5e8',tuft:'#b8cfe3',ob:['🎄','🧊']},
 lava:{g:['#3a2a2a','#4a3030','#2c1e1e'],acc:'#ff6a1a',tuft:'#1a1010',ob:['🪨','🌋']},
 swamp:{g:['#3b4a2a','#46572f','#313f23'],acc:'#a3e635',tuft:'#27331b',ob:['🍄','🪵'],mud:'#4a3417'},
 beach:{g:['#f1d9a0','#e9cf8e','#f7e6b8'],acc:'#fda4af',tuft:'#c9a866',ob:['🌴','🐚'],edge:'rgba(14,165,233,.6)',mud:'#38bdf8'},
 candy:{g:['#f9a8d4','#f472b6','#fbcfe8'],acc:'#fde047',tuft:'#db2777',ob:['🍭','🧁']},
 space:{g:['#1e1b4b','#312e81','#27235f'],acc:'#fde68a',tuft:'#4338ca',ob:['🌑','🛸']},
 autumn:{g:['#b45309','#c2610c','#9a4a08'],acc:'#fbbf24',tuft:'#7c2d12',ob:['🍁','🎃'],leaf:['#c2410c','#d97706','#9a3412']},
 ruins:{g:['#4b5563','#525c6b','#3f4753'],acc:'#a1a1aa',tuft:'#27272a',ob:['🏛️','🪨']},
 reef:{g:['#e9d5a1','#f1e2b4','#d9c58c'],acc:'#fb7185',tuft:'#2dd4bf',ob:['🪸','🐚'],edge:'rgba(14,165,233,.5)'},
 mansion:{g:['#3b2f4f','#463a5c','#2f2540'],acc:'#a78bfa',tuft:'#1e1830',ob:['🪦','🎃'],leaf:['#4c3a6e','#5b4682','#3b2d58']}};
const PW={speed:['⚡','Speed Boost!','#facc15'],shield:['🛡️','Shield up!','#38bdf8'],trap:['🪤','Bear trap! Press E or tap 🪤 to place it','#cbd5e1'],freeze:['🥶','You froze yourself for 3s!','#bae6fd'],
 smoke:['💨','Smoke bomb! You are hard to see for 4s','#e2e8f0'],swap:['🔀','Swapped places with another player!','#c084fc'],decoy:['👥','Decoy placed! It looks just like you','#fde68a'],magnet:['🧲','Magnet! Longer steal reach for 6s','#f87171'],jump:['🦘','Super jump!','#34d399'],reveal:['👁️','Reveal! You can see everyone for 6s','#fde047'],ghost:['👻','Ghost! Walk through obstacles for 4s','#c4b5fd'],tele:['🌀','Teleport!','#67e8f9'],mine:['💣','Mine dropped! Stay away from it yourself.','#ef4444']};
const DIS={METEOR:['☄️','Meteor Shower','Red circles show where meteors land. Move out before they hit.'],
 LIGHTNING:['⚡','Lightning Storm','Yellow circles mark lightning strikes. They hit fast!'],
 TORNADO:['🌪️','Tornado','Tornadoes chase the nearest player. Keep moving and dash away.'],
 FLOOD:['🌊','Rising Flood','Water rises from the edges. In water you are slow and drown after 2.5s. Stay in the middle!'],
 SINKHOLE:['🕳️','Sinkholes','Brown circles open into holes that stay open and kill on touch.'],
 HAIL:['🧊','Hailstorm','Lots of small ice strikes. Watch the blue circles.'],
 BOULDER:['🪨','Rolling Boulders','A red lane warns where a boulder will roll across the whole map. Leave the lane!']};
const MODS={NIGHT:['🌙','Night round','You can only see what is close to you. Other players hide in the dark.'],SPEEDY:['💨','Speedy round','Everyone moves 30% faster!']};
const MAPTIP={forest:'🌿 Bushes hide you from players who are far away.',desert:'🏜️ Quicksand slows you down.',snow:'🧊 Ice patches make you slide.',lava:'🔥 Lava pools burn. Stay out!',
 swamp:'🟫 Mud slows you down.',beach:'🌊 Tide pools slow you down.',candy:'🍬 Bounce pads launch you forward.',space:'🌀 Portals teleport you to their twin.',
 autumn:'🍂 Leaf piles hide you from players who are far away.',ruins:'🌀 Ancient gates teleport you to their twin.',reef:'🫧 Bubble jets launch you forward.',mansion:'👻 Moving floors push you along. Watch the arrows!'};
const EMO=['👋','😂','😡','😱','😎','🙏','🔥','😭','GG!','Nice!','Oops!','Help!'];
let streak=0,lastRobber=null;
/* lifetime stats and a daily challenge, kept on this device */
const Stats=(()=>{const K='tmp_stats',D='tmp_daily',GOALS=[['steals',5,'Steal the property 5 times'],['blocks',3,'Open 3 lucky blocks'],['matches',2,'Play 2 matches']];
 let s={steals:0,blocks:0,matches:0},d=null;
 try{Object.assign(s,JSON.parse(localStorage.getItem(K)||'{}'));d=JSON.parse(localStorage.getItem(D)||'null')}catch(e){}
 const day=()=>new Date().toISOString().slice(0,10),save=()=>{try{localStorage.setItem(K,JSON.stringify(s));localStorage.setItem(D,JSON.stringify(d))}catch(e){}};
 function fresh(){if(!d||d.day!==day()){const n=[...day()].reduce((a,c)=>a+c.charCodeAt(0),0)%GOALS.length;d={day:day(),g:n,prog:0,done:false};save()}return d}
 return{add(k,n){s[k]=(s[k]||0)+n;const c=fresh(),g=GOALS[c.g];if(!c.done&&g[0]===k){c.prog+=n;if(c.prog>=g[1]){c.done=true;setTimeout(()=>{banner('🎯 Daily challenge complete!');SFX.play('win')},1200)}}save()},
  line(){const c=fresh(),g=GOALS[c.g];return '📊 Steals '+s.steals+' · Matches '+s.matches+' · 🎯 '+g[2]+': '+(c.done?'done ✅':Math.min(c.prog,g[1])+'/'+g[1])}}})();
function applyCb(){const c=Settings.get('cb');TEAMS.red=c?'#e69f00':'#ef4444';TEAMS.blue=c?'#56b4e9':'#3b82f6'}
function tutorial(){let seen=false;try{seen=localStorage.getItem('tmp_tut')==='1'}catch(e){}if(seen)return;try{localStorage.setItem('tmp_tut','1')}catch(e){}
 ['🕹️ Drag on the screen to move (or use WASD)','⚡ Tap ⚡ (or press Space) to dash','🏠 Touch the glowing holder to steal the property!','🎁 Grab lucky blocks for power-ups'].forEach((t,i)=>setTimeout(()=>{if(active)banner(t)},9000+i*5200))}
const MODE={survivor:['🏆','Last Survivor','The arena closes in. The last player standing wins the round!'],hotswap:['🔀','Hot Swap','The property jumps to a random player every 9 seconds.'],arena:['🥊','Small Arena','A tiny map with non-stop action.'],chaos:['🎪','Chaos','Lucky blocks twice as often and special moves recharge twice as fast.'],double:['🏠🏠','Two Properties','Two properties are in play at once. Hold one until time runs out to score!'],potato:['🥔','Hot Potato','The longer you hold the property, the slower you get. Pass it on!'],blitz:['⚡','Blitz','15 second rounds and everyone is speedy. Fast and furious!'],shrink:['🌊','Shrinking Arena','The water closes in during every round. Stay in the middle!']};
const PWS={speed:'pw_speed',shield:'pw_shield',trap:'pw_trap',freeze:'bad',smoke:'pw_smoke',swap:'swap',decoy:'pw_decoy',magnet:'pw_magnet',jump:'pw_jump',reveal:'pw_reveal',ghost:'pw_ghost',tele:'pw_tele',mine:'pw_mine'};
const WARN={m:{ms:1600,c:'239,68,68',s:'#ef4444'},l:{ms:900,c:'250,204,21',s:'#facc15'},h:{ms:1000,c:'147,197,253',s:'#93c5fd'},s:{ms:1800,c:'161,98,7',s:'#d97706'}};
let el,cv,ctx,traps=[],zones=[],decals=[],emotes=[],mod='',disaster='METEOR',flashes=[],spec=null,active=false,raf=0,lt=0,init=null,st=null,obs=[],pos={},names={},rows=[],bg=null,parts=[],shake=0,lastKey='',lastSent='',lastSendAt=0,camX=0,camY=0,vw=0,vh=700,use3d=false,revealUntil=0,accDt=0,fSkip=false,autoHalf=false;
const keys=new Set(),joy={on:false,id:null,ox:0,oy:0,x:0,y:0};
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const nm=id=>(names[id]||{}).name||'?';
const qc={},q=s=>qc[s]||(qc[s]=el.querySelector(s));
const setT=(n,v)=>{if(n._t!==v){n._t=v;n.textContent=v}},setS=(n,k,v)=>{if(n['_'+k]!==v){n['_'+k]=v;n.style[k]=v}};
let qual=1,ema=16,slow=0,fpsN=0,fpsT=0,fps=0;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const vib=ms=>{if(Settings.get('vibe')&&navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}};
const shk=v=>{if(Settings.get('shake'))shake=Math.max(shake,v)};
const shape=team=>init&&init.mode==='team'&&TSH[team]?' '+TSH[team]:'';

function build(){
 el=document.createElement('section');el.id='game';el.className='screen';
 el.innerHTML=`<canvas></canvas>
 <div id="hPulse" class="ov"></div><div id="hHeld" class="ov"></div><div id="hTop" class="ov"><span id="hRound"></span><div id="hTimer"><span id="hT">30</span><i id="hBar"></i></div><span id="hHold"></span></div>
 <div id="hNet" class="ov"></div><div id="hFeed" class="ov"></div><div id="hScores" class="ov"></div><div id="hFx" class="ov"></div><button id="hLeave" class="ghost">Leave</button><button id="hMute" class="ghost">🔊</button><button id="hCam" class="ghost" title="Camera">📷</button><button id="hSnap" class="ghost" title="Screenshot">📸</button>
 <div id="popup" class="ov"></div><div id="banner" class="ov"></div><div id="sb" class="ov"></div>
 <button id="hEmT" class="ghost" aria-label="Emotes">💬</button>
 <div id="hEm">${EMO.map((e,i)=>`<button data-e="${i}" class="${e.length>2?'ph':''}" aria-label="Emote ${i+1}">${e}</button>`).join('')}</div>
 <button id="hSpec" class="ghost" style="display:none">👁 Next player</button><button id="hItem" style="display:none">🪤<small>E</small></button><button id="hAb" style="display:none"></button><button id="hDash">⚡<small></small></button><div id="joy"><i></i></div>`;
 document.body.append(el);el.append(FS.button('fs-game'));cv=el.querySelector('canvas');ctx=cv.getContext('2d');R3D.attach(el,cv);
 addEventListener('resize',resize);
 addEventListener('keydown',e=>{if(!active)return;if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;keys.add(e.code);
  if(e.code==='Space'||e.code==='ShiftLeft'){tryDash();e.preventDefault()}
  if(e.code==='KeyE'||e.code==='KeyF')go({t:'use'});
  if(e.code==='KeyQ')useAbility();
  const m=/^Digit([1-6])$/.exec(e.code);if(m)go({t:'emote',e:+m[1]-1})});
 addEventListener('keyup',e=>keys.delete(e.code));
 q('#hDash').addEventListener('pointerdown',e=>{e.preventDefault();tryDash()});
 q('#hAb').addEventListener('pointerdown',e=>{e.preventDefault();useAbility()});
 q('#hSpec').onclick=specNext;
 q('#hMute').textContent=SFX.muted?'🔇':'🔊';q('#hMute').onclick=()=>{q('#hMute').textContent=SFX.toggle()?'🔇':'🔊';Music.want(true,'match')};
 const sideSet=()=>{el.classList.toggle('lefty',!!Settings.get('lefty'));el.classList.toggle('bigtext',!!Settings.get('big'));el.style.setProperty('--bs',Settings.get('btn')||1);applyCb()};sideSet();Settings.on(k=>{if(k==='lefty'||k==='btn'||k==='cb'||k==='big')sideSet()});
 q('#hSnap').onclick=()=>{if(!use3d){banner('📸 Screenshots work in 3D mode');return}R3D.snapshot(c=>{if(!c){banner('Could not take a screenshot');return}c.toBlob(b=>{if(!b)return;const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='thats-my-property.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)});banner('📸 Saved!')})};
 q('#hCam').onclick=()=>{const o=['tilt','top','close'],n=o[(o.indexOf(Settings.get('cam'))+1)%3];Settings.set('cam',n);banner('📷 Camera: '+{tilt:'Tilted',top:'Top-down',close:'Close-up'}[n])};
 q('#hItem').addEventListener('pointerdown',e=>{e.preventDefault();go({t:'use'})});
 let emTimer=0;const emOpen=on=>{const p=q('#hEm');p.classList.toggle('open',on);clearTimeout(emTimer);if(on)emTimer=setTimeout(()=>p.classList.remove('open'),5000)};
 q('#hEmT').addEventListener('pointerdown',e=>{e.preventDefault();emOpen(!q('#hEm').classList.contains('open'))});
 q('#hEm').addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(b){e.preventDefault();go({t:'emote',e:+b.dataset.e});emOpen(true)}});
 q('#hLeave').onclick=()=>{go({t:'leave'});S=null;clearTok();stop();if(ws)ws.close();show('home')};
 el.addEventListener('pointerdown',e=>{const p=Orient.pt(e);if(e.pointerType==='mouse'||e.target.closest('button')||joy.on||(Settings.get('lefty')?p.x<Orient.w()*.4:p.x>Orient.w()*.6))return;
  joy.on=true;joy.id=e.pointerId;joy.ox=p.x;joy.oy=p.y;const j=q('#joy');j.style.display='block';j.style.left=p.x+'px';j.style.top=p.y+'px'});
 addEventListener('pointermove',e=>{if(!joy.on||e.pointerId!==joy.id)return;const p=Orient.pt(e),dx=p.x-joy.ox,dy=p.y-joy.oy,l=Math.hypot(dx,dy),k=Math.min(1,l/50);
  joy.x=l?dx/l*k:0;joy.y=l?dy/l*k:0;const n=q('#joy i');n.style.transform=`translate(${joy.x*35}px,${joy.y*35}px)`});
 const up=e=>{if(joy.on&&e.pointerId===joy.id){joy.on=false;joy.x=joy.y=0;q('#joy').style.display='none'}};
 addEventListener('pointerup',up);addEventListener('pointercancel',up);
}
function resize(){const d=Math.min(devicePixelRatio||1,use3d?1.25:2)*qual;cv.width=Math.round(Orient.w()*d);cv.height=Math.round(Orient.h()*d);
 if(use3d)R3D.resize(Orient.w(),Orient.h(),Math.min(devicePixelRatio||1,Math.min(R3D.quality>=3?2:R3D.quality===2?1.5:1,R3D.crowd?1.25:9))*qual)}
function fallback2D(){use3d=false;R3D.stop();if(init)bake(1);resize()}
const feed=t=>{const f=q('#hFeed'),d=document.createElement('div');d.textContent=t;f.append(d);while(f.children.length>4)f.firstChild.remove();setTimeout(()=>d.remove(),5200)};
function visAlpha(p,g,watcher){if(performance.now()<revealUntil)return p.sm>0?.55:1;const other=p.id!==S.you,far=other&&watcher?Math.hypot(g.sx-watcher.sx,g.sy-watcher.sy):0;
 if(other&&watcher&&mod==='NIGHT'&&far>340)return -1;if(other&&watcher&&far>140&&p.a&&inBush(g))return -1;
 return p.sm>0?(other&&far>100?.15:.55):(p.id===S.you&&inBush(g)?.75:1)}
/* Weak phones: if frames stay slow, quietly lower the canvas resolution (down to 60%); also shows ping + fps in the corner. */
function perf(t,raw){fpsN++;ema=ema*.95+Math.min(raw,100)*.05;
 if(ema>(use3d?30:40)){if(++slow>(use3d?150:240)){slow=0;if(use3d&&R3D.lower()){}else if(qual>(use3d?.6:.8)){qual=Math.max(use3d?.6:.8,qual-.1);resize()}else if(use3d)autoHalf=true}}else slow=0; // as a last resort draw 30 frames per second // only for really slow devices (under ~25fps for several seconds)
 if(t-fpsT>500){fps=Math.round(fpsN*1000/(t-fpsT));fpsN=0;fpsT=t;const p=Net.ping,c=p<0?'#94a3b8':p<80?'#86efac':p<160?'#fde047':'#f87171';
  const n=q('#hNet');setT(n,(p<0?'📶 …':'📶 '+p+'ms')+' · '+fps+'fps'+(st&&st.ms!=null?' · srv '+st.ms+'ms':'')+(use3d?' · 3D':'')+(qual<1?' · low-res':''));setS(n,'color',c)}}

function bake(sc){
 const W=init.w,H=init.h,t=TH[init.map]||TH.forest,r=mulberry(init.seed);
 const k=sc||1;bg=document.createElement('canvas');bg.width=Math.round(W*k);bg.height=Math.round(H*k);const x=bg.getContext('2d');x.scale(k,k);
 x.fillStyle=t.g[0];x.fillRect(0,0,W,H);
 for(let i=0;i<W*H/5000;i++){x.globalAlpha=.5;x.fillStyle=t.g[1+(r()*2|0)];x.beginPath();x.ellipse(r()*W,r()*H,40+r()*130,30+r()*90,r()*3,0,7);x.fill()}
 x.globalAlpha=1;x.strokeStyle=t.tuft;x.lineWidth=2;
 for(let i=0;i<W*H/900;i++){const a=r()*W,b=r()*H;x.beginPath();x.moveTo(a,b);x.lineTo(a-3,b-8);x.moveTo(a,b);x.lineTo(a+3,b-9);x.stroke()}
 x.fillStyle=t.acc;for(let i=0;i<W*H/9000;i++){x.beginPath();x.arc(r()*W,r()*H,2+r()*3,0,7);x.fill()}
 x.strokeStyle=t.edge||'rgba(0,0,0,.3)';x.lineWidth=90;x.strokeRect(0,0,W,H);x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=24;x.strokeRect(0,0,W,H);
}

function on(m){
 if(m.t==='init'){if(!active){applyCb();streak=0;lastRobber=null;Stats.add('matches',1);tutorial()}init=m;if(m.you&&!S)S={you:m.you};names={};m.players.forEach(p=>names[p.id]={name:p.name,ch:p.character,team:p.team});
  pos={};st=null;obs=[];rows=[];parts=[];zones=[];decals=[];emotes=[];mod='';lastKey='';autoHalf=false;accDt=0;use3d=R3D.available();
  if(use3d){bake(Math.min(1,2048/Math.max(m.w,m.h)));use3d=R3D.init(Object.assign({},m,{you:(S&&S.you)||m.you}),bg)}
  if(!use3d){R3D.hide();bake(1)}
  Ambient.init(m.map);AmbSound.start(m.map);active=true;show('game');resize();lt=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}
 else if(!init)return;
 else if(m.t==='round'){obs=m.obstacles;traps=m.traps;zones=m.zones||[];mod=m.mod||'';disaster=m.disaster;flashes=[];decals=[];spec=null;lastKey='';abReady=0;SFX.play('fanfare');if(m.round%4===0)setTimeout(()=>banner('🌧️ It is raining!'),1600);if(use3d){try{R3D.setRound(m)}catch(e){console.error(e);fallback2D()}}}
 else if(m.t==='state'){
  m.p=m.p.map(a=>({id:a[0],x:a[1],y:a[2],dc:a[3],d:!!a[4],a:!!a[5],sp:a[6],sh:a[7],fz:a[8],tr:a[9],it:!!a[10],wt:a[11],sm:a[12],off:!!a[13]}));
  ['ho','lb','bt'].forEach(k=>{if(m[k]===undefined)m[k]=st?st[k]:[]}); // the server only resends these when they change
  st=m;m.p.forEach(p=>{const g=pos[p.id]||(pos[p.id]={sx:p.x,sy:p.y,px:p.x,py:p.y});g.x=p.x;g.y=p.y})}
 else if(m.t==='ev'){
  const dd=(x,y)=>{const g=pos[S.you];return g?Math.hypot(x-g.sx,y-g.sy):0};
  if(use3d){try{R3D.fx(m,pos,S.you)}catch(e){console.error(e)}}
  if(m.k==='steal'||m.k==='pass'){SFX.play('steal');if(m.k==='steal'){if(m.to===S.you){streak++;Stats.add('steals',1);if(m.from===lastRobber){lastRobber=null;setTimeout(()=>{banner('😈 Revenge! 🛡️ Short shield');SFX.play('point')},900)}else if(streak>=2)setTimeout(()=>{banner('🔥 '+streak+' steals in a row!'+(streak%3===0?' ⚡ Speed boost!':''));SFX.play('point')},900)}if(m.from===S.you){streak=0;lastRobber=m.to}}const g=pos[m.to];if(g){burst(g.sx,g.sy,'#facc15',28);shk(m.k==='steal'?14:6)}banner('🏠 '+nm(m.to)+(m.k==='steal'?' stole the property!':' got the property!'));feed(m.k==='steal'?'🏠 '+nm(m.to)+' stole it from '+nm(m.from):'🏠 '+nm(m.to)+' got the property');if(m.to===S.you||m.from===S.you)vib(80)}
  else if(m.k==='die'){const g=pos[m.id];SFX.at('die',g?dd(g.sx,g.sy):0);if(g)burst(g.sx,g.sy,'#ef4444',30);feed('💀 '+nm(m.id)+' died');if(m.id===S.you){vib([120,60,200]);banner('💀 You died — spectating until next round');el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),450)}}
  else if(m.k==='boom'){const bm={m:['boom',16,'#fb923c'],s:['boom',12,'#a16207'],h:['zap',5,'#bfdbfe'],l:['zap',8,'#fef08a']}[m.hk]||['zap',8,'#fef08a'],d=dd(m.x,m.y);
   if(m.hk!=='h'||Math.random()<.3){SFX.at(bm[0],d);if(m.hk==='l'){SFX.at('crack',d);setTimeout(()=>SFX.at('thunder',d+500),120+d*.35)}}
   if(!use3d)flashes.push({x:m.x,y:m.y,r:m.r,t:m.hk,l:24});shk(bm[1]*(d<600?1:.4));burst(m.x,m.y,bm[2],m.hk==='h'?10:24);
   if(m.hk!=='s'&&!use3d){decals.push({x:m.x,y:m.y,r:m.r*(m.hk==='h'?.8:1),k:m.hk});if(decals.length>70)decals.shift()}}
  else if(m.k==='power'){const g=pos[m.id];if(g)burst(g.sx,g.sy,PW[m.pw][2],22);if(m.id===S.you){Stats.add('blocks',1);if(m.pw==='reveal')revealUntil=performance.now()+6000;SFX.play(PWS[m.pw]||'power');banner(PW[m.pw][0]+' '+PW[m.pw][1])}else if(g)SFX.at('pop',dd(g.sx,g.sy))}
  else if(m.k==='snap'){SFX.at('snap',dd(m.x,m.y));burst(m.x,m.y,'#cbd5e1',18);shk(8);feed('🪤 '+nm(m.id)+' got trapped');if(m.id===S.you){vib(150);banner('🪤 Trapped for 3s!')}}
  else if(m.k==='bounce'){burst(m.x,m.y,'#f472b6',16);if(near(m.x,m.y))SFX.play('bounce')}
  else if(m.k==='tp'){burst(m.fromx,m.fromy,'#a78bfa',22);burst(m.x,m.y,'#67e8f9',22);if(m.id===S.you){SFX.play('tp');banner('🌀 Teleported!')}else if(near(m.x,m.y))SFX.play('tp')}
  else if(m.k==='swap'){const a=pos[m.a],b=pos[m.b];if(a)burst(a.sx,a.sy,'#c084fc',20);if(b)burst(b.sx,b.sy,'#c084fc',20);feed('🔀 '+nm(m.a)+' swapped with '+nm(m.b));
   if(m.a===S.you||m.b===S.you){SFX.play('swap');banner('🔀 Swapped with '+nm(m.a===S.you?m.b:m.a)+'!')}}
  else if(m.k==='boss'){banner('🌪️ BOSS ROUND! A giant tornado is hunting you');feed('🌪️ Boss round: giant tornado!');SFX.play('warn');setTimeout(()=>SFX.play('thunder'),300);shk(14)}
  else if(m.k==='ability'){const a=ABIL[m.ab];if(a){const g=pos[m.id],d=g?dd(g.sx,g.sy):0;if(m.id===S.you){abReady=performance.now()+a[3]*1000*(init&&init.mode==='chaos'?.5:1);banner(a[0]+' '+a[1]+'!');SFX.play(ABS[a[6].split(' ')[0]]||'pop');if(a[6].indexOf('reveal')>=0)revealUntil=performance.now()+(a[7]||6000);shk(4)}else{SFX.at('pop',d);feed(a[0]+' '+nm(m.id)+' used '+a[1])}}}
  else if(m.k==='role'){const nmR={sprinter:['⚡','Sprinter','+15% speed this round'],grabber:['🧤','Grabber','longer steal reach this round']}[m.role];if(nmR){if(m.id===S.you){banner(nmR[0]+' You are the '+nmR[1]+': '+nmR[2]);SFX.play('pw_speed')}else feed(nmR[0]+' '+nm(m.id)+' is the '+nmR[1])}}
  else if(m.k==='emote'){emotes.push({id:m.id,e:m.e,t:performance.now()});if(emotes.length>24)emotes.shift();if(m.id!==S.you)SFX.at('emote',dd((pos[m.id]||{sx:0}).sx||0,(pos[m.id]||{sy:0}).sy||0))}}
 else if(m.t==='scores'){rows=m.rows;showScores(m);SFX.play(m.winner?'win':'point')}
}
function near(x,y){const me=pos[S.you];return !me||Math.hypot(x-me.sx,y-me.sy)<700}
function stop(){active=false;AmbSound.stop();Music.tense(false);try{R3D.stop()}catch(e){}use3d=false;cancelAnimationFrame(raf);init=null;st=null;pos={};keys.clear();joy.on=false;if(el){['#popup','#sb','#hScores','#hEmT'].forEach(s=>{q(s).style.display='none';q(s)._display=undefined})}}
function banner(t){const b=q('#banner');b.textContent=t;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function burst(x,y,c,n){if(use3d)return;for(let i=0;i<n;i++){const a=Math.random()*6.3,s=1+Math.random()*4;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:30,m:30,c,s:2+Math.random()*3})}}

function showScores(m){
 const html=m.rows.map((r,i)=>`<div class="r"><i class="md">${['🥇','🥈','🥉'][i]||''}</i><span style="font-size:22px;flex:none">${r.team?`<i class="tdot" style="background:${TEAMS[r.team]}">${TSH[r.team]||''}</i>`:CH[r.ch]}</span><span>${esc(r.label)}</span><b>${r.pts}</b></div>`).join('');
 const aw=(m.awards||[]).map(a=>`<div class="aw"><span>${a.icon}</span><div><b>${esc(a.title)}</b><br>${esc(a.name)} · ${esc(a.val)}</div></div>`).join('');
 const note=m.winner?'Returning to lobby…':m.holderName?`🏠 ${esc(m.holderName)}${m.holderName2?' & '+esc(m.holderName2):''} kept the property. Next round starting…`:'Next round starting…';
 q('#sb').innerHTML=`<div class="card"><h2>${m.winner?'🏆 '+esc(m.winner)+' wins!':m.none?'💀 No survivors — no point':'Round '+m.round+' complete'}</h2>${html}${aw?`<div class="awards">${aw}</div>`:''}<p>${note}</p><p class="stat">${Stats.line()}</p></div>`;
 q('#hScores').innerHTML=m.rows.map(r=>`${r.team?`<b style="color:${TEAMS[r.team]}">${TSH[r.team]||'●'}</b>`:CH[r.ch]} ${r.pts}`).join('<br>');q('#hScores').style.display='block';
}

function vec(){let x=0,y=0;
 if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;
 if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;
 if(x||y){const l=Math.hypot(x,y);x/=l;y/=l}
 return joy.on?[joy.x,joy.y]:[x,y]}

function inZone(g,k,x,y){for(const z of zones)if(z.k===k&&Math.hypot((x===undefined?g.sx:x)-z.x,(y===undefined?g.sy:y)-z.y)<z.r)return z;return null}
const inBush=g=>!!inZone(g,'bush');

/* Client-side prediction: your own character moves instantly with your input and is gently pulled toward the server's position. */
function predictMe(g,mine,dt){
 const ix=vec(),can=st.ph==='PLAY'&&mine&&mine.a&&!mine.off&&mine.fz<=0&&mine.tr<=0&&!mine.d&&!inZone(g,'ice',g.px,g.py);
 if(can){
  let mul=1;if(mine.sp>0)mul*=1.6;if(mine.wt>0)mul*=.55;if(st.holder===S.you||st.holder2===S.you)mul*=1.06;if(mod==='SPEEDY')mul*=1.3;
  const sl=inZone(g,'slow',g.px,g.py);if(sl)mul*=sl.p;
  g.px=Math.max(R,Math.min(init.w-R,g.px+ix[0]*SPEED*mul*dt));g.py=Math.max(R,Math.min(init.h-R,g.py+ix[1]*SPEED*mul*dt));
  for(const o of obs){const ex=g.px-o[0],ey=g.py-o[1],d=Math.hypot(ex,ey),min=R+o[2]*.85;if(d<min&&d>.001){g.px=o[0]+ex/d*min;g.py=o[1]+ey/d*min}}
  const ex=g.x-g.px,ey=g.y-g.py,e=Math.hypot(ex,ey);
  if(e>110){g.px=g.x;g.py=g.y}else{const k=1-Math.pow(1-.18,dt*60);g.px+=ex*k;g.py+=ey*k}
  const mx=g.px-g.sx,my=g.py-g.sy,ml=Math.hypot(mx,my);g.mv=ml>.3||Math.hypot(ix[0],ix[1])>.1;if(ml>.3){g.fx=mx/ml;g.fy=my/ml}
  g.sx=g.px;g.sy=g.py;return true}
 g.px=g.x;g.py=g.y;return false}

function frame(t){
 if(!active)return;raf=requestAnimationFrame(frame);
 const raw=t-lt,dt=Math.min(.05,Math.max(.001,raw/1000));lt=t;perf(t,raw);
 const [ix,iy]=vec(),k=ix.toFixed(2)+','+iy.toFixed(2);
 if(k!==lastSent&&t-lastSendAt>40){lastSent=k;lastSendAt=t;go({t:'input',x:+ix.toFixed(2),y:+iy.toFixed(2)})}
 if(!st)return;
 const mine=st.p.find(p=>p.id===S.you),dead=!!mine&&!mine.a;
 for(const id in pos){const g=pos[id];
  if(id===S.you&&predictMe(g,mine,dt))continue;
  const ddx=g.x-g.sx,ddy=g.y-g.sy,dl=Math.hypot(ddx,ddy);g.mv=dl>2;if(g.mv){g.fx=ddx/dl;g.fy=ddy/dl}g.sx+=(g.x-g.sx)*.4;g.sy+=(g.y-g.sy)*.4}
 const me=pos[S.you],view=dead?(pos[specId()]||me):me,z=cv.height/700;vw=cv.width/z;vh=700;const W=init.w,H=init.h;
 let cx=view?view.sx:W/2,cy=view?view.sy:H/2;
 cx=Math.max(vw/2,Math.min(W-vw/2,cx));cy=Math.max(vh/2,Math.min(H-vh/2,cy));
 let ox=0,oy=0;if(shake>0){ox=(Math.random()-.5)*shake;oy=(Math.random()-.5)*shake;shake*=.85;if(shake<.3)shake=0}
 camX=cx-vw/2+ox;camY=cy-vh/2+oy;
 const watcher=dead?null:me;
 if(use3d){try{accDt+=dt;fSkip=!fSkip;if(!((Settings.get('fps30')||autoHalf)&&fSkip)){R3D.frame({t,dt:accDt,st,pos,you:S.you,mine,dead,watcher,mod,disaster,emotes,EMO,dash:!!(mine&&mine.d),view:{x:view?view.sx:W/2,y:view?view.sy:H/2},shake:shake>0?[ox,oy]:null,vis:(p,g)=>visAlpha(p,g,watcher)});accDt=0}}catch(err){console.error('3D renderer failed, switching to 2D',err);fallback2D()}}
 if(!use3d){
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
 ctx.drawImage(bg,camX,camY,vw,vh,0,0,cv.width,cv.height);
 ctx.setTransform(z,0,0,z,-camX*z,-camY*z);
 drawGround(t);
 const items=[];
 for(const o of obs)if(o[0]>camX-100&&o[0]<camX+vw+100&&o[1]>camY-100&&o[1]<camY+vh+100)items.push([o[1]+o[2]*.6,()=>drawObs(o,t)]);
 for(const p of st.p){const g=pos[p.id];if(p.d)burst(g.sx,g.sy+10,p.id===S.you?'#facc15':'#ffffff',1);
  const other=p.id!==S.you,far=other&&watcher?Math.hypot(g.sx-watcher.sx,g.sy-watcher.sy):0;
  if(other&&watcher&&mod==='NIGHT'&&far>340)continue;                 // night: the dark hides distant players
  if(other&&watcher&&far>140&&p.a&&inBush(g))continue;                // bushes hide you from distant players
  const al=p.sm>0?(other&&far>100?.15:.55):(p.id===S.you&&inBush(g)?.75:1);
  items.push([g.sy,()=>drawP(p,g,t,al)])}
 for(const d of st.dc||[]){const a={x:d[0],y:d[1],ch:d[2],hold:d[3],id:d[4]};
  if(watcher&&mod==='NIGHT'&&Math.hypot(a.x-watcher.sx,a.y-watcher.sy)>340)continue;
  items.push([a.y,()=>drawDecoy(a,t)])}
 items.sort((a,b)=>a[0]-b[0]);items.forEach(i=>i[1]());
 drawAir(t);if(!dead)drawArrow(me);
 parts=parts.filter(p=>p.l>0);for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.l--;ctx.globalAlpha=p.l/p.m;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,7);ctx.fill()}ctx.globalAlpha=1;
 }
 ctx.setTransform(1,0,0,1,0,0);if(use3d)ctx.clearRect(0,0,cv.width,cv.height);
 if(mod==='NIGHT'&&watcher&&st.ph!=='SCORE'){const sp=use3d?R3D.toScreen(watcher.sx,watcher.sy):null,sx=sp?sp.x*cv.width/Orient.w():(watcher.sx-camX)*z,sy=sp?sp.y*cv.height/Orient.h():(watcher.sy-camY)*z,rad=300*z,gr=ctx.createRadialGradient(sx,sy,rad*.3,sx,sy,rad);
  gr.addColorStop(0,'rgba(4,8,28,0)');gr.addColorStop(1,'rgba(4,8,28,.94)');ctx.fillStyle=gr;ctx.fillRect(0,0,cv.width,cv.height)}
 if(!use3d)Ambient.draw(ctx,cv.width,cv.height,t);Minimap.draw(ctx,{cw:cv.width,ch:cv.height,init,st,obs,traps,zones,pos,names,you:S.you,cam:[camX,camY,vw,vh]});
 hud(me,dead);wetCheck(st.p.find(p=>p.id===S.you),dead);
}

function drawObs(o,t){const[x,y,r,v]=o;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+r*.7,r*1.05,r*.4,0,0,7);ctx.fill();
 const sway=v%2===0?Math.sin(t*.0015+x*.01)*.04:0;ctx.save();ctx.translate(x,y+r*.6);ctx.rotate(sway);
 ctx.font=`${r*2.5}px ${EF}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(TH[init.map].ob[v%2],0,-r*.7);ctx.restore()}

function drawP(p,g,t,al){ctx.save();ctx.globalAlpha=al;drawBody(p,g,t);ctx.restore()}
function drawBody(p,g,t){
 const info=names[p.id]||{ch:0,name:'?',team:'red'},x=g.sx,y=g.sy,hold=st.holder===p.id||st.holder2===p.id;
 if(p.a===false){ctx.font=`32px ${EF}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🪦',x,y);ctx.font='bold 12px system-ui,sans-serif';ctx.fillStyle='#fff9';ctx.fillText(info.name,x,y-26);return}
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+R+4,R,R*.38,0,0,7);ctx.fill();
 if(init.mode==='team'){ctx.strokeStyle=TEAMS[info.team];ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y+R+4,R+5,R*.46,0,0,7);ctx.stroke()}
 if(hold){const gr=ctx.createRadialGradient(x,y,4,x,y,50+Math.sin(t*.008)*4);gr.addColorStop(0,'rgba(250,204,21,.6)');gr.addColorStop(1,'rgba(250,204,21,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,56,0,7);ctx.fill()}
 Sprites.draw(ctx,info.ch,x,y,t,g.mv,g.fx||1,g.fy||0,p.d);ctx.textAlign='center';ctx.textBaseline='middle';
 if(p.sh>0){ctx.fillStyle=`rgba(56,189,248,${.25+Math.sin(t*.01)*.08})`;ctx.strokeStyle='rgba(125,211,252,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y+2,34,0,7);ctx.fill();ctx.stroke()}
 if(p.sm>0){ctx.fillStyle='rgba(226,232,240,.55)';for(let i=0;i<5;i++){const a=t*.002+i*1.26;ctx.beginPath();ctx.arc(x+Math.cos(a)*16,y+Math.sin(a*1.3)*14,13+Math.sin(t*.004+i)*2,0,7);ctx.fill()}}
 if(p.sp>0&&g.mv&&Math.random()<.6)parts.push({x:x-6+Math.random()*12,y:y+R,vx:(Math.random()-.5)*.6,vy:-.2,l:14,m:14,c:'#fde68a',s:3});
 if(p.fz>0){ctx.fillStyle='rgba(186,230,253,.55)';ctx.strokeStyle='#e0f2fe';ctx.lineWidth=3;ctx.beginPath();ctx.rect(x-24,y-34,48,66);ctx.fill();ctx.stroke();ctx.font=`22px ${EF}`;ctx.fillText('❄️',x,y-6)}
 if(p.tr>0){ctx.font=`34px ${EF}`;ctx.fillText('🪤',x,y+R)}
 if(p.off){ctx.font=`18px ${EF}`;ctx.fillText('📡',x+22,y-24)}
 ctx.font='bold 13px system-ui,sans-serif';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';const label=info.name+shape(info.team);ctx.strokeText(label,x,y-36);ctx.fillStyle=p.id===S.you?'#facc15':'#fff';ctx.fillText(label,x,y-36);
 if(hold){ctx.font=`26px ${EF}`;ctx.fillText('🏠',x,y-58+Math.sin(t*.008)*4)}
 for(let i=emotes.length-1;i>=0;i--){const e=emotes[i];if(e.id!==p.id)continue;const age=(performance.now()-e.t)/2200;if(age>=1)break;
  const ey=y-(hold?92:78)-age*26;ctx.globalAlpha*=1-age*age*age;ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(x,ey,19,0,7);ctx.fill();ctx.font=`24px ${EF}`;ctx.fillStyle='#000';ctx.fillText(EMO[e.e]||'💬',x,ey+1);break}
}
function drawDecoy(d,t){
 const info=names[d.id]||{ch:d.ch,name:'?',team:'red'},x=d.x,y=d.y;ctx.save();ctx.globalAlpha=.95;
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+R+4,R,R*.38,0,0,7);ctx.fill();
 if(init.mode==='team'){ctx.strokeStyle=TEAMS[info.team];ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y+R+4,R+5,R*.46,0,0,7);ctx.stroke()}
 if(d.hold){const gr=ctx.createRadialGradient(x,y,4,x,y,50);gr.addColorStop(0,'rgba(250,204,21,.6)');gr.addColorStop(1,'rgba(250,204,21,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,56,0,7);ctx.fill()}
 Sprites.draw(ctx,info.ch,x,y,t,false,1,0,false);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 13px system-ui,sans-serif';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';const label=info.name+shape(info.team);ctx.strokeText(label,x,y-36);ctx.fillStyle='#fff';ctx.fillText(label,x,y-36);
 if(d.hold){ctx.font=`26px ${EF}`;ctx.fillText('🏠',x,y-58+Math.sin(t*.008)*4)}
 ctx.restore()}
function drawArrow(me){
 const dist=i=>Math.hypot(pos[i].sx-(me?me.sx:0),pos[i].sy-(me?me.sy:0)),hid=[st.holder,st.holder2].filter(i=>i&&i!==S.you&&pos[i]).sort((a,b)=>dist(a)-dist(b))[0],h=hid?pos[hid]:null;if(!me||!h||st.holder===S.you||st.holder2===S.you||st.ph==='SCORE')return;
 const a=Math.atan2(h.sy-me.sy,h.sx-me.sx),d=Math.hypot(h.sy-me.sy,h.sx-me.sx);if(d<160)return;
 ctx.save();ctx.translate(me.sx+Math.cos(a)*85,me.sy+Math.sin(a)*85);ctx.rotate(a);ctx.fillStyle='#facc15';ctx.strokeStyle='#000a';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-13);ctx.lineTo(-3,0);ctx.lineTo(-10,13);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();
}

function hud(me,dead){
 const ph=st.ph,left=st.left,prot=st.holder===S.you||st.holder2===S.you;
 const HOLD=init.hold||30;setT(q('#hRound'),(MODE[init.mode]?MODE[init.mode][0]+' ':'')+'Round '+st.round+' · '+DIS[disaster][0]+(mod?' '+MODS[mod][0]:'')+' · Race to '+init.target);
 if(hud.hh!==st.holder+'|'+st.holder2||st.round!==hud.hr||ph!=='PLAY'){hud.hh=st.holder+'|'+st.holder2;hud.hr=st.round;hud.held=0;hud.hs=-1}
 const hold=prot&&!dead&&ph==='PLAY';
 setT(q('#hHold'),dead?'👁 '+nm(specId()):'🏠 '+[st.holder,st.holder2].filter(Boolean).map(i=>i===S.you?'You':nm(i)).join(' & ')+(hold&&hud.held?' · '+hud.held+'s':''));
 const tm=q('#hTimer'),secs=ph==='PLAY'?Math.ceil(left):HOLD;
 setT(q('#hT'),secs);if(ph==='PLAY'&&secs!==hud.hs){hud.hs=secs;
  if(hold){ // every second the property is in YOUR hand: sound, glow, floating counter, particles, buzz
   hud.held++;const hot=secs<=5;SFX.play(hot?'holdHot':'hold');vib(hot?35:18);
   const pu=q('#hPulse');pu.className='ov'+(hot?' hot':'');void pu.offsetWidth;pu.classList.add('go');
   const he=q('#hHeld');he.textContent='🏠 '+hud.held+'s';he.className='ov'+(hot?' hot':'');void he.offsetWidth;he.classList.add('go');
   const g=pos[S.you];if(g){if(use3d)R3D.burst(g.sx,g.sy,hot?'#ef4444':'#facc15',hot?16:10,{up:1.5,spd:.8,life:.8});else burst(g.sx,g.sy,hot?'#ef4444':'#facc15',hot?16:10)}}}
 if(ph==='PLAY'&&secs<=5&&secs!==hud.ls){hud.ls=secs;if(!hold)SFX.play('tick')}tm.classList.toggle('low',ph==='PLAY'&&secs<=5);Music.tense(ph==='PLAY'&&secs<=5);setS(q('#hBar'),'width',(ph==='PLAY'?Math.round(left/HOLD*1000)/10:100)+'%');
 setS(q('#popup'),'display',(ph==='ROLE'||ph==='COUNT')?'flex':'none');
 setS(q('#sb'),'display',(ph==='SCORE'||ph==='OVER')?'flex':'none');
 {const emOk=(ph==='PLAY'||ph==='SCORE');setS(q('#hEmT'),'display',emOk?'flex':'none');if(!emOk)q('#hEm').classList.remove('open')}
 const key=ph+(ph==='COUNT'?Math.ceil(left):'')+(ph==='ROLE'?st.holder+st.holder2:'');
 if(key!==lastKey){lastKey=key;const pop=q('#popup');SFX.play(ph==='PLAY'?'go':ph==='COUNT'?'count':ph==='ROLE'?'round':'');
  if(ph==='ROLE')pop.innerHTML=`<div class="role ${prot?'p':'s'}"><div class="big">${prot?'🛡️':'🥷'}</div><h2>You are ${prot?'the PROTECTOR':'a STEALER'}</h2><p>${prot?'Keep the property! Run from everyone — if you’re touched, you become a stealer.':'Touch the protector ('+esc(nm(st.holder))+') to steal the property and become the protector.'}</p><p style="margin-top:8px;color:#fca5a5">⚠️ Disaster: ${DIS[disaster][0]} ${DIS[disaster][1]}</p><p>${DIS[disaster][2]}</p>${MODE[init.mode]?`<p style="margin-top:6px;color:#fdba74">${MODE[init.mode][0]} <b>${MODE[init.mode][1]}:</b> ${MODE[init.mode][2]}</p>`:''}${mod?`<p style="margin-top:6px;color:#c4b5fd">${MODS[mod][0]} <b>${MODS[mod][1]}:</b> ${MODS[mod][2]}</p>`:''}<p style="margin-top:6px;color:#86efac">${MAPTIP[init.map]||''}</p><p style="color:#94a3b8">Avoid spike traps — dying means spectating until next round.</p></div>`;
  else if(ph==='COUNT')pop.innerHTML=`<div class="count">${Math.ceil(left)}</div>`;
  else if(ph==='PLAY')banner('GO!')}
 const mine=st.p.find(p=>p.id===S.you),dc=mine?mine.dc:0,b=q('#hDash');
 setS(b,'display',dead?'none':'flex');setS(q('#hSpec'),'display',dead&&ph==='PLAY'?'block':'none');
 b.classList.toggle('cd',dc>0);setT(b.querySelector('small'),dc>0?(dc/1000).toFixed(1):'DASH');
 setS(q('#hItem'),'display',!dead&&mine&&mine.it?'flex':'none');
 {const ab=q('#hAb'),nmM=names[S.you];if(nmM){const a=ABIL[nmM.ch%ABIL.length],rem=Math.max(0,abReady-performance.now())/1000;if(ab._k!==nmM.ch){ab._k=nmM.ch;ab.innerHTML=a[0]+'<small></small>';ab.title=a[1]+': '+a[2]}setS(ab,'display',!dead&&ph==='PLAY'&&mine&&mine.a?'flex':'none');ab.classList.toggle('cd',rem>0);setT(ab.querySelector('small'),rem>0?Math.ceil(rem)+'s':'Q')}}
 setT(q('#hFx'),mine&&!dead?[mine.sp>0?'⚡ '+(mine.sp/1000).toFixed(1):'',mine.sh>0?'🛡️ '+(mine.sh/1000).toFixed(1):'',mine.fz>0?'🥶 '+(mine.fz/1000).toFixed(1):'',mine.tr>0?'🪤 '+(mine.tr/1000).toFixed(1):'',mine.sm>0?'💨 '+(mine.sm/1000).toFixed(1):'',mine.wt>0?'🌊 Drowning '+(mine.wt/1000).toFixed(1):''].filter(Boolean).join('   '):'');
}

function wetCheck(mine,dead){const w=!!mine&&!dead&&mine.wt>0;if(w&&!wetCheck.on){banner('🌊 Get out of the water!');SFX.play('splash')}wetCheck.on=w}
let abReady=0;
const ABS={dash:'dash',speed:'pw_speed',shield:'pw_shield',ghost:'pw_ghost',magnet:'pw_magnet',reveal:'pw_reveal',stun:'boom',push:'boom',trap:'pw_trap',mine:'pw_mine',smoke:'pw_smoke',decoy:'pw_decoy',tele:'pw_tele'};
function useAbility(){const m=st&&st.p.find(p=>p.id===S.you);if(m&&m.a&&st.ph==='PLAY'&&performance.now()>=abReady)go({t:'ability'})}
function tryDash(){const m=st&&st.p.find(p=>p.id===S.you);if(m&&m.a&&m.dc===0&&st.ph==='PLAY')SFX.play('dash');go({t:'dash'})}
function alives(){return st.p.filter(p=>p.a).map(p=>p.id)}
function specId(){const a=alives();if(!a.length)return S.you;if(!spec||!a.includes(spec))spec=a.includes(st.holder)?st.holder:a[0];return spec}
function specNext(){if(!st)return;const a=alives();if(a.length)spec=a[(a.indexOf(spec)+1)%a.length]}

/* ---------- terrain, hazards and effects drawn under the players ---------- */
function visible(x,y,r){return x+r>=camX&&x-r<=camX+vw&&y+r>=camY&&y-r<=camY+vh}
function drawZones(t){
 const th=TH[init.map]||TH.forest;
 zones.forEach((z,i)=>{if(!visible(z.x,z.y,z.r+20))return;const{x,y,r}=z;
  if(z.k==='ice'){ctx.fillStyle='rgba(186,230,253,.5)';ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,r,r*.78,0,0,7);ctx.fill();ctx.stroke();
   ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;for(let k=0;k<5;k++){const a=k*1.7+x,gx=x+Math.cos(a)*r*.5,gy=y+Math.sin(a)*r*.35;ctx.beginPath();ctx.moveTo(gx-8,gy+4);ctx.lineTo(gx+8,gy-4);ctx.stroke()}}
  else if(z.k==='belt'){const a=(z.l&3)*Math.PI/2,o=(t*.06)%40;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='rgba(30,41,59,.85)';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.strokeStyle='#facc15';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#fde047';for(let k=-1;k<=1;k++){const ax=-r*.6+((o+k*40+120)%(r*1.2));ctx.beginPath();ctx.moveTo(ax+14,0);ctx.lineTo(ax-4,-12);ctx.lineTo(ax-4,12);ctx.fill()}ctx.restore()}
  else if(z.k==='slow'){const g=ctx.createRadialGradient(x,y,r*.1,x,y,r);g.addColorStop(0,th.mud||'#4a3417');g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=.85;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.globalAlpha=1;
   ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=2;for(let k=0;k<2;k++){const f=((t*.0004+k*.5+i*.13)%1);ctx.globalAlpha=1-f;ctx.beginPath();ctx.arc(x,y,r*.25+f*r*.6,0,7);ctx.stroke()}ctx.globalAlpha=1}
  else if(z.k==='bounce'){const pu=1+Math.sin(t*.008+i)*.08;ctx.fillStyle='rgba(244,114,182,.9)';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r*pu,0,7);ctx.fill();ctx.stroke();
   ctx.fillStyle='#fff';for(let k=0;k<2;k++){const yy=y+8-k*12-((t*.03)%6);ctx.beginPath();ctx.moveTo(x,yy-8);ctx.lineTo(x+10,yy+4);ctx.lineTo(x-10,yy+4);ctx.closePath();ctx.fill()}}
  else if(z.k==='portal'){const pi=Math.min(i,z.l<0?i:z.l),hue=(200+pi*47)%360,col=`hsl(${hue},85%,62%)`;
   const g=ctx.createRadialGradient(x,y,2,x,y,r*1.5);g.addColorStop(0,`hsla(${hue},90%,70%,.9)`);g.addColorStop(.55,`hsla(${hue},90%,45%,.55)`);g.addColorStop(1,`hsla(${hue},90%,45%,0)`);
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*1.5,0,7);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=4;ctx.setLineDash([12,9]);ctx.lineDashOffset=-t*.04;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.stroke();
   ctx.lineDashOffset=t*.05;ctx.beginPath();ctx.arc(x,y,r*.6,0,7);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0}
  else if(z.k==='lava'){const gl=1+Math.sin(t*.004+i)*.06,g=ctx.createRadialGradient(x,y,r*.15,x,y,r*gl);g.addColorStop(0,'#fde047');g.addColorStop(.35,'#fb923c');g.addColorStop(.75,'#dc2626');g.addColorStop(1,'#450a0a');
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*gl,0,7);ctx.fill();ctx.strokeStyle='#1c0a0a';ctx.lineWidth=5;ctx.stroke();
   ctx.fillStyle='rgba(254,240,138,.85)';for(let k=0;k<3;k++){const a=t*.002+k*2.1+i,d=r*.45*Math.abs(Math.sin(t*.0017+k+i));ctx.beginPath();ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,3+k,0,7);ctx.fill()}}
 })}
function drawBushes(t){
 const th=TH[init.map]||TH.forest,cols=th.leaf||TH.forest.leaf;
 for(const z of zones){if(z.k!=='bush'||!visible(z.x,z.y,z.r+20))continue;
  z.b=z.b||Array.from({length:11},(_,i)=>({a:i*2.399,d:Math.sqrt((i+.5)/11)*z.r*.8,r:z.r*(.26+((i*37)%10)/55),c:i%3}));
  ctx.globalAlpha=.62;for(const b of z.b){const sw=Math.sin(t*.002+b.a)*2;ctx.fillStyle=cols[b.c];ctx.beginPath();ctx.arc(z.x+Math.cos(b.a)*b.d+sw,z.y+Math.sin(b.a)*b.d*.8,b.r,0,7);ctx.fill()}ctx.globalAlpha=1}}
function drawDecals(){
 for(const d of decals){const g=ctx.createRadialGradient(d.x,d.y,2,d.x,d.y,d.r*.9);
  const c=d.k==='h'?'191,219,254':d.k==='l'?'20,20,20':'30,18,10';g.addColorStop(0,`rgba(${c},.45)`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(d.x,d.y,d.r*.9,0,7);ctx.fill()}}
function drawGround(t){
 drawZones(t);drawDecals();
 for(const[x,y]of traps){if(!visible(x,y,30))continue;ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(x,y+3,22,0,7);ctx.fill();ctx.fillStyle='#475569';ctx.beginPath();ctx.arc(x,y,20,0,7);ctx.fill();ctx.fillStyle='#e2e8f0';
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a-.28)*9,y+Math.sin(a-.28)*9);ctx.lineTo(x+Math.cos(a)*23,y+Math.sin(a)*23);ctx.lineTo(x+Math.cos(a+.28)*9,y+Math.sin(a+.28)*9);ctx.fill()}}
 if(st.fx>0||st.fy>0){const W=init.w,H=init.h;ctx.fillStyle=`rgba(37,99,235,${.5+Math.sin(t*.004)*.06})`;
  ctx.fillRect(0,0,W,st.fy);ctx.fillRect(0,H-st.fy,W,st.fy);ctx.fillRect(0,st.fy,st.fx,H-2*st.fy);ctx.fillRect(W-st.fx,st.fy,st.fx,H-2*st.fy);
  ctx.strokeStyle='rgba(186,230,253,.9)';ctx.lineWidth=5;ctx.setLineDash([22,14]);ctx.lineDashOffset=-t*.03;ctx.strokeRect(st.fx,st.fy,W-2*st.fx,H-2*st.fy);ctx.setLineDash([]);ctx.lineDashOffset=0}
 for(const o of st.ho||[]){const g=ctx.createRadialGradient(o.x,o.y,o.r*.2,o.x,o.y,o.r);g.addColorStop(0,'#000');g.addColorStop(.75,'#1c1008');g.addColorStop(1,'rgba(120,70,20,.9)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill();ctx.strokeStyle='#78350f';ctx.lineWidth=4;ctx.stroke()}
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const b of st.bt){ctx.globalAlpha=b.a?1:.45;ctx.font=`30px ${EF}`;ctx.fillText(b.m?'💣':'🪤',b.x,b.y);ctx.globalAlpha=1}
 for(const b of st.lb){const x=b.x,y=b.y-6+Math.sin(t*.005+b.x)*4;
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(b.x,b.y+14,15,5,0,0,7);ctx.fill();
  const gr=ctx.createRadialGradient(x,y,4,x,y,38);gr.addColorStop(0,'rgba(250,204,21,.55)');gr.addColorStop(1,'rgba(250,204,21,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,38,0,7);ctx.fill();
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.003+b.y)*.15);ctx.fillStyle='#f59e0b';ctx.strokeStyle='#fff7';ctx.lineWidth=3;ctx.beginPath();ctx.rect(-17,-17,34,34);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 24px system-ui,sans-serif';ctx.fillText('?',0,1);ctx.restore()}
 for(const h of st.hz){if(h.k==='t')continue;
  if(h.k==='b'){if(h.w>0){const hor=h.vx!==0;ctx.fillStyle=`rgba(239,68,68,${.14+.2*Math.abs(Math.sin(t*.012))})`;
    if(hor)ctx.fillRect(0,h.y-h.r,init.w,h.r*2);else ctx.fillRect(h.x-h.r,0,h.r*2,init.h);
    ctx.font=`34px ${EF}`;ctx.fillText('⚠️',hor?(h.vx>0?40:init.w-40):h.x,hor?h.y:(h.vy>0?40:init.h-40))}continue}
  const w=WARN[h.k]||WARN.l,f=1-h.w/w.ms;
  ctx.fillStyle=`rgba(${w.c},${.12+f*.35})`;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,7);ctx.fill();
  ctx.strokeStyle=w.s;ctx.lineWidth=3;ctx.setLineDash([10,8]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(h.x,h.y,h.r*f,0,7);ctx.stroke()}
}
function drawAir(t){
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const h of st.hz){
  if(h.k==='t'){ctx.save();ctx.translate(h.x,h.y);ctx.fillStyle='rgba(30,41,59,.3)';ctx.beginPath();ctx.ellipse(0,h.r*.6,h.r*1.2,h.r*.4,0,0,7);ctx.fill();ctx.rotate(Math.sin(t*.01)*.15);ctx.font=`${h.r*2.6}px ${EF}`;ctx.fillText('🌪️',0,0);ctx.restore();
   if(Math.random()<.6){const a=Math.random()*6.28,rr=h.r*(.5+Math.random()*.7);parts.push({x:h.x+Math.cos(a)*rr,y:h.y+Math.sin(a)*rr,vx:-Math.sin(a)*2.5,vy:Math.cos(a)*2.5-.6,l:26,m:26,c:Math.random()<.5?'#78716c':'#a8a29e',s:2+Math.random()*2})}}
  else if(h.k==='m'){const f=h.w/1600;ctx.font=`56px ${EF}`;ctx.fillText('☄️',h.x+f*260,h.y-f*520)}
  else if(h.k==='l'){ctx.font=`28px ${EF}`;ctx.fillText('⚡',h.x,h.y-6)}
  else if(h.k==='h'){const f=h.w/1000;ctx.font=`34px ${EF}`;ctx.fillText('🧊',h.x+f*40,h.y-f*420)}
  else if(h.k==='s'){ctx.font=`30px ${EF}`;ctx.fillText('🕳️',h.x,h.y)}
  else if(h.k==='b'&&h.w<=0){ctx.save();ctx.translate(h.x,h.y);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,h.r*.7,h.r*1.1,h.r*.35,0,0,7);ctx.fill();ctx.rotate(t*.008*(h.vx+h.vy>0?1:-1));ctx.font=`${h.r*2.4}px ${EF}`;ctx.fillText('🪨',0,0);ctx.restore()}}
 drawBushes(t);
 for(const f of flashes){f.l--;const a=f.l/24;
  if(f.t==='m'){ctx.fillStyle=`rgba(251,146,60,${a*.7})`;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1.5-a*.4),0,7);ctx.fill()}
  else if(f.t==='h'){ctx.fillStyle=`rgba(191,219,254,${a*.7})`;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1.4-a*.4),0,7);ctx.fill()}
  else if(f.t==='s'){ctx.fillStyle=`rgba(146,98,40,${a*.7})`;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1.5-a*.4),0,7);ctx.fill()}
  else{ctx.fillStyle=`rgba(254,240,138,${a*.6})`;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=4;ctx.beginPath();let bx=f.x,by=f.y-460;ctx.moveTo(bx,by);for(let i=0;i<7;i++){bx=f.x+(Math.random()-.5)*50;by+=460/7;ctx.lineTo(bx,by)}ctx.lineTo(f.x,f.y);ctx.stroke()}}
 flashes=flashes.filter(f=>f.l>0);
}

build();
return{on,stop,get active(){return active}};
})();
