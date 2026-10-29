/* "That's My Property" - match client: renders server state on a canvas. Uses globals from index.html (S, go, show, CH, TEAMS, $). */
const GameUI=(()=>{
const EF='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',R=18;
const BODY=['#f59e0b','#8b5cf6','#f97316','#64748b','#22c55e','#a16207'];
const TH={
 forest:{g:['#3d7a37','#4a8c42','#336b2f'],acc:'#f4e04d',tuft:'#2a5f27',ob:['🌲','🪨']},
 desert:{g:['#d9b26b','#e3c07e','#c9a059'],acc:'#a86b32',tuft:'#b58b45',ob:['🌵','🪨']},
 snow:{g:['#e4eef7','#d3e3f1','#f4f9fd'],acc:'#9ec5e8',tuft:'#b8cfe3',ob:['🎄','🧊']},
 lava:{g:['#3a2a2a','#4a3030','#2c1e1e'],acc:'#ff6a1a',tuft:'#1a1010',ob:['🪨','🌋']},
 swamp:{g:['#3b4a2a','#46572f','#313f23'],acc:'#a3e635',tuft:'#27331b',ob:['🍄','🪵']},
 beach:{g:['#f1d9a0','#e9cf8e','#f7e6b8'],acc:'#fda4af',tuft:'#c9a866',ob:['🌴','🐚'],edge:'rgba(14,165,233,.6)'},
 candy:{g:['#f9a8d4','#f472b6','#fbcfe8'],acc:'#fde047',tuft:'#db2777',ob:['🍭','🧁']},
 space:{g:['#1e1b4b','#312e81','#27235f'],acc:'#fde68a',tuft:'#4338ca',ob:['🌑','🛸']},
 autumn:{g:['#b45309','#c2610c','#9a4a08'],acc:'#fbbf24',tuft:'#7c2d12',ob:['🍁','🎃']},
 ruins:{g:['#4b5563','#525c6b','#3f4753'],acc:'#a1a1aa',tuft:'#27272a',ob:['🏛️','🪨']}};
const PW={speed:['⚡','Speed Boost!','#facc15'],shield:['🛡️','Shield up!','#38bdf8'],trap:['🪤','Bear trap! Press E or tap 🪤 to place it','#cbd5e1'],freeze:['🥶','You froze yourself for 3s!','#bae6fd']};
const DIS={METEOR:['☄️','Meteor Shower','Red circles show where meteors land. Move out before they hit.'],
 LIGHTNING:['⚡','Lightning Storm','Yellow circles mark lightning strikes. They hit fast!'],
 TORNADO:['🌪️','Tornado','Tornadoes chase the nearest player. Keep moving and dash away.'],
 FLOOD:['🌊','Rising Flood','Water rises from the edges. In water you are slow and drown after 2.5s. Stay in the middle!'],
 SINKHOLE:['🕳️','Sinkholes','Brown circles open into holes that stay open and kill on touch.'],
 HAIL:['🧊','Hailstorm','Lots of small ice strikes. Watch the blue circles.'],
 BOULDER:['🪨','Rolling Boulders','A red lane warns where a boulder will roll across the whole map. Leave the lane!']};
const WARN={m:{ms:1600,c:'239,68,68',s:'#ef4444'},l:{ms:900,c:'250,204,21',s:'#facc15'},h:{ms:1000,c:'147,197,253',s:'#93c5fd'},s:{ms:1800,c:'161,98,7',s:'#d97706'}};
let el,cv,ctx,traps=[],disaster='METEOR',flashes=[],spec=null,active=false,raf=0,lt=0,init=null,st=null,obs=[],pos={},names={},rows=[],bg=null,parts=[],shake=0,lastKey='',lastSent='',lastSendAt=0;
const keys=new Set(),joy={on:false,id:null,ox:0,oy:0,x:0,y:0};
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const nm=id=>(names[id]||{}).name||'?';
const q=s=>el.querySelector(s);
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

function build(){
 el=document.createElement('section');el.id='game';el.className='screen';
 el.innerHTML=`<canvas></canvas>
 <div id="hTop" class="ov"><span id="hRound"></span><div id="hTimer"><span id="hT">30</span><i id="hBar"></i></div><span id="hHold"></span></div>
 <div id="hScores" class="ov"></div><div id="hFx" class="ov"></div><button id="hLeave" class="ghost">Leave</button><button id="hMute" class="ghost">🔊</button>
 <div id="popup" class="ov"></div><div id="banner" class="ov"></div><div id="sb" class="ov"></div>
 <button id="hSpec" class="ghost" style="display:none;position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%)">👁 Next player</button><button id="hItem" style="display:none">🪤<small>E</small></button><button id="hDash">⚡<small></small></button><div id="joy"><i></i></div>`;
 document.body.append(el);el.append(FS.button('fs-game'));cv=el.querySelector('canvas');ctx=cv.getContext('2d');
 addEventListener('resize',resize);
 addEventListener('keydown',e=>{if(!active)return;keys.add(e.code);if(e.code==='Space'||e.code==='ShiftLeft'){tryDash();e.preventDefault()}if(e.code==='KeyE'||e.code==='KeyF')go({t:'use'});});
 addEventListener('keyup',e=>keys.delete(e.code));
 q('#hDash').addEventListener('pointerdown',e=>{e.preventDefault();tryDash()});
 q('#hSpec').onclick=specNext;
 q('#hMute').textContent=SFX.muted?'🔇':'🔊';q('#hMute').onclick=()=>{q('#hMute').textContent=SFX.toggle()?'🔇':'🔊'};
 q('#hItem').addEventListener('pointerdown',e=>{e.preventDefault();go({t:'use'})});
 q('#hLeave').onclick=()=>{go({t:'leave'});S=null;stop();if(ws)ws.close();show('home')};
 el.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.target.closest('button')||joy.on||e.clientX>innerWidth*.6)return;
  joy.on=true;joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;const j=q('#joy');j.style.display='block';j.style.left=e.clientX+'px';j.style.top=e.clientY+'px'});
 addEventListener('pointermove',e=>{if(!joy.on||e.pointerId!==joy.id)return;const dx=e.clientX-joy.ox,dy=e.clientY-joy.oy,l=Math.hypot(dx,dy),k=Math.min(1,l/50);
  joy.x=l?dx/l*k:0;joy.y=l?dy/l*k:0;const n=q('#joy i');n.style.transform=`translate(${joy.x*35}px,${joy.y*35}px)`});
 const up=e=>{if(joy.on&&e.pointerId===joy.id){joy.on=false;joy.x=joy.y=0;q('#joy').style.display='none'}};
 addEventListener('pointerup',up);addEventListener('pointercancel',up);
}
function resize(){const d=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*d;cv.height=innerHeight*d}

function bake(){
 const W=init.w,H=init.h,t=TH[init.map]||TH.forest,r=mulberry(init.seed);
 bg=document.createElement('canvas');bg.width=W;bg.height=H;const x=bg.getContext('2d');
 x.fillStyle=t.g[0];x.fillRect(0,0,W,H);
 for(let i=0;i<W*H/5000;i++){x.globalAlpha=.5;x.fillStyle=t.g[1+(r()*2|0)];x.beginPath();x.ellipse(r()*W,r()*H,40+r()*130,30+r()*90,r()*3,0,7);x.fill()}
 x.globalAlpha=1;x.strokeStyle=t.tuft;x.lineWidth=2;
 for(let i=0;i<W*H/900;i++){const a=r()*W,b=r()*H;x.beginPath();x.moveTo(a,b);x.lineTo(a-3,b-8);x.moveTo(a,b);x.lineTo(a+3,b-9);x.stroke()}
 x.fillStyle=t.acc;for(let i=0;i<W*H/9000;i++){x.beginPath();x.arc(r()*W,r()*H,2+r()*3,0,7);x.fill()}
 x.strokeStyle=t.edge||'rgba(0,0,0,.3)';x.lineWidth=90;x.strokeRect(0,0,W,H);x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=24;x.strokeRect(0,0,W,H);
}

function on(m){
 if(m.t==='init'){init=m;names={};m.players.forEach(p=>names[p.id]={name:p.name,ch:p.character,team:p.team});
  pos={};st=null;obs=[];rows=[];parts=[];lastKey='';bake();Ambient.init(m.map);active=true;show('game');resize();lt=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}
 else if(!init)return;
 else if(m.t==='round'){obs=m.obstacles;traps=m.traps;disaster=m.disaster;flashes=[];spec=null;lastKey=''}
 else if(m.t==='state'){st=m;m.p.forEach(p=>{const g=pos[p.id]||(pos[p.id]={sx:p.x,sy:p.y});g.x=p.x;g.y=p.y})}
 else if(m.t==='ev'){
  if(m.k==='steal'||m.k==='pass'){SFX.play('steal');const g=pos[m.to];if(g){burst(g.sx,g.sy,'#facc15',28);shake=m.k==='steal'?14:6}banner('🏠 '+nm(m.to)+(m.k==='steal'?' stole the property!':' got the property!'))}
  else if(m.k==='die'){SFX.play('die');const g=pos[m.id];if(g)burst(g.sx,g.sy,'#ef4444',30);if(m.id===S.you){banner('💀 You died — spectating until next round');el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),450)}}
  else if(m.k==='boom'){const bm={m:['boom',16,'#fb923c'],s:['boom',12,'#a16207'],h:['zap',5,'#bfdbfe'],l:['zap',8,'#fef08a']}[m.hk]||['zap',8,'#fef08a'];if(m.hk!=='h'||Math.random()<.3)SFX.play(bm[0]);flashes.push({x:m.x,y:m.y,r:m.r,t:m.hk,l:24});shake=bm[1];burst(m.x,m.y,bm[2],m.hk==='h'?10:24)}
  else if(m.k==='power'){if(m.id===S.you)SFX.play(m.pw==='freeze'?'bad':'power');const g=pos[m.id];if(g)burst(g.sx,g.sy,PW[m.pw][2],22);if(m.id===S.you)banner(PW[m.pw][0]+' '+PW[m.pw][1])}
  else if(m.k==='snap'){SFX.play('snap');burst(m.x,m.y,'#cbd5e1',18);shake=8;if(m.id===S.you)banner('🪤 Trapped for 3s!')}}
 else if(m.t==='scores'){rows=m.rows;showScores(m);if(m.winner)SFX.play('win')}
}
function stop(){active=false;cancelAnimationFrame(raf);init=null;st=null;pos={};keys.clear();joy.on=false;if(el)['#popup','#sb','#hScores'].forEach(s=>q(s).style.display='none')}
function banner(t){const b=q('#banner');b.textContent=t;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function burst(x,y,c,n){for(let i=0;i<n;i++){const a=Math.random()*6.3,s=1+Math.random()*4;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:30,m:30,c,s:2+Math.random()*3})}}

function showScores(m){
 const html=m.rows.map((r,i)=>`<div class="r"><span style="font-size:22px;flex:none">${r.team?`<i style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${TEAMS[r.team]}"></i>`:CH[r.ch]}</span><span>${esc(r.label)}</span><b>${r.pts}</b></div>`).join('');
 q('#sb').innerHTML=`<div class="card"><h2>${m.winner?'🏆 '+esc(m.winner)+' wins!':m.none?'💀 No survivors — no point':'Round '+m.round+' complete'}</h2>${html}<p>${m.winner?'Returning to lobby…':'Next round starting…'}</p></div>`;
 q('#hScores').innerHTML=m.rows.map(r=>`${r.team?`<b style="color:${TEAMS[r.team]}">●</b>`:CH[r.ch]} ${r.pts}`).join('<br>');q('#hScores').style.display='block';
}

function vec(){let x=0,y=0;
 if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;
 if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;
 if(x||y){const l=Math.hypot(x,y);x/=l;y/=l}
 return joy.on?[joy.x,joy.y]:[x,y]}

function frame(t){
 if(!active)return;raf=requestAnimationFrame(frame);
 const [ix,iy]=vec(),k=ix.toFixed(2)+','+iy.toFixed(2);
 if(k!==lastSent&&t-lastSendAt>40){lastSent=k;lastSendAt=t;go({t:'input',x:+ix.toFixed(2),y:+iy.toFixed(2)})}
 if(!st)return;
 for(const id in pos){const g=pos[id];const ddx=g.x-g.sx,ddy=g.y-g.sy,dl=Math.hypot(ddx,ddy);g.mv=dl>2;if(g.mv){g.fx=ddx/dl;g.fy=ddy/dl}g.sx+=(g.x-g.sx)*.4;g.sy+=(g.y-g.sy)*.4}
 const mine=st.p.find(p=>p.id===S.you),dead=!!mine&&!mine.a,me=pos[S.you],view=dead?(pos[specId()]||me):me,z=cv.height/700,vw=cv.width/z,vh=700,W=init.w,H=init.h;
 let cx=view?view.sx:W/2,cy=view?view.sy:H/2;
 cx=Math.max(vw/2,Math.min(W-vw/2,cx));cy=Math.max(vh/2,Math.min(H-vh/2,cy));
 let ox=0,oy=0;if(shake>0){ox=(Math.random()-.5)*shake;oy=(Math.random()-.5)*shake;shake*=.85;if(shake<.3)shake=0}
 const camX=cx-vw/2+ox,camY=cy-vh/2+oy;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
 ctx.drawImage(bg,camX,camY,vw,vh,0,0,cv.width,cv.height);
 ctx.setTransform(z,0,0,z,-camX*z,-camY*z);
 drawGround(t);
 const items=[];
 for(const o of obs)if(o[0]>camX-100&&o[0]<camX+vw+100&&o[1]>camY-100&&o[1]<camY+vh+100)items.push([o[1]+o[2]*.6,()=>drawObs(o)]);
 for(const p of st.p){const g=pos[p.id];if(p.d)burst(g.sx,g.sy+10,'#ffffff',1);items.push([g.sy,()=>drawP(p,g,t)])}
 items.sort((a,b)=>a[0]-b[0]);items.forEach(i=>i[1]());
 drawAir(t);if(!dead)drawArrow(me);
 parts=parts.filter(p=>p.l>0);for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.l--;ctx.globalAlpha=p.l/p.m;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,7);ctx.fill()}ctx.globalAlpha=1;
 ctx.setTransform(1,0,0,1,0,0);Ambient.draw(ctx,cv.width,cv.height,t);Minimap.draw(ctx,{cw:cv.width,ch:cv.height,init,st,obs,traps,pos,names,you:S.you,cam:[camX,camY,vw,vh]});
 hud(me,dead);wetCheck(st.p.find(p=>p.id===S.you),dead);
}
function drawObs(o){const[x,y,r,v]=o;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+r*.7,r*1.05,r*.4,0,0,7);ctx.fill();
 ctx.font=`${r*2.5}px ${EF}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(TH[init.map].ob[v%2],x,y-r*.1)}
function drawP(p,g,t){
 const info=names[p.id]||{ch:0,name:'?',team:'red'},x=g.sx,y=g.sy,hold=st.holder===p.id,bob=g.mv?Math.abs(Math.sin(t*.015))*5:Math.sin(t*.004)*1.5;
 if(p.a===false){ctx.font=`32px ${EF}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🪦',x,y);ctx.font='bold 12px system-ui,sans-serif';ctx.fillStyle='#fff9';ctx.fillText(info.name,x,y-26);return}
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+R+4,R,R*.38,0,0,7);ctx.fill();
 if(init.mode==='team'){ctx.strokeStyle=TEAMS[info.team];ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y+R+4,R+5,R*.46,0,0,7);ctx.stroke()}
 if(hold){const gr=ctx.createRadialGradient(x,y,4,x,y,50+Math.sin(t*.008)*4);gr.addColorStop(0,'rgba(250,204,21,.6)');gr.addColorStop(1,'rgba(250,204,21,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,56,0,7);ctx.fill()}
 Sprites.draw(ctx,info.ch,x,y,t,g.mv,g.fx||1,g.fy||0,p.d);ctx.textAlign='center';ctx.textBaseline='middle';
 if(p.sh>0){ctx.fillStyle=`rgba(56,189,248,${.25+Math.sin(t*.01)*.08})`;ctx.strokeStyle='rgba(125,211,252,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y+2,34,0,7);ctx.fill();ctx.stroke()}
 if(p.sp>0&&g.mv&&Math.random()<.6)parts.push({x:x-6+Math.random()*12,y:y+R,vx:(Math.random()-.5)*.6,vy:-.2,l:14,m:14,c:'#fde68a',s:3});
 if(p.fz>0){ctx.fillStyle='rgba(186,230,253,.55)';ctx.strokeStyle='#e0f2fe';ctx.lineWidth=3;ctx.beginPath();ctx.rect(x-24,y-34,48,66);ctx.fill();ctx.stroke();ctx.font=`22px ${EF}`;ctx.fillText('❄️',x,y-6)}
 if(p.tr>0){ctx.font=`34px ${EF}`;ctx.fillText('🪤',x,y+R)}
 ctx.font='bold 13px system-ui,sans-serif';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeText(info.name,x,y-36);ctx.fillStyle=p.id===S.you?'#facc15':'#fff';ctx.fillText(info.name,x,y-36);
 if(hold){ctx.font=`26px ${EF}`;ctx.fillText('🏠',x,y-58+Math.sin(t*.008)*4)}
}
function drawArrow(me){
 const h=pos[st.holder];if(!me||!h||st.holder===S.you||st.ph==='SCORE')return;
 const a=Math.atan2(h.sy-me.sy,h.sx-me.sx),d=Math.hypot(h.sx-me.sx,h.sy-me.sy);if(d<160)return;
 ctx.save();ctx.translate(me.sx+Math.cos(a)*85,me.sy+Math.sin(a)*85);ctx.rotate(a);ctx.fillStyle='#facc15';ctx.strokeStyle='#000a';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-13);ctx.lineTo(-3,0);ctx.lineTo(-10,13);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();
}

function hud(me,dead){
 const ph=st.ph,left=st.left,prot=st.holder===S.you;
 q('#hRound').textContent='Round '+st.round+' · '+DIS[disaster][0]+' · Race to '+init.target;
 q('#hHold').textContent=dead?'👁 '+nm(specId()):'🏠 '+(prot?'You':nm(st.holder));
 const tm=q('#hTimer'),secs=ph==='PLAY'?Math.ceil(left):30;
 q('#hT').textContent=secs;if(ph==='PLAY'&&secs<=5&&secs!==hud.ls){hud.ls=secs;SFX.play('tick')}tm.classList.toggle('low',ph==='PLAY'&&secs<=5);q('#hBar').style.width=(ph==='PLAY'?left/30*100:100)+'%';
 q('#popup').style.display=(ph==='ROLE'||ph==='COUNT')?'flex':'none';
 q('#sb').style.display=(ph==='SCORE'||ph==='OVER')?'flex':'none';
 const key=ph+(ph==='COUNT'?Math.ceil(left):'')+(ph==='ROLE'?st.holder:'');
 if(key!==lastKey){lastKey=key;const pop=q('#popup');SFX.play(ph==='PLAY'?'go':ph==='COUNT'?'count':ph==='ROLE'?'round':'');
  if(ph==='ROLE')pop.innerHTML=`<div class="role ${prot?'p':'s'}"><div class="big">${prot?'🛡️':'🥷'}</div><h2>You are ${prot?'the PROTECTOR':'a STEALER'}</h2><p>${prot?'Keep the property! Run from everyone — if you’re touched, you become a stealer.':'Touch the protector ('+esc(nm(st.holder))+') to steal the property and become the protector.'}</p><p style="margin-top:8px;color:#fca5a5">⚠️ Disaster: ${DIS[disaster][0]} ${DIS[disaster][1]}</p><p>${DIS[disaster][2]}</p><p style="color:#94a3b8">Avoid spike traps — dying means spectating until next round.</p></div>`;
  else if(ph==='COUNT')pop.innerHTML=`<div class="count">${Math.ceil(left)}</div>`;
  else if(ph==='PLAY')banner('GO!')}
 const mine=st.p.find(p=>p.id===S.you),dc=mine?mine.dc:0,b=q('#hDash');
 b.style.display=dead?'none':'flex';q('#hSpec').style.display=dead&&ph==='PLAY'?'block':'none';
 b.classList.toggle('cd',dc>0);b.querySelector('small').textContent=dc>0?(dc/1000).toFixed(1):'DASH';
 q('#hItem').style.display=!dead&&mine&&mine.it?'flex':'none';
 q('#hFx').textContent=mine&&!dead?[mine.sp>0?'⚡ '+(mine.sp/1000).toFixed(1):'',mine.sh>0?'🛡️ '+(mine.sh/1000).toFixed(1):'',mine.fz>0?'🥶 '+(mine.fz/1000).toFixed(1):'',mine.tr>0?'🪤 '+(mine.tr/1000).toFixed(1):'',mine.wt>0?'🌊 Drowning '+(mine.wt/1000).toFixed(1):''].filter(Boolean).join('   '):'';
}

function wetCheck(mine,dead){const w=!!mine&&!dead&&mine.wt>0;if(w&&!wetCheck.on)banner('🌊 Get out of the water!');wetCheck.on=w}
function tryDash(){const m=st&&st.p.find(p=>p.id===S.you);if(m&&m.a&&m.dc===0&&st.ph==='PLAY')SFX.play('dash');go({t:'dash'})}
function alives(){return st.p.filter(p=>p.a).map(p=>p.id)}
function specId(){const a=alives();if(!a.length)return S.you;if(!spec||!a.includes(spec))spec=a.includes(st.holder)?st.holder:a[0];return spec}
function specNext(){if(!st)return;const a=alives();if(a.length)spec=a[(a.indexOf(spec)+1)%a.length]}
function drawGround(t){
 for(const[x,y]of traps){ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(x,y+3,22,0,7);ctx.fill();ctx.fillStyle='#475569';ctx.beginPath();ctx.arc(x,y,20,0,7);ctx.fill();ctx.fillStyle='#e2e8f0';
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a-.28)*9,y+Math.sin(a-.28)*9);ctx.lineTo(x+Math.cos(a)*23,y+Math.sin(a)*23);ctx.lineTo(x+Math.cos(a+.28)*9,y+Math.sin(a+.28)*9);ctx.fill()}}
 if(st.fx>0||st.fy>0){const W=init.w,H=init.h;ctx.fillStyle=`rgba(37,99,235,${.5+Math.sin(t*.004)*.06})`;
  ctx.fillRect(0,0,W,st.fy);ctx.fillRect(0,H-st.fy,W,st.fy);ctx.fillRect(0,st.fy,st.fx,H-2*st.fy);ctx.fillRect(W-st.fx,st.fy,st.fx,H-2*st.fy);
  ctx.strokeStyle='rgba(186,230,253,.9)';ctx.lineWidth=5;ctx.setLineDash([22,14]);ctx.lineDashOffset=-t*.03;ctx.strokeRect(st.fx,st.fy,W-2*st.fx,H-2*st.fy);ctx.setLineDash([]);ctx.lineDashOffset=0}
 for(const o of st.ho||[]){const g=ctx.createRadialGradient(o.x,o.y,o.r*.2,o.x,o.y,o.r);g.addColorStop(0,'#000');g.addColorStop(.75,'#1c1008');g.addColorStop(1,'rgba(120,70,20,.9)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill();ctx.strokeStyle='#78350f';ctx.lineWidth=4;ctx.stroke()}
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const b of st.bt){ctx.globalAlpha=b.a?1:.45;ctx.font=`30px ${EF}`;ctx.fillText('🪤',b.x,b.y);ctx.globalAlpha=1}
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
  if(h.k==='t'){ctx.save();ctx.translate(h.x,h.y);ctx.fillStyle='rgba(30,41,59,.3)';ctx.beginPath();ctx.ellipse(0,h.r*.6,h.r*1.2,h.r*.4,0,0,7);ctx.fill();ctx.rotate(Math.sin(t*.01)*.15);ctx.font=`${h.r*2.6}px ${EF}`;ctx.fillText('🌪️',0,0);ctx.restore()}
  else if(h.k==='m'){const f=h.w/1600;ctx.font=`56px ${EF}`;ctx.fillText('☄️',h.x+f*260,h.y-f*520)}
  else if(h.k==='l'){ctx.font=`28px ${EF}`;ctx.fillText('⚡',h.x,h.y-6)}
  else if(h.k==='h'){const f=h.w/1000;ctx.font=`34px ${EF}`;ctx.fillText('🧊',h.x+f*40,h.y-f*420)}
  else if(h.k==='s'){ctx.font=`30px ${EF}`;ctx.fillText('🕳️',h.x,h.y)}
  else if(h.k==='b'&&h.w<=0){ctx.save();ctx.translate(h.x,h.y);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,h.r*.7,h.r*1.1,h.r*.35,0,0,7);ctx.fill();ctx.rotate(t*.008*(h.vx+h.vy>0?1:-1));ctx.font=`${h.r*2.4}px ${EF}`;ctx.fillText('🪨',0,0);ctx.restore()}}
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
