const input = document.getElementById("names");
const button = document.getElementById("loadBtn");
const gallery = document.getElementById("gallery");
const statusEl = document.getElementById("status");

const PLAYERDB = "https://playerdb.co/api/player/minecraft/";

// use a CORS-friendly proxy so images always load
const CRAFATAR = (uuid) =>
  `https://cors.isomorphic-git.org/https://crafatar.com/skins/${uuid}?default=MHF_Steve`;

function showStatus(msg) {
  statusEl.textContent = msg;
}

function isUUID(str) {
  return /^[0-9a-fA-F-]{32,36}$/.test(str);
}

async function getUUID(nameOrUUID) {
  if (isUUID(nameOrUUID)) {
    return nameOrUUID.replace(/-/g, "");
  }
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

  const viewer = new skinview3d.SkinViewer({
    canvas,
    width: 200,
    height: 300,
  });

  const skinUrl = CRAFATAR(uuid);
  viewer.loadSkin(skinUrl);

  viewer.controls.enableZoom = false;
  viewer.zoom = 0.8;
  viewer.autoRotate = true;
  viewer.autoRotateSpeed = 0.4;
  viewer.animation = new skinview3d.WalkingAnimation();

  // name label
  const label = document.createElement("div");
  label.className = "player-label";
  label.textContent = name;
  gallery.appendChild(label);
}

button.addEventListener("click", async () => {
  gallery.innerHTML = "";
  const names = input.value.split(",").map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) {
    showStatus("Please enter at least one name or UUID");
    return;
  }

  showStatus("Loading...");

  for (const n of names) {
    try {
      const uuid = await getUUID(n);
      renderViewer(uuid, n);
    } catch (err) {
      console.error(err);
      const msg = document.createElement("div");
      msg.textContent = `❌ ${n}: ${err.message}`;
      gallery.appendChild(msg);
    }
  }

  showStatus("Done!");
});
