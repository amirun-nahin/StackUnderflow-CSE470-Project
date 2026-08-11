import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const NewsReader = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/news/article/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setArticle(data);
                } else {
                    setErrorMessage('Failed to load the article.');
                }
            } catch (error) {
                console.error("Error fetching article:", error);
                setErrorMessage('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchArticle();
    }, [id, token]);

    if (loading) return <div className="loading-state">Loading article...</div>;
    if (errorMessage) return <div className="page-container"><p className="error-text">{errorMessage}</p></div>;
    if (!article) return null;

    return (
        <div className="page-container">
            <button onClick={() => navigate('/')} className="btn-ghost back-link">
                &larr; Back To Feed
            </button>
            <div className="panel news-reader-panel">
                {article.cover_image && (
                    <img src={article.cover_image} alt="Cover" className="news-reader-cover" />
                )}
                <h1 className="news-reader-title">{article.title}</h1>
                <div className="post-header__identity">
                    <img src={article.user?.profile_image} alt="Author" className="avatar-circle avatar-circle--sm" />
                    <div>
                        <strong>{article.user?.name}</strong>
                        <p className="profile-stat__label">Published on {new Date(article.published_at).toLocaleDateString()}</p>
                    </div>
                </div>
                
                {/* Renders the raw HTML safely */}
                <div 
                    className="news-reader-content"
                    dangerouslySetInnerHTML={{ __html: article.body_html }} 
                />
            </div>
        </div>
    );
};

export default NewsReader;