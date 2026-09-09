
/* =========================================================
   Jaguar Campus Compass — working prototype
   ========================================================= */
const $=s=>document.querySelector(s);
const norm=a=>((a%360)+360)%360;
const M2FT=3.28084;
const ft=m=>Math.max(5,Math.round(m*M2FT/5)*5);   // clean rounded feet

/* ---------- OUTDOOR BUILDINGS (real TAMUSA GPS) ---------- */
/* ============================================================
   CONFIG  —  everything that describes ONE place.
   Edit these values (or copy the block for a new place) and the
   engine below never has to change.  TAMUSA = config #1.
   ============================================================ */
const CONFIG = {
 place:  "Texas A&M University San Antonio",
 center: { lat:29.30340, lon:-98.52470 },      // map centre / demo fallback
 // buildings: n=name, lat/lon=coordinates, cab=indoor waypoint, lot=parking
 buildings: [
 {n:"CAB",lat:29.303484613,lon:-98.524708886,cab:true},
 {n:"Hall",lat:29.302640986,lon:-98.524123109},
 {n:"Library",lat:29.302108546,lon:-98.523819692},
 {n:"MOD A/B/C",lat:29.302695193,lon:-98.526384024},
 {n:"REC",lat:29.303705648,lon:-98.528188918},
 {n:"STEM",lat:29.304443363,lon:-98.525446436},
 {n:"Madla",lat:29.304699039,lon:-98.524258599},
 {n:"Patriots Casa",lat:29.303669740,lon:-98.522919309},
 {n:"Auditorium",lat:29.303820402,lon:-98.525452304},
 {n:"Lot 1",lat:29.304616382,lon:-98.522841342,lot:true},
 {n:"Lot 2",lat:29.304053477,lon:-98.526481848,lot:true},
 {n:"Estrella Hall",lat:29.305255409,lon:-98.521178531},
 {n:"Lot 6",lat:29.302432340,lon:-98.523191172,lot:true},
 {n:"PHEB",lat:29.302683109,lon:-98.525228710},
]
};
/* ---------- from here on the ENGINE just reads the config ---------- */
const BUILDINGS = CONFIG.buildings
const DEFAULT_POS=CONFIG.center; // campus centre (demo fallback) // campus centroid (demo fallback) // campus center (fallback for demo)

/* ---------- view ---------- */
let view='compass';
function show(v){view=v;const el=document.querySelector('#v-'+v);if(el)el.classList.add('on');}

/* ---------- compass / sensors ---------- */
let heading=null, headingOk=false, userPos=null;
/* ===== ORIENTATION (iPhone) =====
   iOS gives one true-north value: webkitCompassHeading (0=N, clockwise).
   We use it directly + a light wrap-safe low-pass so the readout is steady. */
let _hs=null;
function onOrient(e){
 if(typeof e.webkitCompassHeading!=='number'||isNaN(e.webkitCompassHeading))return;
 const raw=norm(e.webkitCompassHeading);
 if(_hs===null)_hs=raw;
 else{const d=((raw-_hs+540)%360)-180;_hs=norm(_hs+d*0.3);}
 heading=_hs;headingOk=true;
 if(view==='compass')updateRadar();
}
async function enableSensors(){
 try{if(window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission){
   const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')toast('Compass permission denied');}
 }catch(e){}
 window.addEventListener('deviceorientation',onOrient,true);
 setTimeout(()=>{if(!headingOk){const dd=$('#aheadDist');if(dd)dd.textContent='↻ Move phone in a figure-8 to calibrate';toast('Compass needs calibration — move the phone in a figure-8');}},3800);
 if(navigator.geolocation){navigator.geolocation.watchPosition(
   p=>{userPos={lat:p.coords.latitude,lon:p.coords.longitude};updateRadar();},
   ()=>{if(!userPos){userPos=DEFAULT_POS;updateRadar();}},
   {enableHighAccuracy:true,maximumAge:2000,timeout:9000});}
 const _eb=$('#enableBtn');if(_eb){_eb.textContent='✓ Compass live';_eb.disabled=true;_eb.classList.add('on');}if($('#aheadDist')&&!headingOk)$('#aheadDist').textContent='Locating you…';
 setTimeout(()=>{if(!userPos){userPos=DEFAULT_POS;updateRadar();}},1200);
}
function geo(la1,lo1,la2,lo2){const R=6371000,r=Math.PI/180;
 const dLo=(lo2-lo1)*r;const y=Math.sin(dLo)*Math.cos(la2*r);
 const x=Math.cos(la1*r)*Math.sin(la2*r)-Math.sin(la1*r)*Math.cos(la2*r)*Math.cos(dLo);
 const brg=norm(Math.atan2(y,x)*180/Math.PI);
 const dLa=(la2-la1)*r;const a=Math.sin(dLa/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dLo/2)**2;
 const d=2*R*Math.asin(Math.sqrt(a));return{brg,ft:d*M2FT};}
function shortName(n){return n.replace('University Police','UPD').replace('Patriots Casa','Patriots').replace('Recreation Center','Rec Ctr').replace('Modular C/A/B','Modular').replace(' Building','').replace(' Hall','');}
let _lastAhead=null;
try{localStorage.removeItem('jc_calib');localStorage.removeItem('jc_markers');}catch(e){}
function updateRadar(){
 const pos=userPos||DEFAULT_POS, h=norm(heading||0);
 $('#needle').style.transform='translate(-50%,-100%) rotate(0deg)';
 const radar=$('#radar');
 [...radar.querySelectorAll('.chip')].forEach(c=>c.remove());
 const oldsvg=radar.querySelector('#ringSvg'); if(oldsvg) oldsvg.remove();
 const C=165, dotR=104;

 // exact relative bearing of every building (0 = straight ahead / up)
 const items=BUILDINGS.map(b=>{
  const g=geo(pos.lat,pos.lon,b.lat,b.lon);
  const srel=((g.brg-h+540)%360)-180;
  return {b,g,srel};
 });
 const ad=i=>Math.abs(i.srel);
 let best=items.reduce((m,i)=>ad(i)<ad(m)?i:m, items[0]);
 if(_lastAhead){const cur=items.find(i=>i.b.n===_lastAhead); if(cur&&ad(cur)-ad(best)<10) best=cur;}
 _lastAhead=best.b.n;

 // start on two rings (neighbours in direction alternate inner/outer) so nothing starts on top of each other
 const sorted=[...items].sort((a,b)=>a.srel-b.srel);
 sorted.forEach((it,k)=>{ it._r = (k%2===0)?122:152; });

 // create chips at their true bearing, remember true-bearing dot
 const nodes=[];
 items.forEach(it=>{
  const a=it.srel*Math.PI/180, hi=it.b.n===best.b.n;
  const chip=document.createElement('div');
  chip.className='chip'+(hi?' hi':'')+(it.b.lot?' lot':'');
  chip.innerHTML='<div class="n">'+shortName(it.b.n)+'</div>'+(hi?'<div class="d">'+Math.round(it.g.ft)+' ft</div>':'');
  chip.onclick=(e)=>{if(e)e.stopPropagation();toast('Head to '+it.b.n+' — '+Math.round(it.g.ft)+' ft');};
  radar.appendChild(chip);
  nodes.push({it,hi,chip,dx:C+dotR*Math.sin(a),dy:C-dotR*Math.cos(a),
              cx:C+it._r*Math.sin(a),cy:C-it._r*Math.cos(a),w:chip.offsetWidth,ht:chip.offsetHeight});
 });

 // de-overlap: nudge labels apart on the axis of least overlap; the one you point at stays put
 const pad=4;
 for(let pass=0;pass<26;pass++){
  let moved=false;
  for(let a=0;a<nodes.length;a++)for(let c=a+1;c<nodes.length;c++){
   const A=nodes[a],B=nodes[c];
   const dx=B.cx-A.cx, dy=B.cy-A.cy;
   const ox=(A.w+B.w)/2+pad-Math.abs(dx), oy=(A.ht+B.ht)/2+pad-Math.abs(dy);
   if(ox>0&&oy>0){
    if(ox<=oy){const p=ox/2,d=dx>=0?1:-1; if(A.hi){B.cx+=d*ox;}else if(B.hi){A.cx-=d*ox;}else{A.cx-=d*p;B.cx+=d*p;}}
    else{const p=oy/2,d=dy>=0?1:-1; if(A.hi){B.cy+=d*oy;}else if(B.hi){A.cy-=d*oy;}else{A.cy-=d*p;B.cy+=d*p;}}
    moved=true;
   }
  }
  if(!moved)break;
 }

 // clamp inside, apply, and draw dot (exact bearing) + leader to the final label spot
 let sv='<svg id="ringSvg" width="330" height="330" viewBox="0 0 330 330" style="position:absolute;left:0;top:0;pointer-events:none;z-index:1">';
 nodes.forEach(N=>{
  const hw=N.w/2+3, hh=N.ht/2+3;
  N.cx=Math.max(hw,Math.min(330-hw,N.cx)); N.cy=Math.max(hh,Math.min(330-hh,N.cy));
  N.chip.style.left=N.cx+'px'; N.chip.style.top=N.cy+'px'; N.chip.style.transform='translate(-50%,-50%)';
  if(N.hi)N.chip.style.zIndex=6;
  const lot=N.it.b.lot;
  sv+='<line x1="'+N.dx.toFixed(1)+'" y1="'+N.dy.toFixed(1)+'" x2="'+N.cx.toFixed(1)+'" y2="'+N.cy.toFixed(1)+'" stroke="'+(N.hi?'#FFCD00':'#C9A94A')+'" stroke-width="'+(N.hi?1.5:1)+'" opacity="'+(N.hi?.85:.4)+'"/>';
  const r=N.hi?5:3.2;
  sv+='<circle cx="'+N.dx.toFixed(1)+'" cy="'+N.dy.toFixed(1)+'" r="'+r+'" fill="'+(lot?'#4E0A20':'#FFCD00')+'" stroke="'+(lot?'#C9A94A':(N.hi?'#fff':'#7a5a12'))+'" stroke-width="'+(lot?1.6:(N.hi?2:0))+'"/>';
 });
 sv+='</svg>';
 radar.insertAdjacentHTML('afterbegin', sv);

 if(best){
  $('#aheadName').textContent=best.b.n;
  $('#aheadDist').textContent=headingOk?(Math.round(best.g.ft)+' ft · '+compassWord(norm(best.g.brg))):'Tap the compass to activate';
 }
}
function compassWord(b){return['N','NE','E','SE','S','SW','W','NW'][Math.round(b/45)%8];}

/* ---------- toast ---------- */
let tT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('on'),2200);}

/* ---------- boot ---------- */
function boot(){ show('compass'); }
boot();
