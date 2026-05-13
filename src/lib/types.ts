// ============================================================================
// Chess Tactics Study Suite - Type Definitions
// ============================================================================

// ----------------------------------------------------------------------------
// Lichess Training Session
// ----------------------------------------------------------------------------
export interface LichessSession {
    id: string;
    date: string; // ISO date string
    eloStart: number;
    eloEnd: number;
    duration: number; // minutes
    correct: number;
    incorrect: number;
    mode?: string; // e.g. 'blitz', 'rapid', 'puzzle'
    avgMoveTimeSeconds?: number; // System 1 (fast) vs System 2 (slow) indicator
}

// ----------------------------------------------------------------------------
// Yusupov Method Chapter
// ----------------------------------------------------------------------------
export type YusupovResult = 'excellent' | 'good' | 'pass' | 'fail';

export interface YusupovChapter {
    id: string;
    date: string;
    chapterName: string;
    score: number;
    maxScore: number;
    result: YusupovResult;
    timeMinutes: number;
    notes?: string;
}

// ----------------------------------------------------------------------------
// Deep Profiler (Long Term Memory)
// ----------------------------------------------------------------------------
export interface PlayerProfile {
    playStyle: 'Tactical' | 'Positional' | 'Universal' | 'Gambler' | 'Calculator';
    strengths: string[];
    weaknesses: string[];
    openingRepertoire: {
        white: string[];
        black: string[];
    };
    psychologicalTriggers: string[]; // e.g. "Tilts after 2 losses"
    lastUpdated: string;
}

// ----------------------------------------------------------------------------
// Blunder (Shared across modules for spaced repetition)
// ----------------------------------------------------------------------------
export interface FailureAttempt {
    timestamp: string;
    note: string;
}

export interface Blunder {
    id: string;
    sourceModule: 'lichess' | 'yusupov' | 'game';
    sourceId: string; // Links to LichessSession.id or YusupovChapter.id
    fen?: string;
    move?: string;
    pgn?: string;
    createdAt: string;
    imageBase64?: string; // Position screenshot
    timeSpentSeconds?: number; // Time spent on the move that caused the blunder
    calculation: string; // User's thought process / what they missed
    resolved: boolean;
    resolvedAt?: string;
    failureHistory: FailureAttempt[]; // Track repeated failures in Dungeon
}

// ----------------------------------------------------------------------------
// AI Coach Chat
// ----------------------------------------------------------------------------
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
}

// ----------------------------------------------------------------------------
// Game Evaluation & Revision
// ----------------------------------------------------------------------------
export interface GameAnalysis {
    whiteElo?: string; // e.g. "1200 (est)"
    blackElo?: string;
    calculationRating?: 'Excellent' | 'Good' | 'Mixed' | 'Poor';
    strategicErrors: {
        move: string;
        explanation: string;
        severity?: 'Critical' | 'Minor';
    }[];
    calculationErrors: {
        move: string;
        variation: string;
        severity?: 'Critical' | 'Minor';
    }[];
    psychologicalState: string;
    summary: string;
}

export interface ChessGame {
    id: string;
    pgn: string;
    white: string;
    black: string;
    date: string;
    result: string;
    userColor?: 'white' | 'black'; // 'white', 'black', or undefined
    analysis?: GameAnalysis;
}

// ----------------------------------------------------------------------------
// Zustand Store Shape
// ----------------------------------------------------------------------------
export interface AppState {
    // Data Collections
    lichessSessions: LichessSession[];
    yusupovChapters: YusupovChapter[];
    blunders: Blunder[];
    games: ChessGame[];
    chatHistory: ChatMessage[];

    // Settings
    apiKey: string;

    // Lichess Session Actions
    addLichessSession: (session: Omit<LichessSession, 'id'>) => string; // Returns new ID
    updateLichessSession: (id: string, session: Partial<LichessSession>) => void;
    deleteLichessSession: (id: string) => void;

    // Yusupov Chapter Actions
    addYusupovChapter: (chapter: Omit<YusupovChapter, 'id'>) => string;
    updateYusupovChapter: (id: string, updates: Partial<Omit<YusupovChapter, 'id'>>) => void;

    // Game Actions
    uploadGame: (pgn: string, userColor?: 'white' | 'black') => string;
    analyzeGame: (id: string, analysis: GameAnalysis) => void;
    deleteGame: (id: string) => void;

    // Blunder Actions
    addBlunder: (blunder: Omit<Blunder, 'id' | 'createdAt' | 'resolved' | 'failureHistory'>) => string;
    updateBlunder: (id: string, updates: Partial<Omit<Blunder, 'id' | 'createdAt' | 'failureHistory'>>) => void;
    deleteBlunder: (id: string) => void;
    resolveBlunder: (id: string) => void;
    failBlunderAgain: (id: string, note: string) => void;

    // Chat Actions
    addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    clearChatHistory: () => void;

    // Settings Actions
    setApiKey: (key: string) => void;
}

// ----------------------------------------------------------------------------
// Validation Helpers
// ----------------------------------------------------------------------------
export function validateLichessSession(data: Partial<LichessSession>): string[] {
    const errors: string[] = [];

    if (data.eloStart !== undefined && data.eloStart < 0) {
        errors.push('Elo Start cannot be negative');
    }
    if (data.eloEnd !== undefined && data.eloEnd < 0) {
        errors.push('Elo End cannot be negative');
    }
    if (data.eloStart !== undefined && data.eloEnd !== undefined) {
        const delta = Math.abs(data.eloEnd - data.eloStart);
        if (delta > 200) {
            errors.push('Elo change seems unrealistic (max ±200 per session)');
        }
    }
    if (data.duration !== undefined && data.duration < 0) {
        errors.push('Duration cannot be negative');
    }
    if (data.correct !== undefined && data.correct < 0) {
        errors.push('Correct count cannot be negative');
    }
    if (data.incorrect !== undefined && data.incorrect < 0) {
        errors.push('Incorrect count cannot be negative');
    }

    return errors;
}

export function calculateYusupovResult(score: number, maxScore: number): YusupovResult {
    if (maxScore <= 0) return 'fail';
    const percentage = (score / maxScore) * 100;

    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 60) return 'pass';
    return 'fail';
}
