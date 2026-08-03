import { useState } from 'react';

// Added handleDeleteComment and myUserId to the props
const CommentNode = ({ comment, handleAddReply, handleDeleteComment, myUserId }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');

    const submitReply = (e) => {
        e.preventDefault();
        handleAddReply(comment.id, replyText);
        setIsReplying(false);
        setReplyText('');
    };

    return (
        <div style={{ marginTop: '15px' }}>
            
            {/* 
                If the comment is deleted, we lower the opacity to 0.5 
                and change the border color so it visually fades into the background.
            */}
            <div style={{ 
                borderLeft: '2px solid rgba(255, 255, 255, 0.1)', 
                paddingLeft: '15px', 
                opacity: comment.is_deleted ? 0.5 : 1 
            }}>
                <strong style={{ color: '#f8fafc', fontSize: '14px' }}>
                    {comment.is_deleted ? '[deleted]' : comment.User?.username}
                </strong>
                
                <p style={{ 
                    marginTop: '4px', 
                    color: '#94a3b8', 
                    fontSize: '15px', 
                    fontStyle: comment.is_deleted ? 'italic' : 'normal' 
                }}>
                    {comment.text_content}
                </p>
                
                {/* Only show actions if the comment is NOT deleted */}
                {!comment.is_deleted && (
                    <div style={{ display: 'flex', gap: '15px', marginTop: '6px' }}>
                        <button 
                            onClick={() => setIsReplying(!isReplying)}
                            style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                        >
                            {isReplying ? 'Cancel' : 'Reply'}
                        </button>

                        {/* Only show the Delete button if I am the author of this comment */}
                        {myUserId === comment.UserId && (
                            <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}

                {isReplying && !comment.is_deleted && (
                    <form onSubmit={submitReply} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <input 
                            type="text" 
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..." 
                            autoFocus
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: '13px' }}
                        />
                        <button type="submit" className="submit-post-btn" style={{ padding: '8px 15px', fontSize: '13px' }}>Post</button>
                    </form>
                )}
            </div>

            {/* Recursively render replies. We MUST pass down the new props here too! */}
            {comment.Replies && comment.Replies.length > 0 && (
                <div style={{ marginLeft: '20px' }}>
                    {comment.Replies.map(reply => (
                        <CommentNode 
                            key={reply.id} 
                            comment={reply} 
                            handleAddReply={handleAddReply} 
                            handleDeleteComment={handleDeleteComment} // Keep passing it down
                            myUserId={myUserId}                       // Keep passing it down
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentNode;