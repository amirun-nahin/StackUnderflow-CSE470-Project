import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Discover = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('accessToken');
    const myUsername = localStorage.getItem('username');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Filter out our own account so we don't try to follow ourselves
                    setUsers(data.filter(u => u.username !== myUsername));
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchUsers();
    }, [token, myUsername]);

    const handleFollow = async (targetUsername) => {
        try {
            const response = await fetch(`http://localhost:3001/api/users/${targetUsername}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();

                // Update the button state instantly
                setUsers(users.map(u => {
                    if (u.username === targetUsername) {
                        const currentFollowers = u.Followers || [];
                        return {
                            ...u,
                            Followers: data.isFollowing
                                ? [...currentFollowers, { username: myUsername }]
                                : currentFollowers.filter(f => f.username !== myUsername)
                        };
                    }
                    return u;
                }));
            }
        } catch (error) {
            console.error("Follow error:", error);
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;

    return (
        <div className="page-container">
            <h2 className="discover-heading">Discover Network</h2>

            <div className="discover-list">
                {users.map(user => {
                    const isFollowing = user.Followers?.some(f => f.username === myUsername);
                    return (
                        <div key={user.id} className="discover-card panel">
                            <div className="discover-card__identity">
                                <div className="avatar-circle avatar-circle--md">
                                    🧑‍💻
                                </div>
                                <div>
                                    <Link to={`/profile/${user.username}`} className="discover-card__name">
                                        {user.name}
                                    </Link>
                                    <p className="discover-card__meta">@{user.username} • {user.current_role || 'Developer'}</p>
                                </div>
                            </div>
                            <button
                                className={`btn btn-sm ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                                onClick={() => handleFollow(user.username)}
                            >
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                        </div>
                    );
                })}
                {users.length === 0 && <p className="empty-state">No other users found.</p>}
            </div>
        </div>
    );
};

export default Discover;
