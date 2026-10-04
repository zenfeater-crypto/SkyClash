import { SkyblockPet, SkyblockItem, PetTier } from '../types';
import { parseCoinStringToNumber } from '../lib/itemHelpers';

export const PET_DISCLAIMER_NOTE = "Pet values are subject to colour, rarity and books bonded.";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Default high-quality themed images for Skyblock pets
const DEFAULT_PET_IMAGES: Record<string, string> = {
  tiger: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=200&auto=format&fit=crop&q=80',
  dragon: 'https://images.unsplash.com/photo-1577493340887-b7bfff550145?w=200&auto=format&fit=crop&q=80',
  fox: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=200&auto=format&fit=crop&q=80',
  'thorn-shooter': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&auto=format&fit=crop&q=80',
  shark: 'https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=200&auto=format&fit=crop&q=80',
  'cumulus-bird': 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=200&auto=format&fit=crop&q=80',
  't-rex': 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=200&auto=format&fit=crop&q=80',
  snake: 'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?w=200&auto=format&fit=crop&q=80',
  pegasus: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=200&auto=format&fit=crop&q=80',
  scorpio: 'https://images.unsplash.com/photo-1616428784138-c5188f572719?w=200&auto=format&fit=crop&q=80',
  mantis: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=200&auto=format&fit=crop&q=80',
  wukong: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=200&auto=format&fit=crop&q=80',
  centaur: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
  'narla-narwhal': 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=200&auto=format&fit=crop&q=80',
  'netherland-dragon': 'https://images.unsplash.com/photo-1569793666144-884814d483dc?w=200&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop&q=80',
};

function getPetImage(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(DEFAULT_PET_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return DEFAULT_PET_IMAGES.default;
}

// 15 Rare Pets - EXACT values as provided
export const RAW_RARE_PETS = [
  {
    name: 'TIGER',
    status: 'Stable',
    p5: '300M',
    p6: '450M',
    p7: '650M',
    p8: '1.3B',
    p9: '2.5B',
    p10: '5B',
  },
  {
    name: 'DRAGON',
    status: 'Stable',
    p5: '400M–450M',
    p6: '500M–550M',
    p7: '1B–1.2B',
    p8: '2B–2.3B',
    p9: '4B–4.5B',
    p10: '8B–9B',
  },
  {
    name: 'FOX',
    status: 'Stable',
    p5: '400M–450M',
    p6: '600M–650M',
    p7: '1.4B–1.5B',
    p8: '2B–2.5B',
    p9: '4B–4.5B',
    p10: '8B–9B',
  },
  {
    name: 'THORN SHOOTER',
    status: 'Stable',
    p5: '400M',
    p6: '550M–600M',
    p7: '900M',
    p8: '1.2B–1.5B',
    p9: '2.5B–3B',
    p10: '6B',
  },
  {
    name: 'SHARK',
    status: 'Stable',
    p5: '1B',
    p6: '2B',
    p7: '3B',
    p8: '5B–5.5B',
    p9: '10B',
    p10: '20B',
  },
  {
    name: 'CUMULUS BIRD',
    status: 'Stable',
    p5: '400M',
    p6: '700M–750M',
    p7: '1.5B–1.7B',
    p8: '2.5B',
    p9: '4B–4.5B',
    p10: '8B',
  },
  {
    name: 'T-REX',
    status: 'Stable',
    p5: '400M',
    p6: '700M',
    p7: '1.3B',
    p8: '2.5B–3B',
    p9: '6B',
    p10: '10B–13B',
  },
  {
    name: 'SNAKE',
    status: 'Stable',
    p5: '900M',
    p6: '1.5B',
    p7: '3B',
    p8: '4.5B–5B',
    p9: '10B',
    p10: '25B–30B',
  },
  {
    name: 'PEGASUS',
    status: 'Increasing',
    p5: '1.5B',
    p6: '2.2B–2.5B',
    p7: '3B–4B',
    p8: '7B–8B',
    p9: '16B–18B',
    p10: '30B–35B',
  },
  {
    name: 'SCORPIO',
    status: 'Stable + Decreasing',
    p5: '800M',
    p6: '1.5B',
    p7: '2B–2.2B',
    p8: '4B–4.5B',
    p9: '10B',
    p10: '20B',
  },
  {
    name: 'MANTIS',
    status: 'Increasing',
    p5: '1.4B',
    p6: '2B–2.3B',
    p7: '3B–3.5B',
    p8: '6B–7B',
    p9: '12B–15B',
    p10: '25B–30B',
  },
  {
    name: 'WUKONG',
    status: 'Decreasing',
    p5: '600M',
    p6: '800M',
    p7: '1.6B',
    p8: '3B',
    p9: '5B–6B',
    p10: '12B',
  },
  {
    name: 'CENTAUR',
    status: 'Stable',
    p5: '1B',
    p6: '1.5B',
    p7: '2.5B–3B',
    p8: '3.5B–4B',
    p9: '5B–6B',
    p10: '13B',
  },
  {
    name: 'NARLA/NARWHAL',
    status: 'Decreasing',
    p5: '800M',
    p6: '1.9B–2.1B',
    p7: '4B',
    p8: '6B–7B',
    p9: '10B–12B',
    p10: '20B',
  },
  {
    name: 'NETHERLAND DRAGON',
    status: 'Decreasing',
    p5: '600M',
    p6: '1B',
    p7: '1.5B',
    p8: '3B',
    p9: '5B–6B',
    p10: '12B',
  },
];

// 15 Normal Pets - EXACT values as provided
export const RAW_NORMAL_PETS = [
  {
    name: 'ROAR FLAME TIGER',
    status: 'Stable',
    p5: '50M',
    p6: '80M',
    p7: '120M',
    p8: '200M',
    p9: '350M',
    p10: '600M',
  },
  {
    name: 'NINE-TAILED FOX',
    status: 'Stable',
    p5: '90M',
    p6: '120M',
    p7: '150M',
    p8: '300M',
    p9: '650M',
    p10: '1.2B',
  },
  {
    name: 'MAGIC FLAME DRAGON',
    status: 'Stable',
    p5: '80M',
    p6: '100M',
    p7: '140M',
    p8: '250M–300M',
    p9: '650M',
    p10: '1.2B',
  },
  {
    name: 'THORN SHOOTER',
    status: 'Stable',
    p5: '70M',
    p6: '100M',
    p7: '150M',
    p8: '250M',
    p9: '300M',
    p10: '650M',
  },
  {
    name: 'POLAR ICE SHARK',
    status: 'Stable',
    p5: '200M',
    p6: '350M–400M',
    p7: '600M',
    p8: '850M',
    p9: '1.7B',
    p10: '3.5B–4B',
  },
  {
    name: 'CUMULUS BIRD',
    status: 'Stable',
    p5: '90M',
    p6: '130M',
    p7: '180M',
    p8: '270M',
    p9: '400M',
    p10: '800M',
  },
  {
    name: 'BLAZE REX',
    status: 'Stable',
    p5: '80M',
    p6: '120M',
    p7: '200M',
    p8: '350M',
    p9: '600M',
    p10: '1.7B–2B',
  },
  {
    name: 'PEGASUS',
    status: 'Increasing',
    p5: '550M–600M',
    p6: '850M',
    p7: '1.2B',
    p8: '1.8B–2B',
    p9: '3.5B–4B',
    p10: '7.5B–8B',
  },
  {
    name: 'FLAME SCORPION',
    status: 'Stable',
    p5: '200M',
    p6: '300M',
    p7: '450M',
    p8: '650M',
    p9: '1B–1.2B',
    p10: '2B–2.5B',
  },
  {
    name: 'MANTIS',
    status: 'Increasing',
    p5: '300M',
    p6: '450M',
    p7: '550M',
    p8: '800M',
    p9: '1.2B–1.5B',
    p10: '3.6B–4B',
  },
  {
    name: 'WUKONG',
    status: 'Decreasing',
    p5: '120M–150M',
    p6: '180M–200M',
    p7: '300M–350M',
    p8: '550M–600M',
    p9: '1B',
    p10: '2B–2.5B',
  },
  {
    name: 'SNAKE',
    status: 'Stable',
    p5: '300M',
    p6: '450M',
    p7: '550M',
    p8: '750M',
    p9: '1B',
    p10: '2.5B',
  },
  {
    name: 'GALE BREAKER CENTAUR',
    status: 'Stable',
    p5: '300M',
    p6: '450M–500M',
    p7: '600M',
    p8: '750M–800M',
    p9: '1.2B–1.4B',
    p10: '3B–3.5B',
  },
  {
    name: 'NARLA/NARWHAL',
    status: 'Decreasing',
    p5: '350M',
    p6: '450M',
    p7: '550M–600M',
    p8: '800M',
    p9: '1B–1.1B',
    p10: '2.5B–3B',
  },
  {
    name: 'NETHERLAND DRAGON',
    status: 'Decreasing',
    p5: '200M',
    p6: '300M',
    p7: '500M–550M',
    p8: '700M',
    p9: '1.5B',
    p10: '3B',
  },
];

export function buildPetItem(raw: {
  name: string;
  status: string;
  p5: string;
  p6: string;
  p7: string;
  p8: string;
  p9: string;
  p10: string;
  image?: string;
}, type: 'Normal' | 'Rare'): SkyblockPet {
  const slug = slugify(raw.name);
  const id = `${type.toLowerCase()}-${slug}`;
  return {
    id,
    name: raw.name,
    normalizedName: raw.name.toLowerCase(),
    type,
    status: raw.status,
    p5: raw.p5,
    p6: raw.p6,
    p7: raw.p7,
    p8: raw.p8,
    p9: raw.p9,
    p10: raw.p10,
    numericP5: parseCoinStringToNumber(raw.p5),
    numericP6: parseCoinStringToNumber(raw.p6),
    numericP7: parseCoinStringToNumber(raw.p7),
    numericP8: parseCoinStringToNumber(raw.p8),
    numericP9: parseCoinStringToNumber(raw.p9),
    numericP10: parseCoinStringToNumber(raw.p10),
    image: raw.image || getPetImage(raw.name),
    description: `Skyblock ${type} Pet: ${raw.name}. P5: ${raw.p5} • P6: ${raw.p6} • P7: ${raw.p7} • P8: ${raw.p8} • P9: ${raw.p9} • P10: ${raw.p10}. Trend: ${raw.status}. ${PET_DISCLAIMER_NOTE}`,
    updatedAt: Date.now(),
  };
}

export const INITIAL_PETS: SkyblockPet[] = [
  ...RAW_RARE_PETS.map((p) => buildPetItem(p, 'Rare')),
  ...RAW_NORMAL_PETS.map((p) => buildPetItem(p, 'Normal')),
];

/**
 * Converts a SkyblockPet into a compatible SkyblockItem for trade calculator, favorites, and detail views.
 */
export function petToSkyblockItem(pet: SkyblockPet, tier: PetTier = 'P5'): SkyblockItem {
  const tierKey = tier.toLowerCase() as 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10';
  const tierValStr = pet[tierKey] || pet.p5;
  const numVal = parseCoinStringToNumber(tierValStr);

  return {
    id: pet.id,
    name: `${pet.name} (${tier})`,
    normalizedName: pet.normalizedName,
    category: 'Pet',
    status: pet.status,
    petType: pet.type,
    p5: pet.p5,
    p6: pet.p6,
    p7: pet.p7,
    p8: pet.p8,
    p9: pet.p9,
    p10: pet.p10,
    petData: pet,
    value: numVal,
    image: pet.image || getPetImage(pet.name),
    description: `Skyblock ${pet.type} Pet: ${pet.name}. ${tier} Valuation: ${tierValStr}. Market status: ${pet.status}. ${PET_DISCLAIMER_NOTE}`,
    updatedAt: pet.updatedAt,
    tags: ['pet', pet.type.toLowerCase(), slugify(pet.name)],
    rarity: pet.type === 'Rare' ? 'MYTHIC' : 'LEGENDARY',
    demand: pet.status.includes('Increasing') ? 'EXTREME' : pet.status === 'Decreasing' ? 'LOW' : 'HIGH',
  };
}
