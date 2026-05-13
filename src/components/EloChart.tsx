import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useLichessSessions } from '../lib/store';

export function EloChart() {
    const sessions = useLichessSessions();

    // Prepare data: ensure it's sorted by date
    // We want to map each session to a point. 
    // Data structure: { date: string, elo: number }
    // If multiple sessions per day, we might want to pick the last one or show all?
    // Let's show all for granular history.

    // Reverse because sessions are stored new -> old in store
    const data = [...sessions].reverse().map(s => ({
        date: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        elo: s.eloEnd,
        fullDate: s.date
    }));

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-zinc-500 border border-zinc-700 border-dashed rounded-lg bg-zinc-900/30">
                Not enough data for Elo graph
            </div>
        );
    }

    // Determine Y domain padding
    const minElo = Math.min(...data.map(d => d.elo)) - 20;
    const maxElo = Math.max(...data.map(d => d.elo)) + 20;

    return (
        <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                        dataKey="date"
                        stroke="#71717a"
                        fontSize={12}
                        tickMargin={10}
                    />
                    <YAxis
                        domain={[minElo, maxElo]}
                        stroke="#71717a"
                        fontSize={12}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                        itemStyle={{ color: '#60a5fa' }}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '0.25rem' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="elo"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 3 }}
                        activeDot={{ r: 6, fill: '#60a5fa' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
