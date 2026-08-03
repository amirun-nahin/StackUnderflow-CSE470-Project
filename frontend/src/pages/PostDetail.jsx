import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    const myUserId = token ? JSON.parse(atob(token.split('.')[1])).id : null;
    const myUsername = token ? JSON.parse(atob(token.split('.')[1])).username : 'Me';

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

    // NEW: Handle Soft Deletion
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

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    if (!post) return null;

    return (
        <div className="home-container" style={{ display: 'block', maxWidth: '800px', margin: '30px auto' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '20px', cursor: 'pointer', background: 'none', border: 'none', color: '#38bdf8', fontWeight: 'bold' }}>
                &larr; Back to Feed
            </button>

            <PostCard post={post} isDetailView={true} />

            <div className="comments-section glass-panel" style={{ marginTop: '20px' }}>
                <h3>Discussion</h3>
                
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px', marginBottom: '30px', marginTop: '15px' }}>
                    <input 
                        type="text" 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a new top-level comment..." 
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc' }}
                    />
                    <button type="submit" className="submit-post-btn" style={{ padding: '10px 20px' }}>Post</button>
                </form>

                {commentTree.length > 0 ? (
                    <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                    <p style={{ color: '#94a3b8' }}>No comments yet. Be the first!</p>
                )}
            </div>
        </div>
    );
};

export default PostDetail;