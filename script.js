// Wait until DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('skinCanvas');
  // Setup skin viewer
  const skinViewer = new skinview3d.SkinViewer({
    canvas: canvas,
    width: 400,
    height: 500,
    skin: null,     // will be set later
    // Enable outer layer by default
    // skinview3d automatically shows outer layer if skin file has it
    autoRotate: true
  });

  // You can tweak camera FOV, zoom, background
  skinViewer.fov = 50;
  skinViewer.zoom = 1.2;
  skinViewer.background = 0x1d1d1d;

  const usernameInput = document.getElementById('usernameInput');
  const loadBtn = document.getElementById('loadBtn');

  loadBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    if (!user) {
      alert('Please enter a Minecraft username or UUID');
      return;
    }
    fetchSkinAndLoad(user);
  });

  // Function: fetch skin URL from username/UUID then load into viewer
  async function fetchSkinAndLoad(nameOrUuid) {
    try {
      // Convert username to UUID if needed
      let uuid = nameOrUuid;
      if (nameOrUuid.length <= 16) { // assume username
        const resp = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nameOrUuid)}`);
        if (!resp.ok) throw new Error('Username not found');
        const data = await resp.json();
        uuid = data.id;
      }

      // Fetch skin texture url
      const profileResp = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
      if (!profileResp.ok) throw new Error('Profile fetch failed');
      const profileData = await profileResp.json();
      const properties = profileData.properties || [];
      const skinProp = properties.find(p => p.name === 'textures');
      if (!skinProp) throw new Error('Skin texture not found');
      const raw = JSON.parse(atob(skinProp.value));
      const skinUrl = raw.textures.SKIN.url;

      // Load skin into viewer
      skinViewer.loadSkin(skinUrl);

      // Optionally load cape if exists
      if (raw.textures.CAPE && raw.textures.CAPE.url) {
        skinViewer.loadCape(raw.textures.CAPE.url);
      } else {
        skinViewer.loadCape(null);
      }

    } catch (err) {
      console.error(err);
      alert('Error loading skin: ' + err.message);
    }
  }

  // Optionally you can load a default skin initially
  fetchSkinAndLoad('Notch');  // replace with your default
});
