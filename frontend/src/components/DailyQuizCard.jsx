import { useState, useEffect } from "react";

const DailyQuizCard = () => {
  const [quizData, setQuizData] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState(false);

  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/quiz", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.alreadyPlayed) {
            setAlreadyPlayed(true);
            setScore(data.score);
          } else {
            setQuizData(data.quiz);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [token]);

  const handleGuess = (guess) => {
    const currentQ = quizData[currentStep];
    const correct = guess.toString().trim() === currentQ.correct_answer;

    setIsCorrect(correct);
    if (correct) setScore((prev) => prev + 1);
    setShowFeedback(true);
  };

  const handleNext = async () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
      setShowFeedback(false);
      setInputValue("");
    } else {
      setSubmitError(false);
      try {
        const res = await fetch("http://localhost:3001/api/quiz/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ score }),
        });
        if (res.ok) {
          setAlreadyPlayed(true);
        } else {
          setSubmitError(true);
        }
      } catch (err) {
        console.error(err);
        setSubmitError(true);
      }
    }
  };

  if (loading)
    return (
      <div className="panel daily-quiz-panel">
        <p className="empty-state">Loading challenge...</p>
      </div>
    );

  if (!alreadyPlayed && quizData.length === 0)
    return (
      <div className="panel daily-quiz-panel">
        <p className="empty-state">Could not load today's challenge. Try refreshing.</p>
      </div>
    );

  if (alreadyPlayed) {
    return (
      <div className="panel daily-quiz-panel">
        <div className="quiz-header">
          <h3>Daily Dev Workout</h3>
          <span className="category-chip category-chip--review">Completed</span>
        </div>
        <div className="empty-state quiz-completed-container">
          <h2 className="quiz-completed-score">
            {score} / 3
          </h2>
          <p>Great job! You earned {score * 10} points today.</p>
          <p className="quiz-completed-subtext">
            Come back tomorrow for a new challenge.
          </p>
        </div>
      </div>
    );
  }

  const currentQ = quizData[currentStep];

  return (
    <div className="panel daily-quiz-panel">
      <div className="quiz-header">
        <h3>Daily Dev Quizzes</h3>
        <span className="quiz-progress">{currentStep + 1} of 3</span>
      </div>

      <p className="quiz-question">{currentQ.question}</p>

      <div className="code-block">
        <pre>
          <code>{currentQ.snippet}</code>
        </pre>
      </div>

      {!showFeedback && (
        <>
          {currentQ.type === "multiple_choice" && (
            <div className="quiz-options">
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  className="quiz-option-btn"
                  onClick={() => handleGuess(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentQ.type === "terminal" && (
            <div className="quiz-terminal">
              <span>&gt;</span>
              <input
                type="text"
                placeholder="Type exact output & enter"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGuess(inputValue)}
                autoFocus
              />
            </div>
          )}

          {currentQ.type === "fill_in" && (
            <div className="quiz-fill">
              <input
                type="text"
                className="select-input"
                placeholder="Missing code..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGuess(inputValue)}
                autoFocus
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleGuess(inputValue)}
              >
                Submit
              </button>
            </div>
          )}
        </>
      )}

      {showFeedback && (
        <div
          className={`quiz-feedback ${isCorrect ? "quiz-feedback--correct" : "quiz-feedback--wrong"}`}
        >
          <strong>
            {isCorrect
              ? "Correct! 🎉"
              : `Incorrect! Answer: ${currentQ.correct_answer}`}
          </strong>
          <p className="quiz-explanation">{currentQ.explanation}</p>
          {submitError && (
            <p className="quiz-explanation quiz-save-error">
              Couldn't save your score — try clicking again.
            </p>
          )}
          <button
            className="btn btn-block quiz-next-btn"
            onClick={handleNext}
          >
            {currentStep < 2 ? "Next Question →" : "Finish & Save Score"}
          </button>
        </div>
      )}
    </div>
  );
};

export default DailyQuizCard;