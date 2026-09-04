import { useState, useEffect } from 'react';

const CompetitionStats = ({ refreshKey }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch('http://localhost:3001/api/competition/stats', {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store'
                });
                if (response.ok) {
                    setStats(await response.json());
                }
            } catch (error) {
                console.error('Failed to fetch competition stats', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [refreshKey]);

    if (loading) {
        return (
            <div className="panel bounty-stats-panel">
                <p className="empty-state">Loading stats...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="panel bounty-stats-panel">
                <p className="empty-state">Could not load competition stats.</p>
            </div>
        );
    }

    return (
        <div className="panel bounty-stats-panel">
            <div className="quiz-header">
                <h3>Competition Stats</h3>
            </div>
            <div className="bounty-stats-grid">
                <div className="bounty-stats-grid__item">
                    <span className="profile-stat__value">{stats.active}</span>
                    <span className="profile-stat__label">Active</span>
                </div>
                <div className="bounty-stats-grid__item">
                    <span className="profile-stat__value">{stats.completed}</span>
                    <span className="profile-stat__label">Completed</span>
                </div>
                <div className="bounty-stats-grid__item">
                    <span className="profile-stat__value">{stats.myHosted}</span>
                    <span className="profile-stat__label">Hosted by Me</span>
                </div>
                <div className="bounty-stats-grid__item">
                    <span className="profile-stat__value">{stats.mySubmitted}</span>
                    <span className="profile-stat__label">Submitted by Me</span>
                </div>
            </div>
        </div>
    );
};

export default CompetitionStats;
