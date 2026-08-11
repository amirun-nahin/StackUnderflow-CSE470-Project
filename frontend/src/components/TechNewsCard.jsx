import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TechNewsCard = () => {
    const [activeTab, setActiveTab] = useState('news');
    const [articles, setArticles] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [tag, setTag] = useState('');
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('accessToken');

    const fetchNews = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/news', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setArticles(data.articles);
                setTag(data.tag);
            }
        } catch (err) {
            console.error('Error fetching news:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookmarks = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/news/bookmarks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBookmarks(data);
            }
        } catch (err) {
            console.error('Error fetching bookmarks:', err);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [token]);

    const toggleTab = (tab) => {
        setActiveTab(tab);
        if (tab === 'saved') fetchBookmarks();
    };

    const handleBookmarkToggle = async (article) => {
        try {
            const res = await fetch('http://localhost:3001/api/news/bookmark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: article.title,
                    url: article.url,
                    source: article.source,
                    external_id: article.external_id || article.id
                })
            });

            if (res.ok) {
                const result = await res.json();
                setArticles(prev => prev.map(art => {
                    if (art.url === article.url) {
                        return { ...art, isBookmarked: result.isBookmarked };
                    }
                    return art;
                }));
                if (activeTab === 'saved') fetchBookmarks();
            }
        } catch (err) {
            console.error('Error toggling bookmark:', err);
        }
    };

    return (
        <div className="panel">
            <div className="news-panel-header">
                <h3>Tech News</h3>
                <div className="news-tabs">
                    <button
                        className={`news-tab-btn ${activeTab === 'news' ? 'news-tab-btn--active' : ''}`}
                        onClick={() => toggleTab('news')}
                    >
                        For You
                    </button>
                    <button
                        className={`news-tab-btn ${activeTab === 'saved' ? 'news-tab-btn--active' : ''}`}
                        onClick={() => toggleTab('saved')}
                    >
                        Saved
                    </button>
                </div>
            </div>

            {activeTab === 'news' && tag && (
                <span className="news-tag-badge">#{tag}</span>
            )}

            {loading ? (
                <p className="empty-state">Loading news...</p>
            ) : activeTab === 'news' ? (
                <div className="news-list">
                    {articles.map((art, idx) => (
                        <div key={idx} className="news-item">
                            <div className="news-item__content">
                                <Link
                                    to={`/news/${art.external_id}`}
                                    className="news-item__link"
                                >
                                    {art.title}
                                </Link>
                                <span className="news-item__source">{art.source}</span>
                            </div>
                            <button
                                className={`news-bookmark-btn ${art.isBookmarked ? 'news-bookmark-btn--active' : ''}`}
                                onClick={() => handleBookmarkToggle(art)}
                                title={art.isBookmarked ? 'Remove Bookmark' : 'Save Article'}
                            >
                                {art.isBookmarked ? '★' : '☆'}
                            </button>
                        </div>
                    ))}
                    {articles.length === 0 && <p className="empty-state">No news found.</p>}
                </div>
            ) : (
                <div className="news-list">
                    {bookmarks.map((bm) => (
                        <div key={bm.id} className="news-item">
                            <div className="news-item__content">
                                <Link
                                    to={`/news/${bm.external_id}`}
                                    className="news-item__link"
                                >
                                    {bm.title}
                                </Link>
                                <span className="news-item__source">{bm.source}</span>
                            </div>
                            <button
                                className="news-bookmark-btn news-bookmark-btn--active"
                                onClick={() => handleBookmarkToggle(bm)}
                                title="Remove Bookmark"
                            >
                                ★
                            </button>
                        </div>
                    ))}
                    {bookmarks.length === 0 && <p className="empty-state">No saved articles yet.</p>}
                </div>
            )}
        </div>
    );
};

export default TechNewsCard;