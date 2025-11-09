window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('skinCanvas');

  // Create SkinViewer
  const skinViewer = new skinview3d.SkinViewer({
    canvas: canvas,
    width: 400,
    height: 500,
    autoRotate: true,
  });

  // Optional: tweak camera and background
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

    // Load skin from Crafatar (supports username or UUID)
    const skinUrl = `https://crafatar.com/skins/${encodeURIComponent(user)}`;
    skinViewer.loadSkin(skinUrl);
  });

  // Load default skin on page load
  skinViewer.loadSkin('https://crafatar.com/skins/Notch');
});
