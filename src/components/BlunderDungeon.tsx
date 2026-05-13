import { useState } from 'react';
import { useAppStore, useActiveBlunders, useResolvedBlunders } from '../lib/store';
import { cn } from '../lib/utils';
import { Skull, Eye, EyeOff, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export function BlunderDungeon() {
    const [showArchived, setShowArchived] = useState(false);
    const activeBlunders = useActiveBlunders();
    const resolvedBlunders = useResolvedBlunders();

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                        <Skull className="w-8 h-8 text-red-500" />
                        Blunder Dungeon
                    </h1>
                    <p className="text-zinc-400 mt-1">Conquer your tactical weaknesses through spaced repetition</p>
                </div>

                <div className="text-right">
                    <p className="text-2xl font-bold text-red-400">{activeBlunders.length}</p>
                    <p className="text-xs text-zinc-500">Active Prisoners</p>
                </div>
            </div>

            {/* Active Blunders Grid */}
            {activeBlunders.length === 0 ? (
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
                    <Skull className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">The dungeon is empty.</p>
                    <p className="text-zinc-600 text-sm mt-1">Log some failures to populate it.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeBlunders.map((blunder) => (
                        <BlunderCard key={blunder.id} blunder={blunder} />
                    ))}
                </div>
            )}

            {/* Archived Section */}
            {resolvedBlunders.length > 0 && (
                <div className="pt-8 border-t border-zinc-800">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                        {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span className="text-sm font-medium">Conquered ({resolvedBlunders.length})</span>
                    </button>

                    {showArchived && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 opacity-60">
                            {resolvedBlunders.map((blunder) => (
                                <BlunderCard key={blunder.id} blunder={blunder} archived />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function BlunderCard({ blunder, archived = false }: { blunder: any; archived?: boolean }) {
    const [revealed, setRevealed] = useState(false);
    const [showFailModal, setShowFailModal] = useState(false);
    const [failNote, setFailNote] = useState('');

    const resolveBlunder = useAppStore((s) => s.resolveBlunder);
    const failBlunderAgain = useAppStore((s) => s.failBlunderAgain);

    const handleSolved = () => {
        resolveBlunder(blunder.id);
    };

    const handleFailedAgain = () => {
        if (failNote.trim()) {
            failBlunderAgain(blunder.id, failNote);
            setFailNote('');
            setShowFailModal(false);
        }
    };

    return (
        <div className={cn(
            "bg-zinc-900 rounded-xl border overflow-hidden transition-all",
            archived ? "border-zinc-800" : "border-red-500/30 hover:border-red-500/50"
        )}>
            {/* Image Area */}
            <div className="aspect-square bg-zinc-800 relative">
                {blunder.imageBase64 ? (
                    <img
                        src={blunder.imageBase64}
                        alt="Position"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Skull className="w-16 h-16 text-zinc-700" />
                    </div>
                )}

                {/* Source Badge */}
                <div className="absolute top-2 left-2">
                    <span className={cn(
                        "px-2 py-1 rounded text-xs font-semibold uppercase",
                        blunder.sourceModule === 'lichess'
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                    )}>
                        {blunder.sourceModule}
                    </span>
                </div>

                {/* Failure Count */}
                {blunder.failureHistory.length > 0 && (
                    <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400">
                            Failed {blunder.failureHistory.length}x
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {new Date(blunder.createdAt).toLocaleDateString()}
                </div>

                {/* Reveal Toggle */}
                <button
                    onClick={() => setRevealed(!revealed)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                    {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {revealed ? 'Hide My Notes' : 'Reveal My Notes'}
                </button>

                {/* Hidden Calculation */}
                {revealed && (
                    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 animate-in fade-in duration-200">
                        <p className="text-sm text-zinc-300 leading-relaxed">{blunder.calculation}</p>

                        {/* Failure History */}
                        {blunder.failureHistory.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-zinc-700">
                                <p className="text-xs text-zinc-500 mb-2">Previous Failures:</p>
                                <div className="space-y-2">
                                    {blunder.failureHistory.map((f: any, i: number) => (
                                        <div key={i} className="text-xs text-red-400/70 pl-2 border-l border-red-500/30">
                                            {new Date(f.timestamp).toLocaleDateString()}: {f.note}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                {!archived && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleSolved}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-600/30 transition-colors text-sm font-medium"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Solved
                        </button>
                        <button
                            onClick={() => setShowFailModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-600/30 transition-colors text-sm font-medium"
                        >
                            <XCircle className="w-4 h-4" />
                            Failed
                        </button>
                    </div>
                )}

                {/* Fail Modal */}
                {showFailModal && (
                    <div className="p-3 bg-zinc-800 rounded-lg border border-red-500/30 animate-in fade-in duration-200">
                        <p className="text-xs text-zinc-400 mb-2">What went wrong this time?</p>
                        <textarea
                            value={failNote}
                            onChange={(e) => setFailNote(e.target.value)}
                            placeholder="Describe your mistake..."
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 resize-none min-h-[4rem] outline-none focus:border-red-500/50"
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleFailedAgain}
                                disabled={!failNote.trim()}
                                className="flex-1 py-1.5 bg-red-600 text-white rounded text-xs font-medium disabled:opacity-50"
                            >
                                Log Failure
                            </button>
                            <button
                                onClick={() => setShowFailModal(false)}
                                className="px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded text-xs"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
