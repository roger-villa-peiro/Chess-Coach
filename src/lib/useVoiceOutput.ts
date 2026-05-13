import { useState, useRef, useCallback } from 'react';

interface VoiceOutputOptions {
    rate?: number;      // 0.1 to 10
    pitch?: number;     // 0 to 2
    volume?: number;    // 0 to 1
    voice?: 'male' | 'female';
    lang?: string;
}

export function useVoiceOutput(options: VoiceOutputOptions = {}) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported] = useState(() => 'speechSynthesis' in window);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const speak = useCallback((text: string) => {
        if (!isSupported || !text.trim()) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        // Apply options
        utterance.rate = options.rate ?? 1.0;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 0.9;
        utterance.lang = options.lang ?? 'es-ES';

        // Try to select a voice matching preference
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            // Prefer Spanish voices
            const spanishVoice = voices.find(v => v.lang.startsWith('es'));
            if (spanishVoice) {
                utterance.voice = spanishVoice;
            }
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [isSupported, options]);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    const toggle = useCallback((text?: string) => {
        if (isSpeaking) {
            stop();
        } else if (text) {
            speak(text);
        }
    }, [isSpeaking, speak, stop]);

    return {
        speak,
        stop,
        toggle,
        isSpeaking,
        isSupported
    };
}
