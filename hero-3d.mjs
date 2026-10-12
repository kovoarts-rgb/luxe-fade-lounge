import {
  Scene, WebGLRenderer, PerspectiveCamera, CanvasTexture, PMREMGenerator,
  EquirectangularReflectionMapping, SRGBColorSpace, ACESFilmicToneMapping,
  PointLight, DirectionalLight, GLTFLoader
} from './assets/three-runtime.js';

const hero=document.querySelector('#home');
const stage=hero?.querySelector('.hero-logo-stage');
const stars=hero?.querySelector('.starfield');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const touch=matchMedia('(pointer: coarse)');
if(hero&&stage&&stars) initHero();

function initHero(){
  const context=stars.getContext('2d',{alpha:true});
  let seed=72419;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const points=Array.from({length:140},(_,i)=>({x:random(),y:random(),radius:.35+random()*1.1,phase:random()*Math.PI*2,speed:.4+random()*.45,flare:i<12}));
  let starWidth=0,starHeight=0,renderer,scene,camera,model,visible=true,frame=0,lastFrame=0;
  let pointerX=0,pointerY=0,angleX=-.06,angleY=-.16;

  function drawStars(time){
    if(!context)return;
    context.clearRect(0,0,starWidth,starHeight);
    for(const star of points){
      const alpha=motion.matches?.46:.2+(Math.sin(time*star.speed+star.phase)+1)*.3;
      const x=star.x*starWidth,y=star.y*starHeight;
      context.fillStyle=`rgba(231,238,255,${alpha})`;
      context.beginPath();context.arc(x,y,star.radius,0,Math.PI*2);context.fill();
      if(star.flare){
        const shimmer=motion.matches?.28:Math.pow(Math.max(0,Math.sin(time*.5+star.phase)),8);
        if(shimmer>.05){
          const radius=4+shimmer*5;
          const glow=context.createRadialGradient(x,y,0,x,y,radius*2.5);
          glow.addColorStop(0,`rgba(233,242,255,${shimmer*.4})`);glow.addColorStop(1,'rgba(233,242,255,0)');
          context.fillStyle=glow;context.fillRect(x-radius*2.5,y-radius*2.5,radius*5,radius*5);
          context.strokeStyle=`rgba(242,247,255,${shimmer*.68})`;context.lineWidth=.7;
          context.beginPath();context.moveTo(x-radius,y);context.lineTo(x+radius,y);context.moveTo(x,y-radius);context.lineTo(x,y+radius);context.stroke();
        }
      }
    }
  }

  function render(time=0){
    drawStars(time);
    if(renderer&&model){
      const targetY=-.16+(motion.matches?0:Math.sin(time*.3)*.075+pointerX*.17);
      const targetX=-.06+(motion.matches?0:Math.sin(time*.23)*.025-pointerY*.055);
      angleX+=(targetX-angleX)*.08;angleY+=(targetY-angleY)*.08;
      model.rotation.set(angleX,angleY,0);
      model.position.y=motion.matches?0:Math.sin(time*.6)*.017;
      renderer.render(scene,camera);
    }
  }
  function tick(now){
    frame=0;
    if(!visible||document.hidden||motion.matches||document.body.classList.contains('dialog-open'))return;
    if(now-lastFrame>32){lastFrame=now;render(now/1000);}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;
    const blocked=document.body.classList.contains('dialog-open');
    hero.dataset.motion=!visible||document.hidden||blocked?'paused':motion.matches?'reduced':'running';
    if(visible&&!document.hidden){render(performance.now()/1000);if(!motion.matches&&!blocked)frame=requestAnimationFrame(tick);}
  }
  function resize(){
    const pixelRatio=Math.min(devicePixelRatio||1,1.5);
    starWidth=hero.clientWidth;starHeight=hero.clientHeight;
    stars.width=Math.round(starWidth*pixelRatio);stars.height=Math.round(starHeight*pixelRatio);
    context?.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    if(renderer){
      const width=stage.clientWidth,height=stage.clientHeight;
      renderer.setPixelRatio(touch.matches?Math.min(pixelRatio,1.35):pixelRatio);
      renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    }
    sync();
  }
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    document.body.classList.toggle('hero-visible',visible);
    sync();
  },{threshold:0,rootMargin:'-100px 0px 0px 0px'}).observe(hero);
  document.addEventListener('visibilitychange',sync);
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  motion.addEventListener('change',sync);
  hero.addEventListener('pointermove',event=>{
    if(touch.matches||motion.matches)return;
    const bounds=hero.getBoundingClientRect();
    pointerX=(event.clientX-bounds.left)/bounds.width*2-1;
    pointerY=(event.clientY-bounds.top)/bounds.height*2-1;
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;},{passive:true});

  try {
    renderer=new WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=SRGBColorSpace;
    renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    renderer.domElement.className='hero-model-canvas';renderer.domElement.setAttribute('aria-hidden','true');
    stage.prepend(renderer.domElement);
    scene=new Scene();camera=new PerspectiveCamera(32,1.28,.1,50);camera.position.set(0,0,4.8);

    // Local studio lighting creates genuine reflections on the metallic model.
    const lighting=document.createElement('canvas');lighting.width=1024;lighting.height=512;
    const studio=lighting.getContext('2d');
    const gradient=studio.createLinearGradient(0,0,0,512);
    [[0,'#8c9cb3'],[.2,'#c5d0e0'],[.35,'#faffff'],[.43,'#616d7b'],[.48,'#505d70'],[.54,'#7f92aa'],[.59,'#faffff'],[.7,'#27323f'],[1,'#05070b']].forEach(([stop,color])=>gradient.addColorStop(stop,color));
    studio.fillStyle=gradient;studio.fillRect(0,0,1024,512);
    for(const [x,width,alpha] of [[75,80,.7],[425,54,.95],[785,110,.6]]){
      const panel=studio.createLinearGradient(x,0,x+width,0);
      panel.addColorStop(0,'rgba(255,255,255,0)');panel.addColorStop(.5,`rgba(255,255,255,${alpha})`);panel.addColorStop(1,'rgba(255,255,255,0)');
      studio.fillStyle=panel;studio.fillRect(x,40,width,390);
    }
    const texture=new CanvasTexture(lighting);texture.mapping=EquirectangularReflectionMapping;texture.colorSpace=SRGBColorSpace;
    const pmrem=new PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(texture);scene.environment=environment.texture;
    texture.dispose();pmrem.dispose();
    const key=new PointLight(0xffffff,7,0,2);key.position.set(2,3,4);scene.add(key);
    const rim=new PointLight(0xc7d9ff,5,0,2);rim.position.set(-3,-1,2);scene.add(rim);
    const fill=new DirectionalLight(0xffffff,.25);fill.position.set(-2,1,4);scene.add(fill);

    new GLTFLoader().load(new URL('./assets/luxe-fade-logo.glb',import.meta.url).href,gltf=>{
      model=gltf.scene;
      let meshCount=0;
      model.traverse(object=>{if(object.isMesh){meshCount++;object.material.envMapIntensity=1.35;}});
      scene.add(model);resize();render(performance.now()/1000);
      stage.classList.add('is-ready');stage.dataset.renderMode='webgl';stage.dataset.modelMeshes=String(meshCount);
      sync();
    },undefined,()=>{stage.dataset.renderMode='fallback';});
    renderer.domElement.addEventListener('webglcontextlost',()=>{stage.classList.remove('is-ready');stage.dataset.renderMode='fallback';cancelAnimationFrame(frame);},{passive:true});
    renderer.domElement.addEventListener('webglcontextrestored',()=>{if(model){stage.classList.add('is-ready');stage.dataset.renderMode='webgl';sync();}},{passive:true});
  } catch {
    renderer=undefined;stage.dataset.renderMode='fallback';
  }
  resize();
}
