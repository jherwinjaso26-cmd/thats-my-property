/* "?" help: game mechanics, controls, abilities, lucky blocks, disasters and maps. Buttons appear on the home screen, in the lobby and during a match. */
const Help=(()=>{
const row=(i,t,d)=>`<div class="hr"><span>${i}</span><div><b>${t}</b><br>${d}</div></div>`;
const TABS={
 'Basics':`<p>Hold the 🏠 <b>property</b> for as long as you can. Everyone else wants to steal it!</p>
  ${row('🛡️','Protector','One random player starts each round as the Protector and holds the property. Run away from everyone!')}
  ${row('🥷','Stealers','Everyone else. Touch the Protector to steal the property. You become the new Protector and they become a Stealer.')}
  ${row('⏱️','30 second timer','The property has a 30 second timer that keeps running when it changes hands (stealing does not reset it). When it reaches 0, whoever is holding it gets <b>1 point</b>.')}
  ${row('🏆','Winning','The first player (or team) to reach the “Race to” score set by the host wins the match.')}
  ${row('📈','Every round gets harder','After each point the round levels up: more obstacles and traps, and the disaster gets stronger.')}
  ${row('➡️','Arrow','A yellow arrow around you points to whoever holds the property.')}
  ${row('💀','Dying','Dead players spectate until the next round. If everybody dies, nobody scores.')}
  ${row('⚡','Protector bonus','The Protector runs slightly faster than everyone else.')}
  ${row('👥','Modes','<b>Solo</b>: every player for themselves. <b>Team colors</b>: pick a color/shape, points count for your team.')}
  ${row('⏳','After a steal','There is a short moment right after a steal when the property cannot be stolen again.')}`,
 'Controls':`<h3>📱 Phone</h3>
  ${row('🕹️','Move','Touch and drag anywhere on the left side of the screen. A joystick appears under your finger.')}
  ${row('⚡','Dash','Tap the big yellow ⚡ button (bottom right).')}
  ${row('🪤','Use item','Tap the item button next to the dash button when you are holding one.')}
  ${row('😂','Emotes','Tap an emote at the bottom of the screen.')}
  ${row('⛶','Fullscreen','Tap ⛶ to hide the browser bars.')}
  <h3>💻 Keyboard</h3>
  ${row('⌨️','Move','W A S D or the arrow keys.')}
  ${row('⚡','Dash','Space or Left Shift.')}
  ${row('🪤','Use item','E or F.')}
  ${row('😂','Emotes','Number keys 1 to 6.')}`,
 'Abilities':`${row('⚡','Dash','A very fast burst of speed. It has a <b>3 second cooldown</b> (shown on the button). Use it to escape, to catch up, or to dodge a disaster.')}
  ${row('😂','Emotes','Wave, laugh, rage or celebrate. Everyone nearby sees it.')}
  ${row('🎁','Lucky items','Pick up lucky blocks to get a special ability. See the Lucky blocks tab.')}
  ${row('🌿','Hiding','On some maps, bushes or leaf piles hide you from players who are far away.')}
  ${row('🌙','Night vision','On Night rounds you can only see what is close to you.')}`,
 'Lucky blocks':`<p>A 🎁 lucky block appears about <b>every 10 seconds</b>. Touch one to get a random effect:</p>
  ${row('⚡','Speed Boost','You move much faster for 5 seconds.')}
  ${row('🛡️','Shield','For 5 seconds nobody can steal the property from you.')}
  ${row('🪤','Bear Trap','Place it on the ground (item button or E). Anyone who steps on it is stuck for 3 seconds.')}
  ${row('💨','Smoke Bomb','For 4 seconds you are hard to see.')}
  ${row('👥','Decoy','Leaves a fake copy of you for 8 seconds to confuse everyone.')}
  ${row('🔀','Swap','Instantly trade places with another player who is still alive.')}
  ${row('🥶','Freeze (bad luck!)','You freeze yourself for 3 seconds. Ouch.')}`,
 'Disasters':`<p>Every round has one natural disaster. A warning circle or lane shows where it will hit, so keep moving!</p>
  ${row('☄️','Meteor Shower','Red circles show where meteors land. Move out before they hit.')}
  ${row('⚡','Lightning Storm','Yellow circles mark lightning strikes. They hit fast!')}
  ${row('🌪️','Tornado','Tornadoes chase the nearest player. Keep moving and dash away.')}
  ${row('🌊','Rising Flood','Water rises from the edges. In water you are slow and you drown after 2.5 seconds. Stay in the middle!')}
  ${row('🕳️','Sinkholes','Brown circles open into holes that stay open and kill on touch.')}
  ${row('🧊','Hailstorm','Lots of small ice strikes. Watch the blue circles.')}
  ${row('🪨','Rolling Boulders','A red lane warns where a boulder will roll across the whole map. Leave the lane!')}
  <h3>Special rounds</h3>
  ${row('🌙','Night','You can only see what is close to you. Other players hide in the dark.')}
  ${row('💨','Speedy','Everyone moves 30% faster!')}`,
 'Maps':`<p>The host picks the map in the lobby. Each map has its own terrain rule:</p>
  ${row('🌲','Forest','Bushes hide you from players who are far away.')}
  ${row('🍁','Autumn','Leaf piles hide you from players who are far away.')}
  ${row('🏜️','Desert','Quicksand slows you down.')}
  ${row('❄️','Snow','Ice patches make you slide.')}
  ${row('🌋','Lava','Lava pools burn. Stay out!')}
  ${row('🍄','Swamp','Mud slows you down.')}
  ${row('🏖️','Beach','Tide pools slow you down.')}
  ${row('🍭','Candy Land','Bounce pads launch you forward.')}
  ${row('🌑','Moon Base','Portals teleport you to their twin.')}
  ${row('🏛️','Ancient Ruins','Ancient gates teleport you to their twin.')}
  <p style="margin-top:8px">Bigger rooms get a bigger map. You spawn far away from other players.</p>`};
const css=document.createElement('style');
css.textContent=`#help{position:fixed;inset:0;z-index:45;display:none;align-items:center;justify-content:center;background:#000b;padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}
#help.on{display:flex}
#help .hc{background:#111c2ff5;border:1px solid #475569;border-radius:18px;width:min(640px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px #000a}
#help .hh{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 4px}#help .hh b{font-size:18px;color:#facc15}
#help .ht{display:flex;gap:6px;padding:6px 12px;overflow-x:auto;flex:none}
#help .ht button{background:#1e293b;padding:7px 12px;font-size:13px;white-space:nowrap;flex:none}#help .ht button.on{background:linear-gradient(135deg,#facc15,#f59e0b);color:#1a1200}
#help .hb{padding:6px 14px 14px;overflow-y:auto;font-size:14px;line-height:1.4;color:#e2e8f0;-webkit-overflow-scrolling:touch}
#help .hb p{margin:4px 0 8px;color:#cbd5e1}#help .hb h3{font-size:13px;text-transform:uppercase;letter-spacing:1.2px;color:#94a3b8;margin:10px 0 6px}
#help .hr{display:flex;gap:10px;align-items:flex-start;background:#0b122099;border-radius:12px;padding:8px 10px;margin-bottom:6px}
#help .hr>span{font-size:24px;flex:none;width:30px;text-align:center}#help .hr b{color:#facc15}
.hbtn{font-weight:900;min-width:40px}
.help-home{position:absolute;top:max(10px,env(safe-area-inset-top));right:calc(max(10px,env(safe-area-inset-right)) + 48px);z-index:2}
#game .help-game{position:absolute;top:max(8px,env(safe-area-inset-top));right:calc(max(10px,env(safe-area-inset-right)) + 192px)}`;
document.head.append(css);
const box=document.createElement('div');box.id='help';
box.innerHTML=`<div class="hc"><div class="hh"><b>❓ How to play</b><button class="ghost" id="helpX">✕ Close</button></div><div class="ht"></div><div class="hb"></div></div>`;
document.body.append(box);
const tabs=box.querySelector('.ht'),body=box.querySelector('.hb');
function pick(name){[...tabs.children].forEach(b=>b.classList.toggle('on',b.dataset.k===name));body.innerHTML=TABS[name];body.scrollTop=0}
Object.keys(TABS).forEach(k=>{const b=document.createElement('button');b.textContent=k;b.dataset.k=k;b.onclick=()=>pick(k);tabs.append(b)});
function open(tab){pick(tab||Object.keys(TABS)[0]);box.classList.add('on')}
function close(){box.classList.remove('on')}
box.querySelector('#helpX').onclick=close;
box.addEventListener('pointerdown',e=>{if(e.target===box)close()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&box.classList.contains('on'))close()});
function button(cls){const b=document.createElement('button');b.className='ghost hbtn '+(cls||'');b.textContent='?';b.title='How to play';b.setAttribute('aria-label','How to play');b.onclick=()=>open();return b}
const home=document.getElementById('home');if(home)home.append(button('help-home'));
const lobbyBtns=document.querySelector('#lobby header>div');if(lobbyBtns)lobbyBtns.append(button());
const game=document.getElementById('game');if(game)game.append(button('help-game'));
return{open,close};
})();
