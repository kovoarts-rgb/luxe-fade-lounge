import {build} from 'esbuild';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('./runtime-entry.mjs',import.meta.url))],outfile:fileURLToPath(new URL('assets/three-runtime.js',root)),bundle:true,minify:true,format:'esm',target:['es2022'],legalComments:'inline'});
fs.copyFileSync(new URL('node_modules/three/LICENSE',root),new URL('assets/three-license.txt',root));
console.log('Built local Three.js renderer and GLTF loader.');
