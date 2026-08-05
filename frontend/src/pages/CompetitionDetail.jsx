import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const CompetitionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [competition, setCompetition] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [submissions, setSubmissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const [submissionCode, setSubmissionCode] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [reviewDrafts, setReviewDrafts] = useState({});

    const token = localStorage.getItem('accessToken');
    let myUserId = null;
    if (token && token !== 'undefined' && token !== 'null' && token.includes('.')) {
        try {
            myUserId = JSON.parse(atob(token.split('.')[1])).id;
        } catch (error) {
            console.error('Corrupted token found, ignoring safely.', error);
        }
    }

    const isHost = competition && myUserId === competition.User?.id;
    const hasQuestion = competition ? Object.prototype.hasOwnProperty.call(competition, 'question_content') : false;

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const fetchCompetition = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/competition/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Failed to load competition.');
                return null;
            }
            const data = await response.json();
            setCompetition(data);
            return data;
        } catch (error) {
            console.error('Failed to fetch competition', error);
            setErrorMessage('Could not connect to the server.');
            return null;
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/competition/${id}/leaderboard`);
            if (response.ok) {
                const data = await response.json();
                setLeaderboard(data);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard', error);
        }
    };

    const fetchAll = async () => {
        setLoading(true);
        setErrorMessage('');
        const data = await fetchCompetition();
        await fetchLeaderboard();

        if (data && myUserId === data.User?.id) {
            try {
                const subsRes = await fetch(`http://localhost:3001/api/competition/${id}/submissions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (subsRes.ok) {
                    const subsData = await subsRes.json();
                    setSubmissions(subsData);
                } else {
                    const errData = await subsRes.json().catch(() => ({}));
                    setErrorMessage(errData.error || 'Failed to load submissions.');
                }
            } catch (error) {
                console.error('Failed to fetch submissions', error);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSubmitSolution = async (e) => {
        e.preventDefault();
        if (!submissionCode.trim()) return;
        setSubmitting(true);
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/competition/${id}/submit`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ code_content: submissionCode })
            });
            if (response.ok) {
                setStatusMessage('Submission saved.');
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not submit your code.');
            }
        } catch (error) {
            console.error('Submit error:', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReviewChange = (submissionId, field, value) => {
        setReviewDrafts(prev => ({
            ...prev,
            [submissionId]: { ...prev[submissionId], [field]: value }
        }));
    };

    const handleEvaluate = async (submissionId) => {
        const draft = reviewDrafts[submissionId] || {};
        if (draft.score === undefined || draft.score === '') {
            setErrorMessage('A score is required to evaluate a submission.');
            return;
        }
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/competition/submission/${submissionId}/evaluate`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({
                    score: Number(draft.score),
                    time_complexity: draft.time_complexity || undefined,
                    feedback: draft.feedback || undefined
                })
            });
            if (response.ok) {
                setStatusMessage('Submission evaluated.');
                fetchAll();
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not evaluate this submission.');
            }
        } catch (error) {
            console.error('Evaluate error:', error);
            setErrorMessage('Could not connect to the server.');
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;
    if (!competition) return null;

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} className="btn-ghost back-link">
                &larr; Back
            </button>

            <div className="competition-detail-header panel">
                <div className="competition-card__title-row">
                    <h1 className="competition-detail-title">{competition.title}</h1>
                    <span className={`competition-phase-chip competition-phase-chip--${competition.phase.toLowerCase()}`}>
                        {competition.phase}
                    </span>
                </div>
                <p className="competition-card__meta">
                    Hosted by {competition.User?.username} • {competition.language}
                </p>
                {competition.description && (
                    <p className="post-text">{competition.description}</p>
                )}
                <p className="competition-card__meta">
                    Starts {new Date(competition.start_time).toLocaleString()} • Duration {competition.duration_minutes} min
                </p>
                <p className="competition-card__participants">
                    {competition.participant_count || 0} participants
                </p>
            </div>

            {errorMessage && <p className="error-text">{errorMessage}</p>}
            {statusMessage && <p className="empty-state">{statusMessage}</p>}

            {hasQuestion && (
                <div className="bounty-detail-section panel">
                    <h3>Question</h3>
                    <p className="post-text">{competition.question_content}</p>
                </div>
            )}

            {competition.phase === 'ACTIVE' && !isHost && (
                <div className="bounty-detail-section panel">
                    <h3>Submit Your Code</h3>
                    <form onSubmit={handleSubmitSolution} className="comment-form-row comment-form-row--stacked">
                        <textarea
                            className="code-textarea"
                            placeholder="Paste your code here..."
                            value={submissionCode}
                            onChange={(e) => setSubmissionCode(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </form>
                </div>
            )}

            {isHost && (
                <div className="bounty-detail-section panel">
                    <h3>Review Submissions</h3>

                    {submissions && submissions.length > 0 ? (
                        <div className="bounty-detail__submissions">
                            {submissions.map(submission => (
                                <div key={submission.id} className="bounty-submission panel">
                                    <div className="post-header__identity">
                                        <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                        <strong>{submission.User?.username}</strong>
                                        <span className={`category-chip category-chip--${submission.status === 'EVALUATED' ? 'collab' : 'bounty'}`}>
                                            {submission.status}
                                        </span>
                                    </div>

                                    <div className="code-block">
                                        <pre><code>{submission.code_content}</code></pre>
                                    </div>

                                    {submission.status === 'EVALUATED' ? (
                                        <p className="empty-state">
                                            Score: {submission.score}
                                            {submission.time_complexity ? ` — ${submission.time_complexity}` : ''}
                                            {submission.feedback ? ` — ${submission.feedback}` : ''}
                                        </p>
                                    ) : (
                                        <div className="profile-field-grid">
                                            <div className="input-group">
                                                <label>Score</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={reviewDrafts[submission.id]?.score ?? ''}
                                                    onChange={(e) => handleReviewChange(submission.id, 'score', e.target.value)}
                                                />
                                            </div>
                                            <div className="input-group">
                                                <label>Time Complexity</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. O(n log n)"
                                                    value={reviewDrafts[submission.id]?.time_complexity ?? ''}
                                                    onChange={(e) => handleReviewChange(submission.id, 'time_complexity', e.target.value)}
                                                />
                                            </div>
                                            <div className="input-group">
                                                <label>Feedback</label>
                                                <input
                                                    type="text"
                                                    value={reviewDrafts[submission.id]?.feedback ?? ''}
                                                    onChange={(e) => handleReviewChange(submission.id, 'feedback', e.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleEvaluate(submission.id)}
                                            >
                                                Submit Evaluation
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">No submissions yet.</p>
                    )}
                </div>
            )}

            <div className="bounty-detail-section panel">
                <h3>Leaderboard</h3>
                {leaderboard.length > 0 ? (
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Username</th>
                                <th>Score</th>
                                <th>Time Complexity</th>
                                <th>Submitted At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map(entry => (
                                <tr key={entry.rank}>
                                    <td>{entry.rank}</td>
                                    <td>{entry.user?.username}</td>
                                    <td>{entry.score}</td>
                                    <td>{entry.time_complexity || '—'}</td>
                                    <td>{new Date(entry.submitted_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="empty-state">No results yet.</p>
                )}
            </div>
        </div>
    );
};

export default CompetitionDetail;
