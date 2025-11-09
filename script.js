window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('skinCanvas');

  // Put the UUID of the player whose skin you want to display here
  const PLAYER_UUID = '069a79f444e94726a5befca90e38aaf5'; // Example: Notch

  // Build the skin URL from Crafatar (works for UUID)
  const skinUrl = `https://crafatar.com/skins/${PLAYER_UUID}`;

  // Create the SkinViewer
  const skinViewer = new skinview3d.SkinViewer({
    canvas: canvas,
    width: 400,
    height: 500,
    autoRotate: true,
  });

  // Optional tweaks
  skinViewer.fov = 50;
  skinViewer.zoom = 1.2;
  skinViewer.background = 0x1d1d1d;

  // Load the skin automatically
  skinViewer.loadSkin(skinUrl);
});
