export type WeatherCamera = {
  id: string;
  label: string;
  href: string;
  imageUrl: string;
  note: string;
  referer?: string;
};

export const nearbyWeatherCameras: WeatherCamera[] = [
  {
    id: "i5-145th",
    label: "I-5 at NE 145th Street",
    href: "https://www.seattle.gov/trafficcams/i5_145th.htm",
    imageUrl: "https://images.wsdot.wa.gov/nw/005vc17461.jpg",
    note: "Closest freeway camera toward Shoreline. WSDOT refreshes roughly every 4 minutes.",
    referer: "https://www.seattle.gov/trafficcams/i5_145th.htm",
  },
  {
    id: "aurora-northgate",
    label: "Aurora Ave @ Northgate Way",
    href: "https://www.weatherbug.com/traffic-cam/shoreline-wa-98133/415049",
    imageUrl:
      "https://camerasapi-trffc.weatherbug.net/media/trffc/v2/img/small?system=weatherbug-web&id=415049&key=a18310a1e4649fdf8f18eb2a1456a7084c00324fed3188366b99971d514b6b23&rate=10000",
    note: "Closest Aurora corridor view south of the station. WeatherBug refreshes about every 10 seconds.",
    referer: "https://www.weatherbug.com/traffic-cam/shoreline-wa-98133/415049",
  },
  {
    id: "fifth-northgate",
    label: "5th Ave @ Northgate Way",
    href: "https://www.weatherbug.com/traffic-cam/shoreline-wa-98133/415052",
    imageUrl:
      "https://camerasapi-trffc.weatherbug.net/media/trffc/v2/img/small?system=weatherbug-web&id=415052&key=7e658ad67033b2b6469941587685fc89d41e3a101978ce0b233de81ab84bd6fb&rate=10000",
    note: "Working replacement for the broken city-page link. WeatherBug refreshes about every 10 seconds.",
    referer: "https://www.weatherbug.com/traffic-cam/shoreline-wa-98133/415052",
  },
  {
    id: "ballinger-522",
    label: "WA-522 @ Ballinger Way (WA-104)",
    href: "https://www.weatherbug.com/traffic-cam/shoreline-wa-98133/5730",
    imageUrl:
      "https://camerasapi-trffc.weatherbug.net/media/trffc/v2/img/small?system=weatherbug-web&id=5730&key=c158f36c1bb08d1d401034842b74fdae9911575b3088aa622f68e2f1fba985a8&rate=90000",
    note: "Useful east-side Shoreline and Lake Forest Park approach. WeatherBug refreshes about every 90 seconds.",
    referer: "https://www.weatherbug.com/traffic-cam/shoreline-wa-98133/5730",
  },
  {
    id: "i5-220th",
    label: "I-5 @ 220th St",
    href: "https://www.weatherbug.com/traffic-cam/shoreline-wa-98133/5640",
    imageUrl:
      "https://camerasapi-trffc.weatherbug.net/media/trffc/v2/img/small?system=weatherbug-web&id=5640&key=6953ba7dc2eda0dd494f6388a6912c7f367461a94347588954c259d43c40bae1&rate=90000",
    note: "Northbound regional freeway view toward Mountlake Terrace. WeatherBug refreshes about every 90 seconds.",
    referer: "https://www.weatherbug.com/traffic-cam/shoreline-wa-98133/5640",
  },
];

export function getNearbyWeatherCamera(cameraId: string) {
  return nearbyWeatherCameras.find((camera) => camera.id === cameraId) ?? null;
}
