(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const canvas = $('#scene'), ctx = canvas.getContext('2d');
  const screens = ['home','race-setup','garage','servers','settings','race'];
  const colors = [
    {name:'Chalk',paint:'#e5e5d8',accent:'#d83e32'}, {name:'Racing red',paint:'#d83e32',accent:'#f1e8d2'},
    {name:'Cobalt',paint:'#4168b4',accent:'#eee9d9'}, {name:'Lime',paint:'#a7c655',accent:'#172119'},
    {name:'Midnight',paint:'#303c39',accent:'#e0bd55'}, {name:'Sunset',paint:'#e68a3a',accent:'#23312c'},
    {name:'Violet',paint:'#8360a7',accent:'#f0e2bc'}, {name:'Ice blue',paint:'#7ebac1',accent:'#1e2926'}
  ];
  const generations = [
    {name:'Next Gen',era:'2022+',shape:1}, {name:'Gen 6',era:'2013–2021',shape:.96},
    {name:'Gen 5',era:'2007–2012',shape:.9}, {name:'Gen 4',era:'1981–2006',shape:.86}
  ];
  const defaultSettings = {quality:'high',shake:true,sensitivity:78,paint:0,model:'Next Gen',number:24,decal:'stripe',random:true};
  let prefs = {...defaultSettings,...safeParse(localStorage.getItem('stock-legends-settings'),{})};
  let currentScreen='home', currentFilter='all', hostCount=0, toastTimer;
  function safeParse(s,fallback){try{return s?JSON.parse(s):fallback}catch{return fallback}}
  function savePrefs(){localStorage.setItem('stock-legends-settings',JSON.stringify(prefs))}
  function showToast(message){const el=$('#app-toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2300)}
  function showScreen(name){
    if(!screens.includes(name))return;
    currentScreen=name;
    screens.forEach(n=>$('#screen-'+n).classList.toggle('active',n===name));
    canvas.classList.toggle('racing',name==='race');
    $('#app').classList.toggle('in-race',name==='race');
    if(name==='race') resizeCanvas();
  }
  $$('[data-screen]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.screen)));
  function applyCarStyle(el){if(!el)return;el.style.setProperty('--paint',colors[prefs.paint].paint);el.style.setProperty('--accent',colors[prefs.paint].accent);el.style.setProperty('--shape',generations.find(g=>g.name===prefs.model)?.shape||1);}
  function updateCarPreviews(){
    applyCarStyle($('#setup-car'));applyCarStyle($('#garage-car'));
    $('#garage-model-label').textContent=prefs.model.toUpperCase();
    $('#car-number').value=prefs.number;
    $$('.gen-option').forEach(b=>b.classList.toggle('active',b.dataset.model===prefs.model));
    $$('.swatch').forEach(b=>b.classList.toggle('active',Number(b.dataset.color)===prefs.paint));
    $$('.decal-chip').forEach(b=>b.classList.toggle('active',b.dataset.decal===prefs.decal));
    $('#setup-model').value=prefs.model;
  }
  function buildGarage(){
    $('#generation-list').innerHTML=generations.map(g=>`<button class="gen-option" data-model="${g.name}">${g.name.toUpperCase()}<span>${g.era} / STOCK CAR</span></button>`).join('');
    $('#swatches').innerHTML=colors.map((c,i)=>`<button class="swatch" data-color="${i}" title="${c.name}" style="background:${c.paint}"></button>`).join('');
    $('#generation-list').addEventListener('click',e=>{const b=e.target.closest('[data-model]');if(!b)return;prefs.model=b.dataset.model;savePrefs();updateCarPreviews()});
    $('#swatches').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;prefs.paint=Number(b.dataset.color);savePrefs();updateCarPreviews()});
    $$('.decal-chip').forEach(b=>b.addEventListener('click',()=>{prefs.decal=b.dataset.decal;savePrefs();updateCarPreviews()}));
    $('#car-number').addEventListener('input',e=>{prefs.number=Math.max(0,Math.min(99,Number(e.target.value)||0));savePrefs()});
    updateCarPreviews();
  }
  $('#setup-model').value=prefs.model;
  $('#setup-model').addEventListener('change',e=>{prefs.model=e.target.value;savePrefs();updateCarPreviews()});
  $('#ai-count').addEventListener('input',e=>$('#ai-count-value').textContent=`${e.target.value} CARS`);
  $('#random-toggle').classList.toggle('on',prefs.random);
  $('#random-toggle').addEventListener('click',()=>{prefs.random=!prefs.random;$('#random-toggle').classList.toggle('on',prefs.random);savePrefs()});
  buildGarage();

  const servers = [
    {name:'Friday Night Lights',track:'Daytona International',model:'Next Gen',drivers:11,spectators:42,ping:28,flag:'D'},
    {name:'Gen 6 Throwback',track:'Talladega Superspeedway',model:'Gen 6',drivers:8,spectators:19,ping:46,flag:'6'},
    {name:'The Old School Oval',track:'Sunset Short Track',model:'Gen 4',drivers:14,spectators:66,ping:35,flag:'4'},
    {name:'Cup Series — Open',track:'Daytona International',model:'Gen 5',drivers:6,spectators:12,ping:62,flag:'5'},
    {name:'Last Lap Legends',track:'Talladega Superspeedway',model:'Next Gen',drivers:3,spectators:7,ping:24,flag:'L'}
  ];
  function renderServers(){
    const list=$('#server-list'), shown=servers.filter(s=>currentFilter==='all'||s.model===currentFilter);
    list.innerHTML=shown.length?shown.map((s,i)=>`<div class="server-row"><div class="server-name"><span class="server-flag">${s.flag}</span><div><b>${s.name}</b><small>${s.track}</small></div></div><div class="server-cell">${s.model}<small>GENERATION</small></div><div class="server-cell ${s.drivers>=15?'full':''}">${s.drivers}/15<small>DRIVERS</small></div><div class="server-cell">${s.spectators}/100<small>SPECTATORS</small></div><button class="join-button" data-join="${servers.indexOf(s)}">${s.drivers>=15?'FULL':'JOIN ROOM'}</button></div>`).join(''):'<div class="server-empty">No rooms in this generation. Host a new room to start one.</div>';
  }
  $$('.filter-pill').forEach(b=>b.addEventListener('click',()=>{$$('.filter-pill').forEach(x=>x.classList.toggle('active',x===b));currentFilter=b.dataset.filter;renderServers()}));
  $('#server-list').addEventListener('click',e=>{const b=e.target.closest('[data-join]');if(!b)return;const s=servers[Number(b.dataset.join)];if(s.drivers>=15){showToast('This room is full — choose another grid.');return}selectedTrack=s.track;$('#setup-track').value=s.track;$('#setup-model').value=s.model;prefs.model=s.model;savePrefs();showScreen('race-setup');showToast(`Joining ${s.name} · local room preview`)});
  $('#host-server').addEventListener('click',()=>{hostCount++;const model=prefs.model;servers.unshift({name:`${model} Open Practice ${String(hostCount).padStart(2,'0')}`,track:'Daytona International',model,drivers:1,spectators:0,ping:0,flag:'★'});currentFilter='all';$$('.filter-pill').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));renderServers();showToast('Room hosted locally · invite friends in the full online build.')});
  renderServers();

  $('#quality-select').value=prefs.quality;$('#quality-select').addEventListener('change',e=>{prefs.quality=e.target.value;savePrefs()});
  $('#shake-toggle').classList.toggle('on',prefs.shake);$('#shake-toggle').addEventListener('click',()=>{prefs.shake=!prefs.shake;$('#shake-toggle').classList.toggle('on',prefs.shake);savePrefs()});
  $('#sensitivity').value=prefs.sensitivity;$('#sensitivity-value').textContent=`${prefs.sensitivity}%`;
  $('#sensitivity').addEventListener('input',e=>{prefs.sensitivity=Number(e.target.value);$('#sensitivity-value').textContent=`${prefs.sensitivity}%`;savePrefs()});
  $('#reset-settings').addEventListener('click',()=>{prefs={...defaultSettings};savePrefs();$('#quality-select').value=prefs.quality;$('#sensitivity').value=prefs.sensitivity;$('#sensitivity-value').textContent=`${prefs.sensitivity}%`;$('#shake-toggle').classList.toggle('on',prefs.shake);updateCarPreviews();showToast('Preferences reset.')});

  // Track geometry is sampled by distance, keeping the driving line smooth around the oval.
  const trackProfiles={
    'Daytona International':{rx:210,rz:100,bank:.11,asphalt:'#555b55',grass:'#698254'},
    'Talladega Superspeedway':{rx:235,rz:108,bank:.12,asphalt:'#555b55',grass:'#778d59'},
    'Sunset Short Track':{rx:150,rz:78,bank:.04,asphalt:'#4d544e',grass:'#5d784e'}
  };
  const SEGMENTS=1100;
  function buildPath(track){
    const p=trackProfiles[track]||trackProfiles['Daytona International'], points=[], lengths=[0];let prev=null,len=0;
    for(let i=0;i<=SEGMENTS;i++){const a=i/SEGMENTS*Math.PI*2;const pt={x:p.rx*Math.cos(a),z:p.rz*Math.sin(a)};points.push(pt);if(prev)len+=Math.hypot(pt.x-prev.x,pt.z-prev.z);lengths[i]=len;prev=pt}
    return {p,points,lengths,length:len};
  }
  let path=buildPath('Daytona International'),selectedTrack='Daytona International';
  function sampleAt(s){
    const d=((s%path.length)+path.length)%path.length, arr=path.lengths;let lo=0,hi=SEGMENTS;
    while(lo<hi){const mid=(lo+hi)>>1;if(arr[mid]<d)lo=mid+1;else hi=mid}
    const i=Math.max(1,lo),t=(d-arr[i-1])/Math.max(.0001,arr[i]-arr[i-1]),a=path.points[i-1],b=path.points[i];
    const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,dx=b.x-a.x,dz=b.z-a.z,ll=Math.hypot(dx,dz)||1;
    return {x,z,fx:dx/ll,fz:dz/ll,rx:dz/ll,rz:-dx/ll};
  }
  function worldAt(s,lane=0){const c=sampleAt(s);return{x:c.x+c.rx*lane,z:c.z+c.rz*lane,...c}}

  const race={active:false,paused:false,done:false,player:null,cars:[],laps:3,elapsed:0,toastUntil:0,shake:0,lastTime:0,camShakeX:0,camShakeY:0};
  const rivalPaints=['#e7e5d7','#d34835','#4c70bd','#a9c860','#e4a247','#a76380','#68a9a7','#e8d16a','#8192b6','#dc7147','#d9ddda','#658353','#9672ac','#d2a7a0'];
  const rivalNames=['M. Turner','J. Brooks','A. Reyes','T. Wallace','K. Price','D. Foster','R. Cole','S. Miller','E. Hayes','B. King','L. Carter','C. Ward','P. Dixon','N. James'];
  function makeCar(i,progress,player=false){
    const palette=player?colors[prefs.paint].paint:rivalPaints[(i+(prefs.random?Math.floor(Math.random()*14):0))%rivalPaints.length];
    const model=player?prefs.model:generations[Math.floor(Math.random()*generations.length)].name;
    return {id:i,player,progress,lane:player?0:((i%3)-1)*1.5,targetLane:player?0:((i%3)-1)*1.3,speed:player?0:52+Math.random()*11,paint:palette,accent:player?colors[prefs.paint].accent:(i%2?'#f0e9d7':'#202b25'),number:player?prefs.number:(11+i*7)%99,name:player?'YOU':rivalNames[i%rivalNames.length],model,damage:0,damageNodes:[0,0,0,0,0,0,0,0],lap:0,finished:false,finishTime:0,aiOffset:Math.random()*10,flash:0};
  }
  function startRace(){
    const track=$('#setup-track').value;selectedTrack=track;path=buildPath(track);const count=Number($('#ai-count').value||15),total=count;
    race.active=true;race.cars=[];race.elapsed=0;race.done=false;race.paused=false;race.toastUntil=performance.now()+1800;race.shake=0;
    race.player=makeCar(-1,4,true);race.player.speed=0;race.cars.push(race.player);
    // Pack the field close enough to race, but offset adjacent rows so cars have room to launch.
    for(let i=1;i<total;i++){const row=Math.ceil(i/3),col=(i-1)%3-1;const car=makeCar(i,4-row*8,col*1.9,false);car.lane=col*2.35;car.targetLane=car.lane;race.cars.push(car)}
    $('#race-track-label').textContent=track.toUpperCase();$('#lap-display').textContent=`01 / 0${race.laps}`;$('#race-state').textContent='PACE YOURSELF';$('#pause-overlay').classList.remove('open');$('#results-overlay').classList.remove('open');showScreen('race');
    input.left=input.right=input.gas=input.brake=input.handbrake=false;race.lastTime=performance.now();
  }
  $('#start-race').addEventListener('click',startRace);
  $('#race-again').addEventListener('click',()=>{showScreen('race-setup');startRace()});
  $('#pause-button').addEventListener('click',togglePause);$('#resume-race').addEventListener('click',togglePause);
  $('#quit-race').addEventListener('click',()=>{race.active=false;$('#pause-overlay').classList.remove('open');showScreen('home')});
  $('#results-home').addEventListener('click',()=>{race.active=false;$('#results-overlay').classList.remove('open');showScreen('home')});
  function togglePause(){if(!race.active||race.done)return;race.paused=!race.paused;$('#pause-overlay').classList.toggle('open',race.paused);if(!race.paused)race.lastTime=performance.now()}

  const input={left:false,right:false,gas:false,brake:false,handbrake:false,steer:0};
  const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',Space:'handbrake'};
  window.addEventListener('keydown',e=>{
    const k=keyMap[e.code];if(k){e.preventDefault();input[k]=true}
    if(e.code==='Escape'){e.preventDefault();if(currentScreen==='race')togglePause()}
    if(e.code==='KeyR'&&currentScreen==='race'&&race.active){race.player.damage=0;race.player.damageNodes.fill(0);race.player.lane=0;race.player.speed=Math.max(0,race.player.speed*.55);showToast('Car reset to the racing line.')}
  });
  window.addEventListener('keyup',e=>{const k=keyMap[e.code];if(k)input[k]=false});
  window.addEventListener('blur',()=>Object.keys(input).forEach(k=>{if(typeof input[k]==='boolean')input[k]=false}));
  $$('.race-controls button').forEach(b=>{
    const key=b.dataset.control;
    const set=(on,e)=>{if(e){e.preventDefault();if(e.pointerId!=null&&b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId)}input[key]=on};
    b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);set(true,e)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,e=>set(false,e)));
  });
  const steerSlider=$('#touch-steering');
  steerSlider.addEventListener('input',()=>input.steer=Number(steerSlider.value)/100);
  steerSlider.addEventListener('change',()=>{steerSlider.value=0;input.steer=0});

  function resizeCanvas(){const dpr=Math.min(window.devicePixelRatio||1,prefs.quality==='high'?1.7:1.15);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  window.addEventListener('resize',resizeCanvas);resizeCanvas();
  const W=()=>innerWidth,H=()=>innerHeight;
  function drawBackground(w,h,menu=false){
    const sky=ctx.createLinearGradient(0,0,0,h*.58);sky.addColorStop(0,menu?'#18261e':'#8cb4c4');sky.addColorStop(.7,menu?'#53644b':'#c3d3c5');sky.addColorStop(1,menu?'#7b8459':'#d7c89b');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    if(menu){const g=ctx.createRadialGradient(w*.73,h*.54,10,w*.73,h*.54,w*.55);g.addColorStop(0,'#67774a');g.addColorStop(1,'#293c2c');ctx.fillStyle=g;ctx.fillRect(0,h*.43,w,h*.57)}
    else{ctx.fillStyle=path.p.grass;ctx.fillRect(0,h*.38,w,h*.62)}
    const horizon=h*.37;
    // Distant tree line and low-poly grandstand silhouette
    ctx.fillStyle=menu?'#263b2b':'#687b61';
    for(let i=0;i<50;i++){let x=i*w/48,hh=8+((i*37)%26);ctx.beginPath();ctx.moveTo(x-15,horizon+6);ctx.lineTo(x,horizon-hh);ctx.lineTo(x+18,horizon+6);ctx.fill()}
    ctx.fillStyle=menu?'#35463a':'#647074';ctx.fillRect(0,horizon+6,w,Math.max(14,h*.035));
    for(let i=0;i<Math.ceil(w/40);i++){ctx.fillStyle=i%2?'#d8d1b3':'#a84037';ctx.fillRect(i*40,horizon+7,20,3)}
    if(menu){ctx.fillStyle='#101711';ctx.fillRect(0,horizon+25,w,5);ctx.fillStyle='#8c9a7b';ctx.fillRect(0,horizon+30,w,2)}
  }
  function project(wx,wz,camera,w,h){
    const dx=wx-camera.x,dz=wz-camera.z,side=dx*camera.rx+dz*camera.rz,depth=dx*camera.fx+dz*camera.fz;
    if(depth<2)return null;const focal=h*.88,scale=focal/depth;
    return {x:w*.5+side*scale,y:h*.37+camera.height*scale,scale,depth};
  }
  function poly(points,fill,stroke=null,line=1){if(points.some(p=>!p))return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}}
  function drawRoad(w,h,cam){
    const maxAhead=280,step=prefs.quality==='low'?7:4,segments=[];
    for(let d=-4;d<maxAhead;d+=step){const a=worldAt(race.player.progress+d,-6.8),b=worldAt(race.player.progress+d,6.8);segments.push({d,l:project(a.x,a.z,cam,w,h),r:project(b.x,b.z,cam,w,h),c:worldAt(race.player.progress+d)})}
    for(let i=segments.length-2;i>=0;i--){const a=segments[i],b=segments[i+1];if(!a.l||!a.r||!b.l||!b.r)continue;
      const far=project(a.c.x,a.c.z,cam,w,h),near=project(b.c.x,b.c.z,cam,w,h);if(!far||!near)continue;
      const grassL1=project(a.c.x+a.c.rx*34,a.c.z+a.c.rz*34,cam,w,h),grassL2=project(b.c.x+b.c.rx*34,b.c.z+b.c.rz*34,cam,w,h);
      const grassR1=project(a.c.x-a.c.rx*34,a.c.z-a.c.rz*34,cam,w,h),grassR2=project(b.c.x-b.c.rx*34,b.c.z-b.c.rz*34,cam,w,h);
      poly([a.l,grassL1,grassL2,b.l],path.p.grass);poly([a.r,grassR1,grassR2,b.r],path.p.grass);
      poly([a.l,a.r,b.r,b.l],Math.floor(Math.abs(a.d)/12)%2?'#535953':'#60645e','#343a36',.8);
      // Red-and-cream curb strips along both track edges
      const curbW=.9;const al=worldAt(race.player.progress+a.d,-6.8),bl=worldAt(race.player.progress+b.d,-6.8),ar=worldAt(race.player.progress+a.d,6.8),br=worldAt(race.player.progress+b.d,6.8);
      const al2=worldAt(race.player.progress+a.d,-6.8-curbW),bl2=worldAt(race.player.progress+b.d,-6.8-curbW),ar2=worldAt(race.player.progress+a.d,6.8+curbW),br2=worldAt(race.player.progress+b.d,6.8+curbW);
      const stepColor=Math.floor((race.player.progress+a.d)/3)%2?'#e7e4d7':'#cf3c33';
      poly([project(al.x,al.z,cam,w,h),project(al2.x,al2.z,cam,w,h),project(bl2.x,bl2.z,cam,w,h),project(bl.x,bl.z,cam,w,h)],stepColor);
      poly([project(ar.x,ar.z,cam,w,h),project(ar2.x,ar2.z,cam,w,h),project(br2.x,br2.z,cam,w,h),project(br.x,br.z,cam,w,h)],stepColor);
      if(Math.floor(Math.abs(a.d)/16)%2===0){const m1=worldAt(race.player.progress+a.d,0),m2=worldAt(race.player.progress+b.d,0);const ml=project(m1.x,m1.z,cam,w,h),mr=project(m2.x,m2.z,cam,w,h);if(ml&&mr)poly([{x:ml.x-ml.scale*.08,y:ml.y},{x:ml.x+ml.scale*.08,y:ml.y},{x:mr.x+mr.scale*.08,y:mr.y},{x:mr.x-mr.scale*.08,y:mr.y},],'#d2d1bd')}
    }
    // Low concrete walls, fencing posts and trackside boards on the approach.
    for(let d=35;d<maxAhead;d+=24){const c=worldAt(race.player.progress+d,12.5);const p=project(c.x,c.z,cam,w,h);if(!p)continue;
      const height=Math.max(3,Math.min(48,p.scale*2.4));ctx.fillStyle='#d5d0ba';ctx.fillRect(p.x-height*.28,p.y-height,height*.56,height*.24);
      ctx.fillStyle='#4b5550';ctx.fillRect(p.x-height*.23,p.y-height*1.7,Math.max(1,p.scale*.12),height*.8);
      if(d%72<25){ctx.fillStyle='#ece8d6';ctx.fillRect(p.x-height*1.5,p.y-height*2.05,height*3,height*.65);ctx.fillStyle='#d43b32';ctx.font=`bold ${Math.max(4,height*.35)}px Arial`;ctx.textAlign='center';ctx.fillText('STOCK LEGENDS',p.x,p.y-height*1.58)}
    }
  }

  function drawCar(car,point,player=false){
    if(!point)return;const s=Math.max(.15,Math.min(1.55,point.scale*.68)),w=58*s,h=28*s,x=point.x,y=point.y;
    if(y>H()+100||y<-100||x<-150||x>W()+150)return;
    ctx.save();ctx.translate(x,y);const turn=player?input.steer*-.12:Math.sin(car.aiOffset+race.elapsed*.4)*.025;ctx.rotate(turn);
    // Contact dents pull individual body nodes inward and leave beam-like crease lines.
    const n=car.damageNodes,frontDent=Math.min(13,n[0]*12),rearDent=Math.min(12,n[1]*11),leftDent=Math.min(10,n[2]*9),rightDent=Math.min(10,n[3]*9);
    ctx.globalAlpha=Math.max(.55,1-(car.damage||0)*.002);
    ctx.fillStyle='#101411';ctx.beginPath();ctx.ellipse(0,h*.48,w*.6,h*.13,0,0,Math.PI*2);ctx.fill();
    const shell=[[-w*.53+rearDent,-h*.13],[-w*.44,-h*.45],[-w*.18,-h*.5],[w*.02,-h*.78+frontDent*.3],[w*.35,-h*.73],[w*.5,-h*.38],[w*.57-frontDent*.18,h*.03],[w*.45+frontDent,h*.32],[-w*.43+rearDent,h*.3]];
    poly(shell,car.paint,'#101612',Math.max(1.2,2.1*s));
    // Roof glass and the sloped hood make the distinct stock-car silhouette.
    poly([[-w*.2,-h*.46],[w*.02,-h*.72],[w*.32,-h*.67],[w*.38,-h*.42],[-w*.16,-h*.42]],'#263b38','#111814',Math.max(1,s));
    ctx.strokeStyle='#a4b8aa';ctx.lineWidth=Math.max(.7,1.3*s);ctx.beginPath();ctx.moveTo(w*.06,-h*.69);ctx.lineTo(w*.1,-h*.44);ctx.moveTo(w*.32,-h*.65);ctx.lineTo(w*.35,-h*.42);ctx.stroke();
    if(prefs.decal!=='clean'||!player){ctx.fillStyle=car.accent;ctx.beginPath();ctx.moveTo(-w*.5,h*.1);ctx.lineTo(w*.54,h*.05);ctx.lineTo(w*.48,h*.24);ctx.lineTo(-w*.43,h*.22);ctx.fill()}
    if(prefs.decal==='stripe'&&player){ctx.fillStyle=car.accent;ctx.beginPath();ctx.moveTo(-w*.05,-h*.72);ctx.lineTo(w*.02,-h*.72);ctx.lineTo(w*.36,h*.26);ctx.lineTo(w*.25,h*.26);ctx.fill()}
    ctx.fillStyle=player?'#fff5db':'#f3edda';ctx.font=`900 ${Math.max(6,14*s)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(car.number),-w*.02,-h*.04);
    if(prefs.decal==='sponsor'&&player){ctx.font=`900 ${Math.max(4,5*s)}px Arial`;ctx.fillText('SL RACING',w*.15,h*.17)}
    for(const wx of [-1,1])for(const wy of [-1,1]){ctx.fillStyle='#101311';const xx=wx*w*.42,yy=wy*h*.17;ctx.fillRect(xx-w*.08,yy-h*.12,w*.17,h*.24);ctx.fillStyle='#798078';ctx.fillRect(xx-w*.035,yy-h*.055,w*.07,h*.11)}
    // Rear spoiler is a separate beam, visibly bent by hard rear contact.
    ctx.strokeStyle='#171d19';ctx.lineWidth=Math.max(1,2*s);ctx.beginPath();ctx.moveTo(-w*.4,-h*.38);ctx.lineTo(-w*.49,-h*.8+rearDent);ctx.lineTo(w*.37,-h*.8+rearDent);ctx.lineTo(w*.34,-h*.45);ctx.stroke();
    if(car.damage>0){ctx.strokeStyle='#21241f';ctx.lineWidth=Math.max(1,1.5*s);ctx.beginPath();ctx.moveTo(-w*.46+rearDent,-h*.12);ctx.lineTo(-w*.2,-h*.03);ctx.lineTo(w*.02,h*.1-frontDent);ctx.lineTo(w*.35,h*.03);ctx.stroke()}
    if(player){ctx.strokeStyle='#fff9d8';ctx.lineWidth=Math.max(1,2*s);ctx.strokeRect(-w*.57,-h*.86,w*1.14,h*1.31)}
    ctx.restore();
  }
  function updateGame(dt){
    if(!race.active||race.paused||race.done)return;
    race.elapsed+=dt;const c=race.player;const steer=Math.max(-1,Math.min(1,(input.right?1:0)-(input.left?1:0)+input.steer));
    const targetSpeed=input.gas?90:input.brake?8:input.handbrake?16:56;
    c.speed+=(targetSpeed-c.speed)*Math.min(1,dt*(input.gas?1.2:1.75));
    const steeringScale=.7+(c.speed/90)*.55;c.lane+=steer*dt*(3.3+Math.min(1,c.speed/70))*steeringScale*(prefs.sensitivity/78);
    c.lane+=(0-c.lane)*dt*.12;
    if(Math.abs(c.lane)>7.1){c.speed=Math.max(19,c.speed-dt*18);c.damage=Math.min(72,c.damage+dt*.7);if(c.lane>8)c.lane=8;if(c.lane< -8)c.lane=-8}
    const oldLap=Math.floor(c.progress/path.length);c.progress+=c.speed*dt;
    if(Math.floor(c.progress/path.length)>oldLap){c.lap++;$('#lap-display').textContent=`${String(Math.min(race.laps,c.lap+1)).padStart(2,'0')} / 0${race.laps}`;if(c.lap===race.laps){c.finished=true;c.finishTime=race.elapsed;finishRace()}}
    for(const rival of race.cars){if(rival.player||rival.finished)continue;
      const old=Math.floor(rival.progress/path.length);const gap=rival.progress-c.progress;
      const draft=gap>3&&gap<22?.8:0;rival.speed+=(57+rival.aiOffset%7+draft-rival.speed)*dt*.18;
      const desired=Math.sin(race.elapsed*.32+rival.aiOffset)*1.8;rival.lane+=(desired-rival.lane)*dt*.2;
      rival.progress+=rival.speed*dt;if(Math.floor(rival.progress/path.length)>old){rival.lap++;if(rival.lap>=race.laps){rival.finished=true;rival.finishTime=race.elapsed}}
    }
    // Node/beam damage: impacts transfer into body nodes, reduce speed, and deform visible panels.
    for(const rival of race.cars){if(rival.player)continue;let delta=rival.progress-c.progress;delta-=Math.round(delta/path.length)*path.length;const side=Math.abs(rival.lane-c.lane);
      if(Math.abs(delta)<3.1&&side<2.1&&c.speed>18){const impact=Math.min(1.7,(3.1-Math.abs(delta))*.7+(2.1-side)*.3)*dt*7;
        c.damage=Math.min(94,c.damage+impact*1.4);rival.damage=Math.min(80,rival.damage+impact*.65);c.speed=Math.max(17,c.speed-7*impact);rival.speed=Math.max(26,rival.speed-4*impact);
        const node=Math.abs(delta)<1.35?(delta>0?0:1):(c.lane>rival.lane?2:3);c.damageNodes[node]=Math.min(1,c.damageNodes[node]+impact*.8);
        if(performance.now()>race.toastUntil){race.toastUntil=performance.now()+900;showRaceToast('CONTACT!')}
        race.shake=Math.min(8,race.shake+impact*5);
      }
    }
    if(c.damage>55)c.speed=Math.min(c.speed,78-(c.damage-55)*.32);
    race.shake*=Math.max(0,1-dt*5);
    const order=[...race.cars].sort((a,b)=>b.progress-a.progress);const pos=order.indexOf(c)+1;
    $('#position-display').innerHTML=`P ${String(pos).padStart(2,'0')} <span>/ ${String(race.cars.length).padStart(2,'0')}</span>`;
    $('#race-state').textContent=c.lap===0?'GREEN FLAG':c.lap>=race.laps?'CHECKERED FLAG':'RACING';
    const mph=Math.max(0,Math.round(c.speed*2.15));$('#speed-value').textContent=String(mph).padStart(3,'0');$('#speed-bar').style.width=`${Math.min(100,mph/190*100)}%`;$('#gear-value').textContent=mph<45?'1':mph<90?'2':mph<135?'3':'4';
    $('#damage-value').textContent=`${Math.max(0,100-Math.round(c.damage))}%`;$('#damage-bar').style.width=`${Math.max(0,100-c.damage)}%`;$('#damage-bar').style.background=c.damage>55?'#d6493a':c.damage>25?'#d6a53c':'#9fc875';
    updateStandings(order);
  }
  function updateStandings(order){const visible=order.slice(0,5);if(!visible.some(x=>x.player)&&order.indexOf(race.player)<order.length)visible[4]=race.player;
    $('#standings').innerHTML='<div class="standing-head"><span>POS / DRIVER</span><span>CAR</span></div>'+visible.map(car=>`<div class="standing-row ${car.player?'player':''}"><b>${String(order.indexOf(car)+1).padStart(2,'0')}</b><span class="standing-name">${car.name}</span><span class="standing-no">${car.number}</span></div>`).join('');
  }
  function showRaceToast(text){const el=$('#race-toast');el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show')}
  function finishRace(){race.done=true;$('#results-overlay').classList.add('open');const order=[...race.cars].sort((a,b)=>b.progress-a.progress);const pos=order.indexOf(race.player)+1;$('#results-title').innerHTML=pos===1?'YOU <em>WIN!</em>':'RACE <em>COMPLETE</em>';$('#results-copy').textContent=pos===1?'A clean run and a perfect finish. You own this oval.':`You brought it home in P${String(pos).padStart(2,'0')}. There’s always another race.`;$('#result-position').textContent=String(pos).padStart(2,'0');$('#result-laps').textContent=String(race.laps).padStart(2,'0');$('#result-damage').textContent=`${Math.round(race.player.damage)}%`;}

  function renderRace(w,h){
    drawBackground(w,h,false);if(!race.player)return;
    const p=sampleAt(race.player.progress),back=sampleAt(race.player.progress-7),cam={x:back.x,z:back.z,fx:p.fx,fz:p.fz,rx:p.rx,rz:p.rz,height:4.7};
    ctx.save();if(race.shake&&prefs.shake)ctx.translate((Math.random()-.5)*race.shake,(Math.random()-.5)*race.shake);
    drawRoad(w,h,cam);
    const others=race.cars.filter(c=>!c.player).map(car=>{let gap=car.progress-race.player.progress;gap-=Math.round(gap/path.length)*path.length;return{car,gap}}).filter(x=>x.gap>-24&&x.gap<180).sort((a,b)=>b.gap-a.gap);
    for(const {car,gap} of others){const pos=worldAt(car.progress,car.lane),point=project(pos.x,pos.z,cam,w,h);if(point){point.scale*=Math.max(.4,1-Math.max(0,gap)*.001);drawCar(car,point)}}
    const own=worldAt(race.player.progress,race.player.lane),playerPoint=project(own.x,own.z,cam,w,h);if(playerPoint){playerPoint.x=w*.5+race.player.lane*5.5;playerPoint.y=h*.73;playerPoint.scale=Math.min(1.4,h/590);drawCar(race.player,playerPoint,true)}
    ctx.restore();
    const now=performance.now();if(now<race.toastUntil&&race.elapsed<2){ctx.save();ctx.textAlign='center';ctx.fillStyle='#fff2ca';ctx.font=`900 ${Math.min(56,w*.09)}px "Barlow Condensed",Impact,sans-serif`;ctx.shadowColor='#182016';ctx.shadowBlur=15;ctx.fillText('GREEN FLAG',w/2,h*.2);ctx.restore()}
  }
  function renderMenu(w,h){
    drawBackground(w,h,true);
    // Subtle receding oval contour under the hero layout.
    ctx.save();ctx.strokeStyle='#c2ca9b18';ctx.lineWidth=1;for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(w*.72,h*.63,Math.max(80,w*.48-i*20),Math.max(35,h*.22-i*10),-.13,0,Math.PI*2);ctx.stroke()}ctx.restore();
  }
  function loop(now){const dt=Math.min(.05,Math.max(0,(now-race.lastTime)/1000||0));race.lastTime=now;updateGame(dt);const w=W(),h=H();if(currentScreen==='race')renderRace(w,h);else renderMenu(w,h);requestAnimationFrame(loop)}
  race.lastTime=performance.now();requestAnimationFrame(loop);
  // Avoid mobile page gestures while using the custom touch controls.
  document.addEventListener('touchmove',e=>{if(e.target.closest('.race-controls,.touch-steer'))e.preventDefault()},{passive:false});
})();
