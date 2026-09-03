import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

const DuelBoard = ({ variant = 'main' }) => {
    const navigate = useNavigate();
    const [duels, setDuels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [respondingId, setRespondingId] = useState(null);

    const [opponentUsername, setOpponentUsername] = useState('');
    const [language, setLanguage] = useState('PYTHON');
    const [questionCount, setQuestionCount] = useState(3);
    const [inviting, setInviting] = useState(false);

    const token = localStorage.getItem('accessToken');
    const myUserId = getMyUserId(token);

    const fetchDuels = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/duel/mine', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDuels(data);
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Failed to load duels.');
            }
        } catch (error) {
            console.error('Failed to fetch duels', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDuels();
    }, []);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!opponentUsername.trim()) return;
        setInviting(true);
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch('http://localhost:3001/api/duel/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    opponent_username: opponentUsername,
                    language,
                    question_count: Number(questionCount)
                })
            });
            if (response.ok) {
                setStatusMessage(`Challenge sent to ${opponentUsername}.`);
                setOpponentUsername('');
                fetchDuels();
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not send that challenge.');
            }
        } catch (error) {
            console.error('Invite error:', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setInviting(false);
        }
    };

    const handleRespond = async (duelId, accept) => {
        setRespondingId(duelId);
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/duel/${duelId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ accept })
            });
            if (response.ok) {
                setStatusMessage(accept ? 'Duel accepted! Questions are ready.' : 'Duel declined.');
                if (accept) {
                    navigate(`/duel/${duelId}`);
                } else {
                    fetchDuels();
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not respond to this duel.');
            }
        } catch (error) {
            console.error('Respond error:', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setRespondingId(null);
        }
    };

    if (loading) return <p className="empty-state">Loading duels...</p>;

    const invitesReceived = duels.filter(d => d.status === 'PENDING' && d.Opponent?.id === myUserId);
    const invitesSent = duels.filter(d => d.status === 'PENDING' && d.Challenger?.id === myUserId);
    const activeDuels = duels.filter(d => d.status === 'ACTIVE');
    const history = duels.filter(d => d.status === 'COMPLETED' || d.status === 'DECLINED');

    if (variant === 'sidebar') {
        const hasAnyPending = invitesReceived.length > 0 || invitesSent.length > 0 || activeDuels.length > 0;

        return (
            <>
                {errorMessage && <p className="error-text">{errorMessage}</p>}
                {statusMessage && <p className="empty-state">{statusMessage}</p>}

                {!hasAnyPending && (
                    <p className="empty-state">No active, sent, or received duels right now.</p>
                )}

                {activeDuels.length > 0 && (
                    <div className="panel">
                        <h4 className="section-heading">Active Duels</h4>
                        <div className="post-container">
                            {activeDuels.map(duel => (
                                <Link key={duel.id} to={`/duel/${duel.id}`} className="panel post-card post-card--collab post-card--clickable">
                                    <div className="post-header">
                                        <div className="post-header__identity">
                                            <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                            <span className="post-author">
                                                {duel.Challenger?.username} vs {duel.Opponent?.username}
                                            </span>
                                        </div>
                                        <div className="post-header__badges">
                                            <span className="lang-chip">{duel.language}</span>
                                            <span className="category-chip category-chip--active">ACTIVE</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {invitesReceived.length > 0 && (
                    <div className="panel">
                        <h4 className="section-heading">Received</h4>
                        <div className="posts-container">
                            {invitesReceived.map(duel => (
                                <div key={duel.id} className="panel post-card post-card--collab">
                                    <div className="post-header">
                                        <div className="post-header__identity">
                                            <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                            <span className="post-author">{duel.Challenger?.username} challenged you</span>
                                        </div>
                                        <div className="post-header__badges">
                                            <span className="lang-chip">{duel.language}</span>
                                        </div>
                                    </div>
                                    <div className="post-footer card-actions-row">
                                        <button
                                            className="btn btn-primary btn-sm"
                                            disabled={respondingId === duel.id}
                                            onClick={() => handleRespond(duel.id, true)}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            disabled={respondingId === duel.id}
                                            onClick={() => handleRespond(duel.id, false)}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {invitesSent.length > 0 && (
                    <div className="panel">
                        <h4 className="section-heading">Sent</h4>
                        <div className="post-container">
                            {invitesSent.map(duel => (
                                <div className="post-header">
                                    <div className="post-header__identity">
                                        <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                        <span className="post-author">Waiting for {duel.Opponent?.username}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </>
        );
    }

    // variant === 'main': the challenge form + history, for the middle column
    return (
        <div className="duel-board">
            {errorMessage && <p className="error-text">{errorMessage}</p>}
            {statusMessage && <p className="empty-state">{statusMessage}</p>}

            <div className="create-post-card panel">
                <h3 className="section-heading">Challenge Someone</h3>
                <form onSubmit={handleInvite} className="duel-invite-form">
                    <input
                        type="text"
                        placeholder="Opponent username"
                        value={opponentUsername}
                        onChange={(e) => setOpponentUsername(e.target.value)}
                        required
                    />
                    <select
                        className="select-input"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="PYTHON">Python</option>
                        <option value="JAVA">Java</option>
                        <option value="JAVASCRIPT">JavaScript</option>
                    </select>
                    <select
                        className="select-input"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(e.target.value)}
                    >
                        <option value={3}>3 Questions</option>
                        <option value={4}>4 Questions</option>
                        <option value={5}>5 Questions</option>
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={inviting}>
                        {inviting ? 'Sending...' : 'Send Challenge'}
                    </button>
                </form>
            </div>

            <div>
                <h4 className="section-heading">History</h4>
                {history.length > 0 ? (
                    <div className="posts-container">
                        {history.map(duel => (
                            <Link key={duel.id} to={`/duel/${duel.id}`} className="panel post-card post-card--collab post-card--clickable">
                                <div className="post-header">
                                    <div className="post-header__identity">
                                        <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                        <span className="post-author">
                                            {duel.Challenger?.username} vs {duel.Opponent?.username}
                                        </span >
                                        <p className="discover-card__meta">
                                        {duel.status === 'COMPLETED'
                                            ? `🏆 ${duel.Winner?.username || 'Both'} won`
                                            : 'Declined'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="empty-state">No past duels yet.</p>
                )}
            </div>
        </div>
    );
};

export default DuelBoard;
