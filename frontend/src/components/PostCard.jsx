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

  const getCategoryStyle = (category) => {
    switch (category) {
      case "PEER_REVIEW":
        return "tag-review";
      case "COLLAB_SLOT":
        return "tag-collab";
      case "MICRO_BOUNTY":
        return "tag-bounty";
      default:
        return "tag-normal";
    }
  };

  return (
    <div
      className="post-card glass-panel"
      style={{ cursor: isDetailView ? "default" : "pointer" }}
    >
      <div className="post-header">
        {/* Avatar + Author Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              🧑‍💻
          </div>
          <Link
            to={`/profile/${post.User?.username}`}
            className="post-author"
            style={{ textDecoration: "none" }}
          >
            {post.User?.username || "Unknown User"}
          </Link>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {post.language && post.language !== "General" && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: "700",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
              }}
            >
              {post.language}
            </span>
          )}

          <span className={`post-category ${getCategoryStyle(post.category)}`}>
            {post.category.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="post-body" onClick={handleCommentClick}>
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
          className="vote-btn"
          onClick={() => handleVote("UP")}
          style={{ color: userVote === "UP" ? "#3b82f6" : "var(--text-muted)" }}
        >
          ⬆️ {upvotes}
        </button>
        <button
          className="vote-btn"
          onClick={() => handleVote("DOWN")}
          style={{
            color: userVote === "DOWN" ? "#ef4444" : "var(--text-muted)",
          }}
        >
          ⬇️ {downvotes}
        </button>
        <button className="comment-btn" onClick={handleCommentClick}>
          💬 {post.Comments?.length || 0} Comments
        </button>
      </div>
    </div>
  );
};

export default PostCard;
