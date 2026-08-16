import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

const BountyBoard = () => {
    const [bounties, setBounties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [enrollingId, setEnrollingId] = useState(null);

    const token = localStorage.getItem('accessToken');
    const myUserId = getMyUserId(token);

    const fetchBoard = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/bounty/board');
            if (response.ok) {
                const data = await response.json();
                setBounties(data);
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Failed to load bounty board.');
            }
        } catch (error) {
            console.error('Failed to fetch bounty board', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoard();
    }, []);

    const handleEnroll = async (postId) => {
        if (!token) return;
        setEnrollingId(postId);
        setErrorMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/bounty/${postId}/enroll`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setBounties(prev => prev.map(b => {
                    if (b.id !== postId) return b;
                    return {
                        ...b,
                        enrolled_count: (b.enrolled_count || 0) + 1,
                        enrolled_users: [...(b.enrolled_users || []), { id: myUserId }]
                    };
                }));
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not enroll in this bounty.');
            }
        } catch (error) {
            console.error('Enroll error:', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setEnrollingId(null);
        }
    };

    if (loading) return <p className="empty-state">Loading bounties...</p>;

    return (
        <div className="bounty-board">
            {errorMessage && <p className="error-text">{errorMessage}</p>}

            {bounties.length === 0 && !errorMessage && (
                <p className="empty-state">No open bounties right now.</p>
            )}

            <div className="posts-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bounties.map(bounty => {
                    const isOwner = myUserId === bounty.User?.id;
                    const isEnrolled = bounty.enrolled_users?.some(u => u.id === myUserId);

                    return (
                        <div key={bounty.id} className="post-card panel post-card--bounty post-card--clickable">
                            {/* Card Header: User Identity & Badge */}
                            <div className="post-header">
                                <div className="post-header__identity">
                                    <div className="avatar-circle avatar-circle--xs">🧑‍💻</div>
                                    <span className="username" style={{ fontWeight: 600 }}>
                                        {bounty.User?.username || 'Bounty Host'}
                                    </span>
                                </div>
                                <div className="post-header__badges">
                                    <span className="badge">BOUNTY</span>
                                </div>
                            </div>

                            {/* Card Body: Content & Meta Info */}
                            <div className="post-body post-body--clickable">
                                <Link to={`/bounty/${bounty.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-color, inherit)' }}>
                                        {bounty.text_content}
                                    </h3>
                                </Link>

                                <div className="bounty-card__meta" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    {typeof bounty.bounty_reward_points === 'number' && (
                                        <span className="bounty-meta-chip bounty-meta-chip--reward">
                                            🏆 {bounty.bounty_reward_points} pts
                                        </span>
                                    )}
                                    {bounty.bounty_deadline && (
                                        <span className="bounty-meta-chip">
                                            ⏳ Due {new Date(bounty.bounty_deadline).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Card Footer: Enrolled Users & Action Button */}
                            <div className="post-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="bounty-card__enrolled" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div className="bounty-card__avatars">
                                        {(bounty.enrolled_users || []).slice(0, 4).map((user, idx) => (
                                            <div key={user.id ?? idx} className="avatar-circle avatar-circle--xs" title={user.username}>
                                                🧑‍💻
                                            </div>
                                        ))}
                                    </div>
                                    <span className="bounty-card__enrolled-count">
                                        {bounty.enrolled_count || 0} enrolled
                                    </span>
                                </div>

                                {!isOwner && (
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${isEnrolled ? 'btn-outline' : 'btn-primary'}`}
                                        disabled={isEnrolled || enrollingId === bounty.id || !token}
                                        onClick={() => handleEnroll(bounty.id)}
                                    >
                                        {isEnrolled ? 'Enrolled' : enrollingId === bounty.id ? 'Enrolling...' : 'Enroll'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BountyBoard;
