/* Polish layer for "That's My Property": sounds (WebAudio, no files), character sprites, ambient weather, minimap. */

const SFX=(()=>{
let ac=null,muted=false;try{muted=localStorage.getItem('tmp_mute')==='1'}catch(e){}
function ctx(){if(!ac){try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(ac.state==='suspended')ac.resume();return ac}
function tone(f,d,type,vol,slide,delay){const a=ctx();if(!a||muted)return;const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(delay||0);
 o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
 g.gain.setValueAtTime(vol||.12,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d)}
function noise(d,vol){const a=ctx();if(!a||muted)return;const n=a.sampleRate*d|0,b=a.createBuffer(1,n,a.sampleRate),da=b.getChannelData(0);
 for(let i=0;i<n;i++)da[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();
 f.type='lowpass';f.frequency.value=1800;s.buffer=b;g.gain.value=vol||.2;s.connect(f);f.connect(g);g.connect(a.destination);s.start()}
const S={
 tick:()=>tone(880,.08,'square',.05),count:()=>tone(520,.18,'square',.09),round:()=>tone(440,.2,'triangle',.1),
 go:()=>{tone(784,.25,'square',.1);tone(1175,.35,'square',.09,0,.12)},
 steal:()=>{tone(300,.14,'sawtooth',.12,400);tone(600,.22,'square',.08,300,.1)},
 dash:()=>noise(.15,.1),die:()=>tone(420,.55,'sawtooth',.12,-340),
 boom:()=>{noise(.5,.28);tone(120,.4,'sine',.25,-80)},zap:()=>{noise(.22,.25);tone(1200,.2,'sawtooth',.1,-900)},
 power:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.15,'triangle',.1,0,i*.07)),
 bad:()=>tone(300,.45,'sawtooth',.1,-150),snap:()=>{noise(.1,.28);tone(180,.2,'square',.12,-100)},
 win:()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,.28,'triangle',.12,0,i*.12))};
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>ctx()));
return{play:n=>{try{if(S[n])S[n]()}catch(e){}},get muted(){return muted},
 toggle(){muted=!muted;try{localStorage.setItem('tmp_mute',muted?'1':'0')}catch(e){}return muted}};
})();

const Sprites=(()=>{
const D=[
 {b:'#f59e0b',bl:'#fde68a',ear:'tri',ei:'#f9a8d4',m:'#fde68a',n:'#f472b6',tail:'#f59e0b'},          // 0 cat
 {b:'#c08457',bl:'#f5deb3',ear:'flop',ei:'#7c4a2d',m:'#f5deb3',n:'#1f2937',tail:'#c08457'},        // 1 dog
 {b:'#f97316',bl:'#fff7ed',ear:'tri',ei:'#1f2937',m:'#fff7ed',n:'#1f2937',tail:'#f97316',tip:'#fff'}, // 2 fox
 {b:'#f1f5f9',bl:'#f1f5f9',ear:'circ',ec:'#1f2937',ei:'#1f2937',m:'#e2e8f0',n:'#111827',limb:'#1f2937',patch:'#1f2937'}, // 3 panda
 {b:'#22c55e',bl:'#bbf7d0',ear:'eyes'},                                                                // 4 frog
 {b:'#92400e',bl:'#fcd34d',ear:'circ',ec:'#92400e',ei:'#fcd34d',m:'#fcd34d',n:'#451a03',tail:'#92400e'}, // 5 monkey
 {b:'#f8fafc',bl:'#ffffff',ear:'long',ei:'#f9a8d4',m:'#ffffff',n:'#f472b6',tail:'#ffffff'},           // 6 bunny
 {b:'#8b5a2b',bl:'#c69c6d',ear:'circ',ec:'#8b5a2b',ei:'#c69c6d',m:'#d9b38c',n:'#1f2937',tail:'#8b5a2b'}, // 7 bear
 {b:'#fb923c',bl:'#fff7ed',ear:'circ',ec:'#fb923c',ei:'#fff7ed',m:'#fff7ed',n:'#f472b6',tail:'#fb923c',stripes:'#7c2d12'}, // 8 tiger
 {b:'#f4b860',bl:'#fde7b0',ear:'circ',ec:'#e0a040',ei:'#fde7b0',mane:'#b45f1c',m:'#fde7b0',n:'#7c2d12',tail:'#f4b860',tip:'#b45f1c'}, // 9 lion
 {b:'#f9a8d4',bl:'#fbcfe8',ear:'tri',ei:'#f472b6',snout:'#f472b6',tail:'#f9a8d4'},                  // 10 pig
 {b:'#f8fafc',bl:'#f8fafc',ear:'flop',ei:'#1f2937',m:'#fbcfe8',n:'#be185d',spots:'#1f2937',tail:'#f8fafc'}, // 11 cow
 {b:'#9ca3af',bl:'#e5e7eb',ear:'circ',es:1.5,ec:'#9ca3af',ei:'#e5e7eb',m:'#d1d5db',n:'#111827'},      // 12 koala
 {b:'#cbd5e1',bl:'#f1f5f9',ear:'circ',es:1.3,ec:'#cbd5e1',ei:'#f9a8d4',m:'#f1f5f9',n:'#f472b6',tail:'#f9a8d4'}, // 13 mouse
 {b:'#94a3b8',bl:'#e2e8f0',ear:'tri',ei:'#64748b',m:'#e2e8f0',n:'#111827',tail:'#94a3b8'},          // 14 wolf
 {b:'#9ca3af',bl:'#d1d5db',ear:'circ',ec:'#6b7280',ei:'#d1d5db',mask:'#1f2937',m:'#e5e7eb',n:'#111827',tail:'#9ca3af',tip:'#374151'}, // 15 raccoon
 {b:'#1f2937',bl:'#f8fafc',ear:'none',face:'#f8fafc',beak:'#fb923c',feet:'#fb923c',limb:'#1f2937'},   // 16 penguin
 {b:'#fde047',bl:'#fef08a',ear:'none',beak:'#fb923c',feet:'#fb923c',limb:'#fde047'},                  // 17 chick
 {b:'#f5f3ff',bl:'#ffffff',ear:'tri',ei:'#f9a8d4',m:'#ffffff',n:'#f472b6',horn:'#fde047',tail:'#f0abfc'}, // 18 unicorn
 {b:'#94a3b8',bl:'#cbd5e1',ear:'none',ant:'#ef4444',ew:'#67e8f9',limb:'#64748b'}];                   // 19 robot
const el=(c,x,y,rx,ry,f,rot)=>{c.fillStyle=f;c.beginPath();c.ellipse(x,y,rx,ry,rot||0,0,7);c.fill()};
function draw(c,i,x,y,t,mv,fx,fy,dash){
 const d=D[i%D.length],sw=mv?Math.sin(t*.02):0,bob=mv?-Math.abs(Math.sin(t*.02))*2.5:Math.sin(t*.004)*-1,limb=d.limb||d.b,side=fx>=0?1:-1,hy=-9+bob;
 c.save();c.translate(x,y);if(dash)c.transform(1.15,0,0,.88,0,2);
 if(d.tail){el(c,-side*13,9+bob,6,4.5,d.tail,-side*.6);if(d.tip)el(c,-side*17,8+bob,3,2.5,d.tip,-side*.6)}
 el(c,-6,15+sw*3,4.6,4,d.feet||limb);el(c,6,15-sw*3,4.6,4,d.feet||limb);
 el(c,0,5+bob,11,11.5,d.b);if(d.bl!==d.b)el(c,0,7+bob,6.5,7.5,d.bl);
 if(d.spots){el(c,-5,3+bob,4,5,d.spots,.3);el(c,6,9+bob,3,3.5,d.spots)}
 if(d.stripes){c.strokeStyle=d.stripes;c.lineWidth=2;c.beginPath();for(const yy of[1,5,9]){c.moveTo(-10,yy+bob);c.lineTo(-6,yy+bob+1);c.moveTo(10,yy+bob);c.lineTo(6,yy+bob+1)}c.stroke()}
 el(c,-12,4+bob+sw*2.5,3.5,6,limb,.25);el(c,12,4+bob-sw*2.5,3.5,6,limb,-.25);
 if(d.mane)el(c,0,hy,17.5,17,d.mane);
 for(const s of[-1,1]){
  if(d.ear==='tri'){c.fillStyle=d.b;c.beginPath();c.moveTo(s*4,hy-9);c.lineTo(s*12,hy-18);c.lineTo(s*12,hy-3);c.fill();
   c.fillStyle=d.ei;c.beginPath();c.moveTo(s*6.5,hy-9);c.lineTo(s*10.5,hy-14);c.lineTo(s*10.5,hy-6);c.fill()}
  else if(d.ear==='flop')el(c,s*13,hy+1,4.5,9,d.ei,s*.3);
  else if(d.ear==='long'){el(c,s*6,hy-17,3.8,10.5,d.b,s*.12);el(c,s*6,hy-17,1.8,7.5,d.ei,s*.12)}
  else if(d.ear==='circ'){const k=d.es||1;el(c,s*10,hy-10,5*k,5*k,d.ec);el(c,s*10,hy-10,2.4*k,2.4*k,d.ei)}}
 el(c,0,hy,13,12.5,d.b);
 if(d.face)el(c,0,hy+2,9.5,8.5,d.face);
 if(d.spots)el(c,6,hy-5,4.2,4.2,d.spots);
 if(d.stripes){c.strokeStyle=d.stripes;c.lineWidth=2;c.beginPath();c.moveTo(-3,hy-12);c.lineTo(-3,hy-7);c.moveTo(0,hy-12.5);c.lineTo(0,hy-6.5);c.moveTo(3,hy-12);c.lineTo(3,hy-7);c.moveTo(-12,hy);c.lineTo(-8,hy+1);c.moveTo(12,hy);c.lineTo(8,hy+1);c.stroke()}
 if(d.mask)el(c,0,hy-.5,11.5,4.4,d.mask);
 if(d.horn){c.fillStyle=d.horn;c.beginPath();c.moveTo(-2.8,hy-11);c.lineTo(0,hy-25);c.lineTo(2.8,hy-11);c.fill()}
 if(d.ant){c.strokeStyle='#94a3b8';c.lineWidth=2;c.beginPath();c.moveTo(0,hy-12);c.lineTo(0,hy-19);c.stroke();el(c,0,hy-20,2.6,2.6,d.ant)}
 const ew=d.ew||'#fff';
 if(d.ear==='eyes')for(const s of[-1,1]){el(c,s*7,hy-10,5.5,5.5,d.b);el(c,s*7,hy-10,4,4,'#fff');el(c,s*7+fx*1.2,hy-10+fy*1.2,2,2,'#111')}
 else for(const s of[-1,1]){if(d.patch)el(c,s*5,hy,4.5,5.5,d.patch,s*.3);el(c,s*5,hy,3.6,3.8,ew);el(c,s*5+fx*1.4,hy+fy*1.2,1.8,1.9,'#111')}
 if(d.m)el(c,0,hy+5.5,6.5,4.5,d.m);if(d.n)el(c,0,hy+3.6,2.3,1.6,d.n);
 if(d.snout){el(c,0,hy+5,6.5,4.6,d.snout);el(c,-2.3,hy+5,1.1,1.5,'#9d174d');el(c,2.3,hy+5,1.1,1.5,'#9d174d')}
 if(d.beak)el(c,0,hy+5.5,3.8,2.6,d.beak);
 else if(!d.snout){c.strokeStyle='#1f2937';c.lineWidth=1.3;c.beginPath();
  if(d.ear==='eyes')c.arc(0,hy+3,7,.15*Math.PI,.85*Math.PI);else c.arc(0,hy+6,3,.2*Math.PI,.8*Math.PI);c.stroke()}
 c.restore();
}
return{draw,color:i=>D[i%D.length].b};
})();

const Ambient=(()=>{
let k='forest',ps=[];
function init(m){k=m;ps=Array.from({length:42},()=>({x:Math.random(),y:Math.random(),s:.5+Math.random()*.8,p:Math.random()*6.28}))}
function draw(c,w,h,t){const u=h/700;
 for(const p of ps){let x,y;
  if(k==='snow'){x=(p.x+Math.sin(t*.0008+p.p)*.02+1)%1;y=(p.y+t*.00007*p.s)%1;c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.arc(x*w,y*h,(1.5+p.s*1.8)*u,0,7);c.fill()}
  else if(k==='lava'){x=(p.x+Math.sin(t*.001+p.p)*.02+1)%1;y=1-(p.y+t*.00005*p.s)%1;c.fillStyle=`rgba(255,${100+p.s*80|0},30,${.3+.5*y})`;c.beginPath();c.arc(x*w,y*h,(1+p.s*1.6)*u,0,7);c.fill()}
  else if(k==='desert'){x=(p.x+t*.00012*p.s)%1;y=(p.y+Math.sin(t*.001+p.p)*.02+1)%1;c.fillStyle='rgba(255,240,200,.28)';c.beginPath();c.arc(x*w,y*h,(1+p.s*2)*u,0,7);c.fill()}
  else if(k==='swamp'){x=(p.x+Math.sin(t*.0006+p.p)*.04+1)%1;y=(p.y+Math.cos(t*.0005+p.p)*.04+1)%1;const a=.25+.55*Math.abs(Math.sin(t*.002+p.p*5));c.fillStyle=`rgba(190,242,100,${a})`;c.beginPath();c.arc(x*w,y*h,(1.4+p.s*1.6)*u,0,7);c.fill()}
  else if(k==='beach'){x=(p.x+Math.sin(t*.0008+p.p)*.03+1)%1;y=1-(p.y+t*.00006*p.s)%1;c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1.2*u;c.beginPath();c.arc(x*w,y*h,(2+p.s*3)*u,0,7);c.stroke()}
  else if(k==='candy'){x=(p.x+Math.sin(t*.0009+p.p)*.02+1)%1;y=(p.y+t*.00008*p.s)%1;c.fillStyle=['#fde047','#38bdf8','#a78bfa','#fff','#fb7185'][(p.p*3|0)%5];c.save();c.translate(x*w,y*h);c.rotate(t*.003+p.p);c.fillRect(-3*u,-1*u,6*u,2*u);c.restore()}
  else if(k==='space'){x=p.x;y=p.y;const a=.2+.8*Math.abs(Math.sin(t*.0015+p.p*4));c.fillStyle=`rgba(255,255,255,${a})`;c.beginPath();c.arc(x*w,y*h,(.8+p.s*1.2)*u,0,7);c.fill()}
  else if(k==='autumn'){x=(p.x+Math.sin(t*.0007+p.p)*.05+t*.00003+1)%1;y=(p.y+t*.00006*p.s)%1;c.fillStyle=['#ea580c','#dc2626','#f59e0b','#b45309'][(p.p*3|0)%4];c.save();c.translate(x*w,y*h);c.rotate(t*.002+p.p);c.beginPath();c.ellipse(0,0,4.5*u,2.5*u,0,0,7);c.fill();c.restore()}
  else if(k==='ruins'){x=(p.x+t*.00005*p.s+1)%1;y=(p.y+Math.sin(t*.0008+p.p)*.02+1)%1;c.fillStyle='rgba(212,212,216,.3)';c.beginPath();c.arc(x*w,y*h,(1+p.s*2)*u,0,7);c.fill()}
  else{x=(p.x+Math.sin(t*.0007+p.p)*.05+t*.00002+1)%1;y=(p.y+t*.00004*p.s)%1;c.fillStyle=p.s>.9?'rgba(250,204,21,.7)':'rgba(134,239,172,.6)';
   c.save();c.translate(x*w,y*h);c.rotate(t*.002+p.p);c.beginPath();c.ellipse(0,0,4*u,2*u,0,0,7);c.fill();c.restore()}}}
return{init,draw};
})();

const Minimap={draw(c,o){
 const{cw,ch,init:I,st,obs,traps,pos,names,you,cam}=o;if(!st)return;
 const u=ch/700,mw=170*u,mh=mw*I.h/I.w,x0=12*u,y0=ch-mh-12*u,k=mw/I.w;
 c.save();c.setTransform(1,0,0,1,0,0);
 c.fillStyle='rgba(8,12,22,.6)';c.fillRect(x0,y0,mw,mh);c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1.5*u;c.strokeRect(x0,y0,mw,mh);
 c.fillStyle='rgba(148,163,184,.55)';for(const b of obs){c.beginPath();c.arc(x0+b[0]*k,y0+b[1]*k,Math.max(1.5,b[2]*k),0,7);c.fill()}
 c.fillStyle='#ef4444';for(const b of traps)c.fillRect(x0+b[0]*k-1.5*u,y0+b[1]*k-1.5*u,3*u,3*u);
 c.fillStyle='#facc15';for(const b of st.lb)c.fillRect(x0+b.x*k-2*u,y0+b.y*k-2*u,4*u,4*u);
 c.fillStyle='#000';for(const o of (st.ho||[])){c.beginPath();c.arc(x0+o.x*k,y0+o.y*k,Math.max(1.5,o.r*k),0,7);c.fill()}
 if(st.fx>0||st.fy>0){c.fillStyle='rgba(37,99,235,.35)';c.fillRect(x0,y0,mw,mh);c.fillStyle='rgba(8,12,22,.6)';c.fillRect(x0+st.fx*k,y0+st.fy*k,mw-2*st.fx*k,mh-2*st.fy*k);c.strokeStyle='#38bdf8';c.lineWidth=1.5*u;c.strokeRect(x0+st.fx*k,y0+st.fy*k,mw-2*st.fx*k,mh-2*st.fy*k)}
 const HC={t:'#cbd5e1',m:'#ef4444',l:'#facc15',h:'#93c5fd',s:'#a16207',b:'#94a3b8'};
 for(const h of st.hz){c.strokeStyle=HC[h.k]||'#facc15';c.lineWidth=1.5*u;c.beginPath();c.arc(x0+h.x*k,y0+h.y*k,Math.max(2,h.r*k),0,7);c.stroke()}
 for(const p of st.p){if(!p.a)continue;
  const g=pos[p.id],inf=names[p.id]||{ch:0,team:'red'},hold=st.holder===p.id,col=I.mode==='team'?TEAMS[inf.team]:Sprites.color(inf.ch);
  const px=x0+(g?g.sx:p.x)*k,py=y0+(g?g.sy:p.y)*k;
  c.fillStyle=col;c.beginPath();c.arc(px,py,(hold?4.5:3)*u,0,7);c.fill();
  if(hold){c.strokeStyle='#facc15';c.lineWidth=2*u;c.stroke()}
  if(p.id===you){c.strokeStyle='#fff';c.lineWidth=1.5*u;c.beginPath();c.arc(px,py,5.5*u,0,7);c.stroke()}}
 c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1*u;c.strokeRect(x0+cam[0]*k,y0+cam[1]*k,cam[2]*k,cam[3]*k);
 c.restore();
}};

(function(){const h=document.getElementById('home');if(!h)return;
 ['🏠','🐱','🦁','🦊','🐼','🐸','🐧','🎁','🦄','🏠'].forEach((e,i)=>{const s=document.createElement('span');s.className='fl';s.textContent=e;
  s.style.left=(4+i*10)+'%';s.style.animationDuration=(14+i*2.3)+'s';s.style.animationDelay=(-i*3)+'s';h.prepend(s)})})();

/* Fullscreen toggle: one button per screen (home, lobby, game), all kept in sync. */
const FS=(()=>{
 const de=document.documentElement,req=de.requestFullscreen||de.webkitRequestFullscreen,ex=document.exitFullscreen||document.webkitExitFullscreen;
 const on=()=>!!(document.fullscreenElement||document.webkitFullscreenElement),btns=[];
 const sync=b=>{b.textContent=on()?'⤡':'⛶';b.title=on()?'Exit fullscreen':'Fullscreen'};
 async function toggle(){
  if(!req){if(typeof toast==='function')toast('Fullscreen isn’t supported here. On iPhone use Share → Add to Home Screen.');return}
  try{if(on())await ex.call(document);else{await req.call(de);try{await screen.orientation.lock('landscape')}catch(e){}}}catch(e){}
 }
 function button(cls){const b=document.createElement('button');b.className='ghost fsb '+(cls||'');b.setAttribute('aria-label','Toggle fullscreen');b.onclick=toggle;sync(b);btns.push(b);return b}
 ['fullscreenchange','webkitfullscreenchange'].forEach(e=>document.addEventListener(e,()=>{btns.forEach(sync);if(!on()){try{screen.orientation.unlock()}catch(x){}}}));
 const home=document.getElementById('home');if(home)home.append(button('fs-home'));
 const lv=document.getElementById('leave');
 if(lv){const w=document.createElement('div');w.style.cssText='display:flex;gap:8px';lv.replaceWith(w);w.append(button(),lv)}
 return{button};
})();
