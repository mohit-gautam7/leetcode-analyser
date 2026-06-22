import type {
  Problem,
  UserCode,
  SubmissionResult,
  DebugType,
  InterviewStyle,
  SolutionLanguage,
} from '@/types';
import type { NimMessage } from './nvidia-nim';

const SYSTEM_PROMPT = `You are CodeSense AI, an expert competitive programming assistant.
You analyze coding problems with precision and depth.
CRITICAL RULE: When asked for JSON, respond with ONLY the raw JSON object — no markdown, no code fences, no explanation text before or after, no "Here is..." preamble. Just the JSON.
Think algorithmically and consider all edge cases.`;

function problemContext(problem: Problem): string {
  return `
PROBLEM: ${problem.title}
DIFFICULTY: ${problem.difficulty}
PLATFORM: ${problem.platform}

STATEMENT:
${problem.statement}

CONSTRAINTS:
${problem.constraints.join('\n')}

EXAMPLES:
${problem.examples.map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ''}`).join('\n\n')}

TAGS: ${problem.tags.join(', ')}
`.trim();
}

function codeContext(code: UserCode): string {
  return `
USER CODE (${code.language}):
\`\`\`${code.language}
${code.code}
\`\`\`
`.trim();
}

export const prompts = {
  analysis(problem: Problem, code?: UserCode): NimMessage[] {
    const hasCode = code && code.code.trim().length > 0;
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze this coding problem${hasCode ? ' and the user\'s actual code' : ''}.

${problemContext(problem)}
${hasCode ? '\n' + codeContext(code!) : ''}

${hasCode ? `IMPORTANT — Base your entire analysis on the USER'S ACTUAL CODE above:

COMPLEXITY ANALYSIS (be precise — this is the most important part):
- Identify every data structure used and its per-operation cost:
    std::map / std::set / std::multimap → O(log K) insert/lookup (BST)
    std::unordered_map / unordered_set → O(1) average insert/lookup (hash)
    std::vector → O(1) access, O(n) search
    std::priority_queue / std::heap → O(log n) push/pop
    std::sort → O(n log n)
- Multiply by loop iterations to get total time complexity.
- If a map/set is bounded by a constant (e.g. at most 26 chars, at most 10 digits), its contribution to space is O(1) and log factor may simplify.
- "currentComplexity.time": the exact big-O of the user's code as written (e.g. if they use std::map with n iterations: O(n log K))
- "currentComplexity.space": the exact auxiliary space (e.g. O(K) where K = distinct chars ≤ 26, which is O(1))
- "requiredComplexity": the theoretically best possible for this problem class
- Do NOT round O(n log K) to O(n) unless K is explicitly a fixed constant AND you state why

OTHER RULES:
- "approach": describe what the user's code is actually doing, not what the optimal approach would be in general
- "suggestions": ONLY suggest improvements to things the user has NOT already implemented. Read the code carefully — do not suggest implementing something that is clearly already there. Focus on edge cases, variable naming, minor optimizations, or alternative approaches they haven't tried.
- "codeQuality", "readability", "efficiency": score the actual code honestly (integer 0-100). Good working code should score 60-85. Only score below 40 if the code has serious issues.
- If the code is already a strong solution, acknowledge that genuinely and keep suggestions minor.` : ''}

Return ONLY this JSON object (no other text):
{"approach":"what the user's code does / what approach it uses","currentComplexity":{"time":"O(?) — e.g. O(n log K) for n iterations with std::map","space":"O(?) — e.g. O(K) = O(1) since K≤26","explanation":"step-by-step: loop n times × map op O(log K) = O(n log K); space: map holds ≤26 keys = O(1)"},"requiredComplexity":{"time":"O(?)","space":"O(?)","explanation":"why this is the theoretical minimum"},"codeQuality":${hasCode ? 72 : 0},"readability":${hasCode ? 68 : 0},"efficiency":${hasCode ? 65 : 0},"suggestions":["specific improvement based on actual code","another specific improvement or guiding question"],"algorithms":["DFS","DP"],"canOptimize":${hasCode ? 'true or false' : false},"optimizationSummary":"brief encouraging note on what could be better"}

Replace the example numbers (72, 68, 65) with your actual honest assessment of the code. canOptimize must be true or false (boolean). Fill in REAL complexity values, not the example strings above.`,
      },
    ];
  },

  help(problem: Problem, revealCount: number = 0): NimMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Generate ${3 + revealCount} progressive hints for this problem. Do NOT reveal the full solution.

${problemContext(problem)}

Return ONLY this JSON (no other text):
{"hints":["Hint 1 - very subtle observation","Hint 2 - more specific direction","Hint 3 - algorithm/technique hint"],"keyObservation":"The single key insight needed","dataStructure":"recommended data structure","algorithm":"algorithm paradigm e.g. Two Pointers, DP, BFS"}`,
      },
    ];
  },

  solution(problem: Problem, language: SolutionLanguage = 'python'): NimMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Provide a complete optimal solution for this problem, with working code in ALL of these languages: python, cpp, java, javascript, typescript, go, rust, c. The user's preferred language is ${language} — make sure that one especially is clean and idiomatic.
Explain clearly and completely, as if teaching the concept for the first time — don't skip steps, but don't pad with filler either.

${problemContext(problem)}

Return ONLY this JSON (no other text):
{"intuition":"why this approach works, explained clearly","approach":"step-by-step algorithm description","proof":"why this is optimal","dryRun":"walk through Example 1 step by step","complexity":{"time":"O(?)","space":"O(?)","explanation":"why"},"code":{"python":"COMPLETE PYTHON SOLUTION","cpp":"COMPLETE C++ SOLUTION","java":"COMPLETE JAVA SOLUTION","javascript":"COMPLETE JAVASCRIPT SOLUTION","typescript":"COMPLETE TYPESCRIPT SOLUTION","go":"COMPLETE GO SOLUTION","rust":"COMPLETE RUST SOLUTION","c":"COMPLETE C SOLUTION"}}`,
      },
    ];
  },

  optimization(problem: Problem, code: UserCode): NimMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Optimize this code for better time/space complexity.

${problemContext(problem)}

${codeContext(code)}

Return ONLY this JSON (no other text):
{"currentCode":"original code unchanged","optimizedCode":"fully optimized version","language":"${code.language}","beforeComplexity":{"time":"O(?)","space":"O(?)","explanation":"why"},"afterComplexity":{"time":"O(?)","space":"O(?)","explanation":"why faster"},"changes":[{"description":"what changed and why","impact":"time"}],"explanation":"overall optimization explanation"}`,
      },
    ];
  },

  debug(problem: Problem, code: UserCode, type: DebugType, submission?: SubmissionResult): NimMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Debug why this code gets ${type}.

${problemContext(problem)}

${codeContext(code)}
${submission ? `\nSubmission: ${submission.status} - ${submission.errorMessage ?? ''}` : ''}

Write "explanation" in a supportive, coaching tone — diagnose the bug clearly and precisely, but like a mentor helping someone learn, not a clinical error log.

Return ONLY this JSON (no other text):
{"type":"${type}","causes":["root cause 1","root cause 2"],"failingTestCase":"specific test input that triggers ${type}","suspiciousLines":[1,2],"explanation":"detailed, supportive explanation of the ${type} cause","fix":"corrected code snippet"}`,
      },
    ];
  },

  dryRun(problem: Problem, code: UserCode): NimMessage[] {
    const ex = problem.examples[0];
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Trace this exact code step-by-step on Example 1${ex ? ` (Input: ${ex.input}, Expected Output: ${ex.output})` : ''}.

${problemContext(problem)}

${codeContext(code)}

STEP 1 OF YOUR WORK (do this first, before writing anything else): solve the problem normally by fully reasoning through the algorithm on the given input to completion, and determine the ACTUAL correct return value. It must match the shape/type of the Expected Output above (e.g. if Expected Output is "[[2,2,3],[7]]", the answer must be a value of that same array-of-arrays shape — never collapse it into a single number or string of digits). Commit to this answer first.

STEP 2 OF YOUR WORK: show 8-20 key illustrative steps of the execution — be thorough, you have plenty of room. If the code is recursive/backtracking with many branches, show the first 2-3 branches in full detail, then summarize the remaining branches — but the step narration must never change or contradict the answer you already committed to in Step 1.

Return ONLY this JSON (no other text), with "finalAnswer" written FIRST since it's already decided:
{"finalAnswer":"the actual correct output from Step 1, matching Expected Output's shape exactly","steps":[{"step":1,"description":"what happens","variables":{"varName":"value"},"callStack":[],"highlight":"key insight"}],"dpTable":null,"recursionTree":null}`,
      },
    ];
  },

  editorial(problem: Problem): NimMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Write an official editorial for this problem in the style of Codeforces/LeetCode editorials.

${problemContext(problem)}

Return ONLY this JSON (no other text):
{"observation":"key observations about the problem","insight":"the key insight that unlocks the solution","proof":"mathematical/logical proof of correctness","approach":"detailed step-by-step algorithmic approach","complexity":{"time":"O(?)","space":"O(?)","explanation":"why"},"code":"complete Python solution code","language":"python","followUp":["follow-up question 1","follow-up question 2"]}`,
      },
    ];
  },

  interview(problem: Problem, style: InterviewStyle, code?: UserCode): NimMessage[] {
    const styleDesc: Record<InterviewStyle, string> = {
      google: 'Google (scalability, clean code, edge cases, optimize further)',
      meta: 'Meta (product thinking, practical solutions, real-world follow-ups)',
      amazon: 'Amazon (Leadership Principles, customer impact, trade-offs)',
      microsoft: 'Microsoft (correctness, maintainability, collaborative thinking)',
      apple: 'Apple (elegance, performance, attention to detail)',
    };
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Conduct a ${styleDesc[style]} coding interview for this problem.

${problemContext(problem)}
${code ? '\n' + codeContext(code) : ''}

${code ? 'Open "feedback" with genuine encouragement when warranted, like a real interviewer would, before pointing out gaps. ' : ''}At least one of the "questions" should be Socratic/leading — guide the user toward the next insight rather than just asking a direct question.

Return ONLY this JSON (no other text):
{"style":"${style}","feedback":${code ? '"feedback on the code approach, encouraging tone"' : 'null'},"questions":[{"question":"interview question","type":"followup","hint":"optional hint"},{"question":"a leading/Socratic question","type":"edge-case","hint":""}],"score":${code ? 75 : 'null'},"improvements":${code ? '["improvement 1","improvement 2"]' : 'null'}}`,
      },
    ];
  },

  similarProblems(problem: Problem): NimMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Suggest similar problems to practice after solving this one.

${problemContext(problem)}

Return ONLY this JSON (no other text):
{"easy":[{"title":"Problem name","platform":"leetcode","difficulty":"Easy","reason":"why similar"}],"medium":[{"title":"Problem name","platform":"leetcode","difficulty":"Medium","reason":"why similar"}],"hard":[{"title":"Problem name","platform":"codeforces","difficulty":"Hard","reason":"why harder/similar"}]}`,
      },
    ];
  },

  chat(problem: Problem, question: string, history: Array<{ role: 'user' | 'assistant'; content: string }>, code?: UserCode): NimMessage[] {
    const messages: NimMessage[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}

You are in a Q&A chat session. The user is working on a coding problem.
Be helpful but don't give away the solution unless explicitly asked.
Keep responses concise and educational.`,
      },
      {
        role: 'user',
        content: `Context:\n${problemContext(problem)}\n${code ? codeContext(code) : ''}`,
      },
      { role: 'assistant', content: "I've reviewed the problem. Ask me anything!" },
    ];

    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: question });
    return messages;
  },

  submissionAnalysis(problem: Problem, code: UserCode, result: SubmissionResult): NimMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze this submission result and provide improvement suggestions.

${problemContext(problem)}
${codeContext(code)}

SUBMISSION RESULT:
Status: ${result.status}
Runtime: ${result.runtime ?? 'N/A'}
Memory: ${result.memory ?? 'N/A'}
${result.errorMessage ? `Error: ${result.errorMessage}` : ''}

Return JSON:
{
  "summary": "What happened",
  "issues": ["List of identified issues"],
  "suggestions": ["How to improve"],
  "complexity": { "time": "Current complexity", "space": "Current space" },
  "betterApproach": "If AC but not optimal, describe a better approach"
}`,
      },
    ];
  },
};
