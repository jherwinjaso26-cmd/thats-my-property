/* Polish layer for "That's My Property": sounds (WebAudio, no files), character sprites, ambient weather, minimap. */

/* Settings: saved in this browser. Used by sounds, music, screen shake and vibration. */
const Settings=(()=>{
const v={music:.5,sfx:.8,musicOn:true,shake:true,vibe:true,gfx3d:true,gfx:'auto',cam:'tilt',amb:.5,lefty:false,btn:1,cb:false,big:false,fps30:false},ls=[];
try{Object.assign(v,JSON.parse(localStorage.getItem('tmp_settings')||'{}'))}catch(e){}
return{get:k=>v[k],on:fn=>ls.push(fn),
 set(k,x){v[k]=x;try{localStorage.setItem('tmp_settings',JSON.stringify(v))}catch(e){}ls.forEach(f=>f(k))}};
})();

const SFX=(()=>{
let ac=null,muted=false,att=1;try{muted=localStorage.getItem('tmp_mute')==='1'}catch(e){}
function ctx(){if(!ac){try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(ac.state==='suspended')ac.resume();return ac}
function tone(f,d,type,vol,slide,delay){const a=ctx();if(!a||muted)return;const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(delay||0);
 o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
 g.gain.setValueAtTime(Math.max(.0001,(vol||.12)*Settings.get('sfx')/.8*att),t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d)}
function noise(d,vol){const a=ctx();if(!a||muted)return;const n=a.sampleRate*d|0,b=a.createBuffer(1,n,a.sampleRate),da=b.getChannelData(0);
 for(let i=0;i<n;i++)da[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();
 f.type='lowpass';f.frequency.value=1800;s.buffer=b;g.gain.value=(vol||.2)*Settings.get('sfx')/.8*att;s.connect(f);f.connect(g);g.connect(a.destination);s.start()}
/* filtered noise that sweeps from one pitch to another: whooshes, thunder, splashes */
function sweep(d,vol,f0,f1,type,q){const a=ctx();if(!a||muted)return;const n=a.sampleRate*d|0,b=a.createBuffer(1,n,a.sampleRate),da=b.getChannelData(0);
 for(let i=0;i<n;i++){const k=i/n;da[i]=(Math.random()*2-1)*Math.min(1,k*8)*(1-k)}
 const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(),t=a.currentTime;f.type=type||'bandpass';f.Q.value=q||1.2;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+d);
 g.gain.value=(vol||.2)*Settings.get('sfx')/.8*att;s.buffer=b;s.connect(f);f.connect(g);g.connect(a.destination);s.start()}
const S={
 tick:()=>tone(880,.08,'square',.05),
 hold:()=>{tone(660,.1,'triangle',.16);tone(990,.16,'sine',.1,0,.07)},
 holdHot:()=>{tone(880,.1,'square',.12);tone(1320,.14,'triangle',.12,0,.06);tone(1760,.1,'sine',.07,0,.12)},count:()=>tone(520,.18,'square',.09),round:()=>tone(440,.2,'triangle',.1),
 go:()=>{tone(784,.25,'square',.1);tone(1175,.35,'square',.09,0,.12)},
 steal:()=>{tone(300,.14,'sawtooth',.12,400);tone(600,.22,'square',.08,300,.1)},
 dash:()=>{sweep(.28,.3,500,3200,'bandpass',.9);tone(180,.12,'sine',.08,200)},die:()=>tone(420,.55,'sawtooth',.12,-340),
 boom:()=>{noise(.5,.28);tone(120,.4,'sine',.25,-80)},zap:()=>{noise(.22,.25);tone(1200,.2,'sawtooth',.1,-900)},
 power:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.15,'triangle',.1,0,i*.07)),
 bad:()=>tone(300,.45,'sawtooth',.1,-150),snap:()=>{noise(.1,.28);tone(180,.2,'square',.12,-100)},
 bounce:()=>tone(260,.22,'sine',.14,520),tp:()=>{tone(900,.28,'sine',.1,-650);tone(450,.3,'triangle',.08,500,.08)},
 swap:()=>{tone(500,.12,'square',.07,300);tone(800,.14,'square',.07,-300,.1)},emote:()=>tone(760,.09,'triangle',.07,160),
 win:()=>[523,659,784,1047,1319,1568].forEach((f,i)=>tone(f,.32,'triangle',.12,0,i*.12)),
 click:()=>tone(1300,.05,'square',.04),tab:()=>tone(900,.06,'triangle',.06,300),
 step:()=>sweep(.07,.06+Math.random()*.03,500+Math.random()*500,250,'lowpass',.7),
 thunder:()=>{sweep(1.5,.55,700,60,'lowpass',.8);tone(55,1,'sine',.3,-20)},crack:()=>{sweep(.25,.35,5000,800,'highpass',.7);tone(2000,.12,'sawtooth',.08,-1500)},
 splash:()=>sweep(.5,.3,2400,300,'bandpass',.8),wind:()=>sweep(1.2,.1,300,900,'bandpass',2),
 warn:()=>{tone(740,.12,'square',.06);tone(740,.12,'square',.06,0,.18)},
 point:()=>[659,880,1175].forEach((f,i)=>tone(f,.18,'triangle',.14,0,i*.08)),
 pw_speed:()=>{tone(300,.35,'sawtooth',.09,900);sweep(.3,.2,600,3000)},pw_shield:()=>{tone(880,.4,'sine',.12);tone(1320,.5,'sine',.08,0,.08)},
 pw_trap:()=>{tone(220,.12,'square',.1);tone(160,.14,'square',.1,0,.1)},pw_smoke:()=>sweep(.6,.25,1500,200,'lowpass'),
 pw_decoy:()=>{tone(600,.1,'triangle',.1);tone(600,.1,'triangle',.1,0,.12);tone(900,.2,'triangle',.1,0,.24)},
 drown:()=>{sweep(.6,.3,1800,150,'lowpass');tone(300,.5,'sine',.08,-200)},
 pop:()=>tone(520,.07,'sine',.12,500),
 pw_magnet:()=>{tone(200,.5,'sawtooth',.08,500);tone(400,.4,'triangle',.08,200,.05)},pw_jump:()=>{tone(300,.25,'square',.08,900);sweep(.25,.18,400,2500)},
 pw_reveal:()=>[880,1175,1568].forEach((f,i)=>tone(f,.25,'sine',.1,0,i*.07)),
 pw_ghost:()=>{tone(700,.4,'sine',.1,-300);tone(500,.5,'sine',.08,-200,.1)},pw_tele:()=>{sweep(.3,.2,300,3000);tone(900,.2,'triangle',.1,400,.1)},pw_mine:()=>{tone(150,.15,'square',.1);tone(120,.2,'square',.08,0,.15)},
 fanfare:()=>[523,659,784].forEach((f,i)=>tone(f,.22,'triangle',.1,0,i*.1))};
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>ctx()));
return{play:n=>{try{if(S[n])S[n]()}catch(e){}},
 /* play a sound that fades with distance from the listener */
 at(n,d){att=Math.max(.1,1-d/900);try{if(S[n])S[n]()}catch(e){}att=1},ctx,get muted(){return muted},
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
 {b:'#94a3b8',bl:'#cbd5e1',ear:'none',ant:'#ef4444',ew:'#67e8f9',limb:'#64748b'},                    // 19 robot
 {b:'#a16207',bl:'#fde68a',ear:'tri',ei:'#78350f',face:'#fef3c7',beak:'#f59e0b',limb:'#854d0e'},       // 20 owl
 {b:'#a78bfa',bl:'#ddd6fe',ear:'circ',ec:'#a78bfa',ei:'#f9a8d4',es:.8,snout:'#c4b5fd',tail:'#a78bfa'}, // 21 hippo
 {b:'#22c55e',bl:'#bbf7d0',ear:'none',horn:'#fde047',m:'#bbf7d0',n:'#14532d',tail:'#22c55e',tip:'#f97316'}, // 22 dragon
 {b:'#facc15',bl:'#fef08a',ear:'none',ant:'#1f2937',stripes:'#1f2937',m:'#fef08a',n:'#1f2937',limb:'#1f2937'}];  // 23 bee
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
return{draw,D,color:i=>D[i%D.length].b};
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

/* A quiet looping sound bed for each map (wind, waves, rumble...), made from filtered noise. */
const AmbSound=(()=>{
let src=null,g=null,lfo=null,lg=null,map='';
const P={forest:['bandpass',420,.8,.05,.12,.03],desert:['bandpass',700,.5,.07,.08,.04],snow:['bandpass',900,.4,.05,.1,.03],lava:['lowpass',160,1,.13,.2,.05],
 swamp:['lowpass',260,1.2,.08,.15,.03],beach:['lowpass',700,.7,.1,.11,.07],candy:['bandpass',2400,2,.012,.3,.01],space:['lowpass',90,1.5,.13,.05,.02],
 autumn:['bandpass',600,.6,.05,.1,.03],ruins:['bandpass',350,.5,.05,.07,.02],reef:['lowpass',520,.8,.11,.12,.06],mansion:['bandpass',240,.9,.07,.06,.03]};
const lvl=()=>SFX.muted?0:Settings.get('amb')*Settings.get('sfx')*2.2;
function start(m){stop();const a=SFX.ctx();if(!a)return;map=m;const p=P[m]||P.forest;
 const n=a.sampleRate*3|0,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);let last=0;
 for(let i=0;i<n;i++){last=last*.97+(Math.random()*2-1)*.03;d[i]=last*8} // brown-ish noise: smooth, no hiss
 src=a.createBufferSource();src.buffer=b;src.loop=true;
 const f=a.createBiquadFilter();f.type=p[0];f.frequency.value=p[1];f.Q.value=p[2];
 g=a.createGain();g.gain.value=0;lfo=a.createOscillator();lfo.frequency.value=p[4];lg=a.createGain();lg.gain.value=p[5];
 lfo.connect(lg);lg.connect(g.gain);src.connect(f);f.connect(g);g.connect(a.destination);src.start();lfo.start();
 g.gain.setTargetAtTime(p[3]*lvl(),a.currentTime,1.2)}
function stop(){if(!src)return;const a=SFX.ctx();try{g.gain.setTargetAtTime(0,a.currentTime,.3);const s=src,l=lfo;setTimeout(()=>{try{s.stop();l.stop()}catch(e){}},1200)}catch(e){}src=null;lfo=null}
Settings.on(k=>{if(!src||(k!=='amb'&&k!=='sfx'))return;const a=SFX.ctx(),p=P[map]||P.forest;g.gain.setTargetAtTime(p[3]*lvl(),a.currentTime,.2)});
return{start,stop};
})();

const Minimap={draw(c,o){
 const{cw,ch,init:I,st,obs,traps,pos,names,you,cam}=o;if(!st)return;
 const u=ch/700,mw=170*u,mh=mw*I.h/I.w,x0=12*u,y0=ch-mh-12*u,k=mw/I.w;
 c.save();c.setTransform(1,0,0,1,0,0);
 c.fillStyle='rgba(8,12,22,.6)';c.fillRect(x0,y0,mw,mh);c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1.5*u;c.strokeRect(x0,y0,mw,mh);
 c.fillStyle='rgba(148,163,184,.55)';for(const b of obs){c.beginPath();c.arc(x0+b[0]*k,y0+b[1]*k,Math.max(1.5,b[2]*k),0,7);c.fill()}
 const ZC={ice:'#bfe3ff',slow:'#a16207',bush:'#16a34a',bounce:'#f472b6',portal:'#a78bfa',lava:'#ef4444'};c.globalAlpha=.5;for(const z of (o.zones||[])){c.fillStyle=ZC[z.k]||'#fff';c.beginPath();c.arc(x0+z.x*k,y0+z.y*k,Math.max(1.5,z.r*k),0,7);c.fill()}c.globalAlpha=1;
 c.fillStyle='#ef4444';for(const b of traps)c.fillRect(x0+b[0]*k-1.5*u,y0+b[1]*k-1.5*u,3*u,3*u);
 c.fillStyle='#facc15';for(const b of st.lb)c.fillRect(x0+b.x*k-2*u,y0+b.y*k-2*u,4*u,4*u);
 c.fillStyle='#000';for(const o of (st.ho||[])){c.beginPath();c.arc(x0+o.x*k,y0+o.y*k,Math.max(1.5,o.r*k),0,7);c.fill()}
 if(st.fx>0||st.fy>0){c.fillStyle='rgba(37,99,235,.35)';c.fillRect(x0,y0,mw,mh);c.fillStyle='rgba(8,12,22,.6)';c.fillRect(x0+st.fx*k,y0+st.fy*k,mw-2*st.fx*k,mh-2*st.fy*k);c.strokeStyle='#38bdf8';c.lineWidth=1.5*u;c.strokeRect(x0+st.fx*k,y0+st.fy*k,mw-2*st.fx*k,mh-2*st.fy*k)}
 const HC={t:'#cbd5e1',m:'#ef4444',l:'#facc15',h:'#93c5fd',s:'#a16207',b:'#94a3b8'};
 for(const h of st.hz){c.strokeStyle=HC[h.k]||'#facc15';c.lineWidth=1.5*u;c.beginPath();c.arc(x0+h.x*k,y0+h.y*k,Math.max(2,h.r*k),0,7);c.stroke()}
 for(const p of st.p){if(!p.a)continue;
  const g=pos[p.id],inf=names[p.id]||{ch:0,team:'red'},hold=st.holder===p.id||st.holder2===p.id,col=I.mode==='team'?TEAMS[inf.team]:Sprites.color(inf.ch);
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
 const STANDALONE=!!(navigator.standalone||(window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches)));
 if(STANDALONE)document.documentElement.classList.add('app');
 const de=document.documentElement,req=de.requestFullscreen||de.webkitRequestFullscreen,ex=document.exitFullscreen||document.webkitExitFullscreen;
 const on=()=>!!(document.fullscreenElement||document.webkitFullscreenElement),btns=[];
 const sync=b=>{b.textContent=on()?'⤡':'⛶';b.title=on()?'Exit fullscreen':'Fullscreen'};
 async function toggle(){
  if(!req){if(typeof toast==='function')toast('iPhone can’t full-screen a web page. Tap Share → Add to Home Screen, then open the game from that icon.');return}
  try{if(on())await ex.call(document);else{await req.call(de);try{await screen.orientation.lock('landscape')}catch(e){}}}catch(e){}
 }
 function button(cls){const b=document.createElement('button');b.className='ghost fsb '+(cls||'');b.setAttribute('aria-label','Toggle fullscreen');b.onclick=toggle;sync(b);btns.push(b);return b}
 ['fullscreenchange','webkitfullscreenchange'].forEach(e=>document.addEventListener(e,()=>{btns.forEach(sync);if(!on()){try{screen.orientation.unlock()}catch(x){}}}));
 ['home','host','joinS','lobby'].forEach(id=>{const s=document.getElementById(id);if(s)s.append(button('fs-home'))});
 const lv=document.getElementById('leave');
 if(lv){const w=document.createElement('div');w.style.cssText='display:flex;gap:8px';lv.replaceWith(w);w.append(button(),lv)}
 return{button};
})();

/* Lobby music: a calm looping track made live with WebAudio (no audio files). Plays in the lobby, fades out when a match starts. */
const Music=(()=>{
let ac=null,mg=null,timer=null,nb=null,nextT=0,step=0,playing=false,wanted=false,stopT=0;
let SPB=60/84/4,track='lobby',hot=false; // sixteenth-note grid
const TR={lobby:{bpm:84,c:[{n:[57,60,64,67],b:45},{n:[53,57,60,64],b:41},{n:[60,64,67,71],b:48},{n:[55,59,62,64],b:43}]}, // Am7 Fmaj7 Cmaj7 G6
 match:{bpm:128,c:[{n:[62,65,69,72],b:38},{n:[58,62,65,69],b:34},{n:[60,64,67,71],b:36},{n:[57,61,64,67],b:33}]}}; // Dm Bb C A7: driving
let CHORDS=TR.lobby.c;
const ARP=[0,1,2,3,2,1,3,2],PENT=[69,72,74,76,79,81];
const hz=m=>440*Math.pow(2,(m-69)/12);
function ensure(){
 try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){} // iOS: play even when the silent switch is on
 if(!ac){
  try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return false}
  mg=ac.createGain();mg.gain.value=0;
  const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;
  const cp=ac.createDynamicsCompressor();cp.threshold.value=-12;cp.ratio.value=4; // lets the music be loud without clipping
  mg.connect(lp);lp.connect(cp);cp.connect(ac.destination);
  nb=ac.createBuffer(1,ac.sampleRate*.3|0,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 }
 return true;
}
function osc(type,f,t,dur,vol,att,det){
 const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=f;if(det)o.detune.value=det;
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g);g.connect(mg);o.start(t);o.stop(t+dur+.05);
}
function kick(t){
 const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);
 g.gain.setValueAtTime(.6,t);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(mg);o.start(t);o.stop(t+.25);
}
function hat(t){
 const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=nb;f.type='highpass';f.frequency.value=7000;
 g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.0001,t+.05);s.connect(f);f.connect(g);g.connect(mg);s.start(t);s.stop(t+.06);
}
function snare(t){
 const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=nb;f.type='bandpass';f.frequency.value=1900;
 g.gain.setValueAtTime(.3,t);g.gain.exponentialRampToValueAtTime(.0001,t+.13);s.connect(f);f.connect(g);g.connect(mg);s.start(t);s.stop(t+.14);
}
function playMatch(s,t){
 const bar=(s>>4)&3,k=s&15,c=CHORDS[bar];
 if(k===0)c.n.forEach((m,i)=>osc('triangle',hz(m),t,SPB*15,.07,.3,(i-1.5)*6));
 if(k%4===0){kick(t);osc('sawtooth',hz(c.b),t,SPB*3.2,.2,.01)}
 else if(k%4===2)osc('sawtooth',hz(c.b+(k%8===6?12:0)),t,SPB*1.6,.14,.01);
 if(k===4||k===12)snare(t);
 if(k%2===1||hot)hat(t);
 if(k%2===0||hot)osc('square',hz(c.n[ARP[(k>>1)&7]]+(hot?24:12)),t,SPB*1.6,hot?.075:.05,.01);
 if((k===3||k===7||k===11||k===14)&&Math.random()<(hot?.8:.45))osc('triangle',hz(PENT[Math.random()*PENT.length|0]+12),t,SPB*2.5,.09,.02);
}
function play(s,t){
 if(track==='match')return playMatch(s,t);
 const bar=(s>>4)&3,k=s&15,c=CHORDS[bar];
 if(k===0){c.n.forEach((m,i)=>osc('triangle',hz(m),t,SPB*15.5,.1,.5,(i-1.5)*5));osc('sine',hz(c.b),t,SPB*6,.45,.02)}
 if(k===8)osc('sine',hz(c.b),t,SPB*5,.36,.02);
 if(k===6||k===14)osc('sine',hz(c.b+12),t,SPB*1.5,.16,.01);
 if(k%2===0)osc('square',hz(c.n[ARP[(k>>1)&7]]+12),t,SPB*1.9,.06,.01);
 if(k===0||k===10)kick(t);
 if(k%4===2)hat(t);
 if((k===0||k===6||k===10||k===13)&&Math.random()<.45)osc('triangle',hz(PENT[Math.random()*PENT.length|0]),t,SPB*3,.1,.02);
}
function sched(){
 if(nextT<ac.currentTime)nextT=ac.currentTime+.05; // after a pause, don't replay what was missed
 while(nextT<ac.currentTime+.3){play(step,nextT);nextT+=SPB;step++}
}
function level(){return Settings.get('music')*.9*(track==='match'?.7:1)}
function start(){
 if(playing||!ensure())return;
 playing=true;clearTimeout(stopT);
 if(ac.state==='suspended')ac.resume().catch(()=>{});
 nextT=ac.currentTime+.15;step=0;clearInterval(timer);
 timer=setInterval(()=>{if(ac.state==='running')sched()},80);
 mg.gain.cancelScheduledValues(ac.currentTime);mg.gain.setTargetAtTime(level(),ac.currentTime,.8);
}
function stop(){
 if(!playing)return;
 playing=false;mg.gain.cancelScheduledValues(ac.currentTime);mg.gain.setTargetAtTime(0,ac.currentTime,.25);
 clearTimeout(stopT);stopT=setTimeout(()=>{if(!playing)clearInterval(timer)},1500);
}
function sync(){if(wanted&&Settings.get('musicOn')&&Settings.get('music')>0&&!(track==='match'&&SFX.muted))start();else stop()}
Settings.on(k=>{if(playing&&k==='music')mg.gain.setTargetAtTime(level(),ac.currentTime,.1);sync()});
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let keep=null;
function iosKeepAlive(){if(!IOS||keep)return;try{keep=new Audio('data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');keep.loop=true;keep.setAttribute('playsinline','');keep.play().catch(()=>{keep=null})}catch(e){keep=null}}
// browsers only allow sound after a tap or key press, so the first one wakes the audio up
['pointerdown','keydown','touchend'].forEach(e=>addEventListener(e,()=>{iosKeepAlive();if(ensure()&&ac.state!=='running')ac.resume().catch(()=>{});sync()},{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend().catch(()=>{});else if(playing)ac.resume().catch(()=>{})});
return{want(b,tr){wanted=!!b;if(tr&&tr!==track){track=tr;SPB=60/TR[tr].bpm/4;CHORDS=TR[tr].c;step=0;hot=false;if(playing)mg.gain.setTargetAtTime(level(),ac.currentTime,.3)}sync()},
 tense(v){hot=!!v},get playing(){return playing}};
})();

/* Settings panel (opened from the home and lobby screens) and the lobby music button. */
(function(){
 const g=id=>document.getElementById(id),m=g('settings');if(!m)return;
 const sync=()=>{g('sMusic').value=Settings.get('music')*100;g('sSfx').value=Settings.get('sfx')*100;g('sMusicOn').checked=Settings.get('musicOn');g('sShake').checked=Settings.get('shake');g('sVibe').checked=Settings.get('vibe');g('sAmb').value=Settings.get('amb')*100;g('sGfx3d').checked=Settings.get('gfx3d')!==false;g('sGfx').value=Settings.get('gfx');g('sCam').value=Settings.get('cam');g('sLefty').checked=!!Settings.get('lefty');g('sBtn').value=Settings.get('btn')*100;g('sCb').checked=!!Settings.get('cb');g('sBig').checked=!!Settings.get('big');g('sFps30').checked=!!Settings.get('fps30')};
 const open=()=>{sync();m.style.display='flex'};
 ['gearH','gearL'].forEach(i=>{const b=g(i);if(b)b.onclick=open});
 g('sClose').onclick=()=>m.style.display='none';
 m.addEventListener('pointerdown',e=>{if(e.target===m)m.style.display='none'});
 g('sMusic').oninput=e=>Settings.set('music',e.target.value/100);
 g('sSfx').oninput=e=>Settings.set('sfx',e.target.value/100);
 g('sSfx').onchange=()=>SFX.play('power');
 g('sAmb').oninput=e=>Settings.set('amb',e.target.value/100);
 g('sGfx3d').onchange=e=>Settings.set('gfx3d',e.target.checked);
 g('sGfx').onchange=e=>Settings.set('gfx',e.target.value);
 g('sCam').onchange=e=>Settings.set('cam',e.target.value);
 g('sLefty').onchange=e=>Settings.set('lefty',e.target.checked);
 g('sBtn').oninput=e=>Settings.set('btn',e.target.value/100);
 g('sCb').onchange=e=>Settings.set('cb',e.target.checked);
 g('sBig').onchange=e=>Settings.set('big',e.target.checked);
 g('sFps30').onchange=e=>Settings.set('fps30',e.target.checked);
 g('sMusicOn').onchange=e=>Settings.set('musicOn',e.target.checked);
 g('sShake').onchange=e=>Settings.set('shake',e.target.checked);
 g('sVibe').onchange=e=>{Settings.set('vibe',e.target.checked);if(e.target.checked&&navigator.vibrate)try{navigator.vibrate(60)}catch(x){}};
 const mus=g('mus');
 if(mus){const upd=()=>{mus.textContent=Settings.get('musicOn')?'🎵':'🔇';mus.title='Lobby music'};upd();mus.onclick=()=>Settings.set('musicOn',!Settings.get('musicOn'));Settings.on(upd)}
})();

/* soft click on every button (except the dash button, which has its own sound) */
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('button');if(b&&!b.disabled&&b.id!=='hDash'&&b.id!=='hTrap')SFX.play('click')},{passive:true});

/* every animal's special move: [icon, name, description, recharge seconds, colour, effect radius, effects, effect ms]. Must match Abilities.java on the server. */
const ABIL=[
 ['🐱','Pounce','A fast leap forward.',9,'#fb923c',90,'dash'],
 ['🐶','Sniff Out','See every player, even in bushes and the dark, for 6 seconds.',16,'#fde047',90,'reveal',6000],
 ['🦊','Fox Decoy','Leave a fake copy of yourself for 8 seconds.',16,'#f97316',90,'decoy'],
 ['🐼','Bamboo Guard','A shield blocks steals for 3.5 seconds.',18,'#38bdf8',90,'shield'],
 ['🐸','Long Tongue','Steal from further away for 4.5 seconds.',15,'#4ade80',90,'magnet'],
 ['🐵','Banana Trap','Drop a trap that holds the first victim for 3 seconds.',14,'#facc15',90,'trap'],
 ['🐰','Super Hop','Run much faster for 3.5 seconds.',14,'#f9a8d4',90,'speed'],
 ['🐻','Bear Roar','Freezes nearby players for 1.2 seconds.',20,'#b45309',170,'stun'],
 ['🐯','Tiger Strike','A leap that also lengthens your steal reach.',15,'#f97316',100,'dash magnet'],
 ['🦁','Mighty Roar','Blasts nearby players away.',20,'#fbbf24',200,'push'],
 ['🐷','Truffle Bomb','Drops a mine that throws back whoever steps on it.',16,'#f472b6',90,'mine'],
 ['🐮','Stampede','A burst of speed and a short shield.',18,'#e5e7eb',90,'speed shield'],
 ['🐨','Tree Climb','Walk through obstacles for 3.5 seconds.',18,'#94a3b8',90,'ghost'],
 ['🐭','Squeak Escape','Teleports you to a random free spot.',16,'#fda4af',90,'tele'],
 ['🐺','Pack Howl','Speed up and see every player for 3 seconds.',17,'#cbd5e1',90,'speed reveal',3000],
 ['🦝','Sneaky Smoke','Hide in smoke for 4.5 seconds.',15,'#9ca3af',90,'smoke'],
 ['🐧','Belly Slide','A long slide with a brief shield.',14,'#7dd3fc',100,'dash shield'],
 ['🐥','Peck Frenzy','Quick speed and a longer steal reach.',14,'#fde047',90,'speed magnet'],
 ['🦄','Rainbow Dash','A long rainbow sprint with a shield.',18,'#c084fc',100,'speed shield'],
 ['🤖','Radar Scan','See every player for 8 seconds.',22,'#67e8f9',90,'reveal',8000],
 ['🦉','Wing Gust','A gust pushes players away and speeds you up.',16,'#a8a29e',150,'push speed'],
 ['🦛','Splash Stomp','Freezes nearby players and shields you.',20,'#a78bfa',150,'stun shield'],
 ['🐲','Fire Breath','Burns nearby players: they freeze and are pushed back.',18,'#fb923c',220,'stun push'],
 ['🐝','Buzz Sting','A burst of speed and a mine behind you.',15,'#facc15',90,'speed mine']];
;window.__ld_fx=1;
