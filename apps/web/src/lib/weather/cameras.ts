export type WeatherCamera = {
  id: string;
  label: string;
  href: string;
  imageUrl: string;
  note: string;
};

export const nearbyWeatherCameras: WeatherCamera[] = [
  {
    id: "i5-195th",
    label: "I-5 @ NE 195th St",
    href: "https://images.wsdot.wa.gov/nw/005vc17720.jpg",
    imageUrl: "https://images.wsdot.wa.gov/nw/005vc17720.jpg",
    note: "Northern commute approach from Shoreline toward Seattle.",
  },
  {
    id: "i5-175th-s",
    label: "I-5 @ NE 175th St, S",
    href: "https://images.wsdot.wa.gov/nw/005vc17603.jpg",
    imageUrl: "https://images.wsdot.wa.gov/nw/005vc17603.jpg",
    note: "Southbound mainline view for the mid-Shoreline segment.",
  },
  {
    id: "i5-metro",
    label: "I-5 @ METRO Bus Barn",
    href: "https://images.wsdot.wa.gov/nw/005vc17552.jpg",
    imageUrl: "https://images.wsdot.wa.gov/nw/005vc17552.jpg",
    note: "Useful transition point before the Northgate corridor tightens up.",
  },
  {
    id: "i5-155th",
    label: "I-5 @ NE 155th St",
    href: "https://images.wsdot.wa.gov/nw/005vc17510.jpg",
    imageUrl: "https://images.wsdot.wa.gov/nw/005vc17510.jpg",
    note: "North Seattle choke point closest to the station freeway exit pattern.",
  },
  {
    id: "i5-145th",
    label: "I-5 @ NE 145th St",
    href: "https://www.seattle.gov/trafficcams/i5_145th.htm",
    imageUrl: "https://images.wsdot.wa.gov/nw/005vc17461.jpg",
    note: "Closest freeway camera toward Shoreline and the station area.",
  },
  {
    id: "i5-175th-n",
    label: "I-5 @ NE 175th St, N",
    href: "https://images.wsdot.wa.gov/nw/005vc17627.jpg",
    imageUrl: "https://images.wsdot.wa.gov/nw/005vc17627.jpg",
    note: "Northbound return-home view for the same commute segment.",
  },
  {
    id: "aurora-145th-ew",
    label: "Aurora Ave N & N 145th St EW",
    href: "https://web.seattle.gov/Travelers/",
    imageUrl: "https://www.seattle.gov/trafficcams/images/Aurora_N_145_1.jpg",
    note: "Official Seattle traveler feed for cross-traffic at 145th.",
  },
  {
    id: "aurora-145th-ns",
    label: "Aurora Ave N & N 145th St NS",
    href: "https://web.seattle.gov/Travelers/",
    imageUrl: "https://www.seattle.gov/trafficcams/images/Aurora_N_145_2.jpg",
    note: "Official Seattle traveler feed for Aurora north-south flow at 145th.",
  },
];

export function getNearbyWeatherCamera(cameraId: string) {
  return nearbyWeatherCameras.find((camera) => camera.id === cameraId) ?? null;
}
