// removed unused import

const LICHESS_API_URL = 'https://lichess.org/api';
const CLIENT_ID = import.meta.env.VITE_LICHESS_CLIENT_ID || 'chess-tactics-suite'; // Fallback for dev, should be set in .env
const REDIRECT_URI = window.location.origin; // e.g. http://localhost:5173

// ============================================================================
// Types
// ============================================================================

export interface LichessUser {
    id: string;
    username: string;
    perfs: {
        puzzle: {
            games: number;
            rating: number;
            rd: number;
            prog: number;
        };
    };
}

export interface LichessPuzzleActivity {
    date: number; // timestamp
    win: boolean;
    puzzle: {
        id: string;
        rating: number;
        fen: string;
        solution: string[];
    };
}

// ============================================================================
// OAuth PKCE Helpers
// ============================================================================

function generateRandomString(length: number) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = crypto.getRandomValues(new Uint8Array(length));
    for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }
    return result;
}

async function sha256(plain: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return hash;
}

function base64UrlEncode(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// ============================================================================
// OAuth Calls
// ============================================================================

export async function initiateLogin() {
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(96);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(hashed);

    // Store verifier locally for the callback
    localStorage.setItem('lichess_oauth_state', state);
    localStorage.setItem('lichess_code_verifier', codeVerifier);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        state: state,
        scope: 'puzzle:read' // Minimal scope needed
    });

    window.location.href = `https://lichess.org/oauth?${params.toString()}`;
}

export async function handleCallback(code: string, state: string) {
    const storedState = localStorage.getItem('lichess_oauth_state');
    const codeVerifier = localStorage.getItem('lichess_code_verifier');

    if (state !== storedState) {
        throw new Error('State mismatch during OAuth callback');
    }
    if (!codeVerifier) {
        throw new Error('Code verifier missing');
    }

    // Exchange code for token
    const response = await fetch('https://lichess.org/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            code_verifier: codeVerifier,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Failed to exchange token');
    }

    const data = await response.json();

    // Clean up
    localStorage.removeItem('lichess_oauth_state');
    localStorage.removeItem('lichess_code_verifier');

    return data.access_token as string;
}

// ============================================================================
// API Calls
// ============================================================================

export async function fetchUserProfile(token: string): Promise<LichessUser> {
    const response = await fetch(`${LICHESS_API_URL}/account`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
}

/**
 * Fetches puzzle history. Note: This endpoint returns NDJSON (newline delimited JSON).
 */
export async function fetchPuzzleActivity(token: string, max = 50): Promise<LichessPuzzleActivity[]> {
    const response = await fetch(`${LICHESS_API_URL}/puzzle/activity?max=${max}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error('Failed to fetch puzzle activity');

    const text = await response.text();
    const cleanText = text.trim();
    if (!cleanText) return [];

    return cleanText.split('\n').map(line => {
        try {
            return JSON.parse(line);
        } catch (e) {
            console.warn('Failed to parse puzzle activity line:', line);
            return null;
        }
    }).filter(x => x !== null) as LichessPuzzleActivity[];
}
