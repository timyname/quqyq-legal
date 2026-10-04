import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {JSDOM} from 'jsdom';
const base='/quqyq-legal';
async function visit(dir){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await visit(file);else if(e.name.endsWith('.html')){const dom=new JSDOM(await readFile(file,'utf8'));for(const el of dom.window.document.querySelectorAll('[href],[src],[srcset]')){for(const name of ['href','src']){const v=el.getAttribute(name);if(v?.startsWith('/')&&!v.startsWith('//'))el.setAttribute(name,base+v);}const set=el.getAttribute('srcset');if(set)el.setAttribute('srcset',set.split(',').map(x=>x.trim().startsWith('/')?base+x.trim():x.trim()).join(', '));}await writeFile(file,dom.serialize());dom.window.close();}else if(e.name.endsWith('.css')){const css=await readFile(file,'utf8');await writeFile(file,css.replace(/url\(['"]?\/(?!\/)/g,m=>m+base.slice(1)+'/'));}}}
await visit('dist');await writeFile('dist/.nojekyll','');
