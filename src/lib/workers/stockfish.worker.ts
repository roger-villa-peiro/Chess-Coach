/// <reference lib="webworker" />

declare var Stockfish: () => any;

let engine: any = null;
let currentResolve: ((value: any) => void) | null = null;
let isReady = false;

// Initialize the engine
function initEngine() {
    try {
        // Load the script from the public folder
        // We use stockfish.wasm.js for better performance if possible, fallback logic is handled by the lib usually,
        // but explicit loading is safer for this setup.
        importScripts('/stockfish/stockfish.wasm.js');

        if (typeof Stockfish === 'function') {
            engine = Stockfish();

            engine.addMessageListener((line: string) => {
                // console.log('Engine Line:', line); // Debugging

                if (line === 'uciok') {
                    isReady = true;
                    postMessage({ type: 'init_success' });
                }

                if (currentResolve) {
                    // Check if analysis is done or we have the info we need
                    // For now, we'll listen for "bestmove" to signal end of search
                    if (line.startsWith('bestmove')) {
                        // The 'info' lines before this contained the eval.
                        // We rely on the message parsing logic below to capture the last info.
                        currentResolve(null); // Signal completion of command
                        currentResolve = null;
                    }
                }

                // Parse "info depth X ... score cp Y ..."
                if (line.startsWith('info depth') && line.includes('score')) {
                    postMessage({ type: 'info', line });
                }
            });

            engine.postMessage('uci');
        } else {
            postMessage({ type: 'error', error: 'Stockfish failed to load' });
        }
    } catch (e: any) {
        postMessage({ type: 'error', error: e.message });
    }
}

self.onmessage = (e: MessageEvent) => {
    const { type, data } = e.data;

    if (type === 'init') {
        initEngine();
    }

    else if (type === 'evaluate') {
        if (!engine || !isReady) {
            postMessage({ type: 'error', error: 'Engine not ready' });
            return;
        }

        const { fen, depth } = data;
        engine.postMessage(`position fen ${fen}`);
        engine.postMessage(`go depth ${depth || 15}`);
    }

    else if (type === 'stop') {
        if (engine) engine.postMessage('stop');
    }
};
