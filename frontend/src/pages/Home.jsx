import { useState, useEffect } from 'react';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import { useNavigate } from 'react-router-dom';

const Home = ({ activeFeed }) => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
    } else {
      setPage(1);
      fetchFeed(1, activeFeed);
    }
  }, [navigate, activeFeed]);

  const fetchFeed = async (pageNum, feedType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');

      const endpoint = feedType === 'global'
        ? `http://localhost:3001/api/posts/feed?page=${pageNum}`
        : `http://localhost:3001/api/posts/feed/following?page=${pageNum}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      if (pageNum === 1) {
        setPosts(data);
      } else {
        setPosts((prevPosts) => [...prevPosts, ...data]);
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchFeed(next, activeFeed);
  };

  const handlePostCreated = (newPost) => {
      // Only instantly inject the post if we are on the global feed
      if (activeFeed === 'global') {
          setPosts([newPost, ...posts]);
      }
  };

  return (
    <div className="home-layout">
      {/* LEFT SIDEBAR: Discover / Network */}
      <aside className="left-sidebar panel">
        <h3>My Network</h3>
        <p>Peers list coming soon...</p>
      </aside>

      {/* CENTER: Feed & Post Creation */}
      <main className="feed-column">
        <CreatePost onPostCreated={handlePostCreated} />

        <div className="posts-container">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {posts.length === 0 && !loading && (
             <div className="empty-state">No posts found in this feed.</div>
          )}
        </div>

        {posts.length > 0 && (
          <button
            className="btn btn-outline load-more-btn"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'See More'}
          </button>
        )}
      </main>

      {/* RIGHT SIDEBAR: Quizzes / Challenges */}
      <aside className="right-sidebar panel">
        <h3>Trending Challenges</h3>
        <p>Daily Wordle coming soon...</p>
      </aside>
    </div>
  );
};

export default Home;
