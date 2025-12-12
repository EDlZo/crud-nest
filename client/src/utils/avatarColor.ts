// Return a pastel avatar background color deterministic from a name string.
export function getAvatarColor(name?: string): string {
  const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3d8', '#60a5fa', '#a78bfa', '#f472b6'];
  const code = (name && name.length > 0) ? name.charCodeAt(0) : 0;
  return colors[code % colors.length];
}

export default getAvatarColor;
