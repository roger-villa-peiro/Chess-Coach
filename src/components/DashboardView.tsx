import { useLichessSessions, useYusupovChapters, useActiveBlunders, useResolvedBlunders } from '../lib/store';
import { getQuickStats } from '../lib/ai-context';
import { Target, BookOpen, Skull, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { StreakCard } from './StreakCard';

export function DashboardView() {
    const sessions = useLichessSessions();
    const chapters = useYusupovChapters();
    const activeBlunders = useActiveBlunders();
    const resolvedBlunders = useResolvedBlunders();
    const stats = getQuickStats();

    // Calculate Elo trend
    const latestElo = sessions[0]?.eloEnd ?? 0;
    const weekAgoElo = sessions[7]?.eloEnd ?? sessions[sessions.length - 1]?.eloEnd ?? latestElo;
    const eloTrend = latestElo - weekAgoElo;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header with Hero Stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
                    <p className="text-zinc-400 mt-1">Your tactical training overview</p>
                </div>
                <div className="w-full md:w-auto min-w-[240px]">
                    <StreakCard />
                </div>
            </div>

            {/* Hero Stat: Current Elo with Glow */}
            {latestElo > 0 && (
                <div className="glass-gold p-6 glow-gold-subtle flex items-center justify-between">
                    <div>
                        <p className="text-sm text-amber-400/80 font-medium">Current Lichess Puzzle Elo</p>
                        <p className="text-5xl font-bold text-amber-400 mt-1 animate-count">{latestElo}</p>
                    </div>
                    <div className={`flex items-center gap-2 text-lg font-semibold ${eloTrend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {eloTrend >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        {eloTrend >= 0 ? '+' : ''}{eloTrend} this week
                    </div>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Target className="w-5 h-5 text-blue-400" />}
                    label="Lichess Sessions"
                    value={sessions.length.toString()}
                    subtext={`Avg Elo Δ: ${stats.avgEloDelta >= 0 ? '+' : ''}${stats.avgEloDelta}`}
                    color="blue"
                />
                <StatCard
                    icon={<BookOpen className="w-5 h-5 text-purple-400" />}
                    label="Yusupov Chapters"
                    value={chapters.length.toString()}
                    subtext={`${stats.excellentCount} Excellent`}
                    color="purple"
                />
                <StatCard
                    icon={<Skull className="w-5 h-5 text-red-400" />}
                    label="Active Blunders"
                    value={activeBlunders.length.toString()}
                    subtext="In the Dungeon"
                    color="red"
                />
                <StatCard
                    icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
                    label="Blunders Solved"
                    value={resolvedBlunders.length.toString()}
                    subtext="Conquered"
                    color="emerald"
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Lichess Sessions */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400" />
                        Recent Lichess Sessions
                    </h3>
                    {sessions.length === 0 ? (
                        <p className="text-zinc-500 text-sm">No sessions recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {sessions.slice(0, 5).map((s) => {
                                const delta = s.eloEnd - s.eloStart;
                                return (
                                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <div>
                                            <p className="text-sm text-zinc-300">{s.date}</p>
                                            <p className="text-xs text-zinc-500">{s.duration} min • {s.correct}/{s.correct + s.incorrect} correct</p>
                                        </div>
                                        <span className={`text-sm font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {delta >= 0 ? '+' : ''}{delta} Elo
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Yusupov Chapters */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-400" />
                        Recent Yusupov Chapters
                    </h3>
                    {chapters.length === 0 ? (
                        <p className="text-zinc-500 text-sm">No chapters completed yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {chapters.slice(0, 5).map((c) => (
                                <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <div>
                                        <p className="text-sm text-zinc-300">{c.chapterName}</p>
                                        <p className="text-xs text-zinc-500">{c.date} • {c.timeMinutes} min</p>
                                    </div>
                                    <ResultBadge result={c.result} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, subtext, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext: string;
    color: 'blue' | 'purple' | 'red' | 'emerald';
}) {
    const colorClasses = {
        blue: 'border-blue-500/20 hover:border-blue-500/40',
        purple: 'border-purple-500/20 hover:border-purple-500/40',
        red: 'border-red-500/20 hover:border-red-500/40',
        emerald: 'border-emerald-500/20 hover:border-emerald-500/40',
    };

    return (
        <div className={`glass-card p-5 border transition-colors cursor-default ${colorClasses[color]}`}>
            <div className="flex items-center gap-3 mb-3">
                {icon}
                <span className="text-sm font-medium text-zinc-400">{label}</span>
            </div>
            <p className="text-3xl font-bold text-zinc-100">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
        </div>
    );
}

function ResultBadge({ result }: { result: string }) {
    const colors: Record<string, string> = {
        excellent: 'bg-emerald-500/20 text-emerald-400',
        good: 'bg-blue-500/20 text-blue-400',
        pass: 'bg-amber-500/20 text-amber-400',
        fail: 'bg-red-500/20 text-red-400',
    };

    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${colors[result] || 'bg-zinc-700 text-zinc-400'}`}>
            {result}
        </span>
    );
}

