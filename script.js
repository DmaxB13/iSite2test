// Use SkinViewer from ES module CDN
import { SkinViewer, WalkingAnimation } from "https://unpkg.com/skinview3d@3.0.0-beta.2/dist/skinview3d.min.js";

const input = document.getElementById("names");
const button = document.getElementById("loadBtn");
const gallery = document.getElementById("gallery");
const statusEl = document.getElementById("status");

const PLAYERDB = "https://playerdb.co/api/player/minecraft/";
const CRAFATAR_SKIN = (uuid) => `https://crafatar.com/skins/${uuid}?overlay&cape`;

function showStatus(msg) {
  statusEl.textContent = msg;
}

async function getUUID(nameOrUUID) {
  if (/^[0-9a-fA-F-]{32,36}$/.test(nameOrUUID)) return nameOrUUID.replace(/-/g, "");
  const res = await fetch(PLAYERDB + encodeURIComponent(nameOrUUID));
  if (!res.ok) throw new Error(`Player not found: ${nameOrUUID}`);
  const data = await res.json();
  return data?.data?.player?.id;
}

function renderViewer(uuid, name) {
  const wrapper = document.createElement("div");
  wrapper.className = "viewer";
  gallery.appendChild(wrapper);

  const canvas = document.createElement("canvas");
  wrapper.appendChild(canvas);

  const viewer = new SkinViewer({
    canvas,
    width: 200,
    height: 300
  });

  viewer.loadSkin(CRAFATAR_SKIN(uuid));
  viewer.autoRotate = true;
  viewer.autoRotateSpeed = 0.5;
  viewer.zoom = 0.8;
  viewer.controls.enableZoom = false;
  viewer.animation = new WalkingAnimation(); // mannequin pose

  const label = document.createElement("div");
  label.className = "player-label";
  label.textContent = name;
  gallery.appendChild(label);
}

button.addEventListener("click", async () => {
  gallery.innerHTML = "";
  const names = input.value.split(",").map(n => n.trim()).filter(Boolean);
  if (!names.length) return showStatus("Enter at least one name or UUID");
  showStatus("Loading...");
  for (const n of names) {
    try {
      const uuid = await getUUID(n);
      renderViewer(uuid, n);
    } catch (err) {
      console.error(err);
      const errDiv = document.createElement("div");
      errDiv.textContent = `❌ ${n}: ${err.message}`;
      gallery.appendChild(errDiv);
    }
  }
  showStatus("Done!");
});
