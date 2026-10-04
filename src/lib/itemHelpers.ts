import { SkyblockItem } from '../types';

/**
 * Returns the exact trend emoji & label according to specifications:
 * Increasing = ⬆️
 * Decreasing = ⬇️
 * Stable = 🛑
 * Unstable = ⚠️
 * Combined statuses (e.g. "Stable + Increasing", "Stable + Decreasing", "Decreasing + Stable") preserve both.
 */
export function getStatusBadge(status?: string): { emoji: string; label: string; badgeClass: string } {
  const s = (status || '').trim();

  if (s === 'Increasing') {
    return {
      emoji: '⬆️',
      label: 'Increasing',
      badgeClass: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
    };
  }

  if (s === 'Decreasing') {
    return {
      emoji: '⬇️',
      label: 'Decreasing',
      badgeClass: 'bg-rose-950/70 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/30'
    };
  }

  if (s === 'Stable') {
    return {
      emoji: '🛑',
      label: 'Stable',
      badgeClass: 'bg-blue-950/70 border-blue-500/50 text-blue-300 ring-1 ring-blue-500/30'
    };
  }

  if (s === 'Unstable') {
    return {
      emoji: '⚠️',
      label: 'Unstable',
      badgeClass: 'bg-amber-950/70 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
    };
  }

  if (s === 'Stable + Increasing') {
    return {
      emoji: '🛑 ⬆️',
      label: 'Stable + Increasing',
      badgeClass: 'bg-teal-950/70 border-teal-500/50 text-teal-300 ring-1 ring-teal-500/30'
    };
  }

  if (s === 'Stable + Decreasing') {
    return {
      emoji: '🛑 ⬇️',
      label: 'Stable + Decreasing',
      badgeClass: 'bg-orange-950/70 border-orange-500/50 text-orange-300 ring-1 ring-orange-500/30'
    };
  }

  if (s === 'Decreasing + Stable') {
    return {
      emoji: '⬇️ 🛑',
      label: 'Decreasing + Stable',
      badgeClass: 'bg-orange-950/70 border-orange-500/50 text-orange-300 ring-1 ring-orange-500/30'
    };
  }

  if (s === 'Not specified') {
    return {
      emoji: '',
      label: 'Not specified',
      badgeClass: 'bg-slate-900 border-slate-700/80 text-slate-400'
    };
  }

  return {
    emoji: '',
    label: s || 'Not specified',
    badgeClass: 'bg-slate-900 border-slate-700/80 text-slate-400'
  };
}

/**
 * Safely parses any price range or string (e.g. "100–120M", "1.7–1.8B", "450M–500M", "1B–1.1B", "150M", "2B")
 * into approximate coins for numerical operations (Trade Calculator diffs, sorting).
 * Note: Never modifies the original string display!
 */
export function parseCoinStringToNumber(valStr?: string): number {
  if (!valStr || valStr === 'Not Listed' || valStr === 'Not specified') return 0;

  const normalized = valStr.replace(/–/g, '-').trim();

  if (normalized.includes('-')) {
    const parts = normalized.split('-');
    const part1 = parts[0].trim();
    const part2 = parts[1].trim();

    const unitMatch = part2.match(/[MB]/i);
    const unit = unitMatch ? unitMatch[0].toUpperCase() : 'M';

    const num1 = parseFloat(part1.replace(/[^\d.]/g, '')) || 0;
    const num2 = parseFloat(part2.replace(/[^\d.]/g, '')) || 0;
    const avg = (num1 + num2) / 2;

    const multiplier = unit === 'B' ? 1_000_000_000 : 1_000_000;
    return Math.round(avg * multiplier);
  }

  const unitMatch = normalized.match(/[MB]/i);
  const unit = unitMatch ? unitMatch[0].toUpperCase() : 'M';
  const num = parseFloat(normalized.replace(/[^\d.]/g, '')) || 0;
  const multiplier = unit === 'B' ? 1_000_000_000 : 1_000_000;
  return Math.round(num * multiplier);
}

/**
 * Returns formatted primary valuation string for an item
 */
export function getItemPrimaryDisplayValue(item: SkyblockItem): string {
  if (item.category === 'Sword') {
    return item.normalValue ? `Normal: ${item.normalValue}` : '';
  }
  return item.fourPieceValue ? `4/4: ${item.fourPieceValue}` : '';
}

/**
 * Returns formatted secondary valuation string for an item
 */
export function getItemSecondaryDisplayValue(item: SkyblockItem): string {
  if (item.category === 'Sword') {
    return item.rareValue ? `Rare: ${item.rareValue}` : '';
  }
  return item.fivePieceValue ? `5/5: ${item.fivePieceValue}` : '';
}
