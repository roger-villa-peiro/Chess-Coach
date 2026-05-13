// ============================================================================
// EXPERT KNOWLEDGE BASE (Extracted from NotebookLM: Táctica Ajedrez)
// ============================================================================
export const TACTICAL_KNOWLEDGE_BASE = `
## EXPERT TRAINING METHODOLOGIES

### The Woodpecker Method (Smith & Tikkanen)
- **Process**: Select a set of exercises (e.g., 1000 problems). First cycle: solve prioritizing accuracy (may take weeks). Subsequent cycles (up to 7): repeat the same problems, aiming to halve total time each iteration.
- **Goal**: Develop automaticity (System 1 thinking). Final target: solve the entire set in one day (~8 hours) with near 100% accuracy.
- **Philosophy**: Emulates language learning or cycling - conscious processes become unconscious pattern recognition.

### Jacob Aagaard's Three Questions
Before calculating, ALWAYS ask:
1. What are the weaknesses in the position?
2. Which piece is worst placed?
3. What is the opponent's plan?

### Aagaard's Writing Method
- Solve complex positions WITHOUT moving pieces
- WRITE the main variations and final evaluation
- If you miss the refutation, the exercise counts as FAILED
- This builds deep calculation discipline

### Shankland's Rule
Never dismiss forced or tempting variations that "seem not to work" at first glance. You must WORK TO MAKE THEM WORK through deep calculation.

### RB Ramesh Visualization Method
- Training must be HARDER than the game
- Absolute prohibition on moving pieces during solving
- Work backward from mating patterns
- Train blindfold solving for pure visualization

## TACTICAL MOTIFS (Must Be Automatic)

### The 5 Most Common Tactical Patterns
1. **Double Attacks / Forks** - One piece attacks two targets simultaneously
2. **Pins** - Immobilize a piece because moving it exposes a more valuable piece
3. **Removing the Defender** - Capture, deflect, or threaten the piece protecting a key target
4. **Discovered Attacks** - Move one piece to unleash an attack from a piece behind it
5. **Tempo Moves** - Gain time with forcing threats that require passive defense

### Advanced Themes
- **Deflection & Attraction** - Force pieces to unfavorable squares
- **Hanging & Trapped Pieces** - Exploit undefended or cornered pieces
- **Back Rank Mate** - Classic weakness on the first/eighth rank
- **Zwischenzug** - Intermediate moves that change the sequence
- **Prophylaxis** - Prevent opponent's plans BEFORE they happen (crucial for 2000+)
- **Active Defense** - Seek counterattacks instead of passive automatic defense

## COMMON MISTAKES (1500-2000 PLAYERS)

### Study Imbalances
- Only playing without studying OR studying without practicing
- Spending all time on puzzles, ignoring strategy and endgames
- Not analyzing your own games → repeating the same errors

### Calculation Weaknesses
- "Guessing" moves instead of calculating deeply (false confidence)
- Collapsing in bad positions instead of offering tenacious resistance
- Superficial candidate move evaluation

### Conversion Problems (1800-2000)
- Cannot convert winning positions
- Don't anticipate opponent's plans
- Don't know when to exchange pieces

### Online to OTB Transition
- Struggling with 3D pieces after learning online
- Worse time management without visual clocks
- Tactical blunders due to unfamiliarity

## STUDY RECOMMENDATIONS BY RATING

### For 1500-1800 Players
- **Tactics**: Chess Tactics From Scratch (Weteschnik)
- **Strategy**: Simple Chess (Stean), How to Reassess Your Chess (Silman)
- **Focus**: Basic pattern recognition, simple endgames, opening principles

### For 1800-2000 Players
- **Tactics**: Think Like a Super-GM (Adams)
- **Strategy**: Art of Attack in Chess (Vukovic)
- **Focus**: Deep calculation, prophylaxis, converting advantages

### For 2000+ Players
- **Series**: Yusupov's "Build Up Your Chess" (complete 9-book series)
- **Method**: Woodpecker Method with advanced problem sets
- **Focus**: Precise evaluation, candidate moves, strategic planning

## THE YUSUPOV METHOD
- Systematic 9-book series covering all chess phases
- Spaced repetition for long-term pattern retention
- Active work required (not passive reading)
- Simulates real game decision-making
- Includes self-evaluation with scoring system:
  * ≥90% = Excellent
  * ≥75% = Good
  * ≥60% = Pass
  * <60% = Fail (requires review)

## OPENING STUDY PRINCIPLES
- Don't memorize variations blindly - understand IDEAS behind moves
- Study complete games in your openings, not just first 15 moves
- Know the typical middlegame plans and pawn structures
- Limit repertoire to 1-2 systems per color for depth over breadth

## ENDGAME PRIORITIES
1. **King & Pawn endings** (fundamentals for everything else)
2. **Rook endings** (most common in practice)
3. **Basic piece mates** (B+N, etc.)
4. **Opposite-colored bishop endings** (drawing techniques)

## MENTAL TRAINING
- **Discipline over motivation** - Train daily even for 15 minutes
- **Process over rating** - Focus on improvement, not numbers
- **Manage tilt** - Control emotions after losses
- **Blindfold training** - Solve problems without a physical board
`;
