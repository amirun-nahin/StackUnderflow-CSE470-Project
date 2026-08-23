import { useState } from 'react';

// Renders a code snippet with a copy-to-clipboard button. When `commentable`
// is true (Peer Review posts, detail view only), each line gets a line
// number and a hover "+" to leave an inline review comment on that line —
// existing comments render as green // comment-styled lines, like a real
// code editor.
const CodeBlock = ({ code, commentable = false, comments = [], onAddComment }) => {
    const [copied, setCopied] = useState(false);
    const [activeLine, setActiveLine] = useState(null);
    const [lineCommentText, setLineCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error('Failed to copy code', error);
        }
    };

    if (!commentable) {
        return (
            <div className="code-block">
                <div className="code-block__toolbar">
                    <button type="button" className="code-block__copy-btn" onClick={handleCopy}>
                        {copied ? '✓ Copied' : '⧉ Copy'}
                    </button>
                </div>
                <pre>
                    <code>{code}</code>
                </pre>
            </div>
        );
    }

    const lines = code.split('\n');

    const handleLineToggle = (lineNumber) => {
        setActiveLine(activeLine === lineNumber ? null : lineNumber);
        setLineCommentText('');
    };

    const handleSubmitLineComment = async (lineNumber) => {
        if (!lineCommentText.trim() || submitting) return;
        setSubmitting(true);
        try {
            await onAddComment(lineNumber, lineCommentText.trim());
            setLineCommentText('');
            setActiveLine(null);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="code-block code-block--commentable">
            <div className="code-block__toolbar">
                <button type="button" className="code-block__copy-btn" onClick={handleCopy}>
                    {copied ? '✓ Copied' : '⧉ Copy'}
                </button>
            </div>
            <div className="code-block__lines">
                {lines.map((line, i) => {
                    const lineNumber = i + 1;
                    const lineComments = comments.filter((c) => c.line_number === lineNumber);

                    return (
                        <div key={i} className="code-line">
                            <div className="code-line__row">
                                <span className="code-line__number">{lineNumber}</span>
                                <code className="code-line__content">{line.length ? line : ' '}</code>
                                <button
                                    type="button"
                                    className="code-line__add-btn"
                                    onClick={() => handleLineToggle(lineNumber)}
                                    aria-label={`Comment on line ${lineNumber}`}
                                >
                                    +
                                </button>
                            </div>

                            {lineComments.map((c) => (
                                <div key={c.id} className="code-line__row code-line__row--comment">
                                    <span className="code-line__number" />
                                    <code className="code-line__comment-text">
                                        // {c.User?.username || 'unknown'}: {c.text_content}
                                    </code>
                                </div>
                            ))}

                            {activeLine === lineNumber && (
                                <div className="code-line__row code-line__row--form">
                                    <span className="code-line__number" />
                                    <input
                                        type="text"
                                        className="code-line__input"
                                        value={lineCommentText}
                                        onChange={(e) => setLineCommentText(e.target.value)}
                                        placeholder="Leave a review comment on this line..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSubmitLineComment(lineNumber);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleSubmitLineComment(lineNumber)}
                                        disabled={submitting}
                                    >
                                        Comment
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CodeBlock;
