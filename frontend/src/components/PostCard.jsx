import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

const PostCard = ({ post, isDetailView = false }) => {
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const navigate = useNavigate();

  // --- THE BULLETPROOF TOKEN CHECK ---
  const token = localStorage.getItem("accessToken");
  let myUserId = null;

  if (token && token !== "undefined" && token !== "null") {
    try {
      // Ensure the token has the correct JWT structure before splitting
      if (token.includes(".")) {
        myUserId = JSON.parse(atob(token.split(".")[1])).id;
      }
    } catch (error) {
      console.error("Corrupted token found, ignoring safely.", error);
    }
  }
  // -----------------------------------

  useEffect(() => {
    if (post.Votes) {
      let ups = 0;
      let downs = 0;
      post.Votes.forEach((vote) => {
        if (vote.type === "UP") ups++;
        if (vote.type === "DOWN") downs++;
        if (vote.UserId === myUserId) setUserVote(vote.type);
      });
      setUpvotes(ups);
      setDownvotes(downs);
    }
  }, [post.Votes, myUserId]);

  const handleVote = async (type) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/posts/${post.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ UserId: myUserId, type: type }),
        },
      );

      if (response.ok) {
        if (userVote === type) {
          if (type === "UP") setUpvotes(upvotes - 1);
          if (type === "DOWN") setDownvotes(downvotes - 1);
          setUserVote(null);
        } else {
          if (type === "UP") {
            setUpvotes(upvotes + 1);
            if (userVote === "DOWN") setDownvotes(downvotes - 1);
          }
          if (type === "DOWN") {
            setDownvotes(downvotes + 1);
            if (userVote === "UP") setUpvotes(upvotes - 1);
          }
          setUserVote(type);
        }
      }
    } catch (error) {
      console.error("Error casting vote", error);
    }
  };

  const handleCommentClick = () => {
    if (!isDetailView) {
      navigate(`/post/${post.id}`);
    }
  };

  // Returns a short key used to drive both the card's category gutter color
  // and the category chip color — same mapping as before, just a shorter
  // token so it can be reused as a CSS modifier in two places.
  const getCategoryKey = (category) => {
    switch (category) {
      case "PEER_REVIEW":
        return "review";
      case "COLLAB_SLOT":
        return "collab";
      case "MICRO_BOUNTY":
        return "bounty";
      default:
        return "normal";
    }
  };

  const categoryKey = getCategoryKey(post.category);

  return (
    <div
      className={`post-card panel post-card--${categoryKey} ${!isDetailView ? "post-card--clickable" : ""}`}
    >
      <div className="post-header">
        {/* Avatar + Author Link */}
        <div className="post-header__identity">
          <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
          <Link
            to={`/profile/${post.User?.username}`}
            className="post-author"
          >
            {post.User?.username || "Unknown User"}
          </Link>
        </div>

        <div className="post-header__badges">
          {post.language && post.language !== "General" && (
            <span className="lang-chip">{post.language}</span>
          )}

          <span className={`category-chip category-chip--${categoryKey}`}>
            {post.category.replace("_", " ")}
          </span>
        </div>
      </div>

      <div
        className={`post-body ${!isDetailView ? "post-body--clickable" : ""}`}
        onClick={handleCommentClick}
      >
        <p className="post-text">{post.text_content}</p>
        {post.code_snippet && (
          <div className="code-block">
            <pre>
              <code>{post.code_snippet}</code>
            </pre>
          </div>
        )}
      </div>

      <div className="post-footer">
        <button
          className={`stat-btn stat-btn--up ${userVote === "UP" ? "stat-btn--active" : ""}`}
          onClick={() => handleVote("UP")}
        >
          ⬆️ {upvotes}
        </button>
        <button
          className={`stat-btn stat-btn--down ${userVote === "DOWN" ? "stat-btn--active" : ""}`}
          onClick={() => handleVote("DOWN")}
        >
          ⬇️ {downvotes}
        </button>
        <button className="stat-btn" onClick={handleCommentClick}>
          💬 {post.Comments?.length || 0} Comments
        </button>
      </div>
    </div>
  );
};

export default PostCard;
