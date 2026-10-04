import { SkyblockItem, ItemRarity } from '../types';
import { parseCoinStringToNumber } from '../lib/itemHelpers';

export const RARITY_COLORS: Record<ItemRarity, { text: string; bg: string; border: string }> = {
  COMMON: { text: 'text-slate-300', bg: 'bg-slate-800/80', border: 'border-slate-600/40' },
  UNCOMMON: { text: 'text-emerald-400', bg: 'bg-emerald-950/80', border: 'border-emerald-500/40' },
  RARE: { text: 'text-blue-400', bg: 'bg-blue-950/80', border: 'border-blue-500/40' },
  EPIC: { text: 'text-purple-400', bg: 'bg-purple-950/80', border: 'border-purple-500/40' },
  LEGENDARY: { text: 'text-amber-400', bg: 'bg-amber-950/80', border: 'border-amber-500/40' },
  MYTHIC: { text: 'text-pink-400', bg: 'bg-pink-950/80', border: 'border-pink-500/40' },
  DIVINE: { text: 'text-cyan-300', bg: 'bg-cyan-950/80', border: 'border-cyan-400/40' },
  SPECIAL: { text: 'text-rose-400', bg: 'bg-rose-950/80', border: 'border-rose-500/40' },
};

// Raw source definitions for the 33 Swords
const RAW_SWORDS = [
  { name: 'Poseidon Trident', status: 'Stable', normalValue: '100–120M', rareValue: '150M' },
  { name: 'Zeus Lightning', status: 'Stable', normalValue: '200M', rareValue: '1.7–1.8B' },
  { name: 'Hades Sword', status: 'Stable', normalValue: '200M', rareValue: '1.9–2B' },
  { name: 'Ares Spear', status: 'Stable', normalValue: '400–450M', rareValue: '2.6–2.8B' },
  { name: 'Apollo Sword', status: 'Decreasing', normalValue: '280–300M', rareValue: '2.5–2.7B' },
  { name: 'Fenrir Sword', status: 'Stable', normalValue: '150M', rareValue: '1–1.2B' },
  { name: 'Valkyrie Sword', status: 'Stable', normalValue: '350M', rareValue: '4–4.5B' },
  { name: 'Jormungandr Sword', status: 'Decreasing', normalValue: '180–200M', rareValue: '1.4–1.5B' },
  { name: 'Mjollnir', status: 'Decreasing', normalValue: '300–340M', rareValue: '2.3–2.5B' },
  { name: 'Helheim Sword', status: 'Stable', normalValue: '170M', rareValue: '1.3–1.5B' },
  { name: 'Hermes Sword', status: 'Decreasing', normalValue: '180M', rareValue: '1.5–1.7B' },
  { name: 'Flame Excalibur', status: 'Decreasing + Stable', normalValue: '180–190M', rareValue: '1.3–1.4B' },
  { name: 'Permafrost Sword', status: 'Stable', normalValue: '500–550M', rareValue: '3.2–3.6B' },
  { name: 'Medusa Spear', status: 'Stable', normalValue: '500–550M', rareValue: '5–5.5B' },
  { name: 'Pride Sword', status: 'Stable', normalValue: '250M', rareValue: '2–2.2B' },
  { name: 'Envy Sword', status: 'Stable', normalValue: '800M', rareValue: '6–6.5B' },
  { name: 'Gluttony Blade', status: 'Stable + Decreasing', normalValue: '190–200M', rareValue: '1.8–2B' },
  { name: 'Wrath Sword', status: 'Increasing', normalValue: '800–850M', rareValue: '7–7.5B' },
  { name: 'Greed Scythe', status: 'Stable', normalValue: '440–450M', rareValue: '4–4.3B' },
  { name: 'Sloth Sword', status: 'Stable', normalValue: '200M', rareValue: '2B' },
  { name: 'Lust Sword', status: 'Decreasing', normalValue: '200–220M', rareValue: '1.8–1.9B' },
  { name: 'Wraith Sword', status: 'Stable', normalValue: '200M', rareValue: 'Not Listed' },
  { name: 'Judgment Sword', status: 'Stable', normalValue: '190–200M', rareValue: '1.9B' },
  { name: 'Phoenix Sword', status: 'Stable', normalValue: '300–350M', rareValue: '2.9–3.2B' },
  { name: 'Mercurius Rapier', status: 'Stable', normalValue: '200M', rareValue: '1.8–2B' },
  { name: 'Mars Spear', status: 'Decreasing', normalValue: '180–200M', rareValue: '1.8–1.9B' },
  { name: 'Venus Mace', status: 'Increasing', normalValue: '850–900M', rareValue: '9–9.5B' },
  { name: 'Terra Sword', status: 'Increasing', normalValue: '900–930M', rareValue: '9.2–9.7B' },
  { name: 'Uranus Claws', status: 'Increasing', normalValue: '900–950M', rareValue: '9.5–10B' },
  { name: 'Neptune Trident', status: 'Decreasing', normalValue: '160–180M', rareValue: '1.6–1.8B' },
  { name: 'Saturn\'s Scythe', status: 'Stable', normalValue: '250–300M', rareValue: '3B' },
  { name: 'Jupiter Spear', status: 'Stable + Increasing', normalValue: '300–350M', rareValue: '3–3.4B' },
  { name: 'Fool\'s Sword', status: 'Stable + Decreasing', normalValue: '500–550M', rareValue: '5–5.2B' },
];

// Raw source definitions for the 34 Armour Sets
const RAW_ARMOUR = [
  { name: 'Poseidon Armour', status: 'Stable', fourPieceValue: '450M–500M', fivePieceValue: '600M–650M' },
  { name: 'Zeus Armour', status: 'Stable', fourPieceValue: '160M–180M', fivePieceValue: '220M–240M' },
  { name: 'Hades Armour', status: 'Stable', fourPieceValue: '350M', fivePieceValue: '450M' },
  { name: 'Ares Armour', status: 'Stable', fourPieceValue: '900M–950M', fivePieceValue: '1.1–1.2B' },
  { name: 'Apollo Armour', status: 'Stable', fourPieceValue: '160M', fivePieceValue: '220M' },
  { name: 'Hermes Armour', status: 'Stable', fourPieceValue: '750M–800M', fivePieceValue: '1B–1.1B' },
  { name: 'Hephaestus Armour', status: 'Stable + Increasing', fourPieceValue: '250M–300M', fivePieceValue: '350M' },
  { name: 'Medusa Armour', status: 'Stable', fourPieceValue: '350M–400M', fivePieceValue: '500M–550M' },
  { name: 'Fenrir Armour', status: 'Stable', fourPieceValue: '350M', fivePieceValue: '450M' },
  { name: 'Valkyrie Armour', status: 'Stable', fourPieceValue: '160M', fivePieceValue: '220M' },
  { name: 'Jormungandr Armour', status: 'Stable', fourPieceValue: '300M', fivePieceValue: '400M' },
  { name: 'Thor Armour', status: 'Stable', fourPieceValue: '200M', fivePieceValue: '300M' },
  { name: 'Helheim Armour', status: 'Stable + Increasing', fourPieceValue: '200M', fivePieceValue: '280M' },
  { name: 'Winter Armour', status: 'Stable + Increasing', fourPieceValue: '700M', fivePieceValue: '850M–900M' },
  { name: 'Pride Armour', status: 'Stable', fourPieceValue: '170M–190M', fivePieceValue: '240M–250M' },
  { name: 'Envy Armour', status: 'Increasing', fourPieceValue: '160M–180M', fivePieceValue: '240M' },
  { name: 'Gluttony Armour', status: 'Stable', fourPieceValue: '1.2B', fivePieceValue: '1.4B' },
  { name: 'Wrath Demon Armour', status: 'Increasing', fourPieceValue: '750M–800M', fivePieceValue: '900M–1B' },
  { name: 'Greed Armour', status: 'Decreasing', fourPieceValue: '300M', fivePieceValue: '400M' },
  { name: 'Sloth Armour', status: 'Stable', fourPieceValue: '200M', fivePieceValue: '300M' },
  { name: 'Lust Armour', status: 'Stable', fourPieceValue: '1B', fivePieceValue: '1.2B–1.4B' },
  { name: 'Wraith Knight Armour', status: 'Stable', fourPieceValue: '250M–300M', fivePieceValue: '400M–450M' },
  { name: 'Judgement Armour', status: 'Stable', fourPieceValue: '200M', fivePieceValue: '300M' },
  { name: 'Phoenix Armour', status: 'Stable', fourPieceValue: '300M–350M', fivePieceValue: '450M' },
  { name: 'Mercurius Armour', status: 'Stable', fourPieceValue: '180M–200M', fivePieceValue: '280M–300M' },
  { name: 'Mars Armour', status: 'Stable', fourPieceValue: '300M', fivePieceValue: '400M' },
  { name: 'Venus Armour', status: 'Stable', fourPieceValue: '400M', fivePieceValue: '500M' },
  { name: 'Terra Armour', status: 'Stable', fourPieceValue: '1.2B', fivePieceValue: '1.5B' },
  { name: 'Uranus Armour', status: 'Stable', fourPieceValue: '400M', fivePieceValue: '500M' },
  { name: 'Neptune Armour', status: 'Stable', fourPieceValue: '350M', fivePieceValue: '450M' },
  { name: 'Saturn Armour', status: 'Increasing', fourPieceValue: '800M', fivePieceValue: '1B–1.1B' },
  { name: 'Jupiter Armour', status: 'Stable', fourPieceValue: '350M', fivePieceValue: '450M' },
  { name: 'Fool Armour', status: 'Not specified', fourPieceValue: '1.2B–1.3B', fivePieceValue: '1.5B–1.6B' },
  { name: 'Magician Armour', status: 'Unstable', fourPieceValue: '750M', fivePieceValue: '900M' },
];

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Convert RAW_SWORDS into SkyblockItem entries
const SWORD_ITEMS: Omit<SkyblockItem, 'id'>[] = RAW_SWORDS.map((sword) => {
  const numericVal = parseCoinStringToNumber(sword.normalValue);
  const numericRare = parseCoinStringToNumber(sword.rareValue);

  return {
    name: sword.name,
    normalizedName: sword.name.toLowerCase(),
    category: 'Sword' as const,
    status: sword.status,
    normalValue: sword.normalValue,
    rareValue: sword.rareValue,
    value: numericVal,
    numericRareValue: numericRare,
    image: `https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=200&auto=format&fit=crop&q=80`,
    description: `Skyblock Mythical Sword: ${sword.name}. Normal Tier: ${sword.normalValue}. Rare Tier: ${sword.rareValue}. Current Market Trend: ${sword.status}.`,
    updatedAt: Date.now(),
    tags: ['sword', 'weapon', generateSlug(sword.name)],
    rarity: numericVal >= 800_000_000 ? 'DIVINE' : numericVal >= 400_000_000 ? 'MYTHIC' : 'LEGENDARY',
    demand: sword.status.includes('Increasing') ? 'EXTREME' : sword.status === 'Decreasing' ? 'LOW' : 'HIGH',
  };
});

// Convert RAW_ARMOUR into SkyblockItem entries
const ARMOUR_ITEMS: Omit<SkyblockItem, 'id'>[] = RAW_ARMOUR.map((armour) => {
  const numericVal = parseCoinStringToNumber(armour.fourPieceValue);
  const numericFive = parseCoinStringToNumber(armour.fivePieceValue);

  return {
    name: armour.name,
    normalizedName: armour.name.toLowerCase(),
    category: 'Armour' as const,
    status: armour.status,
    fourPieceValue: armour.fourPieceValue,
    fivePieceValue: armour.fivePieceValue,
    value: numericVal,
    numericFivePieceValue: numericFive,
    image: `https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80`,
    description: `Skyblock Complete Armour Set: ${armour.name}. 4/4 Set Value: ${armour.fourPieceValue}. 5/5 Full Set Value: ${armour.fivePieceValue}. Current Trend: ${armour.status}.`,
    updatedAt: Date.now(),
    tags: ['armour', 'armor', 'set', generateSlug(armour.name)],
    rarity: numericVal >= 800_000_000 ? 'DIVINE' : numericVal >= 400_000_000 ? 'MYTHIC' : 'LEGENDARY',
    demand: armour.status.includes('Increasing') ? 'EXTREME' : armour.status === 'Decreasing' ? 'LOW' : 'HIGH',
  };
});

// The complete authoritative replacement dataset: 33 Swords + 34 Armour sets = exactly 67 items
export const INITIAL_SKYBLOCK_ITEMS: Omit<SkyblockItem, 'id'>[] = [
  ...SWORD_ITEMS,
  ...ARMOUR_ITEMS,
];
