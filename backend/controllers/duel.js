const { Op } = require('sequelize');
const Duel = require('../models/Duel');
const DuelQuestion = require('../models/DuelQuestion');
const DuelSubmission = require('../models/DuelSubmission');
const Notification = require('../models/Notification');
const User = require('../models/User');

// =================================================================
// HARDCODED QUESTION BANK
// Mirrors the pattern already used in routes/quiz.js — questions live
// directly in code, no DB table, no seeding step for anyone to forget.
// 10 per language, each testing execution order or spotting a bad line.
// Options are always length 4; correct_option_index is 0-based and is
// NEVER sent to the client while a question is live (see /state below).
// =================================================================
const QUESTIONS = [
    // ---------------- PYTHON ----------------
    {
        id: 'py-q1', language: 'PYTHON', question_text: 'What is printed?',
        snippet: 'def foo():\n    print("A")\n    return\n    print("B")\nfoo()',
        options: ['A', 'B', 'A\\nB', 'Nothing'], correct_option_index: 0,
        explanation: 'The function returns before the second print statement is ever reached.'
    },
    {
        id: 'py-q2', language: 'PYTHON', question_text: 'Which line has a syntax error?',
        snippet: '1: def add(a, b):\n2:     return a + b\n3:\n4: print(add(2, 3)',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], correct_option_index: 3,
        explanation: 'Line 4 is missing its closing parenthesis.'
    },
    {
        id: 'py-q3', language: 'PYTHON', question_text: 'What is printed?',
        snippet: 'x = 5\nif x > 3:\n    x = x + 1\nelif x > 1:\n    x = x - 1\nprint(x)',
        options: ['6', '4', '5', 'Error'], correct_option_index: 0,
        explanation: 'x > 3 is true, so the if branch runs: x becomes 6.'
    },
    {
        id: 'py-q4', language: 'PYTHON', question_text: 'Which line causes an indentation error?',
        snippet: '1: for i in range(5):\n2: print(i)\n3:     if i == 3:\n4:         break',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], correct_option_index: 1,
        explanation: 'Line 2 is not indented under the for loop.'
    },
    {
        id: 'py-q5', language: 'PYTHON', question_text: 'What is printed?',
        snippet: 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)',
        options: ['[1, 2, 3]', '[1, 2, 3, 4]', '[4]', 'Error'], correct_option_index: 1,
        explanation: 'b is the same list object as a (not a copy), so appending to b changes a too.'
    },
    {
        id: 'py-q6', language: 'PYTHON', question_text: 'Which line has a syntax error?',
        snippet: '1: class Dog:\n2:     def __init__(self, name)\n3:         self.name = name\n4:     def bark(self):\n5:         print(f"{self.name} says woof")',
        options: ['Line 2', 'Line 3', 'Line 4', 'Line 5'], correct_option_index: 0,
        explanation: 'Line 2 is missing the colon at the end of the method definition.'
    },
    {
        id: 'py-q7', language: 'PYTHON', question_text: 'What does this print (two lines)?',
        snippet: 'def f(x=[]):\n    x.append(1)\n    return x\nprint(f())\nprint(f())',
        options: ['[1]  then  [1]', '[1]  then  [1, 1]', '[1, 1]  then  [1, 1]', 'Error'], correct_option_index: 1,
        explanation: 'Mutable default arguments persist across calls, so the list keeps growing.'
    },
    {
        id: 'py-q8', language: 'PYTHON', question_text: 'Which line has a syntax error?',
        snippet: '1: try:\n2:     x = 1 / 0\n3: except ZeroDivisionError as e\n4:     print(e)',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], correct_option_index: 2,
        explanation: 'Line 3 is missing the colon after the except clause.'
    },
    {
        id: 'py-q9', language: 'PYTHON', question_text: 'What is printed?',
        snippet: 'i = 0\nwhile i < 3:\n    i += 1\n    if i == 2:\n        continue\n    print(i)',
        options: ['1 3', '1 2 3', '2', '1'], correct_option_index: 0,
        explanation: 'When i becomes 2, continue skips the print, so only 1 and 3 are printed.'
    },
    {
        id: 'py-q10', language: 'PYTHON', question_text: 'Which line has a syntax error?',
        snippet: '1: def greet(name):\n2:    return "Hello " + name\n3:\n4: print(greet("Alice")',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], correct_option_index: 3,
        explanation: 'Line 4 is missing its closing parenthesis.'
    },

    // ---------------- JAVA ----------------
    {
        id: 'java-q1', language: 'JAVA', question_text: 'What is printed?',
        snippet: 'int x = 5;\nif (x > 10) {\n    System.out.println("A");\n} else if (x > 3) {\n    System.out.println("B");\n} else {\n    System.out.println("C");\n}',
        options: ['A', 'B', 'C', 'Nothing'], correct_option_index: 1,
        explanation: 'x is not greater than 10 but is greater than 3, so the else-if branch runs.'
    },
    {
        id: 'java-q2', language: 'JAVA', question_text: 'Which line has a syntax error?',
        snippet: '1: public class Main {\n2:     public static void main(String[] args) {\n3:         int x = 5\n4:         System.out.println(x);\n5:     }\n6: }',
        options: ['Line 2', 'Line 3', 'Line 4', 'Line 6'], correct_option_index: 1,
        explanation: 'Line 3 is missing its terminating semicolon.'
    },
    {
        id: 'java-q3', language: 'JAVA', question_text: 'What is printed?',
        snippet: 'int[] arr = {1, 2, 3, 4};\nint sum = 0;\nfor (int i = 0; i < arr.length; i++) {\n    sum += arr[i];\n}\nSystem.out.println(sum);',
        options: ['10', '6', '4', 'Error'], correct_option_index: 0,
        explanation: '1+2+3+4 = 10.'
    },
    {
        id: 'java-q4', language: 'JAVA', question_text: 'Which line has a syntax error?',
        snippet: '1: public class Main {\n2:     public static void main(String[] args) {\n3:         for (int i = 0; i < 5; i++)\n4:             System.out.println(i)\n5:     }\n6: }',
        options: ['Line 2', 'Line 3', 'Line 4', 'Line 6'], correct_option_index: 2,
        explanation: 'Line 4 is missing its terminating semicolon.'
    },
    {
        id: 'java-q5', language: 'JAVA', question_text: 'What is printed?',
        snippet: 'String s = "Hello";\ns = s + " World";\nSystem.out.println(s.length());',
        options: ['5', '6', '11', 'Error'], correct_option_index: 2,
        explanation: '"Hello World" has 11 characters.'
    },
    {
        id: 'java-q6', language: 'JAVA', question_text: 'Which line causes a compile error?',
        snippet: '1: public class Main {\n2:     public static void main(String[] args) {\n3:         int x = 10;\n4:         if (x = 5) {\n5:             System.out.println("yes");\n6:         }\n7:     }\n8: }',
        options: ['Line 3', 'Line 4', 'Line 5', 'Line 6'], correct_option_index: 1,
        explanation: 'Line 4 uses assignment (=) instead of comparison (==); an int cannot be used as a boolean condition in Java.'
    },
    {
        id: 'java-q7', language: 'JAVA', question_text: 'What is printed (two lines)?',
        snippet: 'int a = 10;\nint b = 3;\nSystem.out.println(a / b);\nSystem.out.println(a % b);',
        options: ['3  then  1', '3.33  then  1', '3  then  1.0', 'Error'], correct_option_index: 0,
        explanation: 'Integer division truncates: 10/3 = 3, and 10%3 = 1.'
    },
    {
        id: 'java-q8', language: 'JAVA', question_text: 'Which line has a syntax error?',
        snippet: '1: public class Main {\n2:     public static void main(String[] args) {\n3:         String name = "Bob";\n4:         System.out.println("Hi " + name)\n5:     }\n6: }',
        options: ['Line 3', 'Line 4', 'Line 5', 'Line 6'], correct_option_index: 1,
        explanation: 'Line 4 is missing its terminating semicolon.'
    },
    {
        id: 'java-q9', language: 'JAVA', question_text: 'What is printed?',
        snippet: 'int i = 0;\ndo {\n    System.out.println(i);\n    i++;\n} while (i < 3);',
        options: ['0 1 2', '1 2 3', '0 1 2 3', 'Infinite loop'], correct_option_index: 0,
        explanation: 'A do-while runs the body first, printing 0, 1, then 2 before the condition fails.'
    },
    {
        id: 'java-q10', language: 'JAVA', question_text: 'Which line causes a runtime error?',
        snippet: '1: public class Main {\n2:     public static void main(String[] args) {\n3:         int[] nums = {1, 2, 3};\n4:         System.out.println(nums[3]);\n5:     }\n6: }',
        options: ['Line 3', 'Line 4', 'Line 5', 'Line 6'], correct_option_index: 1,
        explanation: 'nums only has indices 0-2; nums[3] throws ArrayIndexOutOfBoundsException.'
    },

    // ---------------- JAVASCRIPT ----------------
    {
        id: 'js-q1', language: 'JAVASCRIPT', question_text: 'What is the print order?',
        snippet: 'console.log(1);\nsetTimeout(() => console.log(2), 0);\nconsole.log(3);',
        options: ['1 2 3', '1 3 2', '2 1 3', '3 1 2'], correct_option_index: 1,
        explanation: 'setTimeout callbacks run after the current synchronous code finishes, even with a 0ms delay.'
    },
    {
        id: 'js-q2', language: 'JAVASCRIPT', question_text: 'Which line has a syntax error?',
        snippet: '1: function add(a, b) {\n2:   return a + b\n3: }\n4: console.log(add(2, 3);',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], correct_option_index: 3,
        explanation: 'Line 4 has a mismatched/missing closing parenthesis for console.log.'
    },
    {
        id: 'js-q3', language: 'JAVASCRIPT', question_text: 'What is printed?',
        snippet: 'let x = 10;\nfunction change() {\n  var x = 20;\n}\nchange();\nconsole.log(x);',
        options: ['20', '10', 'undefined', 'Error'], correct_option_index: 1,
        explanation: 'The var inside change() is function-scoped and shadows the outer x — the outer x stays 10.'
    },
    {
        id: 'js-q4', language: 'JAVASCRIPT', question_text: 'Which line has a syntax error?',
        snippet: '1: const user = {\n2:   name: "Alex"\n3:   age: 30\n4: };',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], correct_option_index: 1,
        explanation: 'Line 2 is missing a trailing comma before the next property.'
    },
    {
        id: 'js-q5', language: 'JAVASCRIPT', question_text: 'What is printed?',
        snippet: 'console.log([1, 2, 3].map(n => n * 2));',
        options: ['[2, 4, 6]', '[1, 2, 3]', '[1, 4, 9]', 'Error'], correct_option_index: 0,
        explanation: 'map doubles each element.'
    },
    {
        id: 'js-q6', language: 'JAVASCRIPT', question_text: 'Which line has a syntax error?',
        snippet: '1: function greet(name) {\n2:   if (name) {\n3:     return "Hi " + name;\n4:   \n5: }',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 5'], correct_option_index: 3,
        explanation: 'The if-block and function are never closed properly — a closing brace is missing before line 5.'
    },
    {
        id: 'js-q7', language: 'JAVASCRIPT', question_text: 'What is printed (two lines)?',
        snippet: 'let a = "5";\nlet b = 2;\nconsole.log(a + b);\nconsole.log(a - b);',
        options: ['"52"  then  3', '7  then  3', '"52"  then  -2', 'Error'], correct_option_index: 0,
        explanation: '+ with a string concatenates ("5"+2 = "52"), but - coerces both sides to numbers (5-2 = 3).'
    },
    {
        id: 'js-q8', language: 'JAVASCRIPT', question_text: 'Which line has a syntax error?',
        snippet: '1: const nums = [1, 2, 3];\n2: nums.forEach(n => {\n3:   console.log(n)\n4: )',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], correct_option_index: 3,
        explanation: 'Line 4 closes with ) instead of the required }); to match the arrow function and forEach call.'
    },
    {
        id: 'js-q9', language: 'JAVASCRIPT', question_text: 'What is printed?',
        snippet: 'let count = 0;\nfor (let i = 0; i < 3; i++) {\n  count += i;\n}\nconsole.log(count);',
        options: ['3', '6', '0', 'Error'], correct_option_index: 0,
        explanation: '0 + 1 + 2 = 3 (the loop stops before i reaches 3).'
    },
    {
        id: 'js-q10', language: 'JAVASCRIPT', question_text: 'Which line has a syntax error?',
        snippet: '1: const isEven = (n) => {\n2:   return n % 2 === 0\n3: }\n4: console.log(isEven(4)',
        options: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], correct_option_index: 3,
        explanation: 'Line 4 is missing its closing parenthesis.'
    }
];

function getQuestionById(id) {
    return QUESTIONS.find(q => q.id === id);
}

function publicQuestionShape(question) {
    // Never leak correct_option_index or explanation while a question is live
    return {
        id: question.id,
        question_text: question.question_text,
        snippet: question.snippet,
        options: question.options
    };
}

// =================================================================
// SCORING ENGINE
// =================================================================

// Fills in TIMED_OUT rows for anyone who never answered a question whose
// window has already closed. Safe to call repeatedly.
async function fillTimedOutSubmissions(duelQuestion, duel) {
    const windowEnd = new Date(duelQuestion.started_at).getTime() + duelQuestion.duration_seconds * 1000;
    if (Date.now() < windowEnd) return; // window still open — nothing to time out yet

    const participantIds = [duel.ChallengerId, duel.OpponentId];
    for (const uid of participantIds) {
        const existing = await DuelSubmission.findOne({ where: { UserId: uid, DuelQuestionId: duelQuestion.id } });
        if (!existing) {
            await DuelSubmission.create({
                UserId: uid,
                DuelQuestionId: duelQuestion.id,
                selected_option_index: null,
                is_correct: false,
                time_taken_ms: null,
                points_earned: 0,
                status: 'TIMED_OUT'
            });
        }
    }
}

// Deterministically (re)computes points for one question: the fastest
// correct submission gets 15, everyone else gets 0. Safe to call anytime,
// including before both players have answered.
async function recomputePoints(duelQuestionId) {
    const submissions = await DuelSubmission.findAll({ where: { DuelQuestionId: duelQuestionId } });
    const correctOnes = submissions
        .filter(s => s.is_correct)
        .sort((a, b) => (a.time_taken_ms ?? Infinity) - (b.time_taken_ms ?? Infinity));

    for (const s of submissions) {
        const shouldEarn = correctOnes.length > 0 && s.id === correctOnes[0].id;
        const newPoints = shouldEarn ? 15 : 0;
        if (s.points_earned !== newPoints) {
            s.points_earned = newPoints;
            await s.save();
        }
    }
}

// Resolves every question (filling timeouts + recomputing points) and, if
// not already done, finalizes the duel with a winner based on total points.
async function finalizeDuel(duel) {
    if (duel.status === 'COMPLETED') return duel;

    const duelQuestions = await DuelQuestion.findAll({ where: { DuelId: duel.id } });
    for (const dq of duelQuestions) {
        await fillTimedOutSubmissions(dq, duel);
        await recomputePoints(dq.id);
    }

    const allSubmissions = await DuelSubmission.findAll({
        where: { DuelQuestionId: duelQuestions.map(q => q.id) }
    });
    const totals = {};
    allSubmissions.forEach(s => { totals[s.UserId] = (totals[s.UserId] || 0) + s.points_earned; });

    const challengerTotal = totals[duel.ChallengerId] || 0;
    const opponentTotal = totals[duel.OpponentId] || 0;

    let winnerId = null;
    if (challengerTotal !== opponentTotal) {
        winnerId = challengerTotal > opponentTotal ? duel.ChallengerId : duel.OpponentId;
    } // else: a tie stays a draw (winnerId null)

    // Standard chess-style Elo update — duels are genuinely 1v1, so unlike
    // bounty/competition Elo bonuses (flat amounts), this is real pairwise
    // Elo: K=32, expected score from the logistic curve, actual score is
    // 1/0.5/0 for win/draw/loss.
    const challenger = await User.findByPk(duel.ChallengerId);
    const opponent = await User.findByPk(duel.OpponentId);
    if (challenger && opponent) {
        const K = 32;
        const expectedChallenger = 1 / (1 + Math.pow(10, (opponent.elo - challenger.elo) / 400));
        const expectedOpponent = 1 - expectedChallenger;
        const scoreChallenger = winnerId === null ? 0.5 : (winnerId === duel.ChallengerId ? 1 : 0);
        const scoreOpponent = 1 - scoreChallenger;

        challenger.elo = Math.round(challenger.elo + K * (scoreChallenger - expectedChallenger));
        opponent.elo = Math.round(opponent.elo + K * (scoreOpponent - expectedOpponent));
        await challenger.save();
        await opponent.save();
    }

    duel.status = 'COMPLETED';
    duel.WinnerId = winnerId;
    await duel.save();
    return duel;
}

// ---------------------------------------------------------------
// Send a duel invite
// ---------------------------------------------------------------
exports.sendInvite = async (req, res) => {
    try {
        const { opponent_username, language, question_count } = req.body;

        if (!opponent_username || !language) {
            return res.status(400).json({ error: 'opponent_username and language are required' });
        }
        if (!['PYTHON', 'JAVA', 'JAVASCRIPT'].includes(language)) {
            return res.status(400).json({ error: 'language must be PYTHON, JAVA, or JAVASCRIPT' });
        }

        const opponent = await User.findOne({ where: { username: opponent_username } });
        if (!opponent) {
            return res.status(404).json({ error: 'Opponent not found' });
        }
        if (opponent.id === req.user.id) {
            return res.status(400).json({ error: 'You cannot duel yourself' });
        }

        const existingPending = await Duel.findOne({
            where: {
                status: 'PENDING',
                [Op.or]: [
                    { ChallengerId: req.user.id, OpponentId: opponent.id },
                    { ChallengerId: opponent.id, OpponentId: req.user.id }
                ]
            }
        });
        if (existingPending) {
            return res.status(400).json({ error: 'There is already a pending duel invite between you two' });
        }

        const parsedCount = Number(question_count);
        const duel = await Duel.create({
            language,
            question_count: Number.isInteger(parsedCount) && parsedCount >= 3 && parsedCount <= 5 ? parsedCount : 3,
            ChallengerId: req.user.id,
            OpponentId: opponent.id
        });

        const challenger = await User.findByPk(req.user.id);
        await Notification.create({
            type: 'DUEL_INVITE',
            message: `${challenger.username} challenged you to a ${language} coding duel!`,
            link: `/duel/${duel.id}`,
            UserId: opponent.id
        });

        res.status(201).json(duel);
    } catch (error) {
        console.error('Error sending duel invite:', error);
        res.status(500).json({ error: 'Failed to send duel invite' });
    }
};

// ---------------------------------------------------------------
// Accept or decline an invite. Accepting schedules the full question
// sequence up front — question i's window opens exactly
// (i * 15) seconds after the duel starts, so both players' clients
// stay in sync purely from duel.started_at.
// ---------------------------------------------------------------
exports.respondToInvite = async (req, res) => {
    try {
        const { duelId } = req.params;
        const { accept } = req.body;

        const duel = await Duel.findByPk(duelId);
        if (!duel) return res.status(404).json({ error: 'Duel not found' });
        if (duel.OpponentId !== req.user.id) {
            return res.status(403).json({ error: 'Only the invited opponent can respond' });
        }
        if (duel.status !== 'PENDING') {
            return res.status(400).json({ error: 'This invite has already been responded to' });
        }

        if (!accept) {
            duel.status = 'DECLINED';
            await duel.save();
            return res.json(duel);
        }

        const pool = QUESTIONS.filter(q => q.language === duel.language);
        const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, duel.question_count);
        // The hardcoded bank always has 10 questions per language and
        // question_count maxes at 5, so this should never actually run
        // short — guarded anyway in case the bank is ever trimmed.
        if (shuffled.length < duel.question_count) {
            return res.status(500).json({ error: 'Not enough questions available for this language' });
        }

        const now = new Date();
        await Promise.all(shuffled.map((q, index) =>
            DuelQuestion.create({
                DuelId: duel.id,
                question_id: q.id,
                order_index: index,
                started_at: new Date(now.getTime() + index * 15000),
                duration_seconds: 15
            })
        ));

        duel.status = 'ACTIVE';
        duel.started_at = now;
        await duel.save();

        const opponent = await User.findByPk(req.user.id);
        await Notification.create({
            type: 'DUEL_ACCEPTED',
            message: `${opponent.username} accepted your duel! It's on.`,
            link: `/duel/${duel.id}`,
            UserId: duel.ChallengerId
        });

        res.json(duel);
    } catch (error) {
        console.error('Error responding to duel:', error);
        res.status(500).json({ error: 'Failed to respond to duel' });
    }
};

// ---------------------------------------------------------------
// List all duels I'm part of (any status)
// ---------------------------------------------------------------
exports.getMyDuels = async (req, res) => {
    try {
        const duels = await Duel.findAll({
            where: {
                [Op.or]: [{ ChallengerId: req.user.id }, { OpponentId: req.user.id }]
            },
            include: [
                { model: User, as: 'Challenger', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Opponent', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Winner', attributes: ['id', 'username', 'profile_picture'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(duels);
    } catch (error) {
        console.error('Error fetching my duels:', error);
        res.status(500).json({ error: 'Failed to fetch duels' });
    }
};

// ---------------------------------------------------------------
// List my pending invites (received)
// ---------------------------------------------------------------
exports.getPendingInvites = async (req, res) => {
    try {
        const invites = await Duel.findAll({
            where: { OpponentId: req.user.id, status: 'PENDING' },
            include: [{ model: User, as: 'Challenger', attributes: ['id', 'username', 'profile_picture'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(invites);
    } catch (error) {
        console.error('Error fetching duel invites:', error);
        res.status(500).json({ error: 'Failed to fetch invites' });
    }
};

// ---------------------------------------------------------------
// MAIN LIVE ENDPOINT — poll this (e.g. every 1s) while a duel is ACTIVE.
// Returns the current question (content only, never the answer), a
// server-computed countdown, running scores, and — once every question's
// window has elapsed — the final result with the winner.
// ---------------------------------------------------------------
exports.getDuelState = async (req, res) => {
    try {
        const duel = await Duel.findByPk(req.params.duelId, {
            include: [
                { model: User, as: 'Challenger', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Opponent', attributes: ['id', 'username', 'profile_picture'] },
                { model: User, as: 'Winner', attributes: ['id', 'username', 'profile_picture'] },
                { model: DuelQuestion }
            ]
        });
        if (!duel) return res.status(404).json({ error: 'Duel not found' });
        if (duel.ChallengerId !== req.user.id && duel.OpponentId !== req.user.id) {
            return res.status(403).json({ error: 'You are not part of this duel' });
        }

        if (duel.status === 'PENDING' || duel.status === 'DECLINED') {
            return res.json({ status: duel.status, Challenger: duel.Challenger, Opponent: duel.Opponent });
        }

        const duelQuestions = [...duel.DuelQuestions].sort((a, b) => a.order_index - b.order_index);
        const totalQuestions = duelQuestions.length;
        const totalDurationMs = duelQuestions.reduce((sum, q) => sum + q.duration_seconds * 1000, 0);
        const elapsedMs = Date.now() - new Date(duel.started_at).getTime();

        // Whole duel is over once every question's window has elapsed
        if (duel.status === 'COMPLETED' || elapsedMs >= totalDurationMs) {
            const finalized = await finalizeDuel(duel);
            const finalSubs = await DuelSubmission.findAll({
                where: { DuelQuestionId: duelQuestions.map(q => q.id) }
            });
            const totals = {};
            finalSubs.forEach(s => { totals[s.UserId] = (totals[s.UserId] || 0) + s.points_earned; });

            return res.json({
                status: 'COMPLETED',
                Challenger: duel.Challenger,
                Opponent: duel.Opponent,
                Winner: finalized.WinnerId
                    ? (finalized.WinnerId === duel.ChallengerId ? duel.Challenger : duel.Opponent)
                    : null,
                scores: {
                    [duel.ChallengerId]: totals[duel.ChallengerId] || 0,
                    [duel.OpponentId]: totals[duel.OpponentId] || 0
                }
            });
        }

        // Still ACTIVE — figure out which question index we're on purely
        // from elapsed time, so both players land on the same question
        let currentIndex = 0;
        let cumMs = 0;
        for (let i = 0; i < duelQuestions.length; i++) {
            cumMs += duelQuestions[i].duration_seconds * 1000;
            currentIndex = i;
            if (elapsedMs < cumMs) break;
        }

        // Resolve every question that has already fully elapsed
        for (let i = 0; i < currentIndex; i++) {
            await fillTimedOutSubmissions(duelQuestions[i], duel);
            await recomputePoints(duelQuestions[i].id);
        }

        const currentDQ = duelQuestions[currentIndex];
        const question = getQuestionById(currentDQ.question_id);
        const windowStartMs = new Date(currentDQ.started_at).getTime();
        const secondsRemaining = Math.max(
            0,
            currentDQ.duration_seconds - Math.floor((Date.now() - windowStartMs) / 1000)
        );

        const mySubmission = await DuelSubmission.findOne({
            where: { UserId: req.user.id, DuelQuestionId: currentDQ.id }
        });

        const pastQuestionIds = duelQuestions.slice(0, currentIndex).map(q => q.id);
        const pastSubs = pastQuestionIds.length
            ? await DuelSubmission.findAll({ where: { DuelQuestionId: pastQuestionIds } })
            : [];
        const runningScores = { [duel.ChallengerId]: 0, [duel.OpponentId]: 0 };
        pastSubs.forEach(s => { runningScores[s.UserId] = (runningScores[s.UserId] || 0) + s.points_earned; });

        res.json({
            status: 'ACTIVE',
            Challenger: duel.Challenger,
            Opponent: duel.Opponent,
            question_index: currentIndex,
            total_questions: totalQuestions,
            seconds_remaining: secondsRemaining,
            current_question: publicQuestionShape(question),
            already_answered: !!mySubmission,
            my_selected_option_index: mySubmission ? mySubmission.selected_option_index : null,
            running_scores: runningScores
        });
    } catch (error) {
        console.error('Error fetching duel state:', error);
        res.status(500).json({ error: 'Failed to fetch duel state' });
    }
};

// ---------------------------------------------------------------
// Submit an answer to the currently-live question
// ---------------------------------------------------------------
exports.submitAnswer = async (req, res) => {
    try {
        const { duelId } = req.params;
        const { question_id, selected_option_index } = req.body;

        if (question_id === undefined || selected_option_index === undefined) {
            return res.status(400).json({ error: 'question_id and selected_option_index are required' });
        }
        const parsedOption = Number(selected_option_index);
        if (!Number.isInteger(parsedOption) || parsedOption < 0 || parsedOption > 3) {
            return res.status(400).json({ error: 'selected_option_index must be an integer between 0 and 3' });
        }

        const duel = await Duel.findByPk(duelId);
        if (!duel) return res.status(404).json({ error: 'Duel not found' });
        if (duel.ChallengerId !== req.user.id && duel.OpponentId !== req.user.id) {
            return res.status(403).json({ error: 'You are not part of this duel' });
        }
        if (duel.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'This duel is not active' });
        }

        const duelQuestion = await DuelQuestion.findOne({ where: { DuelId: duel.id, question_id } });
        if (!duelQuestion) return res.status(404).json({ error: 'Question not found in this duel' });

        const now = Date.now();
        const windowStart = new Date(duelQuestion.started_at).getTime();
        const windowEnd = windowStart + duelQuestion.duration_seconds * 1000;

        if (now < windowStart) {
            return res.status(403).json({ error: 'This question has not started yet' });
        }
        if (now > windowEnd) {
            return res.status(403).json({ error: "Time's up for this question" });
        }

        const existing = await DuelSubmission.findOne({
            where: { UserId: req.user.id, DuelQuestionId: duelQuestion.id }
        });
        if (existing) {
            return res.status(400).json({ error: 'You already answered this question' });
        }

        const question = getQuestionById(duelQuestion.question_id);
        const isCorrect = parsedOption === question.correct_option_index;
        const timeTakenMs = now - windowStart;

        await DuelSubmission.create({
            UserId: req.user.id,
            DuelQuestionId: duelQuestion.id,
            selected_option_index: parsedOption,
            is_correct: isCorrect,
            time_taken_ms: timeTakenMs,
            status: 'ANSWERED'
        });

        // If both players have now answered, award points right away
        // instead of waiting for the full 15s window to close
        const answeredCount = await DuelSubmission.count({ where: { DuelQuestionId: duelQuestion.id } });
        if (answeredCount === 2) {
            await recomputePoints(duelQuestion.id);

            // If this was the LAST question and both sides just answered it,
            // the duel is functionally over — finalize (and apply Elo) right
            // now instead of waiting for a client to poll /state after the
            // full scheduled duration elapses. This is what makes Elo
            // actually update promptly instead of depending on someone
            // revisiting the duel page later.
            if (duelQuestion.order_index === duel.question_count - 1) {
                await finalizeDuel(duel);
            }
        }

        res.status(201).json({ submitted: true, is_correct: isCorrect });
    } catch (error) {
        console.error('Error submitting duel answer:', error);
        res.status(500).json({ error: 'Failed to submit answer' });
    }
};

// ---------------------------------------------------------------
// Safety net for abandoned duels: if one player never submits the
// final answer, the fast-path finalize above never fires. This finds
// any ACTIVE duel whose full scheduled duration has already elapsed
// in real time and finalizes it anyway (applying Elo either way).
// Called periodically from index.js — safe to call as often as you like.
// ---------------------------------------------------------------
exports.sweepExpiredDuels = async function sweepExpiredDuels() {
    const activeDuels = await Duel.findAll({
        where: { status: 'ACTIVE' },
        include: [{ model: DuelQuestion }]
    });

    for (const duel of activeDuels) {
        const totalDurationMs = duel.DuelQuestions.reduce((sum, q) => sum + q.duration_seconds * 1000, 0);
        if (totalDurationMs === 0) continue; // questions not assigned yet, shouldn't happen for ACTIVE
        const elapsedMs = Date.now() - new Date(duel.started_at).getTime();
        if (elapsedMs >= totalDurationMs) {
            await finalizeDuel(duel);
        }
    }
};

// ---------------------------------------------------------------
// GET /api/duel/stats — stats box shown on the 1v1 Duel tab.
// "Active"/"Completed" are platform-wide; "Played by Me"/"Won by Me"
// are specific to the logged-in user (completed duels only — a duel
// still in progress hasn't been "played" to a result yet).
// ---------------------------------------------------------------
exports.getStats = async (req, res) => {
    try {
        const activeCount = await Duel.count({ where: { status: 'ACTIVE' } });
        const completedCount = await Duel.count({ where: { status: 'COMPLETED' } });

        const myPlayedCount = await Duel.count({
            where: {
                status: 'COMPLETED',
                [Op.or]: [{ ChallengerId: req.user.id }, { OpponentId: req.user.id }]
            }
        });
        const myWonCount = await Duel.count({
            where: { status: 'COMPLETED', WinnerId: req.user.id }
        });

        res.json({
            active: activeCount,
            completed: completedCount,
            myPlayed: myPlayedCount,
            myWon: myWonCount
        });
    } catch (error) {
        console.error('Error fetching duel stats:', error);
        res.status(500).json({ error: 'Failed to fetch duel stats' });
    }
};