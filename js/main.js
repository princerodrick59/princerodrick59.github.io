const pageCache = {};

function show(id, btn) {
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const main = document.getElementById('main');

  if (pageCache[id]) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    pageCache[id].classList.add('active');
    main.scrollTop = 0;
    if (id === 'home') setTimeout(initR, 50);
    return;
  }

  fetch('pages/' + id + '.html')
    .then(r => r.text())
    .then(html => {
      main.insertAdjacentHTML('beforeend', html);
      const page = document.getElementById('page-' + id);
      pageCache[id] = page;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      page.classList.add('active');
      main.scrollTop = 0;
      if (id === 'home') setTimeout(initR, 50);
    });
}

let ren=null,scene,cam,rg,car,ee;
let rotating=false,panning=false,pm={x:0,y:0},autoSpin=true;
let touches={};
let target=new THREE.Vector3(0,0.5,0);
const FLOOR_Y=-0.42;
function initR(){
  const wrap=document.getElementById('cwrap'),cv=document.getElementById('rwc');
  if(ren){ren.setSize(wrap.clientWidth,wrap.clientHeight);return;}
  const W=wrap.clientWidth,H=wrap.clientHeight;
  ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  ren.setPixelRatio(Math.min(devicePixelRatio,2));ren.setSize(W,H);
  ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.0;
  scene=new THREE.Scene();
  cam=new THREE.PerspectiveCamera(45,W/H,0.1,100);
  cam.position.set(0,1.2,2.8);cam.lookAt(target);
  scene.add(new THREE.AmbientLight(0xffffff,0.8));
  const kl=new THREE.DirectionalLight(0xffffff,1.5);kl.position.set(3,6,5);scene.add(kl);
  const fl=new THREE.DirectionalLight(0xffffff,0.8);fl.position.set(-4,3,-2);scene.add(fl);
  const rl=new THREE.DirectionalLight(0xffffff,0.5);rl.position.set(0,2,-5);scene.add(rl);
  rg=new THREE.Group();scene.add(rg);
  const dracoLoader=new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
  const gltfLoader=new THREE.GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  gltfLoader.load('assets/models/robot.glb',function(gltf){
    scene.remove(rg);
    rg=gltf.scene;
    const box=new THREE.Box3().setFromObject(rg);
    const size=box.getSize(new THREE.Vector3());
    const s=2.5/Math.max(size.x,size.y,size.z);
    rg.scale.setScalar(s);
    rg.updateMatrixWorld(true);
    box.setFromObject(rg);
    const center=box.getCenter(new THREE.Vector3());
    rg.position.x-=center.x;
    rg.position.z-=center.z;
    rg.position.y=FLOOR_Y-box.min.y;
    rg.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.metalness=Math.min(o.material.metalness,0.4);o.material.roughness=Math.max(o.material.roughness,0.4);}}});
    scene.add(rg);
    car=null;ee=null;
  },undefined,function(err){console.error('GLB load error:',err);});
  // Mouse controls
  cv.addEventListener('pointerdown',e=>{
    if(e.button===2){rotating=true;pm={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);}
    else if(e.button===1){panning=true;pm={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);e.preventDefault();}
  });
  cv.addEventListener('pointerup',()=>{rotating=false;panning=false;});
  cv.addEventListener('pointermove',e=>{
    const dx=e.clientX-pm.x,dy=e.clientY-pm.y;
    if(rotating){rg.rotation.y+=dx*0.008;rg.rotation.x+=dy*0.004;}
    if(panning){const s=0.003*cam.position.z;cam.position.x-=dx*s;cam.position.y+=dy*s;target.x-=dx*s;target.y+=dy*s;cam.lookAt(target);}
    if(rotating||panning)pm={x:e.clientX,y:e.clientY};
  });
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{cam.position.z=Math.max(1.5,Math.min(10,cam.position.z+e.deltaY*0.008));e.preventDefault();},{passive:false});
  // Touch controls
  cv.addEventListener('touchstart',e=>{
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t=>{touches[t.identifier]={x:t.clientX,y:t.clientY};});
  },{passive:false});
  cv.addEventListener('touchmove',e=>{
    e.preventDefault();
    const pts=Array.from(e.touches);
    if(pts.length===1){
      const t=pts[0],prev=touches[t.identifier];
      if(prev){const dx=t.clientX-prev.x,dy=t.clientY-prev.y;rg.rotation.y+=dx*0.008;rg.rotation.x+=dy*0.004;}
      touches[t.identifier]={x:t.clientX,y:t.clientY};
    } else if(pts.length===2){
      const a=pts[0],b=pts[1],pa=touches[a.identifier],pb=touches[b.identifier];
      if(pa&&pb){
        const prevDist=Math.hypot(pa.x-pb.x,pa.y-pb.y),newDist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
        cam.position.z=Math.max(1.5,Math.min(10,cam.position.z-(newDist-prevDist)*0.02));
        const pmx=(pa.x+pb.x)/2,pmy=(pa.y+pb.y)/2,nmx=(a.clientX+b.clientX)/2,nmy=(a.clientY+b.clientY)/2;
        const s=0.003*cam.position.z;cam.position.x-=(nmx-pmx)*s;cam.position.y+=(nmy-pmy)*s;target.x-=(nmx-pmx)*s;target.y+=(nmy-pmy)*s;cam.lookAt(target);
      }
      touches[a.identifier]={x:a.clientX,y:a.clientY};touches[b.identifier]={x:b.clientX,y:b.clientY};
    }
  },{passive:false});
  cv.addEventListener('touchend',e=>{Array.from(e.changedTouches).forEach(t=>delete touches[t.identifier]);},{passive:false});
  let t=0;
  (function anim(){requestAnimationFrame(anim);t+=0.008;if(!rotating&&autoSpin)rg.rotation.y+=0.003;if(car)car.position.y=1.9+Math.sin(t*0.5)*0.05;if(ee)ee.position.y=1.9+Math.sin(t*0.5)*0.05;ren.render(scene,cam);})();
}
function toggleSpin(){
  autoSpin=!autoSpin;
  const btn=document.getElementById('spinbtn');
  btn.textContent=autoSpin?'⏸':'▶';
  btn.title=autoSpin?'Pause spin':'Resume spin';
  btn.style.color=autoSpin?'':'rgba(255,255,255,0.7)';
}
function toggleFullscreen(){
  const wrap=document.getElementById('cwrap');
  if(!document.fullscreenElement&&!document.webkitFullscreenElement){
    (wrap.requestFullscreen||wrap.webkitRequestFullscreen).call(wrap);
  } else {
    (document.exitFullscreen||document.webkitExitFullscreen).call(document);
  }
}
function resetView(){
  cam.position.set(0,1.2,2.8);
  target.set(0,0.5,0);
  cam.lookAt(target);
  rg.rotation.set(0,0,0);
}
window.addEventListener('load', function() {
  show('home', document.querySelector('.nb.active'));
});
function onResize(){if(!ren)return;const w=document.getElementById('cwrap');cam.aspect=w.clientWidth/w.clientHeight;cam.updateProjectionMatrix();ren.setSize(w.clientWidth,w.clientHeight);}
window.addEventListener('resize',onResize);
document.addEventListener('fullscreenchange',onResize);
document.addEventListener('webkitfullscreenchange',onResize);
