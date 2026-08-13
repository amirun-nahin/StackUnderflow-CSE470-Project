import { useState, useEffect } from 'react';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import { useNavigate, Link } from 'react-router-dom';
import BountyBoard from '../components/BountyBoard';
import CompetitionBoard from '../components/CompetitionBoard';
import TechNewsCard from '../components/TechNewsCard';
import ActiveJobsCard from '../components/ActiveJobsCard';
import DailyQuizCard from '../components/DailyQuizCard';

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

      const endpoint = feedType === 'following'
        ? `http://localhost:3001/api/posts/feed/following?page=${pageNum}`
        : `http://localhost:3001/api/posts/feed?page=${pageNum}`;

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

  const [unreadChats, setUnreadChats] = useState([]);
  useEffect(() => {
    const fetchUnread = () => {
      fetch('http://localhost:3001/api/chat/unread', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      })
      .then(res => res.json())
      .then(data => setUnreadChats(data))
      .catch(console.error);
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-layout">
      {/* LEFT SIDEBAR: Discover / Network & Competitions */}
      <aside className="left-sidebar">
        {/* Card 1: My Network */}
        <div className="panel">
          <h3>My Network</h3>
          {unreadChats.length > 0 ? (
            <div className="network-unread-list">
              <p className="network-unread-label">Unread Messages</p>
              {unreadChats.map(user => (
                <Link
                  key={user.id}
                  to="/chat"
                  state={{ openUser: user }}
                  className="network-unread-item"
                >
                  <span className="network-unread-username">{user.username}</span>
                  <span className="network-unread-dot">•</span>
                </Link>
              ))}
            </div>
          ) : (
            <p>No new messages.</p>
          )}
        </div>

        {/* Card 2: Tech News (NEW) */}
        <TechNewsCard />
        
        {/* Card 3: Active Jobs */}
        <ActiveJobsCard />

        {/* Card 3: Competitions */}
        <div className="panel">
          <CompetitionBoard />
        </div>
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

      {/* RIGHT SIDEBAR: Quizzes / Challenges & Bounties */}
      <aside className="right-sidebar">
        {/* Card 1: Daily Quiz Mini-Game */}
        <DailyQuizCard />

        {/* Card 2: Micro-Bounty Board */}
        <div className="panel">
          <h3 className="bounty-board-heading">Micro-Bounty Board</h3>
          <BountyBoard />
        </div>
      </aside>
    </div>
  );
};

export default Home;