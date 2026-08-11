import { useState, useEffect } from 'react';

const ActiveJobsCard = () => {
    const [jobs, setJobs] = useState([]);
    const [tag, setTag] = useState('');
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/jobs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setJobs(data.jobs);
                    setTag(data.tag);
                }
            } catch (err) {
                console.error('Error fetching jobs:', err);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchJobs();
    }, [token]);

    return (
        <div className="panel">
            <div className="news-panel-header">
                <h3>Active Jobs</h3>
                {tag && (
                    <span className="news-tag-badge">#{tag}</span>
                )}
            </div>

            {loading ? (
                <p className="empty-state">Loading jobs...</p>
            ) : (
                <div className="jobs-list">
                    {jobs.map((job, idx) => (
                        <div key={idx} className="news-item">
                            <div className="news-item__content">
                                <a
                                    href={job.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="news-item__link"
                                >
                                    {job.title} ↗
                                </a>
                                <span className="news-item__source">{job.company_name}</span>
                            </div>
                        </div>
                    ))}
                    {jobs.length === 0 && <p className="empty-state">No jobs found.</p>}
                </div>
            )}
        </div>
    );
};

export default ActiveJobsCard;