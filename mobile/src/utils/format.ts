import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDrawDate(dateString: string): string {
  return format(parseISO(dateString), 'MMMM d, yyyy');
}

export function formatDrawDateShort(dateString: string): string {
  return format(parseISO(dateString), 'MMM d, yyyy');
}

export function formatRelativeDate(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

export function formatCrsScore(score: number): string {
  return score.toLocaleString();
}

export function formatInvitations(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toLocaleString();
}

export function formatScoreDiff(diff: number): string {
  return diff >= 0 ? `+${diff}` : String(diff);
}
