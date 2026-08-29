const EloCard = ({ elo }) => {
    return (
        <div className="panel elo-card">
            <h3 className="section-heading">Elo Rating</h3>
            <div className="elo-card__value">{elo ?? 1000}</div>
            <p className="elo-card__caption">Calculated from your performance in:</p>
            <ul className="elo-card__sources">
                <li>
                    <span className="elo-card__source-icon">⚔️</span>
                    1v1 Duels
                </li>
                <li>
                    <span className="elo-card__source-icon">🎯</span>
                    Micro-Bounties
                </li>
                <li>
                    <span className="elo-card__source-icon">🏆</span>
                    Timed Competitions
                </li>
            </ul>
        </div>
    );
};

export default EloCard;
