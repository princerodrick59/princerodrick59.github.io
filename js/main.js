function show(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  btn.classList.add('active');
  if(id==='home') setTimeout(initR,50);
}
let ren=null,scene,cam,rg,car,ee;
let rotating=false,panning=false,pm={x:0,y:0},autoSpin=true;
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
  cam.position.set(0,1.2,4.5);cam.lookAt(target);
  scene.add(new THREE.AmbientLight(0xffffff,0.8));
  const kl=new THREE.DirectionalLight(0xffffff,1.5);kl.position.set(3,6,5);scene.add(kl);
  const fl=new THREE.DirectionalLight(0xffffff,0.8);fl.position.set(-4,3,-2);scene.add(fl);
  const rl=new THREE.DirectionalLight(0xffffff,0.5);rl.position.set(0,2,-5);scene.add(rl);
  const al=m=>new THREE.MeshStandardMaterial(m);
  const AM=al({color:0xb0b8c8,metalness:0.8,roughness:0.3});
  const DM=al({color:0x1a1a1a,metalness:0.5,roughness:0.6});
  const BM=al({color:0x0039a2,metalness:0.3,roughness:0.5});
  const AzM=al({color:0x1866e1,metalness:0.2,roughness:0.4,emissive:0x0039a2,emissiveIntensity:0.2});
  const LM=al({color:0x89cff0,emissive:0x1866e1,emissiveIntensity:1.0});
  const WM=al({color:0x111118,metalness:0.1,roughness:0.9});
  const CM=al({color:0x1a1a1a,metalness:0.2,roughness:0.7});
  const MM=al({color:0x0a0a14,metalness:0.7,roughness:0.3});
  const OM=al({color:0xee6600,metalness:0.1,roughness:0.5});
  const GM=al({color:0xccaa20,metalness:0.9,roughness:0.3});
  const GrM=al({color:0x66676b,metalness:0.3,roughness:0.6});
  rg=new THREE.Group();scene.add(rg);
  function B(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;return o;}
  function C(r,h,m,x,y,z,rx=0,rz=0){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),m);o.position.set(x,y,z);o.rotation.x=rx;o.rotation.z=rz;o.castShadow=true;return o;}
  const bg=new THREE.BoxGeometry(1.9,0.12,0.12);
  [[-0.95,0],[0.95,0],[0,-0.95],[0,0.95]].forEach(([ox,oz],i)=>{const b=new THREE.Mesh(bg.clone(),BM);b.position.set(ox,-0.3,oz);if(i>=2)b.rotation.y=Math.PI/2;rg.add(b);});
  for(let sx of[-1,1])for(let sz of[-1,1])rg.add(B(0.12,0.12,0.12,BM,sx*0.95,-0.3,sz*0.95));
  rg.add(B(1.7,0.04,1.7,AM,0,-0.25,0));
  rg.add(B(1.55,0.015,1.55,GrM,0,-0.22,0));
  [[-0.65,-0.65],[0.65,-0.65],[-0.65,0.65],[0.65,0.65]].forEach(([mx,mz])=>{
    rg.add(B(0.2,0.22,0.2,DM,mx,-0.22,mz));
    rg.add(C(0.09,0.055,WM,mx,-0.36,mz,0,Math.PI/2));
    rg.add(C(0.055,0.16,MM,mx+(mx>0?0.13:-0.13),-0.18,mz));
  });
  for(let sx of[-0.5,0.5])rg.add(B(0.06,0.25,0.06,AM,sx,-0.07,0));
  rg.add(B(0.32,2.8,0.18,AM,0.06,1.25,0.05));
  rg.add(B(0.24,2.2,0.12,new THREE.MeshStandardMaterial({color:0x9aa0b0,metalness:0.7,roughness:0.25}),0.06,1.1,0.04));
  rg.add(B(0.17,1.6,0.09,new THREE.MeshStandardMaterial({color:0x808898,metalness:0.6,roughness:0.2}),0.06,0.95,0.03));
  rg.add(C(0.065,0.22,MM,0.25,0.08,0.1));rg.add(C(0.065,0.22,MM,-0.12,0.08,0.1));
  rg.add(B(0.28,0.6,0.03,DM,0.06,0.6,-0.12));
  rg.add(B(0.07,0.04,0.01,OM,-0.04,0.75,-0.125));rg.add(B(0.07,0.04,0.01,OM,0.12,0.75,-0.125));
  car=B(0.22,0.16,0.18,DM,0.06,1.9,0.08);rg.add(car);
  rg.add(C(0.018,0.3,AzM,0.06,1.9,0.08,0,Math.PI/2));
  ee=B(0.65,0.06,0.06,CM,0.5,1.9,0.08);rg.add(ee);
  for(let i=0;i<4;i++)rg.add(C(0.038,0.04,AzM,0.18+i*0.15,1.9,0.08,0,Math.PI/2));
  rg.add(C(0.04,0.12,MM,0.18,1.9,0.14));
  rg.add(B(0.28,0.015,0.01,LM,0.06,0.02,0.1));
  rg.add(B(0.08,0.9,0.08,AM,-0.55,0.1,-0.5));
  const ca=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.7,0.06),AM);ca.position.set(-0.45,0.5,-0.6);ca.rotation.z=0.3;rg.add(ca);
  rg.add(C(0.06,0.2,MM,-0.55,0.45,-0.5));
  for(let dx of[-0.04,0.04]){const t=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.06,0.04),GM);t.position.set(-0.45+dx,0.88,-0.68);t.rotation.z=0.4;rg.add(t);}
  const rm=new THREE.LineBasicMaterial({color:0xdddddd});
  rg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.08,0.05,0.05),new THREE.Vector3(-0.08,2.6,0.05)]),rm));
  rg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.20,0.05,0.05),new THREE.Vector3(0.20,2.6,0.05)]),rm));
  rg.position.y=-0.2;
  // Load real robot model
  console.log('GLTFLoader defined:',typeof THREE.GLTFLoader);
  if(typeof THREE.GLTFLoader!=='undefined'){
    console.log('Starting GLB load...');
    const dracoLoader=new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
    const gltfLoader=new THREE.GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.load('models/robot.glb',function(gltf){
      console.log('GLB loaded OK, scene children:',gltf.scene.children.length);
      scene.remove(rg);
      rg=gltf.scene;
      const box=new THREE.Box3().setFromObject(rg);
      const size=box.getSize(new THREE.Vector3());
      console.log('GLB size:',size.x.toFixed(2),size.y.toFixed(2),size.z.toFixed(2));
      const s=2.5/Math.max(size.x,size.y,size.z);
      rg.scale.setScalar(s);
      rg.updateMatrixWorld(true);
      box.setFromObject(rg);
      const center=box.getCenter(new THREE.Vector3());
      rg.position.x-=center.x;
      rg.position.z-=center.z;
      rg.position.y=FLOOR_Y-box.min.y;
      rg.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.metalness=Math.min(o.material.metalness,0.4);o.material.roughness=Math.max(o.material.roughness,0.4);}}})
      scene.add(rg);
      car=null;ee=null;
      console.log('GLB added to scene. Camera pos:',cam.position.x,cam.position.y,cam.position.z);
    },undefined,function(err){console.error('GLB load error:',err);});
  }
  cv.addEventListener('pointerdown',e=>{
    if(e.button===2){rotating=true;pm={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);}
    else if(e.button===1){panning=true;pm={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);e.preventDefault();}
  });
  cv.addEventListener('pointerup',()=>{rotating=false;panning=false;});
  cv.addEventListener('pointermove',e=>{
    const dx=e.clientX-pm.x,dy=e.clientY-pm.y;
    if(rotating){rg.rotation.y+=dx*0.008;rg.rotation.x+=dy*0.004;rg.rotation.x=Math.max(-0.6,Math.min(0.6,rg.rotation.x));}
    if(panning){const s=0.003*cam.position.z;cam.position.x-=dx*s;cam.position.y+=dy*s;target.x-=dx*s;target.y+=dy*s;cam.lookAt(target);}
    if(rotating||panning)pm={x:e.clientX,y:e.clientY};
  });
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{cam.position.z=Math.max(1.5,Math.min(10,cam.position.z+e.deltaY*0.008));e.preventDefault();},{passive:false});
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
function resetView(){
  cam.position.set(0,1.2,4.5);
  target.set(0,0.5,0);
  cam.lookAt(target);
  rg.rotation.set(0,0,0);
}
window.addEventListener('load',initR);
window.addEventListener('resize',()=>{if(!ren)return;const w=document.getElementById('cwrap');cam.aspect=w.clientWidth/w.clientHeight;cam.updateProjectionMatrix();ren.setSize(w.clientWidth,w.clientHeight);});
