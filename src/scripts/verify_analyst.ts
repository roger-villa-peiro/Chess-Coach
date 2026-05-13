import { ChessCoachGraph } from '../lib/agentGraph';
import type { CoachContext } from '../lib/agentGraph';

// Mock Data: The Tilting Player
const mockContext: CoachContext = {
    recentSessions: [
        { id: '1', date: '2023-10-27T10:00:00', eloStart: 1550, eloEnd: 1530, correct: 5, incorrect: 5, mode: 'blitz', duration: 10 }, // -20
        { id: '2', date: '2023-10-27T10:30:00', eloStart: 1530, eloEnd: 1515, correct: 4, incorrect: 6, mode: 'blitz', duration: 10 }, // -15
        { id: '3', date: '2023-10-27T11:00:00', eloStart: 1515, eloEnd: 1500, correct: 3, incorrect: 7, mode: 'blitz', duration: 10 }  // -15
    ],
    recentBlunders: [
        { id: '1', fen: '', move: 'e5', calculation: 'I missed the knight fork on c7', resolved: false, sourceModule: 'game', sourceId: 'g1', createdAt: '2023-10-27T10:00:00', failureHistory: [] },
        { id: '2', fen: '', move: 'd4', calculation: 'Calculation error, didn\'t see the bishop pin', resolved: false, sourceModule: 'game', sourceId: 'g1', createdAt: '2023-10-27T10:05:00', failureHistory: [] },
        { id: '3', fen: '', move: 'Nf3', calculation: 'Another fork, I am so blind today', resolved: false, sourceModule: 'game', sourceId: 'g1', createdAt: '2023-10-27T10:10:00', failureHistory: [] }
    ],
    recentChapters: [],
    recentGames: [], // Added missing property
};

async function runTest() {
    console.log("--- STARTING ANALYST ENGINE VERIFICATION ---");

    // Instantiate Graph (Mocking API key and history)
    const graph = new ChessCoachGraph('test-user', 'mock-key', [], mockContext);

    // Mock Network Methods to avoid side effects
    graph.retrieveMemories = async () => { console.log("[Mock] Retrieved memories"); };
    graph.saveMemory = async () => { console.log("[Mock] Saved memory"); };
    graph.planResponse = async () => { console.log("[Mock] Planning response skipped (requires LLM)"); };
    graph.generateMessage = async () => { return "[Mock] Response generated"; };
    // Trigger any method needed.

    // Run the Pattern Hunter
    console.log("\n1. Running detectPatterns()...");
    graph.detectPatterns();

    // Access private state (using any cast for testing)
    const state = (graph as any).state;
    const patterns = state.patterns;

    console.log("\n--- RESULTS ---");
    if (patterns) {
        console.log(`Psychological State: ${patterns.psychologicalState.toUpperCase()}`);
        console.log(`Dominant Weakness: ${patterns.dominantWeakness}`);
        console.log(`Suggested Focus: ${patterns.suggestedFocus}`);

        // Verification Logic
        let passed = true;
        if (patterns.psychologicalState !== 'tilting') {
            console.error("❌ FAILED: Expected state 'tilting'");
            passed = false;
        }
        if (!patterns.suggestedFocus.includes("STOP playing")) {
            console.error("❌ FAILED: Expected focus to suggest stopping");
            passed = false;
        }

        if (passed) {
            console.log("\n✅ VERIFICATION PASSED: Pattern Hunter correctly identified 'Tilting' state.");
        } else {
            console.log("\n❌ VERIFICATION FAILED");
        }
    } else {
        console.error("❌ FAILED: No patterns detected.");
    }
}

runTest();
