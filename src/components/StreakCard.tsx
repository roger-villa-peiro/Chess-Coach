import { Flame } from 'lucide-react';
import { useDailyStreak } from '../lib/store';

export function StreakCard() {
    const streak = useDailyStreak();

    let message = "Start your streak today!";
    let colorClass = "text-zinc-500";
    let bgClass = "bg-zinc-500/10 border-zinc-500/20";

    if (streak > 0) {
        message = "Good start! Keep it up!";
        colorClass = "text-amber-500";
        bgClass = "bg-amber-500/10 border-amber-500/20";
    }
    if (streak >= 3) {
        message = "You're on fire! 🔥";
        colorClass = "text-orange-500";
        bgClass = "bg-orange-500/10 border-orange-500/20";
    }
    if (streak >= 7) {
        message = "Unstoppable! 🚀";
        colorClass = "text-red-500";
        bgClass = "bg-red-500/10 border-red-500/20";
    }

    return (
        <div className={`rounded-xl border p-6 ${bgClass} flex items-center justify-between transition-all hover:scale-[1.02]`}>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Flame className={`w-5 h-5 ${colorClass} ${streak > 0 ? 'animate-pulse' : ''}`} />
                    <span className={`text-sm font-medium ${colorClass} uppercase tracking-wider`}>Daily Streak</span>
                </div>
                <div className="text-4xl font-bold text-zinc-100 mb-1">
                    {streak} <span className="text-lg font-normal text-zinc-500">days</span>
                </div>
                <p className="text-sm text-zinc-400">{message}</p>
            </div>

            {/* Visual Progress Ring or Graphic could go here, for now a simple large icon */}
            <div className={`p-4 rounded-full ${streak > 0 ? 'bg-zinc-900/50' : 'bg-transparent'}`}>
                <Flame className={`w-12 h-12 ${colorClass} ${streak >= 3 ? 'animate-bounce' : ''}`} />
            </div>
        </div>
    );
}
