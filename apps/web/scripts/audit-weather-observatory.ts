import assert from "node:assert/strict";
import test from "node:test";
import { buildObservatory, cloudCoverFromForecast, compassPoint, reading } from "../src/lib/weather/observatory";
import type { WeatherOverview, WeatherForecastPeriod } from "../src/lib/weather/types";

const now=Date.parse("2026-10-16T21:00:00Z");
const period=(start:number,description:string):WeatherForecastPeriod=>({startTime:new Date(start).toISOString(),endTime:new Date(start+3_600_000).toISOString(),temperature:65,temperatureUnit:"F",shortForecast:description,detailedForecast:"",windSpeed:"5 mph",windDirection:"S",isDaytime:true});
function overview():WeatherOverview {
  return {fetchedAt:new Date(now).toISOString(),observationCount:3,station:{name:"Test",location:"Shoreline",macAddress:"",lastObservationAt:"",latitude:47.7565,longitude:-122.345},observations:[
    {timestamp:now-3*3_600_000-300_000,tempf:55,baromrelin:30.1},
    {timestamp:now-300_000,tempf:64.4,windspeedmph:0,winddir:0,humidity:45,baromrelin:30,dailyrainin:0,hourlyrainin:0,uv:0},
  ],timeRange:{startAt:null,endAt:null,spanMs:0},metrics:[],highlights:[],series:[],snapshot:[],forecast:[period(now-3_600_000,"Rain"),period(now,"Partly Cloudy"),period(now+3_600_000,"Sunny")]};
}
const build=(data=overview())=>buildObservatory(data,47.7565,-122.345);

test("missing readings stay missing while measured zeros remain zero",()=>{
  assert.equal(reading({tempf:null},"tempf"),null);
  assert.equal(reading({tempf:""},"tempf"),null);
  assert.equal(reading({tempf:"bad"},"tempf"),null);
  assert.equal(reading({tempf:0},"tempf"),0);
  assert.equal(reading({tempf:"64.4"},"tempf"),64.4);
  const data=build();assert.equal(data.wind,0);assert.equal(data.rain,0);assert.equal(data.uv,0);assert.equal(data.gust,null);
});
test("newest observation wins independent of input ordering and future observations are excluded",()=>{
  const data=overview();data.observations.reverse();data.observations.push({timestamp:now+3_600_000,tempf:100});
  assert.equal(build(data).temperature,64.4);assert.equal(build(data).timestamp,now-300_000);
});
test("stale and absent observations never claim a live report",()=>{
  assert.equal(build().stale,false);
  const data=overview();data.observations=[{timestamp:now-21*60_000,tempf:60}];assert.equal(build(data).stale,true);
  data.observations=[];assert.equal(build(data).stale,true);assert.equal(build(data).temperature,null);
});
test("24-hour range excludes older readings",()=>{
  const data=overview();data.observations.push({timestamp:now-25*3_600_000,tempf:-10});
  const result=build(data);assert.equal(result.low,55);assert.equal(result.high,64.4);assert.equal(result.temperatures.length,2);
});
test("sky description comes from the active forecast, not an expired or future period",()=>{
  const data=build();assert.equal(data.condition,"Partly Cloudy");assert.equal(data.cloudCover,.45);assert.equal(data.forecast.length,2);
});
test("missing forecast uses no invented cloud measurement",()=>{
  const data=overview();data.forecast=[];assert.equal(build(data).cloudCover,null);assert.equal(build(data).forecastCondition,false);assert.equal(build(data).condition,"At the station");
});
test("rain depiction uses observed recent rainfall, not forecast rain",()=>{
  const data=overview();data.forecast=[period(now,"Rain")];assert.equal(build(data).rainRate,0);
  data.observations.at(-1)!.hourlyrainin=.1;assert.equal(build(data).rainRate,.1);
});
test("pressure change compares the current reading with the earlier report",()=>{
  assert.ok(Math.abs(build().pressureChange!+.1)<.00001);
  const data=overview();data.observations=data.observations.slice(-1);assert.equal(build(data).pressureChange,null);
});
test("Shoreline sun times and illumination are calculated within valid bounds",()=>{
  const data=build();assert.ok(data.sunrise<now && data.sunset>now);assert.ok(data.sunAltitude>0);assert.ok(data.moonIllumination>=0&&data.moonIllumination<=1);
  const night=overview();night.fetchedAt="2026-10-17T07:00:00Z";assert.ok(build(night).sunAltitude<0);
});
test("compass labels wrap correctly at north",()=>{
  assert.equal(compassPoint(0),"N");assert.equal(compassPoint(360),"N");assert.equal(compassPoint(-90),"W");assert.equal(compassPoint(225),"SW");assert.equal(compassPoint(null),"—");
});
test("forecast cloud estimates distinguish clear, partial, and overcast skies",()=>{
  assert.equal(cloudCoverFromForecast("Sunny"),.08);assert.equal(cloudCoverFromForecast("Mostly Sunny"),.2);assert.equal(cloudCoverFromForecast("Mostly Cloudy"),.88);assert.equal(cloudCoverFromForecast("Slight Chance Rain"),.75);assert.equal(cloudCoverFromForecast(),null);
});

test("a long observation gap is not presented as a three-hour pressure trend",()=>{
  const data=overview();data.observations[0].timestamp=now-10*3_600_000;
  assert.equal(build(data).pressureChange,null);
});
