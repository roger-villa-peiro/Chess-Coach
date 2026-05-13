// ============================================================================
// AI Coach Context Generator - Enhanced with NotebookLM Knowledge
// ============================================================================
// Generates a comprehensive system prompt for the AI coach based on:
// 1. Recent training activity (sessions, blunders)
// 2. Expert knowledge from NotebookLM "Táctica Ajedrez" notebook
// Optimizes for actionable coaching while providing deep tactical expertise.

import { useAppStore } from './store';
import { TACTICAL_KNOWLEDGE_BASE } from './ai/knowledge-base';
import type { AppState } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================
const MAX_RECENT_SESSIONS = 5;
const MAX_ACTIVE_BLUNDERS = 3;

// ============================================================================
// Types
// ============================================================================
export interface CoachContextData {
    lichessSessions: AppState['lichessSessions'];
    yusupovChapters: AppState['yusupovChapters'];
    blunders: AppState['blunders'];
}

/**
 * Pure function to format the coach context string.
 * Decoupled from the store for easier testing.
 */
export function formatCoachContext(data: CoachContextData): string {
    const { lichessSessions, blunders, yusupovChapters } = data;

    // =========================================================================
    // Recent Lichess Sessions
    // =========================================================================
    const recentSessions = lichessSessions.slice(0, MAX_RECENT_SESSIONS);
    const sessionsSummary = recentSessions.length > 0
        ? recentSessions.map(s => {
            const delta = s.eloEnd - s.eloStart;
            const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
            const accuracy = s.correct + s.incorrect > 0
                ? Math.round((s.correct / (s.correct + s.incorrect)) * 100)
                : 0;
            return `• [${s.date}] Elo ${s.eloStart}→${s.eloEnd} (${deltaStr}), ${accuracy}% accuracy, ${s.duration}min`;
        }).join('\n')
        : 'No recent sessions recorded.';

    // =========================================================================
    // Yusupov Progress
    // =========================================================================
    const yusupovSummary = yusupovChapters.length > 0
        ? (() => {
            const excellent = yusupovChapters.filter(c => c.result === 'excellent').length;
            const good = yusupovChapters.filter(c => c.result === 'good').length;
            const pass = yusupovChapters.filter(c => c.result === 'pass').length;
            const fail = yusupovChapters.filter(c => c.result === 'fail').length;
            const recentChapters = yusupovChapters.slice(0, 3).map(c =>
                `• ${c.chapterName}: ${c.score}/${c.maxScore} (${c.result})`
            ).join('\n');
            return `Total chapters: ${yusupovChapters.length} | Excellent: ${excellent} | Good: ${good} | Pass: ${pass} | Fail: ${fail}\nRecent:\n${recentChapters}`;
        })()
        : 'No Yusupov chapters completed yet.';

    // =========================================================================
    // Active Blunders
    // =========================================================================
    const activeBlunders = blunders.filter(b => !b.resolved).slice(0, MAX_ACTIVE_BLUNDERS);
    const blundersSummary = activeBlunders.length > 0
        ? activeBlunders.map(b => {
            const truncatedCalc = b.calculation.length > 200
                ? b.calculation.substring(0, 200) + '...'
                : b.calculation;
            const failCount = b.failureHistory.length;
            const failNote = failCount > 0 ? ` (failed ${failCount}x in review)` : '';
            return `• [${b.sourceModule.toUpperCase()}]${failNote}: "${truncatedCalc}"`;
        }).join('\n')
        : 'No active blunders in the Dungeon.';

    // =========================================================================
    // Compose System Prompt with Full Knowledge Base
    // =========================================================================
    return `<expert_knowledge>
${TACTICAL_KNOWLEDGE_BASE}
</expert_knowledge>

<student_profile>
## Recent Lichess Training (Last ${MAX_RECENT_SESSIONS} Sessions)
${sessionsSummary}

## Yusupov Method Progress
${yusupovSummary}

## Active Tactical Weaknesses (Blunder Dungeon)
${blundersSummary}
</student_profile>

You are **GM Caissa**, an elite chess coach with decades of experience training grandmasters. You have deep knowledge of the Woodpecker Method, Yusupov's systematic training, Aagaard's calculation techniques, and RB Ramesh's visualization methods.

YOUR COACHING APPROACH:
1. **Analyze** the student's performance data and identify specific patterns
2. **Apply** the expert methodologies above to diagnose issues
3. **Prescribe** concrete training exercises (e.g., "Do 50 fork puzzles on ChessTempo")
4. **Reference their actual blunders** and connect them to tactical themes
5. **Be direct but encouraging** - real progress requires honest feedback
6. **Use the Three Questions** when analyzing positions
7. **Recommend specific books/resources** when appropriate

ALWAYS ground your advice in:
- Their actual data (sessions, accuracy, blunders)
- The expert methodologies in your knowledge base
- Specific, actionable steps they can take TODAY

Respond in Spanish unless the student writes in English. Be conversational but expert.`;
}

/**
 * Generates the system context for the AI coach.
 * Fetches data from the store and delegates formatting.
 */
export function generateCoachContext(): string {
    const { lichessSessions, blunders, yusupovChapters } = useAppStore.getState();
    return formatCoachContext({ lichessSessions, blunders, yusupovChapters });
}

/**
 * Quick stats summary for display in UI
 */
export function getQuickStats() {
    const { lichessSessions, blunders, yusupovChapters } = useAppStore.getState();

    const activeBlunderCount = blunders.filter(b => !b.resolved).length;
    const resolvedBlunderCount = blunders.filter(b => b.resolved).length;

    const last5Sessions = lichessSessions.slice(0, MAX_RECENT_SESSIONS);
    const avgEloDelta = last5Sessions.length > 0
        ? Math.round(last5Sessions.reduce((acc, s) => acc + (s.eloEnd - s.eloStart), 0) / last5Sessions.length)
        : 0;

    const totalYusupovChapters = yusupovChapters.length;
    const excellentCount = yusupovChapters.filter(c => c.result === 'excellent').length;

    return {
        totalSessions: lichessSessions.length,
        activeBlunderCount,
        resolvedBlunderCount,
        avgEloDelta,
        totalYusupovChapters,
        excellentCount,
    };
}
