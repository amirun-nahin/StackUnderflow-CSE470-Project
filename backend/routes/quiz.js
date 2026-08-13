const express = require('express');
const router = express.Router();
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const { validateToken } = require('../middlewares/AuthMiddleware');

// The 5-Day Quiz Loop
const quizzes = [
  //  Day 1
  [
    {
      id: "d1-q1",
      type: "multiple_choice",
      question: "What is the output of this JavaScript?",
      snippet: "console.log(typeof typeof 1);",
      options: ["number", "string", "undefined", "object"],
      correct_answer: "string",
      explanation: "typeof 1 returns 'number', and typeof 'number' returns 'string'."
    },
    {
      id: "d1-q2",
      type: "terminal",
      question: "Type the exact console output:",
      snippet: "let x = 5;\nconsole.log(x++);",
      correct_answer: "5",
      explanation: "The postfix ++ operator returns the value BEFORE incrementing it."
    },
    {
      id: "d1-q3",
      type: "fill_in",
      question: "Fill in the missing operator to check if a number is even.",
      snippet: "const isEven = (num) => num [ _ ] 2 === 0;",
      correct_answer: "%",
      explanation: "The modulo operator (%) returns the remainder of a division."
    }
  ],
  // Day 2
  [
    {
      id: "d2-q1",
      type: "multiple_choice",
      question: "What does this Python code print?",
      snippet: "print(bool('False'))",
      options: ["True", "False", "None", "Error"],
      correct_answer: "True",
      explanation: "Any non-empty string in Python evaluates to True."
    },
    {
      id: "d2-q2",
      type: "terminal",
      question: "Type the exact console output:",
      snippet: "console.log(0.1 + 0.2 === 0.3);",
      correct_answer: "false",
      explanation: "Floating point math in JS causes 0.1 + 0.2 to equal 0.30000000000000004."
    },
    {
      id: "d2-q3",
      type: "fill_in",
      question: "Fill in the blank to export a default function in React.",
      snippet: "[ _______ ] default function App() {}",
      correct_answer: "export",
      explanation: "The 'export default' syntax is used to export a single value."
    }
  ],
  // Day 3
  [
    {
      id: "d3-q1",
      type: "multiple_choice",
      question: "Which of these is NOT a valid CSS position value?",
      snippet: ".box { position: ???; }",
      options: ["static", "relative", "float", "sticky"],
      correct_answer: "float",
      explanation: "Float is a separate CSS property, not a value for 'position'."
    },
    {
      id: "d3-q2",
      type: "terminal",
      question: "Type the exact console output:",
      snippet: "console.log([1, 2, 3] + [4, 5, 6]);",
      correct_answer: "1,2,34,5,6",
      explanation: "JS converts arrays to strings and concatenates them, missing the comma."
    },
    {
      id: "d3-q3",
      type: "fill_in",
      question: "Fill in the array method to add an item to the end.",
      snippet: "myArray.[ ____ ]('newItem');",
      correct_answer: "push",
      explanation: "The push() method adds one or more elements to the end of an array."
    }
  ],
  // Day 4
  [
    {
      id: "d4-q1",
      type: "multiple_choice",
      question: "What is the output?",
      snippet: "console.log(Math.max());",
      options: ["0", "undefined", "-Infinity", "NaN"],
      correct_answer: "-Infinity",
      explanation: "Math.max() with no arguments returns -Infinity."
    },
    {
      id: "d4-q2",
      type: "terminal",
      question: "Type the exact console output:",
      snippet: "console.log(!!'');",
      correct_answer: "false",
      explanation: "An empty string is falsy. The double bang (!!) converts it to a boolean."
    },
    {
      id: "d4-q3",
      type: "fill_in",
      question: "Fill in the blank to prevent a form from refreshing the page.",
      snippet: "const handleSubmit = (e) => {\n  e.[ ______________ ]();\n}",
      correct_answer: "preventDefault",
      explanation: "preventDefault() stops the default browser behavior for an event."
    }
  ],
  // Day 5
  [
    {
      id: "d5-q1",
      type: "multiple_choice",
      question: "What does this return?",
      snippet: "console.log(typeof NaN);",
      options: ["NaN", "number", "undefined", "object"],
      correct_answer: "number",
      explanation: "Despite meaning 'Not-a-Number', NaN is technically of the type 'number' in JS."
    },
    {
      id: "d5-q2",
      type: "terminal",
      question: "Type the exact console output:",
      snippet: "console.log(3 + 4 + '5');",
      correct_answer: "75",
      explanation: "3 and 4 are added first (7), then concatenated with the string '5'."
    },
    {
      id: "d5-q3",
      type: "fill_in",
      question: "Fill in the blank to pause an async function.",
      snippet: "const data = [ _____ ] fetch('/api/data');",
      correct_answer: "await",
      explanation: "The await keyword pauses async execution until the Promise resolves."
    }
  ]
];

// Get today's date string (YYYY-MM-DD) natively
const getTodayString = () => new Date().toISOString().split('T')[0];

// Fetch today's quiz or the user's completed score
router.get('/', validateToken, async (req, res) => {
    try {
        const today = getTodayString();
        
        // Check if user already played today
        const attempt = await QuizAttempt.findOne({
            where: { UserId: req.user.id, date_played: today }
        });

        if (attempt) {
            return res.json({ alreadyPlayed: true, score: attempt.score });
        }

        // Calculate which quiz to serve
        const epoch = new Date('2024-01-01');
        const daysSince = Math.floor((new Date() - epoch) / (1000 * 60 * 60 * 24));
        const dailyQuiz = quizzes[daysSince % quizzes.length];

        res.json({ alreadyPlayed: false, quiz: dailyQuiz });
    } catch (error) {
        console.error('Quiz error:', error);
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});

// Submit the final score
router.post('/submit', validateToken, async (req, res) => {
    try {
        const { score } = req.body;
        if (!Number.isInteger(score) || score < 0 || score > 3) {
            return res.status(400).json({ error: 'Invalid score' });
        }
        const today = getTodayString();

        const [attempt, created] = await QuizAttempt.findOrCreate({
            where: { UserId: req.user.id, date_played: today },
            defaults: { score }
        });

        if (created) {
            // Reward the user with points (10 per correct answer)
            const user = await User.findByPk(req.user.id);
            user.points += (score * 10);
            await user.save();
        }

        res.json({ success: true, score: attempt.score });
    } catch (error) {
        console.error('Quiz submit error:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

module.exports = router;