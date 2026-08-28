import { useState, useEffect } from 'react';

const FEATURES = [
    { key: 'portfolio', label: '📁 Portfolio' },
    { key: 'ai-assistant', label: '🤖 AI Assistant' }
    // Future "extra" features get added here.
];

const TEMPLATES = ['MINIMAL', 'MODERN', 'CLASSIC'];
const ITEM_TYPES = ['PROJECT', 'SKILL', 'ACHIEVEMENT', 'EXPERIENCE', 'CUSTOM'];
const ASSISTANT_MODES = [
    { key: 'EXPLAIN', label: 'Explain Code' },
    { key: 'REVIEW', label: 'Review Code' },
    { key: 'CHAT', label: 'Ask a Question' }
];

const Extra = () => {
    const [activeFeature, setActiveFeature] = useState('portfolio');
    const token = localStorage.getItem('accessToken');
    const myUsername = localStorage.getItem('username');

    // ---------------- Portfolio state ----------------
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [itemType, setItemType] = useState('PROJECT');
    const [itemTitle, setItemTitle] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [addingItem, setAddingItem] = useState(false);

    const [showRepoPicker, setShowRepoPicker] = useState(false);
    const [githubRepos, setGithubRepos] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [repoError, setRepoError] = useState('');

    const [headlineDraft, setHeadlineDraft] = useState('');
    const [savingHeadline, setSavingHeadline] = useState(false);

    // ---------------- AI Assistant state ----------------
    const [assistantMode, setAssistantMode] = useState('EXPLAIN');
    const [assistantCode, setAssistantCode] = useState('');
    const [assistantQuestion, setAssistantQuestion] = useState('');
    const [assistantAnswer, setAssistantAnswer] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [assistantError, setAssistantError] = useState('');

    const fetchPortfolio = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/portfolio/${myUsername}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPortfolio(data);
                setHeadlineDraft(data.headline || '');
            }
        } catch (error) {
            console.error('Failed to fetch portfolio', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTemplateChange = async (template) => {
        try {
            const response = await fetch('http://localhost:3001/api/portfolio/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ template })
            });
            if (response.ok) {
                setPortfolio((prev) => ({ ...prev, template }));
            }
        } catch (error) {
            console.error('Failed to update template', error);
        }
    };

    const handleSaveHeadline = async () => {
        setSavingHeadline(true);
        try {
            const response = await fetch('http://localhost:3001/api/portfolio/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ headline: headlineDraft })
            });
            if (response.ok) {
                setPortfolio((prev) => ({ ...prev, headline: headlineDraft }));
            }
        } catch (error) {
            console.error('Failed to save headline', error);
        } finally {
            setSavingHeadline(false);
        }
    };

    const handleOpenRepoPicker = async () => {
        setShowRepoPicker(true);
        setLoadingRepos(true);
        setRepoError('');
        try {
            const response = await fetch('http://localhost:3001/api/github/repositories', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setGithubRepos(data);
            } else {
                setRepoError(data.error || 'Failed to load repositories.');
            }
        } catch (error) {
            console.error('Failed to fetch repositories', error);
            setRepoError('Could not connect to the server.');
        } finally {
            setLoadingRepos(false);
        }
    };

    const handlePickRepo = (repo) => {
        setItemTitle(repo.full_name || repo.name);
        setItemDescription(repo.description || '');
        setShowRepoPicker(false);
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!itemTitle.trim()) return;

        setAddingItem(true);
        try {
            const response = await fetch('http://localhost:3001/api/portfolio/me/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ type: itemType, title: itemTitle, description: itemDescription })
            });
            if (response.ok) {
                const newItem = await response.json();
                setPortfolio((prev) => ({
                    ...prev,
                    PortfolioItems: [...(prev.PortfolioItems || []), newItem]
                }));
                setItemTitle('');
                setItemDescription('');
                setItemType('PROJECT');
                setShowAddModal(false);
                setErrorMessage('');
            } else {
                const errData = await response.json();
                setErrorMessage(errData.error || 'Failed to add item.');
            }
        } catch (error) {
            console.error('Failed to add item', error);
        } finally {
            setAddingItem(false);
        }
    };

    const handleRemoveItem = async (itemId) => {
        try {
            const response = await fetch(`http://localhost:3001/api/portfolio/me/items/${itemId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                setPortfolio((prev) => ({
                    ...prev,
                    PortfolioItems: prev.PortfolioItems.filter((i) => i.id !== itemId)
                }));
            }
        } catch (error) {
            console.error('Failed to remove item', error);
        }
    };

    const handleAskAssistant = async (e) => {
        e.preventDefault();
        setAssistantLoading(true);
        setAssistantError('');
        setAssistantAnswer('');
        try {
            const response = await fetch('http://localhost:3001/api/ai-assistant/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mode: assistantMode, code: assistantCode, question: assistantQuestion })
            });
            const data = await response.json();
            if (response.ok) {
                setAssistantAnswer(data.answer);
            } else {
                setAssistantError(data.error || 'Failed to get a response.');
            }
        } catch (error) {
            console.error('Assistant request failed', error);
            setAssistantError('Could not connect to the server.');
        } finally {
            setAssistantLoading(false);
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;

    const templateClass = `portfolio-view--${(portfolio?.template || 'MINIMAL').toLowerCase()}`;
    const pdfUrl = `http://localhost:3001/api/portfolio/${myUsername}/pdf?template=${portfolio?.template || 'MINIMAL'}`;

    return (
        <div className="extra-layout">
            {/* LEFT: nav for extra features */}
            <aside className="extra-nav">
                <div className="panel">
                    <h3>Extra</h3>
                    <nav className="extra-nav-list">
                        {FEATURES.map((f) => (
                            <button
                                key={f.key}
                                className={`extra-nav-item ${activeFeature === f.key ? 'extra-nav-item--active' : ''}`}
                                onClick={() => setActiveFeature(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* MIDDLE: the active feature's content */}
            <main className="extra-main">
                {errorMessage && <p className="error-text">{errorMessage}</p>}

                {activeFeature === 'portfolio' && (
                    <div className={`portfolio-view ${templateClass}`}>
                        <div className="panel portfolio-headline-panel">
                            <h1 className="discover-heading">My Portfolio</h1>
                            {portfolio?.headline ? (
                                <p className="portfolio-headline-text">{portfolio.headline}</p>
                            ) : (
                                <p className="empty-state">
                                    No summary yet — write one from the panel on the right.
                                </p>
                            )}
                        </div>
                        
                        <div className="portfolio-items-grid">
                            {portfolio?.PortfolioItems?.length > 0 ? (
                                portfolio.PortfolioItems.map((item) => (
                                    <div key={item.id} className="panel portfolio-item-card">
                                        <div className="portfolio-item-card__header">
                                            <span className="repo-meta-chip">{item.type}</span>
                                            <button
                                                className="modal-close-btn"
                                                onClick={() => handleRemoveItem(item.id)}
                                                aria-label="Remove item"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <h4>{item.title}</h4>
                                        {item.description && <p className="post-text">{item.description}</p>}
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state">
                                    Your portfolio is empty. Add your first item from the panel on the right.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {activeFeature === 'ai-assistant' && (
                    <div className="ai-assistant-view">
                        <div className="panel">
                            <h1 className="discover-heading">AI Coding Assistant</h1>
                            <p className="empty-state">
                                Get an instant code explanation, an automated review, or ask a general coding question.
                            </p>
                        </div>

                        <div className="panel">
                            {assistantLoading ? (
                                <p className="empty-state">Thinking...</p>
                            ) : assistantError ? (
                                <p className="error-text">{assistantError}</p>
                            ) : assistantAnswer ? (
                                <div className="ai-assistant-answer">{assistantAnswer}</div>
                            ) : (
                                <p className="empty-state">Your answer will appear here.</p>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* RIGHT: options menu for the active feature */}
            <aside className="extra-options">
                {activeFeature === 'portfolio' && (
                    <>
                        <div className="panel">
                            <h3>Template</h3>
                            <div className="portfolio-template-picker">
                                {TEMPLATES.map((t) => (
                                    <button
                                        key={t}
                                        className={`btn btn-sm ${portfolio?.template === t ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => handleTemplateChange(t)}
                                    >
                                        {t.charAt(0) + t.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                            <a href={pdfUrl} download className="btn btn-primary btn-sm portfolio-download-btn">
                                ⬇ Download PDF
                            </a>
                        </div>

                        <div className="panel">
                            <h3>Summary</h3>
                            <textarea
                                className="post-textarea"
                                value={headlineDraft}
                                onChange={(e) => setHeadlineDraft(e.target.value)}
                                placeholder="Write a short summary about yourself..."
                            />
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={handleSaveHeadline}
                                disabled={savingHeadline}
                            >
                                {savingHeadline ? 'Saving...' : 'Save Summary'}
                            </button>
                        </div>

                        <div className="panel">
                            <h3>Items</h3>
                            <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}>
                                + Add Item
                            </button>
                        </div>
                    </>
                )}

                {activeFeature === 'ai-assistant' && (
                    <div className="panel">
                        <h3>Mode</h3>
                        <div className="portfolio-template-picker">
                            {ASSISTANT_MODES.map((m) => (
                                <button
                                    key={m.key}
                                    className={`btn btn-sm ${assistantMode === m.key ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setAssistantMode(m.key)}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleAskAssistant} className="ai-assistant-form">
                            {(assistantMode === 'EXPLAIN' || assistantMode === 'REVIEW') && (
                                <textarea
                                    className="code-textarea"
                                    value={assistantCode}
                                    onChange={(e) => setAssistantCode(e.target.value)}
                                    placeholder="Paste your code here..."
                                    required
                                />
                            )}
                            {assistantMode === 'CHAT' && (
                                <>
                                    <textarea
                                        className="post-textarea"
                                        value={assistantQuestion}
                                        onChange={(e) => setAssistantQuestion(e.target.value)}
                                        placeholder="Ask a coding question..."
                                        required
                                    />
                                    <textarea
                                        className="code-textarea"
                                        value={assistantCode}
                                        onChange={(e) => setAssistantCode(e.target.value)}
                                        placeholder="(Optional) Paste related code..."
                                    />
                                </>
                            )}
                            <button type="submit" className="btn btn-primary btn-sm" disabled={assistantLoading}>
                                {assistantLoading ? 'Asking...' : 'Ask'}
                            </button>
                        </form>
                    </div>
                )}
            </aside>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Portfolio Item</h3>
                            <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAddItem} className="profile-edit-form">
                            <div className="input-group">
                                <label>Type</label>
                                <select className="select-input" value={itemType} onChange={(e) => setItemType(e.target.value)}>
                                    {ITEM_TYPES.map((t) => (
                                        <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                            </div>
                            {itemType === 'PROJECT' && (
                                <button type="button" className="btn btn-outline btn-sm" onClick={handleOpenRepoPicker}>
                                    Import from GitHub
                                </button>
                            )}
                            <div className="input-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={itemTitle}
                                    onChange={(e) => setItemTitle(e.target.value)}
                                    placeholder="e.g. Stack Underflow"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea
                                    className="post-textarea"
                                    value={itemDescription}
                                    onChange={(e) => setItemDescription(e.target.value)}
                                    placeholder="A sentence or two about it..."
                                />
                            </div>
                            <div className="profile-edit-actions">
                                <button type="submit" className="btn btn-primary" disabled={addingItem}>
                                    {addingItem ? 'Adding...' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRepoPicker && (
                <div className="modal-overlay" onClick={() => setShowRepoPicker(false)}>
                    <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Import from GitHub</h3>
                            <button className="modal-close-btn" onClick={() => setShowRepoPicker(false)}>✕</button>
                        </div>
                        {loadingRepos ? (
                            <p className="profile-field__value profile-field__value--muted">Loading repositories...</p>
                        ) : repoError ? (
                            <p className="github-error">{repoError}</p>
                        ) : githubRepos.length === 0 ? (
                            <p className="empty-state">No repositories found on this GitHub account.</p>
                        ) : (
                            <div className="github-repo-list">
                                {githubRepos.map((repo) => (
                                    <div
                                        key={repo.id}
                                        className="github-repo-item github-repo-item--pickable"
                                        onClick={() => handlePickRepo(repo)}
                                    >
                                        <span className="github-repo-item__name">{repo.full_name}</span>
                                        {repo.description && (
                                            <p className="github-repo-item__desc">{repo.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Extra;
