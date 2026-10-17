export function formatElapsed(milliseconds) {
  const value = Math.max(0, Math.round(milliseconds));
  const minutes = Math.floor(value / 60000);
  const seconds = Math.floor(value % 60000 / 1000);
  return minutes + 'm ' + String(seconds).padStart(2, '0') + '.' + String(value % 1000).padStart(3, '0') + 's';
}
