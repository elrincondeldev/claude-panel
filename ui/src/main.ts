import "@fontsource/vt323/400.css";
import "@fontsource/silkscreen/400.css";
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
