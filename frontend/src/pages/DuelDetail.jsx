import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const getMyUserId = (token) => {
    if (!token || token === 'undefined' || token === 'null') return null;
    try {
        if (token.includes('.')) {
            return JSON.parse(atob(token.split('.')[1])).id;
        }
    } catch (error) {
        console.error('Corrupted token found, ignoring safely.', error);
    }
    return null;
};

const DuelDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [duel, setDuel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [responding, setResponding] = useState(false);
    const [answering, setAnswering] = useState(false);

    // Optimistic local state for the *current* question, cleared whenever
    // question_index changes (i.e. a new question starts).
    const [localSelected, setLocalSelected] = useState(null);
    const [lastResult, setLastResult] = useState(null); // is_correct from the /answer response

    const questionIndexRef = useRef(null);
    const intervalRef = useRef(null);

    const token = localStorage.getItem('accessToken');
    const myUserId = getMyUserId(token);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const pollState = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/duel/${id}/state`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();

                // New question started -> clear this question's local answer state
                if (data.status === 'ACTIVE' && data.question_index !== questionIndexRef.current) {
                    questionIndexRef.current = data.question_index;
                    setLocalSelected(null);
                    setLastResult(null);
                }

                setDuel(data);
                setErrorMessage('');

                if (data.status === 'COMPLETED' || data.status === 'DECLINED') {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Failed to load this duel.');
            }
        } catch (error) {
            console.error('Failed to poll duel state', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        questionIndexRef.current = null;
        pollState();
        intervalRef.current = setInterval(pollState, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleRespond = async (accept) => {
        setResponding(true);
        setErrorMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/duel/${id}/respond`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ accept })
            });
            if (response.ok) {
                // Duel goes ACTIVE instantly on accept — poll right away instead of
                // waiting up to 1s for the next scheduled tick.
                pollState();
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not respond to this duel.');
            }
        } catch (error) {
            console.error('Respond error:', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setResponding(false);
        }
    };

    const handleAnswer = async (optionIndex) => {
        if (!duel?.current_question || answering || localSelected !== null || duel.already_answered) return;
        setAnswering(true);
        setLocalSelected(optionIndex);
        try {
            const response = await fetch(`http://localhost:3001/api/duel/${id}/answer`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    question_id: duel.current_question.id,
                    selected_option_index: optionIndex
                })
            });
            if (response.ok) {
                const result = await response.json();
                setLastResult(result.is_correct);
            } else if (response.status !== 403 && response.status !== 400) {
                // 403 (window boundary race) and 400 (already answered) are expected
                // edge cases the spec says to handle quietly — the next poll
                // straightens state out. Anything else surfaces normally.
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not submit your answer.');
            }
        } catch (error) {
            console.error('Answer error:', error);
        } finally {
            setAnswering(false);
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;
    if (!duel) return null;

    const isOpponent = myUserId === duel.Opponent?.id;
    const isChallenger = myUserId === duel.Challenger?.id;
    const isPendingForMe = duel.status === 'PENDING' && isOpponent;
    const opponentUser = isChallenger ? duel.Opponent : duel.Challenger;

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} className="btn-ghost back-link">
                &larr; Back
            </button>

            <div className="panel group-detail-header">
                <h1 className="discover-heading">
                    {duel.Challenger?.username} vs {duel.Opponent?.username}
                </h1>
                <div className="group-detail-badges">
                    <span className={`category-chip category-chip--${duel.status.toLowerCase()}`}>
                        {duel.status}
                    </span>
                    {duel.status === 'COMPLETED' && (
                        <span className="category-chip category-chip--bounty">
                            {duel.Winner ? `🏆 ${duel.Winner.username} wins` : "🤝 It's a draw"}
                        </span>
                    )}
                </div>
            </div>

            {errorMessage && <p className="error-text">{errorMessage}</p>}

            {/* PENDING: waiting on a response, or it's mine to accept/decline */}
            {duel.status === 'PENDING' && (
                <div className="bounty-detail-section panel">
                    {isPendingForMe ? (
                        <>
                            <h3>Respond to Challenge</h3>
                            <div className="create-post-actions">
                                <button
                                    className="btn btn-primary btn-sm"
                                    disabled={responding}
                                    onClick={() => handleRespond(true)}
                                >
                                    Accept
                                </button>
                                <button
                                    className="btn btn-outline btn-sm"
                                    disabled={responding}
                                    onClick={() => handleRespond(false)}
                                >
                                    Decline
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="empty-state">Waiting for {opponentUser?.username} to respond...</p>
                    )}
                </div>
            )}

            {duel.status === 'DECLINED' && (
                <p className="empty-state">This duel was declined.</p>
            )}

            {/* ACTIVE: the live quiz */}
            {duel.status === 'ACTIVE' && duel.current_question && (
                <div className="bounty-detail-section panel">
                    <div className="card-actions-row duel-status-row">
                        <span className="discover-card__meta">
                            Question {duel.question_index + 1} of {duel.total_questions}
                        </span>
                        <span className="category-chip category-chip--active">
                            ⏱ {duel.seconds_remaining}s
                        </span>
                    </div>

                    <div className="card-actions-row duel-status-row">
                        <span className="discover-card__meta">
                            You: {duel.running_scores?.[myUserId] ?? 0}
                        </span>
                        <span className="discover-card__meta">
                            {opponentUser?.username}: {duel.running_scores?.[opponentUser?.id] ?? 0}
                        </span>
                    </div>

                    <h3>{duel.current_question.question_text}</h3>

                    {duel.current_question.snippet && (
                        <div className="code-block">
                            <pre><code>{duel.current_question.snippet}</code></pre>
                        </div>
                    )}

                    <div className="duel-options">
                        {duel.current_question.options.map((option, idx) => {
                            const selectedIndex = localSelected !== null ? localSelected : duel.my_selected_option_index;
                            const isLocked = duel.already_answered || localSelected !== null;
                            const isThisSelected = selectedIndex === idx;

                            let extraClass = 'btn-outline';
                            if (isThisSelected && lastResult === true) extraClass = 'duel-option-btn--correct';
                            else if (isThisSelected && lastResult === false) extraClass = 'duel-option-btn--incorrect';
                            else if (isThisSelected) extraClass = 'btn-primary';

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`btn btn-block ${extraClass}`}
                                    disabled={isLocked}
                                    onClick={() => handleAnswer(idx)}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>

                    {(duel.already_answered || localSelected !== null) && (
                        <p className="empty-state">
                            {lastResult === true && '✅ Correct! '}
                            {lastResult === false && '❌ Not quite. '}
                            Locked in — waiting for the next question...
                        </p>
                    )}
                </div>
            )}

            {/* COMPLETED: final results */}
            {duel.status === 'COMPLETED' && (
                <div className="bounty-detail-section panel">
                    <h3>Final Score</h3>
                    <div className="card-actions-row duel-status-row">
                        <span className="discover-card__meta">
                            {duel.Challenger?.username}: {duel.scores?.[duel.Challenger?.id] ?? 0}
                        </span>
                        <span className="discover-card__meta">
                            {duel.Opponent?.username}: {duel.scores?.[duel.Opponent?.id] ?? 0}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuelDetail;
