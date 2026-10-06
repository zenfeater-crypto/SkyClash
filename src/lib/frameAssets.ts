/**
 * Official Frame Assets Registry
 * 
 * Defines the exact image assets for each tier:
 * 1. VANGUARD (Premium Lite):
 *    - Profile Frame: Golden circular profile-frame asset
 *    - Text Frame: Golden decorative rectangular text/message-frame asset
 * 2. OVERLORD (Premium):
 *    - Profile Frame: Diamond circular profile-frame asset
 *    - Text Frame: Diamond/shiny rectangular text/message-frame asset
 * 3. SUPREME (VIP Members):
 *    - Profile Frame: Purple circular/radiant profile-frame asset
 *    - Text Frame: Purple decorative rectangular text/message-frame asset
 * 4. OWNER ADMIN (Special Admin Tier):
 *    - Profile Frame: Gold/Black WINGED circular Admin profile-frame asset
 *    - Text Frame: Gold/Black decorative rectangular Admin text/message-frame asset
 */

export interface TierFrameAssets {
  profileFrame: string;
  messageFrame: string;
}

export interface AppFrameAssets {
  admin: TierFrameAssets;
  supreme: TierFrameAssets;
  overlord: TierFrameAssets;
  vanguard: TierFrameAssets;
}

// Default high-fidelity SVG/asset fallbacks embedded as data URLs with exact decorative wings and motifs
// until custom uploaded URLs are provided or updated via Admin Panel.
const ADMIN_WINGED_CIRCULAR_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE082" />
      <stop offset="35%" stop-color="#FFB300" />
      <stop offset="70%" stop-color="#FF8F00" />
      <stop offset="100%" stop-color="#B26500" />
    </linearGradient>
    <linearGradient id="darkMetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2D1500" />
      <stop offset="50%" stop-color="#121212" />
      <stop offset="100%" stop-color="#050505" />
    </linearGradient>
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Left Obsidian/Gold Wings -->
  <g filter="url(#goldGlow)">
    <!-- Top Feather Left -->
    <path d="M 50 85 C 20 50, 0 45, 2 30 C 18 35, 38 60, 56 75 Z" fill="url(#goldGrad)" stroke="#222" stroke-width="1.5" />
    <path d="M 45 92 C 15 70, -2 72, -4 60 C 12 62, 34 80, 50 88 Z" fill="url(#darkMetal)" stroke="url(#goldGrad)" stroke-width="1.2" />
    <path d="M 46 102 C 18 95, 2 105, 0 92 C 16 90, 36 100, 48 102 Z" fill="url(#goldGrad)" stroke="#222" stroke-width="1.2" />
    <path d="M 52 115 C 26 120, 12 135, 10 125 C 22 118, 40 115, 52 112 Z" fill="url(#darkMetal)" stroke="url(#goldGrad)" stroke-width="1" />

    <!-- Right Obsidian/Gold Wings -->
    <path d="M 150 85 C 180 50, 200 45, 198 30 C 182 35, 162 60, 144 75 Z" fill="url(#goldGrad)" stroke="#222" stroke-width="1.5" />
    <path d="M 155 92 C 185 70, 202 72, 204 60 C 188 62, 166 80, 150 88 Z" fill="url(#darkMetal)" stroke="url(#goldGrad)" stroke-width="1.2" />
    <path d="M 154 102 C 182 95, 198 105, 200 92 C 184 90, 164 100, 152 102 Z" fill="url(#goldGrad)" stroke="#222" stroke-width="1.2" />
    <path d="M 148 115 C 174 120, 188 135, 190 125 C 178 118, 160 115, 148 112 Z" fill="url(#darkMetal)" stroke="url(#goldGrad)" stroke-width="1" />
  </g>

  <!-- Crown / Top Crest Spikes -->
  <polygon points="100,18 107,38 93,38" fill="url(#goldGrad)" stroke="#111" stroke-width="1" />
  <polygon points="86,25 93,42 81,40" fill="url(#goldGrad)" stroke="#111" stroke-width="1" />
  <polygon points="114,25 119,40 107,42" fill="url(#goldGrad)" stroke="#111" stroke-width="1" />
  <circle cx="100" cy="38" r="4" fill="#FFD54F" stroke="#3E2723" stroke-width="1.5" />

  <!-- Outer Circular Golden Rim with Ornate studs -->
  <circle cx="100" cy="100" r="64" fill="none" stroke="url(#goldGrad)" stroke-width="8" stroke-dasharray="16 4" filter="url(#goldGlow)" />
  <circle cx="100" cy="100" r="60" fill="none" stroke="#1A1208" stroke-width="5" />
  <circle cx="100" cy="100" r="56" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" />

  <!-- Bottom Crest Pendant -->
  <polygon points="100,172 108,155 92,155" fill="url(#goldGrad)" stroke="#111" stroke-width="1" />
  <circle cx="100" cy="156" r="3" fill="#FFE082" />
</svg>`)}`;

const ADMIN_RECT_MESSAGE_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="adminBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700" />
      <stop offset="25%" stop-color="#B8860B" />
      <stop offset="50%" stop-color="#FFD700" />
      <stop offset="75%" stop-color="#DAA520" />
      <stop offset="100%" stop-color="#8B6508" />
    </linearGradient>
    <linearGradient id="adminBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A1305" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#0F0C05" stop-opacity="0.98" />
      <stop offset="100%" stop-color="#140F04" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <!-- Background Rect -->
  <rect x="3" y="3" width="394" height="114" rx="8" fill="url(#adminBgGrad)" stroke="url(#adminBorderGrad)" stroke-width="2.5" />
  <rect x="7" y="7" width="386" height="106" rx="6" fill="none" stroke="#FFD700" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.6" />
  <!-- Corner Ornaments (Top Left) -->
  <polygon points="4,4 20,4 20,8 8,8 8,20 4,20" fill="url(#adminBorderGrad)" />
  <circle cx="14" cy="14" r="2.5" fill="#FFE57F" />
  <!-- Corner Ornaments (Top Right) -->
  <polygon points="396,4 380,4 380,8 392,8 392,20 396,20" fill="url(#adminBorderGrad)" />
  <circle cx="386" cy="14" r="2.5" fill="#FFE57F" />
  <!-- Corner Ornaments (Bottom Left) -->
  <polygon points="4,116 20,116 20,112 8,112 8,100 4,100" fill="url(#adminBorderGrad)" />
  <circle cx="14" cy="106" r="2.5" fill="#FFE57F" />
  <!-- Corner Ornaments (Bottom Right) -->
  <polygon points="396,116 380,116 380,112 392,112 392,100 396,100" fill="url(#adminBorderGrad)" />
  <circle cx="386" cy="106" r="2.5" fill="#FFE57F" />
  <!-- Center Top Crest Emblem -->
  <polygon points="200,2 208,10 192,10" fill="url(#adminBorderGrad)" />
  <circle cx="200" cy="9" r="2" fill="#FFE57F" />
</svg>`)}`;

const SUPREME_CIRCULAR_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E9D5FF" />
      <stop offset="35%" stop-color="#C084FC" />
      <stop offset="70%" stop-color="#9333EA" />
      <stop offset="100%" stop-color="#581C87" />
    </linearGradient>
    <filter id="purpleGlow">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <!-- Radiant Purple Aura Spikes -->
  <g filter="url(#purpleGlow)">
    <circle cx="100" cy="100" r="66" fill="none" stroke="url(#purpleGrad)" stroke-width="4" stroke-dasharray="12 6" />
    <!-- 8 Radiant Gemstones Around Rim -->
    <circle cx="100" cy="30" r="4" fill="#F3E8FF" />
    <circle cx="149" cy="51" r="3.5" fill="#D8B4FE" />
    <circle cx="170" cy="100" r="4" fill="#F3E8FF" />
    <circle cx="149" cy="149" r="3.5" fill="#D8B4FE" />
    <circle cx="100" cy="170" r="4" fill="#F3E8FF" />
    <circle cx="51" cy="149" r="3.5" fill="#D8B4FE" />
    <circle cx="30" cy="100" r="4" fill="#F3E8FF" />
    <circle cx="51" cy="51" r="3.5" fill="#D8B4FE" />
  </g>
  <circle cx="100" cy="100" r="60" fill="none" stroke="#2E1065" stroke-width="5" />
  <circle cx="100" cy="100" r="56" fill="none" stroke="url(#purpleGrad)" stroke-width="2" />
</svg>`)}`;

const SUPREME_RECT_MESSAGE_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="supremeBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E9D5FF" />
      <stop offset="30%" stop-color="#C084FC" />
      <stop offset="70%" stop-color="#9333EA" />
      <stop offset="100%" stop-color="#6B21A8" />
    </linearGradient>
    <linearGradient id="supremeBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E0B36" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#120624" stop-opacity="0.98" />
      <stop offset="100%" stop-color="#180A2D" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="394" height="114" rx="8" fill="url(#supremeBgGrad)" stroke="url(#supremeBorderGrad)" stroke-width="2.5" />
  <rect x="7" y="7" width="386" height="106" rx="6" fill="none" stroke="#C084FC" stroke-width="0.8" stroke-dasharray="5,3" opacity="0.6" />
  <polygon points="4,4 18,4 18,7 7,7 7,18 4,18" fill="url(#supremeBorderGrad)" />
  <circle cx="13" cy="13" r="2.5" fill="#F3E8FF" />
  <polygon points="396,4 382,4 382,7 393,7 393,18 396,18" fill="url(#supremeBorderGrad)" />
  <circle cx="387" cy="13" r="2.5" fill="#F3E8FF" />
  <polygon points="4,116 18,116 18,113 7,113 7,102 4,102" fill="url(#supremeBorderGrad)" />
  <circle cx="13" cy="107" r="2.5" fill="#F3E8FF" />
  <polygon points="396,116 382,116 382,113 393,113 393,102 396,102" fill="url(#supremeBorderGrad)" />
  <circle cx="387" cy="107" r="2.5" fill="#F3E8FF" />
</svg>`)}`;

const OVERLORD_CIRCULAR_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F7FA" />
      <stop offset="30%" stop-color="#80DEEA" />
      <stop offset="60%" stop-color="#FFD54F" />
      <stop offset="100%" stop-color="#00838F" />
    </linearGradient>
    <filter id="diamondGlow">
      <feGaussianBlur stdDeviation="3.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <g filter="url(#diamondGlow)">
    <circle cx="100" cy="100" r="65" fill="none" stroke="url(#diamondGrad)" stroke-width="4.5" stroke-dasharray="14 5" />
    <!-- Diamond Crystals -->
    <polygon points="100,26 105,32 100,38 95,32" fill="#E0F7FA" stroke="#006064" stroke-width="0.8" />
    <polygon points="174,100 168,105 162,100 168,95" fill="#E0F7FA" stroke="#006064" stroke-width="0.8" />
    <polygon points="100,174 105,168 100,162 95,168" fill="#E0F7FA" stroke="#006064" stroke-width="0.8" />
    <polygon points="26,100 32,105 38,100 32,95" fill="#E0F7FA" stroke="#006064" stroke-width="0.8" />
  </g>
  <circle cx="100" cy="100" r="59" fill="none" stroke="#082F3B" stroke-width="4" />
  <circle cx="100" cy="100" r="56" fill="none" stroke="url(#diamondGrad)" stroke-width="2" />
</svg>`)}`;

const OVERLORD_RECT_MESSAGE_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="overlordBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F7FA" />
      <stop offset="35%" stop-color="#4DD0E1" />
      <stop offset="65%" stop-color="#FFD54F" />
      <stop offset="100%" stop-color="#0097A7" />
    </linearGradient>
    <linearGradient id="overlordBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#08232B" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#06151B" stop-opacity="0.98" />
      <stop offset="100%" stop-color="#0A2832" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="394" height="114" rx="8" fill="url(#overlordBgGrad)" stroke="url(#overlordBorderGrad)" stroke-width="2.5" />
  <rect x="7" y="7" width="386" height="106" rx="6" fill="none" stroke="#4DD0E1" stroke-width="0.8" stroke-dasharray="5,3" opacity="0.6" />
  <polygon points="4,4 18,4 18,7 7,7 7,18 4,18" fill="url(#overlordBorderGrad)" />
  <circle cx="13" cy="13" r="2.5" fill="#E0F7FA" />
  <polygon points="396,4 382,4 382,7 393,7 393,18 396,18" fill="url(#overlordBorderGrad)" />
  <circle cx="387" cy="13" r="2.5" fill="#E0F7FA" />
  <polygon points="4,116 18,116 18,113 7,113 7,102 4,102" fill="url(#overlordBorderGrad)" />
  <circle cx="13" cy="107" r="2.5" fill="#E0F7FA" />
  <polygon points="396,116 382,116 382,113 393,113 393,102 396,102" fill="url(#overlordBorderGrad)" />
  <circle cx="387" cy="107" r="2.5" fill="#E0F7FA" />
</svg>`)}`;

const VANGUARD_CIRCULAR_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="vanguardGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF9C4" />
      <stop offset="35%" stop-color="#FFD54F" />
      <stop offset="70%" stop-color="#FFA000" />
      <stop offset="100%" stop-color="#FF6F00" />
    </linearGradient>
    <filter id="vanguardGlow">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <g filter="url(#vanguardGlow)">
    <circle cx="100" cy="100" r="64" fill="none" stroke="url(#vanguardGold)" stroke-width="4.5" stroke-dasharray="10 4" />
  </g>
  <circle cx="100" cy="100" r="59" fill="none" stroke="#2B1A04" stroke-width="4" />
  <circle cx="100" cy="100" r="56" fill="none" stroke="url(#vanguardGold)" stroke-width="2" />
</svg>`)}`;

const VANGUARD_RECT_MESSAGE_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="vanguardBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF59D" />
      <stop offset="40%" stop-color="#FFCA28" />
      <stop offset="80%" stop-color="#FF8F00" />
      <stop offset="100%" stop-color="#E65100" />
    </linearGradient>
    <linearGradient id="vanguardBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#241904" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#191002" stop-opacity="0.98" />
      <stop offset="100%" stop-color="#201503" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="394" height="114" rx="8" fill="url(#vanguardBgGrad)" stroke="url(#vanguardBorderGrad)" stroke-width="2.2" />
  <rect x="7" y="7" width="386" height="106" rx="6" fill="none" stroke="#FFD54F" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.6" />
  <polygon points="4,4 16,4 16,6 6,6 6,16 4,16" fill="url(#vanguardBorderGrad)" />
  <polygon points="396,4 384,4 384,6 394,6 394,16 396,16" fill="url(#vanguardBorderGrad)" />
  <polygon points="4,116 16,116 16,114 6,114 6,104 4,104" fill="url(#vanguardBorderGrad)" />
  <polygon points="396,116 384,116 384,114 394,114 394,104 396,104" fill="url(#vanguardBorderGrad)" />
</svg>`)}`;

// Export base assets mapping
export const DEFAULT_FRAME_ASSETS: AppFrameAssets = {
  admin: {
    profileFrame: ADMIN_WINGED_CIRCULAR_FRAME_SVG,
    messageFrame: ADMIN_RECT_MESSAGE_FRAME_SVG,
  },
  supreme: {
    profileFrame: SUPREME_CIRCULAR_FRAME_SVG,
    messageFrame: SUPREME_RECT_MESSAGE_FRAME_SVG,
  },
  overlord: {
    profileFrame: OVERLORD_CIRCULAR_FRAME_SVG,
    messageFrame: OVERLORD_RECT_MESSAGE_FRAME_SVG,
  },
  vanguard: {
    profileFrame: VANGUARD_CIRCULAR_FRAME_SVG,
    messageFrame: VANGUARD_RECT_MESSAGE_FRAME_SVG,
  },
};

// Initialize from localStorage if available
function loadSavedFrameAssets(): AppFrameAssets {
  if (typeof window === 'undefined') return { ...DEFAULT_FRAME_ASSETS };
  try {
    const raw = localStorage.getItem('skyblock_official_frame_assets');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        admin: { ...DEFAULT_FRAME_ASSETS.admin, ...(parsed.admin || {}) },
        supreme: { ...DEFAULT_FRAME_ASSETS.supreme, ...(parsed.supreme || {}) },
        overlord: { ...DEFAULT_FRAME_ASSETS.overlord, ...(parsed.overlord || {}) },
        vanguard: { ...DEFAULT_FRAME_ASSETS.vanguard, ...(parsed.vanguard || {}) },
      };
    }
  } catch (e) {
    console.warn('Failed to load saved frame assets from localStorage:', e);
  }
  return { ...DEFAULT_FRAME_ASSETS };
}

let dynamicFrameAssets: AppFrameAssets = loadSavedFrameAssets();

export function getFrameAssets(): AppFrameAssets {
  return dynamicFrameAssets;
}

export function setFrameAssets(customAssets: Partial<AppFrameAssets>) {
  dynamicFrameAssets = {
    ...dynamicFrameAssets,
    ...customAssets,
    admin: { ...dynamicFrameAssets.admin, ...(customAssets.admin || {}) },
    supreme: { ...dynamicFrameAssets.supreme, ...(customAssets.supreme || {}) },
    overlord: { ...dynamicFrameAssets.overlord, ...(customAssets.overlord || {}) },
    vanguard: { ...dynamicFrameAssets.vanguard, ...(customAssets.vanguard || {}) },
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('skyblock_official_frame_assets', JSON.stringify(dynamicFrameAssets));
      window.dispatchEvent(new CustomEvent('frame-assets-updated', { detail: dynamicFrameAssets }));
    } catch (e) {
      console.warn('Failed to save frame assets to localStorage:', e);
    }
  }
}

