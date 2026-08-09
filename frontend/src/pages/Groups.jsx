import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const Groups = () => {
  const [myGroups, setMyGroups] = useState([]);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();

          const enrolled = data.filter((g) => g.myMembership);
          const discover = data.filter((g) => !g.myMembership);

          setMyGroups(enrolled);
          setDiscoverGroups(discover);
        } else {
          setErrorMessage("Failed to load groups.");
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
        setErrorMessage("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchGroups();
  }, [token]);

  if (loading) return <div className="loading-state">Loading Groups...</div>;

  return (
    <div className="page-container">
      <div className="groups-header">
        <h1 className="discover-heading groups-title">Groups & Communities</h1>
        <Link to="/create-group" className="btn btn-primary">
          + Create Group
        </Link>
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="panel groups-section">
        <h3 className="section-heading">My Groups</h3>
        {myGroups.length > 0 ? (
          <div className="discover-list">
            {myGroups.map((group) => (
              <Link
                to={`/group/${group.id}`}
                key={group.id}
                className="discover-card post-card--clickable group-card-link"
              >
                <div>
                  <h4 className="discover-card__name">{group.name}</h4>
                  <p className="discover-card__meta">
                    {group.is_private ? "Private" : "Public"} •{" "}
                    {group.Users?.filter(
                      (u) => u.GroupMember?.status === "APPROVED",
                    ).length || 0}{" "}
                    Members
                  </p>
                </div>
                <span
                  className={`category-chip category-chip--${group.myMembership.status === "APPROVED" ? "review" : "normal"}`}
                >
                  {group.myMembership.role === "ADMIN"
                    ? "ADMIN"
                    : group.myMembership.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">You haven't joined any groups yet.</p>
        )}
      </div>

      <div className="panel">
        <h3 className="section-heading">Discover Groups</h3>
        {discoverGroups.length > 0 ? (
          <div className="discover-list">
            {discoverGroups.map((group) => (
              <Link
                to={`/group/${group.id}`}
                key={group.id}
                className="discover-card post-card--clickable group-card-link"
              >
                <div>
                  <h4 className="discover-card__name">{group.name}</h4>
                  <p className="discover-card__meta">
                    {group.Users?.filter(
                      (u) => u.GroupMember?.status === "APPROVED",
                    ).length || 0}{" "}
                    Members
                  </p>
                </div>
                <div className="group-card-actions">
                  <span className="category-chip category-chip--normal">
                    {group.is_private ? "Private" : "Public"}
                  </span>
                  <span className="btn btn-outline btn-sm">View</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">No new groups to discover right now.</p>
        )}
      </div>
    </div>
  );
};

export default Groups;
