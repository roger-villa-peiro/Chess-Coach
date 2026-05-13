export function parseSpanishVoiceToSAN(text: string): string {
    let s = text.toLowerCase();

    // 1. Convert spelled-out numbers first so "de seis" becomes "de 6"
    const numbers: Record<string, string> = {
        'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
        'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8'
    };
    for (const [word, digit] of Object.entries(numbers)) {
        s = s.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    }

    // 2. Remove dashes between letters and numbers (e.g. e-6 -> e6)
    s = s.replace(/([a-h])\s*[-]\s*([1-8])/g, '$1$2');

    // 3. Convert spelled-out letters
    // "efe" -> f, "ce" -> c, "be" -> b, "ge" -> g, "hache" -> h
    s = s.replace(/\befe\b/g, 'f');
    s = s.replace(/\bce\b/g, 'c');
    s = s.replace(/\bge\b/g, 'g');
    s = s.replace(/\bhache\b/g, 'h');
    s = s.replace(/\bbe\b/g, 'b');

    // 'de' is tricky. If followed by a number (like 'de 6'), it's a file letter.
    s = s.replace(/\bde\s*([1-8])\b/g, 'd$1');
    // If followed by 'por' (e.g. 'de por e5'), it's a file letter.
    s = s.replace(/\bde\s+por\b/g, 'd por');
    // For specific user fix where "de 6" might actually mean "e6" due to speech rec error:
    // Actually, "caballo de seis" meaning "Ce6" is very specific. 
    // Let's replace standalone "de" when not followed by number/por as empty (it's a preposition).
    s = s.replace(/\bde\b/g, ''); // "peon de rey" -> "peon rey". "caballo de f3" -> "caballo f3"

    // 4. Convert pieces
    const pieces: Record<string, string> = {
        'rey': 'R', 'reina': 'D', 'dama': 'D', 'torre': 'T', 'alfil': 'A', 'caballo': 'C', 'peon': ''
    };
    for (const [word, letter] of Object.entries(pieces)) {
        s = s.replace(new RegExp(`\\b${word}\\bs?`, 'g'), letter);
    }

    // 5. Captures and checks
    s = s.replace(/\bpor\b/g, 'x');
    s = s.replace(/\bjaque\b/g, '+');
    s = s.replace(/\bjaque mate\b/g, '#');
    s = s.replace(/\bmate\b/g, '#');

    // 6. Castling
    s = s.replace(/\benroque corto\b/g, 'O-O');
    s = s.replace(/\benroque largo\b/g, 'O-O-O');

    // Clean up spaces
    // Remove spaces after Piece (R, D, T, A, C)
    s = s.replace(/([RDTAC])\s+/g, '$1');

    // Remove spaces around 'x'
    s = s.replace(/\s*x\s*/g, 'x');

    // Remove spaces between file and rank
    s = s.replace(/([a-h])\s+([1-8])/g, '$1$2');

    // Collapse multiple spaces
    s = s.replace(/\s+/g, ' ').trim();

    return s;
}

const test1 = "caballo de seis Efe por E6 alfil por E-6 torre F-7 alfil por D7 torre por F6 alfil por C8";
console.log("Original:", test1);
console.log("Result:", parseSpanishVoiceToSAN(test1));

