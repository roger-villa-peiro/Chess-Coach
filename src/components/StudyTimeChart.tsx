import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useLichessSessions, useYusupovChapters } from '../lib/store';

export function StudyTimeChart() {
    const activeSessions = useLichessSessions();
    const activeChapters = useYusupovChapters();

    // Calculate last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }

    // Map data
    const data = days.map(day => {
        const dateObj = new Date(day);
        const dayLabel = dateObj.toLocaleDateString(undefined, { weekday: 'short' });

        const lichessTime = activeSessions
            .filter(s => s.date.startsWith(day))
            .reduce((sum, s) => sum + s.duration, 0);

        const yusupovTime = activeChapters
            .filter(c => c.date.startsWith(day))
            .reduce((sum, c) => sum + c.timeMinutes, 0);

        return {
            name: dayLabel,
            lichess: lichessTime,
            yusupov: yusupovTime,
            total: lichessTime + yusupovTime
        };
    });

    return (
        <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis
                        dataKey="name"
                        stroke="#71717a"
                        fontSize={12}
                        tickMargin={10}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#71717a"
                        fontSize={12}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    />
                    <Bar dataKey="lichess" name="Tactics" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="yusupov" name="Yusupov" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
