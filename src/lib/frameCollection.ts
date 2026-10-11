import { FrameItem, FrameType } from '../types';
import { DEFAULT_FRAME_ASSETS } from './frameAssets';

// Helper to encode SVG into clean data URL
function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

// ---------------------------------------------------------------------------
// PROFILE FRAMES GENERATOR (Circular frames with transparent center r=60, cx=100 cy=100)
// ---------------------------------------------------------------------------

interface ProfileFrameSpec {
  id: string;
  name: string;
  category: string;
  description: string;
  glow: string;
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
  theme: 'wings' | 'runes' | 'flames' | 'crystals' | 'cyber' | 'dragon' | 'stars' | 'laurel' | 'shadow' | 'spikes';
  isDefaultAsset?: string;
}

const PROFILE_SPECS: ProfileFrameSpec[] = [
  // Existing Membership & Admin frames (Direct assets preserved)
  {
    id: 'pf_admin_winged',
    name: 'Sovereign Monarch Wings',
    category: 'Gold & Black',
    description: 'Owner Admin exclusive gilded wings with obsidian filigree and imperial crest.',
    glow: '#FFD700',
    primary: '#FFD700',
    secondary: '#FFA000',
    accent: '#FFF8E1',
    dark: '#1A1208',
    theme: 'wings',
    isDefaultAsset: DEFAULT_FRAME_ASSETS.admin.profileFrame,
  },
  {
    id: 'pf_supreme_purple',
    name: 'Supreme Nether Aura',
    category: 'Purple Magic',
    description: 'SUPREME VIP radiant amethyst aura with orbital power nodes.',
    glow: '#C084FC',
    primary: '#A855F7',
    secondary: '#7E22CE',
    accent: '#F3E8FF',
    dark: '#2E1065',
    theme: 'runes',
    isDefaultAsset: DEFAULT_FRAME_ASSETS.supreme.profileFrame,
  },
  {
    id: 'pf_overlord_diamond',
    name: 'Overlord Polished Silver',
    category: 'Silver & Platinum',
    description: 'OVERLORD Premium polished metallic silver halo with faceted crystal studs.',
    glow: '#CBD5E1',
    primary: '#E2E8F0',
    secondary: '#94A3B8',
    accent: '#FFFFFF',
    dark: '#0F172A',
    theme: 'crystals',
    isDefaultAsset: DEFAULT_FRAME_ASSETS.overlord.profileFrame,
  },
  {
    id: 'pf_vanguard_gold',
    name: 'Vanguard Gilded Halo',
    category: 'Royal & Ornamental',
    description: 'VANGUARD Premium Lite polished golden sunburst rim.',
    glow: '#FBBF24',
    primary: '#F59E0B',
    secondary: '#D97706',
    accent: '#FEF3C7',
    dark: '#2B1A04',
    theme: 'laurel',
    isDefaultAsset: DEFAULT_FRAME_ASSETS.vanguard.profileFrame,
  },

  // Gold & Black
  { id: 'pf_obsidian_emperor', name: 'Obsidian Emperor', category: 'Gold & Black', description: 'Heavy volcanic obsidian plating with 24k gold inlay.', glow: '#FFB300', primary: '#FFC107', secondary: '#FF8F00', accent: '#FFF9C4', dark: '#121212', theme: 'spikes' },
  { id: 'pf_pharaoh_eternity', name: "Pharaoh's Eternity", category: 'Gold & Black', description: 'Ancient gilded scarab wings with royal lapis studs.', glow: '#F59E0B', primary: '#FCD34D', secondary: '#B45309', accent: '#FEF9C3', dark: '#1C1917', theme: 'wings' },
  { id: 'pf_gilded_valkyrie', name: 'Gilded Valkyrie', category: 'Gold & Black', description: 'Ascendant angel wings dipped in molten aurum.', glow: '#FBBF24', primary: '#FDE68A', secondary: '#D97706', accent: '#FFFFFF', dark: '#1F1605', theme: 'wings' },
  { id: 'pf_dark_royalty', name: 'Dark Royalty', category: 'Gold & Black', description: 'Midnight obsidian laurels studded with golden gems.', glow: '#F59E0B', primary: '#F59E0B', secondary: '#78350F', accent: '#FEF08A', dark: '#0C0A09', theme: 'laurel' },

  // Cosmic & Celestial
  { id: 'pf_astral_nebula', name: 'Astral Nebula', category: 'Cosmic & Void', description: 'Swirling star-stuff and deep violet nebula tendrils.', glow: '#818CF8', primary: '#6366F1', secondary: '#4338CA', accent: '#E0E7FF', dark: '#0F172A', theme: 'stars' },
  { id: 'pf_supernova_core', name: 'Supernova Core', category: 'Cosmic & Void', description: 'Cataclysmic stellar explosion trapped in orbital stasis.', glow: '#FB7185', primary: '#F43F5E', secondary: '#BE123C', accent: '#FFE4E6', dark: '#1E1B4B', theme: 'stars' },
  { id: 'pf_void_singularity', name: 'Void Singularity', category: 'Cosmic & Void', description: 'Black hole accretion disk warping reality.', glow: '#A855F7', primary: '#9333EA', secondary: '#581C87', accent: '#FAF5FF', dark: '#090514', theme: 'runes' },
  { id: 'pf_event_horizon', name: 'Event Horizon', category: 'Cosmic & Void', description: 'Gravitational boundary where light cannot escape.', glow: '#38BDF8', primary: '#0284C7', secondary: '#1E1B4B', accent: '#CFFAFE', dark: '#020617', theme: 'runes' },
  { id: 'pf_starlight_seraph', name: 'Starlight Seraph', category: 'Cosmic & Void', description: 'Constellation wings woven from dying pulsars.', glow: '#67E8F9', primary: '#22D3EE', secondary: '#0E7490', accent: '#ECFEFF', dark: '#083344', theme: 'wings' },

  // Dragon & Fantasy
  { id: 'pf_crimson_wyrm', name: 'Crimson Wyrm', category: 'Dragon & Fantasy', description: 'Serrated dragon horns with smoldering embers.', glow: '#EF4444', primary: '#DC2626', secondary: '#991B1B', accent: '#FEE2E2', dark: '#450A0A', theme: 'dragon' },
  { id: 'pf_elder_drake', name: 'Elder Drake Claws', category: 'Dragon & Fantasy', description: 'Draconic talons guarding an inner core.', glow: '#F97316', primary: '#EA580C', secondary: '#9A3412', accent: '#FFEDD5', dark: '#2A0800', theme: 'dragon' },
  { id: 'pf_frost_wyvern', name: 'Frost Wyvern Crest', category: 'Dragon & Fantasy', description: 'Glacial dragon scales forged in blizzard peaks.', glow: '#38BDF8', primary: '#0EA5E9', secondary: '#0369A1', accent: '#E0F2FE', dark: '#082F49', theme: 'dragon' },
  { id: 'pf_shadow_hydra', name: 'Shadow Hydra', category: 'Dragon & Fantasy', description: 'Serpentine shadow crests pulsating with venom.', glow: '#84CC16', primary: '#65A30D', secondary: '#365314', accent: '#ECFCCB', dark: '#142E00', theme: 'dragon' },
  { id: 'pf_dragonheart_ember', name: 'Dragonheart Ember', category: 'Dragon & Fantasy', description: 'Living pulse of an ancient fire drake heart.', glow: '#F97316', primary: '#FB923C', secondary: '#C2410C', accent: '#FFF7ED', dark: '#350E00', theme: 'flames' },

  // Fire & Inferno
  { id: 'pf_hellfire_blaze', name: 'Hellfire Blaze', category: 'Fire & Inferno', description: 'Infernal fire spikes licking the rim with fury.', glow: '#F97316', primary: '#EF4444', secondary: '#B91C1C', accent: '#FEF08A', dark: '#2D0A00', theme: 'flames' },
  { id: 'pf_phoenix_rebirth', name: 'Phoenix Rebirth', category: 'Fire & Inferno', description: 'Sacred flame plumage rising from golden ashes.', glow: '#F59E0B', primary: '#FB923C', secondary: '#EA580C', accent: '#FFFBEB', dark: '#431407', theme: 'wings' },
  { id: 'pf_molten_core', name: 'Molten Core', category: 'Fire & Inferno', description: 'Magma crust fracturing under intense thermal pressure.', glow: '#EA580C', primary: '#DC2626', secondary: '#7F1D1D', accent: '#FED7AA', dark: '#1C0600', theme: 'spikes' },
  { id: 'pf_solar_flare', name: 'Solar Flare', category: 'Fire & Inferno', description: 'Corona ejection flares radiating outward.', glow: '#FACC15', primary: '#F59E0B', secondary: '#D97706', accent: '#FEF9C3', dark: '#331B00', theme: 'flames' },

  // Ice & Glacial
  { id: 'pf_frostbite_glacial', name: 'Frostbite Glacial', category: 'Ice & Glacial', description: 'Pure crystalline stalagmites frozen at absolute zero.', glow: '#67E8F9', primary: '#38BDF8', secondary: '#0284C7', accent: '#F0FDFA', dark: '#042F2E', theme: 'crystals' },
  { id: 'pf_blizzard_shards', name: 'Blizzard Shards', category: 'Ice & Glacial', description: 'Spiked icicles revolving in a frozen vortex.', glow: '#38BDF8', primary: '#7DD3FC', secondary: '#0369A1', accent: '#E0F2FE', dark: '#082F49', theme: 'spikes' },
  { id: 'pf_arctic_aurora', name: 'Arctic Aurora', category: 'Ice & Glacial', description: 'Shimmering polar magnetic waves of emerald and cyan.', glow: '#34D399', primary: '#2DD4BF', secondary: '#0F766E', accent: '#CCFBF1', dark: '#022C22', theme: 'runes' },
  { id: 'pf_permafrost_rune', name: 'Permafrost Rune', category: 'Ice & Glacial', description: 'Ancient Norse ice glyph etched into glacial stone.', glow: '#93C5FD', primary: '#60A5FA', secondary: '#1D4ED8', accent: '#EFF6FF', dark: '#0F172A', theme: 'runes' },

  // Lightning & Tempest
  { id: 'pf_stormbringer_arc', name: 'Stormbringer Arc', category: 'Lightning & Tempest', description: 'High-voltage electric arcs leaping between capacitors.', glow: '#38BDF8', primary: '#0284C7', secondary: '#0369A1', accent: '#F0F9FF', dark: '#0B1E38', theme: 'spikes' },
  { id: 'pf_plasma_surge', name: 'Plasma Surge', category: 'Lightning & Tempest', description: 'Supercharged ionized plasma discharge ring.', glow: '#A855F7', primary: '#8B5CF6', secondary: '#6D28D9', accent: '#EDE9FE', dark: '#1E0E38', theme: 'spikes' },
  { id: 'pf_thunder_sovereign', name: 'Thunder Sovereign', category: 'Lightning & Tempest', description: 'Thundercloud crown charged with violent lightning.', glow: '#FACC15', primary: '#EAB308', secondary: '#A16207', accent: '#FEF08A', dark: '#1C1500', theme: 'wings' },
  { id: 'pf_voltage_overload', name: 'Voltage Overload', category: 'Lightning & Tempest', description: 'Critical capacitor discharge dancing around the perimeter.', glow: '#22D3EE', primary: '#06B6D4', secondary: '#0E7490', accent: '#CFFAFE', dark: '#02232E', theme: 'spikes' },

  // Crystal & Gemstone
  { id: 'pf_emerald_empress', name: 'Emerald Empress', category: 'Crystal & Gemstone', description: 'Lustrous imperial emeralds set in polished platinum.', glow: '#34D399', primary: '#10B981', secondary: '#047857', accent: '#D1FAE5', dark: '#022C22', theme: 'crystals' },
  { id: 'pf_ruby_bloodstone', name: 'Ruby Bloodstone', category: 'Crystal & Gemstone', description: 'Deep pigeon-blood rubies glowing with inner crimson light.', glow: '#F43F5E', primary: '#E11D48', secondary: '#9F1239', accent: '#FFE4E6', dark: '#4C0519', theme: 'crystals' },
  { id: 'pf_sapphire_titan', name: 'Sapphire Titan', category: 'Crystal & Gemstone', description: 'Royal blue sapphire geodes flanked by mithril brackets.', glow: '#60A5FA', primary: '#3B82F6', secondary: '#1D4ED8', accent: '#DBEAFE', dark: '#172554', theme: 'crystals' },
  { id: 'pf_amethyst_geode', name: 'Amethyst Geode', category: 'Crystal & Gemstone', description: 'Raw crystalline amethyst clusters sparkling in the dark.', glow: '#C084FC', primary: '#A855F7', secondary: '#7E22CE', accent: '#F3E8FF', dark: '#2E1065', theme: 'crystals' },

  // Purple Magic & Arcane
  { id: 'pf_runebound_arcana', name: 'Runebound Arcana', category: 'Purple Magic', description: 'Ancient spell runes glowing with forbidden sorcery.', glow: '#A855F7', primary: '#9333EA', secondary: '#6B21A8', accent: '#FAF5FF', dark: '#190429', theme: 'runes' },
  { id: 'pf_nethermancer_sigil', name: 'Nethermancer Sigil', category: 'Purple Magic', description: 'Occult hex circles spinning with eldritch energy.', glow: '#D946EF', primary: '#C026D3', secondary: '#86198F', accent: '#FDF4FF', dark: '#28052B', theme: 'runes' },
  { id: 'pf_abyssal_enigma', name: 'Abyssal Enigma', category: 'Purple Magic', description: 'Dark dimensional rifts opening into the void.', glow: '#818CF8', primary: '#6366F1', secondary: '#4338CA', accent: '#E0E7FF', dark: '#0C0F2B', theme: 'wings' },
  { id: 'pf_witching_hour', name: 'Witching Hour', category: 'Purple Magic', description: 'Midnight eclipse aura radiating spectral butterflies.', glow: '#C084FC', primary: '#A855F7', secondary: '#581C87', accent: '#F5D0FE', dark: '#170426', theme: 'stars' },

  // Cyber & Neon
  { id: 'pf_cyberpunk_matrix', name: 'Cyberpunk Matrix', category: 'Cyber & Neon', description: 'Neon green HUD reticle with digital brackets and target locks.', glow: '#4ADE80', primary: '#22C55E', secondary: '#15803D', accent: '#DCFCE7', dark: '#052E16', theme: 'cyber' },
  { id: 'pf_synthwave_horizon', name: 'Synthwave Horizon', category: 'Cyber & Neon', description: 'Hot magenta and cyan retrogrid lines from 1984.', glow: '#F472B6', primary: '#EC4899', secondary: '#06B6D4', accent: '#FDF2F8', dark: '#1C0524', theme: 'cyber' },
  { id: 'pf_neon_genesis', name: 'Neon Genesis', category: 'Cyber & Neon', description: 'Hexagonal energy shield projector with optic sensors.', glow: '#38BDF8', primary: '#0EA5E9', secondary: '#6366F1', accent: '#E0F2FE', dark: '#071A2E', theme: 'cyber' },
  { id: 'pf_glitch_overclock', name: 'Glitch Overclock', category: 'Cyber & Neon', description: 'Chromatic aberration frames glitching through reality.', glow: '#FB7185', primary: '#F43F5E', secondary: '#06B6D4', accent: '#FFE4E6', dark: '#17061A', theme: 'cyber' },

  // Ancient & Mythic
  { id: 'pf_olympus_laurel', name: 'Olympus Laurel', category: 'Ancient & Mythic', description: 'Golden laurel wreath bestowed upon divine champions.', glow: '#FBBF24', primary: '#F59E0B', secondary: '#B45309', accent: '#FEF3C7', dark: '#241400', theme: 'laurel' },
  { id: 'pf_valhalla_aegis', name: 'Valhalla Aegis', category: 'Ancient & Mythic', description: 'Heavy Norse runic shield rim forged by dwarven smiths.', glow: '#94A3B8', primary: '#CBD5E1', secondary: '#64748B', accent: '#F8FAFC', dark: '#0F172A', theme: 'spikes' },
  { id: 'pf_atlantis_trident', name: "Atlantis Trident", category: 'Ancient & Mythic', description: 'Oceanic coral and enchanted sea-gold pronged crests.', glow: '#2DD4BF', primary: '#14B8A6', secondary: '#0D9488', accent: '#CCFBF1', dark: '#042F2E', theme: 'spikes' },
  { id: 'pf_ankh_eternity', name: 'Ankh of Eternity', category: 'Ancient & Mythic', description: 'Sacred Egyptian hieroglyphic sun disk of immortality.', glow: '#F59E0B', primary: '#EAB308', secondary: '#A16207', accent: '#FEF9C3', dark: '#291800', theme: 'laurel' },

  // Royal & Ornamental
  { id: 'pf_imperial_fleur', name: 'Imperial Fleur-de-lis', category: 'Royal & Ornamental', description: 'Royal heraldic lilies wrought in filigreed gold.', glow: '#FBBF24', primary: '#FCD34D', secondary: '#D97706', accent: '#FFFFFF', dark: '#261502', theme: 'laurel' },
  { id: 'pf_kings_guard', name: "King's Guard Crest", category: 'Royal & Ornamental', description: 'Knightly steel visor ring flanked by golden plumage.', glow: '#E2E8F0', primary: '#94A3B8', secondary: '#475569', accent: '#F8FAFC', dark: '#1E293B', theme: 'spikes' },
  { id: 'pf_gilded_baroque', name: 'Gilded Baroque', category: 'Royal & Ornamental', description: 'Intricate 18th-century royal scrollwork and diamond beads.', glow: '#F59E0B', primary: '#FBBF24', secondary: '#B45309', accent: '#FEF3C7', dark: '#1C1001', theme: 'laurel' },
  { id: 'pf_queen_chrysalis', name: 'Queen Chrysalis', category: 'Royal & Ornamental', description: 'Delicate lace filigree adorned with opalescent pearls.', glow: '#F472B6', primary: '#FB7185', secondary: '#BE123C', accent: '#FFF1F2', dark: '#310614', theme: 'wings' },

  // Shadow & Dark Fantasy
  { id: 'pf_soul_harvester', name: 'Soul Harvester', category: 'Shadow & Dark', description: 'Wailing spirit wisps trapped inside cursed bone armor.', glow: '#2DD4BF', primary: '#14B8A6', secondary: '#042F2E', accent: '#99F6E4', dark: '#021815', theme: 'shadow' },
  { id: 'pf_necromancer_veil', name: 'Necromancer Veil', category: 'Shadow & Dark', description: 'Blackened vertebrae spikes dripping with necromantic ichor.', glow: '#A855F7', primary: '#7E22CE', secondary: '#3B0764', accent: '#E9D5FF', dark: '#0F031C', theme: 'spikes' },
  { id: 'pf_phantom_wraith', name: 'Phantom Wraith', category: 'Shadow & Dark', description: 'Ethereal mist tendrils dissipating into the underworld.', glow: '#64748B', primary: '#475569', secondary: '#1E293B', accent: '#E2E8F0', dark: '#020617', theme: 'shadow' },
  { id: 'pf_reaper_scythe', name: "Reaper's Scythe", category: 'Shadow & Dark', description: 'Curved obsidian scythe blades orbiting the soul.', glow: '#EF4444', primary: '#991B1B', secondary: '#450A0A', accent: '#FCA5A5', dark: '#150000', theme: 'spikes' },

  // Angelic & Divine
  { id: 'pf_seraphim_halo', name: 'Seraphim Halo', category: 'Angelic & Divine', description: 'Six radiant feathered wings encircling sacred light.', glow: '#FDE047', primary: '#FACC15', secondary: '#CA8A04', accent: '#FEFCE8', dark: '#241A00', theme: 'wings' },
  { id: 'pf_archangel_aegis', name: 'Archangel Aegis', category: 'Angelic & Divine', description: 'Divine celestial wings tipped with heavenly silver.', glow: '#E2E8F0', primary: '#F8FAFC', secondary: '#94A3B8', accent: '#FFFFFF', dark: '#0F172A', theme: 'wings' },
  { id: 'pf_divine_judgement', name: 'Divine Judgement', category: 'Angelic & Divine', description: 'Holy dawn rays radiating righteous purification.', glow: '#FDE68A', primary: '#FCD34D', secondary: '#B45309', accent: '#FFFFFF', dark: '#261601', theme: 'stars' },

  // Biohazard & Toxic
  { id: 'pf_toxic_venomfang', name: 'Toxic Venomfang', category: 'Biohazard & Toxic', description: 'Radioactive neon green spikes dripping lethal neurotoxin.', glow: '#A3E635', primary: '#84CC16', secondary: '#4D7C0F', accent: '#ECFCCB', dark: '#142E00', theme: 'spikes' },
  { id: 'pf_radioactive_core', name: 'Radioactive Core', category: 'Biohazard & Toxic', description: 'Trefoil hazard geometry glowing with unstable uranium.', glow: '#FACC15', primary: '#84CC16', secondary: '#365314', accent: '#FEF08A', dark: '#0D2100', theme: 'cyber' },
  { id: 'pf_corrosive_blight', name: 'Corrosive Blight', category: 'Biohazard & Toxic', description: 'Acrid chemical fumes condensing into toxic crystals.', glow: '#22C55E', primary: '#16A34A', secondary: '#14532D', accent: '#DCFCE7', dark: '#031F0B', theme: 'crystals' },

  // Special Rares
  { id: 'pf_chronos_timepiece', name: 'Chronos Timepiece', category: 'Ancient & Mythic', description: 'Temporal cogs and roman numeral rings spinning backward.', glow: '#F59E0B', primary: '#FCD34D', secondary: '#92400E', accent: '#FFFBEB', dark: '#1F1203', theme: 'runes' },
  { id: 'pf_blood_moon', name: 'Blood Moon Eclipse', category: 'Cosmic & Void', description: 'Crimson lunar eclipse ring radiating nocturnal shadows.', glow: '#F43F5E', primary: '#E11D48', secondary: '#881337', accent: '#FFE4E6', dark: '#24040E', theme: 'stars' },
  { id: 'pf_zenith_blade', name: 'Zenith Blade Crest', category: 'Royal & Ornamental', description: 'Masterwork broadsword crossguards joined in a shield.', glow: '#38BDF8', primary: '#FBBF24', secondary: '#0284C7', accent: '#FFFFFF', dark: '#0C1E36', theme: 'spikes' },
  { id: 'pf_abyssal_kraken', name: 'Abyssal Kraken', category: 'Dragon & Fantasy', description: 'Deep ocean leviathan tentacles grasping the frame.', glow: '#06B6D4', primary: '#0891B2', secondary: '#164E63', accent: '#CFFAFE', dark: '#082736', theme: 'shadow' },
  { id: 'pf_infinity_prism', name: 'Infinity Prism', category: 'Crystal & Gemstone', description: 'Refracts light into endless rainbow spectrum beams.', glow: '#EC4899', primary: '#8B5CF6', secondary: '#06B6D4', accent: '#FFFFFF', dark: '#17062E', theme: 'crystals' },
  { id: 'pf_titans_bastion', name: "Titan's Bastion", category: 'Royal & Ornamental', description: 'Unbreakable adamantine castle battlements and towers.', glow: '#94A3B8', primary: '#64748B', secondary: '#334155', accent: '#F1F5F9', dark: '#0F172A', theme: 'spikes' },
];

function generateProfileFrameSvg(spec: ProfileFrameSpec): string {
  if (spec.isDefaultAsset) return spec.isDefaultAsset;

  const { glow, primary, secondary, accent, dark, theme } = spec;

  let decorations = '';

  if (theme === 'wings') {
    decorations = `
      <g filter="url(#glow)">
        <!-- Left Wing -->
        <path d="M 52 82 C 18 52, 2 46, 4 32 C 20 37, 40 60, 58 74 Z" fill="${primary}" stroke="${dark}" stroke-width="1.2" />
        <path d="M 46 90 C 16 68, -2 70, -4 58 C 12 60, 34 78, 50 86 Z" fill="${secondary}" stroke="${primary}" stroke-width="1" />
        <path d="M 48 100 C 20 94, 4 104, 2 92 C 18 90, 38 98, 50 100 Z" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <path d="M 54 112 C 28 118, 14 132, 12 122 C 24 116, 42 112, 54 110 Z" fill="${secondary}" stroke="${primary}" stroke-width="1" />
        <!-- Right Wing -->
        <path d="M 148 82 C 182 52, 198 46, 196 32 C 180 37, 160 60, 142 74 Z" fill="${primary}" stroke="${dark}" stroke-width="1.2" />
        <path d="M 154 90 C 184 68, 202 70, 204 58 C 188 60, 166 78, 150 86 Z" fill="${secondary}" stroke="${primary}" stroke-width="1" />
        <path d="M 152 100 C 180 94, 196 104, 198 92 C 182 90, 162 98, 150 100 Z" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <path d="M 146 112 C 172 118, 186 132, 188 122 C 176 116, 158 112, 146 110 Z" fill="${secondary}" stroke="${primary}" stroke-width="1" />
      </g>
      <!-- Top Crown / Crest -->
      <polygon points="100,20 108,38 92,38" fill="${primary}" stroke="${dark}" stroke-width="1" />
      <polygon points="86,26 94,42 80,40" fill="${secondary}" stroke="${dark}" stroke-width="1" />
      <polygon points="114,26 120,40 106,42" fill="${secondary}" stroke="${dark}" stroke-width="1" />
      <circle cx="100" cy="38" r="3.5" fill="${accent}" />
    `;
  } else if (theme === 'crystals') {
    decorations = `
      <g filter="url(#glow)">
        <!-- 8 Diamond Crystal Spikes around rim -->
        <polygon points="100,20 107,32 100,42 93,32" fill="${accent}" stroke="${primary}" stroke-width="1" />
        <polygon points="100,180 107,168 100,158 93,168" fill="${accent}" stroke="${primary}" stroke-width="1" />
        <polygon points="20,100 32,107 42,100 32,93" fill="${accent}" stroke="${primary}" stroke-width="1" />
        <polygon points="180,100 168,107 158,100 168,93" fill="${accent}" stroke="${primary}" stroke-width="1" />
        <polygon points="44,44 54,48 48,58 40,52" fill="${primary}" stroke="${secondary}" stroke-width="1" />
        <polygon points="156,44 160,54 150,58 144,48" fill="${primary}" stroke="${secondary}" stroke-width="1" />
        <polygon points="44,156 54,152 48,142 40,148" fill="${primary}" stroke="${secondary}" stroke-width="1" />
        <polygon points="156,156 160,146 150,142 144,152" fill="${primary}" stroke="${secondary}" stroke-width="1" />
      </g>
    `;
  } else if (theme === 'dragon') {
    decorations = `
      <g filter="url(#glow)">
        <!-- Dragon Horns Top -->
        <path d="M 85 45 C 70 20, 50 15, 42 12 C 48 24, 62 38, 78 50 Z" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <path d="M 115 45 C 130 20, 150 15, 158 12 C 152 24, 138 38, 122 50 Z" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <!-- Dragon Claws Sides -->
        <path d="M 40 85 C 15 80, 5 75, 2 70 C 14 78, 28 84, 42 92 Z" fill="${secondary}" />
        <path d="M 42 115 C 15 120, 5 125, 2 130 C 14 122, 28 116, 42 108 Z" fill="${secondary}" />
        <path d="M 160 85 C 185 80, 195 75, 198 70 C 186 78, 172 84, 158 92 Z" fill="${secondary}" />
        <path d="M 158 115 C 185 120, 195 125, 198 130 C 186 122, 172 116, 158 108 Z" fill="${secondary}" />
        <!-- Bottom Dragon Fang Pendant -->
        <polygon points="100,185 108,162 92,162" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <circle cx="100" cy="160" r="3" fill="${accent}" />
      </g>
    `;
  } else if (theme === 'flames') {
    decorations = `
      <g filter="url(#glow)">
        <!-- Flame Tendrils -->
        <path d="M 100 16 C 112 30, 120 40, 114 48 C 108 40, 104 32, 100 16 Z" fill="${accent}" />
        <path d="M 88 22 C 78 36, 74 44, 82 50 C 86 42, 92 34, 88 22 Z" fill="${primary}" />
        <path d="M 112 22 C 122 36, 126 44, 118 50 C 114 42, 108 34, 112 22 Z" fill="${primary}" />
        <path d="M 30 80 C 18 90, 16 100, 24 106 C 26 98, 30 90, 30 80 Z" fill="${secondary}" />
        <path d="M 170 80 C 182 90, 184 100, 176 106 C 174 98, 170 90, 170 80 Z" fill="${secondary}" />
        <path d="M 100 184 C 92 170, 88 160, 96 154 C 100 162, 104 170, 100 184 Z" fill="${primary}" />
      </g>
    `;
  } else if (theme === 'cyber') {
    decorations = `
      <g filter="url(#glow)">
        <!-- Cyber Brackets & Reticle -->
        <path d="M 40 40 L 55 40 M 40 40 L 40 55" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="square" />
        <path d="M 160 40 L 145 40 M 160 40 L 160 55" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="square" />
        <path d="M 40 160 L 55 160 M 40 160 L 40 145" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="square" />
        <path d="M 160 160 L 145 160 M 160 160 L 160 145" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="square" />
        <!-- Reticle Ticks -->
        <line x1="100" y1="22" x2="100" y2="32" stroke="${primary}" stroke-width="3" />
        <line x1="100" y1="168" x2="100" y2="178" stroke="${primary}" stroke-width="3" />
        <line x1="22" y1="100" x2="32" y2="100" stroke="${primary}" stroke-width="3" />
        <line x1="168" y1="100" x2="178" y2="100" stroke="${primary}" stroke-width="3" />
      </g>
    `;
  } else if (theme === 'laurel') {
    decorations = `
      <g filter="url(#glow)">
        <!-- Laurel Leaves Left -->
        <ellipse cx="44" cy="56" rx="8" ry="4" transform="rotate(-35 44 56)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <ellipse cx="34" cy="74" rx="8" ry="4" transform="rotate(-15 34 74)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <ellipse cx="30" cy="96" rx="8" ry="4" transform="rotate(5 30 96)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <ellipse cx="34" cy="118" rx="8" ry="4" transform="rotate(25 34 118)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <ellipse cx="44" cy="136" rx="8" ry="4" transform="rotate(45 44 136)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <!-- Laurel Leaves Right -->
        <ellipse cx="156" cy="56" rx="8" ry="4" transform="rotate(35 156 56)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <ellipse cx="166" cy="74" rx="8" ry="4" transform="rotate(15 166 74)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <ellipse cx="170" cy="96" rx="8" ry="4" transform="rotate(-5 170 96)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <ellipse cx="166" cy="118" rx="8" ry="4" transform="rotate(-25 166 118)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <ellipse cx="156" cy="136" rx="8" ry="4" transform="rotate(-45 156 136)" fill="${primary}" stroke="${dark}" stroke-width="0.8" />
        <!-- Top Laurel Crest -->
        <circle cx="100" cy="30" r="4.5" fill="${accent}" stroke="${secondary}" stroke-width="1.2" />
      </g>
    `;
  } else if (theme === 'stars') {
    decorations = `
      <g filter="url(#glow)">
        <!-- 4 Major Starlight Points -->
        <polygon points="100,18 104,32 118,36 104,40 100,54 96,40 82,36 96,32" fill="${accent}" />
        <polygon points="100,182 104,168 118,164 104,160 100,146 96,160 82,164 96,168" fill="${accent}" />
        <polygon points="18,100 32,104 36,118 40,104 54,100 40,96 36,82 32,96" fill="${accent}" />
        <polygon points="182,100 168,104 164,118 160,104 146,100 160,96 164,82 168,96" fill="${accent}" />
        <!-- Minor Orbital Sparkles -->
        <circle cx="50" cy="50" r="3" fill="${primary}" />
        <circle cx="150" cy="50" r="3" fill="${primary}" />
        <circle cx="50" cy="150" r="3" fill="${primary}" />
        <circle cx="150" cy="150" r="3" fill="${primary}" />
      </g>
    `;
  } else if (theme === 'shadow') {
    decorations = `
      <g filter="url(#glow)">
        <!-- Wisps of dark energy -->
        <path d="M 100 24 C 80 18, 60 28, 48 40 C 64 36, 84 42, 92 48 Z" fill="${primary}" />
        <path d="M 100 24 C 120 18, 140 28, 152 40 C 136 36, 116 42, 108 48 Z" fill="${primary}" />
        <path d="M 32 90 C 20 110, 24 130, 36 142 C 34 126, 38 110, 44 100 Z" fill="${secondary}" />
        <path d="M 168 90 C 180 110, 176 130, 164 142 C 166 126, 162 110, 156 100 Z" fill="${secondary}" />
      </g>
    `;
  } else {
    // Spikes / Runes Default
    decorations = `
      <g filter="url(#glow)">
        <polygon points="100,18 106,34 94,34" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <polygon points="100,182 106,166 94,166" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <polygon points="18,100 34,106 34,94" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <polygon points="182,100 166,106 166,94" fill="${primary}" stroke="${dark}" stroke-width="1" />
        <polygon points="42,42 54,48 46,56" fill="${secondary}" />
        <polygon points="158,42 146,48 154,56" fill="${secondary}" />
        <polygon points="42,158 54,152 46,144" fill="${secondary}" />
        <polygon points="158,158 146,152 154,144" fill="${secondary}" />
      </g>
    `;
  }

  const rawSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  ${decorations}

  <!-- Outer Ring with Pattern -->
  <circle cx="100" cy="100" r="66" fill="none" stroke="${primary}" stroke-width="4.5" stroke-dasharray="14 4" filter="url(#glow)" />
  <circle cx="100" cy="100" r="61" fill="none" stroke="${dark}" stroke-width="4" />
  <circle cx="100" cy="100" r="57" fill="none" stroke="${secondary}" stroke-width="2" />
</svg>
  `;

  return svgDataUrl(rawSvg);
}

// ---------------------------------------------------------------------------
// TEXT FRAMES GENERATOR (Rectangular chat frames 400x120 preserveAspectRatio=none)
// ---------------------------------------------------------------------------

interface TextFrameSpec {
  id: string;
  name: string;
  category: string;
  description: string;
  borderColor: string;
  glowColor: string;
  bgGradStart: string;
  bgGradEnd: string;
  accentColor: string;
  cornerStyle: 'ornate' | 'cyber' | 'crystals' | 'dragon' | 'minimal' | 'royal';
  isDefaultAsset?: string;
}

const TEXT_SPECS: TextFrameSpec[] = [
  // Existing Membership & Admin frames (Direct assets preserved)
  {
    id: 'tf_admin_winged',
    name: 'Owner Admin Sovereign Box',
    category: 'Gold & Black',
    description: 'Owner Admin official gold/black border with imperial corner flourishes.',
    borderColor: '#FFD700',
    glowColor: '#FFD700',
    bgGradStart: '#1A1305',
    bgGradEnd: '#0F0C05',
    accentColor: '#FFE57F',
    cornerStyle: 'ornate',
    isDefaultAsset: DEFAULT_FRAME_ASSETS.admin.messageFrame,
  },
  {
    id: 'tf_supreme_purple',
    name: 'Supreme Nether Enclosure',
    category: 'Purple Magic',
    description: 'SUPREME VIP rich amethyst border with glowing orbital gem insets.',
    borderColor: '#C084FC',
    glowColor: '#9333EA',
    bgGradStart: '#1E0B36',
    bgGradEnd: '#120624',
    accentColor: '#F3E8FF',
    cornerStyle: 'ornate',
    isDefaultAsset: DEFAULT_FRAME_ASSETS.supreme.messageFrame,
  },
  {
    id: 'tf_overlord_diamond',
    name: 'Overlord Silver Casing',
    category: 'Silver & Platinum',
    description: 'OVERLORD Premium polished metallic silver message frame with bevel borders.',
    borderColor: '#E2E8F0',
    glowColor: '#94A3B8',
    bgGradStart: '#0F172A',
    bgGradEnd: '#090D16',
    accentColor: '#FFFFFF',
    cornerStyle: 'crystals',
    isDefaultAsset: DEFAULT_FRAME_ASSETS.overlord.messageFrame,
  },
  {
    id: 'tf_vanguard_gold',
    name: 'Vanguard Gilded Parchment',
    category: 'Royal & Ornamental',
    description: 'VANGUARD Premium Lite golden amber border with corner brackets.',
    borderColor: '#FFCA28',
    glowColor: '#FF8F00',
    bgGradStart: '#241904',
    bgGradEnd: '#191002',
    accentColor: '#FFF59D',
    cornerStyle: 'ornate',
    isDefaultAsset: DEFAULT_FRAME_ASSETS.vanguard.messageFrame,
  },

  // Gold & Black
  { id: 'tf_obsidian_emperor', name: 'Obsidian Emperor Plate', category: 'Gold & Black', description: 'Heavy volcanic obsidian stone laced with 24k gold.', borderColor: '#FFC107', glowColor: '#FF8F00', bgGradStart: '#161208', bgGradEnd: '#0A0803', accentColor: '#FFF8E1', cornerStyle: 'royal' },
  { id: 'tf_pharaoh_relic', name: "Pharaoh's Gold Tablet", category: 'Gold & Black', description: 'Ancient gilded papyrus tablet with hieroglyph borders.', borderColor: '#F59E0B', glowColor: '#D97706', bgGradStart: '#1A1406', bgGradEnd: '#0D0A02', accentColor: '#FEF3C7', cornerStyle: 'ornate' },
  { id: 'tf_valkyrie_crest', name: 'Valkyrie Wing Banner', category: 'Gold & Black', description: 'Feathered gold trim framing every word.', borderColor: '#FBBF24', glowColor: '#B45309', bgGradStart: '#181205', bgGradEnd: '#0E0B02', accentColor: '#FFFFFF', cornerStyle: 'ornate' },
  { id: 'tf_midnight_monarch', name: 'Midnight Monarch', category: 'Gold & Black', description: 'Obsidian black crystal bordered with brushed gold leaf.', borderColor: '#EAB308', glowColor: '#CA8A04', bgGradStart: '#14120C', bgGradEnd: '#0A0906', accentColor: '#FEF08A', cornerStyle: 'royal' },

  // Cosmic & Void
  { id: 'tf_astral_nebula', name: 'Astral Nebula Shroud', category: 'Cosmic & Void', description: 'Deep indigo space dust and starlight corners.', borderColor: '#818CF8', glowColor: '#6366F1', bgGradStart: '#0F112E', bgGradEnd: '#070817', accentColor: '#E0E7FF', cornerStyle: 'ornate' },
  { id: 'tf_supernova_burst', name: 'Supernova Burst', category: 'Cosmic & Void', description: 'Violent rose-tinted starcore flare borders.', borderColor: '#FB7185', glowColor: '#F43F5E', bgGradStart: '#260B14', bgGradEnd: '#14050A', accentColor: '#FFE4E6', cornerStyle: 'crystals' },
  { id: 'tf_void_singularity', name: 'Void Singularity Frame', category: 'Cosmic & Void', description: 'Event horizon boundaries where shadows gather.', borderColor: '#9333EA', glowColor: '#581C87', bgGradStart: '#16052B', bgGradEnd: '#0A0214', accentColor: '#F5D0FE', cornerStyle: 'ornate' },
  { id: 'tf_galaxy_event_horizon', name: 'Event Horizon Ribbon', category: 'Cosmic & Void', description: 'Curved gravity lines bending message text.', borderColor: '#38BDF8', glowColor: '#0284C7', bgGradStart: '#051929', bgGradEnd: '#020C14', accentColor: '#CFFAFE', cornerStyle: 'cyber' },
  { id: 'tf_starlight_seraph', name: 'Starlight Seraph Crest', category: 'Cosmic & Void', description: 'Constellation lines connecting four corner stars.', borderColor: '#22D3EE', glowColor: '#0891B2', bgGradStart: '#041F2B', bgGradEnd: '#020F14', accentColor: '#ECFEFF', cornerStyle: 'ornate' },

  // Dragon & Fantasy
  { id: 'tf_crimson_wyrm', name: 'Crimson Wyrm Scales', category: 'Dragon & Fantasy', description: 'Blood dragon scales with glowing magma channels.', borderColor: '#EF4444', glowColor: '#B91C1C', bgGradStart: '#2E0808', bgGradEnd: '#170303', accentColor: '#FEE2E2', cornerStyle: 'dragon' },
  { id: 'tf_elder_drake', name: 'Elder Drake Plating', category: 'Dragon & Fantasy', description: 'Heavy fire-forged iron laced with dragon claws.', borderColor: '#F97316', glowColor: '#C2410C', bgGradStart: '#2B0E04', bgGradEnd: '#140601', accentColor: '#FFEDD5', cornerStyle: 'dragon' },
  { id: 'tf_frost_wyvern', name: 'Frost Wyvern Casing', category: 'Dragon & Fantasy', description: 'Glacial blue drake fangs enclosing your dialogue.', borderColor: '#38BDF8', glowColor: '#0369A1', bgGradStart: '#082030', bgGradEnd: '#030E14', accentColor: '#E0F2FE', cornerStyle: 'crystals' },
  { id: 'tf_shadow_hydra', name: 'Shadow Hydra Slime', category: 'Dragon & Fantasy', description: 'Cursed serpent scales with toxic green highlights.', borderColor: '#84CC16', glowColor: '#4D7C0F', bgGradStart: '#172605', bgGradEnd: '#0A1201', accentColor: '#ECFCCB', cornerStyle: 'dragon' },
  { id: 'tf_dragonheart_ember', name: 'Dragonheart Hearth', category: 'Dragon & Fantasy', description: 'Warm orange hearth fire with ember particles.', borderColor: '#FB923C', glowColor: '#EA580C', bgGradStart: '#2B1304', bgGradEnd: '#140801', accentColor: '#FFF7ED', cornerStyle: 'ornate' },

  // Fire & Inferno
  { id: 'tf_hellfire_blaze', name: 'Hellfire Blaze Wall', category: 'Fire & Inferno', description: 'Licking flames rising from the bottom border.', borderColor: '#F97316', glowColor: '#DC2626', bgGradStart: '#290A04', bgGradEnd: '#140401', accentColor: '#FEF08A', cornerStyle: 'dragon' },
  { id: 'tf_phoenix_ash', name: 'Phoenix Ash Hearth', category: 'Fire & Inferno', description: 'Smoldering golden ash with phoenix wing corners.', borderColor: '#F59E0B', glowColor: '#EA580C', bgGradStart: '#241203', bgGradEnd: '#120801', accentColor: '#FFFBEB', cornerStyle: 'ornate' },
  { id: 'tf_molten_crust', name: 'Molten Crust', category: 'Fire & Inferno', description: 'Volcanic basalt crust with red-hot fissures.', borderColor: '#EF4444', glowColor: '#7F1D1D', bgGradStart: '#240707', bgGradEnd: '#120202', accentColor: '#FED7AA', cornerStyle: 'minimal' },
  { id: 'tf_solar_flare', name: 'Solar Corona', category: 'Fire & Inferno', description: 'Golden sunspot flares radiating supreme heat.', borderColor: '#FACC15', glowColor: '#D97706', bgGradStart: '#291C03', bgGradEnd: '#140D01', accentColor: '#FEF9C3', cornerStyle: 'royal' },

  // Ice & Glacial
  { id: 'tf_frostbite_glacial', name: 'Frostbite Glacial Slab', category: 'Ice & Glacial', description: 'Carved ice block frozen at sub-zero temperatures.', borderColor: '#38BDF8', glowColor: '#0284C7', bgGradStart: '#061E29', bgGradEnd: '#020C12', accentColor: '#F0FDFA', cornerStyle: 'crystals' },
  { id: 'tf_blizzard_spikes', name: 'Blizzard Icicles', category: 'Ice & Glacial', description: 'Sharp icicles hanging from the top edge.', borderColor: '#7DD3FC', glowColor: '#0369A1', bgGradStart: '#082233', bgGradEnd: '#030E14', accentColor: '#E0F2FE', cornerStyle: 'crystals' },
  { id: 'tf_arctic_aurora', name: 'Arctic Aurora Curtain', category: 'Ice & Glacial', description: 'Luminescent green and cyan curtains of northern light.', borderColor: '#2DD4BF', glowColor: '#0F766E', bgGradStart: '#041F1C', bgGradEnd: '#010F0D', accentColor: '#CCFBF1', cornerStyle: 'ornate' },
  { id: 'tf_permafrost_monolith', name: 'Permafrost Monolith', category: 'Ice & Glacial', description: 'Ancient runic ice tablet that never melts.', borderColor: '#60A5FA', glowColor: '#1D4ED8', bgGradStart: '#0A182E', bgGradEnd: '#040A14', accentColor: '#EFF6FF', cornerStyle: 'ornate' },

  // Lightning & Tempest
  { id: 'tf_stormbringer_arc', name: 'Stormbringer Capacitor', category: 'Lightning & Tempest', description: 'Electric arcs flashing along top and bottom rails.', borderColor: '#0284C7', glowColor: '#38BDF8', bgGradStart: '#071829', bgGradEnd: '#020B14', accentColor: '#F0F9FF', cornerStyle: 'cyber' },
  { id: 'tf_plasma_conduit', name: 'Plasma Conduit', category: 'Lightning & Tempest', description: 'Purple ionized gas channels with high energy output.', borderColor: '#8B5CF6', glowColor: '#6D28D9', bgGradStart: '#170A2E', bgGradEnd: '#0A0314', accentColor: '#EDE9FE', cornerStyle: 'cyber' },
  { id: 'tf_thunder_sovereign', name: 'Thundercloud Vault', category: 'Lightning & Tempest', description: 'Heavy yellow lightning bolts etched in brass.', borderColor: '#EAB308', glowColor: '#A16207', bgGradStart: '#211904', bgGradEnd: '#0F0B01', accentColor: '#FEF08A', cornerStyle: 'royal' },
  { id: 'tf_overload_circuit', name: 'Overloaded Circuit', category: 'Lightning & Tempest', description: 'Cyan electrical surge threatening to burst the frame.', borderColor: '#06B6D4', glowColor: '#0E7490', bgGradStart: '#051D24', bgGradEnd: '#010B0D', accentColor: '#CFFAFE', cornerStyle: 'cyber' },

  // Crystal & Gemstone
  { id: 'tf_emerald_empress', name: 'Emerald Empress Vault', category: 'Crystal & Gemstone', description: 'Vibrant emerald borders set with brilliant cuts.', borderColor: '#10B981', glowColor: '#047857', bgGradStart: '#052418', bgGradEnd: '#01120B', accentColor: '#D1FAE5', cornerStyle: 'crystals' },
  { id: 'tf_ruby_bloodstone', name: 'Ruby Bloodstone Casket', category: 'Crystal & Gemstone', description: 'Deep red blood rubies radiating dark passion.', borderColor: '#E11D48', glowColor: '#9F1239', bgGradStart: '#290610', bgGradEnd: '#120207', accentColor: '#FFE4E6', cornerStyle: 'crystals' },
  { id: 'tf_sapphire_titan', name: 'Sapphire Titan Bastion', category: 'Crystal & Gemstone', description: 'Uncut sapphire crystals reinforcing mithril struts.', borderColor: '#3B82F6', glowColor: '#1D4ED8', bgGradStart: '#091A38', bgGradEnd: '#030B17', accentColor: '#DBEAFE', cornerStyle: 'crystals' },
  { id: 'tf_amethyst_geode', name: 'Amethyst Geode Cave', category: 'Crystal & Gemstone', description: 'Raw violet crystals sparkling inside dark stone.', borderColor: '#A855F7', glowColor: '#7E22CE', bgGradStart: '#1B082E', bgGradEnd: '#0B0214', accentColor: '#F3E8FF', cornerStyle: 'crystals' },

  // Purple Magic & Arcane
  { id: 'tf_runebound_arcana', name: 'Runebound Codex', category: 'Purple Magic', description: 'Glowing arcane inscriptions carved into dark parchment.', borderColor: '#9333EA', glowColor: '#6B21A8', bgGradStart: '#19062E', bgGradEnd: '#0B0114', accentColor: '#FAF5FF', cornerStyle: 'ornate' },
  { id: 'tf_nethermancer_sigil', name: 'Nethermancer Pentagram', category: 'Purple Magic', description: 'Magenta witching sigils guarding the text.', borderColor: '#C026D3', glowColor: '#86198F', bgGradStart: '#240626', bgGradEnd: '#120112', accentColor: '#FDF4FF', cornerStyle: 'ornate' },
  { id: 'tf_abyssal_enigma', name: 'Abyssal Enigma Box', category: 'Purple Magic', description: 'Deep void boundary with subtle violet illumination.', borderColor: '#6366F1', glowColor: '#4338CA', bgGradStart: '#0D0E29', bgGradEnd: '#050614', accentColor: '#E0E7FF', cornerStyle: 'minimal' },
  { id: 'tf_witching_hour', name: 'Witching Hour Silhouette', category: 'Purple Magic', description: 'Midnight purple veil dotted with star crystals.', borderColor: '#A855F7', glowColor: '#581C87', bgGradStart: '#1A0829', bgGradEnd: '#0A0212', accentColor: '#F5D0FE', cornerStyle: 'ornate' },

  // Cyber & Neon
  { id: 'tf_cyberpunk_matrix', name: 'Matrix Terminal HUD', category: 'Cyber & Neon', description: 'Green terminal grid lines with targeting brackets.', borderColor: '#22C55E', glowColor: '#15803D', bgGradStart: '#05210E', bgGradEnd: '#010D05', accentColor: '#DCFCE7', cornerStyle: 'cyber' },
  { id: 'tf_synthwave_horizon', name: 'Synthwave 80s Grid', category: 'Cyber & Neon', description: 'Hot pink and neon blue dual-tone cyberframe.', borderColor: '#EC4899', glowColor: '#06B6D4', bgGradStart: '#24071A', bgGradEnd: '#071A24', accentColor: '#FDF2F8', cornerStyle: 'cyber' },
  { id: 'tf_neon_genesis', name: 'Genesis Energy Shield', category: 'Cyber & Neon', description: 'Hexagonal honeycomb borders with cyan status LEDs.', borderColor: '#0EA5E9', glowColor: '#6366F1', bgGradStart: '#081D2E', bgGradEnd: '#030C14', accentColor: '#E0F2FE', cornerStyle: 'cyber' },
  { id: 'tf_glitch_overclock', name: 'Glitch Error Box', category: 'Cyber & Neon', description: 'Digital glitch displacement with RGB split effects.', borderColor: '#F43F5E', glowColor: '#06B6D4', bgGradStart: '#210515', bgGradEnd: '#051921', accentColor: '#FFE4E6', cornerStyle: 'cyber' },

  // Ancient & Mythic
  { id: 'tf_olympus_laurel', name: 'Olympus Laurel Tablet', category: 'Ancient & Mythic', description: 'Golden laurel branches framing champion words.', borderColor: '#F59E0B', glowColor: '#B45309', bgGradStart: '#241603', bgGradEnd: '#0F0901', accentColor: '#FEF3C7', cornerStyle: 'royal' },
  { id: 'tf_valhalla_shield', name: 'Valhalla Shield Board', category: 'Ancient & Mythic', description: 'Reinforced wood and steel rim from Norse longhouses.', borderColor: '#CBD5E1', glowColor: '#64748B', bgGradStart: '#131A26', bgGradEnd: '#080C12', accentColor: '#F8FAFC', cornerStyle: 'minimal' },
  { id: 'tf_atlantis_shell', name: 'Atlantis Sunken Coral', category: 'Ancient & Mythic', description: 'Deep sea pearlescent teal bordered with sea-gold.', borderColor: '#14B8A6', glowColor: '#0D9488', bgGradStart: '#052420', bgGradEnd: '#011210', accentColor: '#CCFBF1', cornerStyle: 'ornate' },
  { id: 'tf_ankh_eternity', name: 'Ankh Hieroglyphic Board', category: 'Ancient & Mythic', description: 'Sacred gold with embedded turquoise corner stones.', borderColor: '#EAB308', glowColor: '#A16207', bgGradStart: '#211603', bgGradEnd: '#0D0801', accentColor: '#FEF9C3', cornerStyle: 'royal' },

  // Royal & Ornamental
  { id: 'tf_imperial_fleur', name: 'Imperial Fleur Scroll', category: 'Royal & Ornamental', description: 'Gold fleur-de-lis corner ornaments and velvet backdrop.', borderColor: '#FCD34D', glowColor: '#D97706', bgGradStart: '#241804', bgGradEnd: '#0F0A01', accentColor: '#FFFFFF', cornerStyle: 'royal' },
  { id: 'tf_kings_guard', name: "King's Guard Steel Plate", category: 'Royal & Ornamental', description: 'Polished tournament armor steel with brass rivets.', borderColor: '#94A3B8', glowColor: '#475569', bgGradStart: '#141D29', bgGradEnd: '#080D14', accentColor: '#F8FAFC', cornerStyle: 'minimal' },
  { id: 'tf_gilded_baroque', name: 'Gilded Baroque Mirror', category: 'Royal & Ornamental', description: 'Intricate golden scrolls curving along the borders.', borderColor: '#FBBF24', glowColor: '#B45309', bgGradStart: '#211303', bgGradEnd: '#0D0701', accentColor: '#FEF3C7', cornerStyle: 'royal' },
  { id: 'tf_queen_lace', name: 'Queen Lace Filigree', category: 'Royal & Ornamental', description: 'Rose gold delicate lattice border with crystal beads.', borderColor: '#FB7185', glowColor: '#BE123C', bgGradStart: '#260613', bgGradEnd: '#0F0207', accentColor: '#FFF1F2', cornerStyle: 'ornate' },

  // Shadow & Dark Fantasy
  { id: 'tf_soul_harvester', name: 'Soul Harvester Cage', category: 'Shadow & Dark', description: 'Teal spectral soul-mist trapped behind bone bars.', borderColor: '#14B8A6', glowColor: '#042F2E', bgGradStart: '#041F1A', bgGradEnd: '#010D0B', accentColor: '#99F6E4', cornerStyle: 'dragon' },
  { id: 'tf_necromancer_ribs', name: 'Necromancer Bone Rail', category: 'Shadow & Dark', description: 'Curved ribcage border pulsing with dark energy.', borderColor: '#7E22CE', glowColor: '#3B0764', bgGradStart: '#140324', bgGradEnd: '#06010D', accentColor: '#E9D5FF', cornerStyle: 'dragon' },
  { id: 'tf_phantom_mist', name: 'Phantom Mist Border', category: 'Shadow & Dark', description: 'Fading slate grey mist that obscures the edges.', borderColor: '#475569', glowColor: '#1E293B', bgGradStart: '#0D131C', bgGradEnd: '#05070A', accentColor: '#E2E8F0', cornerStyle: 'minimal' },
  { id: 'tf_reaper_edge', name: "Reaper's Blade Rail", category: 'Shadow & Dark', description: 'Blood red scythe edges outlining the message.', borderColor: '#991B1B', glowColor: '#450A0A', bgGradStart: '#210404', bgGradEnd: '#0D0101', accentColor: '#FCA5A5', cornerStyle: 'minimal' },

  // Angelic & Divine
  { id: 'tf_seraphim_halo', name: 'Seraphim Holy Light', category: 'Angelic & Divine', description: 'Golden angelic feathers and radiant halo glow.', borderColor: '#FACC15', glowColor: '#CA8A04', bgGradStart: '#241C03', bgGradEnd: '#0F0B01', accentColor: '#FEFCE8', cornerStyle: 'royal' },
  { id: 'tf_archangel_wings', name: 'Archangel Wing Wall', category: 'Angelic & Divine', description: 'Pure white and silver feathers cushioning the text.', borderColor: '#F8FAFC', glowColor: '#94A3B8', bgGradStart: '#141A26', bgGradEnd: '#080C12', accentColor: '#FFFFFF', cornerStyle: 'ornate' },
  { id: 'tf_divine_dawn', name: 'Divine Dawn Beam', category: 'Angelic & Divine', description: 'Morning sunrise rays breaking across sacred borders.', borderColor: '#FCD34D', glowColor: '#B45309', bgGradStart: '#261804', bgGradEnd: '#0F0901', accentColor: '#FFFFFF', cornerStyle: 'royal' },

  // Biohazard & Toxic
  { id: 'tf_toxic_venomfang', name: 'Toxic Warning Casing', category: 'Biohazard & Toxic', description: 'Bright lime caution stripes with glowing chemical drip.', borderColor: '#84CC16', glowColor: '#4D7C0F', bgGradStart: '#122403', bgGradEnd: '#060D01', accentColor: '#ECFCCB', cornerStyle: 'cyber' },
  { id: 'tf_radioactive_hazard', name: 'Radioactive Bunker Plate', category: 'Biohazard & Toxic', description: 'Heavy yellow and black containment box.', borderColor: '#EAB308', glowColor: '#365314', bgGradStart: '#1C1A03', bgGradEnd: '#0A0A01', accentColor: '#FEF08A', cornerStyle: 'cyber' },
  { id: 'tf_corrosive_acid', name: 'Corrosive Acid Channel', category: 'Biohazard & Toxic', description: 'Emerald green acid etching into metal borders.', borderColor: '#16A34A', glowColor: '#14532D', bgGradStart: '#041F0B', bgGradEnd: '#010D04', accentColor: '#DCFCE7', cornerStyle: 'minimal' },

  // Special Rares
  { id: 'tf_chronos_dial', name: 'Chronos Gear Train', category: 'Ancient & Mythic', description: 'Clockwork cog teeth rotating around the text frame.', borderColor: '#FCD34D', glowColor: '#92400E', bgGradStart: '#211504', bgGradEnd: '#0D0801', accentColor: '#FFFBEB', cornerStyle: 'ornate' },
  { id: 'tf_blood_moon', name: 'Blood Moon Veil', category: 'Cosmic & Void', description: 'Dark crimson night with glowing red lunar borders.', borderColor: '#E11D48', glowColor: '#881337', bgGradStart: '#24050E', bgGradEnd: '#0F0105', accentColor: '#FFE4E6', cornerStyle: 'ornate' },
  { id: 'tf_zenith_blade', name: 'Zenith Blade Scabbard', category: 'Royal & Ornamental', description: 'Gilded crossguards and runic gem insets.', borderColor: '#38BDF8', glowColor: '#0284C7', bgGradStart: '#0A1C2E', bgGradEnd: '#030B14', accentColor: '#FFFFFF', cornerStyle: 'royal' },
  { id: 'tf_kraken_tentacles', name: 'Kraken Abyssal Grasp', category: 'Dragon & Fantasy', description: 'Dark teal leviathan tendrils curling around the message.', borderColor: '#0891B2', glowColor: '#164E63', bgGradStart: '#061E26', bgGradEnd: '#020C10', accentColor: '#CFFAFE', cornerStyle: 'dragon' },
  { id: 'tf_infinity_prism', name: 'Infinity Prism Spectrum', category: 'Crystal & Gemstone', description: 'Prismatic multi-colored spectrum shimmering continuously.', borderColor: '#8B5CF6', glowColor: '#06B6D4', bgGradStart: '#17062B', bgGradEnd: '#071829', accentColor: '#FFFFFF', cornerStyle: 'crystals' },
  { id: 'tf_titans_bastion', name: "Titan's Adamantine Wall", category: 'Royal & Ornamental', description: 'Heavy fortress stonework with iron reinforced corners.', borderColor: '#64748B', glowColor: '#334155', bgGradStart: '#0E1724', bgGradEnd: '#05090F', accentColor: '#F1F5F9', cornerStyle: 'minimal' },
];

function generateTextFrameSvg(spec: TextFrameSpec): string {
  if (spec.isDefaultAsset) return spec.isDefaultAsset;

  const { borderColor, glowColor, bgGradStart, bgGradEnd, accentColor, cornerStyle } = spec;

  let cornerDecorations = '';

  if (cornerStyle === 'ornate') {
    cornerDecorations = `
      <polygon points="4,4 20,4 20,8 8,8 8,20 4,20" fill="${borderColor}" />
      <circle cx="14" cy="14" r="2.5" fill="${accentColor}" />
      <polygon points="396,4 380,4 380,8 392,8 392,20 396,20" fill="${borderColor}" />
      <circle cx="386" cy="14" r="2.5" fill="${accentColor}" />
      <polygon points="4,116 20,116 20,112 8,112 8,100 4,100" fill="${borderColor}" />
      <circle cx="14" cy="106" r="2.5" fill="${accentColor}" />
      <polygon points="396,116 380,116 380,112 392,112 392,100 396,100" fill="${borderColor}" />
      <circle cx="386" cy="106" r="2.5" fill="${accentColor}" />
      <!-- Center Crest -->
      <polygon points="200,2 208,10 192,10" fill="${borderColor}" />
      <circle cx="200" cy="9" r="2" fill="${accentColor}" />
    `;
  } else if (cornerStyle === 'cyber') {
    cornerDecorations = `
      <!-- Cyber Bracket Corners -->
      <path d="M 4 22 L 4 4 L 22 4" stroke="${accentColor}" stroke-width="2.5" fill="none" />
      <path d="M 396 22 L 396 4 L 378 4" stroke="${accentColor}" stroke-width="2.5" fill="none" />
      <path d="M 4 98 L 4 116 L 22 116" stroke="${accentColor}" stroke-width="2.5" fill="none" />
      <path d="M 396 98 L 396 116 L 378 116" stroke="${accentColor}" stroke-width="2.5" fill="none" />
      <rect x="8" y="8" width="5" height="5" fill="${borderColor}" />
      <rect x="387" y="8" width="5" height="5" fill="${borderColor}" />
      <rect x="8" y="107" width="5" height="5" fill="${borderColor}" />
      <rect x="387" y="107" width="5" height="5" fill="${borderColor}" />
    `;
  } else if (cornerStyle === 'crystals') {
    cornerDecorations = `
      <!-- Crystal Cut Corners -->
      <polygon points="4,4 18,4 4,18" fill="${accentColor}" />
      <polygon points="396,4 382,4 396,18" fill="${accentColor}" />
      <polygon points="4,116 18,116 4,102" fill="${accentColor}" />
      <polygon points="396,116 382,116 396,102" fill="${accentColor}" />
      <circle cx="16" cy="16" r="3" fill="${borderColor}" />
      <circle cx="384" cy="16" r="3" fill="${borderColor}" />
      <circle cx="16" cy="104" r="3" fill="${borderColor}" />
      <circle cx="384" cy="104" r="3" fill="${borderColor}" />
    `;
  } else if (cornerStyle === 'dragon') {
    cornerDecorations = `
      <!-- Dragon Talon Brackets -->
      <path d="M 4 30 C 6 12, 12 6, 30 4" stroke="${borderColor}" stroke-width="3" fill="none" />
      <path d="M 396 30 C 394 12, 388 6, 370 4" stroke="${borderColor}" stroke-width="3" fill="none" />
      <path d="M 4 90 C 6 108, 12 114, 30 116" stroke="${borderColor}" stroke-width="3" fill="none" />
      <path d="M 396 90 C 394 108, 388 114, 370 116" stroke="${borderColor}" stroke-width="3" fill="none" />
      <circle cx="18" cy="18" r="2.5" fill="${accentColor}" />
      <circle cx="382" cy="18" r="2.5" fill="${accentColor}" />
    `;
  } else if (cornerStyle === 'royal') {
    cornerDecorations = `
      <!-- Royal Filigree Corners -->
      <circle cx="12" cy="12" r="6" fill="none" stroke="${borderColor}" stroke-width="2" />
      <circle cx="12" cy="12" r="2.5" fill="${accentColor}" />
      <circle cx="388" cy="12" r="6" fill="none" stroke="${borderColor}" stroke-width="2" />
      <circle cx="388" cy="12" r="2.5" fill="${accentColor}" />
      <circle cx="12" cy="108" r="6" fill="none" stroke="${borderColor}" stroke-width="2" />
      <circle cx="12" cy="108" r="2.5" fill="${accentColor}" />
      <circle cx="388" cy="108" r="6" fill="none" stroke="${borderColor}" stroke-width="2" />
      <circle cx="388" cy="108" r="2.5" fill="${accentColor}" />
      <!-- Center Top Diamond -->
      <polygon points="200,3 206,9 200,15 194,9" fill="${accentColor}" stroke="${borderColor}" stroke-width="1" />
    `;
  } else {
    // Minimal
    cornerDecorations = `
      <line x1="4" y1="4" x2="20" y2="4" stroke="${borderColor}" stroke-width="2" />
      <line x1="4" y1="4" x2="4" y2="20" stroke="${borderColor}" stroke-width="2" />
      <line x1="396" y1="4" x2="380" y2="4" stroke="${borderColor}" stroke-width="2" />
      <line x1="396" y1="4" x2="396" y2="20" stroke="${borderColor}" stroke-width="2" />
    `;
  }

  const rawSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${borderColor}" />
      <stop offset="50%" stop-color="${glowColor}" />
      <stop offset="100%" stop-color="${borderColor}" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradStart}" stop-opacity="0.96" />
      <stop offset="100%" stop-color="${bgGradEnd}" stop-opacity="0.98" />
    </linearGradient>
  </defs>

  <!-- Background Rect -->
  <rect x="3" y="3" width="394" height="114" rx="8" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="2.4" />
  <rect x="7" y="7" width="386" height="106" rx="6" fill="none" stroke="${borderColor}" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.6" />

  ${cornerDecorations}
</svg>
  `;

  return svgDataUrl(rawSvg);
}

// ---------------------------------------------------------------------------
// MASTER FRAME REGISTRY
// ---------------------------------------------------------------------------

export const PROFILE_FRAMES: FrameItem[] = PROFILE_SPECS.map((spec, index) => {
  const assetUrl = generateProfileFrameSvg(spec);
  return {
    id: spec.id,
    type: 'profile',
    name: spec.name,
    category: spec.category,
    description: spec.description,
    assetUrl,
    previewUrl: assetUrl,
    createdAt: 1700000000000 + index * 1000,
    isActive: true,
  };
});

export const TEXT_FRAMES: FrameItem[] = TEXT_SPECS.map((spec, index) => {
  const assetUrl = generateTextFrameSvg(spec);
  return {
    id: spec.id,
    type: 'text',
    name: spec.name,
    category: spec.category,
    description: spec.description,
    assetUrl,
    previewUrl: assetUrl,
    createdAt: 1700000000000 + index * 1000,
    isActive: true,
  };
});

export const ALL_FRAMES: FrameItem[] = [...PROFILE_FRAMES, ...TEXT_FRAMES];

// In-memory overrides / status cache
let customActiveState: Record<string, boolean> = {};

export function getProfileFrameById(frameId?: string | null): FrameItem | null {
  if (!frameId) return null;
  const frame = PROFILE_FRAMES.find((f) => f.id === frameId);
  if (!frame) return null;
  return {
    ...frame,
    isActive: customActiveState[frame.id] !== undefined ? customActiveState[frame.id] : frame.isActive,
  };
}

export function getTextFrameById(frameId?: string | null): FrameItem | null {
  if (!frameId) return null;
  const frame = TEXT_FRAMES.find((f) => f.id === frameId);
  if (!frame) return null;
  return {
    ...frame,
    isActive: customActiveState[frame.id] !== undefined ? customActiveState[frame.id] : frame.isActive,
  };
}

export function getAllProfileFrames(onlyActive = false): FrameItem[] {
  return PROFILE_FRAMES.map((f) => ({
    ...f,
    isActive: customActiveState[f.id] !== undefined ? customActiveState[f.id] : f.isActive,
  })).filter((f) => !onlyActive || f.isActive);
}

export function getAllTextFrames(onlyActive = false): FrameItem[] {
  return TEXT_FRAMES.map((f) => ({
    ...f,
    isActive: customActiveState[f.id] !== undefined ? customActiveState[f.id] : f.isActive,
  })).filter((f) => !onlyActive || f.isActive);
}

export function setFrameActiveState(frameId: string, isActive: boolean) {
  customActiveState[frameId] = isActive;
}
