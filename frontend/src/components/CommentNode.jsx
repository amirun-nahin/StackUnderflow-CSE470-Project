import { useState } from 'react';
import CodeBlock from './CodeBlock';

// Added handleDeleteComment and myUserId to the props
const CommentNode = ({ comment, handleAddReply, handleDeleteComment, myUserId }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyCode, setReplyCode] = useState('');
    const [showReplyCode, setShowReplyCode] = useState(false);

    const submitReply = (e) => {
        e.preventDefault();
        handleAddReply(comment.id, replyText, showReplyCode ? replyCode : null);
        setIsReplying(false);
        setReplyText('');
        setReplyCode('');
        setShowReplyCode(false);
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

                {!comment.is_deleted && comment.code_snippet && (
                    <CodeBlock code={comment.code_snippet} />
                )}

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
                    <form onSubmit={submitReply} className="comment__reply-form comment__reply-form--stacked">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            autoFocus
                        />
                        {showReplyCode && (
                            <textarea
                                className="code-textarea"
                                value={replyCode}
                                onChange={(e) => setReplyCode(e.target.value)}
                                placeholder="Paste code snippet..."
                            />
                        )}
                        <div className="comment__reply-form-actions">
                            <button
                                type="button"
                                className="btn-ghost btn-sm"
                                onClick={() => setShowReplyCode(!showReplyCode)}
                            >
                                {showReplyCode ? '- Remove Code' : '+ Add Code'}
                            </button>
                            <button type="submit" className="btn btn-primary btn-sm">Post</button>
                        </div>
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
