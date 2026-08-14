import { useState, useEffect } from 'react';
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
    const [statusMessage, setStatusMessage] = useState('');
    const [responding, setResponding] = useState(false);
    const [codeDrafts, setCodeDrafts] = useState({});
    const [submittingId, setSubmittingId] = useState(null);

    const token = localStorage.getItem('accessToken');
    const myUserId = getMyUserId(token);

    const fetchDuel = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/duel/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDuel(data);

                setCodeDrafts(prev => {
                    const next = { ...prev };
                    (data.DuelQuestions || []).forEach(dq => {
                        if (next[dq.id] === undefined) {
                            next[dq.id] = dq.MySubmission?.code_content ?? dq.QuestionBank?.starter_code ?? '';
                        }
                    });
                    return next;
                });
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Failed to load this duel.');
            }
        } catch (error) {
            console.error('Failed to fetch duel', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDuel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleRespond = async (accept) => {
        setResponding(true);
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/duel/${id}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ accept })
            });
            if (response.ok) {
                setStatusMessage(accept ? 'Duel accepted! Questions are ready.' : 'Duel declined.');
                fetchDuel();
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

    const handleCodeChange = (duelQuestionId, value) => {
        setCodeDrafts(prev => ({ ...prev, [duelQuestionId]: value }));
    };

    const handleSubmitQuestion = async (duelQuestionId) => {
        const code = codeDrafts[duelQuestionId];
        if (!code || !code.trim()) return;
        setSubmittingId(duelQuestionId);
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(
                `http://localhost:3001/api/duel/${id}/question/${duelQuestionId}/submit`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ code_content: code })
                }
            );
            if (response.ok) {
                const submission = await response.json();
                setDuel(prev => ({
                    ...prev,
                    DuelQuestions: prev.DuelQuestions.map(dq =>
                        dq.id === duelQuestionId ? { ...dq, MySubmission: submission } : dq
                    )
                }));
                setStatusMessage('Submission saved.');
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not submit your code.');
            }
        } catch (error) {
            console.error('Submit error:', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setSubmittingId(null);
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;
    if (!duel) return null;

    const isOpponent = myUserId === duel.Opponent?.id;
    const isPendingForMe = duel.status === 'PENDING' && isOpponent;

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} className="btn-ghost back-link">
                &larr; Back
            </button>

            <div className="competition-detail-header panel">
                <div className="competition-card__title-row">
                    <h1 className="competition-detail-title">
                        {duel.Challenger?.username} vs {duel.Opponent?.username}
                    </h1>
                    <span className={`competition-phase-chip competition-phase-chip--${duel.status.toLowerCase()}`}>
                        {duel.status}
                    </span>
                </div>
                <p className="competition-card__meta">
                    {duel.language} • {duel.question_count} questions
                </p>

                {duel.status === 'COMPLETED' && (
                    <p className="bounty-meta-chip bounty-meta-chip--reward">
                        🏆 {duel.Winner?.username || 'TBD'} wins!
                    </p>
                )}
            </div>

            {errorMessage && <p className="error-text">{errorMessage}</p>}
            {statusMessage && <p className="empty-state">{statusMessage}</p>}

            {isPendingForMe && (
                <div className="bounty-detail-section panel">
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
                </div>
            )}

            {duel.status === 'DECLINED' && (
                <p className="empty-state">This duel was declined.</p>
            )}

            {(duel.DuelQuestions || []).map((dq, idx) => {
                const submission = dq.MySubmission;
                const isLocked = !!submission && submission.status !== 'PENDING';
                const canEdit = duel.status === 'ACTIVE' && !isLocked;

                return (
                    <div key={dq.id} className="bounty-detail-section panel">
                        <h3>Question {idx + 1}: {dq.QuestionBank?.title}</h3>
                        <p className="post-text">{dq.QuestionBank?.description}</p>

                        {dq.QuestionBank?.test_cases?.length > 0 && (
                            <div className="code-block">
                                <pre><code>
                                    {dq.QuestionBank.test_cases
                                        .map((tc, i) => `Input ${i + 1}: ${tc.input}`)
                                        .join('\n')}
                                </code></pre>
                            </div>
                        )}

                        {duel.status === 'ACTIVE' ? (
                            <>
                                <textarea
                                    className="code-textarea"
                                    value={codeDrafts[dq.id] ?? ''}
                                    onChange={(e) => handleCodeChange(dq.id, e.target.value)}
                                    disabled={!canEdit}
                                />
                                {submission?.status === 'PENDING' && (
                                    <p className="empty-state">Waiting for results...</p>
                                )}
                                {submission?.status === 'PASSED' && (
                                    <p className="empty-state">✅ Passed</p>
                                )}
                                {submission?.status === 'FAILED' && (
                                    <p className="empty-state">❌ Failed</p>
                                )}
                                {canEdit && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        disabled={submittingId === dq.id}
                                        onClick={() => handleSubmitQuestion(dq.id)}
                                    >
                                        {submittingId === dq.id
                                            ? 'Submitting...'
                                            : submission ? 'Update Submission' : 'Submit'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="code-block">
                                <pre><code>{codeDrafts[dq.id] || 'No submission.'}</code></pre>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default DuelDetail;
