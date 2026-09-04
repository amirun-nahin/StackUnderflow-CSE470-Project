import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BarChart from '../components/BarChart';

const Milestones = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchMilestones = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/milestones', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                } else {
                    const errData = await response.json().catch(() => ({}));
                    setErrorMessage(errData.error || 'Failed to load milestones.');
                }
            } catch (error) {
                console.error('Failed to fetch milestones', error);
                setErrorMessage('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };

        fetchMilestones();
    }, [token, navigate]);

    if (loading) return <div className="loading-state">Loading...</div>;

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} className="btn-ghost back-link">
                &larr; Back
            </button>

            <h1 className="discover-heading">Progress</h1>

            {errorMessage && <p className="error-text">{errorMessage}</p>}

            {data && (
                <>
                    <BarChart
                        title="Posts"
                        bars={[
                            { label: 'Average', value: data.posts?.average },
                            { label: 'Highest', value: data.posts?.highest },
                            { label: 'You', value: data.posts?.mine, highlight: true }
                        ]}
                    />

                    <BarChart
                        title="Bounty Completions"
                        bars={[
                            { label: 'Average', value: data.bounties?.average },
                            { label: 'Highest', value: data.bounties?.highest },
                            { label: 'You', value: data.bounties?.mine, highlight: true }
                        ]}
                    />

                    <BarChart
                        title="Points"
                        bars={[
                            { label: 'Average', value: data.points?.average },
                            { label: 'Highest', value: data.points?.highest },
                            { label: 'You', value: data.points?.mine, highlight: true }
                        ]}
                    />

                    <div className="milestone-stats-grid">
                        <div className="panel milestone-stat-card">
                            <span className="profile-stat__value">{data.followers_count ?? 0}</span>
                            <span className="profile-stat__label">Followers</span>
                        </div>
                        <div className="panel milestone-stat-card">
                            <span className="profile-stat__value">{data.repo_requests_count ?? 0}</span>
                            <span className="profile-stat__label">Repositories Requested</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Milestones;
