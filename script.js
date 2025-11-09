const input = document.getElementById("names");
const button = document.getElementById("loadBtn");
const gallery = document.getElementById("gallery");
const statusEl = document.getElementById("status");

const PLAYERDB = "https://playerdb.co/api/player/minecraft/";
const CRAFATAR_RENDER = (uuid) => `https://crafatar.com/renders/body/${uuid}?overlay`;

function showStatus(msg) {
  statusEl.textContent = msg;
}

function isUUID(str) {
  return /^[0-9a-fA-F-]{32,36}$/.test(str);
}

async function getUUID(nameOrUUID) {
  if (isUUID(nameOrUUID)) return nameOrUUID.replace(/-/g, "");
  const res = await fetch(PLAYERDB + encodeURIComponent(nameOrUUID));
  if (!res.ok) throw new Error(`Player not found: ${nameOrUUID}`);
  const data = await res.json();
  return data?.data?.player?.id;
}

function renderMannequin(uuid, name) {
  const wrapper = document.createElement("div");
  wrapper.className = "mannequin";

  const img = document.createElement("img");
  img.src = CRAFATAR_RENDER(uuid);
  img.alt = `${name} mannequin`;
  wrapper.appendChild(img);

  const label = document.createElement("div");
  label.className = "player-label";
  label.textContent = name;
  wrapper.appendChild(label);

  gallery.appendChild(wrapper);
}

button.addEventListener("click", async () => {
  gallery.innerHTML = "";
  const names = input.value.split(",").map(s => s.trim()).filter(Boolean);
  if (names.length === 0) {
    showStatus("Please enter at least one name or UUID");
    return;
  }

  showStatus("Loading...");
  for (const n of names) {
    try {
      const uuid = await getUUID(n);
      renderMannequin(uuid, n);
    } catch (err) {
      console.error(err);
      const errorMsg = document.createElement("div");
      errorMsg.textContent = `❌ ${n}: ${err.message}`;
      gallery.appendChild(errorMsg);
    }
  }
  showStatus("Done!");
});
