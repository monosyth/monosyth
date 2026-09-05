import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { BagPatternPlan } from "@/lib/sewing/bag-pattern";
import type { OuterPanelComposition } from "@/lib/sewing/panel-composition";

export const fabricPalettes = [
  { name: "Iris", outer: "#8170b2", lining: "#83c8bc", contrast: "#293c54", thread: "#d8c9ab", patches: ["#8170b2", "#c9857e", "#579ca2", "#c7a46b", "#c8bd9c"] },
  { name: "Ocean", outer: "#3e8296", lining: "#e0b89b", contrast: "#253a4d", thread: "#ded2b8", patches: ["#477f90", "#d7c9a8", "#738ea9", "#b58c71", "#769a92"] },
  { name: "Terracotta", outer: "#bb795f", lining: "#86b9af", contrast: "#573a39", thread: "#e9c99b", patches: ["#bb795f", "#dab590", "#748c79", "#665e80", "#c9bca3"] },
] as const;
export type FabricPalette = typeof fabricPalettes[number];

function canvas2D(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Fabric texture canvas unavailable");
  return { canvas, context };
}

/** Original procedural weave, not a photograph or a downloaded texture. */
export function createWeaveTexture(width: number, height: number, coarse = false) {
  const { canvas, context } = canvas2D(128,128);
  const data = context.createImageData(128,128);
  for (let y=0;y<128;y++) for (let x=0;x<128;x++) {
    const cellX = Math.floor(x/8), cellY = Math.floor(y/8);
    const over = (cellX+cellY)%2 === 0;
    const strand = Math.sin(((over ? x : y)%8+.5)/8*Math.PI);
    const fiber = Math.sin(x*13+y*7)*4 + Math.cos(x*3-y*19)*3;
    const value = Math.round(100+strand*75+fiber);
    const index = (y*128+x)*4;
    data.data[index] = data.data[index+1] = data.data[index+2] = value;
    data.data[index+3] = 255;
  }
  context.putImageData(data,0,0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(Math.max(.5,width)*(coarse?.7:1.5),Math.max(.5,height)*(coarse?.7:1.5));
  texture.anisotropy = 8;
  return texture;
}

export function createPanelTexture(plan: BagPatternPlan, composition: OuterPanelComposition, face: "front" | "back", palette: FabricPalette) {
  const aspect = plan.boundingCutWidth/Math.max(.1,plan.cutHeight);
  const w = aspect>=1 ? 1024 : Math.max(256,Math.round(1024*aspect));
  const h = aspect>=1 ? Math.max(256,Math.round(1024/aspect)) : 1024;
  const {canvas,context:ctx} = canvas2D(w,h);
  const scaleX = w/Math.max(.1,plan.boundingCutWidth), scaleY = h/Math.max(.1,plan.cutHeight);
  ctx.fillStyle = palette.outer;
  ctx.fillRect(0,0,w,h);
  const pieced = composition.design.mode!=="solid" && (composition.design.scope==="both" || composition.design.scope===face);
  if(pieced) {
    const cols = [0,...composition.columnSeams,composition.targetWidth];
    const rows = [0,...composition.rowSeams,composition.upperCutHeight];
    for(let row=0;row<rows.length-1;row++) for(let col=0;col<cols.length-1;col++) {
      ctx.fillStyle = palette.patches[(row*2+col)%palette.patches.length];
      ctx.fillRect(cols[col]*scaleX,rows[row]*scaleY,(cols[col+1]-cols[col])*scaleX+1,(rows[row+1]-rows[row])*scaleY+1);
    }
    ctx.strokeStyle = "rgba(24,25,38,.28)";
    ctx.lineWidth = Math.max(1,scaleX*.035);
    ctx.beginPath();
    for(const col of composition.columnSeams) { ctx.moveTo(col*scaleX,0); ctx.lineTo(col*scaleX,h); }
    for(const row of composition.rowSeams) { ctx.moveTo(0,row*scaleY); ctx.lineTo(w,row*scaleY); }
    ctx.stroke();
  }
  if(composition.contrastJoinY!==null) {
    ctx.fillStyle=palette.contrast;
    ctx.fillRect(0,composition.contrastJoinY*scaleY,w,h);
  }
  // Tiny thread variation supplies albedo grain; the separate bump map catches light.
  ctx.globalAlpha=.045;
  for(let y=0;y<h;y+=3) {ctx.fillStyle=y%2?"#fff":"#000";ctx.fillRect(0,y,w,1);}
  for(let x=0;x<w;x+=3) {ctx.fillStyle=x%2?"#fff":"#000";ctx.fillRect(x,0,1,h);}
  const texture = new CanvasTexture(canvas);
  texture.colorSpace=SRGBColorSpace;
  texture.anisotropy=8;
  return texture;
}
