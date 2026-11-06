import "@fontsource/vt323/400.css";
import "@fontsource/silkscreen/400.css";
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

applyKioskOptions(new URLSearchParams(location.search));
mount(App, { target: document.getElementById("app")! });

/**
 * Options the Pi passes in the URL (pi/firstboot/session.sh): `kiosk` hides the cursor;
 * `inset=top,right,bottom,left` (px) keeps content clear of the case bezel.
 */
function applyKioskOptions(params: URLSearchParams) {
  const root = document.documentElement;
  if (params.has("kiosk")) root.classList.add("kiosk");
  const inset = params.get("inset");
  if (inset) root.style.setProperty("--inset", inset.split(",").map((v) => `${Number(v) || 0}px`).join(" "));
}
