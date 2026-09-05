import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { clamp, type BagPatternPlan, type BagBodyRecipe, type BagClosure } from "@/lib/sewing/bag-pattern";
import type { BagOutcomeOptions } from "./bag-outcome-preview";

export type BagModel = ReturnType<typeof getBagModel>;

/** Inches remain the common model unit; display scale never feeds cutting math. */
export function getBagModel(plan: BagPatternPlan, recipe: BagBodyRecipe, closure: BagClosure, options: BagOutcomeOptions) {
  const boxy = recipe === "four-corner-boxy";
  const width = Math.max(0.5, plan.finishedBaseWidth);
  const height = Math.max(0.5, plan.finishedHeight);
  const depth = Math.max(0.25, plan.finishedDepth);
  const ridge = !boxy && closure === "top-zipper";
  const topWidth = boxy ? width : Math.max(0.5, plan.finishedTopOpening - (ridge ? 0 : depth));
  const topDepth = ridge ? 0.12 : depth;
  const shift = boxy ? 0 : (plan.leftTopInset - plan.rightTopInset) / 2;
  const handles = !boxy && closure === "open-tote";
  const totalHeight = height + (handles ? options.handleDrop + options.handleWidth : 0);
  const scale = 4.4 / Math.max(width, topWidth + Math.abs(shift) * 2, totalHeight, depth);
  return { width, height, depth, topWidth, topDepth, shift, boxy, ridge, handles, totalHeight, scale };
}

/** Constant-distance rounded rim, starting at the left side seam. */
export function rimPoint(u: number, width: number, depth: number, radius: number): [number, number] {
  const r = Math.min(radius, width / 2.1, depth / 2.1);
  const x = width / 2, z = depth / 2;
  const arc = Math.PI * r / 2;
  const segments: Array<{ length: number; at: (t: number) => [number, number] }> = [
    { length: z-r, at: t => [-x, t*(z-r)] },
    { length: arc, at: t => [-x+r+r*Math.cos(Math.PI-t*Math.PI/2), z-r+r*Math.sin(Math.PI-t*Math.PI/2)] },
    { length: width-2*r, at: t => [-x+r+t*(width-2*r), z] },
    { length: arc, at: t => [x-r+r*Math.cos(Math.PI/2-t*Math.PI/2), z-r+r*Math.sin(Math.PI/2-t*Math.PI/2)] },
    { length: depth-2*r, at: t => [x, z-r-t*(depth-2*r)] },
    { length: arc, at: t => [x-r+r*Math.cos(-t*Math.PI/2), -z+r+r*Math.sin(-t*Math.PI/2)] },
    { length: width-2*r, at: t => [x-r-t*(width-2*r), -z] },
    { length: arc, at: t => [-x+r+r*Math.cos(-Math.PI/2-t*Math.PI/2), -z+r+r*Math.sin(-Math.PI/2-t*Math.PI/2)] },
    { length: z-r, at: t => [-x, -z+r+t*(z-r)] },
  ];
  let travel = clamp(u, 0, 1) * segments.reduce((sum, seg) => sum + seg.length, 0);
  for (const seg of segments) {
    if (travel <= seg.length) return seg.at(seg.length > 0 ? travel / seg.length : 0);
    travel -= seg.length;
  }
  return [-x, 0];
}

export function bodyPoint(model: BagModel, u: number, v: number, lining = false) {
  const { width, height, depth, topWidth, topDepth, shift, boxy } = model;
  const edgeRoll = Math.pow(Math.abs(v - 0.5) * 2, 16) * Math.min(depth * .018, .065);
  // Shallow inward folds keep the measured envelope intact, rather than inflating it.
  const wave = Math.sin(u * Math.PI * 10 + v * 3) ** 2;
  const softInset = Math.sin(v * Math.PI) * (boxy ? .035 + .055*wave : .055 + .16*wave);
  const inset = edgeRoll + softInset + (lining ? Math.min(.055, depth * .06) : 0);
  const w = Math.max(.1, width + (topWidth - width) * v - inset * 2);
  const d = Math.max(.08, depth + (topDepth - depth) * v - inset * 2);
  const [x, z] = rimPoint(u, w, d, Math.min(.32, depth * .095));
  const mouthDip = boxy || model.ridge ? 0 : .07 * Math.sin(u * Math.PI * 2) ** 2 * v ** 10;
  return new Vector3(x + shift * v, v * height - mouthDip + (lining ? .012 : 0), z);
}

export function surfaceGeometry(model: BagModel, plan: BagPatternPlan, face: "front" | "back", lining = false) {
  const columns = 96, rows = 32;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const start = face === "front" ? 0 : .5;
  const topRaw = model.boxy ? plan.cornerCut + plan.seamAllowance : plan.topTakeUp;
  const bottomRaw = plan.cutHeight - plan.cornerCut - plan.seamAllowance;
  for (let y = 0; y <= rows; y++) {
    const v = y / rows;
    for (let x = 0; x <= columns; x++) {
      const t = x / columns;
      const p = bodyPoint(model, start + t / 2, v, lining);
      positions.push(p.x, p.y, p.z);
      // Map the assembled face back to its raw panel, including hidden seam margins.
      const left = model.boxy ? plan.seamAllowance : plan.seamAllowance + plan.leftTopInset * v - Math.min(0, plan.leftTopInset);
      const right = model.boxy ? plan.cutWidth - plan.seamAllowance : plan.cutWidth - plan.seamAllowance - plan.rightTopInset * v - Math.min(0, plan.leftTopInset);
      uvs.push((left + t * (right-left)) / plan.boundingCutWidth, 1 - (bottomRaw + (topRaw-bottomRaw)*v) / plan.cutHeight);
      if (x < columns && y < rows) {
        const a = y * (columns+1) + x;
        indices.push(a, a+1, a+columns+1, a+1, a+columns+2, a+columns+1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function floorGeometry(model: BagModel, lining = false) {
  const positions = [0, lining ? .07 : .015, 0], uvs = [.5,.5], indices: number[] = [];
  for (let i = 0; i <= 160; i++) {
    const p = bodyPoint(model, i/160, 0, lining);
    positions.push(p.x, lining ? .07 : .015, p.z);
    uvs.push(p.x/model.width+.5, p.z/model.depth+.5);
    if (i < 160) indices.push(0, lining ? i+1 : i+2, lining ? i+2 : i+1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions,3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Ribbon follows the same elliptical centerline as the handle cutting calculator. */
export function handleGeometry(model: BagModel, options: BagOutcomeOptions, side: 1 | -1) {
  const width = Math.max(.1, options.handleWidth);
  const spacing = Math.max(width, model.topWidth - 2 * options.handleInset);
  const drop = Math.max(.1, options.handleDrop) + width / 2;
  const attachment = Math.min(model.height-.1, Math.max(.1, options.handleAttachmentDepth));
  const centers: Vector3[] = [];
  for (let i=0;i<=12;i++) centers.push(new Vector3(-spacing/2, model.height-attachment+attachment*i/12, side*(model.topDepth/2+.055)));
  for (let i=1;i<=96;i++) {
    const a = Math.PI - i/96*Math.PI;
    centers.push(new Vector3(Math.cos(a)*spacing/2, model.height+Math.sin(a)*drop, side*(model.topDepth/2+.055 + Math.sin(a)*.18)));
  }
  for (let i=1;i<=12;i++) centers.push(new Vector3(spacing/2, model.height-attachment*i/12, side*(model.topDepth/2+.055)));
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i=0;i<centers.length;i++) {
    const tangent = centers[Math.min(i+1,centers.length-1)].clone().sub(centers[Math.max(0,i-1)]).normalize();
    const normal = new Vector3(tangent.y,-tangent.x,0).normalize().multiplyScalar(width/2);
    for (const direction of [-1,1]) {
      const p = centers[i].clone().addScaledVector(normal,direction);
      positions.push(p.x+model.shift,p.y,p.z);
      uvs.push(direction===-1?0:1,i/(centers.length-1));
    }
    if(i<centers.length-1) { const a=i*2; indices.push(a,a+1,a+2,a+1,a+3,a+2); }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(positions,3));
  geometry.setAttribute("uv",new Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
