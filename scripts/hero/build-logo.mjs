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
const material=new THREE.MeshPhysicalMaterial({color:0xe8eef5,metalness:1,roughness:.14,clearcoat:1,clearcoatRoughness:.08});
material.name='Polished chrome';
for(const [i,data] of shapes.entries()){
  const shape=new THREE.Shape(data.outline.map(p=>new THREE.Vector2(...p)));
  shape.closePath();
  for(const hole of data.holes){const path=new THREE.Path(hole.map(p=>new THREE.Vector2(...p)));path.closePath();shape.holes.push(path);}
  const isPole=data.outline.every(p=>p[1]>.1);
  let geometry=new THREE.ExtrudeGeometry(shape,{depth:isPole?.12:.085,steps:1,bevelEnabled:true,bevelSegments:4,bevelThickness:.006,bevelSize:.004,curveSegments:8});
  const position=geometry.attributes.position;
  for(let v=0;v<position.count;v++){
    const x=position.getX(v),y=position.getY(v);
    position.setZ(v,position.getZ(v)+.055*Math.cos(x*1.3)+.02*Math.cos(y*1.7));
  }
  geometry.deleteAttribute('uv');geometry.deleteAttribute('normal');
  geometry=mergeVertices(geometry,.00001);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.name=(isPole?'Barber pole ':'Original lettering ')+String(i+1);model.add(mesh);
}
const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());
model.children.forEach(mesh=>mesh.position.sub(center));
const scene=new THREE.Scene();scene.add(model);
const glb=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
const destination=new URL('../../assets/luxe-fade-logo.glb',import.meta.url);
fs.writeFileSync(destination,Buffer.from(glb));
console.log(JSON.stringify({file:destination,bytes:glb.byteLength,meshes:model.children.length,bounds:box.getSize(new THREE.Vector3()).toArray(),metalness:material.metalness,source:'Original user-supplied logo silhouette'}));
