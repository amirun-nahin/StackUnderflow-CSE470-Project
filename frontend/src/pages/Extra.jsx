import { useState, useEffect } from 'react';

const FEATURES = [
    { key: 'portfolio', label: '📁 Portfolio' }
    // Future "extra" features get added here.
];

const TEMPLATES = ['MINIMAL', 'MODERN', 'CLASSIC'];
const ITEM_TYPES = ['PROJECT', 'SKILL', 'ACHIEVEMENT', 'EXPERIENCE', 'CUSTOM'];

const Extra = () => {
    const [activeFeature, setActiveFeature] = useState('portfolio');
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [itemType, setItemType] = useState('PROJECT');
    const [itemTitle, setItemTitle] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [addingItem, setAddingItem] = useState(false);

    const token = localStorage.getItem('accessToken');
    const myUsername = localStorage.getItem('username');

    const fetchPortfolio = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/portfolio/${myUsername}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                setPortfolio(await response.json());
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

    // Explicit, user-triggered only — this is the one call that costs real
    // API tokens, so it's never fired automatically (see backend for the
    // other token-saving measures: cooldown, capped prompt size, capped output).
    const handleGenerate = async () => {
        setGenerating(true);
        setGenerateError('');
        try {
            const response = await fetch('http://localhost:3001/api/portfolio/me/generate', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setPortfolio((prev) => ({ ...prev, headline: data.headline, last_generated_at: data.last_generated_at }));
            } else {
                setGenerateError(data.error || 'Failed to generate headline.');
            }
        } catch (error) {
            console.error('Failed to generate headline', error);
            setGenerateError('Could not connect to the server.');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;

    const templateClass = `portfolio-view--${(portfolio?.template || 'MINIMAL').toLowerCase()}`;

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
                                    No headline yet — add a few items, then click "Generate Headline" on the right.
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
                        </div>

                        <div className="panel">
                            <h3>Headline</h3>
                            <p className="empty-state" style={{ marginBottom: 'var(--space-3)' }}>
                                Uses AI to write a short summary from your added items.
                            </p>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleGenerate}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : '✨ Generate Headline'}
                            </button>
                            {generateError && <p className="error-text">{generateError}</p>}
                        </div>

                        <div className="panel">
                            <h3>Items</h3>
                            <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}>
                                + Add Item
                            </button>
                        </div>
                    </>
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
        </div>
    );
};

export default Extra;
