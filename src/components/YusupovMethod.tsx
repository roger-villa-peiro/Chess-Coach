import { useState } from 'react';
import { useAppStore, useYusupovChapters } from '../lib/store';
import { calculateYusupovResult } from '../lib/types';
import type { YusupovResult, YusupovChapter } from '../lib/types';
import { cn } from '../lib/utils';
import { BookOpen, CheckCircle, AlertCircle, Edit2, X, Clock, Trophy } from 'lucide-react';
import { FailureCard } from './FailureCard';
import type { BlunderDraft } from './FailureCard';

export function YusupovMethod() {
    const addChapter = useAppStore((s) => s.addYusupovChapter);
    const updateChapter = useAppStore((s) => s.updateYusupovChapter);
    const addBlunder = useAppStore((s) => s.addBlunder);
    const pastChapters = useYusupovChapters();

    // Edit Mode State
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [chapterName, setChapterName] = useState('');
    const [score, setScore] = useState<number>(0);
    const [maxScore, setMaxScore] = useState<number>(12);
    const [timeMinutes, setTimeMinutes] = useState<number>(60);
    const [notes, setNotes] = useState('');
    const [resultOverride, setResultOverride] = useState<YusupovResult | null>(null);

    // Blunder logging for failed chapters
    const [showBlunderPrompt, setShowBlunderPrompt] = useState(false);
    const [blunderDraft, setBlunderDraft] = useState<BlunderDraft>({ imageBase64: '', calculation: '' });

    // Computed result
    const computedResult = calculateYusupovResult(score, maxScore);
    const finalResult = resultOverride || computedResult;

    // Validation
    const [errors, setErrors] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);

    const validate = (): boolean => {
        const validationErrors: string[] = [];

        if (!chapterName.trim()) {
            validationErrors.push('Chapter name is required');
        }
        if (score < 0) {
            validationErrors.push('Score cannot be negative');
        }
        if (maxScore <= 0) {
            validationErrors.push('Max score must be greater than 0');
        }
        if (score > maxScore) {
            validationErrors.push('Score cannot exceed max score');
        }
        if (timeMinutes < 0) {
            validationErrors.push('Time cannot be negative');
        }

        setErrors(validationErrors);
        return validationErrors.length === 0;
    };

    const handleEdit = (chapter: YusupovChapter) => {
        setEditingId(chapter.id);
        setDate(chapter.date);
        setChapterName(chapter.chapterName);
        setScore(chapter.score);
        setMaxScore(chapter.maxScore);
        setTimeMinutes(chapter.timeMinutes);
        setNotes(chapter.notes || '');
        setResultOverride(null); // Reset override, let it recalculate or be manual again
        setShowBlunderPrompt(false);
        setSuccess(false);
        setErrors([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setChapterName('');
        setScore(0);
        setNotes('');
        setResultOverride(null);
        setShowBlunderPrompt(false);
        setErrors([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        // If result is 'fail', prompt for blunder logging (only on new chapters or if explicitly wanted?)
        // Let's allow it for edits too if they change the score to a fail
        if (finalResult === 'fail' && !showBlunderPrompt && !editingId) {
            setShowBlunderPrompt(true);
            return;
        }

        const chapterData = {
            date,
            chapterName,
            score,
            maxScore,
            result: finalResult,
            timeMinutes,
            notes: notes.trim() || undefined,
        };

        if (editingId) {
            updateChapter(editingId, chapterData);
            setEditingId(null); // Exit edit mode
        } else {
            const chapterId = addChapter(chapterData);
            // Add blunder if failed and notes provided
            if (finalResult === 'fail' && blunderDraft.calculation.trim()) {
                addBlunder({
                    sourceModule: 'yusupov',
                    sourceId: chapterId,
                    calculation: blunderDraft.calculation,
                    imageBase64: blunderDraft.imageBase64
                });
            }
        }

        // Reset form
        setSuccess(true);
        if (!editingId) {
            setChapterName('');
            setScore(0);
            setNotes('');
            setResultOverride(null);
            setShowBlunderPrompt(false);
            setBlunderDraft({ imageBase64: '', calculation: '' });
        }
        setTimeout(() => setSuccess(false), 3000);
    };

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-purple-500" />
                    Yusupov Method
                </h1>
                <p className="text-zinc-400 mt-1">Track your structured learning progress</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit} className="relative">
                        {editingId && (
                            <div className="absolute -top-10 left-0 bg-amber-500/10 text-amber-500 px-3 py-1 rounded text-sm font-medium flex items-center gap-2">
                                <Edit2 className="w-4 h-4" />
                                Editing Chapter
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="ml-2 hover:text-amber-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Chapter Info */}
                        <div className={cn(
                            "bg-zinc-900 rounded-xl border p-6 transition-colors",
                            editingId ? "border-amber-500/30" : "border-zinc-800"
                        )}>
                            <h2 className="text-lg font-semibold text-zinc-100 mb-6">
                                {editingId ? 'Edit Chapter Details' : 'New Chapter'}
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="sm:col-span-2">
                                    <FormField label="Chapter Name">
                                        <input
                                            type="text"
                                            value={chapterName}
                                            onChange={(e) => setChapterName(e.target.value)}
                                            placeholder="e.g. Build Up Your Chess 1 - Chapter 3"
                                            className="form-input"
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Date">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="form-input"
                                    />
                                </FormField>

                                <FormField label="Time (minutes)">
                                    <input
                                        type="number"
                                        value={timeMinutes}
                                        onChange={(e) => setTimeMinutes(parseInt(e.target.value) || 0)}
                                        className="form-input"
                                        min="0"
                                    />
                                </FormField>

                                <FormField label="Your Score">
                                    <input
                                        type="number"
                                        value={score}
                                        onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                                        className="form-input"
                                        min="0"
                                    />
                                </FormField>

                                <FormField label="Max Score">
                                    <input
                                        type="number"
                                        value={maxScore}
                                        onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
                                        className="form-input"
                                        min="1"
                                    />
                                </FormField>
                            </div>

                            {/* Result Display */}
                            <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">Calculated Result</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-2xl font-bold text-zinc-100">{percentage}%</span>
                                            <ResultBadge result={computedResult} size="lg" />
                                        </div>
                                    </div>

                                    {/* Manual Override */}
                                    <div>
                                        <p className="text-xs text-zinc-500 mb-2">Override Result</p>
                                        <select
                                            value={resultOverride || ''}
                                            onChange={(e) => setResultOverride(e.target.value as YusupovResult || null)}
                                            className="form-input text-sm"
                                        >
                                            <option value="">Auto</option>
                                            <option value="excellent">Excellent</option>
                                            <option value="good">Good</option>
                                            <option value="pass">Pass</option>
                                            <option value="fail">Fail</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="mt-6">
                                <FormField label="Notes (Optional)">
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Any observations about this chapter..."
                                        className="form-input min-h-[6rem] resize-none"
                                    />
                                </FormField>
                            </div>
                        </div>

                        {/* Blunder Prompt for Failed Chapters (New Only for simplicity, or complex edit logic) */}
                        {showBlunderPrompt && !editingId && (
                            <div className="mt-6 bg-zinc-900 rounded-xl border border-red-500/30 p-6">
                                <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Chapter Failed - Document What You Missed
                                </h2>
                                <p className="text-zinc-500 text-sm mb-4">
                                    This will be added to your Blunder Dungeon for review.
                                </p>
                                <FailureCard
                                    draft={blunderDraft}
                                    onImageUpload={(file) => {
                                        const reader = new FileReader();
                                        reader.onload = (e) => setBlunderDraft(prev => ({ ...prev, imageBase64: e.target?.result as string }));
                                        reader.readAsDataURL(file);
                                    }}
                                    onCalculationChange={(val) => setBlunderDraft(prev => ({ ...prev, calculation: val }))}
                                    onImageRemove={() => setBlunderDraft(prev => ({ ...prev, imageBase64: '' }))}
                                />
                            </div>
                        )}

                        {/* Errors */}
                        {errors.length > 0 && (
                            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
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
                            <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                                <p className="text-emerald-400">
                                    {editingId ? 'Chapter updated successfully!' : 'Chapter logged successfully!'}
                                </p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            className={cn(
                                "mt-6 w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all",
                                editingId
                                    ? "bg-amber-600 text-white hover:bg-amber-500"
                                    : "bg-purple-600 text-white hover:bg-purple-500"
                            )}
                        >
                            {editingId ? 'Update Chapter' : showBlunderPrompt ? 'Save Chapter & Add to Dungeon' : 'Save Chapter'}
                        </button>
                    </form>
                </div>

                {/* History List Side Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 sticky top-6">
                        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-zinc-400" />
                            Recent Chapters
                        </h2>

                        {pastChapters.length === 0 ? (
                            <p className="text-zinc-500 text-sm">No chapters saved yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {pastChapters.map((chapter) => (
                                    <button
                                        key={chapter.id}
                                        onClick={() => handleEdit(chapter)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg border transition-all hover:bg-zinc-800",
                                            editingId === chapter.id
                                                ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/30"
                                                : "bg-zinc-950/50 border-zinc-800"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-sm font-medium text-zinc-200 line-clamp-1" title={chapter.chapterName}>
                                                {chapter.chapterName}
                                            </h3>
                                            <span className="text-xs text-zinc-500 whitespace-nowrap">{chapter.date}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <ResultBadge result={chapter.result} />
                                            <div className="flex items-center gap-1 text-xs text-zinc-400">
                                                <Trophy className="w-3 h-3" />
                                                {chapter.score}/{chapter.maxScore}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
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

function ResultBadge({ result, size = 'sm' }: { result: string; size?: 'sm' | 'lg' }) {
    const colors: Record<string, string> = {
        excellent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        good: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        pass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        fail: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';

    return (
        <span className={`rounded border font-semibold uppercase ${colors[result] || 'bg-zinc-700 text-zinc-400'} ${sizeClasses}`}>
            {result}
        </span>
    );
}
