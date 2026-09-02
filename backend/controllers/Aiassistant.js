// --- Token-saving measures ---
// 1. Stateless — no conversation history is stored or resent, so every
//    request is exactly one prompt, never a growing thread.
// 2. Explicit trigger only (button click), never automatic.
// 3. Code input is capped in length before it's ever sent.
// 4. maxOutputTokens is capped — enough for a real explanation/review,
//    not unlimited.
const MAX_CODE_CHARS = 4000;
const MAX_QUESTION_CHARS = 1000;

const MODES = {
    EXPLAIN: (code) =>
        `Explain what this code does. Be clear and concise, step by step where helpful. Plain text only, no markdown.\n\nCode:\n${code}`,
    REVIEW: (code) =>
        `Review this code for bugs, style issues, and possible improvements. Be specific and concise. Plain text only, no markdown.\n\nCode:\n${code}`,
    CHAT: (code, question) =>
        code
            ? `Answer this question about the code below. Be concise. Plain text only, no markdown.\n\nQuestion: ${question}\n\nCode:\n${code}`
            : `Answer this coding question concisely. Plain text only, no markdown.\n\nQuestion: ${question}`
};

exports.ask = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'AI assistant is not configured on the server.' });
        }

        const { mode, code, question } = req.body;
        if (!MODES[mode]) {
            return res.status(400).json({ error: 'Invalid mode. Use EXPLAIN, REVIEW, or CHAT.' });
        }

        const trimmedCode = (code || '').slice(0, MAX_CODE_CHARS);
        const trimmedQuestion = (question || '').slice(0, MAX_QUESTION_CHARS);

        if ((mode === 'EXPLAIN' || mode === 'REVIEW') && !trimmedCode.trim()) {
            return res.status(400).json({ error: 'Paste some code first.' });
        }
        if (mode === 'CHAT' && !trimmedQuestion.trim()) {
            return res.status(400).json({ error: 'Type a question first.' });
        }

        const promptText = MODES[mode](trimmedCode, trimmedQuestion);

        const aiResponse = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: { maxOutputTokens: 600 }
                })
            }
        );

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error('AI assistant error:', errText);
            return res.status(502).json({ error: 'Failed to get a response from the AI service.' });
        }

        const data = await aiResponse.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!answer) {
            return res.status(502).json({ error: 'The AI service returned an empty response.' });
        }

        res.json({ answer });
    } catch (error) {
        console.error('Error in AI assistant:', error);
        res.status(500).json({ error: 'Failed to get a response' });
    }
};