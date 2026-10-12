import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');this.onloadend?.();});}
};
const shapes=JSON.parse(fs.readFileSync(new URL('./logo-contours.json',import.meta.url),'utf8'));
const model=new THREE.Group();model.name='Luxe Fade Lounge - original logo in chrome';
const material=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:1,roughness:.055,clearcoat:1,clearcoatRoughness:.035});
material.name='Mirror-polished chrome';

// Preserve the original serif corners while replacing raster steps with curves.
function contourPath(points,Shape=THREE.Path){
  const path=new Shape(),p=points.map(v=>new THREE.Vector2(...v));
  const tangent=p.map((point,i)=>{
    const previous=p[(i+p.length-1)%p.length],next=p[(i+1)%p.length];
    const a=point.clone().sub(previous).normalize(),b=next.clone().sub(point).normalize();
    return a.dot(b)<.76?null:next.clone().sub(previous).normalize();
  });
  path.moveTo(p[0].x,p[0].y);
  for(let i=0;i<p.length;i++){
    const j=(i+1)%p.length,a=p[i],b=p[j],distance=a.distanceTo(b),direction=b.clone().sub(a).normalize();
    const c1=a.clone().addScaledVector(tangent[i]||direction,distance/3);
    const c2=b.clone().addScaledVector(tangent[j]||direction,-distance/3);
    if(!tangent[i]&&!tangent[j])path.lineTo(b.x,b.y);
    else path.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,b.x,b.y);
  }
  path.closePath();return path;
}

// Subdivide the broad cap faces before curving them, so reflections stay smooth.
function refinedGeometry(input,depth){
  const position=input.attributes.position,output=[];
  function triangle(a,b,c,level=0){
    const edges=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)];
    const longest=Math.max(...edges);
    if(longest>.075**2&&level<10){
      const edge=edges.indexOf(longest);
      if(edge===0){const m=a.clone().add(b).multiplyScalar(.5);triangle(a,m,c,level+1);triangle(m,b,c,level+1);}
      else if(edge===1){const m=b.clone().add(c).multiplyScalar(.5);triangle(a,b,m,level+1);triangle(a,m,c,level+1);}
      else {const m=c.clone().add(a).multiplyScalar(.5);triangle(a,b,m,level+1);triangle(m,b,c,level+1);}
      return;
    }
    for(const v of [a,b,c])output.push(v.x,v.y,v.z+.10*Math.cos(v.x*1.3)+.033*Math.cos(v.y*1.7));
  }
  for(let i=0;i<position.count;i+=3){
    const a=new THREE.Vector3().fromBufferAttribute(position,i),b=new THREE.Vector3().fromBufferAttribute(position,i+1),c=new THREE.Vector3().fromBufferAttribute(position,i+2);
    // Only the front/back caps need tessellation; the bevel already has 12 rings.
    if(Math.abs(a.z-b.z)<.00001&&Math.abs(a.z-c.z)<.00001)triangle(a,b,c);
    else for(const v of [a,b,c])output.push(v.x,v.y,v.z+.10*Math.cos(v.x*1.3)+.033*Math.cos(v.y*1.7));
  }
  let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(output,3));
  geometry=mergeVertices(geometry,.00001);geometry.computeVertexNormals();
  const p=geometry.attributes.position,n=geometry.attributes.normal,normal=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i)-.10*Math.cos(x*1.3)-.033*Math.cos(y*1.7);
    const front=Math.abs(z-depth-.010)<.00001,back=Math.abs(z+.010)<.00001;
    if(front||back){normal.set(.13*Math.sin(x*1.3),.0561*Math.sin(y*1.7),1).normalize();if(back)normal.negate();n.setXYZ(i,normal.x,normal.y,normal.z);}
  }
  input.dispose();return geometry;
}
for(const [i,data] of shapes.entries()){
  const shape=contourPath(data.outline,THREE.Shape);
  for(const hole of data.holes)shape.holes.push(contourPath(hole));
  const isPole=data.outline.every(p=>p[1]>.1);
  const depth=isPole?.16:.12;
  const extruded=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:16,bevelThickness:.010,bevelSize:.005,curveSegments:6});
  const geometry=refinedGeometry(extruded,depth);
  const mesh=new THREE.Mesh(geometry,material);mesh.name=(isPole?'Barber pole ':'Original lettering ')+String(i+1);model.add(mesh);
}
const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());
model.children.forEach(mesh=>mesh.position.sub(center));
const scene=new THREE.Scene();scene.add(model);
const glb=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
const destination=new URL('../../assets/luxe-fade-logo.glb',import.meta.url);
fs.writeFileSync(destination,Buffer.from(glb));
console.log(JSON.stringify({file:destination,bytes:glb.byteLength,meshes:model.children.length,vertices:model.children.reduce((n,m)=>n+m.geometry.attributes.position.count,0),bounds:box.getSize(new THREE.Vector3()).toArray(),metalness:material.metalness,roughness:material.roughness,source:'Original user-supplied logo silhouette, refined curves and 16-segment bevels'}));
