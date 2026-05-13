import { useState } from 'react';
import { useAppStore, useGames, useApiKey } from '../lib/store';
import { ChessCoachGraph } from '../lib/agentGraph';
import { cn } from '../lib/utils';
import {
    Upload,
    FileText,
    Brain,
    AlertTriangle,
    CheckCircle,
    Trash2,
    ChevronLeft,
    History,
    Activity
} from 'lucide-react';
import type { ChessGame } from '../lib/types';

export function GameEvaluationTab() {
    const games = useGames();
    const apiKey = useApiKey();
    const userId = useAppStore(s => s.userId);
    const uploadGame = useAppStore(s => s.uploadGame);
    const analyzeGame = useAppStore(s => s.analyzeGame);
    const deleteGame = useAppStore(s => s.deleteGame);

    const [selectedGame, setSelectedGame] = useState<ChessGame | null>(null);
    const [pgnInput, setPgnInput] = useState('');
    const [userColor, setUserColor] = useState<'white' | 'black' | undefined>(undefined);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = () => {
        if (!pgnInput.trim()) return;
        try {
            uploadGame(pgnInput, userColor);
            setPgnInput('');
            setUserColor(undefined);
            // Optional: Auto-select the new game? 
            // For now, let's just clear input.
        } catch (e) {
            setError('Failed to upload game. Invalid PGN format?');
        }
    };

    const handleAnalyze = async (game: ChessGame) => {
        if (!apiKey) {
            setError('Please configure your API Key in the AI Coach tab first.');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setSelectedGame(game); // Ensure we are viewing the game being analyzed

        try {
            // Create a temporary graph instance just for this analysis
            const graph = new ChessCoachGraph(userId, apiKey, []);
            const analysis = await graph.analyzeFullGame(game.pgn, game.userColor);

            analyzeGame(game.id, analysis);

            // Update local selection to show new analysis immediately
            setSelectedGame({ ...game, analysis });

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Analysis failed. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this game?')) {
            deleteGame(id);
            if (selectedGame?.id === id) setSelectedGame(null);
        }
    };

    if (selectedGame) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <button
                    onClick={() => setSelectedGame(null)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Back to Games
                </button>

                {/* Game Header */}
                <div className="glass-card p-6 border-l-4 border-amber-500 rounded-r-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {selectedGame.white} vs {selectedGame.black}
                            </h2>
                            <div className="flex gap-4 text-sm text-zinc-400">
                                <span>{selectedGame.date}</span>
                                <span className={cn(
                                    "font-mono px-2 py-0.5 rounded",
                                    selectedGame.result === '1-0' ? "bg-green-500/20 text-green-400" :
                                        selectedGame.result === '0-1' ? "bg-red-500/20 text-red-400" :
                                            "bg-zinc-700"
                                )}>
                                    {selectedGame.result}
                                </span>
                            </div>
                        </div>
                        {!selectedGame.analysis && !isAnalyzing && (
                            <button
                                onClick={() => handleAnalyze(selectedGame)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-lg font-medium transition-colors"
                            >
                                <Brain className="w-5 h-5" />
                                Run Deep Analysis
                            </button>
                        )}
                    </div>
                </div>

                {/* Analysis Content */}
                {isAnalyzing ? (
                    <div className="text-center py-20 animate-pulse">
                        <Brain className="w-16 h-16 mx-auto text-amber-500 mb-6 opacity-80" />
                        <h3 className="text-xl font-medium text-white">GM Caissa is analyzing...</h3>
                        <p className="text-zinc-400 mt-2">Checking cognitive patterns, missed tactics, and strategic understanding.</p>
                    </div>
                ) : selectedGame.analysis ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Summary Card */}
                        <div className="lg:col-span-2 glass-card p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Game Summary & Estimation
                                </h3>
                                <div className="flex gap-3">
                                    {selectedGame.analysis.whiteElo && (
                                        <span className="px-3 py-1 bg-zinc-800 rounded-lg text-sm border border-zinc-700">
                                            White: <span className="text-zinc-200 font-mono">{selectedGame.analysis.whiteElo}</span>
                                        </span>
                                    )}
                                    {selectedGame.analysis.blackElo && (
                                        <span className="px-3 py-1 bg-zinc-800 rounded-lg text-sm border border-zinc-700">
                                            Black: <span className="text-zinc-200 font-mono">{selectedGame.analysis.blackElo}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {selectedGame.analysis.summary}
                            </p>
                        </div>

                        {/* Psychological State */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                                <Brain className="w-5 h-5" />
                                Cognitive & Psychological State
                            </h3>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <span className="text-xl font-light text-blue-100">
                                    {selectedGame.analysis.psychologicalState}
                                </span>
                            </div>
                        </div>

                        {/* Strategic Errors */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Strategic Misconceptions
                            </h3>
                            <div className="space-y-4">
                                {selectedGame.analysis.strategicErrors.map((error, i) => (
                                    <div key={i} className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono font-bold text-red-300 bg-red-500/10 px-2 py-1 rounded">
                                                {error.move}
                                            </span>
                                            {error.severity && (
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider",
                                                    error.severity === 'Critical' ? "bg-red-500 text-white" : "bg-zinc-700 text-zinc-400"
                                                )}>
                                                    {error.severity}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-300">{error.explanation}</p>
                                    </div>
                                ))}
                                {selectedGame.analysis.strategicErrors.length === 0 && (
                                    <p className="text-zinc-500 italic">No major strategic errors found.</p>
                                )}
                            </div>
                        </div>

                        {/* Calculation Errors */}
                        <div className="lg:col-span-2 glass-card p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    Calculation & Tactics
                                </h3>
                                {selectedGame.analysis.calculationRating && (
                                    <span className={cn(
                                        "px-2 py-1 rounded text-xs font-bold uppercase tracking-wide",
                                        selectedGame.analysis.calculationRating === 'Excellent' ? "bg-green-500/20 text-green-400" :
                                            selectedGame.analysis.calculationRating === 'Good' ? "bg-blue-500/20 text-blue-400" :
                                                selectedGame.analysis.calculationRating === 'Mixed' ? "bg-yellow-500/20 text-yellow-400" :
                                                    "bg-red-500/20 text-red-400"
                                    )}>
                                        {selectedGame.analysis.calculationRating}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                {selectedGame.analysis.calculationErrors.map((error, i) => (
                                    <div key={i} className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono font-bold text-orange-300 bg-orange-500/10 px-2 py-1 rounded">
                                                {error.move}
                                            </span>
                                            {error.severity && (
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider",
                                                    error.severity === 'Critical' ? "bg-red-500 text-white" : "bg-zinc-700 text-zinc-400"
                                                )}>
                                                    {error.severity}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-zinc-300">
                                            <span className="text-zinc-500 block mb-1">Better variation:</span>
                                            <span className="font-mono text-orange-200/80">{error.variation}</span>
                                        </div>
                                    </div>
                                ))}
                                {selectedGame.analysis.calculationErrors.length === 0 && (
                                    <p className="text-zinc-500 italic">No major calculation errors found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-zinc-500">Analysis not yet run for this game.</p>
                        <button
                            onClick={() => handleAnalyze(selectedGame)}
                            className="mt-4 text-amber-500 hover:underline"
                        >
                            Run Analysis Now
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <History className="w-8 h-8 text-amber-500" />
                        Game Evaluation
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Analyze your slow games to detect System 1 vs System 2 errors.
                    </p>
                </div>
            </div>

            {/* Upload Area */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-medium text-zinc-100 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-amber-500" />
                    Upload PGN
                </h3>
                <div className="flex gap-4">
                    <textarea
                        value={pgnInput}
                        onChange={(e) => setPgnInput(e.target.value)}
                        placeholder="[Event '...']&#10;[Site '...']&#10;1. e4 e5 ..."
                        className="flex-1 bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:border-amber-500/50 outline-none transition-colors resize-none h-32"
                    />
                </div>

                {/* Color Selection */}
                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setUserColor('white')}
                        className={cn(
                            "flex-1 py-2 px-4 rounded-lg border transition-all text-sm font-medium",
                            userColor === 'white'
                                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                                : "bg-black/20 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        )}
                    >
                        I played White
                    </button>
                    <button
                        onClick={() => setUserColor('black')}
                        className={cn(
                            "flex-1 py-2 px-4 rounded-lg border transition-all text-sm font-medium",
                            userColor === 'black'
                                ? "bg-zinc-800 text-zinc-100 border-zinc-600 ring-1 ring-zinc-500"
                                : "bg-black/20 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        )}
                    >
                        I played Black
                    </button>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={!pgnInput.trim()}
                        className={cn(
                            "px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2",
                            pgnInput.trim()
                                ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                    >
                        <Upload className="w-5 h-5" />
                        <span>Upload Game</span>
                    </button>
                </div>
                {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            </div>

            {/* Games List */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-zinc-100 mb-2">Recent Games</h3>
                {games.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500">
                        No games uploaded yet. Paste a PGN above to start.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {games.map(game => (
                            <div
                                key={game.id}
                                onClick={() => setSelectedGame(game)}
                                className="glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                                        game.result === '1-0' ? "bg-green-500/10 text-green-500" :
                                            game.result === '0-1' ? "bg-red-500/10 text-red-500" :
                                                "bg-zinc-700/50 text-zinc-400"
                                    )}>
                                        {game.result === '1-0' ? '1-0' : game.result === '0-1' ? '0-1' : '½'}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-zinc-200">
                                            {game.white} <span className="text-zinc-500">vs</span> {game.black}
                                        </h4>
                                        <p className="text-xs text-zinc-500">{game.date}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {game.analysis ? (
                                        <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                                            <CheckCircle className="w-3 h-3" /> Analyzed
                                        </span>
                                    ) : (
                                        <span className="text-xs text-zinc-500">Pending Analysis</span>
                                    )}

                                    <button
                                        onClick={(e) => handleDelete(e, game.id)}
                                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <ChevronLeft className="w-4 h-4 text-zinc-600 rotate-180" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


