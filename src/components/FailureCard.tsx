import { useRef, useCallback } from 'react'; // Added useCallback
import { Upload, Mic, Loader2, Trash2, RefreshCw } from 'lucide-react'; // Added Mic icons
import { useVoiceInput } from '../lib/useVoiceInput'; // Imported hook
import { parseSpanishVoiceToSAN } from '../lib/parseChessVoice';
import { cn } from '../lib/utils'; // Imported cn

export interface BlunderDraft {
    id?: string;
    imageBase64: string;
    calculation: string;
}

export function FailureCard({
    index,
    draft,
    onImageUpload,
    onImageRemove,
    onCalculationChange
}: {
    index?: number;
    draft: BlunderDraft;
    onImageUpload: (file: File) => void;
    onImageRemove: () => void;
    onCalculationChange: (value: string) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Voice Input Handler
    const handleVoiceResult = useCallback((text: string) => {
        const parsedText = parseSpanishVoiceToSAN(text);
        // Append text with a space if needed
        const newText = draft.calculation ? `${draft.calculation} ${parsedText}` : parsedText;
        onCalculationChange(newText);
    }, [draft.calculation, onCalculationChange]);

    const { isListening, start, stop, error: voiceError } = useVoiceInput(handleVoiceResult);

    const toggleVoice = () => {
        if (isListening) {
            stop();
        } else {
            start();
        }
    };

    return (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-center gap-2 mb-4">
                {index !== undefined && (
                    <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                    </span>
                )}
                <span className="text-sm font-medium text-zinc-300">
                    {index !== undefined ? `Failure #${index + 1}` : 'Blunder Details'}
                </span>
                {voiceError && <span className="text-xs text-red-400 ml-2">Mic Error: {voiceError}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Upload */}
                <div>
                    <p className="text-xs text-zinc-500 mb-2">Position Screenshot (Optional)</p>
                    {draft.imageBase64 ? (
                        <div className="relative group">
                            <img
                                src={draft.imageBase64}
                                alt={index !== undefined ? `Failure ${index + 1}` : 'Blunder'}
                                className="w-full h-40 object-contain bg-zinc-900 rounded-lg border border-zinc-700"
                            />
                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg backdrop-blur-[2px]">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg flex items-center gap-2"
                                    title="Replace Image"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span className="text-xs font-bold">Replace</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onImageRemove}
                                    className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg flex items-center gap-2"
                                    title="Remove Image"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="text-xs font-bold">Remove</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-40 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                            <Upload className="w-6 h-6 mb-2" />
                            <span className="text-sm">Upload Screenshot</span>
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])}
                        className="hidden"
                    />
                </div>

                {/* Calculation Notes */}
                <div className="flex flex-col relative">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-zinc-500">What did you miss? (Required)</p>
                        <button
                            type="button"
                            onClick={toggleVoice}
                            className={cn(
                                "p-1.5 rounded-md transition-colors flex items-center gap-1.5",
                                isListening
                                    ? "bg-red-500/20 text-red-400 animate-pulse"
                                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                            )}
                            title="Dictate with voice"
                        >
                            {isListening ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span className="text-xs font-medium">Listening...</span>
                                </>
                            ) : (
                                <>
                                    <Mic className="w-3.5 h-3.5" />
                                    <span className="text-xs">Dictate</span>
                                </>
                            )}
                        </button>
                    </div>

                    <textarea
                        value={draft.calculation}
                        onChange={(e) => onCalculationChange(e.target.value)}
                        placeholder="Describe your thought process and what you overlooked..."
                        className="flex-1 min-h-[8rem] bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-100 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

