import {Quaternion,Vector3,Euler} from './assets/three-runtime.js?v=mirror3';

export function installLogoInteraction(stage,onChange,reducedMotion){
  const initial=new Quaternion().setFromEuler(new Euler(-.045,-.12,0));
  const state={orientation:initial.clone(),scale:1,dragging:false,interacted:false};
  const pointers=new Map(),spin=new Quaternion(),axis=new Vector3();
  const reset=stage.parentElement.querySelector('.logo-reset');
  let speed=0,lastMove=0,pinch;
  function sphere(point){
    const rect=stage.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.52;
    const x=(point.x-rect.left-rect.width/2)/radius,y=(rect.top+rect.height/2-point.y)/radius;
    const length=x*x+y*y;
    return new Vector3(x,y,length<=.5?Math.sqrt(1-length):.5/Math.sqrt(length)).normalize();
  }
  function changed(){
    state.interacted=true;reset.hidden=false;
    stage.dataset.rotation=state.orientation.toArray().map(n=>n.toFixed(4)).join(',');
    stage.dataset.zoom=state.scale.toFixed(3);onChange();
  }
  function pair(){const [a,b]=[...pointers.values()];return {distance:Math.hypot(b.x-a.x,b.y-a.y),angle:Math.atan2(b.y-a.y,b.x-a.x)};}
  stage.addEventListener('pointerdown',event=>{
    if(stage.dataset.renderMode!=='webgl'||event.button>0)return;
    event.preventDefault();stage.classList.add('pointer-focused');stage.focus({preventScroll:true});stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});speed=0;state.dragging=true;stage.classList.add('is-dragging');
    if(pointers.size===2)pinch=pair();
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    event.preventDefault();const previous=pointers.get(event.pointerId),next={x:event.clientX,y:event.clientY};pointers.set(event.pointerId,next);
    if(pointers.size===1){
      spin.setFromUnitVectors(sphere(previous),sphere(next));state.orientation.premultiply(spin).normalize();
      const angle=2*Math.acos(Math.min(1,Math.abs(spin.w))),now=performance.now();
      axis.set(spin.x,spin.y,spin.z).normalize();speed=Math.min(.045,angle*16/Math.max(16,now-lastMove));lastMove=now;
    }else if(pointers.size===2){
      const current=pair();state.scale=Math.max(.72,Math.min(1.12,state.scale*current.distance/Math.max(1,pinch.distance)));
      spin.setFromAxisAngle(new Vector3(0,0,1),pinch.angle-current.angle);state.orientation.premultiply(spin).normalize();pinch=current;
    }
    changed();
  });
  function release(event){
    if(!pointers.delete(event.pointerId))return;
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    state.dragging=pointers.size>0;stage.classList.toggle('is-dragging',state.dragging);
    if(performance.now()-lastMove>100||reducedMotion.matches)speed=0;
    if(pointers.size===1){pinch=undefined;speed=0;}onChange();
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,release);
  function restore(){state.orientation.copy(initial);state.scale=1;state.interacted=false;speed=0;reset.hidden=true;stage.dataset.rotation=initial.toArray().join(',');onChange();}
  reset.addEventListener('click',restore);
  stage.addEventListener('keydown',event=>{
    stage.classList.remove('pointer-focused');
    const keys={ArrowLeft:[0,1,0,.12],ArrowRight:[0,1,0,-.12],ArrowUp:[1,0,0,.12],ArrowDown:[1,0,0,-.12]};
    if(event.key==='Home'||event.key==='Escape'){event.preventDefault();restore();return;}
    if(!keys[event.key])return;
    event.preventDefault();const [x,y,z,angle]=keys[event.key];state.orientation.premultiply(spin.setFromAxisAngle(new Vector3(x,y,z),angle)).normalize();speed=0;changed();
  });
  return {state,update(delta){
    if(!state.dragging&&!reducedMotion.matches&&speed>.0001){state.orientation.premultiply(spin.setFromAxisAngle(axis,speed*delta*60)).normalize();speed*=Math.pow(.88,delta*60);}
    return state;
  },cancel(){for(const id of pointers.keys())if(stage.hasPointerCapture(id))stage.releasePointerCapture(id);pointers.clear();state.dragging=false;speed=0;stage.classList.remove('is-dragging');}};
}
