import { Chess } from 'chess.js';

interface EngineAnalysis {
    depth: number;
    score: number; // Centipawns (positive = white advantage)
    bestMove: string;
    pv: string; // Principal variation
    mateIn?: number; // If mate is found
}

type AnalysisCallback = (info: EngineAnalysis) => void;

class ChessEngineService {
    private worker: Worker | null = null;
    private isReady: boolean = false;
    private currentCallback: AnalysisCallback | null = null;



    constructor() {
        this.initWorker();
    }

    private initWorker() {
        if (typeof window === 'undefined') return;

        // Use standard Worker constructor
        this.worker = new Worker(new URL('../workers/stockfish.worker.ts', import.meta.url), {
            type: 'module' // Important for Vite to bundle imports if any, though we use importScripts inside
        });

        this.worker.onmessage = (e) => {
            const { type, line, error } = e.data;

            if (type === 'init_success') {
                console.log('Stockfish Engine Ready');
                this.isReady = true;
            } else if (type === 'error') {
                console.error('Stockfish Engine Error:', error);
            } else if (type === 'info') {
                this.parseInfoLine(line);
            }
        };

        this.worker.postMessage({ type: 'init' });
    }

    private parseInfoLine(line: string) {
        // Example: info depth 10 seldepth 15 multipv 1 score cp 45 nodes 1234 nps 45678 pv e2e4 e7e5

        try {
            const depthMatch = line.match(/depth (\d+)/);
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const bestMoveMatch = line.match(/pv (\w+)/); // First move of PV
            const pvMatch = line.match(/pv (.+)/);

            const analysis: EngineAnalysis = {
                depth: depthMatch ? parseInt(depthMatch[1]) : 0,
                score: 0,
                bestMove: bestMoveMatch ? bestMoveMatch[1] : '',
                pv: pvMatch ? pvMatch[1] : ''
            };

            if (mateMatch) {
                analysis.mateIn = parseInt(mateMatch[1]);
                analysis.score = analysis.mateIn > 0 ? 10000 : -10000; // Force distinct value
            } else if (cpMatch) {
                analysis.score = parseInt(cpMatch[1]);
            }



            // Notify caller if they are listening to stream
            if (this.currentCallback) {
                this.currentCallback(analysis);
            }

        } catch (e) {
            console.warn("Failed to parse engine line:", line);
        }
    }

    public async evaluatePosition(fen: string, depth = 15): Promise<EngineAnalysis> {
        if (!this.worker || !this.isReady) {
            // Wait/retry or throw
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (!this.isReady) throw new Error("Engine not ready");
        }

        return new Promise((resolve) => {
            // We set a callback meant for the 'final' result (best depth)
            // But UCI is streaming. We'll listen for a specific depth or wait for 'bestmove' (handled in worker)
            // A simpler way for this helper: Return the LAST info we got before the 'bestmove' signal.
            // But since my worker doesn't forward 'bestmove' to me as a distinct event yet (it does internally), 
            // I'll update the worker interface or just return the deepest info we get after X seconds.

            // Allow streaming updates

            // Set up a temporary listener for this request
            this.currentCallback = (analysis) => {
                if (analysis.depth >= depth) {
                    this.currentCallback = null; // Stop listening
                    resolve(analysis);
                }
            };

            this.worker?.postMessage({ type: 'evaluate', fen, depth });
        });
    }

    public async analyzeGame(pgn: string): Promise<any[]> {
        const chess = new Chess();
        chess.loadPgn(pgn);
        const history = chess.history({ verbose: true });

        const evaluations = [];

        // Iterate moves, replay game
        const tempChess = new Chess();
        for (const move of history) {
            tempChess.move(move);
            const fen = tempChess.fen();

            // Analyze this position
            const evalResult = await this.evaluatePosition(fen, 12); // Reduced depth for speed?

            evaluations.push({
                move: move.san,
                fen,
                score: evalResult.score,
                mateIn: evalResult.mateIn,
                bestMove: evalResult.bestMove
            });
        }

        return evaluations;
    }
}

export const chessEngine = new ChessEngineService();
