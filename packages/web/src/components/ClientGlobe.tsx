import Globe, { type GlobeInstance } from "globe.gl";
import { createSignal, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { planet } from "./planet";
import { feature } from "topojson-client";
import { MeshLambertMaterial, DoubleSide, Color } from "three";

export default function ClientGlobe() {
  const [globe, setGlobe] = createSignal<GlobeInstance>();
  const loadGlobe = (el: HTMLDivElement) => {
    if (isServer || el === undefined || el === null) {
      console.error("Could not load Globe");
      return;
    }
    const f = feature(planet, planet.objects.land);
    if (f.type === "Feature") {
      return;
    }
    const theGlobe = new Globe(el, { waitForGlobeReady: true, animateIn: true });
    const world = theGlobe
      .backgroundColor("rgba(0,0,0,0)")
      .showGlobe(false)
      .showAtmosphere(false)
      .polygonsData(f.features)
      .polygonCapMaterial(new MeshLambertMaterial({ color: new Color(10, 10, 10), side: DoubleSide }))
      .polygonSideColor(() => "rgba(0,0,0,0)");
    setGlobe(world);
  };

  return (
    <div
      ref={(el) => {
        loadGlobe(el);
      }}
      class="w-80 h-80"
    />
  );
}
