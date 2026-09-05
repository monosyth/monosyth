/** Isolated, local-only visual fixture: never adds an unauthenticated app route. */
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=process.env.BAG_PREVIEW_QA_OUTPUT??"/Users/scottwaite/monosyth/bag-3d-preview-qa";
await mkdir(output,{recursive:true});
const entry=`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BagPreview3D from '@/components/app/bag-outcome-preview/bag-preview-3d';
import {calculateBagPatternPlan,draftFromFinishedSize} from '@/lib/sewing/bag-pattern';
import {calculateBoxyBagPlan,draftFromFinishedBoxyBag} from '@/lib/sewing/boxy-bag';
import {calculateOuterPanelComposition,defaultOuterPanelDesign} from '@/lib/sewing/panel-composition';
function Fixture(){
 const [mode,setMode]=useState('Tote'),[yaw,setYaw]=useState(30);
 const plan=mode==='Boxy'?calculateBoxyBagPlan(draftFromFinishedBoxyBag({length:8,width:3.5,height:5,seamAllowance:.25})):calculateBagPatternPlan(draftFromFinishedSize({baseWidth:14,height:12,depth:4,seamAllowance:.25}));
 const options={handleMaterial:'webbing',handleDrop:8,handleWidth:1.25,handleInset:3.5,handleAttachmentDepth:3,sideZipperLength:8,sideZipperSide:'right',zipperGap:.25,recessDepth:1.5,recessEndGap:.5,recessEndStyle:'boxed',recessNotch:.75};
 const design={...defaultOuterPanelDesign,...(mode==='Patchwork'?{mode:'block-grid',rows:7,columns:9,blockSize:2.5,contrastEnabled:true,contrastRise:2}:{} )};
 const composition=calculateOuterPanelComposition(plan,design);
 return <><nav style={{display:'flex',gap:10,marginBottom:12}}>{['Tote','Boxy','Recessed','Patchwork','Top zip','Gusset','Side zip'].map(m=><button key={m} onClick={()=>setMode(m)}>{m}</button>)}<output data-yaw>{yaw.toFixed(2)}</output></nav><BagPreview3D plan={plan} bodyRecipe={mode==='Boxy'?'four-corner-boxy':'two-panel-tote'} closure={mode==='Recessed'?'recessed-zipper':mode==='Boxy'||mode==='Top zip'?'top-zipper':mode==='Gusset'?'zipper-gusset':mode==='Side zip'?'side-zipper':'open-tote'} options={options} composition={composition} yaw={yaw} onYawChange={setYaw}/></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
`;
const bundle=await build({stdin:{contents:entry,loader:"tsx",resolveDir:root,sourcefile:"bag-3d-fixture.tsx"},absWorkingDir:root,alias:{"@":path.join(root,"src")},bundle:true,write:false,outfile:"preview.js",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},minify:true});
const js=bundle.outputFiles.find(f=>f.path.endsWith(".js")).contents;
const css=bundle.outputFiles.find(f=>f.path.endsWith(".css")).contents;
const server=createServer((req,res)=>{
 if(req.url==="/preview.js"){res.setHeader("Content-Type","text/javascript");res.end(js);return;}
 if(req.url==="/preview.css"){res.setHeader("Content-Type","text/css");res.end(css);return;}
 res.setHeader("Content-Type","text/html");
 res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/preview.css"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#09131e;color:white;font-family:Arial,sans-serif}#root{max-width:1120px;margin:auto}nav{flex-wrap:wrap}nav button{padding:10px;border:1px solid #516170;border-radius:5px;background:#172a3b;color:white;cursor:pointer}@media(max-width:600px){body{padding:8px}}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
if (process.env.BAG_PREVIEW_QA_SERVE === "1") {
  console.log(`Local 3D bag preview: http://127.0.0.1:${port}`);
} else {
const browser=await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true,args:["--enable-webgl","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:1250},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await page.goto(`http://127.0.0.1:${port}`);
 await page.locator('canvas').waitFor();
 await page.waitForTimeout(1400);
 for(const mode of ['Tote','Boxy','Recessed','Patchwork','Top zip','Gusset','Side zip']) {
   await page.getByRole('button',{name:mode,exact:true}).click();
   await page.getByRole('button',{name:'Reset view',exact:true}).click();
   await page.waitForTimeout(900);
   await page.locator('[data-bag-preview="three"]').screenshot({path:path.join(output,`${mode.toLowerCase().replaceAll(' ','-')}.png`)});
 }
 await page.getByRole('button',{name:'Recessed',exact:true}).click();
 await page.getByRole('button',{name:'Look inside',exact:true}).click();
 await page.waitForTimeout(700);
 await page.locator('[data-bag-preview="three"]').screenshot({path:path.join(output,'inside.png')});
 await page.getByRole('button',{name:'Finished bag',exact:true}).click();
 const before=Number(await page.locator('[data-yaw]').textContent());
 const canvas=page.locator('canvas');const rect=await canvas.boundingBox();
 await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);
 await page.mouse.down();await page.mouse.move(rect.x+rect.width*.73,rect.y+rect.height*.62,{steps:18});await page.mouse.up();
 await page.waitForFunction(value=>Math.abs(Number(document.querySelector('[data-yaw]').textContent)-value)>5,before,{timeout:15000});
 const after=Number(await page.locator('[data-yaw]').textContent());
 assert(Math.abs(after-before)>5,`Orbit drag must update the saved yaw (${before} → ${after})`);
 for(const name of ['Front','Side','Back','Top','Bottom','Zoom in','Zoom out','Reset view'])await page.getByRole('button',{name,exact:true}).click();
 await page.getByRole('button',{name:'Ocean preview palette'}).click();
 await page.getByRole('button',{name:'Auto spin',exact:true}).click();
 await page.waitForTimeout(600);
 await page.getByRole('button',{name:'Pause spin',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].find(el=>el.textContent==='Auto spin')?.disabled);
 assert(await page.getByRole('button',{name:'Auto spin',exact:true}).isDisabled(),'Reduced motion disables auto spin');
 await page.setViewportSize({width:390,height:1100});
 await page.getByRole('button',{name:'Patchwork',exact:true}).click();
 await page.getByRole('button',{name:'Reset view',exact:true}).click();
 await page.waitForTimeout(900);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Phone view should not overflow horizontally');
 await page.screenshot({path:path.join(output,'phone.png'),fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({passed:true,fixtures:7,orbit:{before,after},checks:['all closure modes','cutaway','360 orbit and saved yaw','presets','zoom','palette','auto spin','reduced motion','phone width','no runtime errors'],screenshots:output},null,2));
}finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
