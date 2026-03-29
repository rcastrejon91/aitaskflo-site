"use client";

interface HOSData {
  driver: string;
  drive_remaining_min: string;
  window_remaining_min: string;
  weekly_remaining_min: string;
  break_needed: string;
  current_status: string;
}

function minToHM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function StatusBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const warn = pct < 20;
  return (
    <div className="w-full bg-gray-700 rounded-full h-3">
      <div
        className={`h-3 rounded-full transition-all duration-500 ${warn ? "bg-red-500" : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function HOSDisplay({ data }: { data: HOSData }) {
  const driveRem = parseInt(data.drive_remaining_min, 10) || 0;
  const windowRem = parseInt(data.window_remaining_min, 10) || 0;
  const weeklyRem = parseInt(data.weekly_remaining_min, 10) || 0;
  const breakNeeded = data.break_needed === "true";

  const statusColors: Record<string, string> = {
    driving: "text-green-400",
    on_duty: "text-yellow-400",
    off_duty: "text-gray-400",
    sleeper: "text-blue-400",
  };
  const statusColor = statusColors[data.current_status] ?? "text-gray-400";

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 my-2 space-y-3 font-mono text-sm">
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-base">🚛 {data.driver}</span>
        <span className={`font-bold uppercase tracking-wide ${statusColor}`}>
          ● {data.current_status?.replace("_", " ")}
        </span>
      </div>

      {breakNeeded && (
        <div className="bg-red-900/60 border border-red-500 rounded-lg px-3 py-2 text-red-300 text-xs font-bold">
          ⚠️ 30-MINUTE BREAK REQUIRED — Pull over safely
        </div>
      )}

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Drive time</span>
            <span className={driveRem < 60 ? "text-red-400 font-bold" : "text-white"}>{minToHM(driveRem)} left</span>
          </div>
          <StatusBar value={driveRem} max={660} color="bg-green-500" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>14hr window</span>
            <span className={windowRem < 60 ? "text-red-400 font-bold" : "text-white"}>{minToHM(windowRem)} left</span>
          </div>
          <StatusBar value={windowRem} max={840} color="bg-yellow-500" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>70hr/8-day</span>
            <span className={weeklyRem < 120 ? "text-red-400 font-bold" : "text-white"}>{minToHM(weeklyRem)} left</span>
          </div>
          <StatusBar value={weeklyRem} max={4200} color="bg-blue-500" />
        </div>
      </div>
    </div>
  );
}
