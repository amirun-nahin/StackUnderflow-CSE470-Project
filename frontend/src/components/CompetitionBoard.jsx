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
    const [expanded, setExpanded] = useState(true);

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
        <div className="competition-board">
            <button
                type="button"
                className="competition-board__toggle"
                onClick={() => setExpanded(!expanded)}
            >
                <h3>Coding Competitions</h3>
                <span>{expanded ? '▾' : '▸'}</span>
            </button>

            {expanded && (
                <div className="competition-board__body">
                    <Link to="/host-competition" className="btn btn-outline btn-sm competition-board__host-btn">
                        + Host a Competition
                    </Link>

                    {errorMessage && <p className="error-text">{errorMessage}</p>}
                    {loading && <p className="empty-state">Loading competitions...</p>}

                    {!loading && competitions.length === 0 && !errorMessage && (
                        <p className="empty-state">No competitions yet.</p>
                    )}

                    <div className="competition-board__list">
                        {competitions.map(competition => (
                            <Link
                                key={competition.id}
                                to={`/competition/${competition.id}`}
                                className="competition-card"
                            >
                                <div className="competition-card__title-row">
                                    <span className="competition-card__title">{competition.title}</span>
                                    <span className={`competition-phase-chip competition-phase-chip--${competition.phase.toLowerCase()}`}>
                                        {competition.phase}
                                    </span>
                                </div>
                                <p className="competition-card__meta">
                                    Hosted by {competition.User?.username} • {competition.language}
                                </p>
                                <p className="competition-card__status">{getPhaseLabel(competition)}</p>
                                <p className="competition-card__participants">
                                    {competition.participant_count || 0} participants
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompetitionBoard;
