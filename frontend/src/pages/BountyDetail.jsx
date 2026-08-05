import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';

const BountyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [enrolledCount, setEnrolledCount] = useState(0);
    const [submissions, setSubmissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const [submissionCode, setSubmissionCode] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);
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

    const isOwner = post && myUserId === post.User?.id;
    const isEnrolled = enrollments.some(e => e.User?.id === myUserId);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const fetchAll = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const postRes = await fetch(`http://localhost:3001/api/posts/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!postRes.ok) {
                navigate('/');
                return;
            }
            const postData = await postRes.json();
            setPost(postData);

            const enrollRes = await fetch(`http://localhost:3001/api/bounty/${id}/enrollments`);
            if (enrollRes.ok) {
                const enrollData = await enrollRes.json();
                setEnrollments(enrollData.enrollments || []);
                setEnrolledCount(enrollData.count || 0);
            }

            if (postData.User?.id === myUserId) {
                const subsRes = await fetch(`http://localhost:3001/api/bounty/${id}/submissions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (subsRes.ok) {
                    const subsData = await subsRes.json();
                    setSubmissions(subsData);
                } else {
                    const errData = await subsRes.json().catch(() => ({}));
                    setErrorMessage(errData.error || 'Failed to load submissions.');
                }
            }
        } catch (error) {
            console.error('Failed to fetch bounty details', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleEnroll = async () => {
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/bounty/${id}/enroll`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setStatusMessage('You are enrolled in this bounty.');
                fetchAll();
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not enroll in this bounty.');
            }
        } catch (error) {
            console.error('Enroll error:', error);
            setErrorMessage('Could not connect to the server.');
        }
    };

    const handleUnenroll = async () => {
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/bounty/${id}/enroll`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setStatusMessage('You have left this bounty.');
                setHasSubmitted(false);
                setSubmissionCode('');
                fetchAll();
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not leave this bounty.');
            }
        } catch (error) {
            console.error('Unenroll error:', error);
            setErrorMessage('Could not connect to the server.');
        }
    };

    const handleSubmitSolution = async (e) => {
        e.preventDefault();
        if (!submissionCode.trim()) return;
        setSubmitting(true);
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/bounty/${id}/submit`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ code_content: submissionCode })
            });
            if (response.ok) {
                setHasSubmitted(true);
                setStatusMessage('Solution submitted.');
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not submit your solution.');
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

    const handleSubmitReview = async (submissionId) => {
        const draft = reviewDrafts[submissionId] || {};
        if (draft.marks === undefined || draft.marks === '') {
            setErrorMessage('Marks are required to review a submission.');
            return;
        }
        setErrorMessage('');
        setStatusMessage('');
        try {
            const response = await fetch(`http://localhost:3001/api/bounty/submission/${submissionId}/review`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({
                    marks: Number(draft.marks),
                    feedback: draft.feedback || undefined
                })
            });
            if (response.ok) {
                setStatusMessage('Review submitted.');
                fetchAll();
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not submit review.');
            }
        } catch (error) {
            console.error('Review error:', error);
            setErrorMessage('Could not connect to the server.');
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;
    if (!post) return null;

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} className="btn-ghost back-link">
                &larr; Back to Feed
            </button>

            <PostCard post={post} isDetailView={true} />

            {errorMessage && <p className="error-text">{errorMessage}</p>}
            {statusMessage && <p className="empty-state">{statusMessage}</p>}

            <div className="bounty-detail-section panel">
                <h3>Enrolled ({enrolledCount})</h3>

                {enrollments.length > 0 ? (
                    <div className="bounty-detail__enrollees">
                        {enrollments.map(enrollment => (
                            <div key={enrollment.id} className="discover-card__identity">
                                <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                <span>{enrollment.User?.username}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="empty-state">No one has enrolled yet.</p>
                )}

                {!isOwner && token && (
                    <div className="create-post-actions">
                        {isEnrolled ? (
                            <button className="btn btn-outline btn-sm" onClick={handleUnenroll} disabled={hasSubmitted}>
                                Leave Bounty
                            </button>
                        ) : (
                            <button className="btn btn-primary btn-sm" onClick={handleEnroll}>
                                Enroll
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isEnrolled && !isOwner && (
                <div className="bounty-detail-section panel">
                    <h3>Submit Your Solution</h3>
                    <form onSubmit={handleSubmitSolution} className="comment-form-row comment-form-row--stacked">
                        <textarea
                            className="code-textarea"
                            placeholder="Paste your solution code here..."
                            value={submissionCode}
                            onChange={(e) => setSubmissionCode(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : hasSubmitted ? 'Update Submission' : 'Submit Solution'}
                        </button>
                    </form>
                </div>
            )}

            {isOwner && (
                <div className="bounty-detail-section panel">
                    <h3>Review Submissions</h3>

                    {submissions && submissions.length > 0 ? (
                        <div className="bounty-detail__submissions">
                            {submissions.map(submission => (
                                <div key={submission.id} className="bounty-submission panel">
                                    <div className="post-header__identity">
                                        <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                        <strong>{submission.User?.username}</strong>
                                        <span className={`category-chip category-chip--${submission.status === 'REVIEWED' ? 'collab' : 'bounty'}`}>
                                            {submission.status}
                                        </span>
                                    </div>

                                    <div className="code-block">
                                        <pre><code>{submission.code_content}</code></pre>
                                    </div>

                                    {submission.status === 'REVIEWED' ? (
                                        <p className="empty-state">
                                            Marks: {submission.marks} {submission.feedback ? `— ${submission.feedback}` : ''}
                                        </p>
                                    ) : (
                                        <div className="profile-field-grid">
                                            <div className="input-group">
                                                <label>Marks</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={reviewDrafts[submission.id]?.marks ?? ''}
                                                    onChange={(e) => handleReviewChange(submission.id, 'marks', e.target.value)}
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
                                                onClick={() => handleSubmitReview(submission.id)}
                                            >
                                                Submit Review
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
        </div>
    );
};

export default BountyDetail;
