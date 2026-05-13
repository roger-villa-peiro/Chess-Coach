import { useState } from 'react';
import { useAppStore, useLichessToken } from '../lib/store';
import { validateLichessSession } from '../lib/types';
import { cn } from '../lib/utils';
import { Target, AlertCircle, CheckCircle, XCircle, Trash2, AlertTriangle, LogIn, RefreshCw, Loader2 } from 'lucide-react';
import { initiateLogin, fetchPuzzleActivity } from '../lib/lichessService';

import { FailureCard } from './FailureCard';
import type { BlunderDraft } from './FailureCard';

export function LichessExercises() {
    const addSession = useAppStore((s) => s.addLichessSession);
    const updateSession = useAppStore((s) => s.updateLichessSession);
    const deleteSession = useAppStore((s) => s.deleteLichessSession);
    const createBlunder = useAppStore((s) => s.addBlunder);
    const updateBlunder = useAppStore((s) => s.updateBlunder);
    const deleteBlunder = useAppStore((s) => s.deleteBlunder);

    const sessions = useAppStore((s) => s.lichessSessions);
    const allBlunders = useAppStore((s) => s.blunders);

    // Lichess Integration State
    const lichessToken = useLichessToken();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStats, setSyncStats] = useState<{ imported: number; skipped: number } | null>(null);

    const handleLichessLogin = () => {
        initiateLogin();
    };

    const handleSync = async () => {
        if (!lichessToken) return;
        setIsSyncing(true);
        setSyncStats(null);
        try {
            const activities = await fetchPuzzleActivity(lichessToken, 50);
            const failures = activities.filter(a => !a.win);

            let importedCount = 0;
            let skippedCount = 0;

            for (const failure of failures) {
                // Check availability by Puzzle ID to avoid duplicates
                // Note: We use the Puzzle ID as the sourceId for imported blunders
                const exists = allBlunders.some(b => b.sourceId === failure.puzzle.id && b.sourceModule === 'lichess');

                if (exists) {
                    skippedCount++;
                    continue;
                }

                createBlunder({
                    sourceModule: 'lichess',
                    sourceId: failure.puzzle.id,
                    imageBase64: '', // TODO: Generar imagen desde FEN si es posible en el futuro
                    calculation: `[Importado de Lichess] Puzzle ${failure.puzzle.id}\nRating: ${failure.puzzle.rating}\nFEN: ${failure.puzzle.fen}\n\nSolución: ${failure.puzzle.solution.join(' ')}\n\nMis Notas: `,
                });
                importedCount++;
            }

            setSyncStats({ imported: importedCount, skipped: skippedCount });
            setTimeout(() => setSyncStats(null), 5000);

        } catch (e) {
            console.error('Sync failed', e);
            setErrors(prev => [...prev, 'Failed to sync with Lichess. Check console.']);
        } finally {
            setIsSyncing(false);
        }
    };

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [blundersToDelete, setBlundersToDelete] = useState<string[]>([]);

    // Delete State
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [eloStart, setEloStart] = useState<number>(1500);
    const [eloEnd, setEloEnd] = useState<number>(1500);
    const [duration, setDuration] = useState<number>(30);
    const [correct, setCorrect] = useState<number>(0);
    const [incorrect, setIncorrect] = useState<number>(0);

    // Blunder drafts (one per incorrect answer)
    const [blunderDrafts, setBlunderDrafts] = useState<BlunderDraft[]>([]);

    // Validation
    const [errors, setErrors] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);

    // Sync blunder drafts with incorrect count
    const handleIncorrectChange = (value: number) => {
        const newCount = Math.max(0, value);
        setIncorrect(newCount);

        // Adjust blunder drafts array
        if (newCount > blunderDrafts.length) {
            const toAdd = newCount - blunderDrafts.length;
            setBlunderDrafts([...blunderDrafts, ...Array(toAdd).fill(null).map(() => ({ imageBase64: '', calculation: '' }))]);
        } else if (newCount < blunderDrafts.length) {
            // Identify blunders being removed
            const removed = blunderDrafts.slice(newCount);
            removed.forEach(b => {
                if (b.id) {
                    setBlundersToDelete(prev => [...prev, b.id!]);
                }
            });
            setBlunderDrafts(blunderDrafts.slice(0, newCount));
        }
    };

    // Update specific blunder draft
    const updateBlunderDraft = (index: number, field: keyof BlunderDraft, value: string) => {
        const updated = [...blunderDrafts];
        updated[index] = { ...updated[index], [field]: value };
        setBlunderDrafts(updated);
    };

    // Handle image upload
    const handleImageUpload = (index: number, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            updateBlunderDraft(index, 'imageBase64', base64);
        };
        reader.readAsDataURL(file);
    };

    // Handle image removal
    const handleImageRemove = (index: number) => {
        updateBlunderDraft(index, 'imageBase64', '');
    };

    // Validate form
    const validate = (): boolean => {
        const validationErrors = validateLichessSession({ eloStart, eloEnd, duration, correct, incorrect });

        // Check blunder drafts are complete (only for new sessions or if increasing incorrect count logic is strictly enforced)
        // For editing, we might not require re-inputting blunders if we're just fixing a typo in elo, 
        // but currently blunders are separate entities. So we only draft new blunders on edit if intended.
        // Simplification: We only allow adding NEW blunders on create. 
        // Editing session details shouldn't require re-submitting blunders unless we want complex logic.
        // For now, let's keep blunder logic as is: effectively "add extra blunders if you increase the count"

        if (incorrect > 0) {
            const incomplete = blunderDrafts.filter(b => !b.calculation.trim());
            if (incomplete.length > 0) {
                validationErrors.push(`${incomplete.length} failure(s) need calculation notes`);
            }
        }

        setErrors(validationErrors);
        return validationErrors.length === 0;
    };

    // Populate form for editing
    const handleEdit = (session: any) => {
        setEditingId(session.id);
        setDate(session.date);
        setEloStart(session.eloStart);
        setEloEnd(session.eloEnd);
        setDuration(session.duration);
        setCorrect(session.correct);
        setIncorrect(session.incorrect);

        // Load associated blunders
        const sessionBlunders = allBlunders
            .filter(b => b.sourceId === session.id && b.sourceModule === 'lichess')
            .map(b => ({
                id: b.id,
                imageBase64: b.imageBase64 || '',
                calculation: b.calculation
            }));

        setBlunderDrafts(sessionBlunders);
        setBlundersToDelete([]);
        setErrors([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        resetForm();
    };

    const resetForm = () => {
        const lastSession = sessions[0];
        setDate(new Date().toISOString().split('T')[0]);
        setEloStart(lastSession ? lastSession.eloEnd : 1500);
        setEloEnd(lastSession ? lastSession.eloEnd : 1500);
        setDuration(30);
        setCorrect(0);
        setIncorrect(0);
        setBlunderDrafts([]);
        setBlundersToDelete([]);
        setErrors([]);
    };

    // Submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        if (editingId) {
            // Update Session
            updateSession(editingId, {
                date,
                eloStart,
                eloEnd,
                duration,
                correct,
                incorrect
            });

            // Handle Deleted Blunders
            blundersToDelete.forEach(id => {
                deleteBlunder(id);
            });

            // Handle Created/Updated Blunders
            blunderDrafts.forEach(draft => {
                if (draft.id) {
                    // Update existing
                    updateBlunder(draft.id, {
                        imageBase64: draft.imageBase64,
                        calculation: draft.calculation
                    });
                } else if (draft.calculation.trim()) {
                    // Create new
                    createBlunder({
                        sourceModule: 'lichess',
                        sourceId: editingId,
                        imageBase64: draft.imageBase64,
                        calculation: draft.calculation,
                    });
                }
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            cancelEdit();
        } else {
            // Add the session
            const sessionId = addSession({
                date,
                eloStart,
                eloEnd,
                duration,
                correct,
                incorrect,
            });

            // Add blunders
            blunderDrafts.forEach((draft) => {
                if (draft.calculation.trim()) {
                    createBlunder({
                        sourceModule: 'lichess',
                        sourceId: sessionId,
                        imageBase64: draft.imageBase64,
                        calculation: draft.calculation,
                    });
                }
            });

            // Reset form
            setSuccess(true);
            resetForm();
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeletingId(id);
    };

    const confirmDelete = () => {
        if (deletingId) {
            deleteSession(deletingId);
            setDeletingId(null);
            // If we deleted the one currently being edited, cancel edit
            if (editingId === deletingId) {
                cancelEdit();
            }
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* Delete Confirmation Overlay */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-red-500/50 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="text-xl font-bold">Delete Session?</h3>
                        </div>
                        <p className="text-zinc-300 mb-6">
                            Are you sure you want to permanently delete this session?
                            This action cannot be undone and will also remove any associated blunder records.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold transition-colors"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                    <Target className="w-8 h-8 text-blue-500" />
                    Lichess Exercises
                </h1>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-zinc-400">Log your tactics training sessions</p>

                    <div className="flex items-center gap-3">
                        {lichessToken ? (
                            <div className="flex items-center gap-3">
                                {syncStats && (
                                    <span className="text-xs text-emerald-400 animate-in fade-in">
                                        +{syncStats.imported} imported ({syncStats.skipped} skipped)
                                    </span>
                                )}
                                <button
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-medium rounded-lg border border-blue-500/30 transition-all disabled:opacity-50"
                                >
                                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    {isSyncing ? 'Syncing...' : 'Sync Blunders'}
                                </button>
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-500 border border-zinc-700">
                                    Connected
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={handleLichessLogin}
                                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-zinc-700 transition-all"
                            >
                                <LogIn className="w-4 h-4" />
                                Connect Lichess
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Session Info */}
                <div className={cn("bg-zinc-900 rounded-xl border p-6 transition-colors", editingId ? "border-amber-500/50" : "border-zinc-800")}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={cn("text-lg font-semibold", editingId ? "text-amber-500" : "text-zinc-100")}>
                            {editingId ? "Editing Session" : "New Session Details"}
                        </h2>
                        {editingId && (
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded-md transition-colors"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField label="Date">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="form-input"
                            />
                        </FormField>

                        <FormField label="Elo Start">
                            <input
                                type="number"
                                value={eloStart}
                                onChange={(e) => setEloStart(parseInt(e.target.value) || 0)}
                                className="form-input"
                                min="0"
                            />
                        </FormField>

                        <FormField label="Elo End">
                            <input
                                type="number"
                                value={eloEnd}
                                onChange={(e) => setEloEnd(parseInt(e.target.value) || 0)}
                                className="form-input"
                                min="0"
                            />
                        </FormField>

                        <FormField label="Duration (minutes)">
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                className="form-input"
                                min="0"
                            />
                        </FormField>

                        <FormField label="Correct">
                            <input
                                type="number"
                                value={correct}
                                onChange={(e) => setCorrect(Math.max(0, parseInt(e.target.value) || 0))}
                                className="form-input"
                                min="0"
                            />
                        </FormField>

                        <FormField label="Incorrect">
                            <input
                                type="number"
                                value={incorrect}
                                onChange={(e) => handleIncorrectChange(parseInt(e.target.value) || 0)}
                                className="form-input"
                                min="0"
                                disabled={false}
                            />
                        </FormField>
                    </div>
                </div>

                {/* Failure Cards (Dynamic) */}
                {incorrect > 0 && (
                    <div className="bg-zinc-900 rounded-xl border border-red-500/30 p-6">
                        <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            Log Your Failures ({incorrect})
                        </h2>
                        <p className="text-zinc-500 text-sm mb-6">
                            You must document each failure before submitting. This feeds your Blunder Dungeon.
                        </p>

                        <div className="space-y-6">
                            {blunderDrafts.map((draft, index) => (
                                <FailureCard
                                    key={index}
                                    index={index}
                                    draft={draft}
                                    onImageUpload={(file) => handleImageUpload(index, file)}
                                    onImageRemove={() => handleImageRemove(index)}
                                    onCalculationChange={(value) => updateBlunderDraft(index, 'calculation', value)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-400">Please fix the following:</p>
                                <ul className="list-disc list-inside text-sm text-red-300 mt-1">
                                    {errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <p className="text-emerald-400">Session {editingId ? "updated" : "logged"} successfully!</p>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    className={cn(
                        "w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all",
                        editingId
                            ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                            : "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    {editingId ? "Update Session" : "Save Session"}
                </button>
            </form>

            {/* Recent Sessions List */}
            <div className="mt-12">
                <h2 className="text-xl font-bold text-zinc-100 mb-4">Recent Sessions</h2>
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    {sessions.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">No sessions logged yet.</div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {sessions.map((session) => (
                                <div key={session.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex gap-6 items-center">
                                        <div className="w-24 text-sm text-zinc-400">
                                            {session.date}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-zinc-200">
                                                    {session.eloStart} → {session.eloEnd}
                                                </span>
                                                <span className={cn(
                                                    "text-xs px-1.5 py-0.5 rounded",
                                                    session.eloEnd - session.eloStart >= 0
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-red-500/10 text-red-400"
                                                )}>
                                                    {session.eloEnd - session.eloStart >= 0 ? '+' : ''}
                                                    {session.eloEnd - session.eloStart}
                                                </span>
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-1">
                                                {session.duration} min • {session.correct} / {session.correct + session.incorrect} ({Math.round((session.correct / (session.correct + session.incorrect || 1)) * 100)}%)
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEdit(session)}
                                            className="p-2 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                                            title="Edit Session"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteClick(session.id, e)}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Delete Session"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{label}</label>
            {children}
        </div>
    );
}


