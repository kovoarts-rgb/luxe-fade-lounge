import {
  Scene,WebGLRenderer,PerspectiveCamera,DataTexture,FloatType,RGBAFormat,PMREMGenerator,
  EquirectangularReflectionMapping,SRGBColorSpace,ACESFilmicToneMapping,
  PointLight,DirectionalLight,Quaternion,Euler,Vector3,Box3,GLTFLoader
} from './assets/three-runtime.js?v=mirror3';
import {installLogoInteraction} from './logo-interaction.mjs?v=mirror3';

const hero=document.querySelector('#home'),galaxy=document.querySelector('.galaxy-story');
const stage=hero?.querySelector('.hero-logo-stage'),stars=galaxy?.querySelector('.starfield');
const motion=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(pointer: coarse)');
if(hero&&stage&&stars)initGalaxy();

function initGalaxy(){
  const context=stars.getContext('2d',{alpha:true});
  let seed=72419;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const points=Array.from({length:310},(_,i)=>({x:random(),y:random(),radius:.45+random()*1.15,phase:random()*Math.PI*2,speed:.8+random()*1.8,flare:i<42}));
  let width=0,height=0,renderer,scene,camera,model,skyVisible=true,modelVisible=true,frame=0,lastFrame=0;
  const idle=new Quaternion(),idleEuler=new Euler(),corners=[],projected=new Vector3();
  const interaction=installLogoInteraction(stage,()=>{if(motion.matches)render(performance.now()/1000,1/30);else start();},motion);

  function drawStars(time){
    if(!context)return;
    context.clearRect(0,0,width,height);
    const scroll=window.scrollY*.025;
    for(const star of points){
      const pulse=motion.matches?.6:(Math.sin(time*star.speed+star.phase)+1)/2;
      const alpha=.25+pulse*.75,x=star.x*width,y=((star.y*height-scroll)%height+height)%height;
      context.fillStyle=`rgba(234,243,255,${alpha})`;
      context.beginPath();context.arc(x,y,star.radius*(.8+pulse*.4),0,Math.PI*2);context.fill();
      if(!star.flare)continue;
      const sparkle=motion.matches?.38:Math.pow(Math.max(0,Math.sin(time*(.75+star.speed*.45)+star.phase)),5);
      if(sparkle<.035)continue;
      const radius=3+sparkle*12,glow=context.createRadialGradient(x,y,0,x,y,radius*2.2);
      glow.addColorStop(0,`rgba(236,246,255,${sparkle*.75})`);glow.addColorStop(.18,`rgba(190,217,255,${sparkle*.3})`);glow.addColorStop(1,'rgba(147,181,255,0)');
      context.fillStyle=glow;context.fillRect(x-radius*2.2,y-radius*2.2,radius*4.4,radius*4.4);
      const ray=context.createLinearGradient(x-radius,y,x+radius,y);
      ray.addColorStop(0,'rgba(239,248,255,0)');ray.addColorStop(.5,`rgba(255,255,255,${sparkle})`);ray.addColorStop(1,'rgba(239,248,255,0)');
      context.fillStyle=ray;context.fillRect(x-radius,y-.5,radius*2,1);
      const vertical=context.createLinearGradient(x,y-radius,x,y+radius);
      vertical.addColorStop(0,'rgba(239,248,255,0)');vertical.addColorStop(.5,`rgba(255,255,255,${sparkle})`);vertical.addColorStop(1,'rgba(239,248,255,0)');
      context.fillStyle=vertical;context.fillRect(x-.5,y-radius,1,radius*2);
      context.fillStyle=`rgba(255,255,255,${sparkle})`;context.beginPath();context.arc(x,y,1.1+sparkle,0,Math.PI*2);context.fill();
    }
  }
  function render(time=0,delta=1/30){
    drawStars(time);
    if(!renderer||!model||!modelVisible)return;
    const state=interaction.update(delta);
    if(state.interacted){if(motion.matches)model.quaternion.copy(state.orientation);else model.quaternion.slerp(state.orientation,state.dragging?.5:.22);}
    else {
      idleEuler.set(-.045+(motion.matches?0:Math.sin(time*.28)*.028),-.12+(motion.matches?0:Math.sin(time*.23)*.11),0);
      idle.setFromEuler(idleEuler);if(motion.matches)model.quaternion.copy(idle);else model.quaternion.slerp(idle,.1);
    }
    model.scale.setScalar(state.scale);model.position.y=motion.matches||state.dragging?0:Math.sin(time*.65)*.016;
    // Fit every orientation, including diagonal roll, without clipping the pole.
    let distance=5.2;const tangent=Math.tan(camera.fov*Math.PI/360);
    for(const corner of corners){projected.copy(corner).applyQuaternion(model.quaternion).multiplyScalar(state.scale);distance=Math.max(distance,Math.abs(projected.y)*1.06/tangent+projected.z,Math.abs(projected.x)*1.06/(tangent*camera.aspect)+projected.z);}
    camera.position.z=distance;
    renderer.render(scene,camera);
  }
  function tick(now){
    frame=0;
    if(!skyVisible||document.hidden||motion.matches||document.body.classList.contains('dialog-open'))return;
    if(now-lastFrame>=32){const delta=Math.min(.06,(now-lastFrame)/1000);lastFrame=now;render(now/1000,delta);}
    frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame&&skyVisible&&!document.hidden&&!motion.matches&&!document.body.classList.contains('dialog-open'))frame=requestAnimationFrame(tick);}
  function sync(){
    cancelAnimationFrame(frame);frame=0;
    const blocked=document.body.classList.contains('dialog-open');
    galaxy.dataset.motion=!skyVisible||document.hidden||blocked?'paused':motion.matches?'reduced':'running';
    hero.dataset.motion=!modelVisible||document.hidden||blocked?'paused':motion.matches?'reduced':'running';
    if(blocked||document.hidden)interaction.cancel();
    if(skyVisible&&!document.hidden){render(performance.now()/1000);start();}
  }
  function resize(){
    const pixelRatio=Math.min(devicePixelRatio||1,touch.matches?1.6:2);
    width=stars.clientWidth;height=stars.clientHeight;
    stars.width=Math.round(width*pixelRatio);stars.height=Math.round(height*pixelRatio);context?.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    if(renderer){renderer.setPixelRatio(pixelRatio);renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}
    sync();
  }
  new ResizeObserver(resize).observe(stage);new ResizeObserver(resize).observe(stars.parentElement);
  new IntersectionObserver(entries=>{skyVisible=entries[0].isIntersecting;document.body.classList.toggle('hero-visible',skyVisible);sync();},{rootMargin:'-95px 0px 0px 0px'}).observe(galaxy);
  new IntersectionObserver(entries=>{modelVisible=entries[0].isIntersecting;sync();},{rootMargin:'-95px 0px 0px 0px'}).observe(stage);
  document.addEventListener('visibilitychange',sync);
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});motion.addEventListener('change',sync);

  try{
    renderer=new WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=SRGBColorSpace;
    renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    renderer.domElement.className='hero-model-canvas';renderer.domElement.setAttribute('aria-hidden','true');stage.prepend(renderer.domElement);
    scene=new Scene();camera=new PerspectiveCamera(32,1.28,.1,50);camera.position.set(0,0,5.2);
    // High dynamic range studio softboxes produce real, moving chrome reflections.
    const w=1024,h=512,data=new Float32Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=x/w,v=y/h;
      let value=.07+.11*Math.pow(Math.sin(v*Math.PI),2);
      value+=2.3*Math.exp(-(((v-.38)/.024)**2))+1.9*Math.exp(-(((v-.61)/.023)**2))+1.75*Math.exp(-(((v-.505)/.009)**2));
      for(const [center,spread,strength] of [[.12,.014,6],[.48,.016,7],[.89,.022,6]]){
        const distance=Math.min(Math.abs(u-center),1-Math.abs(u-center));
        value+=strength*Math.exp(-((distance/spread)**4))*Math.exp(-(((v-.5)/.3)**8));
      }
      const i=(y*w+x)*4;data[i]=value*.96;data[i+1]=value;data[i+2]=value*1.05;data[i+3]=1;
    }
    const texture=new DataTexture(data,w,h,RGBAFormat,FloatType);texture.mapping=EquirectangularReflectionMapping;texture.needsUpdate=true;
    const pmrem=new PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(texture);scene.environment=environment.texture;texture.dispose();pmrem.dispose();
    const key=new PointLight(0xffffff,10,0,2);key.position.set(2.5,3,4);scene.add(key);
    const rim=new PointLight(0xc8dcff,8,0,2);rim.position.set(-3,-1,2);scene.add(rim);
    const fill=new DirectionalLight(0xffffff,.35);fill.position.set(-2,1,4);scene.add(fill);
    new GLTFLoader().load(new URL('./assets/luxe-fade-logo.glb?v=mirror3',import.meta.url).href,gltf=>{
      model=gltf.scene;let meshCount=0,vertexCount=0;
      model.traverse(object=>{if(object.isMesh){meshCount++;vertexCount+=object.geometry.attributes.position.count;object.material.envMapIntensity=1.15;}});
      const box=new Box3().setFromObject(model);
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new Vector3(x,y,z));
      model.quaternion.copy(interaction.state.orientation);scene.add(model);resize();render(performance.now()/1000);
      stage.classList.add('is-ready');stage.dataset.renderMode='webgl';stage.dataset.modelMeshes=String(meshCount);stage.dataset.modelVertices=String(vertexCount);sync();
    },undefined,()=>{stage.dataset.renderMode='fallback';stage.parentElement.querySelector('.logo-controls').hidden=true;});
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();stage.classList.remove('is-ready');stage.dataset.renderMode='fallback';interaction.cancel();cancelAnimationFrame(frame);});
    renderer.domElement.addEventListener('webglcontextrestored',()=>{if(model){stage.classList.add('is-ready');stage.dataset.renderMode='webgl';sync();}});
  }catch{renderer=undefined;stage.dataset.renderMode='fallback';stage.parentElement.querySelector('.logo-controls').hidden=true;}
  resize();
}
