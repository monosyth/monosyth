"use client";

import { useEffect, useMemo } from "react";
import { Instance, Instances, Line, RoundedBox } from "@react-three/drei";
import { BackSide, BufferGeometry, DoubleSide, Float32BufferAttribute, Vector3, type Texture } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { clamp } from "@/lib/sewing/bag-pattern";
import type { BagOutcomePreviewProps } from "./bag-outcome-preview";
import { bodyPoint, floorGeometry, getBagModel, handleGeometry, surfaceGeometry, type BagModel } from "./model-geometry";
import { createPanelTexture, createWeaveTexture, type FabricPalette } from "./fabric-materials";

export type BagPart = "Outer fabric" | "Lining" | "Handles" | "Zipper panels" | "Zipper";
type ModelProps = BagOutcomePreviewProps & { palette: FabricPalette; cutaway: boolean; stitching: boolean; onSelect: (part: BagPart) => void };

function useResources<T extends {dispose:()=>void}>(factory:()=>T, deps: React.DependencyList): T {
  // Resource factories are deliberately keyed by their complete geometry/material inputs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(factory,deps);
  useEffect(()=>()=>result.dispose(),[result]);
  return result;
}

function Fabric({ color, map, bump, inside=false }: {color?:string;map?:Texture;bump:Texture;inside?:boolean}) {
  return <meshPhysicalMaterial color={color??"white"} map={map} bumpMap={bump} bumpScale={.012} roughness={.91} metalness={0} sheen={.38} sheenRoughness={.82} sheenColor="#e7dfd4" side={inside?BackSide:DoubleSide} />;
}

function Stitch({points,color}: {points:Vector3[];color:string}) {
  return <Line points={points} color={color} lineWidth={.8} dashed dashSize={.055} gapSize={.042} transparent opacity={.85} />;
}

function Panel({model,props,face,inside,bump,onClick}: {model:BagModel;props:ModelProps;face:"front"|"back";inside:boolean;bump:Texture;onClick:(event:ThreeEvent<MouseEvent>)=>void}) {
  const geometry=useResources(()=>surfaceGeometry(model,props.plan,face,inside),[model,props.plan,face,inside]);
  const texture=useResources(()=>createPanelTexture(props.plan,props.composition,face,props.palette),[props.plan,props.composition,face,props.palette]);
  return <mesh geometry={geometry} castShadow={!inside} receiveShadow onClick={onClick}>
    <Fabric color={inside?props.palette.lining:undefined} map={inside?undefined:texture} bump={bump} inside={inside}/>
  </mesh>;
}

function Floor({model,color,bump,inside}: {model:BagModel;color:string;bump:Texture;inside:boolean}) {
  const geometry=useResources(()=>floorGeometry(model,inside),[model,inside]);
  return <mesh geometry={geometry} receiveShadow><Fabric color={color} bump={bump}/></mesh>;
}

function Handle({model,props,side,bump}: {model:BagModel;props:ModelProps;side:1|-1;bump:Texture}) {
  const geometry=useResources(()=>handleGeometry(model,props.options,side),[model,props.options,side]);
  const edgeLines=useMemo(()=>{
    const attr=geometry.getAttribute("position");
    return [0,1].map(side=>Array.from({length:attr.count/2},(_,i)=>new Vector3(attr.getX(i*2+side),attr.getY(i*2+side),attr.getZ(i*2+side)+.016*(side===0?1:-1))));
  },[geometry]);
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow onClick={e=>{if(e.delta<5){e.stopPropagation();props.onSelect("Handles");}}}>
      <Fabric color={props.options.handleMaterial==="webbing"?"#ded3b9":props.palette.outer} bump={bump}/>
    </mesh>
    {props.stitching&&edgeLines.map((line,i)=><Stitch key={i} points={line} color="#b3a589"/>)}
    {props.stitching&&[-1,1].map(end=>{
      const center=model.shift+end*(model.topWidth-2*props.options.handleInset)/2;
      const half=props.options.handleWidth*.36;
      const top=model.height-.18,bottom=model.height-Math.min(model.height-.1,props.options.handleAttachmentDepth)+.15;
      const z=side*(model.topDepth/2+.075);
      const a=new Vector3(center-half,top,z),b=new Vector3(center+half,top,z),c=new Vector3(center+half,bottom,z),d=new Vector3(center-half,bottom,z);
      return <group key={end}><Stitch points={[a,b,c,d,a]} color="#988b73"/><Stitch points={[a,c]} color="#988b73"/><Stitch points={[b,d]} color="#988b73"/></group>;
    })}
  </group>;
}

function EndLoop({model,props,bump,side,carry}: {model:BagModel;props:ModelProps;bump:Texture;side:1|-1;carry:boolean}) {
  const geometry=useResources(()=>{
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    const reach=carry?1.35:.5,half=carry?Math.max(.25,model.depth/2-.45):.25;
    const width=carry?.75:.55;
    const y=model.height/2;
    for(let i=0;i<=64;i++) {
      const a=i/64*Math.PI;
      for(const edge of [-1,1]) {
        positions.push(side*(model.width/2+Math.sin(a)*reach-.035),y+edge*width/2,Math.cos(a)*half);
        uvs.push(edge===-1?0:1,i/64);
      }
      if(i<64){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(positions,3));g.setAttribute("uv",new Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
  },[model,side,carry]);
  return <mesh geometry={geometry} castShadow receiveShadow onClick={e=>{if(e.delta<5){e.stopPropagation();props.onSelect("Handles");}}}><Fabric color={props.palette.contrast} bump={bump}/></mesh>;
}

function Zipper({length,y,z=0,vertical=false,onSelect}: {length:number;y:number;z?:number;vertical?:boolean;onSelect:()=>void}) {
  const teeth= Math.min(180,Math.max(8,Math.round(length*9)));
  const gold="#c6a163";
  return <group position={[0,y,z]} rotation={vertical?[0,Math.PI/2,0]:[0,0,0]} onClick={e=>{if(e.delta<5){e.stopPropagation();onSelect();}}}>
    <mesh receiveShadow position={[0,0,0]}><boxGeometry args={[length,.035,.28]}/><meshStandardMaterial color="#2c343b" roughness={.95}/></mesh>
    <Instances limit={360} range={teeth*2}>
      <boxGeometry args={[length/teeth*.66,.045,.085]}/><meshStandardMaterial color={gold} metalness={.8} roughness={.3}/>
      {[-1,1].flatMap(row=>Array.from({length:teeth},(_,i)=><Instance key={`${row}-${i}`} position={[-length/2+(i+.5+(row===1?.22:0))*length/teeth,.037,row*.045]}/>))}
    </Instances>
    <group position={[-length*.31,.11,0]}>
      <RoundedBox args={[.28,.11,.23]} radius={.035} smoothness={2} castShadow><meshStandardMaterial color={gold} metalness={.83} roughness={.26}/></RoundedBox>
      <mesh position={[-.23,.1,0]} rotation={[Math.PI/2,0,Math.PI/2]} scale={[.75,1.5,1]} castShadow>
        <torusGeometry args={[.16,.032,8,24]}/><meshStandardMaterial color={gold} metalness={.83} roughness={.26}/>
      </mesh>
    </group>
  </group>;
}

function canopyGeometry(model:BagModel, side:1|-1, length:number, y:number, gap:number) {
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  const columns=48,rows=12;
  for(let row=0;row<=rows;row++) for(let col=0;col<=columns;col++) {
    const u=col/columns,v=row/rows;
    const z=side*(gap/2+(model.topDepth/2-gap/2-.065)*v);
    const edgeLift=Math.max(0,model.height-y)*v**6;
    const radius=Math.min(.32,model.depth*.095);
    const cornerZ=Math.max(0,Math.abs(z)-(model.topDepth/2-radius-.065));
    const cornerInset=radius-Math.sqrt(Math.max(0,radius*radius-cornerZ*cornerZ));
    const sectionLength=Math.max(.1,length-2*cornerInset);
    positions.push(model.shift+(u-.5)*sectionLength,y+edgeLift-.035*Math.sin(u*Math.PI)*Math.sin(v*Math.PI),z);
    uvs.push(u,v);
    if(row<rows&&col<columns) {const a=row*(columns+1)+col;indices.push(a,a+1,a+columns+1,a+1,a+columns+2,a+columns+1);}
  }
  const geometry=new BufferGeometry();geometry.setAttribute("position",new Float32BufferAttribute(positions,3));geometry.setAttribute("uv",new Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function ClosurePanel({model,props,side,length,y,gap,bump}: {model:BagModel;props:ModelProps;side:1|-1;length:number;y:number;gap:number;bump:Texture}) {
  const geometry=useResources(()=>canopyGeometry(model,side,length,y,gap),[model,side,length,y,gap]);
  const recessed=props.closure==="recessed-zipper";
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow onClick={e=>{if(e.delta<5){e.stopPropagation();props.onSelect("Zipper panels");}}}>
      <Fabric color={recessed?props.palette.contrast:props.palette.outer} bump={bump}/>
    </mesh>
    {props.stitching&&<Stitch color={props.palette.thread} points={[new Vector3(model.shift-length/2+.06,y+.025,side*(gap/2+.11)),new Vector3(model.shift+length/2-.06,y+.025,side*(gap/2+.11))]}/>}
  </group>;
}

export function BagModel3D(props:ModelProps) {
  const {plan,bodyRecipe,closure,options,palette,stitching,cutaway}=props;
  const model=useMemo(()=>getBagModel(plan,bodyRecipe,closure,options),[plan,bodyRecipe,closure,options]);
  const bump=useResources(()=>createWeaveTexture(plan.boundingCutWidth,plan.cutHeight),[plan.boundingCutWidth,plan.cutHeight]);
  const strapBump=useResources(()=>createWeaveTexture(options.handleWidth,options.handleDrop*2+6,true),[options.handleWidth,options.handleDrop]);
  const pick=(part:BagPart)=>(e:ThreeEvent<MouseEvent>)=>{if(e.delta<5){e.stopPropagation();props.onSelect(part);}};
  const recessed=!model.boxy&&closure==="recessed-zipper";
  const hasRoof=model.boxy||closure==="zipper-gusset"||recessed;
  const endGap=recessed?clamp(options.recessEndGap,0,model.topWidth/2-.1):.06;
  const roofLength=Math.max(.2,model.topWidth-2*endGap);
  const drop=recessed?clamp(options.recessDepth*.45,.25,model.height*.6):0;
  const roofY=model.height-drop;
  const gap=clamp(options.zipperGap,.12,model.topDepth*.75);
  const topStitch=useMemo(()=>Array.from({length:161},(_,i)=>bodyPoint(model,i/160,Math.max(0,1-.15/model.height)).add(new Vector3(0,0,0))),[model]);
  const bottomStitch=useMemo(()=>Array.from({length:161},(_,i)=>bodyPoint(model,i/160,Math.min(.99,.13/model.height))),[model]);
  const contrastStitch=useMemo(()=>Array.from({length:161},(_,i)=>bodyPoint(model,i/160,clamp((props.composition.design.contrastRise+.1)/model.height,0,1))),[model,props.composition.design.contrastRise]);

  return <group scale={model.scale}>
    {(["front","back"] as const).filter(face=>!cutaway||face!=="front").map(face=><group key={face}>
      <Panel model={model} props={props} face={face} inside={false} bump={bump} onClick={pick("Outer fabric")}/>
      <Panel model={model} props={props} face={face} inside bump={bump} onClick={pick("Lining")}/>
    </group>)}
    <Floor model={model} color={props.composition.design.contrastEnabled?palette.contrast:palette.outer} bump={bump} inside={false}/>
    <group onClick={pick("Lining")}><Floor model={model} color={palette.lining} bump={bump} inside/></group>
    {stitching&&<group>
      <Stitch points={cutaway?topStitch.slice(80):topStitch} color={palette.thread}/>
      <Stitch points={cutaway?bottomStitch.slice(80):bottomStitch} color={palette.thread}/>
      {props.composition.design.contrastEnabled&&<Stitch points={cutaway?contrastStitch.slice(80):contrastStitch} color={palette.thread}/>}
      {model.boxy
        ? [0,.5].map(center=>{
          const halfSpan=model.depth/(4*(model.width+model.depth));
          const points=Array.from({length:40},(_,i)=>bodyPoint(model,((center-halfSpan+2*halfSpan*i/39)%1+1)%1,.5));
          return <Stitch key={center} color={palette.thread} points={points}/>;
        })
        : [0,.5].map(u=><Stitch key={u} color={palette.thread} points={Array.from({length:50},(_,i)=>bodyPoint(model,u,i/49))}/>)}
    </group>}
    {model.handles&&<>
      {!cutaway&&<Handle model={model} props={props} side={1} bump={strapBump}/>}
      <Handle model={model} props={props} side={-1} bump={strapBump}/>
    </>}
    {model.boxy&&(props.boxyHandleStyle??"side-handle")!=="none"&&<>
      <EndLoop model={model} props={props} side={-1} carry={(props.boxyHandleStyle??"side-handle")!=="grab-tabs"} bump={strapBump}/>
      {(props.boxyHandleStyle==="grab-tabs"||props.boxyHandleStyle==="both")&&<EndLoop model={model} props={props} side={1} carry={false} bump={strapBump}/>}
    </>}
    {hasRoof&&([1,-1] as const).filter(side=>!cutaway||side===-1).map(side=><ClosurePanel key={side} model={model} props={props} side={side} length={roofLength} y={roofY} gap={gap} bump={bump}/>)}
    {(hasRoof||model.ridge)&&<group position={[model.shift,0,0]}><Zipper length={model.ridge?model.topWidth:roofLength} y={roofY+.025} onSelect={()=>props.onSelect("Zipper")}/></group>}
    {closure==="side-zipper"&&!model.boxy&&<group position={[(options.sideZipperSide==="left"?-1:1)*(model.width/2+.055),model.height-Math.min(options.sideZipperLength,model.height-.3)/2,0]} rotation={[0,0,options.sideZipperSide==="left"?Math.PI/2:-Math.PI/2]}>
      <Zipper length={Math.min(options.sideZipperLength,model.height-.3)} y={0} onSelect={()=>props.onSelect("Zipper")}/>
    </group>}
  </group>;
}
