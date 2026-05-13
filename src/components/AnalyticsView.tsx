import { Activity, Clock, Trophy, TrendingUp } from 'lucide-react';
import { useLichessSessions, useYusupovChapters } from '../lib/store';
import { EloChart } from './EloChart';
import { StudyTimeChart } from './StudyTimeChart';


export function AnalyticsView() {
    const sessions = useLichessSessions();
    const chapters = useYusupovChapters();


    // Calculate Summary Stats
    const totalSessions = sessions.length;

    const latestElo = sessions.length > 0 ? sessions[0].eloEnd : 0;
    const startElo = sessions.length > 0 ? sessions[sessions.length - 1].eloStart : 0; // oldest is last in array
    const eloGain = latestElo - startElo;

    const totalStudyTime =
        sessions.reduce((acc, s) => acc + s.duration, 0) +
        chapters.reduce((acc, c) => acc + c.timeMinutes, 0);

    const hours = Math.floor(totalStudyTime / 60);
    const mins = totalStudyTime % 60;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-emerald-500" />
                    Analytics
                </h1>
                <p className="text-zinc-400 mt-1">Deep dive into your training performance</p>
            </div>

            {/* Top Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Re-using StreakCard here for consistent motivation, but maybe simplified? 
                     Actually StreakCard is complex so let's just use it as is or a summary.
                     Let's keep StreakCard in Dashboard and use simple StatCards here. 
                 */}

                <StatCard
                    icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
                    label="Elo Evolution"
                    value={`${eloGain > 0 ? '+' : ''}${eloGain}`}
                    suffix="Pts"
                    subtext="Total gain since start"
                    color="blue"
                />

                <StatCard
                    icon={<Clock className="w-5 h-5 text-purple-500" />}
                    label="Total Study Time"
                    value={hours.toString()}
                    suffix={`h ${mins}m`}
                    subtext="Across all modules"
                    color="purple"
                />

                <StatCard
                    icon={<Trophy className="w-5 h-5 text-amber-500" />}
                    label="Sessions Completed"
                    value={(totalSessions + chapters.length).toString()}
                    suffix="Units"
                    subtext={`${totalSessions} Tactics + ${chapters.length} Yusupov`}
                    color="amber"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Elo Chart */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Tactics Elo History
                    </h3>
                    <EloChart />
                </div>

                {/* Study Time Chart */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-500" />
                        Weekly Training Volume
                    </h3>
                    <StudyTimeChart />
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, suffix, subtext, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    suffix?: string;
    subtext: string;
    color: 'blue' | 'purple' | 'amber' | 'emerald';
}) {
    const colorClasses = {
        blue: 'bg-blue-500/10 border-blue-500/20',
        purple: 'bg-purple-500/10 border-purple-500/20',
        amber: 'bg-amber-500/10 border-amber-500/20',
        emerald: 'bg-emerald-500/10 border-emerald-500/20',
    };

    return (
        <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-sm font-medium text-zinc-400">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-100">{value}</span>
                {suffix && <span className="text-lg text-zinc-500">{suffix}</span>}
            </div>
            <p className="text-xs text-zinc-500 mt-2">{subtext}</p>
        </div>
    );
}
