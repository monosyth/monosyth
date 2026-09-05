"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { MathUtils, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { formatInches } from "@/lib/sewing/bag-pattern";
import type { BagOutcomePreviewProps } from "./bag-outcome-preview";
import { getBagModel } from "./model-geometry";
import { BagModel3D, type BagPart } from "./bag-model-3d";
import { fabricPalettes } from "./fabric-materials";
import styles from "./preview-3d.module.css";

type CameraCommand = { id:number; yaw?:number; polar?:number; zoom?:number; reset?:boolean };
const viewMemoryKey="monosyth:bag-studio:3d-camera";
const labels = {"open-tote":"Open tote", "top-zipper":"Top zipper", "side-zipper":"Side zipper", "zipper-gusset":"Zipper gusset", "recessed-zipper":"Recessed zipper"};

function CameraRig({targetY,externalYaw,onYawChange,command,spinning}: {targetY:number;externalYaw:number;onYawChange?: (yaw:number)=>void;command:CameraCommand;spinning:boolean}) {
  const controls=useRef<OrbitControlsImpl>(null);
  const camera=useThree(s=>s.camera);
  const invalidate=useThree(s=>s.invalidate);
  const reportedYaw=useRef(externalYaw);
  const callback=useRef(onYawChange);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{callback.current=onYawChange;},[onYawChange]);
  useEffect(()=>{
    const orbit=controls.current;
    if(!orbit)return;
    let polar=1.11,distance=9.8;
    try {
      const saved=JSON.parse(localStorage.getItem(viewMemoryKey)??"null");
      if(saved&&Number.isFinite(saved.polar)&&Number.isFinite(saved.distance)) {
        polar=MathUtils.clamp(saved.polar,.12,Math.PI-.12);
        distance=MathUtils.clamp(saved.distance,4.5,17);
      }
    }catch{/* Optional view preferences never block the bag. */}
    const yaw=MathUtils.degToRad(reportedYaw.current);
    camera.position.setFromSphericalCoords(distance,polar,yaw).add(new Vector3(0,targetY,0));
    orbit.target.set(0,targetY,0);orbit.update();invalidate();
  },[camera,targetY,invalidate]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>{
    const orbit=controls.current;if(!orbit)return;
    if(Math.abs(externalYaw-reportedYaw.current)<.05)return;
    reportedYaw.current=externalYaw;
    orbit.setAzimuthalAngle(MathUtils.degToRad(externalYaw));orbit.update();invalidate();
  },[externalYaw,invalidate]);
  useEffect(()=>{
    const orbit=controls.current;if(!orbit||command.id===0)return;
    if(command.reset) {
      camera.position.setFromSphericalCoords(9.8,1.11,Math.PI/6).add(orbit.target);
    } else {
      if(command.yaw!==undefined)orbit.setAzimuthalAngle(MathUtils.degToRad(command.yaw));
      if(command.polar!==undefined)orbit.setPolarAngle(command.polar);
      if(command.zoom)camera.position.sub(orbit.target).multiplyScalar(command.zoom).add(orbit.target);
    }
    orbit.update();invalidate();
  },[command,camera,invalidate]);
  const remember=()=>{
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>{
      const orbit=controls.current;if(!orbit)return;
      const yaw=((MathUtils.radToDeg(orbit.getAzimuthalAngle())%360)+360)%360;
      reportedYaw.current=yaw;callback.current?.(yaw);
      try {localStorage.setItem(viewMemoryKey,JSON.stringify({polar:orbit.getPolarAngle(),distance:orbit.getDistance()}));}catch{/* Storage may be unavailable in private browsing. */}
    },250);
  };
  return <OrbitControls ref={controls} makeDefault target={[0,targetY,0]} enablePan={false} enableDamping dampingFactor={.09} minDistance={4.5} maxDistance={17} minPolarAngle={.12} maxPolarAngle={Math.PI-.12} rotateSpeed={.7} zoomSpeed={.75} autoRotate={spinning} autoRotateSpeed={.7} onChange={spinning?undefined:remember} />;
}

function Lighting({shadowKey}: {shadowKey:string}) {
  return <>
    <ambientLight intensity={.55}/>
    <directionalLight position={[-4,8,5]} intensity={2.5} color="#fff0d8" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={8} shadow-camera-bottom={-4} shadow-normalBias={.035} shadow-radius={4}/>
    <directionalLight position={[5,3,-3]} intensity={1.8} color="#b9e8ef"/>
    <directionalLight position={[0,5,-6]} intensity={2.2} color="#e5d4ff"/>
    <Environment resolution={128} frames={1}>
      <Lightformer intensity={3} position={[-5,5,4]} scale={[5,7,1]} rotation={[0,Math.PI/4,0]}/>
      <Lightformer intensity={2} position={[4,3,-4]} scale={[3,6,1]} rotation={[0,-Math.PI/4,0]}/>
      <Lightformer intensity={1.5} position={[0,7,0]} scale={[5,5,1]} rotation={[Math.PI/2,0,0]}/>
    </Environment>
    <ContactShadows key={shadowKey} position={[0,-.035,0]} opacity={.65} scale={14} blur={2.7} far={6} resolution={512} frames={1} color="#000914"/>
  </>;
}

export default function BagPreview3D(props:BagOutcomePreviewProps) {
  const {plan,bodyRecipe,closure,options,composition,yaw,onYawChange}=props;
  const [paletteIndex,setPaletteIndex]=useState(0);
  const [cutaway,setCutaway]=useState(false);
  const [stitching,setStitching]=useState(true);
  const [spinning,setSpinning]=useState(false);
  const [selected,setSelected]=useState<BagPart|null>(null);
  const [command,setCommand]=useState<CameraCommand>({id:0});
  const [contextLost,setContextLost]=useState(false);
  const [canvasKey,setCanvasKey]=useState(0);
  const [reducedMotion,setReducedMotion]=useState(false);
  const stage=useRef<HTMLDivElement>(null);
  const model=useMemo(()=>getBagModel(plan,bodyRecipe,closure,options),[plan,bodyRecipe,closure,options]);
  const palette=fabricPalettes[paletteIndex];
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>{setReducedMotion(media.matches);if(media.matches)setSpinning(false);};
    update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);
  },[]);
  function view(next:Omit<CameraCommand,"id">) {setSpinning(false);setCommand(old=>({...next,id:old.id+1}));}
  function keyboard(event:KeyboardEvent) {
    if(event.target!==event.currentTarget)return;
    const keys=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","Home"];
    if(!keys.includes(event.key))return;
    event.preventDefault();
    if(event.key==="Home")view({reset:true});
    if(event.key==="ArrowLeft")view({yaw:yaw-5});
    if(event.key==="ArrowRight")view({yaw:yaw+5});
    if(event.key==="ArrowUp")view({polar:.38});
    if(event.key==="ArrowDown")view({polar:2.6});
    if(event.key==="+"||event.key==="=")view({zoom:.85});
    if(event.key==="-")view({zoom:1.18});
  }
  const dimensions=model.boxy
    ? `${formatInches(plan.finishedBaseWidth)} L × ${formatInches(plan.finishedDepth)} W × ${formatInches(plan.finishedHeight)} H`
    : `${formatInches(plan.finishedBaseWidth)} W × ${formatInches(plan.finishedHeight)} H × ${formatInches(plan.finishedDepth)} D`;
  const detail:Record<BagPart,string>={
    "Outer fabric":`Start with ${formatInches(plan.boundingCutWidth)} × ${formatInches(plan.cutHeight)} raw panels. ${composition.modeLabel}; ${composition.scopeLabel}.`,
    Lining:`Shown in a contrasting color. Body lining uses the same ${formatInches(plan.boundingCutWidth)} × ${formatInches(plan.cutHeight)} starting rectangle.`,
    Handles:model.boxy?"End handles follow the tabs / side-handle choice in your bag settings. Use the cut plan for the tab or carry-loop cutting sizes.":`${formatInches(options.handleWidth)} wide · ${formatInches(options.handleDrop)} inside drop · centers ${formatInches(options.handleInset)} in from the finished front corners.`,
    "Zipper panels":closure==="recessed-zipper"?"Recessed below the rim. Use the recessed-zipper cutting diagrams in Cut plan for the panel sizes, corner notches, and sewing order.":"The fabric on either side meets at the zipper. The cut plan provides the construction-specific pieces.",
    Zipper:"Warm metal teeth, tape, slider, and pull are shown separately. Use the cut plan for the required zipper length; hardware in this preview is illustrative.",
  };
  const shadowKey=JSON.stringify([plan.cutWidth,plan.cutHeight,plan.cornerCut,plan.leftTopInset,plan.rightTopInset,bodyRecipe,closure,options.handleDrop,options.handleInset,cutaway]);

  if (!plan.valid) return <section className={styles.preview} aria-label="3D preview needs valid dimensions"><div className={styles.inspector}><span>Check your cutting sizes first</span><p>The current measurements cannot form this bag. Resolve the warnings in Easy cuts to see an accurate-sized 3D preview.</p></div></section>;

  return <section className={styles.preview} aria-label="Interactive 3D bag preview" data-bag-preview="three">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>THE FINISHED FORM</p><h2>Your bag, in the round.</h2><p className={styles.subtitle}>{model.boxy?"Boxy zipper bag":labels[closure]} <span>·</span> {composition.modeLabel}</p></div>
      <span className={styles.live}><i/> Live 3D</span>
    </header>
    <div className={styles.toolbar}>
      <div className={styles.segment} aria-label="Model view">
        <button type="button" aria-pressed={!cutaway} onClick={()=>{setCutaway(false);setSelected(null);}}>Finished bag</button>
        <button type="button" aria-pressed={cutaway} onClick={()=>{setCutaway(true);setSelected("Lining");view({yaw:25,polar:1.02});}}>Look inside</button>
      </div>
      <div className={styles.tools}>
        <button type="button" aria-pressed={stitching} onClick={()=>setStitching(!stitching)}>Stitching</button>
        <button type="button" aria-pressed={spinning} disabled={reducedMotion} title={reducedMotion?"Automatic motion is off because of your device’s reduced-motion setting":undefined} onClick={()=>setSpinning(!spinning)}>{spinning?"Pause spin":"Auto spin"}</button>
      </div>
    </div>
    <div ref={stage} className={styles.stage} tabIndex={0} onKeyDown={keyboard} aria-label={`3D ${dimensions}. Drag to turn and tilt. Scroll or pinch to zoom. Arrow keys turn the view; plus and minus zoom; Home resets.`}>
      <div className={styles.caption}><span>{cutaway?"FRONT REMOVED · CONSTRUCTION VIEW":"FINISHED DIMENSIONS"}</span><strong>{dimensions}</strong></div>
      <div className={styles.viewport}>{contextLost?<div className={styles.loading} role="status"><p>The 3D view paused to free graphics memory.</p><button type="button" onClick={()=>{setContextLost(false);setCanvasKey(n=>n+1);}}>Reload 3D</button></div>:<Canvas key={canvasKey} shadows frameloop="demand" dpr={[1,1.75]} camera={{fov:35,near:.05,far:100,position:[5,4,8]}} gl={{antialias:true,powerPreference:"high-performance"}} fallback={<div className={styles.loading}>Your device does not support 3D. Use the vector preview in the cutting workspace.</div>} onCreated={({gl})=>{gl.domElement.addEventListener("webglcontextlost",e=>{e.preventDefault();setContextLost(true);},{once:true});}}>
        <color attach="background" args={["#192531"]}/>
        <Suspense fallback={null}>
          <Lighting shadowKey={shadowKey}/>
          <BagModel3D {...props} palette={palette} stitching={stitching} cutaway={cutaway} onSelect={setSelected}/>
          <CameraRig targetY={model.totalHeight*model.scale*.48} externalYaw={yaw} onYawChange={onYawChange} command={command} spinning={spinning}/>
        </Suspense>
      </Canvas>}</div>
      <div className={styles.cameraTools} aria-label="Camera presets">
        <button type="button" onClick={()=>view({yaw:0,polar:Math.PI/2})}>Front</button>
        <button type="button" onClick={()=>view({yaw:90,polar:Math.PI/2})}>Side</button>
        <button type="button" onClick={()=>view({yaw:180,polar:Math.PI/2})}>Back</button>
        <button type="button" onClick={()=>view({yaw:0,polar:.13})}>Top</button>
        <button type="button" onClick={()=>view({yaw:0,polar:Math.PI-.13})}>Bottom</button>
        <button type="button" onClick={()=>view({reset:true})}>Reset view</button>
      </div>
      <div className={styles.zoomTools} aria-label="Zoom"><button type="button" aria-label="Zoom in" onClick={()=>view({zoom:.85})}>+</button><button type="button" aria-label="Zoom out" onClick={()=>view({zoom:1.18})}>−</button></div>
    </div>
    <div className={styles.stageFooter}><span>Drag to turn & tilt <i>·</i> Scroll or pinch to zoom</span><span>Click a part to inspect it</span></div>
    <div className={styles.finishBar}>
      <div className={styles.swatches}><span>Preview palette</span>{fabricPalettes.map((item,index)=><button key={item.name} type="button" aria-label={`${item.name} preview palette`} aria-pressed={index===paletteIndex} title={item.name} onClick={()=>setPaletteIndex(index)} style={{background:item.outer}}><span>{index===paletteIndex?"✓":""}</span></button>)}<strong>{palette.name}</strong></div>
      <div className={styles.legend}><span><i style={{background:palette.outer}}/>Outer</span><span><i style={{background:palette.lining}}/>Lining</span><span><i style={{background:palette.contrast}}/>Contrast</span></div>
    </div>
    <div className={styles.inspector} aria-live="polite"><span>{selected??"Made from your measurements"}</span><p>{selected?detail[selected]:"Change your cutting sizes, corner squares, or panel layout above and the bag updates here. Preview colors do not change your cutting plan."}</p></div>
    <p className={styles.note}>A measured construction preview, not a fabric simulation. Softness, hardware, and fabric bulk are illustrative.{closure==="recessed-zipper"?" The recessed panel’s vertical drop and end folds are approximate; use the cut plan to construct them.":""}{model.boxy?" Patch placement across boxy end folds is a proportional guide.":""}</p>
  </section>;
}
