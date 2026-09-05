import assert from "node:assert/strict";
import { calculateBagPatternPlan, draftFromFinishedSize, type BagClosure } from "../src/lib/sewing/bag-pattern";
import { calculateBoxyBagPlan, draftFromFinishedBoxyBag } from "../src/lib/sewing/boxy-bag";
import { getBagModel, surfaceGeometry, floorGeometry, handleGeometry } from "../src/components/app/bag-outcome-preview/model-geometry";

const options={handleMaterial:"webbing" as const,handleDrop:8,handleWidth:1.25,handleInset:3.5,handleAttachmentDepth:3,sideZipperLength:8,sideZipperSide:"right" as const,zipperGap:.25,recessDepth:1.5,recessEndGap:.5,recessEndStyle:"boxed" as const,recessNotch:.75};
let checks=0;
const sizes=[{baseWidth:14,height:12,depth:4},{baseWidth:6,height:4,depth:2},{baseWidth:24,height:8,depth:10},{baseWidth:8,height:22,depth:3}];
for(const size of sizes)for(const closure of ["open-tote","top-zipper","side-zipper","zipper-gusset","recessed-zipper"] as BagClosure[])for(const boxy of [false,true]) {
  const plan=boxy?calculateBoxyBagPlan(draftFromFinishedBoxyBag({length:size.baseWidth,width:size.depth,height:size.height,seamAllowance:.25})):calculateBagPatternPlan(draftFromFinishedSize({...size,seamAllowance:.25}));
  const original=JSON.stringify(plan);
  const model=getBagModel(plan,boxy?"four-corner-boxy":"two-panel-tote",closure,options);
  assert.equal(model.width,size.baseWidth);assert.equal(model.depth,size.depth);assert.equal(model.height,size.height);checks+=3;
  const geometries=[surfaceGeometry(model,plan,"front"),surfaceGeometry(model,plan,"back"),surfaceGeometry(model,plan,"front",true),floorGeometry(model),floorGeometry(model,true),handleGeometry(model,options,1),handleGeometry(model,options,-1)];
  for(const geometry of geometries) {
    for(const name of ["position","normal","uv"]){assert([...geometry.getAttribute(name).array].every(Number.isFinite),`${name} must stay finite`);checks++;}
    assert(geometry.index&&geometry.index.count>0);checks++;
    geometry.dispose();
  }
  assert.equal(JSON.stringify(plan),original,"Rendering must never mutate pattern calculations");checks++;
  // Inside and outside floors face opposite directions.
  const exterior=floorGeometry(model),interior=floorGeometry(model,true);
  assert(exterior.getAttribute("normal").getY(0)<0);assert(interior.getAttribute("normal").getY(0)>0);checks+=2;
  exterior.dispose();interior.dispose();
}
console.log(`${checks} 3D geometry checks passed across ${sizes.length*5*2} tote / boxy / closure combinations`);
