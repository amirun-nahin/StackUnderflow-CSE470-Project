import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import GroupCalendar from "../components/GroupCalendar";

const ROLE_LABELS = {
  ADMIN: "Admin",
  TEAM_MANAGER: "Team Manager",
  SCRUM_MASTER: "Scrum Master",
  PRODUCT_OWNER: "Product Owner",
  DEVELOPER: "Developer",
  MEMBER: "Member",
};
const ASSIGNABLE_ROLES = ["ADMIN", "TEAM_MANAGER", "SCRUM_MASTER", "PRODUCT_OWNER", "DEVELOPER", "MEMBER"];
const LEADERSHIP_ROLES = ["ADMIN", "TEAM_MANAGER", "SCRUM_MASTER"];

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Admin modal: editable name/description
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDescription, setEditGroupDescription] = useState("");
  const [savingGroupEdit, setSavingGroupEdit] = useState(false);

  // Unified create form: a Post, an Announcement, or a Meeting
  const [postType, setPostType] = useState("POST");
  const [textContent, setTextContent] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

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
        const [postsRes, membersRes, meetingsRes, announcementsRes] = await Promise.all([
          fetch(`http://localhost:3001/api/groups/${id}/posts`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`http://localhost:3001/api/groups/${id}/members`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`http://localhost:3001/api/groups/${id}/meetings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`http://localhost:3001/api/groups/${id}/announcements`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (postsRes.ok) setPosts(await postsRes.json());
        if (membersRes.ok) setMembers(await membersRes.json());
        if (meetingsRes.ok) setMeetings(await meetingsRes.json());
        if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());

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

  // Switching type resets the type-specific fields so nothing carries over oddly
  const handlePostTypeChange = (type) => {
    setPostType(type);
    setTextContent("");
    setCodeSnippet("");
    setShowCode(false);
    setMeetingDate("");
    setMeetingTime("");
  };

  // Unified submit for the create-card: dispatches to the right endpoint
  // depending on which type (Post / Announcement / Meeting) is selected.
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (postType === "MEETING") {
      if (!meetingDate || !meetingTime || !textContent.trim()) return;
      try {
        const response = await fetch(
          `http://localhost:3001/api/groups/${id}/meetings`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              description: textContent,
              scheduled_at: new Date(`${meetingDate}T${meetingTime}`).toISOString(),
            }),
          },
        );
        if (response.ok) {
          const newMeeting = await response.json();
          setMeetings((prev) => [...prev, newMeeting]);
          setTextContent("");
          setMeetingDate("");
          setMeetingTime("");
          setErrorMessage("");
        } else {
          const errData = await response.json();
          setErrorMessage(errData.error || "Failed to schedule meeting.");
        }
      } catch (error) {
        console.error("Schedule meeting error:", error);
        setErrorMessage("Could not connect to the server.");
      }
      return;
    }

    if (postType === "ANNOUNCEMENT") {
      if (!textContent.trim()) return;
      try {
        const response = await fetch(
          `http://localhost:3001/api/groups/${id}/announcements`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ text_content: textContent }),
          },
        );
        if (response.ok) {
          const newAnnouncement = await response.json();
          setAnnouncements((prev) => [newAnnouncement, ...prev]);
          setTextContent("");
          setErrorMessage("");
        } else {
          const errData = await response.json();
          setErrorMessage(errData.error || "Failed to post announcement.");
        }
      } catch (error) {
        console.error("Post announcement error:", error);
        setErrorMessage("Could not connect to the server.");
      }
      return;
    }

    // Regular group post
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
    if (!window.confirm("Are you sure you want to leave this group?")) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/groups/${id}/leave`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        navigate("/groups");
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
        navigate("/groups");
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to delete group.");
      }
    } catch (error) {
      console.error("Delete group error:", error);
      setErrorMessage("Could not connect to the server.");
    }
  };

  // Action: Admin assigns a role to a member
  const handleAssignRole = async (userId, role) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/groups/${id}/members/${userId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        },
      );
      if (response.ok) {
        setErrorMessage("");
        fetchAllData();
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to assign role.");
      }
    } catch (error) {
      console.error("Assign role error:", error);
      setErrorMessage("Could not connect to the server.");
    }
  };

  // Open the admin menu, pre-filling the edit fields with current values
  const openAdminModal = () => {
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || "");
    setShowAdminModal(true);
  };

  // Action: Admin saves the edited name/description
  const handleSaveGroupEdit = async (e) => {
    e.preventDefault();
    if (!editGroupName.trim()) return;

    setSavingGroupEdit(true);
    try {
      const response = await fetch(`http://localhost:3001/api/groups/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editGroupName,
          description: editGroupDescription,
        }),
      });
      if (response.ok) {
        setErrorMessage("");
        fetchAllData();
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to update group.");
      }
    } catch (error) {
      console.error("Edit group error:", error);
      setErrorMessage("Could not connect to the server.");
    } finally {
      setSavingGroupEdit(false);
    }
  };

  if (loading) return <div className="loading-state">Loading...</div>;
  if (!group) return null;

  const isAdmin = group.myMembership?.role === "ADMIN";
  const isApproved = group.myMembership?.status === "APPROVED";
  const isPending = group.myMembership?.status === "PENDING";
  const isLeadership = LEADERSHIP_ROLES.includes(group.myMembership?.role);

  return (
    <>
      {!isApproved && (
        <div className="page-container">
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
            </div>
          </div>
          <div className="panel empty-state">
            {group.is_private
              ? "This group is private. You must be an approved member to view posts."
              : "Join the group to view and create posts!"}
          </div>
        </div>
      )}

      {isApproved && (
        <div className="home-layout">
          {/* LEFT: Group identity + members */}
          <aside className="left-sidebar">
            <div className="panel group-detail-header">
              <div className="group-detail-title-row">
                <h1 className="discover-heading">{group.name}</h1>
              </div>
              <p className="post-text">{group.description}</p>
              <div className="group-detail-badges">
                <span className="category-chip category-chip--bounty">
                  {members.length} Members
                </span>
                                {isAdmin && (
                  <button
                    className="icon-menu-btn"
                    onClick={openAdminModal}
                    aria-label="Group settings"
                  >
                    ⋮
                  </button>
                )}
              </div>
              <div className="group-detail-actions">
                {!isAdmin && (
                  <button className="btn btn-ghost btn-ghost--danger btn-sm" onClick={handleLeaveGroup}>
                    Leave Group
                  </button>
                )}
              </div>
            </div>

            <div className="panel">
              <h3>Members</h3>
              <div className="group-members-list">
                {members.map((m) => (
                  <div key={m.id} className="group-member-row">
                    <Link to={`/profile/${m.username}`} className="post-author">
                      {m.username}
                    </Link>
                    {isAdmin && m.role !== "ADMIN" ? (
                      <select
                        className="role-select"
                        value={m.role}
                        onChange={(e) => handleAssignRole(m.id, e.target.value)}
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`role-badge role-badge--${m.role.toLowerCase()}`}>
                        {ROLE_LABELS[m.role]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* CENTER: Post/Announcement/Meeting creation & feed */}
          <main className="feed-column">
            {errorMessage && <p className="error-text">{errorMessage}</p>}

            <div className="create-post-card panel groups-section">
              <form onSubmit={handleCreateSubmit}>
                {isLeadership && (
                  <div className="create-post-selects">
                    <select
                      className="select-input"
                      value={postType}
                      onChange={(e) => handlePostTypeChange(e.target.value)}
                    >
                      <option value="POST">Post</option>
                      <option value="ANNOUNCEMENT">Announcement</option>
                      <option value="MEETING">Meeting</option>
                    </select>
                  </div>
                )}

                {postType === "MEETING" && (
                  <div className="create-post-selects">
                    <div className="input-group">
                      <label>Date</label>
                      <input
                        type="date"
                        className="select-input"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Time</label>
                      <input
                        type="time"
                        className="select-input"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <textarea
                  className="post-textarea"
                  placeholder={
                    postType === "ANNOUNCEMENT"
                      ? "Write an announcement..."
                      : postType === "MEETING"
                        ? "What's this meeting about?"
                        : "Post to the group..."
                  }
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  required
                />
                {postType === "POST" && showCode && (
                  <textarea
                    className="code-textarea"
                    placeholder="Paste code snippet..."
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                  />
                )}
                <div className="create-post-actions">
                  {postType === "POST" && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowCode(!showCode)}
                    >
                      {showCode ? "- Remove Code" : "+ Add Code"}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={postType === "MEETING" && (!meetingDate || !meetingTime || !textContent.trim())}
                  >
                    {postType === "ANNOUNCEMENT" ? "Post Announcement" : postType === "MEETING" ? "Schedule Meeting" : "Post"}
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
          </main>

          {/* RIGHT: Calendar & announcements */}
          <aside className="right-sidebar">
            <GroupCalendar meetings={meetings} />

            <div className="panel">
              <h3>Announcements</h3>
              {announcements.length === 0 ? (
                <p className="empty-state">No announcements yet.</p>
              ) : (
                <div className="announcements-list">
                  {announcements.map((a) => (
                    <div key={a.id} className="announcement-item">
                      <p className="announcement-item__meta">
                        {a.User?.username} · {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                      <p className="announcement-item__text">{a.text_content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Group Settings</h3>
              <button className="modal-close-btn" onClick={() => setShowAdminModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveGroupEdit} className="profile-edit-form">
              <div className="input-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea
                  className="post-textarea"
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                />
              </div>
              <div className="profile-edit-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingGroupEdit}>
                  {savingGroupEdit ? "Saving..." : "Save Changes"}
                </button>

              </div>
            <div classname= "group">  
            </div>
            </form>

            <div className="admin-panel-requests">
              <h4 className="admin-panel-subtitle">Privacy &amp; Danger Zone</h4>
              <div className="admin-panel-header">
                <span className="admin-panel-status">
                  Current Status: <strong>{group.is_private ? "Private" : "Public"}</strong>
                </span>
                <div className="admin-panel-actions">
                  <button className="btn btn-outline btn-sm" onClick={handleTogglePrivacy}>
                    Switch to {group.is_private ? "Public" : "Private"}
                  </button>
                  <button className="btn btn-ghost btn-ghost--danger btn-sm" onClick={handleDeleteGroup}>
                    Delete Group
                  </button>
                </div>
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
                    <button className="btn btn-primary btn-sm" onClick={() => handleApprove(user.id)}>
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GroupDetail;
