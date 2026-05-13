import { useState, useRef, useEffect } from 'react';
import { useAppStore, useChatHistory, useApiKey, useLichessSessions, useBlunders, useYusupovChapters, useGames } from '../lib/store';
import { cn } from '../lib/utils';
import { Send, Settings, Trash2, AlertCircle, User, Bot, Loader2, BrainCircuit, Volume2, VolumeX } from 'lucide-react';
import { ChessCoachGraph } from '../lib/agentGraph';
import { useVoiceOutput } from '../lib/useVoiceOutput';

export function AICoach() {
    const chatHistory = useChatHistory();
    const apiKey = useApiKey();
    const addMessage = useAppStore((s) => s.addChatMessage);
    const clearHistory = useAppStore((s) => s.clearChatHistory);
    const setApiKey = useAppStore((s) => s.setApiKey);
    const userId = useAppStore((s) => s.userId);

    // Data Context
    const sessions = useLichessSessions();
    const blunders = useBlunders();
    const chapters = useYusupovChapters();
    const games = useGames();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoSpeak, setAutoSpeak] = useState(false);

    // Voice Output Hook
    const { speak, stop, isSpeaking, isSupported: voiceSupported } = useVoiceOutput({ rate: 1.0, lang: 'es-ES' });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-set the key provided by the user if none exists
    useEffect(() => {
        if (!apiKey) {
            const envKey = import.meta.env.VITE_GOOGLE_API_KEY;
            if (envKey) {
                setApiKey(envKey);
            }
        }
    }, [apiKey, setApiKey]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        if (!apiKey) {
            setError('Please configure your API key in settings');
            setShowSettings(true);
            return;
        }


        const userMessage = input.trim();
        setInput('');
        setError(null);

        // Add user message to history
        addMessage({ role: 'user', content: userMessage });

        setIsLoading(true);

        try {
            // Prepare Context
            const context = {
                recentSessions: sessions.slice(0, 10), // Take top 10 (already sorted by newest)
                recentBlunders: blunders.slice(0, 10),
                recentChapters: chapters.slice(0, 5),
                recentGames: games.slice(0, 5)
            };

            // Instantiate Graph Agent with Rich Context
            const graph = new ChessCoachGraph(userId, apiKey, chatHistory, context);

            // Invoke the agent
            const result = await graph.invoke(userMessage);

            if (!result.response) {
                throw new Error('No response from AI Coach');
            }

            // Add response to chat
            addMessage({ role: 'assistant', content: result.response });

            // Auto-speak if enabled
            if (autoSpeak && result.response) {
                speak(result.response);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to get response');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Filter out system messages for display
    const displayMessages = chatHistory.filter(m => m.role !== 'system');

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                        <BrainCircuit className="w-8 h-8 text-amber-500" />
                        AI Coach
                    </h1>
                    <p className="text-zinc-400 mt-1">Powered by Agent Memory</p>
                </div>

                <div className="flex gap-2">
                    {/* Voice Toggle */}
                    {voiceSupported && (
                        <button
                            onClick={() => {
                                if (isSpeaking) {
                                    stop();
                                } else {
                                    setAutoSpeak(!autoSpeak);
                                }
                            }}
                            className={cn(
                                "p-2 rounded-lg transition-colors cursor-pointer",
                                isSpeaking
                                    ? "bg-red-500/20 text-red-400 animate-pulse"
                                    : autoSpeak
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                            )}
                            title={isSpeaking ? "Stop speaking" : autoSpeak ? "Voice on" : "Voice off"}
                        >
                            {isSpeaking || autoSpeak ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                            "p-2 rounded-lg transition-colors cursor-pointer",
                            showSettings ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                        )}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button
                        onClick={clearHistory}
                        className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="glass-card p-4 mb-4 animate-fade-in-up">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-zinc-400 whitespace-nowrap">Google API Key:</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIza..."
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500/50"
                        />
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <span className="text-sm text-zinc-400">Auto-speak coach responses</span>
                        <button
                            onClick={() => setAutoSpeak(!autoSpeak)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                                autoSpeak
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-zinc-800 text-zinc-500"
                            )}
                        >
                            {autoSpeak ? "Enabled" : "Disabled"}
                        </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">Your key is stored locally and never sent to our servers.</p>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {displayMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <Bot className="w-16 h-16 text-zinc-700 mb-4" />
                            <h3 className="text-lg font-semibold text-zinc-400">GM Caissa is ready</h3>
                            <p className="text-sm text-zinc-500 mt-2 max-w-md">
                                Ask for analysis of your recent training, pattern identification in your blunders,
                                or specific tactical advice based on your progress.
                            </p>
                        </div>
                    ) : (
                        displayMessages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))
                    )}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex items-center gap-3 p-4">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                            </div>
                            <span className="text-zinc-400 text-sm">GM Caissa is thinking...</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-4 mb-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-400">{error}</span>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-zinc-800">
                    <div className="flex gap-3">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask GM Caissa for advice..."
                            rows={1}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 resize-none outline-none focus:border-amber-500/50 transition-colors"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={cn(
                                "px-6 rounded-xl font-medium transition-all flex items-center gap-2",
                                input.trim() && !isLoading
                                    ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            )}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageBubble({ message }: { message: any }) {
    const isUser = message.role === 'user';

    return (
        <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
            {/* Avatar */}
            <div className={cn(
                "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
                isUser ? "bg-blue-500/20" : "bg-amber-500/20"
            )}>
                {isUser ? (
                    <User className="w-4 h-4 text-blue-400" />
                ) : (
                    <Bot className="w-4 h-4 text-amber-400" />
                )}
            </div>

            {/* Content */}
            <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                isUser
                    ? "bg-blue-600/20 border border-blue-500/30"
                    : "bg-zinc-800 border border-zinc-700"
            )}>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {message.content}
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                </p>
            </div>
        </div>
    );
}
