import { useState } from 'react';
import CodeBlock from './CodeBlock';

// Added handleDeleteComment and myUserId to the props
const CommentNode = ({ comment, handleAddReply, handleDeleteComment, myUserId, isPostAuthor, handleMarkBestAnswer }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyCode, setReplyCode] = useState('');
    const [showReplyCode, setShowReplyCode] = useState(false);

    // Best answer marking only makes sense on top-level answers, not replies
    const isTopLevel = !comment.ParentId;

    const submitReply = (e) => {
        e.preventDefault();
        handleAddReply(comment.id, replyText, showReplyCode ? replyCode : null);
        setIsReplying(false);
        setReplyText('');
        setReplyCode('');
        setShowReplyCode(false);
    };

    return (
        <div className={`comment ${comment.is_deleted ? 'comment--deleted' : ''} ${comment.is_best_answer ? 'comment--best-answer' : ''}`}>

            <div className="comment__body">
                <div className="comment__author-row">
                    <strong className="comment__author">
                        {comment.is_deleted ? '[deleted]' : comment.User?.username}
                    </strong>
                    {comment.is_best_answer && <span className="best-answer-badge">★ Best Answer</span>}
                </div>

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

                        {/* Only the post author can mark/unmark a best answer, and only on top-level answers */}
                        {isPostAuthor && isTopLevel && (
                            <button
                                onClick={() => handleMarkBestAnswer(comment.id)}
                                className="btn-ghost btn-sm"
                            >
                                {comment.is_best_answer ? 'Unmark Best Answer' : '★ Mark as Best Answer'}
                            </button>
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
                            isPostAuthor={isPostAuthor}
                            handleMarkBestAnswer={handleMarkBestAnswer}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentNode;
