export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
  }
  return secs.toFixed(2);
}

export function parseTimeToSeconds(timeStr: string): number {
  if (timeStr.includes(":")) {
    const [mins, secs] = timeStr.split(":");
    return parseInt(mins) * 60 + parseFloat(secs);
  }
  return parseFloat(timeStr);
}

export function getLengthsForEvent(eventName: string): number {
  const match = eventName.match(/^(\d+)/);
  if (!match) return 1;
  const distance = parseInt(match[1]);
  const course = eventName.includes("LCM") ? 50 : 25;
  return Math.max(1, distance / course);
}
