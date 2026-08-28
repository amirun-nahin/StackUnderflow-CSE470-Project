import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PostCard from '../components/PostCard';
import CommentNode from '../components/CommentNode';

const PostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [commentTree, setCommentTree] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [newCommentCode, setNewCommentCode] = useState('');
    const [showCommentCode, setShowCommentCode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateOfId, setDuplicateOfId] = useState('');
    const [flaggingDuplicate, setFlaggingDuplicate] = useState(false);
    const [duplicateError, setDuplicateError] = useState('');

    const [suggesting, setSuggesting] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [suggestError, setSuggestError] = useState('');

    const token = localStorage.getItem('accessToken');
    // WE GRAB BOTH THE ID AND USERNAME NOW
    let myUserId = null;
    let myUsername = 'Me';

    if (token && token !== 'undefined' && token !== 'null') {
        try {
            if (token.includes('.')) {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                myUserId = decoded.id;
                myUsername = decoded.username;
            }
        } catch (error) {
            console.error('Corrupted token found, ignoring safely.', error);
        }
    }

    const buildTree = (flatComments) => {
        if (!flatComments) return [];
        const commentMap = {};
        const roots = [];

        flatComments.forEach(comment => {
            commentMap[comment.id] = { ...comment, Replies: [] };
        });

        flatComments.forEach(comment => {
            if (comment.ParentId) {
                if (commentMap[comment.ParentId]) {
                    commentMap[comment.ParentId].Replies.push(commentMap[comment.id]);
                }
            } else {
                roots.push(commentMap[comment.id]);
            }
        });
        return roots;
    };

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/posts/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setPost(data);
                    if (data.Comments) setCommentTree(buildTree(data.Comments));
                } else {
                    navigate('/');
                }
            } catch (error) {
                console.error("Failed to fetch post", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [id, token, navigate]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ text_content: newComment, code_snippet: showCommentCode ? newCommentCode : null })
            });

            if (response.ok) {
                const createdComment = await response.json();
                const commentWithUser = { ...createdComment, User: { username: myUsername }, Replies: [] };

                const currentComments = post.Comments || [];
                const newFlatList = [...currentComments, commentWithUser];

                setPost({ ...post, Comments: newFlatList });
                setCommentTree(buildTree(newFlatList));
                setNewComment('');
                setNewCommentCode('');
                setShowCommentCode(false);
            }
        } catch (error) {
            console.error("Failed to post comment", error);
        }
    };

    const handleAddReply = async (parentId, text, code) => {
        if (!text.trim()) return;

        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ text_content: text, code_snippet: code || null, ParentId: parentId })
            });

            if (response.ok) {
                const createdReply = await response.json();
                const replyWithUser = { ...createdReply, User: { username: myUsername }, Replies: [] };

                const currentComments = post.Comments || [];
                const newFlatList = [...currentComments, replyWithUser];

                setPost({ ...post, Comments: newFlatList });
                setCommentTree(buildTree(newFlatList));
            }
        } catch (error) {
            console.error("Failed to post reply", error);
        }
    };

    // Add an inline line comment to a Peer Review post's code snippet
    const handleAddCodeComment = async (lineNumber, text) => {
        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/code-comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ line_number: lineNumber, text_content: text })
            });

            if (response.ok) {
                const newCodeComment = await response.json();
                setPost((prev) => ({
                    ...prev,
                    CodeComments: [...(prev.CodeComments || []), newCodeComment]
                }));
            }
        } catch (error) {
            console.error("Failed to post code comment", error);
        }
    };

    // Handle Soft Deletion
    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;

        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/comment/${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                // Optimistically update the UI without refreshing
                const currentComments = post.Comments || [];
                const newFlatList = currentComments.map(c =>
                    c.id === commentId ? { ...c, text_content: '[The comment is deleted]', is_deleted: true } : c
                );

                setPost({ ...post, Comments: newFlatList });
                setCommentTree(buildTree(newFlatList));
            }
        } catch (error) {
            console.error("Failed to delete comment", error);
        }
    };
    // Q&A Moderation: toggle a comment as the post's best answer
    const handleMarkBestAnswer = async (commentId) => {
        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/comment/${commentId}/best-answer`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const { comment: updated } = await response.json();
                const currentComments = post.Comments || [];
                const newFlatList = currentComments.map((c) => {
                    if (c.id === updated.id) return { ...c, is_best_answer: updated.is_best_answer };
                    // Marking a new best answer unmarks any previous one on this post
                    if (updated.is_best_answer && c.is_best_answer) return { ...c, is_best_answer: false };
                    return c;
                });
                setPost({ ...post, Comments: newFlatList });
                setCommentTree(buildTree(newFlatList));
            }
        } catch (error) {
            console.error("Failed to mark best answer", error);
        }
    };

    // Q&A Moderation: ask AI to suggest which answer is best (doesn't mark it)
    const handleSuggestBestAnswer = async () => {
        setSuggesting(true);
        setSuggestError('');
        setSuggestion(null);
        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/suggest-best-answer`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setSuggestion(data);
            } else {
                setSuggestError(data.error || 'Failed to get a suggestion.');
            }
        } catch (error) {
            console.error("Failed to get suggestion", error);
            setSuggestError('Could not connect to the server.');
        } finally {
            setSuggesting(false);
        }
    };

    // Q&A Moderation: flag / dismiss this post as a duplicate
    const handleFlagDuplicate = async (e) => {
        e.preventDefault();
        if (!duplicateOfId.trim()) return;

        setFlaggingDuplicate(true);
        setDuplicateError('');
        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/flag-duplicate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ duplicate_of_post_id: duplicateOfId.trim() })
            });
            const data = await response.json();
            if (response.ok) {
                setPost((prev) => ({ ...prev, DuplicateOfPostId: data.DuplicateOfPostId }));
                setShowDuplicateModal(false);
                setDuplicateOfId('');
            } else {
                setDuplicateError(data.error || 'Failed to flag as duplicate.');
            }
        } catch (error) {
            console.error("Failed to flag duplicate", error);
            setDuplicateError('Could not connect to the server.');
        } finally {
            setFlaggingDuplicate(false);
        }
    };

    const handleDismissDuplicateFlag = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/flag-duplicate`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setPost((prev) => ({ ...prev, DuplicateOfPostId: null }));
            }
        } catch (error) {
            console.error("Failed to dismiss duplicate flag", error);
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;
    if (!post) return null;

    const isPostAuthor = post.UserId === myUserId;
    const topLevelAnswerCount = commentTree.filter((c) => !c.is_deleted).length;

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} className="btn-ghost back-link">
                &larr; Back to Feed
            </button>
            
            {post.DuplicateOfPostId && (
                <div className="duplicate-banner panel">
                    <span>
                        ⚠️ This post was flagged as a possible duplicate of{' '}
                        <Link to={`/post/${post.DuplicateOfPostId}`}>post #{post.DuplicateOfPostId}</Link>.
                    </span>
                    {isPostAuthor && (
                        <button className="btn-ghost btn-sm" onClick={handleDismissDuplicateFlag}>
                            Dismiss
                        </button>
                    )}
                </div>
            )}


            <PostCard
                post={post}
                isDetailView={true}
                onRepoJoinChange={(updatedJoins) =>
                    setPost((prev) => ({ ...prev, RepoRequestJoins: updatedJoins }))
                }
                onAddCodeComment={handleAddCodeComment}
            />

            {post.category === "REPO_REQUEST" && (
                <div className="repo-members-panel panel">
                    <h3>Joined Developers</h3>
                    {post.RepoRequestJoins && post.RepoRequestJoins.length > 0 ? (
                        <div className="repo-members-list">
                            {post.RepoRequestJoins.map((join) => (
                                <div key={join.UserId} className="repo-member-row">
                                    <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                    <Link to={`/profile/${join.User?.username}`} className="post-author">
                                        {join.User?.username || 'Unknown User'}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">No one has joined this repository request yet.</p>
                    )}
                </div>
            )}

            <div className="comments-section panel">
                <div className="comments-section__header">
                    <h3>Discussion</h3>
                    <button className="btn-ghost btn-sm" onClick={() => setShowDuplicateModal(true)}>
                        🚩 Flag as Duplicate
                    </button>
                </div>

                {isPostAuthor && topLevelAnswerCount > 0 && (
                    <div className="best-answer-suggestion">
                        <button className="btn btn-outline btn-sm" onClick={handleSuggestBestAnswer} disabled={suggesting}>
                            {suggesting ? 'Thinking...' : '🤖 Suggest Best Answer'}
                        </button>
                        {suggestError && <p className="error-text">{suggestError}</p>}
                        {suggestion && (
                            <div className="best-answer-suggestion__result">
                                <p>
                                    AI suggests <strong>{suggestion.suggested_username}</strong>'s answer — {suggestion.reason}
                                </p>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                        handleMarkBestAnswer(suggestion.suggested_comment_id);
                                        setSuggestion(null);
                                    }}
                                >
                                    Mark as Best Answer
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleAddComment} className="comment-form-row comment-form-row--stacked">
                    <textarea
                        className="post-textarea"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a new top-level comment..."
                    />
                    {showCommentCode && (
                        <textarea
                            className="code-textarea"
                            value={newCommentCode}
                            onChange={(e) => setNewCommentCode(e.target.value)}
                            placeholder="Paste code snippet..."
                        />
                    )}
                    <div className="create-post-actions">
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setShowCommentCode(!showCommentCode)}
                        >
                            {showCommentCode ? '- Remove Code' : '+ Add Code'}
                        </button>
                        <button type="submit" className="btn btn-primary">Post</button>
                    </div>
                </form>

                {commentTree.length > 0 ? (
                    <div className="comments-list">
                        {commentTree.map(comment => (
                            <CommentNode
                                key={comment.id}
                                comment={comment}
                                handleAddReply={handleAddReply}
                                handleDeleteComment={handleDeleteComment} // Passed down
                                myUserId={myUserId}                       // Passed down
                                isPostAuthor={isPostAuthor}
                                handleMarkBestAnswer={handleMarkBestAnswer}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="empty-state">No comments yet. Be the first!</p>
                )}
            </div>

            {showDuplicateModal && (
                <div className="modal-overlay" onClick={() => setShowDuplicateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Flag as Duplicate</h3>
                            <button className="modal-close-btn" onClick={() => setShowDuplicateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleFlagDuplicate} className="profile-edit-form">
                            <div className="input-group">
                                <label>Original Post ID</label>
                                <input
                                    type="number"
                                    value={duplicateOfId}
                                    onChange={(e) => setDuplicateOfId(e.target.value)}
                                    placeholder="e.g. 42"
                                    required
                                />
                                <p className="empty-state" style={{ marginTop: 'var(--space-2)' }}>
                                    Find this in the original post's URL — e.g. /post/<strong>42</strong>
                                </p>
                            </div>
                            {duplicateError && <p className="error-text">{duplicateError}</p>}
                            <div className="profile-edit-actions">
                                <button type="submit" className="btn btn-primary" disabled={flaggingDuplicate}>
                                    {flaggingDuplicate ? 'Flagging...' : 'Flag as Duplicate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostDetail;
