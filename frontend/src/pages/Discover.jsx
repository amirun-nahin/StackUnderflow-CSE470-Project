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

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

    return (
        <div className="home-container" style={{ maxWidth: '800px', margin: '40px auto' }}>
            <h2 style={{ marginBottom: '20px', color: 'var(--text-main)', textAlign: 'center' }}>Discover Network</h2>
            
            <div style={{ display: 'grid', gap: '15px' }}>
                {users.map(user => {
                    const isFollowing = user.Followers?.some(f => f.username === myUsername);
                    return (
                        <div key={user.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                    🧑‍💻
                                </div>
                                <div>
                                    <Link to={`/profile/${user.username}`} style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', textDecoration: 'none' }}>
                                        {user.name}
                                    </Link>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>@{user.username} • {user.current_role || 'Developer'}</p>
                                </div>
                            </div>
                            <button 
                                className="submit-post-btn" 
                                onClick={() => handleFollow(user.username)}
                                style={{ margin: 0, backgroundColor: isFollowing ? 'transparent' : 'var(--text-accent)', border: isFollowing ? '1px solid var(--text-muted)' : 'none', color: isFollowing ? 'var(--text-main)' : '#fff' }}
                            >
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                        </div>
                    );
                })}
                {users.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No other users found.</p>}
            </div>
        </div>
    );
};

export default Discover;