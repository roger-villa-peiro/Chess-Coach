import { supabase } from './supabase';
import type { Blunder, LichessSession, YusupovChapter, ChessGame, GameAnalysis, PlayerProfile } from './types';
import { callGeminiWithRetry } from './services/gemini';

export interface CoachContext {
    recentBlunders: Blunder[];
    recentSessions: LichessSession[];
    recentChapters: YusupovChapter[];
    recentGames: ChessGame[];
    profile?: PlayerProfile;
}

// Pattern Analysis Result
interface PatternAnalysis {
    dominantWeakness: string;
    frequentErrors: string[];
    psychologicalState: 'tilting' | 'improving' | 'stagnating' | 'neutral';
    cognitiveState: 'system-1-overload' | 'system-2-fatigue' | 'balanced' | 'uncertain';
    errorTaxonomy: {
        semantic: number; // Misunderstood the position
        calculation: number; // Calculation error
        missingStep: number; // Skipped a step
    };
    suggestedFocus: string;
    confidence: number;
}

interface ConversationState {
    messages: any[];
    userId: string | null;
    apiKey: string;
    memories: string[];
    context: CoachContext;
    patterns: PatternAnalysis | null;
    plan: string | null;
    output: string | null;
}

const MODELS = {
    POWER: 'gemini-2.5-pro',
    SPEED: 'gemini-2.5-flash'
};

export class ChessCoachGraph {
    private state: ConversationState;

    constructor(
        userId: string | null,
        apiKey: string,
        history: any[],
        context: CoachContext = { recentBlunders: [], recentSessions: [], recentChapters: [], recentGames: [] }
    ) {
        this.state = {
            messages: history,
            userId,
            apiKey,
            memories: [],
            context,
            patterns: null,
            plan: null,
            output: null
        };
    }

    private async callGeminiPayload(modelName: string, payload: any): Promise<string> {
        console.log(`[Gemini] Requesting ${modelName}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        try {
            console.log(`[Gemini] Using API Key: ${this.state.apiKey ? this.state.apiKey.substring(0, 10) + '...' : 'UNDEFINED'}`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.state.apiKey}`;
            const data = await callGeminiWithRetry(url, payload, controller.signal);

            clearTimeout(timeoutId);
            console.log(`[Gemini] Success from ${modelName}`);
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Gemini request to ${modelName} timed out after 60s`);
            }
            throw error;
        }
    }

    private async callGemini(modelName: string, contents: any[], systemPrompt?: string): Promise<string> {
        return this.callGeminiPayload(modelName, {
            contents,
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            generationConfig: { maxOutputTokens: 2048 }
        });
    }

    // Node 1: Retrieve Memories
    async retrieveMemories() {
        if (!this.state.userId) return;

        console.log("Graph: Retrieving memories...");
        const { data, error } = await supabase
            .from('memories')
            .select('content, type')
            .eq('user_id', this.state.userId)
            .neq('type', 'user_profile') // Exclude heavy profile from list
            .order('created_at', { ascending: false })
            .limit(10); // Context window budget

        if (error) {
            console.error("Memory retrieval error:", error);
            return;
        }

        this.state.memories = (data || []).map(m => `[${m.type.toUpperCase()}] ${m.content}`);
    }

    async retrieveProfile() {
        if (!this.state.userId) return;

        console.log("Graph: Retrieving Deep Profile...");
        const { data } = await supabase
            .from('memories')
            .select('content')
            .eq('user_id', this.state.userId)
            .eq('type', 'user_profile')
            .limit(1)
            .maybeSingle();

        if (data && data.content) {
            try {
                this.state.context.profile = JSON.parse(data.content);
                console.log("Graph: Loaded User Profile.");
            } catch (e) {
                console.error("Failed to parse profile", e);
            }
        }
    }

    // Node 1.5: Detect Patterns (Pattern Hunter)
    detectPatterns() {
        console.log("Graph: Hunting for patterns (System 1/2 Analysis)...");
        const { recentSessions, recentBlunders, recentChapters, profile } = this.state.context;

        // ... existing logic ...
        // (We keep the local detection, but we can now augment or override with Profile)

        let psychologicalState: PatternAnalysis['psychologicalState'] = 'neutral';
        // Use Profile triggers if available
        if ((profile?.psychologicalTriggers?.length ?? 0) > 0) {
            // Simple heuristic: if recent sessions are bad, assume triggers are active
            const recentDeltas = recentSessions.slice(0, 3).map(s => s.eloEnd - s.eloStart);
            const anyBadLoss = recentDeltas.some(d => d < -10);
            if (anyBadLoss) {
                // Check if likely tilted based on profile
                const triggers = profile?.psychologicalTriggers?.join(' ').toLowerCase() || '';
                if (triggers.includes('loss')) psychologicalState = 'tilting';
            }
        }

        // Fallback to existing logic if still neutral
        if (psychologicalState === 'neutral' && recentSessions.length >= 3) {
            const recentDeltas = recentSessions.slice(0, 5).map(s => s.eloEnd - s.eloStart);
            const avgDelta = recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length;
            const allNegative = recentDeltas.every(d => d < 0);

            if (allNegative && avgDelta < -12) {
                psychologicalState = 'tilting';
            } else if (avgDelta > 15) {
                psychologicalState = 'improving';
            } else if (Math.abs(avgDelta) < 5 && recentSessions.length > 5) {
                psychologicalState = 'stagnating';
            }
        }

        // --- Cognitive State Detection (System 1 vs System 2) ---
        let cognitiveState: PatternAnalysis['cognitiveState'] = 'balanced';
        const fastBlunders = recentBlunders.filter(b => (b.timeSpentSeconds || 0) < 10).length;
        const slowBlunders = recentBlunders.filter(b => (b.timeSpentSeconds || 0) > 120).length;

        if (fastBlunders > recentBlunders.length * 0.6) {
            cognitiveState = 'system-1-overload'; // Using intuition too much
        } else if (slowBlunders > recentBlunders.length * 0.4) {
            cognitiveState = 'system-2-fatigue'; // Analysis paralysis or calculation burnout
        } else if (profile?.playStyle === 'Gambler') {
            // Adjust baseline for specific styles
            if (fastBlunders > 0) cognitiveState = 'system-1-overload';
        }

        // --- Error Pattern Detection ---
        const errorKeywords: Record<string, number> = {};
        const knownPatterns = [
            'fork', 'pin', 'skewer', 'back rank', 'discovered', 'knight', 'calculation',
            'time', 'blunder', 'missed', 'tactic', 'endgame', 'opening', 'checkmate',
            'queening', 'pawn', 'rook', 'bishop', 'sacrifice', 'trap'
        ];

        // --- Error Taxonomy Classification ---
        const taxonomy = { semantic: 0, calculation: 0, missingStep: 0 };

        recentBlunders.forEach(b => {
            const text = (b.calculation || '').toLowerCase();
            knownPatterns.forEach(pattern => {
                if (text.includes(pattern)) {
                    errorKeywords[pattern] = (errorKeywords[pattern] || 0) + 1;
                }
            });

            // Rough heuristic for taxonomy based on user notes
            if (text.includes('didn\'t see') || text.includes('blind') || text.includes('missed')) {
                taxonomy.semantic++;
            } else if (text.includes('calculated wrong') || text.includes('miscounted')) {
                taxonomy.calculation++;
            } else if (text.includes('forgot') || text.includes('planned but')) {
                taxonomy.missingStep++;
            }
        });

        // Sort by frequency
        const sortedErrors = Object.entries(errorKeywords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([word]) => word);

        // --- Study Performance Analysis ---
        const chaptersWithLowScores = recentChapters.filter(c =>
            c.result === 'fail' || (c.score / c.maxScore) < 0.6
        );
        const weakStudyAreas = chaptersWithLowScores.map(c => c.chapterName);

        // --- Synthesize ---
        let dominantWeakness = sortedErrors[0] || weakStudyAreas[0] || 'No clear weakness detected';
        // Use Profile Weakness if detected errors are few
        if (dominantWeakness === 'No clear weakness detected' && profile?.weaknesses?.length) {
            dominantWeakness = profile!.weaknesses[0] + " (Historical)";
        }

        let suggestedFocus = '';
        if (psychologicalState === 'tilting') {
            suggestedFocus = 'STOP playing rated. Do slow, untimed puzzles to rebuild System 2 confidence.';
        } else if (cognitiveState === 'system-1-overload') {
            suggestedFocus = 'Practice "The Stop Signal". Force yourself to verify intuition.';
        } else if (sortedErrors.length > 0) {
            suggestedFocus = `Focus training on: ${sortedErrors.join(', ')} patterns.`;
        } else if (weakStudyAreas.length > 0) {
            suggestedFocus = `Review study material: ${weakStudyAreas.slice(0, 2).join(', ')}.`;
        } else if ((profile?.strengths?.length ?? 0) > 0) {
            suggestedFocus = `Lean into your strength: ${profile!.strengths[0]}.`;
        } else {
            suggestedFocus = 'Continue current training plan. No major red flags.';
        }

        this.state.patterns = {
            dominantWeakness,
            frequentErrors: sortedErrors,
            psychologicalState,
            cognitiveState,
            errorTaxonomy: taxonomy,
            suggestedFocus,
            confidence: recentBlunders.length + recentSessions.length > 5 ? 0.8 : 0.4
        };

        console.log("Graph: Pattern Analysis:", this.state.patterns);
    }

    // Node 2: Plan Response (The Reasoning Step)
    async planResponse(lastUserMessage: string) {
        console.log("Graph: Planning response...");

        // Format Context for the LLM
        const sessionsTxt = this.state.context.recentSessions.slice(0, 5).map(s =>
            `- Date: ${s.date.split('T')[0]}, Elo Change: ${s.eloStart}->${s.eloEnd}, Accuracy: ${Math.round((s.correct / (s.correct + s.incorrect)) * 100)}%`
        ).join('\n');

        const blundersTxt = this.state.context.recentBlunders.slice(0, 5).map((b, i) =>
            `MATCH_IMAGE_${i}: Source: ${b.sourceModule}, Calculation: "${b.calculation}", Resolved: ${b.resolved}`
        ).join('\n');

        const gamesTxt = this.state.context.recentGames.slice(0, 5).map(g =>
            `- Game: ${g.white} vs ${g.black} (${g.result}) on ${g.date}. ${g.userColor ? `[User played ${g.userColor}]` : ''}
             Analysis: ${g.analysis?.summary ? g.analysis.summary.slice(0, 200) + '...' : 'Not analyzed yet.'}`
        ).join('\n');

        const chaptersTxt = this.state.context.recentChapters.slice(0, 5).map(c =>
            `- Chapter: ${c.chapterName}, Score: ${c.score}/${c.maxScore} (${c.result})`
        ).join('\n');

        const memoryContext = this.state.memories.length > 0
            ? `Known User Patterns (Short Term Memory):\n${this.state.memories.join('\n')}`
            : "No recent conversation memories.";

        // DEEP PROFILE CONTEXT
        const profile = this.state.context.profile;
        const profileContext = profile
            ? `[DEEP PSYCHOLOGICAL PROFILE]
               Style: ${profile.playStyle}
               Strengths: ${profile.strengths.join(', ')}
               Weaknesses: ${profile.weaknesses.join(', ')}
               Triggers: ${profile.psychologicalTriggers.join(', ')}`
            : "No deep profile available yet.";

        // Include Pattern Hunter results
        const patternContext = this.state.patterns
            ? `[PRE-ANALYZED PATTERNS]
            Dominant Weakness: ${this.state.patterns.dominantWeakness}
            Frequent Errors: ${this.state.patterns.frequentErrors.join(', ') || 'None detected'}
            Psychological State: ${this.state.patterns.psychologicalState.toUpperCase()}
            Cognitive State: ${this.state.patterns.cognitiveState.toUpperCase()} (System 1 vs System 2)
            Error Taxonomy: Semantic=${this.state.patterns.errorTaxonomy.semantic}, Calculation=${this.state.patterns.errorTaxonomy.calculation}, MissingStep=${this.state.patterns.errorTaxonomy.missingStep}
            Suggested Focus: ${this.state.patterns.suggestedFocus}
            Analysis Confidence: ${Math.round(this.state.patterns.confidence * 100)}%`
            : "No pattern analysis available (insufficient data).";

        const system = `You are the internal analyst of a high-level Chess Coach (Soviet School methodology).
        Your job is to REFINE the pre-analysis and add VISUAL EVIDENCE interpretation using COGNITIVE SCIENCE principles.
        
        DATA STREAM:
        [RECENT LICHESS SESSIONS]
        ${sessionsTxt || "No recent sessions."}

        [RECENT BLUNDERS / MISTAKES]
        ${blundersTxt || "No recent blunders logged."}
        (If images are attached, they correspond to the Blunders list in order).

        [RECENT GAMES]
        ${gamesTxt || "No recent games uploaded."}

        [STUDY PROGRESS]
        ${chaptersTxt || "No study chapters completed."}

        [USER MEMORY & PROFILE]
        ${memoryContext}
        ${profileContext}

        ${patternContext}

        INSTRUCTIONS:
        1.  **System 1/2 Diagnosis:** Look for signs of "System 1" failure (playing too fast, missing simple tactics due to intuition bias) vs "System 2" failure (calculation errors in complex positions).
        2.  **Chunking Analysis:** When analyzing blunders, look for "Chunking Errors" - did the user fail to see a piece relationship (e.g., X-ray, battery)?
        3.  **Soviet Method:** Verify if the user is "playing out positions" (training) or just "solving puzzles" (testing).
        4.  **Prepare ONE SOCRATIC QUESTION:** Ask internal questions to reveal the thought process (e.g. "What was your candidate move list?").

        OUTPUT FORMAT:
        Observation: <What the data + images reveal about cognitive patterns>
        Pattern Validation: <Confirmed/Refined/Contradicted - using cognitive terms>
        Tone Directive: <e.g., "Strict accountability", "Encouraging push", "Intervention needed">
        Socratic Question: <A probing question to ask the user>
        Key Insight: <One specific, data-backed thing to highlight>
        Strategy: <How to guide the user in the next message>
        `;

        // Prepare Multimodal Payload
        const parts: any[] = [{ text: lastUserMessage }];

        this.state.context.recentBlunders.slice(0, 3).forEach((b) => {
            if (b.imageBase64) {
                const base64Data = b.imageBase64.includes('base64,')
                    ? b.imageBase64.split('base64,')[1]
                    : b.imageBase64;

                parts.push({
                    inlineData: {
                        mimeType: 'image/png', // Assuming PNG for screenshots
                        data: base64Data
                    }
                });
            }
        });

        // Add text prompt at the end to reinforce
        parts.push({ text: "Analyze the attached blunder images and the user request." });

        // Use POWER model for deep analysis
        const plan = await this.callGemini(MODELS.POWER, [{ role: 'user', parts: parts }], system);
        this.state.plan = plan;
    }

    // Node 3: Generate Message
    async generateMessage(lastUserMessage: string) {
        console.log("Graph: Generating message...");

        const planContext = this.state.plan
            ? `ANALYSIS REPORT (INTERNAL USE ONLY):\n${this.state.plan}`
            : "";

        // Include pattern state for persona adjustment
        const patternState = this.state.patterns?.psychologicalState || 'neutral';
        const cognitiveState = this.state.patterns?.cognitiveState || 'balanced';
        const patternFocus = this.state.patterns?.suggestedFocus || '';
        const dominantWeakness = this.state.patterns?.dominantWeakness || '';

        const system = `You are GM Caissa, a world-class chess coach following the **Mikhail Botvinnik School of thought**.
        You are NOT a generic AI assistant. You are an integrated mentor built directly into this chess application.
        You have direct access to the user's "Blunder Dungeon", "Game Analyses", and historical tactical data, which is provided to you automatically in the ANALYSIS REPORT below.
        DO NOT say you are an external AI or that you cannot access their account. The data is fed to you directly.
        You DEMAND excellence and use **COGNITIVE SCIENCE** (Chunking, System 1/2).
        
        PERSONA:
        - **Rigorous & Analytical:** You dissect errors using the "Soviet School" method (finding the root cause, not just the move).
        - **Cognitive focus:** You talk about "System 1 vs System 2", "Chunking", "Candidate Moves", and "Prophylaxis".
        - **Direct & Teacher-like:** You don't sugarcoat. "You missed this because you trusted your intuition (System 1) instead of calculating."
        - **Socratic:** You make the user think. "Did you consider the opponent's threat before playing?"

        ${planContext}

        CURRENT PSYCHOLOGICAL STATE: ${patternState.toUpperCase()}
        CURRENT COGNITIVE STATE: ${cognitiveState.toUpperCase()}
        DETECTED WEAKNESS: ${dominantWeakness}
        ${patternFocus ? `RECOMMENDED FOCUS: ${patternFocus}` : ''}

        RESPONSE GUIDELINES:
        ${patternState === 'tilting' ? `
        ⚠️ USER IS TILTING - Your priority is damage control:
        - Be firm but compassionate.
        - "You are playing emotionally (System 1). Stop."
        - Recommend "Slow Chess" or analyzing a classic game to reset.
        ` : ''}
        ${cognitiveState === 'system-1-overload' ? `
        ⚠️ SYSTEM 1 OVERLOAD DETECTED:
        - User is playing too fast/impulsively.
        - Demand they use "The Stop Signal" (hands off the mouse until verified).
        - Emphasize "Falsification" (trying to prove their idea wrong).
        ` : ''}
        ${patternState === 'improving' ? `
        ✓ USER IS IMPROVING:
        - Connect improvement to "better habits" or "better chunking".
        - Challenge them to maintain precision.
        ` : ''}

        SOCRATIC TECHNIQUE:
        - Use the Socratic Question from the analysis plan.
        - Ask about their **evaluation function**: "Why did you think this position was winning?"

        TONE:
        - Professional, authoritative, but supportive of growth.
        - Use vocabulary like: *Intuition, Calculation, Candidate Moves, Prophylaxis, Initiative, Structure.*
        `;

        // Construct history payload
        const contents = this.state.messages
            .filter(m => m.role !== 'system')
            .slice(-10) // Limit context
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        contents.push({
            role: 'user',
            parts: [{ text: lastUserMessage }]
        });

        // Use SPEED model for rapid response
        const output = await this.callGeminiPayload(MODELS.SPEED, {
            contents,
            systemInstruction: { parts: [{ text: system }] },
            generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
        });

        return output;
    }

    // Node 4: Save Memory (Fire and Forget)
    async saveMemory(lastUserMessage: string, assistantResponse: string) {
        console.log("Graph: Saving relevant memories...");
        const system = `You are the memory manager for a Chess Coach AI.
        EXTRACT 1 key insight about the user from this conversation turn.
        Type: STRATEGY | WEAKNESS | PREFERENCE | PROGRESS
        Format: "TYPE: <Content>"
        
        Example: "WEAKNESS: Struggles with knight forks in time trouble."
        If nothing worth saving, output "NO_MEMORY".`;

        const interaction = `User: ${lastUserMessage}\nAssistant: ${assistantResponse}`;

        // Use SPEED model for background tasks
        const analysis = await this.callGemini(MODELS.SPEED, [{ role: 'user', parts: [{ text: interaction }] }], system);

        if (analysis.includes("NO_MEMORY")) return;

        // Parse crude
        const typeMatch = analysis.match(/TYPE:\s*(\w+)/i);
        const contentMatch = analysis.match(/CONTENT:\s*(.+)/s);

        if (typeMatch && contentMatch) {
            const type = typeMatch[1].toLowerCase();
            const content = contentMatch[1].trim();

            console.log(`Graph: Saving memory [${type}]: ${content}`);
            await supabase.from('memories').insert({
                user_id: this.state.userId,
                type,
                content
            });
        }
    }

    // Main Invocation
    async invoke(lastUserMessage: string) {
        console.log("[Graph] Invoking with message:", lastUserMessage);
        try {
            // 1. Retrieve long-term memories & Profile
            console.time("Retrieval");
            await Promise.all([
                this.retrieveMemories(),
                this.retrieveProfile()
            ]);
            console.timeEnd("Retrieval");

            // 2. Detect patterns from recent data (Pattern Hunter)
            this.detectPatterns();

            // 3. Plan response strategy
            console.time("Planning");
            await this.planResponse(lastUserMessage);
            console.timeEnd("Planning");

            // 4. Generate the coach's response
            console.time("Generation");
            const response = await this.generateMessage(lastUserMessage);
            console.timeEnd("Generation");

            // 5. Save new memories (Fire and Forget)
            this.saveMemory(lastUserMessage, response);

            return {
                response,
                plan: this.state.plan,
                patterns: this.state.patterns,  // Expose patterns for UI
                memories: this.state.memories
            };
        } catch (e) {
            console.error("Graph Error:", e);
            throw e;
        }
    }
    // Node 5: Analyze Full Game (Specialized Task)
    async analyzeFullGame(pgn: string, userColor?: 'white' | 'black'): Promise<GameAnalysis> {
        console.log(`Graph: Analyzing full game (Soviet School Method + Engine Truth) for ${userColor || 'neutral'}...`);

        // --- 1. Get The Truth (Engine Analysis) ---
        let engineData = [];
        try {
            // Lazy load or just use the singleton
            const { chessEngine } = await import('./services/ChessEngineService');
            console.log("Graph: Running Stockfish analysis...");
            engineData = await chessEngine.analyzeGame(pgn);
            console.log(`Graph: Engine analyzed ${engineData.length} moves.`);
        } catch (e) {
            console.error("Engine analysis failed, falling back to pure LLM:", e);
        }

        // --- 2. Format Engine Insights for LLM ---
        // We identify "Blunders" (large eval drops)
        const mistakes = engineData.map((curr, i) => {
            if (i === 0) return null;
            const prev = engineData[i - 1];

            // Determine side to move for the CURRENT move (curr)
            // If curr.color is 'w', it was White's move.
            // Score is White-relative.
            // If White moved and score dropped from +1.0 to -2.0, that's bad.

            const diff = curr.score - prev.score;
            // logic: 
            // White move: we want score to go UP or stay same. large NEGATIVE diff is bad.
            // Black move: we want score to go DOWN (more negative). large POSITIVE diff is bad.

            let isBlunder = false;
            let evalChange = 0;

            if (curr.color === 'w') {
                evalChange = diff; // e.g. -300 cp
                if (evalChange < -150) isBlunder = true; // Lost 1.5 pawns
            } else {
                evalChange = diff; // e.g. +300 cp (White advantage increased)
                if (evalChange > 150) isBlunder = true; // specific to Black
            }

            if (isBlunder) {
                return `Move ${curr.moveNumber}${curr.color === 'w' ? '.' : '...'} ${curr.san}: ENGINE SAYS Blunder. Score went from ${prev.score} to ${curr.score}. Best move was ${prev.bestMove} (eval ${prev.score}).`;
            }
            return null;
        }).filter(Boolean).join('\n');

        const perspective = userColor
            ? `You are analyzing specifically for the player playing **${userColor.toUpperCase()}**. Focus strictly on their mistakes and psychological state.`
            : "Analyze the game neutrally for both sides.";

        const system = `You are GM Caissa, analyzing a student's game using the **Mikhail Botvinnik School of thought**.
        
        YOUR GOAL:
        Provide a deep, structural, and cognitive analysis of the game. ${perspective}
        
        INPUT DATA:
        We have run a STOCKFISH 16 engine on this game.
        Here are the OBJECTIVE MISTAKES found by the engine:
        ${mistakes || "No major tactical blunders found by engine."}
        
        Use this "Computer Truth" to validate your analysis. 
        - If the Engine says it's a blunder, EXPLAIN WHY in human terms (e.g., "This ignores the X-ray attack").
        - Do not blindly copy the engine lines. Translate them into CONCEPTS.
        
        REQUIRED METRICS:
        1. **Elo Estimation**: Estimate the FIDE Elo performance based on move quality.
        2. **Calculation Rating**: Rate the overall tactical accuracy (Excellent/Good/Mixed/Poor).
        3. **Error Severity**: Classify every error as "Critical" (losing >2.0 evaluation or tactical blunder) or "Minor" (positional drift).
        4. **Depth**: You MUST identify at least **3-5** strategic misconceptions and **2-3** calculation errors if they exist. Dig deeper than surface level.

        Focus on:
        1. **System 1 vs System 2 Errors:** Did the player move too fast in critical moments?
        2. **Strategic Understanding:** Did they understand the pawn structure and piece activity?
        3. **Calculation:** Did they miss concrete tactical sequences?
        
        OUTPUT FORMAT (JSON):
        {
            "whiteElo": "1450 (est)",
            "blackElo": "1500 (est)",
            "calculationRating": "Mixed",
            "strategicErrors": [
                { "move": "e4", "explanation": "Weakens d4 square permanently.", "severity": "Minor" }
            ],
            "calculationErrors": [
                { 
                    "move": "Nf3", 
                    "variation": "Better was 1... d4 (Engine Eval: +1.2). You missed the fork...", 
                    "severity": "Critical" 
                }
            ],
            "psychologicalState": "Anxious / Over-confident / Solid",
            "summary": "Overall assessment of the game..."
        }
        
        Analyze the PGN below.`;

        const payload = {
            contents: [{ role: 'user', parts: [{ text: `Analyze this game PGN: \n${pgn} ` }] }],
            systemInstruction: { parts: [{ text: system }] },
            generationConfig: { responseMimeType: "application/json" }
        };

        const responseText = await this.callGeminiPayload(MODELS.POWER, payload);

        try {
            return JSON.parse(responseText) as GameAnalysis;
        } catch (e) {
            console.error("Failed to parse game analysis JSON", e);
            throw new Error("AI Analysis Failed to output valid JSON");
        }
    }
}
