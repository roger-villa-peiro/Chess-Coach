import { supabase } from '../supabase';
import type { GameAnalysis, PlayerProfile } from '../types';
import { callGeminiWithRetry } from '../services/gemini';

const MODEL_NAME = 'gemini-2.5-pro';

export async function generateUserProfile(userId: string, apiKey: string): Promise<PlayerProfile | null> {
    console.log("Profiler: Gathering data for Deep Profile...");

    // 1. Fetch History (Last 30 days or 50 items)
    const { data: sessions } = await supabase
        .from('lichess_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(20);

    const { data: blunders } = await supabase
        .from('blunders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    const { data: games } = await supabase
        .from('games')
        .select('pgn, analysis, result, date, white, black, user_color')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10); // Full games are heavy

    if ((!sessions || sessions.length === 0) && (!games || games.length === 0)) {
        console.log("Profiler: Not enough data.");
        return null;
    }

    // 2. Construct Prompt
    const sessionText = (sessions || []).map(s =>
        `- ${s.date}: Elo ${s.eloStart}->${s.eloEnd} (${s.mode || 'blitz'}), Accuracy ${Math.round((s.correct / (s.correct + s.incorrect)) * 100)}%`
    ).join('\n');

    const blunderText = (blunders || []).map(b =>
        `- Missed: "${b.calculation}". Type: ${b.sourceModule}. Resolved: ${b.resolved}`
    ).join('\n');

    const gameText = (games || []).map(g => {
        const analysis = g.analysis as GameAnalysis;
        return `- Game (${g.result}) as ${g.user_color}: ${analysis?.summary || 'No analysis'}. 
          Calc Rating: ${analysis?.calculationRating}. 
          Psych State: ${analysis?.psychologicalState}`;
    }).join('\n');

    const systemPrompt = `You are a Grandmaster Psychologist analyzing a student's chess history.
    Create a DEEP PSYCHOLOGICAL PROFILE (JSON).

    DATA:
    [Recent Sessions]
    ${sessionText}

    [Tactical Failures]
    ${blunderText}

    [Full Game Performance]
    ${gameText}

    TASK:
    Classify the player and find deep patterns.
    1. **PlayStyle**: Tactical / Positional / Universal / Gambler / Calculator
    2. **Strengths**: What do they do consistently well? (e.g. "Good at converting winning endgames")
    3. **Weaknesses**: What kills them? (e.g. "Blunders pieces in time pressure", "Passive play in openings")
    4. **Psychological Triggers**: When do they tilt? (e.g. "After a loss", "Against higher rated players")
    5. **Opening Repertoire**: Infer from games (if available) what they play.

    OUTPUT JSON ONLY:
    {
        "playStyle": "...",
        "strengths": ["..."],
        "weaknesses": ["..."],
        "openingRepertoire": { "white": ["..."], "black": ["..."] },
        "psychologicalTriggers": ["..."],
        "lastUpdated": "${new Date().toISOString()}"
    }`;

    // 3. Call Gemini
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
        const data = await callGeminiWithRetry(url, {
            contents: [{ role: 'user', parts: [{ text: "Generate profile." }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
        });

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("No response from Gemini");

        const profile = JSON.parse(text) as PlayerProfile;

        // 4. Save to DB (as a special memory type 'user_profile')
        // We delete old profile first to keep it clean, or just append distinct type
        await supabase.from('memories').delete().eq('user_id', userId).eq('type', 'user_profile');

        await supabase.from('memories').insert({
            user_id: userId,
            type: 'user_profile',
            content: JSON.stringify(profile)
        });

        console.log("Profiler: Profile generated and saved.");
        return profile;

    } catch (e) {
        console.error("Profiler Consultant Failed:", e);
        return null;
    }
}
