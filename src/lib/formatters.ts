export function formatCoins(amount: number): string {
  if (amount == null || isNaN(amount)) return '0';
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B';
  }
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return amount.toLocaleString();
}

export function formatFullCoins(amount: number): string {
  if (amount == null || isNaN(amount)) return '0';
  return amount.toLocaleString('en-US') + ' coins';
}

export function formatTimeAgo(timestamp: number | string): string {
  if (!timestamp) return 'Just now';
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function formatJoinedDate(timestamp: number | string): string {
  if (!timestamp) return 'Joined recently';
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - time) / 1000));

  const minutes = Math.floor(diffSec / 60);
  const hours = Math.floor(diffSec / 3600);
  const days = Math.floor(diffSec / 86400);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years >= 1) {
    return `Joined ${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
  if (months >= 1) {
    return `Joined ${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  if (days >= 1) {
    return `Joined ${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (hours >= 1) {
    return `Joined ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (minutes >= 1) {
    return `Joined ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  return 'Joined just now';
}
