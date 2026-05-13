
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

interface GeminiError extends Error {
    status?: number;
    statusText?: string;
}

/**
 * Delays execution for a specified number of milliseconds.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls the Gemini API with exponential backoff retry logic.
 * Handles 503 (Service Unavailable) and 429 (Too Many Requests).
 */
export async function callGeminiWithRetry(
    url: string,
    body: any,
    signal?: AbortSignal
): Promise<any> {
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
        try {
            const init: RequestInit = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            };

            if (signal) {
                init.signal = signal;
            }

            const response = await fetch(url, init);

            if (response.ok) {
                return await response.json();
            }

            // If it's a retryable error (503 or 429)
            if (response.status === 503 || response.status === 429) {
                const errorBody = await response.text();
                console.warn(`[Gemini Service] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed with ${response.status}: ${errorBody}`);

                if (attempt < MAX_RETRIES) {
                    // Exponential backoff: 1s, 2s, 4s...
                    const waitTime = INITIAL_DELAY * Math.pow(2, attempt);
                    console.log(`[Gemini Service] Retrying in ${waitTime}ms...`);
                    await delay(waitTime);
                    attempt++;
                    continue;
                }
            }

            // If not retryable or retries exhausted, throw error
            const errorBody = await response.text();
            const error = new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorBody}`) as GeminiError;
            error.status = response.status;
            throw error;

        } catch (error: any) {
            // Check if it was aborted
            if (error.name === 'AbortError') {
                throw error;
            }

            // Network errors (fetch throws) might be transient, retry unless aborted
            if (attempt < MAX_RETRIES) {
                console.warn(`[Gemini Service] Network error on attempt ${attempt + 1}:`, error);
                const waitTime = INITIAL_DELAY * Math.pow(2, attempt);
                await delay(waitTime);
                attempt++;
                continue;
            }

            throw error;
        }
    }
}
