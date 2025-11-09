const input = document.getElementById("names");
const button = document.getElementById("loadBtn");
const gallery = document.getElementById("gallery");
const statusEl = document.getElementById("status");

const PLAYERDB = "https://playerdb.co/api/player/minecraft/";
const CRAFATAR = (uuid) => `https://crafatar.com/skins/${uuid}`;

function showStatus(msg) {
  statusEl.textContent = msg;
}

// Helper to detect UUIDs
function isUUID(str) {
  return /^[0-9a-fA-F-]{32,36}$/.test(str);
}

// Fetch username → UUID
async function getUUID(nameOrUUID) {
  if (isUUID(nameOrUUID)) {
    return nameOrUUID.replace(/-/g, "");
  }
  const res = await fetch(PLAYERDB + nameOrUUID);
  if (!res.ok) throw new Error(`Player not found: ${nameOrUUID}`);
  const data = await res.json();
  return data?.data?.player?.id;
}

// Create 3D viewer for a UUID
function renderViewer(uuid) {
  const wrap = document.createElement("div");
  wrap.className = "viewer";
  gallery.appendChild(wrap);

  const canvas = document.createElement("canvas");
  wrap.appendChild(canvas);

  const viewer = new skinview3d.SkinViewer({
    canvas,
    width: 200,
    height: 300
  });

  viewer.loadSkin(CRAFATAR(uuid));
  viewer.controls.enableZoom = false;
  viewer.zoom = 0.8;
  viewer.animation = new skinview3d.WalkingAnimation();
  viewer.autoRotate = true;
  viewer.autoRotateSpeed = 0.4;
}

button.addEventListener("click", async () => {
  gallery.innerHTML = "";
  const names = input.value.split(",").map(n => n.trim()).filter(Boolean);
  if (names.length === 0) {
    showStatus("Please enter at least one name or UUID");
    return;
  }

  showStatus("Loading...");

  for (const n of names) {
    try {
      const uuid = await getUUID(n);
      renderViewer(uuid);
    } catch (err) {
      console.error(err);
      showStatus(err.message);
    }
  }

  showStatus("Done!");
});
