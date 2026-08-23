import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import CodeBlock from "./CodeBlock";

const PostCard = ({ post, isDetailView = false, onRepoJoinChange, onAddCodeComment }) => {
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const [joins, setJoins] = useState(post.RepoRequestJoins || []);
  const [joinLoading, setJoinLoading] = useState(false);
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

  useEffect(() => {
    setJoins(post.RepoRequestJoins || []);
  }, [post.RepoRequestJoins]);

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
      if (post.category === "MICRO_BOUNTY") {   // ADD
        navigate(`/bounty/${post.id}`);           // ADD
      } else {                                    // ADD
        navigate(`/post/${post.id}`);
      }                                            // ADD
    }
  };

  const hasJoined = joins.some((j) => j.UserId === myUserId);
  const isOwnRepoRequest = post.UserId === myUserId;
  const isFull =
    typeof post.people_needed === "number" && joins.length >= post.people_needed;

  const handleJoinToggle = async () => {
    if (joinLoading) return;
    setJoinLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/repo-request/${post.id}/join`,
        {
          method: hasJoined ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        let updatedJoins;
        if (hasJoined) {
          updatedJoins = joins.filter((j) => j.UserId !== myUserId);
        } else {
          updatedJoins = [
            ...joins,
            { UserId: myUserId, User: { id: myUserId, username: localStorage.getItem("username") } },
          ];
        }
        setJoins(updatedJoins);
        // Let a parent page (e.g. PostDetail, which keeps its own separate
        // copy of this post's data for the joined-members list) know right
        // away instead of only updating this card's own local state.
        if (onRepoJoinChange) onRepoJoinChange(updatedJoins);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update join status");
      }
    } catch (error) {
      console.error("Error toggling join status", error);
    } finally {
      setJoinLoading(false);
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
      case "REPO_REQUEST":
        return "repo";
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
        {post.category === "MICRO_BOUNTY" && (
          <div className="bounty-meta-row">
            {typeof post.bounty_reward_points === "number" && (
              <span className="bounty-meta-chip bounty-meta-chip--reward">
                🏆 {post.bounty_reward_points} pts
              </span>
            )}
            {post.bounty_deadline && (
              <span className="bounty-meta-chip">
                ⏳ Due {new Date(post.bounty_deadline).toLocaleDateString()}
              </span>
            )}
            {post.bounty_status && (
              <span className="bounty-meta-chip">{post.bounty_status}</span>
            )}
          </div>
        )}
        {post.category === "REPO_REQUEST" && (
          <div className="repo-meta-row">
            {post.repo_name && (
              <span className="repo-meta-chip">📦 {post.repo_name}</span>
            )}
            <span className={`repo-meta-chip ${isFull ? "repo-meta-chip--full" : ""}`}>
              👥 {joins.length}/{post.people_needed ?? "?"} joined
            </span>
            {post.RepoGroup && (isOwnRepoRequest || hasJoined) && (
              <Link to={`/group/${post.RepoGroup.id}`} className="repo-meta-chip repo-meta-chip--link">
                💬 Go to Group
              </Link>
            )}
          </div>
        )}
        {post.code_snippet && (
          <CodeBlock
            code={post.code_snippet}
            commentable={isDetailView && post.category === "PEER_REVIEW"}
            comments={post.CodeComments || []}
            onAddComment={onAddCodeComment}
          />
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
        {post.category === "REPO_REQUEST" && (
          <div className="post-footer__spacer">
            {isOwnRepoRequest ? (
              <span className="repo-meta-chip">Your Request</span>
            ) : (
              <button
                className={`btn btn-sm ${hasJoined ? "btn-outline" : "btn-primary"}`}
                onClick={handleJoinToggle}
                disabled={joinLoading || (isFull && !hasJoined)}
              >
                {hasJoined ? "Leave" : isFull ? "Full" : "Join"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
