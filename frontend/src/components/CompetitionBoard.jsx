import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const getPhaseLabel = (competition) => {
    if (competition.phase === 'UPCOMING') {
        return `Starts ${new Date(competition.start_time).toLocaleString()}`;
    }
    if (competition.phase === 'ACTIVE') {
        const endTime = new Date(new Date(competition.start_time).getTime() + competition.duration_minutes * 60000);
        return `Live • ends ${endTime.toLocaleTimeString()}`;
    }
    return 'Closed';
};

const CompetitionBoard = () => {
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchBoard = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/competition/board');
            if (response.ok) {
                const data = await response.json();
                setCompetitions(data);
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Failed to load competitions.');
            }
        } catch (error) {
            console.error('Failed to fetch competition board', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoard();
    }, []);

    return (
        <div>
            <div className="hub-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <Link to="/host-competition" className="btn btn-outline btn-sm competition-board__host-btn">
                    + Host a Competition
                </Link>
            </div>

            {errorMessage && <p className="error-text">{errorMessage}</p>}
            {loading && <p className="empty-state">Loading competitions...</p>}

            {!loading && competitions.length === 0 && !errorMessage && (
                <p className="empty-state">No competitions yet.</p>
            )}

            <div className="posts-container">
                {competitions.map(competition => (
                    <Link
                        key={competition.id}
                        to={`/competition/${competition.id}`}
                        className="panel post-card post-card--review post-card--clickable"
                    >
                        <div className="post-header">
                            <div className="post-header__identity">
                                <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                <span className="post-author">{competition.User?.username}</span>
                            </div>
                            <div className="post-header__badges">
                                <span className="lang-chip">{competition.language}</span>
                                <span className={`category-chip category-chip--${competition.phase.toLowerCase()}`}>
                                    {competition.phase}
                                </span>
                            </div>
                        </div>

                        <div className="post-body">
                            <p className="post-text">{competition.title}</p>
                            <p className="discover-card__meta">{getPhaseLabel(competition)}</p>
                        </div>

                        <div className="post-footer card-actions-row">
                            <span className="discover-card__meta">
                                {competition.participant_count || 0} participants
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default CompetitionBoard;

