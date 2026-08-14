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
    const [loading, setLoading] = useState(true);

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
                body: JSON.stringify({ text_content: newComment })
            });

            if (response.ok) {
                const createdComment = await response.json();
                const commentWithUser = { ...createdComment, User: { username: myUsername }, Replies: [] };

                const currentComments = post.Comments || [];
                const newFlatList = [...currentComments, commentWithUser];

                setPost({ ...post, Comments: newFlatList });
                setCommentTree(buildTree(newFlatList));
                setNewComment('');
            }
        } catch (error) {
            console.error("Failed to post comment", error);
        }
    };

    const handleAddReply = async (parentId, text) => {
        if (!text.trim()) return;

        try {
            const response = await fetch(`http://localhost:3001/api/posts/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ text_content: text, ParentId: parentId })
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

    if (loading) return <div className="loading-state">Loading...</div>;
    if (!post) return null;

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} className="btn-ghost back-link">
                &larr; Back to Feed
            </button>

            <PostCard post={post} isDetailView={true} />

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
                <h3>Discussion</h3>

                <form onSubmit={handleAddComment} className="comment-form-row">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a new top-level comment..."
                    />
                    <button type="submit" className="btn btn-primary">Post</button>
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
                            />
                        ))}
                    </div>
                ) : (
                    <p className="empty-state">No comments yet. Be the first!</p>
                )}
            </div>
        </div>
    );
};

export default PostDetail;
