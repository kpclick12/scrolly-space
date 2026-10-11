/* Local Three.js is loaded only as the last chapter approaches the viewport. */
const ending = document.querySelector('.ending-telescope');
if (ending) setupEnding(ending);

function setupEnding(root) {
  const stage = root.querySelector('.telescope-stage');
  const mount = root.querySelector('.telescope-canvas');
  const steps = [...root.querySelectorAll('[data-telescope-step]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedReduce = new URLSearchParams(location.search).get('motion') === 'reduce';
  const reduced = () => forcedReduce || preference.matches;
  const clamp = (n, lo=0, hi=1) => Math.max(lo, Math.min(hi, n));
  const smooth = n => { const t=clamp(n); return t*t*(3-2*t); };
  let active=false, near=false, loading=false, failed=false, disposed=false, frame=0, graphics=null;
  let sizeDirty=true;

  function position() {
    const readingLine=innerHeight*(innerWidth<=700?.66:.50);
    const centers=steps.map(step => { const r=step.getBoundingClientRect(); return r.top+r.height*.46; });
    if(readingLine<=centers[0]) return 0;
    for(let i=0;i<centers.length-1;i++) {
      if(readingLine<=centers[i+1]) return i+clamp((readingLine-centers[i])/(centers[i+1]-centers[i]));
    }
    return Math.max(0,steps.length-1);
  }
  function schedule() {
    if(!frame && active && !document.hidden && graphics && !disposed) frame=requestAnimationFrame(render);
  }
  function render() {
    frame=0;
    if(!graphics || !active || document.hidden || reduced() || disposed) return;
    if(sizeDirty) {
      graphics.resize(stage.clientWidth,stage.clientHeight);
      sizeDirty=false;
    }
    const p=position();
    // The field moves only during the brief search. Acquisition never changes
    // the source position or radius: only the accumulated image's contrast.
    const collection=smooth((p-.22)/.72);
    const field=1-smooth((p-1.42)/.24);
    const model=smooth((p-1.69)/.16);
    const telescope=.68*smooth((p-.64)/.24)*(1-smooth((p-1.48)/.18));
    const q=p<1.69 ? Math.max(0,(p-.72)*.72) : 1.2+(p-1.69)*1.05;
    const rays=p<1.69?smooth((p-.80)/.28):0;
    root.style.setProperty('--discovery-opacity',field);
    root.style.setProperty('--discovery-shift',`${(1-smooth(p/.18))*12}px`);
    root.style.setProperty('--discovery-signal',.27+collection*.73);
    root.style.setProperty('--discovery-noise',.72*(1-collection)+.025);
    root.style.setProperty('--discovery-label',smooth((p-.98)/.18));
    root.style.setProperty('--discovery-meter',collection);
    root.style.setProperty('--discovery-collect',.65*smooth((p-.20)/.15));
    root.style.setProperty('--telescope-view-opacity',Math.max(telescope,model));
    root.style.setProperty('--telescope-view-scale',p<1.69?.36:1);
    root.style.setProperty('--telescope-model',model);
    root.style.setProperty('--telescope-rays',rays*field);
    root.style.setProperty('--telescope-world',model*(1-smooth((q-1.85)/.18)));
    root.style.setProperty('--telescope-spectrum',smooth((q-2.1)/.45));
    const explanation=smooth((p-3.45)/.28);
    root.style.setProperty('--spectrum-band-note',explanation);
    // Keep the following answer, including its source link, out of the visual
    // and keyboard sequence until the reader has had the comparison alone.
    root.style.setProperty('--spectrum-explanation-visibility',explanation>.01?'visible':'hidden');
    root.dataset.telescopeState=String(Math.min(steps.length-1,Math.floor(p+.35)));
    graphics.draw(q,rays,innerWidth<=700);
    mount.dataset.discoveryProgress=p.toFixed(2);
  }
  async function load() {
    if(!near || loading || graphics || failed || reduced() || disposed) return;
    loading=true;
    try {
      const [THREE,{GLTFLoader}]=await Promise.all([
        import('../assets/telescope/vendor/three.module.min.js'),
        import('../assets/telescope/vendor/addons/loaders/GLTFLoader.js')
      ]);
      if(disposed || reduced()) return;
      graphics=createTelescope(THREE,GLTFLoader,mount,schedule,()=>{
        failed=true;
        destroyGraphics();
      });
      root.classList.add('telescope-ready');
      sizeDirty=true;
      schedule();
    } catch(error) {
      failed=true;
      destroyGraphics();
      // The inline illustrated narrative remains available when WebGL is absent.
      root.dataset.telescopeFallback='true';
    } finally { loading=false; }
  }
  function destroyGraphics() {
    if(frame) cancelAnimationFrame(frame);
    frame=0;
    root.classList.remove('telescope-ready');
    graphics?.dispose();
    graphics=null;
  }
  function onResize(){sizeDirty=true;schedule();}
  function onVisibility(){if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else schedule();}
  function onPreference(){if(reduced())destroyGraphics();else load();}
  const nearObserver=new IntersectionObserver(entries=>{
    near=entries[0].isIntersecting;
    if(near)load();
  },{rootMargin:'700px 0px'});
  const visibleObserver=new IntersectionObserver(entries=>{
    active=entries[0].isIntersecting;
    if(active)schedule();
    else if(frame){cancelAnimationFrame(frame);frame=0;}
  });
  nearObserver.observe(root);
  visibleObserver.observe(root);
  const resizeObserver=new ResizeObserver(onResize);
  resizeObserver.observe(stage);
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',onResize,{passive:true});
  addEventListener('hashchange',schedule);
  document.addEventListener('visibilitychange',onVisibility);
  preference.addEventListener('change',onPreference);
  function pagehide(event){
    destroyGraphics();
    if(event.persisted)return;
    disposed=true;
    nearObserver.disconnect();visibleObserver.disconnect();resizeObserver.disconnect();
    removeEventListener('scroll',schedule);removeEventListener('resize',onResize);removeEventListener('hashchange',schedule);
    document.removeEventListener('visibilitychange',onVisibility);preference.removeEventListener('change',onPreference);
    removeEventListener('pagehide',pagehide);removeEventListener('pageshow',pageshow);
  }
  function pageshow(event){if(event.persisted){failed=false;load();}}
  addEventListener('pagehide',pagehide);addEventListener('pageshow',pageshow);
}

function createTelescope(T,GLTFLoader,mount,onAsset,onLost) {
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  renderer.setClearColor(0x080d14,0);
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;
  renderer.domElement.setAttribute('aria-hidden','true');
  mount.replaceChildren(renderer.domElement);
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(37,1,.1,200);
  const resources=new Set();
  const own=value=>{resources.add(value);return value;};
  const vec=(x,y,z)=>new T.Vector3(x,y,z);
  const model=new T.Group();scene.add(model);
  const optics=new T.Group();model.add(optics);

  // A tiny procedural reflection environment, not a photograph of space.
  // Soft panels give the metal facets readable shape without external textures.
  const environmentCanvas=document.createElement('canvas');
  environmentCanvas.width=512;environmentCanvas.height=256;
  const ctx=environmentCanvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,256);
  gradient.addColorStop(0,'#faf2db');gradient.addColorStop(.32,'#b5bdc2');
  gradient.addColorStop(.48,'#a7a8a8');gradient.addColorStop(.57,'#68717b');gradient.addColorStop(1,'#9ca4ae');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);
  ctx.fillStyle='#fff9e7';ctx.fillRect(66,18,95,98);ctx.fillRect(328,48,25,170);
  ctx.fillStyle='#181f2b';ctx.fillRect(164,0,28,256);ctx.fillRect(403,0,42,256);
  const environment=own(new T.CanvasTexture(environmentCanvas));
  environment.mapping=T.EquirectangularReflectionMapping;environment.colorSpace=T.SRGBColorSpace;
  const pmrem=new T.PMREMGenerator(renderer);
  const envTarget=own(pmrem.fromEquirectangular(environment));pmrem.dispose();
  scene.environment=envTarget.texture;
  const ambient=new T.HemisphereLight(0xc9dcf6,0x685033,2.0);scene.add(ambient);
  const key=new T.DirectionalLight(0xfff0d4,4.0);key.position.set(-4,7,8);scene.add(key);
  const rim=new T.DirectionalLight(0xb5d4ff,3.2);rim.position.set(5,2,-6);scene.add(rim);

  const gold=own(new T.MeshStandardMaterial({color:0xe6b849,metalness:.84,roughness:.24,envMapIntensity:1.6,emissive:0x624006,emissiveIntensity:.18}));
  const dark=own(new T.MeshStandardMaterial({color:0x1c2530,metalness:.72,roughness:.42}));
  const silver=own(new T.MeshStandardMaterial({color:0xa5adb7,metalness:.86,roughness:.29,side:T.DoubleSide}));
  const edge=own(new T.MeshStandardMaterial({color:0x6c7380,metalness:.78,roughness:.38}));
  const warm=own(new T.MeshStandardMaterial({color:0xa98642,metalness:.88,roughness:.36}));
  function mesh(geometry,material,parent=model){const object=new T.Mesh(own(geometry),material);parent.add(object);return object;}
  function bar(a,b,r=.035,material=dark,parent=model){
    const delta=b.clone().sub(a);
    const object=mesh(new T.CylinderGeometry(r,r,delta.length(),8),material,parent);
    object.position.copy(a).add(b).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(vec(0,1,0),delta.normalize());return object;
  }
  const hex=new T.Shape();
  for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;const x=.682*Math.cos(a),y=.682*Math.sin(a);i?hex.lineTo(x,y):hex.moveTo(x,y);}
  hex.closePath();
  const segmentGeometry=own(new T.ExtrudeGeometry(hex,{depth:.095,bevelEnabled:true,bevelSize:.008,bevelThickness:.012,bevelSegments:1,steps:1}));
  // 18 actual individual mirror segments. The centre is reserved for aft optics.
  const positions=[];
  const frontSegments=own(new T.InstancedMesh(segmentGeometry,gold,18));
  const backSegments=own(new T.InstancedMesh(segmentGeometry,dark,18));
  model.add(frontSegments,backSegments);
  for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++){
    if(Math.abs(q+r)>2 || (q===0&&r===0))continue;
    const x=Math.sqrt(3)*.705*(q+r/2),y=1.5*.705*r,z=(x*x+y*y)/14.4;
    positions.push(vec(x,y,z));
    const segment=new T.Object3D();
    segment.position.set(x,y,z);
    segment.quaternion.setFromUnitVectors(vec(0,0,1),vec(-x/7.2,-y/7.2,1).normalize());
    segment.updateMatrix();frontSegments.setMatrixAt(positions.length-1,segment.matrix);
    segment.position.z-=.17;segment.updateMatrix();backSegments.setMatrixAt(positions.length-1,segment.matrix);
    // One rear rib per segment is enough to show physical thickness in the orbit.
    bar(vec(x,y,z-.21),vec(x*.65,y*.65,-.42),.034,edge);
  }
  // A dark structure and gold thermal blanket behind the honeycomb.
  const back=mesh(new T.CylinderGeometry(1.22,1.0,.65,6),dark);back.rotation.x=Math.PI/2;back.position.z=-.65;
  const bus=mesh(new T.BoxGeometry(1.5,1.3,1.1),warm);bus.position.set(0,-1.15,-1.25);
  const busSide=mesh(new T.BoxGeometry(1.54,.52,1.13),silver);busSide.position.copy(bus.position);
  const aft=mesh(new T.CylinderGeometry(.40,.53,.9,6),dark);aft.rotation.x=Math.PI/2;aft.position.z=-.21;
  const aftRim=mesh(new T.TorusGeometry(.405,.029,8,6),edge);aftRim.position.z=.25;aftRim.rotation.z=Math.PI/6;
  const secondaryPosition=vec(0,0,3.55);
  const secondary=mesh(new T.CylinderGeometry(.33,.28,.25,32),dark);secondary.rotation.x=Math.PI/2;secondary.position.copy(secondaryPosition);
  const secondaryFace=mesh(new T.CircleGeometry(.278,32),gold);secondaryFace.rotation.y=Math.PI;secondaryFace.position.set(0,0,3.415);
  const secondaryCap=mesh(new T.CircleGeometry(.275,24),edge);secondaryCap.position.set(0,0,3.68);
  [vec(0,2.62,.42),vec(-2.2,-1.35,.48),vec(2.2,-1.35,.48)].forEach(anchor=>{
    bar(anchor,secondaryPosition,.043,dark);
    bar(anchor.clone().add(vec(.045,0,.015)),secondaryPosition.clone().add(vec(.045,0,0)),.010,silver);
    const hinge=mesh(new T.SphereGeometry(.082,8,6),edge);hinge.position.copy(anchor);
  });
  // Five gently folded sunshield layers, visible in perspective below the mirror.
  for(let layer=0;layer<5;layer++){
    const y=-3.03-layer*.13,s=1+layer*.032;
    const points=[vec(0,y+.10,2.9*s),vec(-3.1*s,y,-.35),vec(-2.25*s,y-.08,-3.9*s),vec(0,y+.07,-5.0*s),vec(2.25*s,y-.08,-3.9*s),vec(3.1*s,y,-.35)];
    const vertices=[];
    for(let i=0;i<6;i++){const a=points[i],b=points[(i+1)%6];vertices.push(0,y+.20,-.9,a.x,a.y,a.z,b.x,b.y,b.z);}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
    mesh(geometry,layer%2?silver:edge);
    const lineGeometry=own(new T.BufferGeometry().setFromPoints([...points,points[0]]));
    const line=new T.Line(lineGeometry,own(new T.LineBasicMaterial({color:layer===0?0xc2c7ce:0x778599})));model.add(line);
  }
  bar(vec(-2,-2,-1),vec(-3.1,-3.03,-.35),.035,edge);bar(vec(2,-2,-1),vec(3.1,-3.03,-.35),.035,edge);
  bar(vec(0,-1.8,-1),vec(0,-3.5,-1.1),.14,dark);

  // This is a geometric explanation, not a ray-traced optical engineering model.
  // All paths arrive along -Z, strike the primary first, then go to the secondary,
  // and return through the centre to the tertiary/fine-steering/instrument region.
  const rayMaterial=own(new T.MeshBasicMaterial({color:0xf5df9a,transparent:true,opacity:0,depthWrite:false}));
  const paths=[];
  [positions[2],positions[8],positions[15]].forEach(p=>{
    const points=[vec(p.x,p.y,8),p.clone().add(vec(0,0,.11)),vec(0,0,3.41),vec(0,0,-.48),vec(-.34,-.19,-.67),vec(.38,-.58,-.93)];
    paths.push(points);
    for(let i=0;i<points.length-1;i++)bar(points[i],points[i+1],.014,rayMaterial,optics);
  });
  const photonMaterial=own(new T.MeshBasicMaterial({color:0xfff5d7,transparent:true,opacity:0}));
  const photon=mesh(new T.SphereGeometry(.066,12,8),photonMaterial,optics);
  const instrumentGlow=mesh(new T.SphereGeometry(.12,12,8),photonMaterial,optics);instrumentGlow.position.set(.38,-.58,-.93);
  optics.visible=false;

  // Few background stars, fixed in space. No simulation or idle animation loop.
  let seed=18;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const starPositions=[];
  for(let i=0;i<95;i++)starPositions.push((random()-.5)*70,(random()-.5)*50,-15-random()*30);
  const starGeometry=own(new T.BufferGeometry());starGeometry.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));
  const starMaterial=own(new T.PointsMaterial({color:0x8a9baa,size:.035,sizeAttenuation:true,transparent:true,opacity:.5,depthWrite:false}));
  scene.add(new T.Points(starGeometry,starMaterial));

  // A separate explanatory model represents the same unresolved system.
  // It fades in at a new scale; the camera never flies into the observed point.
  const world=new T.Group();world.position.set(24,0,0);scene.add(world);
  const planet=new T.Group();planet.position.set(.3,.15,0);world.add(planet);
  const surfaceMaterial=own(new T.MeshStandardMaterial({color:0x526667,roughness:.88,envMapIntensity:.08}));
  const placeholder=mesh(new T.SphereGeometry(1.65,64,40),surfaceMaterial,planet);
  let dead=false;
  const loader=new GLTFLoader();
  loader.load(new URL('../assets/telescope/planet/imaginary-planet.glb',import.meta.url).href,gltf=>{
    gltf.scene.traverse(object=>{
      if(!object.isMesh)return;
      if(dead){object.geometry.dispose();object.material.map?.dispose();object.material.dispose();return;}
      own(object.geometry);
      for(const material of [].concat(object.material)){
        own(material);if(material.map)own(material.map);
        material.envMapIntensity=.10;
      }
    });
    if(dead)return;
    gltf.scene.scale.setScalar(1.65);planet.add(gltf.scene);placeholder.visible=false;
    mount.dataset.planetAsset='blender';onAsset();
  },undefined,()=>{mount.dataset.planetAsset='procedural-fallback';onAsset();});
  // A thin, soft Fresnel edge. The atmosphere is exaggerated for explanation;
  // opacity falls off toward the face instead of drawing a solid cyan ring.
  const atmosphereMaterial=own(new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.FrontSide,
    uniforms:{strength:{value:.5}},
    vertexShader:`varying vec3 vNormal; varying vec3 vView;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 vNormal; varying vec3 vView;uniform float strength;
      void main(){float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vView)),0.0),5.0);
        gl_FragColor=vec4(.38,.65,.82,rim*strength);}`
  }));
  const atmosphere=mesh(new T.SphereGeometry(1.706,72,48),atmosphereMaterial,planet);
  const outerAtmosphereMaterial=own(atmosphereMaterial.clone());outerAtmosphereMaterial.uniforms.strength.value=.12;
  mesh(new T.SphereGeometry(1.755,64,40),outerAtmosphereMaterial,planet);
  const stellarMaterial=own(new T.MeshBasicMaterial({color:0xffdeb0}));
  const stellar=mesh(new T.SphereGeometry(1.15,48,32),stellarMaterial,world);stellar.position.set(-4.25,1.6,-1);
  const haloMaterial=own(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    uniforms:{color:{value:new T.Color(0xffc778)}},
    vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 n;varying vec3 v;uniform vec3 color;void main(){float f=max(dot(normalize(n),normalize(v)),0.);gl_FragColor=vec4(color,pow(f,3.)*.18);}`
  }));
  const halo=mesh(new T.SphereGeometry(1.43,48,32),haloMaterial,world);halo.position.copy(stellar.position);
  const stellarLight=new T.PointLight(0xffdfb3,40,16,1.3);stellarLight.position.set(-4.25,1.6,2);world.add(stellarLight);

  const passage=new T.Group();world.add(passage);
  const beforeMaterial=own(new T.MeshBasicMaterial({color:0xffe3ad,transparent:true,opacity:0,depthWrite:false}));
  const afterMaterial=own(new T.MeshBasicMaterial({color:0xffe3ad,transparent:true,opacity:0,depthWrite:false}));
  // These parallel rays graze the upper atmosphere without crossing the solid
  // planet. Outgoing light is still mixed until the instrument separates it.
  for(let i=0;i<3;i++){
    const y=1.81+i*.024,z=(i-1)*.11;
    bar(vec(-3.15,y,z),vec(.28,y,z),.012,beforeMaterial,passage);
    bar(vec(.28,y,z),vec(4.2,y,z),.011,afterMaterial,passage);
  }
  const travellingMaterial=own(new T.MeshBasicMaterial({color:0xffeed0,transparent:true,opacity:0,depthWrite:false}));
  const travelling=mesh(new T.SphereGeometry(.057,12,8),travellingMaterial,passage);

  // Both rows use the same wavelength positions and fill the visual's width.
  // The illustrative dips reduce intensity without identifying any actual gas.
  const comparison=mount.parentElement.querySelector('.telescope-spectrum-comparison');
  const spectrumStops=[[],[]];
  const spectrumCells=72;
  for(let i=0;i<spectrumCells;i++){
    const t=i/(spectrumCells-1);
    const dip=(c,w,d)=>d*Math.exp(-Math.pow((t-c)/w,2));
    const intensity=1-dip(.23,.020,.86)-dip(.57,.030,.76)-dip(.79,.018,.82);
    const reference=new T.Color().setHSL(.69*(1-t),.61,.59);
    [1,intensity].forEach((strength,row)=>{
      const color=reference.clone().multiplyScalar(strength);
      spectrumStops[row].push(`${color.getStyle()} ${(t*100).toFixed(3)}%`);
    });
  }
  comparison.querySelectorAll('.spectrum-strip').forEach((strip,i)=>{
    strip.style.background=`linear-gradient(to right,${spectrumStops[i].join(',')})`;
  });
  const instrumentMaterial=own(new T.MeshStandardMaterial({color:0x60707b,metalness:.6,roughness:.35,transparent:true,opacity:0}));
  const analyser=mesh(new T.BoxGeometry(.25,.45,.40),instrumentMaterial,world);analyser.position.set(4.2,1.86,0);
  let width=1,height=1;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
  const target=new T.Vector3();
  function lost(event){event.preventDefault();onLost();}
  renderer.domElement.addEventListener('webglcontextlost',lost,false);
  function resize(w,h){width=Math.max(1,w);height=Math.max(1,h);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  function draw(p,rays,mobile){
    const turn=.32; // Fixed view while light is collected; no blind sweep.
    // Phones use a lower, wider orbit with the mirror kept entirely above the prose.
    const from=mobile?vec(5.5,3.5,12.6):vec(6.2,3.8,12.4);
    const to=mobile?vec(9.4,2.2,11.4):vec(10.4,2.1,11.0);
    const telescopeCamera=from.clone().lerp(to,turn);
    const travel=p>=1.2?1:0;
    const close=smooth((p-1.2)/.7);
    const reveal=smooth((p-2.02)/.48);
    // Reserve room for the full-width comparison on both layouts. The scene
    // gives way to the spectrum without covering the atmospheric light path.
    const footer=(mobile?Math.min(106,height*.52):Math.min(190,height*.40))*reveal;
    // Keep the mobile scenario/model labels above the scene. The CSS stage
    // grows by the same amount, preserving the planet's rendered size.
    const header=mobile?38:76*reveal;
    const sceneHeight=Math.max(1,height-footer-header);
    renderer.setViewport(0,footer,width,sceneHeight);
    camera.aspect=width/sceneHeight;camera.updateProjectionMatrix();
    const worldCamera=vec(24.2+close*.55,1.7-close*.8,mobile?17.3-close*2-reveal*5:17.3-close*2);
    camera.position.copy(telescopeCamera).lerp(worldCamera,travel);
    // The source star sits left of the planet; include its halo even at the
    // closest atmosphere view in a tall desktop stage.
    const fit=Math.max(1,(.91+.25*travel)/camera.aspect);
    target.set(0,mobile?-.45:-.5,.15+turn*.8).lerp(vec(24.2,mobile?-.15+reveal*.75:-.15+reveal*.4,0),travel);
    camera.position.sub(target).multiplyScalar(fit).add(target);
    camera.lookAt(target);
    model.rotation.y=-.13; // Hold the instrument on target throughout collection.
    rayMaterial.opacity=rays*.8;
    photonMaterial.opacity=rays;
    optics.visible=rays>.003;
    const route=paths[1];
    const distance=smooth((p-.09)/.55)*(route.length-1);
    const i=Math.min(route.length-2,Math.floor(distance));
    photon.position.copy(route[i]).lerp(route[i+1],distance-i);
    model.visible=travel<.995;
    world.visible=travel>.005;
    planet.rotation.y=-.42;
    // Telescope metal can use a bright studio environment; the distant world
    // keeps directional stellar shading, so the atmospheric edge remains legible.
    ambient.intensity=2.0*(1-travel)+.15*travel;
    key.intensity=4.0*(1-travel)+.24*travel;
    rim.intensity=3.2*(1-travel)+.14*travel;
    const passing=smooth((p-1.12)/.45);
    beforeMaterial.opacity=passing*.62;afterMaterial.opacity=passing*.36;
    travellingMaterial.opacity=passing*(1-reveal)*.95;
    travelling.position.set(-3.15+smooth((p-1.2)/.85)*7.35,1.834,0);
    atmosphereMaterial.uniforms.strength.value=.30+passing*.18;
    instrumentMaterial.opacity=passing*.75;
    mount.dataset.telescopeProgress=p.toFixed(2);
    renderer.render(scene,camera);
  }
  function dispose(){
    dead=true;
    renderer.domElement.removeEventListener('webglcontextlost',lost);
    resources.forEach(resource=>resource.dispose());
    scene.clear();renderer.dispose();renderer.domElement.remove();
  }
  return{resize,draw,dispose};
}
