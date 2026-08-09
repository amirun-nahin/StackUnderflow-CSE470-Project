import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [textContent, setTextContent] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [showCode, setShowCode] = useState(false);

  const token = localStorage.getItem("accessToken");

  const fetchAllData = async () => {
    try {
      const groupRes = await fetch("http://localhost:3001/api/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!groupRes.ok) throw new Error("Failed to fetch groups");
      const groupsData = await groupRes.json();
      const currentGroup = groupsData.find((g) => g.id === parseInt(id));

      if (!currentGroup) {
        navigate("/groups");
        return;
      }
      setGroup(currentGroup);

      if (currentGroup.myMembership?.status === "APPROVED") {
        const postsRes = await fetch(
          `http://localhost:3001/api/groups/${id}/posts`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (postsRes.ok) {
          setPosts(await postsRes.json());
        }

        if (
          currentGroup.myMembership?.role === "ADMIN" &&
          currentGroup.is_private
        ) {
          const reqsRes = await fetch(
            `http://localhost:3001/api/groups/${id}/requests`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (reqsRes.ok) {
            setRequests(await reqsRes.json());
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const handleJoin = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/groups/${id}/join`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error("Join error:", error);
    }
  };

  const handleTogglePrivacy = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/groups/${id}/toggle-privacy`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        setErrorMessage("");
        fetchAllData();
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to toggle privacy.");
      }
    } catch (error) {
      console.error("Toggle privacy error:", error);
      setErrorMessage("Could not connect to the server.");
    }
  };

  const handleApprove = async (userId) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/groups/${id}/requests/${userId}/approve`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        setStatusMessage("User approved!");
        setErrorMessage("");
        fetchAllData();
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to approve user.");
      }
    } catch (error) {
      console.error("Approve error:", error);
      setErrorMessage("Could not connect to the server.");
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!textContent.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/groups/${id}/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text_content: textContent,
            code_snippet: showCode ? codeSnippet : null,
          }),
        },
      );

      if (response.ok) {
        setTextContent("");
        setCodeSnippet("");
        setShowCode(false);
        fetchAllData();
      }
    } catch (error) {
      console.error("Post error:", error);
    }
  };

  // Action: Member Leaves Group
  const handleLeaveGroup = async () => {
    if (
      !window.confirm(
        "Are you sure you want to leave this group?",
      )
    )
      return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/groups/${id}/leave`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        navigate("/groups"); // Send user back to the groups tab
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to leave group.");
      }
    } catch (error) {
      console.error("Leave group error:", error);
      setErrorMessage("Could not connect to the server.");
    }
  };

  // Action: Admin Deletes Group
  const handleDeleteGroup = async () => {
    if (
      !window.confirm(
        "Are you sure you want to completely delete this group? This cannot be undone.",
      )
    )
      return;

    try {
      const response = await fetch(`http://localhost:3001/api/groups/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        navigate("/groups"); // Send admin back to the groups tab
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to delete group.");
      }
    } catch (error) {
      console.error("Delete group error:", error);
      setErrorMessage("Could not connect to the server.");
    }
  };

  if (loading) return <div className="loading-state">Loading...</div>;
  if (!group) return null;

  const isAdmin = group.myMembership?.role === "ADMIN";
  const isApproved = group.myMembership?.status === "APPROVED";
  const isPending = group.myMembership?.status === "PENDING";

  return (
    <div className="page-container">
      <button
        onClick={() => navigate("/groups")}
        className="btn-ghost back-link"
      >
        &larr; Back to Groups
      </button>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="panel group-detail-header">
        <h1 className="discover-heading">{group.name}</h1>
        <p className="post-text">{group.description}</p>
        <div className="group-detail-badges">
          <span className="category-chip category-chip--bounty">
            {group.Users?.filter((u) => u.GroupMember?.status === "APPROVED")
              .length || 0}{" "}
            Members
          </span>
        </div>

        <div className="group-detail-actions">
          {!group.myMembership && (
            <button className="btn btn-primary" onClick={handleJoin}>
              {group.is_private ? "Request to Join" : "Join Group"}
            </button>
          )}
          {isPending && (
            <button className="btn btn-outline" disabled>
              Request Pending...
            </button>
          )}
          {isApproved && !isAdmin && (
            <button className="btn btn-ghost btn-ghost--danger btn-sm " onClick={handleLeaveGroup}>
              Leave Group
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="panel admin-panel">
          <h3 className="section-heading">Admin Panel</h3>

          <div className="admin-panel-header">
            <span className="admin-panel-status">
              Current Status:{" "}
              <strong>{group.is_private ? "Private" : "Public"}</strong>
            </span>
            <div className="admin-panel-actions">
              <button
              className="btn btn-outline btn-sm"
              onClick={handleTogglePrivacy}
            >
              Switch to {group.is_private ? "Public" : "Private"}
            </button>
            <button
              className="btn btn-ghost btn-ghost--danger btn-sm"
              onClick={handleDeleteGroup}
            >
              Delete Group
            </button>
            </div>
          </div>

          {group.is_private && requests.length > 0 && (
            <div className="admin-panel-requests">
              <h4 className="admin-panel-subtitle">Pending Requests</h4>
              {statusMessage && (
                <p className="empty-state request-message">{statusMessage}</p>
              )}
              {requests.map((user) => (
                <div key={user.id} className="discover-card request-card">
                  <span>{user.username}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApprove(user.id)}
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isApproved ? (
        <>
          <div className="create-post-card panel groups-section">
            <form onSubmit={handlePostSubmit}>
              <textarea
                className="post-textarea"
                placeholder="Post to the group..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                required
              />
              {showCode && (
                <textarea
                  className="code-textarea"
                  placeholder="Paste code snippet..."
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                />
              )}
              <div className="create-post-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowCode(!showCode)}
                >
                  {showCode ? "- Remove Code" : "+ Add Code"}
                </button>
                <button type="submit" className="btn btn-primary">
                  Post
                </button>
              </div>
            </form>
          </div>

          <div className="posts-container">
            {posts.length > 0 ? (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <p className="empty-state">No posts in this group yet.</p>
            )}
          </div>
        </>
      ) : (
        <div className="panel empty-state">
          {group.is_private
            ? "This group is private. You must be an approved member to view posts."
            : "Join the group to view and create posts!"}
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
