// ============================================================================
// Chess Tactics Study Suite - Zustand Store with Supabase Sync
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { supabase } from './supabase';
import type { AppState } from './types';

interface SyncState extends AppState {
    userId: string | null;
    lichessToken: string | null;
    lastPuzzleSync: number | null;
    setUserId: (id: string | null) => void;
    setLichessToken: (token: string | null) => void;
    setLastPuzzleSync: (timestamp: number) => void;
    syncWithSupabase: () => Promise<void>;
}

export const useAppStore = create<SyncState>()(
    persist(
        (set, get) => ({
            // ========================================================================
            // Initial State
            // ========================================================================
            userId: null,
            lichessToken: import.meta.env.VITE_LICHESS_PAT || null,
            lastPuzzleSync: null,

            lichessSessions: [],
            yusupovChapters: [],
            blunders: [],
            games: [],
            chatHistory: [],

            apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',

            setUserId: (id) => set({ userId: id }),
            setLichessToken: (token) => set({ lichessToken: token }),
            // ... (omitted lines for brevity in prompt, but I need to be careful with replace)

            setLastPuzzleSync: (timestamp) => set({ lastPuzzleSync: timestamp }),

            // ========================================================================
            // Sync Logic (Fetch Initial Data)
            // ========================================================================
            syncWithSupabase: async () => {
                const { userId } = get();
                if (!userId) return;

                // Fetch all data in parallel
                const [sessions, chapters, blunders, attempts, gamesRes] = await Promise.all([
                    supabase.from('lichess_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                    supabase.from('yusupov_chapters').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                    supabase.from('blunders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                    supabase.from('blunder_attempts').select('*').eq('user_id', userId).order('timestamp', { ascending: false }),
                    supabase.from('games').select('*').eq('user_id', userId).order('created_at', { ascending: false })
                ]);

                if (sessions.error) console.error('Error fetching sessions:', sessions.error);
                if (chapters.error) console.error('Error fetching chapters:', chapters.error);
                if (blunders.error) console.error('Error fetching blunders:', blunders.error);

                // Process Blunders to include history
                const processedBlunders = (blunders.data || []).map((b: any) => ({
                    id: b.id,
                    sourceModule: b.source_module as 'lichess' | 'yusupov',
                    sourceId: b.source_id,
                    createdAt: b.created_at,
                    imageBase64: b.image_base64,
                    calculation: b.calculation,
                    resolved: b.resolved,
                    resolvedAt: b.resolved_at,
                    failureHistory: (attempts.data || [])
                        .filter((a: any) => a.blunder_id === b.id)
                        .map((a: any) => ({ timestamp: a.timestamp, note: a.note }))
                }));

                const gamesData = (gamesRes.data || []).map((g: any) => ({
                    id: g.id,
                    pgn: g.pgn,
                    white: g.white,
                    black: g.black,
                    date: g.date,
                    result: g.result,
                    userColor: g.user_color,
                    analysis: g.analysis_json
                }));

                set({
                    lichessSessions: (sessions.data || []).map((s: any) => ({
                        id: s.id,
                        date: s.date,
                        eloStart: s.elo_start,
                        eloEnd: s.elo_end,
                        duration: s.duration,
                        correct: s.correct,
                        incorrect: s.incorrect
                    })),
                    yusupovChapters: (chapters.data || []).map((c: any) => ({
                        id: c.id,
                        date: c.date,
                        chapterName: c.chapter_name,
                        score: c.score,
                        maxScore: c.max_score,
                        result: c.result as any,
                        timeMinutes: c.time_minutes,
                        notes: c.notes
                    })),
                    blunders: processedBlunders,
                    games: gamesData
                });
            },

            // ========================================================================
            // Actions (Optimistic Update + Supabase Push)
            // ========================================================================

            addLichessSession: (session) => {
                const id = crypto.randomUUID();
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    lichessSessions: [{ ...session, id }, ...state.lichessSessions]
                }));

                // Push
                if (userId) {
                    supabase.from('lichess_sessions').insert({
                        id,
                        user_id: userId,
                        date: session.date,
                        elo_start: session.eloStart,
                        elo_end: session.eloEnd,
                        duration: session.duration,
                        correct: session.correct,
                        incorrect: session.incorrect
                    }).then(({ error }) => {
                        if (error) console.error('Supabase sync error:', error);
                    });
                }
                return id;
            },

            updateLichessSession: (id, updates) => {
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    lichessSessions: state.lichessSessions.map((s) =>
                        s.id === id ? { ...s, ...updates } : s
                    )
                }));

                // Push
                if (userId) {
                    supabase.from('lichess_sessions').update({
                        date: updates.date,
                        elo_start: updates.eloStart,
                        elo_end: updates.eloEnd,
                        duration: updates.duration,
                        correct: updates.correct,
                        incorrect: updates.incorrect
                    })
                        .eq('id', id)
                        .then(({ error }) => {
                            if (error) console.error('Supabase sync error:', error);
                        });
                }
            },

            deleteLichessSession: (id) => {
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    lichessSessions: state.lichessSessions.filter((s) => s.id !== id),
                    // Also delete associated blunders for this session locally
                    blunders: state.blunders.filter((b) => !(b.sourceModule === 'lichess' && b.sourceId === id))
                }));

                // Push
                if (userId) {
                    supabase.from('lichess_sessions').delete()
                        .eq('id', id)
                        .then(({ error }) => {
                            if (error) console.error('Supabase sync error:', error);
                        });
                }
            },

            addYusupovChapter: (chapter) => {
                const id = crypto.randomUUID();
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    yusupovChapters: [{ ...chapter, id }, ...state.yusupovChapters]
                }));

                // Push
                if (userId) {
                    supabase.from('yusupov_chapters').insert({
                        id,
                        user_id: userId,
                        date: chapter.date,
                        chapter_name: chapter.chapterName,
                        score: chapter.score,
                        max_score: chapter.maxScore,
                        result: chapter.result,
                        time_minutes: chapter.timeMinutes,
                        notes: chapter.notes
                    }).then(({ error }) => {
                        if (error) console.error('Supabase sync error:', error);
                    });
                }
                return id;
            },

            updateYusupovChapter: (id, updates) => {
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    yusupovChapters: state.yusupovChapters.map((c) =>
                        c.id === id ? { ...c, ...updates } : c
                    )
                }));

                // Push
                if (userId) {
                    supabase.from('yusupov_chapters').update({
                        date: updates.date,
                        chapter_name: updates.chapterName,
                        score: updates.score,
                        max_score: updates.maxScore,
                        result: updates.result,
                        time_minutes: updates.timeMinutes,
                        notes: updates.notes
                    })
                        .eq('id', id)
                        .then(({ error }) => {
                            if (error) console.error('Supabase sync error (updateYusupovChapter):', error);
                        });
                }
            },

            uploadGame: (pgn, userColor) => {
                const id = crypto.randomUUID();
                const { userId } = get();

                // Regex Extraction for basic PGN metadata
                const whiteMatch = pgn.match(/\[White "(.+?)"\]/);
                const blackMatch = pgn.match(/\[Black "(.+?)"\]/);
                const dateMatch = pgn.match(/\[Date "(.+?)"\]/);
                const resultMatch = pgn.match(/\[Result "(.+?)"\]/);

                const newGame = {
                    id,
                    pgn,
                    white: whiteMatch ? whiteMatch[1] : 'Unknown',
                    black: blackMatch ? blackMatch[1] : 'Unknown',
                    date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
                    result: resultMatch ? resultMatch[1] : '*',
                    userColor // Store user color
                };

                // Optimistic
                set((state) => ({
                    games: [newGame, ...state.games]
                }));

                // Push
                if (userId) {
                    supabase.from('games').insert({
                        id,
                        user_id: userId,
                        pgn,
                        white: newGame.white,
                        black: newGame.black,
                        date: newGame.date,
                        result: newGame.result,
                        user_color: newGame.userColor
                    }).then(({ error }) => {
                        if (error) console.error('Supabase sync error (uploadGame):', error);
                    });
                }
                return id;
            },

            analyzeGame: (id, analysis) => {
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    games: state.games.map(g => g.id === id ? { ...g, analysis } : g)
                }));

                // Push
                if (userId) {
                    supabase.from('games').update({
                        analysis_json: analysis
                    }).eq('id', id).then(({ error }) => {
                        if (error) console.error('Supabase sync error (analyzeGame):', error);
                    });
                }
            },

            deleteGame: (id) => {
                const { userId } = get();
                set((state) => ({ games: state.games.filter(g => g.id !== id) }));
                if (userId) {
                    supabase.from('games').delete().eq('id', id).then(({ error }) => {
                        if (error) console.error('Supabase sync error (deleteGame):', error);
                    });
                }
            },

            addBlunder: (blunder) => {
                const id = crypto.randomUUID();
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    blunders: [{
                        ...blunder,
                        id,
                        createdAt: new Date().toISOString(),
                        resolved: false,
                        failureHistory: []
                    }, ...state.blunders]
                }));

                // Push
                if (userId) {
                    supabase.from('blunders').insert({
                        id,
                        user_id: userId,
                        source_module: blunder.sourceModule,
                        source_id: blunder.sourceId,
                        image_base64: blunder.imageBase64,
                        calculation: blunder.calculation,
                        resolved: false
                    }).then(({ error }) => {
                        if (error) console.error('Supabase sync error:', error);
                    });
                }
                return id;
            },

            updateBlunder: (id, updates) => {
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    blunders: state.blunders.map(b =>
                        b.id === id ? { ...b, ...updates } : b
                    )
                }));

                // Push
                if (userId) {
                    supabase.from('blunders').update({
                        image_base64: updates.imageBase64,
                        calculation: updates.calculation,
                    })
                        .eq('id', id)
                        .then(({ error }) => {
                            if (error) console.error('Supabase sync error:', error);
                        });
                }
            },

            deleteBlunder: (id) => {
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    blunders: state.blunders.filter(b => b.id !== id)
                }));

                // Push
                if (userId) {
                    supabase.from('blunders').delete()
                        .eq('id', id)
                        .then(({ error }) => {
                            if (error) console.error('Supabase sync error:', error);
                        });
                }
            },

            resolveBlunder: (id) => {
                const now = new Date().toISOString();
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    blunders: state.blunders.map(b =>
                        b.id === id
                            ? { ...b, resolved: true, resolvedAt: now }
                            : b
                    )
                }));

                // Push
                if (userId) {
                    supabase.from('blunders').update({ resolved: true, resolved_at: now })
                        .eq('id', id)
                        .then(({ error }) => {
                            if (error) console.error('Supabase sync error:', error);
                        });
                }
            },

            failBlunderAgain: (id, note) => {
                const now = new Date().toISOString();
                const { userId } = get();

                // Optimistic
                set((state) => ({
                    blunders: state.blunders.map(b =>
                        b.id === id
                            ? {
                                ...b,
                                failureHistory: [
                                    ...b.failureHistory,
                                    { timestamp: now, note }
                                ]
                            }
                            : b
                    )
                }));

                // Push
                if (userId) {
                    supabase.from('blunder_attempts').insert({
                        blunder_id: id,
                        user_id: userId,
                        timestamp: now,
                        note
                    }).then(({ error }) => {
                        if (error) console.error('Supabase sync error:', error);
                    });
                }
            },

            // Chat is strictly local for now (Supabase not used for chat history in plan)
            addChatMessage: (message) => set((state) => ({
                chatHistory: [
                    ...state.chatHistory,
                    {
                        ...message,
                        id: crypto.randomUUID(),
                        timestamp: new Date().toISOString()
                    }
                ]
            })),

            clearChatHistory: () => set({ chatHistory: [] }),

            setApiKey: (key) => set({ apiKey: key }),
        }),
        {
            name: 'chess-tactics-storage', // localStorage key
            version: 5, // Force migration to fix API key
            storage: createJSONStorage(() => localStorage),
            migrate: (persistedState: any, version) => {
                // Always force update API key from env on migration to v5
                if (version < 5) {
                    const envKey = import.meta.env.VITE_GOOGLE_API_KEY;
                    if (envKey) {
                        persistedState.apiKey = envKey;
                    }
                }
                return persistedState as SyncState;
            },
        }
    )
);

// ============================================================================
// Selector Hooks
// ============================================================================
export const useLichessSessions = () => useAppStore((state) => state.lichessSessions);
export const useYusupovChapters = () => useAppStore((state) => state.yusupovChapters);
export const useBlunders = () => useAppStore((state) => state.blunders);
export const useActiveBlunders = () => useAppStore(useShallow((state) => state.blunders.filter(b => !b.resolved)));
export const useResolvedBlunders = () => useAppStore(useShallow((state) => state.blunders.filter(b => b.resolved)));
export const useGames = () => useAppStore((state) => state.games);
export const useChatHistory = () => useAppStore((state) => state.chatHistory);
export const useApiKey = () => useAppStore((state) => state.apiKey);
export const useLichessToken = () => useAppStore((state) => state.lichessToken);
export const useLastPuzzleSync = () => useAppStore((state) => state.lastPuzzleSync);
export const useSync = () => {
    const sync = useAppStore((state) => state.syncWithSupabase);
    const setUserId = useAppStore((state) => state.setUserId);
    return { sync, setUserId };
};

export const useDailyStreak = () => {
    return useAppStore((state) => {
        const dates = new Set<string>();

        // Collect all unique activity dates
        state.lichessSessions.forEach(s => dates.add(s.date.split('T')[0]));
        state.yusupovChapters.forEach(c => dates.add(c.date.split('T')[0]));

        if (dates.size === 0) return 0;

        const sortedDates = Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // If no activity today or yesterday, streak is broken (0)
        // Unless we want to be lenient and say "current streak" is held until you miss a day entirely? 
        // Standard logic: if you haven't done it today, your streak is still N from yesterday, 
        // but if you didn't do it yesterday either, it's 0.

        let currentStreak = 0;
        let checkDate = new Date();

        // Check if the most recent activity was today or yesterday
        const mostRecent = sortedDates[0];
        if (mostRecent !== today && mostRecent !== yesterday) {
            return 0;
        }

        // Calculate streak
        // We iterate backwards from "today" (if active today) or "yesterday" (if not active today but active yesterday)
        // Actually simpler: iterate through sorted dates and check continuity

        // Normalize checkDate to midnight
        checkDate.setHours(0, 0, 0, 0);

        // If the most recent activity was yesterday, our "expected" stream starts from yesterday
        if (mostRecent === yesterday) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        for (const dateStr of sortedDates) {
            const participationDate = new Date(dateStr);
            participationDate.setHours(0, 0, 0, 0);

            const diffTime = checkDate.getTime() - participationDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                currentStreak++;
                // Move expected date back by one day
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (diffDays > 0) {
                // Gap found, streak ends
                break;
            }
            // If diffDays < 0, it means we have multiple entries for the same day or future dates (unlikely), ignore
        }

        return currentStreak;
    });
};
