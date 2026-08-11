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
        <div className={`comment ${comment.is_deleted ? 'comment--deleted' : ''}`}>

            <div className="comment__body">
                <strong className="comment__author">
                    {comment.is_deleted ? '[deleted]' : comment.User?.username}
                </strong>

                <p className="comment__text">
                    {comment.is_deleted ? '[The comment is deleted]' : comment.text_content}
                </p>

                {/* Only show actions if the comment is NOT deleted */}
                {!comment.is_deleted && (
                    <div className="comment__actions">
                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className="btn-ghost btn-sm"
                        >
                            {isReplying ? 'Cancel' : 'Reply'}
                        </button>

                        {/* Only show the Delete button if I am the author of this comment */}
                        {myUserId === comment.UserId && (
                            <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="btn-ghost btn-ghost--danger btn-sm"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}

                {isReplying && !comment.is_deleted && (
                    <form onSubmit={submitReply} className="comment__reply-form">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary btn-sm">Post</button>
                    </form>
                )}
            </div>

            {/* Recursively render replies. We MUST pass down the new props here too! */}
            {comment.Replies && comment.Replies.length > 0 && (
                <div className="comment__replies">
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
