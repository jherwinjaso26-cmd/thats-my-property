/* "That's My Property" 3D renderer (Three.js r128).
   It draws exactly the same server state the 2D renderer draws (game.js feeds it every frame).
   Everything is built from code: no models, textures or sounds to download.
   If Three.js did not load, or anything throws, game.js quietly falls back to the 2D renderer. */
const R3D=(()=>{
const T=window.THREE;
if(!T){const N=()=>{};return{available:()=>false,get on(){return false},attach:N,init:()=>false,setRound:N,frame:N,burst:N,fx:N,resize:N,stop:N,hide:N,lower:()=>false,toScreen:()=>null,previewStart:()=>false,previewSet:N,previewStop:N,previewRotate:N,mapShot:()=>null}}

const PI=Math.PI,EF='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
let failed=false,rd=null,sc=null,cam=null,sun=null,hemi=null,glCv=null,I=null,map='forest',TMH=null,active=false,quality=2,shadowsOn=false;
let chars={},names={},own=[],dyn=null,statics=null,cw=16,ch=9,tNow=0;
const season=(()=>{const d=new Date(),mo=d.getMonth()+1,dd=d.getDate();if((mo===10&&dd>=24)||(mo===11&&dd<=2))return 'halloween';if((mo===12&&dd>=15)||(mo===1&&dd<=2))return 'xmas';return ''})();
let wTick=0,shTick=0,crowd=false,rainy=false,snapReq=null,tod=0,punch=0,fcx=0,fcz=0,fcInit=false,zoom=1.4,orbit=0,fovK=0,flash=0,nightK=0,shakeAmt=0;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const _e=new T.Euler(),_q=new T.Quaternion(),_c=new T.Color();
/* colours reused every frame (no allocations in the render loop) */
const KC={night:new T.Color('#050818'),sunset:new T.Color('#ff9a62'),dusk:new T.Color('#4a3a7a'),rain:new T.Color('#6b7a8f'),hal:new T.Color('#4a2368'),xmas:new T.Color('#dff1ff'),meteor:new T.Color('#7a2d10'),storm:new T.Color('#3a4252'),hail:new T.Color('#aebccb'),sunSet:new T.Color('#ffb070'),hemSet:new T.Color('#ffd2a8'),sunDusk:new T.Color('#b9a8ff'),hemDusk:new T.Color('#9a90d8')};
const _bg=new T.Color(),skyC=new T.Color(),fogC=new T.Color(),sunC=new T.Color(),hemC=new T.Color(),fogMix=new T.Color();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const mul=(a,b)=>{const m=new T.Matrix4();m.multiplyMatrices(a,b);return m};
const keep=o=>{own.push(o);return o};

/* ---------- small geometry kit: parts with colours, merged into one mesh ---------- */
function mat4(p,s,r){
 const k=typeof s==='number'?[s,s,s]:(s||[1,1,1]);r=r||[0,0,0];p=p||[0,0,0];
 _e.set(r[0],r[1],r[2]);_q.setFromEuler(_e);
 return new T.Matrix4().compose(V(p[0],p[1],p[2]),_q,V(k[0],k[1],k[2]))}
const part=(g,c,p,s,r)=>({g,c,m:mat4(p,s,r)});
const G={sph:new T.SphereGeometry(1,14,10),sph2:new T.SphereGeometry(1,8,6),cone:new T.ConeGeometry(1,1,9,1),cone4:new T.ConeGeometry(1,1,4,1),cyl:new T.CylinderGeometry(1,1,1,12,1),
 box:new T.BoxGeometry(1,1,1),dod:new T.DodecahedronGeometry(1,0),ico:new T.IcosahedronGeometry(1,0),ico1:new T.IcosahedronGeometry(1,1),oct:new T.OctahedronGeometry(1,0),
 circ:new T.CircleGeometry(1,32),ring:new T.RingGeometry(.9,1,48),ring2:new T.RingGeometry(.97,1,48),plane:new T.PlaneGeometry(1,1),
 tube:new T.CylinderGeometry(1,1,1,18,1,true),tor:new T.TorusGeometry(1,.09,8,36)};
const ball=(c,x,y,z,a,b,d)=>part(G.sph,c,[x,y,z],[a,b==null?a:b,d==null?a:d]);
const cone=(c,x,y,z,r,h,rz)=>part(G.cone,c,[x,y+h/2,z],[r,h,r],[0,0,rz||0]);
const cyl=(c,x,y,z,r,h,rx,rz)=>part(G.cyl,c,[x,y+h/2,z],[r,h,r],[rx||0,0,rz||0]);
const box=(c,x,y,z,w,h,d,ry)=>part(G.box,c,[x,y+h/2,z],[w,h,d],[0,ry||0,0]);
const dod=(c,x,y,z,a,b,d,ry)=>part(G.dod,c,[x,y,z],[a,b,d],[0,ry||0,0]);
function merge(parts,base){
 const gs=[];let n=0;
 for(const p of parts){const g=p.g.index?p.g.toNonIndexed():p.g.clone();g.applyMatrix4(base?mul(base,p.m):p.m);gs.push(g);n+=g.attributes.position.count}
 const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
 gs.forEach((g,i)=>{const cnt=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);
  _c.set(parts[i].c);for(let k=0;k<cnt;k++){col[(o+k)*3]=_c.r;col[(o+k)*3+1]=_c.g;col[(o+k)*3+2]=_c.b}o+=cnt;g.dispose()});
 const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(pos,3));out.setAttribute('normal',new T.BufferAttribute(nor,3));out.setAttribute('color',new T.BufferAttribute(col,3));
 return out}
const MAT=new T.MeshLambertMaterial({vertexColors:true});
const SG={},sharedGeo=(k,f)=>SG[k]||(SG[k]=f()); // geometry shared by every player (saves time and memory in big matches)
const mk=(parts,cast,mat)=>{const m=new T.Mesh(merge(parts),mat||MAT);m.castShadow=!!cast;m.receiveShadow=false;return m};

/* ---------- textures made on the fly ---------- */
function tex(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return new T.CanvasTexture(c)}
const radial=(stops,s)=>tex(s||64,s||64,(x,w,h)=>{const g=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);stops.forEach(a=>g.addColorStop(a[0],a[1]));x.fillStyle=g;x.fillRect(0,0,w,h)});
const TX={};
function texGlow(){return TX.glow||(TX.glow=radial([[0,'rgba(255,255,255,1)'],[.35,'rgba(255,255,255,.55)'],[1,'rgba(255,255,255,0)']]))}
function texDot(){return TX.dot||(TX.dot=radial([[0,'rgba(255,255,255,1)'],[.6,'rgba(255,255,255,.9)'],[1,'rgba(255,255,255,0)']],32))}
function texScorch(k){return TX['s'+k]||(TX['s'+k]=radial(k==='h'?[[0,'rgba(191,219,254,.55)'],[1,'rgba(191,219,254,0)']]:k==='l'?[[0,'rgba(10,10,10,.75)'],[.6,'rgba(20,20,20,.35)'],[1,'rgba(20,20,20,0)']]:[[0,'rgba(24,12,6,.8)'],[.55,'rgba(40,20,8,.45)'],[.85,'rgba(120,53,15,.2)'],[1,'rgba(120,53,15,0)']]))}
function texMud(c){return TX['m'+c]||(TX['m'+c]=radial([[0,c],[.7,c],[1,'rgba(0,0,0,0)']]))}
function texLava(){return TX.lava||(TX.lava=radial([[0,'#fde047'],[.35,'#fb923c'],[.75,'#dc2626'],[.93,'#7f1d1d'],[1,'rgba(30,5,5,0)']],128))}
function texHole(){return TX.hole||(TX.hole=radial([[0,'#000'],[.7,'#140a04'],[.9,'#3b2a14'],[1,'rgba(60,40,20,0)']],128))}
function texSwirl(){return TX.swirl||(TX.swirl=tex(128,128,(x,w,h)=>{x.translate(w/2,h/2);for(let i=0;i<4;i++){x.rotate(PI/2);const g=x.createLinearGradient(0,0,w/2,0);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.strokeStyle=g;x.lineWidth=9;x.beginPath();for(let a=0;a<2.6;a+=.1){const r=a*22;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.stroke()}}))}
function texQ(){return TX.q||(TX.q=tex(64,64,(x,w,h)=>{x.fillStyle='#f59e0b';x.fillRect(0,0,w,h);x.strokeStyle='#fff7';x.lineWidth=5;x.strokeRect(3,3,w-6,h-6);x.fillStyle='#fff';x.font='bold 44px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('?',w/2,h/2+3)}))}
function texEmoji(e){return TX['e'+e]||(TX['e'+e]=e.length>2
 ?tex(256,96,(x,w,h)=>{x.font='bold 54px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=10;x.strokeStyle='#0b1220';x.strokeText(e,w/2,h/2+3);x.fillStyle='#fde047';x.fillText(e,w/2,h/2+3)})
 :tex(96,96,(x,w,h)=>{x.font='64px '+EF;x.textAlign='center';x.textBaseline='middle';x.fillText(e,w/2,h/2+4)}))}
function emojiSprite(e,s){const t=texEmoji(e),m=new T.SpriteMaterial({map:t,transparent:true,depthTest:false});const sp=new T.Sprite(m);sp.scale.set(s*t.image.width/t.image.height,s,1);sp.renderOrder=22;return sp}
function glowSprite(c,s,o){const m=new T.SpriteMaterial({map:texGlow(),color:c,transparent:true,opacity:o==null?.8:o,blending:T.AdditiveBlending,depthWrite:false});const sp=new T.Sprite(m);sp.scale.set(s,s,1);return sp}
function labelSprite(text,color){
 const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='bold 30px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';
 x.lineWidth=7;x.strokeStyle='rgba(0,0,0,.78)';x.lineJoin='round';x.strokeText(text,128,34);x.fillStyle=color;x.fillText(text,128,34);
 const t=keep(new T.CanvasTexture(c)),m=keep(new T.SpriteMaterial({map:t,transparent:true,depthTest:false})),s=new T.Sprite(m);s.scale.set(76,19,1);s.renderOrder=20;return s}
const flatMat=(c,o,add)=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:o==null?1:o,depthWrite:false,side:T.DoubleSide,blending:add?T.AdditiveBlending:T.NormalBlending});

/* ---------- map looks ---------- */
const TM={
 forest:{sky:'#9ad6f0',sun:'#fff1cf',hs:'#d9f0ff',hg:'#4a6b3a',wall:'#2b4a2a',mtn:['#3c6e47','#2f5d3a','#4f8a52'],ob:['pine','rock'],out:'#2a4a28',w:'grass'},
 desert:{sky:'#f3d9a6',sun:'#fff0c8',hs:'#fff1d6',hg:'#a8793a',wall:'#9a6b32',mtn:['#c98f4e','#b5773a','#d9a460'],ob:['cactus','rockSand'],out:'#b88a4a',w:'dust'},
 snow:{sky:'#cfe3f3',sun:'#f2f7ff',hs:'#eaf4ff',hg:'#9db6cc',wall:'#7fa2c4',mtn:['#9db6cc','#bcd0e2','#8aa6c0'],cap:'#ffffff',ob:['pineSnow','ice'],out:'#c8d9e8',w:'snow'},
 lava:{sky:'#2a1010',sun:'#ff9a5a',hs:'#ffb090',hg:'#5a1a10',wall:'#1b0f0f',mtn:['#3a1a14','#2a1210','#4a2018'],ob:['rockDark','volcano'],out:'#1a0d0d',w:'ember',fog:'#3a1410'},
 swamp:{sky:'#6b7d47',sun:'#e7f2b8',hs:'#c5d89a',hg:'#2b3a1c',wall:'#2a3a1c',mtn:['#3b4a2a','#2f3d22','#475a30'],ob:['mushroom','log'],out:'#25331a',w:'fly',fog:'#56663a'},
 beach:{sky:'#8fd6f5',sun:'#fff4d6',hs:'#e8f8ff',hg:'#c9a866',wall:'#38bdf8',mtn:['#38bdf8','#0ea5e9','#7dd3fc'],ob:['palm','shell'],out:'#38bdf8',w:'bubble'},
 candy:{sky:'#ffd1ec',sun:'#fff0f8',hs:'#ffe4f4',hg:'#db2777',wall:'#f472b6',mtn:['#f9a8d4','#c4b5fd','#fde68a'],ob:['lolli','cupcake'],out:'#f9a8d4',w:'confetti'},
 space:{sky:'#05030f',sun:'#b8c4ff',hs:'#8f9bff',hg:'#1e1b4b',wall:'#312e81',mtn:['#27235f','#1e1b4b','#3b3790'],ob:['moonrock','ufo'],out:'#0e0b2e',w:'star',stars:true,fog:'#0a0720'},
 autumn:{sky:'#f7c58b',sun:'#ffe2b0',hs:'#ffe6c4',hg:'#8a4408',wall:'#7c2d12',mtn:['#c2610c','#9a4a08','#d97706'],ob:['autumnTree','pumpkin'],out:'#8a3f06',w:'leaf'},
 ruins:{sky:'#9aa5b5',sun:'#f5f7ff',hs:'#dfe6f2',hg:'#3f4753',wall:'#3f4753',mtn:['#525c6b','#3f4753','#6b7585'],ob:['pillar','rubble'],out:'#2f353f',w:'mote'},
 reef:{sky:'#4fb6e8',sun:'#d6f4ff',hs:'#a8e4ff',hg:'#1d6a8a',wall:'#0e7490',mtn:['#0ea5e9','#0891b2','#22d3ee'],ob:['coral','shell'],out:'#0c4a6e',w:'bubble',fog:'#2a9cc8'},
 mansion:{sky:'#2b2640',sun:'#c7b8ff',hs:'#8d80c0',hg:'#1c1630',wall:'#2a2238',mtn:['#3a3050','#2a2238','#4a3e66'],ob:['grave','pumpkin'],out:'#1a1426',w:'mote',fog:'#2f2848',leaf:['#4c3a6e','#5b4682','#3b2d58']}};
const WEATHER={snow:{c:['#ffffff'],s:13,fall:-45,dr:14},ember:{c:['#ff8a2a','#ffd24a'],s:11,fall:70,dr:18},dust:{c:['#fff0c8'],s:10,fall:0,dr:90},fly:{c:['#d9f99d','#a3e635'],s:12,fall:3,dr:10,blink:true},
 bubble:{c:['#e0f7ff','#ffffff'],s:12,fall:30,dr:8},confetti:{c:['#fde047','#38bdf8','#a78bfa','#ffffff','#fb7185'],s:11,fall:-55,dr:20},star:{c:['#ffffff','#c7d2fe'],s:9,fall:6,dr:4},
 hal:{c:['#fb923c','#a78bfa','#facc15'],s:11,fall:-10,dr:25},rain:{c:['#a8c7ff','#dbeafe'],s:8,fall:-460,dr:-40},leaf:{c:['#ea580c','#dc2626','#f59e0b','#b45309'],s:15,fall:-38,dr:34},mote:{c:['#d4d4d8'],s:9,fall:4,dr:16},grass:{c:['#fde68a','#bbf7d0','#fff'],s:10,fall:6,dr:22}};

/* ---------- obstacles (one per map "kind"); r is the collision radius ---------- */
const OBJ={
 pine:r=>[cyl('#6b4423',0,0,0,r*.17,r*.8),cone('#2f7d32',0,r*.55,0,r*.95,r*1.15),cone('#3c9a3f',0,r*1.2,0,r*.75,r*1.05),cone('#2f7d32',0,r*1.8,0,r*.52,r*.95)],
 pineSnow:r=>[cyl('#5b3a1f',0,0,0,r*.17,r*.8),cone('#2f6b4f',0,r*.55,0,r*.95,r*1.15),cone('#f4f9fd',0,r*.98,0,r*.78,r*.45),cone('#2f6b4f',0,r*1.2,0,r*.75,r*1.05),cone('#f4f9fd',0,r*1.58,0,r*.58,r*.45),cone('#f4f9fd',0,r*1.85,0,r*.45,r*.85)],
 autumnTree:r=>[cyl('#5b3a1f',0,0,0,r*.2,r*1.05),ball('#c2410c',0,r*1.5,0,r*.95,r*.8,r*.95),ball('#d97706',r*.35,r*1.9,r*.1,r*.6,r*.5,r*.6),ball('#9a3412',-r*.4,r*1.35,-r*.2,r*.55,r*.5,r*.55)],
 rock:r=>[dod('#8a8f98',0,r*.4,0,r*.95,r*.7,r*.85,.4),dod('#9aa0a8',r*.55,r*.22,r*.3,r*.45,r*.35,r*.4,1),dod('#6f747c',-r*.5,r*.2,-r*.3,r*.4,r*.3,r*.38,2)],
 rockSand:r=>[dod('#c9a059',0,r*.4,0,r*.95,r*.7,r*.85,.4),dod('#d9b26b',r*.55,r*.22,r*.3,r*.45,r*.35,r*.4,1),dod('#a9803e',-r*.5,r*.2,-r*.3,r*.4,r*.3,r*.38,2)],
 rockDark:r=>[dod('#3a3434',0,r*.45,0,r*.95,r*.8,r*.85,.4),dod('#4a4040',r*.5,r*.25,r*.3,r*.45,r*.4,r*.4,1),dod('#ff6a1a',-r*.1,r*.9,r*.1,r*.18,r*.14,r*.18,0)],
 volcano:r=>[cone('#2c1e1e',0,0,0,r*1.05,r*1.5),cone('#fb923c',0,r*1.3,0,r*.34,r*.28),cone('#fde047',0,r*1.45,0,r*.18,r*.2)],
 cactus:r=>[cyl('#3f8f3f',0,0,0,r*.28,r*1.7),ball('#3f8f3f',0,r*1.7,0,r*.28),cyl('#3f8f3f',r*.5,r*.55,0,r*.16,r*.5),cyl('#3f8f3f',r*.38,r*.55,0,r*.16,r*.2,0,PI/2),cyl('#3f8f3f',-r*.5,r*.8,0,r*.16,r*.55),cyl('#3f8f3f',-r*.38,r*.8,0,r*.16,r*.2,0,PI/2),ball('#f472b6',0,r*1.95,0,r*.1)],
 ice:r=>[box('#bfe6ff',0,0,0,r*1.5,r*1.3,r*1.4,.3),box('#e0f4ff',r*.3,r*1.0,0,r*.9,r*.9,r*.8,.7),box('#9ec5e8',-r*.7,0,r*.2,r*.6,r*.7,r*.6,1.1)],
 mushroom:r=>[cyl('#f1e7d0',0,0,0,r*.3,r*.8),ball('#dc2626',0,r*.95,0,r*1.05,r*.6,r*1.05),ball('#fff',r*.5,r*1.3,r*.3,r*.2,r*.12,r*.2),ball('#fff',-r*.4,r*1.25,r*.5,r*.16,r*.1,r*.16),ball('#fff',r*.1,r*1.45,-r*.4,r*.18,r*.1,r*.18)],
 log:r=>[cyl('#6b4a2b',0,-r*.4,0,r*.45,r*1.7,0,PI/2),ball('#d9b88a',r*.84,r*.45,0,r*.05,r*.4,r*.4),ball('#d9b88a',-r*.84,r*.45,0,r*.05,r*.4,r*.4),ball('#3b4a2a',0,r*.85,0,r*.5,r*.14,r*.3)],
 palm:r=>{const o=[cyl('#8b6b3f',0,0,0,r*.2,r*.7),cyl('#7a5c34',r*.12,r*.65,0,r*.17,r*.7,0,-.18),cyl('#6b4f2d',r*.28,r*1.3,0,r*.14,r*.6,0,-.3)];
  for(let i=0;i<7;i++){const a=i/7*PI*2;o.push(part(G.sph,i%2?'#2f9e44':'#3fb950',[r*.5+Math.cos(a)*r*.55,r*1.95-.1*r,Math.sin(a)*r*.55],[r*.62,r*.07,r*.2],[0,-a,Math.cos(a)*.2]))}
  o.push(ball('#5b3a1f',r*.5,r*1.85,0,r*.14),ball('#5b3a1f',r*.6,r*1.8,r*.12,r*.13));return o},
 shell:r=>{const o=[ball('#fbcfe8',0,r*.3,0,r*.95,r*.45,r*.8)];for(let i=-2;i<=2;i++)o.push(box('#f9a8d4',i*r*.28,r*.45,0,r*.1,r*.2,r*.85,0));return o},
 lolli:r=>[cyl('#fff',0,0,0,r*.1,r*1.5),part(G.cyl,'#f43f5e',[0,r*1.6,0],[r*.75,r*.14,r*.75],[PI/2,0,0]),part(G.cyl,'#fff',[0,r*1.6,r*.09],[r*.55,r*.06,r*.55],[PI/2,0,0]),part(G.cyl,'#f43f5e',[0,r*1.6,r*.13],[r*.38,r*.06,r*.38],[PI/2,0,0]),part(G.cyl,'#fff',[0,r*1.6,r*.17],[r*.2,r*.06,r*.2],[PI/2,0,0])],
 cupcake:r=>[cyl('#c2410c',0,0,0,r*.8,r*.55),cyl('#9a3412',0,r*.55,0,r*.88,r*.12),ball('#fbcfe8',0,r*.9,0,r*.8,r*.5,r*.8),ball('#f9a8d4',0,r*1.3,0,r*.5,r*.35,r*.5),ball('#dc2626',0,r*1.65,0,r*.2)],
 moonrock:r=>[dod('#9ca3af',0,r*.45,0,r,r*.75,r*.9,.5),dod('#6b7280',r*.55,r*.2,r*.35,r*.45,r*.3,r*.4,1.2),dod('#4b5563',0,r*.95,0,r*.25,r*.08,r*.25,0)],
 ufo:r=>[ball('#cbd5e1',0,r*.9,0,r*1.05,r*.28,r*1.05),ball('#67e8f9',0,r*1.15,0,r*.5,r*.4,r*.5),cyl('#64748b',-r*.5,r*.0,0,r*.07,r*.7),cyl('#64748b',r*.5,r*.0,0,r*.07,r*.7),cyl('#64748b',0,0,r*.5,r*.07,r*.7),ball('#fde047',r*.8,r*.9,0,r*.1),ball('#fde047',-r*.8,r*.9,0,r*.1),ball('#fde047',0,r*.9,r*.8,r*.1)],
 pillar:r=>[box('#9ca3af',0,0,0,r*1.3,r*.25,r*1.3),cyl('#d4d4d8',0,r*.25,0,r*.5,r*1.5),cyl('#c4c4cc',0,r*.6,0,r*.54,r*.1),box('#9ca3af',0,r*1.75,0,r*1.2,r*.22,r*1.2),box('#52525b',r*.2,r*.5,r*.48,r*.1,r*.9,r*.04)],
 rubble:r=>[dod('#8a8f98',0,r*.35,0,r*.8,r*.55,r*.7,.4),box('#a1a1aa',r*.4,0,r*.3,r*.6,r*.45,r*.5,.6),box('#71717a',-r*.5,0,-r*.2,r*.5,r*.35,r*.5,1.1),cyl('#d4d4d8',-r*.1,0,-r*.6,r*.28,r*.5,0,PI/2*.5)],
 pumpkin:r=>[ball('#f97316',0,r*.55,0,r*.9,r*.6,r*.9),ball('#fb923c',r*.4,r*.55,0,r*.55,r*.58,r*.8),ball('#fb923c',-r*.4,r*.55,0,r*.55,r*.58,r*.8),cyl('#3f6212',0,r*1.05,0,r*.1,r*.3)],
 coral:r=>[ball('#fb7185',0,r*.4,0,r*.7,r*.45,r*.65),cyl('#f43f5e',-r*.3,r*.5,0,r*.16,r*.8,0,.35),cyl('#fb923c',r*.35,r*.5,r*.1,r*.15,r*.95,0,-.3),cyl('#f472b6',0,r*.55,-r*.3,r*.14,r*.7),ball('#fde68a',-r*.55,r*1.2,0,r*.15),ball('#fde68a',r*.6,r*1.4,r*.1,r*.15)],
 grave:r=>[box('#6b7280',0,0,0,r*1,r*.2,r*.6),box('#9ca3af',0,r*.2,0,r*.7,r*1.1,r*.25),part(G.cyl,'#9ca3af',[0,r*1.3,0],[r*.35,r*.25,r*.35],[PI/2,0,0]),box('#4b5563',0,r*.9,r*.14,r*.08,r*.4,r*.04),box('#4b5563',0,r*1,r*.14,r*.3,r*.07,r*.04),ball('#3b6b2a',0,r*.1,r*.3,r*.45,r*.12,r*.2)]};

/* ---------- characters ---------- */
const hsh=k=>{let h=0;for(const c of String(k))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)},accOf=id=>hsh(id)%12,accPick=(p,id)=>(p&&p.acc>=0)?p.acc:accOf(id); // 0 bow,1 party hat,2 glasses,3 flower,4 star clips,5 crown,6 top hat,7 cat band,8 halo,9 sunglasses,10 wizard hat,11 none
function accParts(a,d){
 const o=[];
 if(a===0){o.push(ball('#f472b6',-8.8,10.2,5,3.8,2.8,2),ball('#f472b6',-13.2,10.8,4,3.4,2.4,1.8),ball('#ec4899',-11,10.4,5.4,1.7))}
 else if(a===1){o.push(part(G.cone,'#a78bfa',[1,17.5,0],[5.6,12,5.6],[0,0,-.12]),part(G.cone,'#fde047',[.2,13.2,0],[5.4,2.2,5.4],[0,0,-.12]),ball('#fde047',2.2,24,0,2.2))}
 else if(a===2){for(const q of[-1,1])o.push(part(G.tor,'#1f2937',[q*5.6,.8,13.6],[5.6,5.6,5.6]));o.push(box('#1f2937',0,.4,13.6,2.6,.7,.7))}
 else if(a===3){for(let i=0;i<5;i++){const t=i/5*PI*2;o.push(ball('#fb7185',9+Math.cos(t)*2.6,10+Math.sin(t)*2.6,5.5,1.9))}o.push(ball('#fde047',9,10,6.4,1.6))}
 else if(a===4){o.push(part(G.oct,'#fde047',[-7,12.6,6],[2.6,2.6,.9],[0,0,.4]),part(G.oct,'#fb7185',[2,13.6,7],[2,2,.8],[0,0,.1]))}
 if(a===5){o.push(cyl('#facc15',0,9.6,0,6.4,2.6));for(let i=0;i<5;i++){const t=i/5*PI*2;o.push(cone('#facc15',Math.cos(t)*5.6,11.8,Math.sin(t)*5.6,1.8,4.6))}o.push(ball('#ef4444',0,10.8,6.2,1.1))}
 else if(a===6){o.push(cyl('#1f2937',0,10.6,0,9,1),cyl('#1f2937',0,11.4,0,5.6,8),cyl('#ef4444',0,12,0,5.8,1.7))}
 else if(a===7){for(const q of[-1,1])o.push(cone('#fb7185',q*6.4,12,1,3.2,6,-q*.25),cone('#fecdd3',q*6.4,12.2,1.8,1.7,4,-q*.25));o.push(box('#fb7185',0,11.2,0,12,1.2,2.4))}
 else if(a===8){o.push(part(G.tor,'#fde047',[0,20,0],[7.8,7.8,7.8],[PI/2,0,0]))}
 else if(a===9){for(const q of[-1,1])o.push(box('#111827',q*5.6,-2.4,13.1,7.4,4.6,1.4));o.push(box('#111827',0,-.4,13.1,3,1,1))}
 else if(a===10){o.push(cone('#6d28d9',0,11,0,8.6,18),cyl('#5b21b6',0,10.4,0,10.8,1.1),ball('#fde047',0,29.5,0,1.5))}
 return o}
/* per-animal extras so each one reads as its own animal: whiskers, tails, horns, wings, spots... */
const whisk=(c,y)=>{const o=[];for(const q of[-1,1])for(let k=0;k<3;k++)o.push(part(G.box,c,[q*11.2,y+(k-1)*1.7,11.2],[7.5,.5,.45],[0,q*.45,q*(k-1)*.2]));return o};
const chain=a=>a.map(v=>ball(v[4],v[0],v[1],v[2],v[3]));
function ex(ci,d){
 const E={pre:[],post:[],body:[],tail:null,sz:1};
 const sides=f=>{for(const q of[-1,1])f(q)};
 switch(ci){
 case 0:E.post.push(...whisk('#ffffff',-3.6),box('#c2410c',-3.2,8.6,8.2,1.1,3.4,.6),box('#c2410c',0,9.2,7.8,1.1,3.8,.6),box('#c2410c',3.2,8.6,8.2,1.1,3.4,.6));E.tail=chain([[0,2,-5,3.2,d.b],[0,5,-9,3.2,d.b],[0,10,-11,3.2,d.b],[0,16,-10,3.2,d.b],[0,20,-7,3.4,'#c2410c']]);break;
 case 1:E.pre.push(ball(d.ei,5.8,1.2,10.2,5.6,6,2.4));E.post.push(ball('#fb7185',0,-7.6,10,2.2,3.2,1));E.tail=chain([[0,3,-7,3,d.b],[0,8,-9,3,d.b],[0,13,-8,3.2,d.b]]);break;
 case 2:sides(q=>E.pre.push(part(G.cone,'#fff7ed',[q*11,-3.6,5.5],[3.6,6,3.6],[0,0,-q*1.4])));E.post.push(ball('#fff7ed',0,-3.4,12.6,4.2,3.4,5.2),ball(d.n,0,-2.3,17.4,2.2,1.7,1.6));E.tail=chain([[0,2,-6,4.5,d.b],[0,4,-11,6,d.b],[0,6,-16,6.4,'#ffffff']]);break;
 case 3:E.body.push(ball('#1f2937',0,29,0,12.4,3.6,10.8));E.tail=chain([[0,2,-5,3.4,'#ffffff']]);break;
 case 4:E.post.push(ball('#15803d',-5,8,6.5,1.8,1.2,1.4),ball('#15803d',4,9.4,5.4,1.6,1.1,1.3),ball('#15803d',1,6,8.2,1.3,.9,1.2));E.body.push(ball('#15803d',-4,26,-8,2.2,2.6,1),ball('#15803d',5,22,-9,2.4,2.8,1));break;
 case 5:E.pre.push(ball(d.m,0,-1.5,8.6,9.4,8.4,4.2));E.tail=chain([[0,2,-5,2.6,d.b],[0,6,-9,2.6,d.b],[2,11,-9,2.6,d.b],[4,15,-6,2.6,d.b],[2,17,-3,2.9,d.b]]);break;
 case 6:E.earLen=15;E.post.push(box('#ffffff',-1,-8,11.8,1.8,2.4,.7),box('#ffffff',1,-8,11.8,1.8,2.4,.7));E.tail=chain([[0,3,-9,5.4,'#ffffff']]);break;
 case 7:E.sz=1.04;break;
 case 8:E.post.push(box('#7c2d12',-3.2,8.6,8.2,1.1,3.4,.6),box('#7c2d12',0,9.2,7.8,1.1,3.8,.6),box('#7c2d12',3.2,8.6,8.2,1.1,3.4,.6),...whisk('#ffffff',-3.6));sides(q=>E.post.push(ball(d.bl,q*11,-3.4,5,3.4,3,2.6)));E.tail=chain([[0,2,-6,3.4,d.b],[0,6,-10,3.4,'#7c2d12'],[0,11,-12,3.4,d.b],[0,16,-11,3.4,'#7c2d12']]);break;
 case 9:E.tail=chain([[0,2,-6,2.2,d.b],[0,3,-12,2.2,d.b],[0,4,-17,2.2,d.b],[0,5,-21,4.6,'#b45f1c']]);break;
 case 10:E.tail=[ball(d.b,0,2,-6,2.4),part(G.tor,'#f472b6',[0,5,-8.5],[3.8,3.8,3.8],[0,PI/2,0])];break;
 case 11:E.msz=1.35;sides(q=>E.post.push(part(G.cone,'#fef3c7',[q*7,13.6,0],[2.4,6.4,2.4],[0,0,-q*.5])));E.tail=chain([[0,2,-6,2,'#f8fafc'],[0,1,-12,2,'#f8fafc'],[0,0,-17,3.8,'#1f2937']]);break;
 case 12:E.nsz=1.9;break;
 case 13:E.sz=.92;E.post.push(...whisk('#e5e7eb',-3.6),box('#ffffff',-1,-8,11.8,1.6,2,.6),box('#ffffff',1,-8,11.8,1.6,2,.6));E.tail=chain([[0,2,-5,1.6,'#f9a8d4'],[0,1.4,-9,1.5,'#f9a8d4'],[0,.8,-13,1.5,'#f9a8d4'],[0,.4,-17,1.4,'#f9a8d4'],[0,1.2,-21,1.4,'#f9a8d4'],[0,2.4,-24,1.3,'#f9a8d4']]);break;
 case 14:E.sz=1.02;E.post.push(ball(d.m,0,-3.4,12.8,4.2,3.4,5),ball(d.n,0,-2.4,17.6,2.2,1.7,1.6));E.body.push(ball('#e2e8f0',0,25,8,6,5.5,3.4));E.tail=chain([[0,2,-6,4.2,d.b],[0,3,-11,5.4,d.b],[0,3,-16,5,'#e2e8f0']]);break;
 case 15:E.tail=chain([[0,3,-7,5,'#9ca3af'],[0,5,-12,5.4,'#374151'],[0,8,-16,5.2,'#9ca3af'],[0,12,-19,5,'#374151']]);break;
 case 17:E.sz=.92;E.post.push(part(G.cone,d.b,[0,16,0],[1.6,5,1.6]),part(G.cone,d.b,[2,15.6,0],[1.4,4.4,1.4],[0,0,-.5]),part(G.cone,d.b,[-2,15.6,0],[1.4,4.4,1.4],[0,0,.5]));break;
 case 18:E.post.push(ball('#f472b6',0,7,-11,4.6,4.6,3.6),ball('#a78bfa',0,0,-12.4,4.6,4.6,3.6),ball('#60a5fa',0,-7,-11,4.2,4.2,3.4));E.tail=chain([[0,4,-8,4.2,'#f472b6'],[0,2,-12,3.8,'#a78bfa'],[0,-1,-14.5,3.2,'#60a5fa']]);break;
 case 19:sides(q=>E.post.push(part(G.cyl,'#475569',[q*13.8,0,0],[2.4,2.8,2.4],[0,0,PI/2])));for(let k=0;k<3;k++)E.post.push(box('#1e293b',0,-7.2+k*1.7,12.3,7,.6,.6));
  E.body.push(box('#334155',0,12,10.2,10,8,1),ball('#ef4444',-3,18,11.2,1.2),ball('#facc15',0,18,11.2,1.2),ball('#22c55e',3,18,11.2,1.2));break;
 case 20:E.eyeBig=true;E.body.push(ball('#fde68a',-3.6,22,9.5,3.2,2,1.1),ball('#fde68a',3.6,22,9.5,3.2,2,1.1),ball('#fde68a',0,17,10,3.4,2,1.1));E.tail=chain([[0,2,-6,3.6,'#854d0e']]);break;
 case 21:E.sz=1.1;E.ssz=1.5;break;
 case 22:E.noHorn=true;sides(q=>{E.post.push(part(G.cone,'#fde047',[q*7,12.8,2],[2.2,6,2.2],[.25,0,-q*.4]));E.body.push(part(G.sph,'#16a34a',[q*12.5,27,-7],[1.5,8,6],[0,0,q*.5]))});
  for(let i=0;i<4;i++)E.body.push(cone('#f97316',0,30-i*5.5,-8-i*.9,1.8,4.2));E.tail=chain([[0,2,-6,5,d.b],[0,3,-12,4,d.b],[0,5,-17,3,d.b],[0,8,-21,2.2,'#f97316']]);break;
 case 23:sides(q=>E.body.push(part(G.sph,'#e0f2fe',[q*5,34,-9],[1.2,8,4.4],[0,0,q*.5])));E.body.push(part(G.cone,'#1f2937',[0,14,-13],[2,5,2],[-PI/2,0,0]));break;
 }
 return E}

function buildChar(ci,ak){
 const D=Sprites.D,d=D[ci%D.length],limb=d.limb||d.b,feet=d.feet||limb,X=ex(ci%D.length,d);
 const mat=new T.MeshLambertMaterial({vertexColors:true}),anchor=new T.Group(),root=new T.Group(),pivot=new T.Group();anchor.add(root);root.add(pivot);root.scale.setScalar(X.sz);
 const bp=[ball(d.b,0,20,0,11.8,12.6,10.6)];
 if(d.bl!==d.b)bp.push(ball(d.bl,0,19,5.2,7.8,8.8,5.6));
 if(d.spots){bp.push(ball(d.spots,-4.5,24,7,4,4.6,3),ball(d.spots,6,15,7,3.2,3.8,3))}
 if(d.stripes)for(const yy of[11,16,21,26]){bp.push(box(d.stripes,10.8,yy,0,2.6,1.6,6),box(d.stripes,-10.8,yy,0,2.6,1.6,6))}
 X.body.forEach(x=>bp.push(x));
 const bodyM=mk(bp,true,mat);pivot.add(bodyM);
 const hy=0,hp=[ball(d.b,0,hy,0,13.5,12.5,12.5)],ez=d.face?1.8:0;
 if(d.mane)hp.push(ball(d.mane,0,hy,-3,19,18,9));
 X.pre.forEach(x=>hp.push(x));
 const EL=X.earLen||11;
 for(const s of[-1,1]){
  if(d.ear==='tri'){hp.push(part(G.cone,d.b,[s*8,hy+14,0],[4.8,10,4.8],[0,0,-s*.35]),part(G.cone,d.ei,[s*8,hy+13.2,1.4],[3,7,3],[0,0,-s*.35]))}
  else if(d.ear==='flop')hp.push(part(G.sph,d.ei,[s*13,hy+1,0],[4,9,5],[0,0,s*.3]));
  else if(d.ear==='long')hp.push(ball(d.b,s*6,hy+8+EL,0,3.8,EL,3),ball(d.ei,s*6,hy+8+EL,1.6,1.8,EL*.73,1.4));
  else if(d.ear==='circ'){const k=d.es||1;hp.push(ball(d.ec,s*9.5,hy+10,0,5*k,5*k,3.6),ball(d.ei,s*9.5,hy+10,2,2.6*k,2.6*k,1.6))}}
 if(d.face)hp.push(ball(d.face,0,hy-1,7.5,9.8,9,6));
 if(d.mask)hp.push(ball(d.mask,0,hy+1.5,9.4,11.2,3.8,4));
 if(d.ear==='eyes'){for(const s of[-1,1])hp.push(ball(d.b,s*7,hy+11,3,5.8),ball('#fff',s*7,hy+11,6.6,4.3,4.3,2.2),ball('#16161d',s*7,hy+11,8.6,2.6,2.6,1.2),ball('#fff',s*7+.9,hy+12,9.7,.9,.9,.5));for(const s of[-1,1])hp.push(ball('#fb7185',s*10,hy-3,8,2.9,1.8,1.2))}
 else for(const s of[-1,1]){if(d.patch)hp.push(ball(d.patch,s*5.6,hy+1,9.6,5.8,6.6,2.8));
  if(X.eyeBig)hp.push(ball('#fff',s*5.6,hy+.8,10.2+ez,5.4,5.4,2.4),ball('#facc15',s*5.6,hy+.8,11.4+ez,3.5,3.5,1.6),ball('#16161d',s*5.6,hy+.8,12.6+ez,2.2,2.2,1),ball('#fff',s*5.6+.9,hy+2,13.4+ez,.9,.9,.5));
  else hp.push(ball(d.ew||'#16161d',s*5.6,hy+.8,10.6+ez,4,4.8,2.6),ball('#fff',s*5.6+1.3,hy+2.8,12.8+ez,1.6,1.6,.8),ball('#fff',s*5.6-1.1,hy-.9,12.7+ez,.85,.85,.5));
  if(!d.ant)hp.push(ball('#fb7185',s*9.4,hy-3.4,9.2,2.9,1.8,1.2))}
 if(d.m){const k=X.msz||1;hp.push(ball(d.m,0,hy-3.2,9.5,6.6*k,4.6*k,4*k))}
 if(d.n){const k=X.nsz||1;hp.push(ball(d.n,0,hy-1.2,13,2.4*k,1.7*k,1.4*k))}
 if(d.snout){const k=X.ssz||1;hp.push(ball(d.snout,0,hy-3,11.5,6.8*k,4.8*k*.9,4*k),ball('#9d174d',-2.3*k,hy-3,15.2*(k>1?1.08:1),1.1,1.5,.8),ball('#9d174d',2.3*k,hy-3,15.2*(k>1?1.08:1),1.1,1.5,.8))}
 if(d.beak)hp.push(part(G.cone,d.beak,[0,hy-3,13.5+ez*.6],[3.6,6,3.6],[PI/2,0,0]));
 if(!d.m&&!d.beak&&!d.snout)hp.push(box('#1f2937',0,hy-5.6,11.9,d.ear==='eyes'?8:3.2,.8,1));
 if(d.horn&&!X.noHorn)hp.push(part(G.cone,d.horn,[0,hy+19,4],[2.8,14,2.8],[.3,0,0]));
 if(d.ant)hp.push(cyl('#94a3b8',0,hy+11,0,.9,8),ball(d.ant,0,hy+21,0,2.8));
 X.post.forEach(x=>hp.push(x));
 accParts(ak,d).forEach(x=>hp.push(x));
 const headMesh=mk(hp,true,mat),headM=new T.Group();headM.add(headMesh);headM.position.y=40;headM.scale.setScalar(1.3);pivot.add(headM);
 const faces={};
 faces.sur=mk([ball('#3b1020',0,-5.8,12.8,2.3,3,1.3),ball('#fff',-7.4,6.2,12.2,.9,.9,.5)],false,mat);
 faces.hap=mk([ball('#3b1020',0,-5.4,12.9,3.8,2.3,1.3),ball('#fb7185',0,-6.4,13.5,2,1,.5)],false,mat);
 const dz=[];for(const q of[-1,1]){dz.push(ball(d.b,q*5.6,.8,13.4+ez,5,5.4,.8),part(G.box,'#16161d',[q*5.6,.8,14.2+ez],[6.4,1.1,.6],[0,0,.78]),part(G.box,'#16161d',[q*5.6,.8,14.2+ez],[6.4,1.1,.6],[0,0,-.78]))}faces.diz=mk(dz,false,mat);
 for(const k in faces){faces[k].visible=false;headM.add(faces[k])}
 const legs=[],arms=[];
 for(const s of[-1,1]){
  const lg=new T.Group();lg.position.set(s*5.6,11.4,0);lg.add(mk([cyl(limb,0,-7,0,3.9,7),ball(feet,0,-8,2,5.3,3.7,6.3)],true,mat));pivot.add(lg);legs.push(lg);
  const ar=new T.Group();ar.position.set(s*12.2,28,0);ar.add(mk([ball(limb,s*1.6,-5,0,3.9,6.2,3.9)],false,mat));pivot.add(ar);arms.push(ar)}
 let tail=null;
 const tp=X.tail||(d.tail?(()=>{const t=[ball(d.tail,0,2,-5,5,5,6.5)];if(d.tip)t.push(ball(d.tip,0,4,-10,3,3,3));return t})():null);
 if(tp){tail=new T.Group();tail.position.set(0,13,-9);tail.add(mk(tp,false,mat));pivot.add(tail)}
 return{anchor,root,pivot,bodyM,headM,headY:40,faces,ak,ci:ci%D.length,legs,arms,tail,mat,yaw:0,ph:Math.random()*6,seed:Math.random()*6.28,al:1}}

function buildHouse(){
 const g=new T.Group(),m=new T.Mesh(sharedGeo('house',()=>merge([box('#fde68a',0,0,0,18,13,16),part(G.cone4,'#ef4444',[0,19,0],[15.5,12,15.5],[0,PI/4,0]),box('#92400e',0,0,8.2,5,8,.6),box('#7dd3fc',-6,6,8.2,3.5,3.5,.5),box('#7dd3fc',6,6,8.2,3.5,3.5,.5),box('#b45309',5.5,15,-2,3,7,3)])),MAT);
 g.add(m);const h=glowSprite('#facc15',90,.75);h.position.y=8;g.add(h);g.scale.setScalar(1.35);return{g,halo:h}}
function buildTomb(){return new T.Mesh(sharedGeo('tomb',()=>merge([box('#9ca3af',0,0,0,15,17,5),part(G.cyl,'#9ca3af',[0,17,0],[7.5,5,7.5],[PI/2,0,0]),box('#475569',0,10,2.6,2,8,.6),box('#475569',0,13,2.6,6,2,.6),ball('#3b6b2a',0,0,6,10,2,5)])),MAT)}
function buildTrapModel(){const o=[cyl('#475569',0,0,0,17,3),cyl('#94a3b8',0,3,0,11,1.4)];for(let i=0;i<10;i++){const a=i/10*PI*2;o.push(part(G.cone,'#e2e8f0',[Math.cos(a)*14,7,Math.sin(a)*14],[2.4,8,2.4],[Math.sin(a)*.5,0,-Math.cos(a)*.5]))}return o}

/* ---------- particles (one point cloud, ring buffer) ---------- */
const NP=900;let PP,PC,PV,PL,PM,PB,PG,pI=0,pAny=false,pts=null,pcol=null,ppos=null;
function initParticles(){
 PP=new Float32Array(NP*3).fill(-9999);PC=new Float32Array(NP*3);PV=new Float32Array(NP*3);PL=new Float32Array(NP);PM=new Float32Array(NP).fill(1);PB=new Float32Array(NP*3);PG=new Float32Array(NP);pI=0;
 const g=keep(new T.BufferGeometry());ppos=new T.BufferAttribute(PP,3);ppos.setUsage(T.DynamicDrawUsage);pcol=new T.BufferAttribute(PC,3);pcol.setUsage(T.DynamicDrawUsage);
 g.setAttribute('position',ppos);g.setAttribute('color',pcol);
 const m=keep(new T.PointsMaterial({size:15,map:texDot(),vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
 pts=new T.Points(g,m);pts.frustumCulled=false;sc.add(pts)}
function burst(x,y,c,n,o){
 if(!pts)return;pAny=true;o=o||{};_c.set(c);const lim=quality===1?.5:1;n=Math.max(1,Math.round(n*lim));
 for(let i=0;i<n;i++){const k=pI++%NP,a=Math.random()*6.283,s=(o.spd||1)*rnd(50,230);
  PP[k*3]=x+(o.sx?rnd(-o.sx,o.sx):0);PP[k*3+1]=(o.h==null?14:o.h)+rnd(0,8);PP[k*3+2]=y+(o.sx?rnd(-o.sx,o.sx):0);
  PV[k*3]=Math.cos(a)*s*(o.flat||1);PV[k*3+1]=(o.up==null?1:o.up)*rnd(40,190);PV[k*3+2]=Math.sin(a)*s*(o.flat||1);
  PM[k]=PL[k]=(o.life||.6)*rnd(.7,1.2);PG[k]=o.g==null?420:o.g;PB[k*3]=_c.r;PB[k*3+1]=_c.g;PB[k*3+2]=_c.b}}
function updParticles(dt){
 if(!pAny)return; // nothing alive: skip the loop and the GPU upload
 let alive=0;
 for(let k=0;k<NP;k++){
  if(PL[k]<=0){if(PP[k*3+1]>-9000){PP[k*3+1]=-9999;PC[k*3]=PC[k*3+1]=PC[k*3+2]=0}continue}
  alive++;PL[k]-=dt;PV[k*3+1]-=PG[k]*dt;PP[k*3]+=PV[k*3]*dt;PP[k*3+1]+=PV[k*3+1]*dt;PP[k*3+2]+=PV[k*3+2]*dt;
  if(PP[k*3+1]<1){PP[k*3+1]=1;PV[k*3+1]*=-.35;PV[k*3]*=.7;PV[k*3+2]*=.7}
  const f=Math.max(0,PL[k]/PM[k]);PC[k*3]=PB[k*3]*f;PC[k*3+1]=PB[k*3+1]*f;PC[k*3+2]=PB[k*3+2]*f}
 pAny=alive>0;ppos.needsUpdate=true;pcol.needsUpdate=true}

/* weather around the camera */
let wx=null,wpos=null,wcol=null,WP=null,WV=null,WB=null,WN=0,wcfg=null,wBlink=false;
function initWeather(){
 wcfg=WEATHER[TMH.w];WN=((quality===3?240:quality===2?160:90)*(crowd?.6:1))|0;WP=new Float32Array(WN*3);WV=new Float32Array(WN*3);WB=new Float32Array(WN*3);const WC=new Float32Array(WN*3);
 for(let i=0;i<WN;i++){WP[i*3]=rnd(-900,900);WP[i*3+1]=rnd(5,420);WP[i*3+2]=rnd(-650,650);_c.set(wcfg.c[i%wcfg.c.length]);WB[i*3]=_c.r;WB[i*3+1]=_c.g;WB[i*3+2]=_c.b;WV[i*3]=rnd(-1,1);WV[i*3+1]=rnd(.6,1.4);WV[i*3+2]=rnd(-1,1)}
 wpos=new T.BufferAttribute(WP.slice(),3);wpos.setUsage(T.DynamicDrawUsage);wcol=new T.BufferAttribute(WC,3);wcol.setUsage(T.DynamicDrawUsage);
 const g=keep(new T.BufferGeometry());g.setAttribute('position',wpos);g.setAttribute('color',wcol);
 wx=new T.Points(g,keep(new T.PointsMaterial({size:wcfg.s*1.2,map:texDot(),vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,sizeAttenuation:true})));
 wx.frustumCulled=false;sc.add(wx)}
function applyWeather(){if(!wx)return;wcfg=rainy?WEATHER.rain:season==='halloween'?WEATHER.hal:season==='xmas'?WEATHER.snow:WEATHER[TMH.w];for(let i=0;i<WN;i++){_c.set(wcfg.c[i%wcfg.c.length]);WB[i*3]=_c.r;WB[i*3+1]=_c.g;WB[i*3+2]=_c.b}wx.material.size=wcfg.s*1.2}
function updWeather(dt,t){
 if(!wx)return;const a=wpos.array,c=wcol.array;
 for(let i=0;i<WN;i++){
  WP[i*3]+=(wcfg.dr*WV[i*3]+Math.sin(t*.7+i)*wcfg.dr*.4)*dt;WP[i*3+1]+=(wcfg.fall*WV[i*3+1])*dt;WP[i*3+2]+=(wcfg.dr*WV[i*3+2])*dt;
  if(WP[i*3+1]<2)WP[i*3+1]+=420;else if(WP[i*3+1]>430)WP[i*3+1]-=428;
  let dx=WP[i*3]-fcx,dz=WP[i*3+2]-fcz;
  if(dx>900)WP[i*3]-=1800;else if(dx<-900)WP[i*3]+=1800;if(dz>650)WP[i*3+2]-=1300;else if(dz<-650)WP[i*3+2]+=1300;
  a[i*3]=WP[i*3];a[i*3+1]=WP[i*3+1];a[i*3+2]=WP[i*3+2];
  const b=wcfg.blink?.25+.75*Math.abs(Math.sin(t*1.7+i*3.1)):.8;c[i*3]=WB[i*3]*b;c[i*3+1]=WB[i*3+1]*b;c[i*3+2]=WB[i*3+2]*b}
 wpos.needsUpdate=true;wcol.needsUpdate=true}

/* ---------- pooled one-shot effects: rings, flashes, beams, bolts, floating emoji ---------- */
const FXL=[],FXF={ring:[],flash:[],beam:[],bolt:[],floaty:[]};
function fxNew(kind){
 if(kind==='ring'){const m=new T.Mesh(G.ring,flatMat('#fff',1,true));m.rotation.x=-PI/2;return{g:m,m:m.material}}
 if(kind==='flash'){const m=new T.Mesh(G.sph2,flatMat('#fff',1,true));return{g:m,m:m.material}}
 if(kind==='beam'){const m=new T.Mesh(G.tube,flatMat('#fff',1,true));return{g:m,m:m.material}}
 if(kind==='bolt'){const g=new T.Group(),m=flatMat('#fffbe0',1,true),segs=[];for(let i=0;i<8;i++){const s=new T.Mesh(G.box,m);g.add(s);segs.push(s)}return{g,m,segs}}
 const s=new T.Sprite(new T.SpriteMaterial({map:texEmoji('❓'),transparent:true,depthTest:false}));s.renderOrder=22;return{g:s,m:s.material}}
function fx(kind,o){
 if(!sc)return;let e=FXF[kind].pop();if(!e){e=fxNew(kind);dyn2.add(e.g)}
 e.kind=kind;e.t0=tNow;e.dur=o.dur||.6;e.o=o;e.g.visible=true;
 if(kind==='bolt'){let bx=o.x,by=520;const pts=[[o.x,520]];for(let i=0;i<8;i++){by-=520/8;bx=i===7?o.x:o.x+rnd(-34,34);pts.push([bx,by])}
  e.segs.forEach((s,i)=>{const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);s.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,o.y);s.scale.set(5,l+4,5);s.rotation.z=Math.atan2(dx,dy)*-1})}
 else if(kind==='floaty'){e.m.map=texEmoji(o.e);e.m.needsUpdate=true;e.g.scale.set(o.s||36,o.s||36,1)}
 else e.m.color.set(o.c||'#fff');
 FXL.push(e);return e}
function updFx(){
 for(let i=FXL.length-1;i>=0;i--){const e=FXL[i],k=(tNow-e.t0)/e.dur,o=e.o;
  if(k>=1){e.g.visible=false;FXF[e.kind].push(e);FXL.splice(i,1);continue}
  const f=1-k;
  if(e.kind==='ring'){const r=o.r0+(o.r1-o.r0)*(1-f*f);e.g.position.set(o.x,o.h==null?2:o.h,o.y);e.g.scale.set(r,r,1);e.m.opacity=f*(o.a||.9)}
  else if(e.kind==='flash'){const r=o.r0+(o.r1-o.r0)*(1-f*f*f);e.g.position.set(o.x,o.h==null?12:o.h,o.y);e.g.scale.set(r,r*(o.sy||.7),r);e.m.opacity=f*f*(o.a||.8)}
  else if(e.kind==='beam'){e.g.position.set(o.x,(o.hh||300)/2,o.y);e.g.scale.set(o.r||14,o.hh||300,o.r||14);e.m.opacity=f*f*(o.a||.7)}
  else if(e.kind==='bolt'){e.m.opacity=(k<.25||Math.floor(k*14)%2===0)?f+.15:.2}
  else{e.g.position.set(o.x,(o.h||50)+k*60,o.y);e.m.opacity=Math.min(1,f*2.2)}}}
let dyn2=null;

/* ---------- pools ---------- */
function Pool(make,parent){const it=[];let n=0;return{begin(){n=0},get(){let o=it[n];if(!o){o=make();it[n]=o;parent.add(o.g)}n++;o.g.visible=true;return o},end(){for(let i=n;i<it.length;i++)it[i].g.visible=false}}}
let P={};
const WARNC={m:new T.Color('#ef4444'),l:new T.Color('#facc15'),h:new T.Color('#93c5fd'),s:new T.Color('#d97706')};
const WARNMS={m:1600,l:900,h:1000,s:1800};

function makeWarn(){const g=new T.Group(),disc=new T.Mesh(G.circ,flatMat('#fff',.3)),ring=new T.Mesh(G.ring,flatMat('#fff',1)),inner=new T.Mesh(G.ring2,flatMat('#fff',1));
 for(const m of[disc,ring,inner]){m.rotation.x=-PI/2}disc.position.y=.9;ring.position.y=1.1;inner.position.y=1.2;const spark=glowSprite('#fde047',70,.0);spark.position.y=34;g.add(disc,ring,inner,spark);return{g,disc,ring,inner,spark}}
function makeMeteor(){const g=new T.Group(),m=new T.Mesh(G.ico1,new T.MeshLambertMaterial({color:'#7c2d12',emissive:'#c2410c'}));m.scale.set(24,22,24);const gl=glowSprite('#fb923c',150,.9),tr=new T.Mesh(G.cone,flatMat('#fb923c',.55,true));tr.scale.set(18,110,18);g.add(m,gl,tr);return{g,m,tr}}
function makeHail(){const g=new T.Group(),m=new T.Mesh(G.ico,new T.MeshBasicMaterial({color:'#dbeafe'}));m.scale.set(8,12,8);g.add(m,glowSprite('#bfdbfe',40,.6));return{g,m}}
function makeTornado(){const g=new T.Group(),rings=[];
 for(let i=0;i<8;i++){const rb=.28+i*.12,rt=.28+(i+1)*.12,m=new T.Mesh(new T.CylinderGeometry(rt,rb,.4,16,1,true),flatMat(i%2?'#a8a29e':'#78716c',.38));keep(m.geometry);m.position.y=.2+i*.4;g.add(m);rings.push(m)}
 const base=new T.Mesh(G.ring,flatMat('#a8a29e',.5));base.rotation.x=-PI/2;base.position.y=2;g.add(base);return{g,rings,base}}
function makeBoulder(){const g=new T.Group(),m=new T.Mesh(G.ico1,new T.MeshLambertMaterial({color:'#8a7f78'})),sh=new T.Mesh(G.circ,flatMat('#000',.3));sh.rotation.x=-PI/2;sh.position.y=.8;g.add(m,sh);m.castShadow=true;return{g,m,sh}}
function makeLane(){const g=new T.Group(),m=new T.Mesh(G.plane,flatMat('#ef4444',.3));m.rotation.x=-PI/2;m.position.y=.95;const w=emojiSprite('⚠️',62);w.position.y=46;g.add(m,w);return{g,m,w}}
function makeHole(){const g=new T.Group(),d=new T.Mesh(G.circ,flatMat('#fff',1));d.material.map=texHole();d.material.blending=T.NormalBlending;d.rotation.x=-PI/2;d.position.y=1;const r=new T.Mesh(G.ring,flatMat('#78350f',1));r.rotation.x=-PI/2;r.position.y=1.2;g.add(d,r);return{g,d,r}}
function makeLucky(){const g=new T.Group(),c=new T.Mesh(G.box,new T.MeshLambertMaterial({map:texQ(),emissive:'#7a4a00'})),sh=new T.Mesh(G.circ,flatMat('#000',.3)),gl=glowSprite('#facc15',110,.75),bm=new T.Mesh(G.tube,flatMat('#fde047',.16,true));
 c.scale.setScalar(26);c.castShadow=true;sh.rotation.x=-PI/2;sh.position.y=.8;sh.scale.setScalar(15);bm.scale.set(10,320,10);bm.position.y=160;g.add(c,sh,gl,bm);return{g,c,sh,gl}}
function makeBear(){const g=new T.Group(),a=mk(buildTrapModel(),false),mm=new T.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.45});const b=new T.Mesh(a.geometry,mm);a.material=MAT;
 const mn=new T.Group(),mb=new T.Mesh(G.sph,new T.MeshLambertMaterial({color:'#1f2937'})),ml=glowSprite('#ef4444',46,.9);mb.scale.setScalar(11);mb.position.y=11;ml.position.y=24;mn.add(mb,ml);mn.visible=false;g.add(a,b,mn);return{g,a,b,mn,ml}}
function makeDecoy(ci,name,team,ak){const c=buildChar(ci,ak);c.ci=ci;c.nm=name;const h=buildHouse();h.g.position.y=88;h.g.visible=false;c.anchor.add(h.g);c.house=h;const l=labelSprite(name+(team||''),'#fff');l.position.y=86;c.anchor.add(l);c.label=l;const sh=new T.Mesh(G.circ,flatMat('#000',.28));sh.rotation.x=-PI/2;sh.position.y=.5;sh.scale.set(19,19,1);c.anchor.add(sh);return{g:c.anchor,c}}

/* ---------- scene setup ---------- */
function attach(el,before){if(failed||glCv)return;glCv=document.createElement('canvas');glCv.id='gl';el.insertBefore(glCv,before||el.firstChild)}
function pickQuality(){const g=Settings.get('gfx');if(g==='high')return 3;if(g==='med')return 2;if(g==='low')return 1;
 const touch=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||navigator.maxTouchPoints>1,cores=navigator.hardwareConcurrency||4;return touch?(cores>=6?2:1):3}
function available(){return !failed&&!!window.THREE&&Settings.get('gfx3d')!==false}
function place(parts,x,y,ry,s,sy){const base=new T.Matrix4().compose(V(x,0,y),_q.setFromEuler(_e.set(0,ry||0,0)),V(s||1,sy||s||1,s||1));return parts.map(p=>({g:p.g,c:p.c,m:mul(base,p.m)}))}

function buildStatics(m,bgc){
 const th=TMH,W=m.w,H=m.h,rr=mulberry(m.seed^0x5bd1),grp=new T.Group();statics=grp;sc.add(grp);
 const gt=keep(new T.CanvasTexture(bgc));gt.minFilter=T.LinearFilter;gt.generateMipmaps=false;gt.anisotropy=4;
 const gm=new T.Mesh(keep(new T.PlaneGeometry(W,H)),keep(new T.MeshLambertMaterial({map:gt})));gm.rotation.x=-PI/2;gm.position.set(W/2,0,H/2);gm.receiveShadow=true;grp.add(gm);
 const out=new T.Mesh(keep(new T.PlaneGeometry(W+9000,H+9000)),keep(new T.MeshLambertMaterial({color:th.out})));out.rotation.x=-PI/2;out.position.set(W/2,-2,H/2);grp.add(out);
 const wl=[],wc=th.wall,t=44,hgt=40;
 wl.push(box(wc,-t/2,0,H/2,t,hgt,H+2*t),box(wc,W+t/2,0,H/2,t,hgt,H+2*t),box(wc,W/2,0,-t/2,W,hgt,t),box(wc,W/2,0,H+t/2,W,hgt,t));
 for(const[x,y]of[[-t/2,-t/2],[W+t/2,-t/2],[-t/2,H+t/2],[W+t/2,H+t/2]])wl.push(cyl('#e2e8f0',x,0,y,t*.7,hgt+22),cone('#ef4444',x,hgt+22,y,t*.9,26));
 for(let i=0;i<W/90;i++){const x=40+i*90;wl.push(box('#1f2937',x,hgt,-t/2,14,6,t+2),box('#1f2937',x,hgt,H+t/2,14,6,t+2))}
 grp.add(mk(wl,true));
 /* backdrop: ring of low-poly mountains/hills around the arena */
 const bd=[],N=quality===1?36:64;
 for(let i=0;i<N;i++){const a=i/N*PI*2+rr()*.2,dx=Math.cos(a),dz=Math.sin(a),dist=Math.max(W,H)*.62+260+rr()*620;
  const x=W/2+dx*dist*(W/Math.max(W,H))*1.25,z=H/2+dz*dist*(H/Math.max(W,H))*1.25,hh=140+rr()*380,rb=110+rr()*190,c=th.mtn[(rr()*th.mtn.length)|0];
  bd.push(cone(c,x,-2,z,rb,hh));if(th.cap)bd.push(cone(th.cap,x,hh*.68,z,rb*.34,hh*.32));else if(rr()<.3)bd.push(cone(th.mtn[0],x+rb*.6,-2,z+rb*.2,rb*.55,hh*.5))}
 grp.add(mk(bd,false));
 /* ground details: grass tufts, flowers and pebbles */
 const cnt=Math.min(quality===1?240:quality===2?420:620,Math.floor(W*H/6000)),dt=[],T0=TH_COL(map);
 for(let i=0;i<cnt;i++){const x=rr()*W,z=rr()*H,k=rr();
  if(k<.55)dt.push(cone(T0.tuft,x,0,z,2.4+rr()*1.8,7+rr()*9),cone(T0.tuft,x+3,0,z+1,2,6+rr()*7));
  else if(k<.8)dt.push(cyl(T0.tuft,x,0,z,.6,6),ball(T0.acc,x,7,z,2.6+rr()*1.6));
  else dt.push(dod(T0.peb,x,2,z,3+rr()*3,2+rr()*2,3+rr()*3,rr()*3))}
 grp.add(mk(dt,false));
 if(th.stars){const n=420,p=new Float32Array(n*3);for(let i=0;i<n;i++){const a=rr()*PI*2,b=Math.acos(rr()*1.6-.2),R=3200;p[i*3]=W/2+Math.cos(a)*Math.sin(b)*R;p[i*3+1]=Math.abs(Math.cos(b))*R*.7+200;p[i*3+2]=H/2+Math.sin(a)*Math.sin(b)*R}
  const g=keep(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(p,3));grp.add(new T.Points(g,keep(new T.PointsMaterial({color:'#ffffff',size:16,sizeAttenuation:true,fog:false,transparent:true,opacity:.9}))))}
}
function TH_COL(m){const c={forest:['#2a5f27','#f4e04d','#6b7280'],desert:['#b58b45','#a86b32','#8b6b3f'],snow:['#b8cfe3','#9ec5e8','#cbd5e1'],lava:['#1a1010','#ff6a1a','#2c1e1e'],swamp:['#27331b','#a3e635','#4a3417'],
 beach:['#c9a866','#fda4af','#e9d5a1'],candy:['#db2777','#fde047','#f9a8d4'],space:['#4338ca','#fde68a','#6b7280'],autumn:['#7c2d12','#fbbf24','#92400e'],ruins:['#27272a','#a1a1aa','#71717a'],reef:['#0f766e','#fb7185','#e9d5a1'],mansion:['#3b2f4f','#a78bfa','#4b5563']}[m]||['#2a5f27','#f4e04d','#6b7280'];
 return{tuft:c[0],acc:c[1],peb:c[2]}}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

let zoneUpd=[],trapGlow=null,trapMesh=null;
function setRound(m){
 if(!sc||!I)return;
 if(dyn){sc.remove(dyn);disposeTree(dyn)}
 while(decals.length){const o=decals.pop();decalPool.remove(o);o.material.dispose()}
 dyn=new T.Group();sc.add(dyn);zoneUpd=[];
 const th=TMH,W=I.w,H=I.h,own1=o=>{o.userData.own=1;return o};
 /* obstacles + traps merge into one mesh each */
 const ops=[],kinds=th.ob;
 for(const o of m.obstacles){const v=o[3]%2,ry=((o[0]*7+o[1]*13)%628)/100,s=1;ops.push(...place(OBJ[kinds[v]](o[2]),o[0],o[1],ry,s,.75))}
 if(ops.length){const om=own1(mk(ops,true));om.castShadow=true;dyn.add(om)}
 const tp=[],gp=[];
 for(const t of m.traps){const base=[cyl('#334155',0,0,0,22,4),cyl('#7f1d1d',0,4,0,19,1.2)];for(let i=0;i<8;i++){const a=i/8*PI*2;base.push(cone('#e2e8f0',Math.cos(a)*12,5,Math.sin(a)*12,3.2,16))}base.push(cone('#f8fafc',0,5,0,3.6,22));tp.push(...place(base,t[0],t[1],0,1));
  gp.push(part(G.circ,'#ef4444',[t[0],1.2,t[1]],[30,30,1],[-PI/2,0,0]))}
 if(tp.length){trapMesh=own1(mk(tp,true));dyn.add(trapMesh);
  const gg=own1(new T.Mesh(merge(gp),new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.3,depthWrite:false,blending:T.AdditiveBlending})));trapGlow=gg;dyn.add(gg)}
 /* terrain zones */
 const leaf=th.leaf||(map==='autumn'?['#c2410c','#d97706','#9a3412']:['#2f7d32','#3c9a3f','#256628']);
 const bush=[];
 m.zones.forEach((z,i)=>{
  const g=own1(new T.Group());g.position.set(z.x,0,z.y);dyn.add(g);const r=z.r;
  if(z.k==='ice'){const a=own1(new T.Mesh(G.circ,own1(new T.MeshPhongMaterial({color:'#bfe6ff',transparent:true,opacity:.62,shininess:90,specular:0xffffff,depthWrite:false}))));a.rotation.x=-PI/2;a.scale.set(r,r*.78,1);a.position.y=.7;g.add(a);
   const cr=[];for(let k=0;k<5;k++){const an=k*1.7+z.x;cr.push(box('#ffffff',Math.cos(an)*r*.5,.7,Math.sin(an)*r*.35,18,.4,1.4,an))}g.add(own1(mk(cr,false)))}
  else if(z.k==='slow'){const col=map==='beach'?'rgba(56,189,248,.85)':(map==='desert'?'rgba(184,134,63,.9)':'rgba(74,52,23,.9)');
   const a=own1(new T.Mesh(G.circ,own1(new T.MeshBasicMaterial({map:texMud(col),transparent:true,depthWrite:false}))));a.rotation.x=-PI/2;a.scale.set(r,r,1);a.position.y=.6;g.add(a);
   const rings=[0,1].map(()=>{const q=own1(new T.Mesh(G.ring2,own1(flatMat('#ffffff',.3))));q.rotation.x=-PI/2;q.position.y=.9;g.add(q);return q});
   zoneUpd.push(t=>{rings.forEach((q,k)=>{const f=(t*.4+k*.5+i*.13)%1;q.scale.set(r*(.25+f*.65),r*(.25+f*.65),1);q.material.opacity=(1-f)*.35})})}
  else if(z.k==='belt'){g.rotation.y=-(z.l&3)*PI/2;const bd=own1(new T.Mesh(G.circ,own1(new T.MeshBasicMaterial({color:'#1e293b',transparent:true,opacity:.9,depthWrite:false}))));bd.rotation.x=-PI/2;bd.scale.set(r,r,1);bd.position.y=.8;g.add(bd);
   const br=own1(new T.Mesh(G.ring,own1(flatMat('#facc15',.95))));br.rotation.x=-PI/2;br.scale.set(r,r,1);br.position.y=1;g.add(br);
   const ar=[0,1,2].map(()=>{const c=own1(new T.Mesh(G.cone,own1(flatMat('#fde047',.95))));c.rotation.z=-PI/2;c.scale.set(3,20,10);g.add(c);return c});
   zoneUpd.push(t=>{ar.forEach((c,k)=>{const f=(t*.5+k/3)%1;c.position.set(-r*.6+f*r*1.2,3,0);c.material.opacity=Math.sin(f*PI)})})}
  else if(z.k==='bounce'){const pad=own1(mk([cyl('#f472b6',0,0,0,r*.95,6),cyl('#ffffff',0,6,0,r*.7,1.2),cyl('#f472b6',0,7.2,0,r*.6,1)],true));g.add(pad);
   const ar=[0,1].map(()=>{const c=own1(new T.Mesh(G.cone,own1(flatMat('#ffffff',.9))));c.rotation.x=-PI/2;c.scale.set(10,14,3);g.add(c);return c});
   zoneUpd.push(t=>{pad.scale.setScalar(1+Math.sin(t*8+i)*.04);ar.forEach((c,k)=>{const f=(t*1.4+k*.5)%1;c.position.set(0,10,r*.4-f*r*.8);c.material.opacity=Math.sin(f*PI)})})}
  else if(z.k==='portal'){const pi=Math.min(i,z.l<0?i:z.l),hue=(200+pi*47)%360/360,col=new T.Color().setHSL(hue,.85,.6);
   const ringM=own1(new T.Mesh(G.tor,own1(new T.MeshBasicMaterial({color:col}))));ringM.scale.set(r*.9,r*.9,r*.9);ringM.position.y=r*.95;g.add(ringM);
   const sw=own1(new T.Mesh(G.circ,own1(new T.MeshBasicMaterial({map:texSwirl(),color:col,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}))));sw.scale.set(r*.85,r*.85,1);sw.position.y=r*.95;g.add(sw);
   const base=own1(new T.Mesh(G.circ,own1(new T.MeshBasicMaterial({map:texGlow(),color:col,transparent:true,blending:T.AdditiveBlending,depthWrite:false}))));base.rotation.x=-PI/2;base.scale.set(r*1.5,r*1.5,1);base.position.y=1;g.add(base);
   const col2=own1(new T.Mesh(G.tube,own1(flatMat(col,.14,true))));col2.scale.set(r*.5,r*2.4,r*.5);col2.position.y=r*1.2;g.add(col2);
   zoneUpd.push(t=>{sw.rotation.z=-t*1.6;ringM.rotation.z=t*.6;base.material.opacity=.6+Math.sin(t*3+i)*.25})}
  else if(z.k==='lava'){const a=own1(new T.Mesh(G.circ,own1(new T.MeshBasicMaterial({map:texLava(),transparent:true,depthWrite:false}))));a.rotation.x=-PI/2;a.scale.set(r*1.05,r*1.05,1);a.position.y=.9;g.add(a);
   const rim=own1(new T.Mesh(G.ring,own1(flatMat('#1c0a0a',1))));rim.rotation.x=-PI/2;rim.scale.set(r*1.08,r*1.08,1);rim.position.y=1;g.add(rim);
   const gl=glowSprite('#fb923c',r*3.2,.35);gl.position.y=14;g.add(own1(gl));
   zoneUpd.push(t=>{const k=1.05+Math.sin(t*4+i)*.05;a.scale.set(r*k,r*k,1);gl.material.opacity=.3+Math.sin(t*3+i)*.1;if(Math.random()<.02)burst(z.x+rnd(-r*.5,r*.5),z.y+rnd(-r*.5,r*.5),'#fdba74',3,{up:1.6,spd:.2,g:200,life:.9})})}
  else if(z.k==='bush'){for(let k=0;k<11;k++){const an=k*2.399,d=Math.sqrt((k+.5)/11)*r*.8,rr2=r*(.26+((k*37)%10)/55);bush.push(ball(leaf[k%3],z.x+Math.cos(an)*d,rr2*.85,z.y+Math.sin(an)*d*.8,rr2,rr2*.95,rr2))}}
 });
 if(bush.length){const bm=own1(mk(bush,false,new T.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.66,depthWrite:false})));dyn.add(bm)}
 /* round-wide look: darker + colder at night, red when a meteor shower is coming, etc. */
 TMH.disaster=m.disaster;tod=((m.round||1)-1)%3; // 0 day, 1 sunset, 2 dusk
 rainy=(m.round||1)%4===0;applyWeather();
}

function init(m,bgc){
 if(failed||!glCv)return false;
 try{
  stop();I=m;map=m.map;TMH=TM[map]||TM.forest;skyC.set(TMH.sky);fogC.set(TMH.fog||TMH.sky);sunC.set(TMH.sun);hemC.set(TMH.hs);quality=pickQuality();crowd=m.players.length>=10;shadowsOn=quality===3&&!crowd; // big matches skip shadows for speed
  if(!rd){rd=new T.WebGLRenderer({canvas:glCv,antialias:quality>1,powerPreference:'high-performance'});rd.setClearColor(0x000000,1)}
  rd.shadowMap.enabled=shadowsOn;rd.shadowMap.autoUpdate=false;rd.shadowMap.type=T.PCFSoftShadowMap; // shadows are redrawn every other frame
  sc=new T.Scene();sc.background=new T.Color(TMH.sky);sc.fog=new T.Fog(new T.Color(TMH.fog||TMH.sky),1100,3400);
  cam=new T.PerspectiveCamera(44,cw/ch,10,7000);
  hemi=new T.HemisphereLight(TMH.hs,TMH.hg,.5);sc.add(hemi);
  sun=new T.DirectionalLight(TMH.sun,.64);sun.castShadow=shadowsOn;sun.shadow.mapSize.set(2048,2048);
  const sh=sun.shadow.camera;sh.left=-700;sh.right=700;sh.top=700;sh.bottom=-700;sh.near=100;sh.far=2200;sh.updateProjectionMatrix();sun.shadow.bias=-.0006;
  sc.add(sun);sc.add(sun.target);
  dyn2=new T.Group();sc.add(dyn2);FXL.length=0;for(const k in FXF)FXF[k].length=0;
  names={};chars={};
  buildStatics(m,bgc);
  const holder=new T.Group();sc.add(holder);
  m.players.forEach(p=>{names[p.id]={name:p.name,ch:p.character,team:p.team,acc:p.acc};
   const c=buildChar(p.character,accPick(p,p.id));sc.add(c.anchor);chars[p.id]=c;
   const sh2=new T.Mesh(G.circ,flatMat('#000',shadowsOn?.18:.3));sh2.rotation.x=-PI/2;sh2.position.y=.5;sh2.scale.set(20,20,1);c.anchor.add(sh2);c.blob=sh2;
   const team=m.mode==='team'?(TEAMS[p.team]||'#fff'):null;
   if(team){const tr=new T.Mesh(keep(new T.RingGeometry(21,26,28)),keep(flatMat(team,.9)));tr.rotation.x=-PI/2;tr.position.y=.7;c.anchor.add(tr)}
   const lab=labelSprite(p.name+(team&&TSH[p.team]?' '+TSH[p.team]:''),p.id===m.you?'#facc15':'#ffffff');lab.position.y=86;c.anchor.add(lab);c.label=lab;
   const house=buildHouse();house.g.position.y=104;house.g.visible=false;c.anchor.add(house.g);c.house=house;
   const ring=new T.Mesh(keep(new T.RingGeometry(26,31,36)),keep(flatMat('#facc15',.8,true)));ring.rotation.x=-PI/2;ring.position.y=.9;ring.visible=false;c.anchor.add(ring);c.hring=ring;
   const halo=glowSprite('#facc15',120,.55);halo.position.y=26;halo.visible=false;c.anchor.add(halo);c.halo=halo;
   const shield=new T.Mesh(G.sph,keep(new T.MeshBasicMaterial({color:'#38bdf8',transparent:true,opacity:.25,depthWrite:false,blending:T.AdditiveBlending})));shield.scale.setScalar(38);shield.position.y=30;shield.visible=false;c.anchor.add(shield);c.shield=shield;
   const ice=new T.Mesh(G.box,keep(new T.MeshPhongMaterial({color:'#bfe6ff',transparent:true,opacity:.55,shininess:100,specular:0xffffff})));ice.scale.set(50,74,50);ice.position.y=37;ice.visible=false;c.anchor.add(ice);c.ice=ice;
   const bt=new T.Mesh(sharedGeo('trap',()=>merge(buildTrapModel())),MAT);bt.scale.setScalar(.9);bt.visible=false;c.anchor.add(bt);c.bear=bt;
   const smoke=new T.Group(),sm=keep(new T.MeshBasicMaterial({color:'#e2e8f0',transparent:true,opacity:.55,depthWrite:false}));for(let i=0;i<5;i++){const s=new T.Mesh(G.sph2,sm);s.scale.setScalar(12);smoke.add(s)}smoke.visible=false;c.anchor.add(smoke);c.smoke=smoke;
   const tomb=buildTomb();tomb.visible=false;c.anchor.add(tomb);c.tomb=tomb;
   const wet=new T.Mesh(G.ring2,keep(flatMat('#7dd3fc',.6)));wet.rotation.x=-PI/2;wet.position.y=1;wet.visible=false;c.anchor.add(wet);c.wet=wet;
   const mag=new T.Mesh(keep(new T.RingGeometry(40,44,40)),keep(flatMat('#f87171',.7,true)));mag.rotation.x=-PI/2;mag.position.y=1.2;mag.visible=false;c.anchor.add(mag);c.mag=mag;
   c.emo=null;c.emoId=-1;c.dashT=0});
  initParticles();initWeather();
  /* pools for per-frame things */
  const pg=new T.Group();sc.add(pg);P={warn:Pool(makeWarn,pg),met:Pool(makeMeteor,pg),hail:Pool(makeHail,pg),tor:Pool(makeTornado,pg),bou:Pool(makeBoulder,pg),lane:Pool(makeLane,pg),hole:Pool(makeHole,pg),lucky:Pool(makeLucky,pg),bear:Pool(makeBear,pg),decoy:null,dec:[]};
  P.decoyG=new T.Group();sc.add(P.decoyG);P.decoys=[];
  /* flood water */
  const fm=keep(new T.MeshPhongMaterial({color:'#2563eb',transparent:true,opacity:.55,shininess:80,specular:0xaaccff,depthWrite:false}));
  flood=new T.Group();for(let i=0;i<4;i++){const b=new T.Mesh(G.box,fm);flood.add(b)}const fo=keep(flatMat('#e0f2fe',.7,true));for(let i=0;i<4;i++){const b=new T.Mesh(G.box,fo);flood.add(b)}flood.visible=false;sc.add(flood);floodMats=[fm,fo];
  /* arrow to the property holder */
  arrow=new T.Group();const ac=keep(new T.MeshBasicMaterial({color:'#facc15'}));const a1=new T.Mesh(G.cone,ac);arrow.add(a1);a1.scale.set(14,30,6);a1.rotation.set(PI/2,0,0);const a2=new T.Mesh(G.box,ac);a2.scale.set(9,3,16);a2.position.set(0,0,-14);arrow.add(a2);arrow.visible=false;sc.add(arrow);
  /* decals */
  decalPool=new T.Group();sc.add(decalPool);decals=[];
  fcInit=false;zoom=1.45;orbit=0;nightK=0;flash=0;
  active=true;glCv.style.display='';resize(cw,ch,1);
  return true;
 }catch(e){console.error('3D init failed',e);failed=true;active=false;try{stop()}catch(x){}if(glCv)glCv.style.display='none';return false}}
let flood=null,floodMats=null,arrow=null,decalPool=null,decals=[];

function addDecal(x,y,r,k){
 if(!decalPool)return;const m=new T.Mesh(G.circ,new T.MeshBasicMaterial({map:texScorch(k),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.rotation.x=-PI/2;m.position.set(x,.4+decals.length*.004,y);m.scale.set(r,r,1);decalPool.add(m);decals.push(m);
 if(decals.length>60){const o=decals.shift();decalPool.remove(o);o.material.dispose()}}

function resize(w,h,pr){if(!rd)return;cw=w;ch=h;rd.setPixelRatio(1);rd.setSize(Math.max(2,Math.round(w*pr)),Math.max(2,Math.round(h*pr)),false);if(cam){cam.aspect=w/h;cam.updateProjectionMatrix()}}
function disposeTree(root){root.traverse(o=>{if(o.geometry)o.geometry.dispose();const m=o.material;if(m){(Array.isArray(m)?m:[m]).forEach(x=>{if(x!==MAT&&x.dispose)x.dispose()})}})}
function stop(){
 active=false;
 if(sc)disposeTree(sc);
 own.forEach(o=>{try{o.dispose()}catch(e){}});own=[];chars={};dyn=null;statics=null;sc=null;pts=null;wx=null;P={};flood=null;arrow=null;decalPool=null;decals=[];zoneUpd=[];
 if(glCv)glCv.style.display='none'}
function hide(){active=false;if(glCv)glCv.style.display='none'}
function lower(){if(!rd)return false;if(shadowsOn){shadowsOn=false;sun.castShadow=false;rd.shadowMap.enabled=false;return true}return false}
function toScreen(x,z){if(!cam)return null;const v=V(x,0,z).project(cam);return{x:(v.x*.5+.5)*cw,y:(-v.y*.5+.5)*ch}}

/* ---------- per-frame drawing ---------- */
const CAMS={tilt:[0,600,470],top:[0,880,150],close:[0,390,310]};
const aDiff=(a,b)=>{let d=b-a;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;return d};
const setAlpha=(c,al)=>{if(c.al===al)return;const was=c.al<1;c.al=al;c.mat.opacity=al;const now=al<1;c.mat.transparent=now;if(was!==now)c.mat.needsUpdate=true};

/* emote animations: each emoji makes the character act it out for about two seconds */
function emoteAnim(c,e,age){
 const env=Math.min(1,age*7)*Math.max(0,Math.min(1,(1.9-age)/.5)),A=c.arms,P=c.pivot,H=c.headM,up=(i,v)=>{A[i].rotation.z=(i?1:-1)*v*env};
 switch(e){
  case 0:case 8:A[1].rotation.z=(2.4+Math.sin(age*13)*.45)*env;break;                                   // wave
  case 1:P.position.y+=Math.abs(Math.sin(age*15))*3*env;H.rotation.x=-.35*env;break;                    // laugh
  case 2:P.position.x=Math.sin(age*42)*1.5*env;up(0,.5);up(1,.5);c.legs[0].rotation.x=Math.abs(Math.sin(age*9))*.9*env;break; // angry stomp
  case 3:P.position.y+=Math.abs(Math.sin(age*9))*9*env;up(0,2.5);up(1,2.5);break;                       // scared jump
  case 4:P.rotation.x=-.14*env;H.rotation.x=.2*env;break;                                              // cool
  case 5:P.rotation.x=.75*env;H.rotation.x=.25*env;break;                                              // bow
  case 6:up(0,1.6+Math.sin(age*10)*.5);up(1,1.6+Math.sin(age*10+3)*.5);P.position.y+=Math.abs(Math.sin(age*10))*2*env;break; // flex
  case 7:H.rotation.x=.45*env;P.position.x=Math.sin(age*32)*.7*env;break;                              // cry
  case 9:P.position.y+=Math.abs(Math.sin(age*12))*7*env;A[1].rotation.z=2.6*env;break;                  // nice!
  case 10:up(0,1.3);up(1,1.3);H.rotation.z=Math.sin(age*8)*.25*env;break;                              // oops (shrug)
  case 11:up(0,2.6+Math.sin(age*22)*.4);up(1,2.6-Math.sin(age*22)*.4);P.position.x=Math.sin(age*26)*1.2*env;break; // help!
 }}
/* every animal celebrates its own way when it wins */
function winPose(c,t,dt){
 const ci=c.ci;
 if(ci===23){c.pivot.position.y=16+Math.sin(t*20)*2;c.pivot.position.x=Math.sin(t*35)*1.2}
 else if(ci===20){c.arms[0].rotation.z=-2.2+Math.sin(t*26)*.9;c.arms[1].rotation.z=2.2-Math.sin(t*26)*.9;c.pivot.position.y+=6}
 else if(ci===4||ci===6){c.pivot.position.y=Math.abs(Math.sin(t*(ci===4?5:9)))*(ci===4?26:18)}
 else if(ci===16){c.pivot.rotation.z=Math.sin(t*6)*.3;c.yaw-=dt*10}
 else if(ci===19){c.yaw+=dt*4}
 else if(ci===5){c.arms[0].rotation.z=-2.7+Math.sin(t*18)*.6;c.arms[1].rotation.z=2.7+Math.sin(t*18+3)*.6}
 else if(ci===22&&Math.random()<.6)burst(c.anchor.position.x,c.anchor.position.z,'#fb923c',2,{h:40,up:.9,spd:.35,g:80,life:.6})
 else if(ci===18&&Math.random()<.6)burst(c.anchor.position.x,c.anchor.position.z,['#f472b6','#a78bfa','#60a5fa'][(Math.random()*3)|0],2,{h:60,up:1,spd:.4,g:100,life:.7});
 if(c.tail)c.tail.rotation.y=Math.sin(t*16)*.9}
function updChar(c,p,g,f,t,dt,al){
 const A=c.anchor,hold=f.st.holder===p.id||f.st.holder2===p.id,alive=p.a,mv=g.mv&&alive&&p.fz<=0&&p.tr<=0;
 A.visible=true;A.position.set(g.sx,0,g.sy);
 c.tomb.visible=!alive;c.root.visible=alive;c.label.visible=true;
 c.label.position.y=alive?(hold?126:86):44;
 c.blob.visible=alive;
 if(!alive){c.house.g.visible=false;c.halo.visible=false;c.hring.visible=false;c.shield.visible=false;c.ice.visible=false;c.bear.visible=false;c.smoke.visible=false;c.wet.visible=false;c.label.material.opacity=.6;return}
 c.label.material.opacity=al<1?Math.max(.25,al):1;
 if(mv)c.ph+=dt*(p.d?26:(p.sp>0?20:14));
 const sw=mv?Math.sin(c.ph):0,bob=mv?Math.abs(Math.sin(c.ph))*2.4:Math.sin(t*2.2+c.seed)*.5;
 const hop=hold&&p.fz<=0?Math.abs(Math.sin(t*5.5))*2.6:0;
 c.legs[0].rotation.x=sw*.95;c.legs[1].rotation.x=-sw*.95;
 const idle=Math.sin(t*2+c.seed)*.08;
 c.arms[0].rotation.x=mv?-sw*.9:idle;c.arms[1].rotation.x=mv?sw*.9:-idle;c.arms[0].rotation.z=mv?-.15:-.08;c.arms[1].rotation.z=mv?.15:.08;
 c.pivot.position.y=bob+hop-(p.wt>0?5:0);
 c.headM.position.y=c.headY+(mv?Math.sin(c.ph*2)*.9:Math.sin(t*2.2+c.seed)*.45);c.headM.rotation.z=mv?Math.sin(c.ph)*.05:Math.sin(t*1.3+c.seed)*.04;
 if(c.tail)c.tail.rotation.y=Math.sin(t*(mv?14:5)+c.seed)*(mv?.6:.35);
 if(p.d){c.pivot.scale.set(.88,.82,1.38);c.pivot.rotation.x=.5;c.dashT=t}else{const k=1-Math.exp(-dt*14);c.pivot.scale.x+=(1-c.pivot.scale.x)*k;c.pivot.scale.y+=((1+Math.sin(t*2.2+c.seed)*.015)-c.pivot.scale.y)*k;c.pivot.scale.z+=(1-c.pivot.scale.z)*k;c.pivot.rotation.x+=(0-c.pivot.rotation.x)*k}
 if(p.tr>0)c.pivot.position.x=Math.sin(t*60)*1.2;else c.pivot.position.x=0;
 if(Math.hypot(g.fx||0,g.fy||0)>.01){const target=Math.atan2(g.fx,g.fy);c.yaw+=aDiff(c.yaw,target)*(1-Math.exp(-dt*(p.d?40:15)))}
 if(f.st.ph==='OVER'){ // victory party: the winner spins and cheers, everyone else hops
  if(hold){c.yaw+=dt*5;c.pivot.position.y=Math.abs(Math.sin(t*7))*13;c.arms[0].rotation.z=-2.7+Math.sin(t*14)*.3;c.arms[1].rotation.z=2.7-Math.sin(t*14)*.3;c.legs[0].rotation.x=Math.sin(t*14)*.7;c.legs[1].rotation.x=-Math.sin(t*14)*.7;winPose(c,t,dt)}
  else{c.pivot.position.y=Math.abs(Math.sin(t*5+c.seed))*5;c.arms[0].rotation.z=-1.8;c.arms[1].rotation.z=1.8}}
 else{let em0=null;for(let i=f.emotes.length-1;i>=0;i--){if(f.emotes[i].id===p.id){em0=f.emotes[i];break}}
  const ea=em0?(performance.now()-em0.t)/1000:99;
  if(ea<1.9&&!mv&&p.fz<=0&&p.tr<=0)emoteAnim(c,em0.e,ea);else c.headM.rotation.x+=(0-c.headM.rotation.x)*.2}
 c.root.rotation.y=c.yaw;
 setAlpha(c,t<(c.ghostUntil||0)?Math.min(al,.45):al);
 {const ex=(p.fz>0)?'diz':(p.tr>0||p.wt>0||t<(c.sUntil||0))?'sur':hold?'hap':'';for(const k in c.faces)c.faces[k].visible=(k===ex)}
 c.house.g.visible=hold;if(hold){c.house.g.position.y=104+Math.sin(t*3)*3.5;c.house.g.rotation.y=t*1.4}
 c.halo.visible=hold;c.hring.visible=hold;if(hold){c.halo.material.opacity=.45+Math.sin(t*6)*.12;const s=1+Math.sin(t*4)*.07;c.hring.scale.set(s,s,1);c.hring.rotation.z=t*.8}
 c.shield.visible=p.sh>0;if(p.sh>0){const s=38+Math.sin(t*9)*1.8;c.shield.scale.setScalar(s);c.shield.material.opacity=.2+Math.sin(t*7)*.06;c.shield.rotation.y=t}
 c.ice.visible=p.fz>0;c.bear.visible=p.tr>0;
 c.smoke.visible=p.sm>0;if(p.sm>0)c.smoke.children.forEach((s,i)=>{const a=t*2+i*1.26;s.position.set(Math.cos(a)*17,22+Math.sin(a*1.3)*12,Math.sin(a)*17);s.scale.setScalar(11+Math.sin(t*4+i)*2.5)});
 c.mag.visible=t<(c.magUntil||0);if(c.mag.visible){const k=1+Math.sin(t*8)*.12;c.mag.scale.set(k,k,1);c.mag.rotation.z=t*2}
 c.wet.visible=p.wt>0;if(p.wt>0){const s=20+(t*40%16);c.wet.scale.set(s,s,1);if(Math.random()<.2)burst(g.sx,g.sy,'#bae6fd',2,{up:1.4,spd:.35,g:300,life:.5,h:6})}
 if(mv&&!p.d&&Math.random()<.16)burst(g.sx-(g.fx||0)*9,g.sy-(g.fy||0)*9,'#e5e7eb',1,{up:.25,spd:.1,g:60,life:.4,h:3});
 if(p.sp>0&&mv&&Math.random()<.55)burst(g.sx-(g.fx||0)*10,g.sy-(g.fy||0)*10,'#fde68a',1,{up:.2,spd:.12,g:30,life:.35,h:8});
 if(p.d&&Math.random()<.9)burst(g.sx,g.sy,p.id===f.you?'#facc15':'#e2e8f0',2,{up:.2,spd:.2,g:20,life:.35,h:8});
 if(mv&&f.you===p.id&&Math.floor(c.ph/PI)!==c.lastStep){c.lastStep=Math.floor(c.ph/PI);if(!p.d)SFX.play('step')}
 /* emote bubble */
 let em=null;for(let i=f.emotes.length-1;i>=0;i--){const e=f.emotes[i];if(e.id===p.id){em=e;break}}
 if(em){const age=(performance.now()-em.t)/2200;if(age<1){if(!c.emo){c.emo=emojiSprite('👋',44);c.anchor.add(c.emo)}if(c.emoId!==em.t){c.emoId=em.t;const et=texEmoji(f.EMO[em.e]||'💬');c.emo.material.map=et;c.emo.material.needsUpdate=true;c.emo.scale.set(44*et.image.width/et.image.height,44,1)}
   c.emo.visible=true;c.emo.position.y=(hold?152:112)+age*30;c.emo.material.opacity=1-age*age*age}else if(c.emo)c.emo.visible=false}else if(c.emo)c.emo.visible=false}

function frame(f){
 if(!active||!sc)return;
 const t=f.t/1000,dt=f.dt;tNow=t;const st=f.st,pos=f.pos;
 /* camera */
 const vx=f.view.x,vz=f.view.y;
 if(!fcInit){fcx=vx;fcz=vz;fcInit=true}
 const kf=1-Math.exp(-dt*9);fcx+=(vx-fcx)*kf;fcz+=(vz-fcz)*kf;
 const W=I.w,H=I.h;let tx=clamp(fcx,-80,W+80),tz=clamp(fcz,-80,H+80);
 const phz=st.ph==='ROLE'?1.5:st.ph==='COUNT'?1.2:st.ph==='SCORE'?.9:1;
 zoom+=(phz-zoom)*(1-Math.exp(-dt*3));
 punch=Math.max(0,punch-dt*2.2);const co=CAMS[Settings.get('cam')]||CAMS.tilt,aspect=cw/ch;let zz=zoom*(aspect<1.5?1.18:1)*(1-.14*Math.sin(punch*PI/2));
 if(st.ph==='OVER'){orbit+=dt*.45;const hp=pos[st.holder];if(hp){tx=hp.sx;tz=hp.sy}
  cam.position.set(tx+Math.sin(orbit)*330,230,tz+Math.cos(orbit)*330);cam.lookAt(tx,36,tz)}
 else{const sx=f.shake?f.shake[0]:0,sz=f.shake?f.shake[1]:0;
  cam.position.set(tx+co[0]*zz+sx*1.4,co[1]*zz,tz+co[2]*zz+sz*1.4);cam.lookAt(tx+sx*.4,10,tz-30*(co[1]>800?0:1)+sz*.4);cam.rotation.z+=sx*.0009}
 const me=f.dash?1:0;fovK+=((me?1:0)-fovK)*(1-Math.exp(-dt*10));{const nf=44+fovK*6;if(Math.abs(nf-cam.fov)>.02){cam.fov=nf;cam.updateProjectionMatrix()}}
 /* light follows the view */
 sun.position.set(tx-380,780,tz+300);sun.target.position.set(tx,0,tz);
 flash=Math.max(0,flash-dt*3.2);
 const nk=f.mod==='NIGHT'?1:0;nightK+=(nk-nightK)*(1-Math.exp(-dt*2.5));
 let dk=nightK;
 hemi.intensity=.5*(1-.55*dk)+flash*.9;sun.intensity=.64*(1-.7*dk)+flash*.5;
 const bgc=_bg.copy(skyC).lerp(KC.night,dk*.85);
 if(tod===1){bgc.lerp(KC.sunset,.32);sun.color.copy(KC.sunSet);hemi.color.copy(KC.hemSet)}else if(tod===2){bgc.lerp(KC.dusk,.38);sun.color.copy(KC.sunDusk);hemi.color.copy(KC.hemDusk);hemi.intensity*=.9;sun.intensity*=.85}else{sun.color.copy(sunC);hemi.color.copy(hemC)}
 if(rainy)bgc.lerp(KC.rain,.45);
 if(season==='halloween')bgc.lerp(KC.hal,.3);else if(season==='xmas')bgc.lerp(KC.xmas,.2);
 if(st.ph==='ROLE'&&f.disaster==='METEOR')bgc.lerp(KC.meteor,.25);
 if(f.disaster==='LIGHTNING'||f.disaster==='TORNADO')bgc.lerp(KC.storm,.45);
 if(f.disaster==='HAIL')bgc.lerp(KC.hail,.35);
 sc.background.copy(bgc);sc.fog.color.copy(fogMix.copy(fogC).lerp(bgc,.7));
 /* players */
 const watcher=f.watcher;
 for(const p of st.p){const g=pos[p.id],c=chars[p.id];if(!g||!c)continue;
  const al=f.vis(p,g);if(al<0){c.anchor.visible=false;continue}
  if(p.id!==f.you&&st.ph!=='OVER'&&Math.hypot(g.sx-tx,g.sy-tz)>1700*zz){c.anchor.visible=false;continue} // far off screen: skip the work
  updChar(c,p,g,f,t,dt,al)}
 /* decoys */
 const dcs=st.dc||[];P.decoys.forEach(d=>d.g.visible=false);
 dcs.forEach((d,i)=>{const ch0=d[2];let o=P.decoys[i];
  if(watcher&&f.mod==='NIGHT'&&Math.hypot(d[0]-watcher.sx,d[1]-watcher.sy)>340)return;
  const info=names[d[4]]||{name:'?',team:'red'},tsh=I.mode==='team'&&TSH[info.team]?' '+TSH[info.team]:'';
  if(!o||o.c.ci!==ch0||o.c.nm!==info.name){if(o){P.decoyG.remove(o.g)}o=makeDecoy(ch0,info.name,tsh,accPick(info,d[4]));P.decoys[i]=o;P.decoyG.add(o.g)}
  o.g.visible=true;o.g.position.set(d[0],0,d[1]);o.c.house.g.visible=!!d[3];if(d[3]){o.c.house.g.position.y=104+Math.sin(t*3)*3.5;o.c.house.g.rotation.y=t*1.4}
  o.c.pivot.position.y=Math.sin(t*2.2+i)*.5;o.c.arms[0].rotation.x=Math.sin(t*2+i)*.08;o.c.arms[1].rotation.x=-Math.sin(t*2+i)*.08});
 /* hazards, pickups, water */
 hazards(f,t,dt);
 /* arrow to the property */
 const mp=f.mine&&!f.dead?pos[f.you]:null,hids=[st.holder,st.holder2].filter(i=>i&&i!==f.you&&pos[i]),hid=mp?hids.sort((a,b)=>Math.hypot(pos[a].sx-mp.sx,pos[a].sy-mp.sy)-Math.hypot(pos[b].sx-mp.sx,pos[b].sy-mp.sy))[0]:null,hp=hid?pos[hid]:null;
 if(arrow){arrow.visible=false;if(mp&&hp&&st.holder!==f.you&&st.holder2!==f.you&&st.ph!=='SCORE'&&st.ph!=='OVER'){const dx=hp.sx-mp.sx,dz=hp.sy-mp.sy,d=Math.hypot(dx,dz);if(d>160){const a=Math.atan2(dx,dz);arrow.visible=true;arrow.position.set(mp.sx+Math.sin(a)*(88+Math.sin(t*6)*4),5,mp.sy+Math.cos(a)*(88+Math.sin(t*6)*4));arrow.rotation.y=a}}}
 updFx();updParticles(dt);wTick^=1;if(quality===3||wTick)updWeather(quality===3?dt:dt*2,t); // weather updates every other frame on weaker settings
 for(const u of zoneUpd)u(t);
 if(trapGlow)trapGlow.material.opacity=.22+Math.sin(t*4)*.1;
 if(st.ph==='OVER'&&Math.random()<.9)burst(tx+rnd(-420,420),tz+rnd(-300,300),['#facc15','#38bdf8','#f472b6','#86efac','#ffffff'][(Math.random()*5)|0],2,{h:380,up:-.2,spd:.12,g:120,life:2.4});
 if(shadowsOn){shTick^=1;if(shTick)rd.shadowMap.needsUpdate=true}
 rd.render(sc,cam);
 if(snapReq){const cb=snapReq;snapReq=null;try{const c=document.createElement('canvas');c.width=glCv.width;c.height=glCv.height;c.getContext('2d').drawImage(glCv,0,0);cb(c)}catch(e){cb(null)}}}

function hazards(f,t,dt){
 const st=f.st,pos=f.pos;
 P.warn.begin();P.met.begin();P.hail.begin();P.tor.begin();P.bou.begin();P.lane.begin();
 for(const h of st.hz){
  if(h.k==='t'){const o=P.tor.get();o.g.position.set(h.x,0,h.y);o.g.scale.set(h.r*1.5,h.r*1.15,h.r*1.5);o.rings.forEach((m,i)=>{m.rotation.y=t*(2.2+i*.5)*(i%2?-1:1);m.position.x=Math.sin(t*3+i)*.03});
   o.base.scale.set(h.r*.9,h.r*.9,1);if(Math.random()<.7){const a=Math.random()*6.28,rr=h.r*(.4+Math.random()*.8);burst(h.x+Math.cos(a)*rr,h.y+Math.sin(a)*rr,Math.random()<.5?'#a8a29e':'#d6d3d1',1,{h:rnd(4,110),up:.2,spd:.12,g:-40,life:.6})}}
  else if(h.k==='b'){
   if(h.w>0){const o=P.lane.get(),hor=h.vx!==0;o.m.scale.set(hor?I.w:h.r*2,hor?h.r*2:I.h,1);o.g.position.set(hor?I.w/2:h.x,0,hor?h.y:I.h/2);o.m.position.set(0,.95,0);o.m.material.opacity=.14+.22*Math.abs(Math.sin(t*12));
    o.w.position.set(hor?(h.vx>0?-(I.w/2)+50:I.w/2-50):0,46,hor?0:(h.vy>0?-(I.h/2)+50:I.h/2-50))}
   else{const o=P.bou.get();o.g.position.set(h.x,h.r*.9,h.y);o.m.scale.setScalar(h.r);if(h.vx!==0)o.m.rotation.z=-h.x/h.r;else o.m.rotation.x=h.y/h.r;o.sh.scale.set(h.r*1.1,h.r*1.1,1);o.sh.position.y=-h.r*.9+.8;
    if(Math.random()<.6)burst(h.x,h.y,'#a8a29e',2,{h:6,up:.5,spd:.4,g:200,life:.5})}}
  else{const w=WARNC[h.k]||WARNC.l,ms=WARNMS[h.k]||900,fr=clamp(1-h.w/ms,0,1),o=P.warn.get();
   o.g.position.set(h.x,0,h.y);o.disc.scale.set(h.r,h.r,1);o.disc.material.color.copy(w);o.disc.material.opacity=.12+fr*.35;
   o.ring.scale.set(h.r,h.r,1);o.ring.material.color.copy(w);o.inner.scale.set(h.r*fr,h.r*fr,1);o.inner.material.color.copy(w);
   o.spark.material.opacity=h.k==='l'?.35+fr*.6:0;
   if(h.k==='m'){const k=h.w/1600,m=P.met.get();m.g.position.set(h.x+k*210,k*560+12,h.y);m.g.rotation.set(0,0,0);m.m.rotation.x=t*5;
    m.tr.position.set(55,70,0);m.tr.quaternion.setFromUnitVectors(V(0,1,0),V(210,560,0).normalize());m.tr.position.set(210/600*60,560/600*60,0)}
   else if(h.k==='h'){const k=h.w/1000,m=P.hail.get();m.g.position.set(h.x+k*40,k*420+8,h.y);m.m.rotation.x=t*6}}}
 P.warn.end();P.met.end();P.hail.end();P.tor.end();P.bou.end();P.lane.end();
 /* sinkholes that stay open */
 P.hole.begin();for(const o of st.ho||[]){const m=P.hole.get();m.g.position.set(o.x,0,o.y);m.d.scale.set(o.r,o.r,1);m.r.scale.set(o.r*1.02,o.r*1.02,1)}P.hole.end();
 /* lucky blocks */
 P.lucky.begin();for(const b of st.lb||[]){const o=P.lucky.get();o.g.position.set(b.x,0,b.y);o.c.position.y=24+Math.sin(t*3+b.x)*4;o.c.rotation.y=t*1.6+b.x;o.c.rotation.x=Math.sin(t*1.5+b.y)*.25;o.gl.position.y=o.c.position.y;o.gl.material.opacity=.55+Math.sin(t*4+b.x)*.2}P.lucky.end();
 /* bear traps on the ground */
 P.bear.begin();for(const b of st.bt||[]){const o=P.bear.get();o.g.position.set(b.x,0,b.y);const mi=!!b.m;o.a.visible=!mi&&!!b.a;o.b.visible=!mi&&!b.a;o.mn.visible=mi;if(mi)o.ml.material.opacity=b.a?.35+Math.abs(Math.sin(t*6))*.65:.25}P.bear.end();
 /* flood */
 if(flood){const fx_=st.fx||0,fy_=st.fy||0;flood.visible=fx_>0||fy_>0;
  if(flood.visible){const W=I.w,H=I.h,w=(i,x,z,sx,sz,h)=>{const b=flood.children[i];b.position.set(x,h/2,z);b.scale.set(Math.max(1,sx),h,Math.max(1,sz))},hh=9+Math.sin(t*3)*1.5;
   w(0,W/2,fy_/2,W,fy_,hh);w(1,W/2,H-fy_/2,W,fy_,hh);w(2,fx_/2,H/2,fx_,H-2*fy_,hh);w(3,W-fx_/2,H/2,fx_,H-2*fy_,hh);
   const fh=3.5+Math.sin(t*5)*1;w(4,W/2,fy_,W-2*fx_,6,fh+9);w(5,W/2,H-fy_,W-2*fx_,6,fh+9);w(6,fx_,H/2,6,H-2*fy_,fh+9);w(7,W-fx_,H/2,6,H-2*fy_,fh+9);
   floodMats[0].opacity=.5+Math.sin(t*2)*.05;floodMats[1].opacity=.5+Math.sin(t*6)*.2}}
}

/* ---------- visual events from the server ---------- */
function onEvent(m,pos,you){
 if(!sc)return;
 if(m.k==='boom'){const x=m.x,y=m.y,r=m.r;
  if(m.hk==='m'){fx('flash',{x,y,r0:r*.4,r1:r*1.7,c:'#fb923c',dur:.5,a:.9});fx('ring',{x,y,r0:r*.3,r1:r*2.1,c:'#fde68a',dur:.55});fx('ring',{x,y,r0:r*.2,r1:r*1.4,c:'#ef4444',dur:.4,h:4});burst(x,y,'#fb923c',34,{up:1.5,spd:1.1,life:.8});burst(x,y,'#78716c',16,{up:.8,spd:.8,g:100,life:1});addDecal(x,y,r*1.1,'m');flash=Math.max(flash,.25)}
  else if(m.hk==='l'){fx('bolt',{x,y,dur:.34});fx('flash',{x,y,r0:r*.3,r1:r*1.1,c:'#fef08a',dur:.35,a:.8});fx('ring',{x,y,r0:r*.3,r1:r*1.5,c:'#ffffff',dur:.35});fx('beam',{x,y,r:r*.22,hh:520,c:'#fffbe0',dur:.3,a:.8});burst(x,y,'#fef08a',22,{up:1.3,spd:.9,life:.6});addDecal(x,y,r,'l');flash=1}
  else if(m.hk==='h'){fx('ring',{x,y,r0:r*.3,r1:r*1.6,c:'#bfdbfe',dur:.35});burst(x,y,'#dbeafe',12,{up:1.2,spd:.7,life:.5});addDecal(x,y,r*.8,'h')}
  else if(m.hk==='s'){fx('ring',{x,y,r0:r*.4,r1:r*1.8,c:'#d6a460',dur:.6});burst(x,y,'#a16207',26,{up:.9,spd:.9,g:300,life:.9});flash=Math.max(flash,.05)}}
 else if(m.k==='steal'||m.k==='pass'){if(m.k==='steal'){punch=1;const v=chars[m.from];if(v)v.sUntil=tNow+1.6}const g=pos[m.to];if(g){fx('ring',{x:g.sx,y:g.sy,r0:10,r1:130,c:'#facc15',dur:.55});fx('ring',{x:g.sx,y:g.sy,r0:6,r1:80,c:'#ffffff',dur:.4,h:6});fx('beam',{x:g.sx,y:g.sy,r:22,hh:240,c:'#facc15',dur:.5,a:.5});burst(g.sx,g.sy,'#facc15',36,{up:1.4,spd:1.2,life:.8});fx('floaty',{x:g.sx,y:g.sy,e:'🏠',h:90,s:46,dur:1})}}
 else if(m.k==='die'){const g=pos[m.id];if(g){burst(g.sx,g.sy,'#ef4444',30,{up:1.4,spd:1,life:.8});fx('floaty',{x:g.sx,y:g.sy,e:'👻',h:40,s:44,dur:1.4});fx('ring',{x:g.sx,y:g.sy,r0:8,r1:70,c:'#ef4444',dur:.45})}}
 else if(m.k==='power'){const g=pos[m.id];if(g){const E={speed:'⚡',shield:'🛡️',trap:'🪤',freeze:'🥶',smoke:'💨',swap:'🔀',decoy:'👥',magnet:'🧲',jump:'🦘',reveal:'👁️',ghost:'👻',tele:'🌀',mine:'💣'}[m.pw]||'🎁',C={speed:'#facc15',shield:'#38bdf8',trap:'#cbd5e1',freeze:'#bae6fd',smoke:'#e2e8f0',swap:'#c084fc',decoy:'#fde68a',magnet:'#f87171',jump:'#34d399',reveal:'#fde047',ghost:'#c4b5fd',tele:'#67e8f9',mine:'#ef4444'}[m.pw]||'#fff';
   if(m.pw==='ghost'&&chars[m.id])chars[m.id].ghostUntil=tNow+4;
   if(m.pw==='magnet'&&chars[m.id])chars[m.id].magUntil=tNow+6;
   fx('ring',{x:g.sx,y:g.sy,r0:8,r1:90,c:C,dur:.55});fx('beam',{x:g.sx,y:g.sy,r:16,hh:200,c:C,dur:.5,a:.45});burst(g.sx,g.sy,C,26,{up:1.7,spd:.8,life:.8});fx('floaty',{x:g.sx,y:g.sy,e:E,h:100,s:44,dur:1.1})}}
 else if(m.k==='ability'){const g=pos[m.id],a=(typeof ABIL!=='undefined')?ABIL[m.ab]:null;if(g&&a){const k=a[6]||'';fx('ring',{x:g.sx,y:g.sy,r0:10,r1:a[5]||90,c:a[4],dur:.6});fx('floaty',{x:g.sx,y:g.sy,e:a[0],h:100,s:44,dur:1.2});burst(g.sx,g.sy,a[4],(k.indexOf('stun')>=0||k.indexOf('push')>=0)?40:24,{up:1.5,spd:k.indexOf('push')>=0?1.4:.9,life:.8});const c=chars[m.id];if(c){if(k.indexOf('ghost')>=0)c.ghostUntil=tNow+3.5;if(k.indexOf('magnet')>=0)c.magUntil=tNow+4.5}}}
 else if(m.k==='role'){const g=pos[m.id];if(g){fx('floaty',{x:g.sx,y:g.sy,e:m.role==='sprinter'?'⚡':'🧤',h:96,s:42,dur:2});fx('ring',{x:g.sx,y:g.sy,r0:8,r1:70,c:m.role==='sprinter'?'#facc15':'#f97316',dur:.6})}}
 else if(m.k==='snap'){fx('ring',{x:m.x,y:m.y,r0:6,r1:60,c:'#e2e8f0',dur:.3});burst(m.x,m.y,'#cbd5e1',20,{up:1,spd:.9,life:.5})}
 else if(m.k==='bounce'){fx('ring',{x:m.x,y:m.y,r0:10,r1:80,c:'#f472b6',dur:.4});burst(m.x,m.y,'#f472b6',18,{up:1.8,spd:.5,life:.6})}
 else if(m.k==='tp'){fx('beam',{x:m.fromx,y:m.fromy,r:26,hh:320,c:'#a78bfa',dur:.5,a:.7});fx('beam',{x:m.x,y:m.y,r:26,hh:320,c:'#67e8f9',dur:.5,a:.7});fx('ring',{x:m.x,y:m.y,r0:8,r1:90,c:'#67e8f9',dur:.5});burst(m.fromx,m.fromy,'#a78bfa',22,{up:1.5,spd:.7,life:.7});burst(m.x,m.y,'#67e8f9',22,{up:1.5,spd:.7,life:.7})}
 else if(m.k==='swap'){for(const id of[m.a,m.b]){const g=pos[id];if(g){fx('ring',{x:g.sx,y:g.sy,r0:8,r1:80,c:'#c084fc',dur:.5});burst(g.sx,g.sy,'#c084fc',20,{up:1.4,spd:.8,life:.7})}}}}

/* ---------- little rotating character in the lobby ---------- */
let pv=null;
function previewStart(canvas){
 if(failed||!window.THREE)return false;
 try{
  previewStop();
  const r=new T.WebGLRenderer({canvas,antialias:true,alpha:true});r.setClearColor(0x000000,0);
  const s=new T.Scene(),c=new T.PerspectiveCamera(32,1,1,800);c.position.set(0,46,150);c.lookAt(0,30,0);
  s.add(new T.HemisphereLight('#ffffff','#556688',.75));const d=new T.DirectionalLight('#ffffff',.7);d.position.set(60,140,120);s.add(d);
  const base=new T.Mesh(new T.CylinderGeometry(30,34,4,32),new T.MeshLambertMaterial({color:'#334155'}));base.position.y=-2;s.add(base);
  pv={r,s,c,canvas,char:null,ci:-1,raf:0,t0:performance.now(),ringM:base.material};
  {let dx0=null;canvas.onpointerdown=e=>{dx0=e.clientX;try{canvas.setPointerCapture(e.pointerId)}catch(_){}};canvas.onpointermove=e=>{if(dx0==null||!pv)return;pv.rot=(pv.rot||0)+(e.clientX-dx0)*.012;dx0=e.clientX};canvas.onpointerup=canvas.onpointercancel=()=>{dx0=null}}
  const loop=now=>{if(!pv||pv.canvas!==canvas)return;pv.raf=requestAnimationFrame(loop);
   if(!canvas.isConnected||canvas.offsetParent===null)return;
   pv.fr=(pv.fr||0)+1;if(pv.fr&1)return; // the lobby preview only needs 30 frames per second
   const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==w*2||canvas.height!==h*2){r.setSize(w*2,h*2,false);c.aspect=w/h;c.updateProjectionMatrix()}
   const t=(now-pv.t0)/1000;if(pv.char){pv.char.root.rotation.y=t*.9+(pv.rot||0);pv.char.pivot.position.y=Math.abs(Math.sin(t*3))*3;pv.char.arms[0].rotation.z=-.5+Math.sin(t*3)*.3;pv.char.arms[1].rotation.z=.5-Math.sin(t*3)*.3;if(pv.char.tail)pv.char.tail.rotation.y=Math.sin(t*8)*.5}
   r.render(s,c)};
  pv.raf=requestAnimationFrame(loop);return true}catch(e){console.error('preview failed',e);pv=null;return false}}
function previewSet(ci,color,id,acc){if(!pv)return;const ak=id==null?99:accPick({acc},id);if(ci!==pv.ci||ak!==pv.ak){if(pv.char)pv.s.remove(pv.char.anchor);pv.char=buildChar(ci,ak);pv.s.add(pv.char.anchor);pv.ci=ci;pv.ak=ak;pv.char.faces.hap.visible=true}if(color)pv.ringM.color.set(color)}

/* a still render of a map for the lobby: same theme, ground, mountains and scenery as the match */
let shotR=null;const SHOT={};
const GROUND={forest:{g:['#3d7a37','#4a8c42','#336b2f']},desert:{g:['#d9b26b','#e3c07e','#c9a059']},snow:{g:['#e4eef7','#d3e3f1','#f4f9fd']},lava:{g:['#3a2a2a','#4a3030','#2c1e1e']},swamp:{g:['#3b4a2a','#46572f','#313f23']},beach:{g:['#f1d9a0','#e9cf8e','#f7e6b8'],edge:'rgba(14,165,233,.6)'},candy:{g:['#f9a8d4','#f472b6','#fbcfe8']},space:{g:['#1e1b4b','#312e81','#27235f']},autumn:{g:['#b45309','#c2610c','#9a4a08']},ruins:{g:['#4b5563','#525c6b','#3f4753']},reef:{g:['#e9d5a1','#f1e2b4','#d9c58c'],edge:'rgba(14,165,233,.5)'},mansion:{g:['#3b2f4f','#463a5c','#2f2540']}};

function mapShot(key,w,h){
 if(failed||!window.THREE||active)return null;
 if(SHOT[key])return SHOT[key];
 const sv=[sc,TMH,I,map,quality,statics,dyn];
 try{
  const th=TM[key]||TM.forest,W=1600,H=1100;
  if(!shotR){const c=document.createElement('canvas');c.width=w;c.height=h;shotR=new T.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});shotR.setClearColor(0x000000,1)}
  shotR.setSize(w,h,false);
  TMH=th;map=key;I={w:W,h:H};quality=2;
  const s=new T.Scene();sc=s;s.background=new T.Color(th.sky);s.fog=new T.Fog(new T.Color(th.fog||th.sky),1100,3400);
  s.add(new T.HemisphereLight(th.hs,th.hg,.5));
  const sn=new T.DirectionalLight(th.sun,.64),cz=H*.55;sn.position.set(W/2-380,780,cz+300);sn.target.position.set(W/2,0,cz);s.add(sn);s.add(sn.target);
  const P=GROUND[key]||GROUND.forest;
  const gc=document.createElement('canvas');gc.width=1024;gc.height=Math.round(1024*H/W);const x=gc.getContext('2d'),k=1024/W,r=mulberry(key.length*977+key.charCodeAt(0));
  x.scale(k,k);x.fillStyle=P.g[0];x.fillRect(0,0,W,H);
  for(let i=0;i<W*H/5000;i++){x.globalAlpha=.5;x.fillStyle=P.g[1+(r()*2|0)];x.beginPath();x.ellipse(r()*W,r()*H,40+r()*130,30+r()*90,r()*3,0,7);x.fill()}
  x.globalAlpha=1;x.strokeStyle=P.edge||'rgba(0,0,0,.3)';x.lineWidth=90;x.strokeRect(0,0,W,H);x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=24;x.strokeRect(0,0,W,H);
  buildStatics({w:W,h:H,seed:key.length*7919+key.charCodeAt(1)},gc);
  const ops=[],kinds=th.ob,rr=mulberry(key.charCodeAt(0)*31+key.length);
  for(let i=0;i<26;i++){const ox=140+rr()*(W-280),oy=140+rr()*(H-280),or=42+rr()*26,ry=rr()*6;try{ops.push(...place(OBJ[kinds[i%2]](or),ox,oy,ry,1,.75))}catch(e){}}
  if(ops.length)s.add(mk(ops,true));
  const cm=new T.PerspectiveCamera(44,w/h,10,7000);cm.position.set(W/2,520,H+560);cm.lookAt(W/2,150,H*.42);
  shotR.render(s,cm);
  return SHOT[key]=shotR.domElement.toDataURL('image/jpeg',.86);
 }catch(e){return null}
 finally{[sc,TMH,I,map,quality,statics,dyn]=sv}
}
function previewRotate(d){if(pv)pv.rot=(pv.rot||0)+d}
function previewStop(){if(!pv)return;cancelAnimationFrame(pv.raf);try{pv.r.dispose()}catch(e){}pv=null}

const snapshot=cb=>{snapReq=cb};
return{snapshot,get crowd(){return crowd},get season(){return season},available,get on(){return active},attach,init,setRound,frame,burst,fx:onEvent,resize,stop,hide,lower,toScreen,previewStart,previewSet,previewStop,previewRotate,mapShot,get quality(){return quality}};
})();
