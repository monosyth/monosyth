"use client";

import { useEffect, useRef } from "react";
import type { ObservatoryData } from "@/lib/weather/observatory";
import styles from "./observatory.module.css";

// A procedural illustration. Station wind and recent rain drive movement;
// NWS sky descriptions drive cloud density, and SunCalc drives daylight.
const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform float uTime, uWind, uDirection, uCloud, uRain, uDay, uAspect;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
 vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
 float v=0., a=.5;
 for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+3.1;a*=.5;}
 return v;
}
void main() {
 vec2 uv=vUv;
 float daylight=smoothstep(-.12,.18,uDay);
 float twilight=(1.-smoothstep(0.,.38,abs(uDay)))*daylight;
 vec3 top=mix(vec3(.025,.045,.095),vec3(.16,.34,.43),daylight);
 vec3 horizon=mix(vec3(.11,.16,.24),vec3(.61,.73,.72),daylight);
 horizon=mix(horizon,vec3(.87,.53,.33),twilight*.7);
 vec3 col=mix(horizon,top,smoothstep(.1,1.,uv.y));
 vec2 sun=vec2(.72,clamp(.25+max(uDay,0.)*.7,.27,.82));
 float dist=length((uv-sun)*vec2(uAspect,1.));
 col+=vec3(1.,.8,.48)*exp(-dist*5.)*.22*daylight*(1.-uCloud*.65);
 col=mix(col,vec3(1.,.94,.72), (1.-smoothstep(.026,.034,dist))*daylight*(1.-uCloud*.8));
 float stars=step(.997,hash(floor(uv*vec2(450.,270.))))*(1.-daylight)*smoothstep(.3,.6,uv.y);
 col+=stars*.65;
 float drift=uTime*(.005+uWind*.0015)*cos(uDirection);
 vec2 cp=vec2(uv.x*4.+drift,uv.y*4.5);
 float cloud=fbm(cp+fbm(cp*.6+uTime*.001));
 float mask=smoothstep(.78-uCloud*.42,.96-uCloud*.42,cloud)*smoothstep(.25,.55,uv.y);
 vec3 cloudColor=mix(vec3(.16,.2,.28),vec3(.83,.87,.82),daylight);
 col=mix(col,cloudColor,mask*.8);
 // Layered Northwest ridges are illustrative terrain, not a terrain survey.
 for(int i=0;i<5;i++) {
  float layer=float(i);
  float ridge=.27-layer*.045+fbm(vec2(uv.x*(3.+layer),layer*4.7))*(.14+layer*.018);
  vec3 mountain=mix(vec3(.26,.39,.4),vec3(.025,.10,.12),layer/4.)*(.4+.6*daylight);
  col=mix(col,mountain,1.-smoothstep(ridge-.002,ridge+.002,uv.y));
 }
 // Fine, slanted rain streaks only when the station reports recent rainfall.
 if(uRain>0.) {
  vec2 rp=vec2(uv.x*110.+uv.y*uWind*.5,uv.y*22.+uTime*9.);
  float streak=step(.965,hash(vec2(floor(rp.x),floor(rp.y))))*(1.-smoothstep(.0,.04,fract(rp.x)))*fract(rp.y);
  col+=streak*min(uRain*8.+.15,.5);
 }
 col+= (hash(gl_FragCoord.xy)-.5)*.014;
 gl_FragColor=vec4(col,1.);
}`;

export function Atmosphere({ data, paused }: { data: ObservatoryData; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ data, paused });
  const wake = useRef(() => {});
  useEffect(() => { state.current = { data, paused }; wake.current(); }, [data, paused]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    let clean = () => {};
    // Keep the renderer out of the initial bundle and leave the CSS sky as a fallback.
    import("three").then(THREE => {
      if (cancelled) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "low-power" }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
      const uniforms = {
        uTime: { value: 0 }, uWind: { value: 0 }, uDirection: { value: 0 },
        uCloud: { value: 0 }, uRain: { value: 0 }, uDay: { value: 0 },
        uAspect: { value: 1 },
      };
      const material = new THREE.ShaderMaterial({ uniforms, fragmentShader,
        vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.);}" });
      const geometry = new THREE.PlaneGeometry(2,2);
      scene.add(new THREE.Mesh(geometry,material));
      let visible = true;
      let frame = 0;
      let last = 0;
      let dirty = true;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const schedule = () => {
        if (!frame && visible && !document.hidden) frame=requestAnimationFrame(draw);
      };
      const draw = (time: number) => {
        frame=0;
        if (document.hidden || !visible) return;
        const current = state.current;
        const animate = !current.paused && !reduced.matches;
        if (dirty || time-last >= 1000/24) {
          const dt = Math.min((time-last)/1000,.1);
          if (animate) uniforms.uTime.value += dt;
          last = time;
          uniforms.uWind.value = current.data.stale ? 0 : Math.max(0,current.data.wind ?? 0);
          uniforms.uDirection.value = (current.data.windDirection ?? 90)*Math.PI/180;
          uniforms.uCloud.value = current.data.cloudCover ?? 0;
          uniforms.uRain.value = current.data.stale ? 0 : current.data.rainRate ?? 0;
          uniforms.uDay.value = current.data.sunAltitude;
          renderer.render(scene,camera);
          dirty=false;
        }
        if (animate) schedule();
      };
      const redraw = () => { dirty=true; schedule(); };
      wake.current=redraw;
      document.addEventListener("visibilitychange",redraw);
      reduced.addEventListener("change",redraw);
      const resize = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (!width || !height) return;
        renderer.setSize(width,height);
        uniforms.uAspect.value = width/height;
        redraw();
      });
      resize.observe(element);
      const intersection = new IntersectionObserver(([entry]) => { visible=entry.isIntersecting; if (visible) redraw(); });
      intersection.observe(element);
      const lost = (event: Event) => { event.preventDefault(); renderer.domElement.style.opacity="0"; };
      const restored = () => { renderer.domElement.style.opacity="1"; redraw(); };
      renderer.domElement.addEventListener("webglcontextlost",lost);
      renderer.domElement.addEventListener("webglcontextrestored",restored);
      schedule();
      clean=()=>{wake.current=()=>{};cancelAnimationFrame(frame);document.removeEventListener("visibilitychange",redraw);reduced.removeEventListener("change",redraw);resize.disconnect();intersection.disconnect();geometry.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();};
    }).catch(() => { /* Readings remain available without WebGL. */ });
    return () => {cancelled=true;clean();};
  },[]);
  return <div ref={host} className={styles.atmosphere} data-night={data.sunAltitude < 0} aria-hidden="true" />;
}
