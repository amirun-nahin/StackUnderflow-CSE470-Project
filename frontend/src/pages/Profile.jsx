import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard'; 

// --- THE BULLETPROOF PARSER ---
const parseTechStack = (tech) => {
    if (!tech) return [];
    if (Array.isArray(tech)) return tech;
    if (typeof tech === 'string') {
        try {
            const parsed = JSON.parse(tech);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return []; 
        }
    }
    return [];
};

const Profile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    
    // NEW: State to track if the logged-in user is following this profile
    const [isFollowing, setIsFollowing] = useState(false);

    const token = localStorage.getItem('accessToken');
    const myUsername = localStorage.getItem('username');
    const isMyProfile = myUsername === username; 

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/users/${username}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    const safeTechStack = parseTechStack(data.tech_stack);
                    setProfile({ ...data, tech_stack: safeTechStack });
                    
                    // NEW: Check if I am in their Followers array
                    if (data.Followers) {
                        const amIFollowing = data.Followers.some(follower => follower.username === myUsername);
                        setIsFollowing(amIFollowing);
                    }
                    
                    setFormData({
                        bio: data.bio || '',
                        github_profile: data.github_profile || '',
                        field_of_interest: data.field_of_interest || '',
                        birthdate: data.birthdate || '',
                        address: data.address || '',
                        current_role: data.current_role || '',
                        years_of_experience: data.years_of_experience || '',
                        availability_status: data.availability_status || 'Just Browsing',
                        tech_stack: safeTechStack.join(', ') 
                    });
                } else {
                    navigate('/'); 
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchProfile();
        else navigate('/login');
    }, [username, token, navigate, myUsername]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const processedData = {
            ...formData,
            tech_stack: formData.tech_stack 
                ? formData.tech_stack.split(',').map(tech => tech.trim()).filter(tech => tech)
                : []
        };

        try {
            const response = await fetch(`http://localhost:3001/api/users/update`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(processedData)
            });

            if (response.ok) {
                const data = await response.json();
                
                const safeTechStack = parseTechStack(data.user.tech_stack);
                
                setProfile({ ...profile, ...data.user, tech_stack: safeTechStack }); 
                setIsEditing(false);   
            } else {
                alert("Failed to update profile.");
            }
        } catch (error) {
            console.error("Update error:", error);
        }
    };

    // NEW: Handle clicking the Follow/Unfollow button
    const handleFollowToggle = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/users/${username}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setIsFollowing(data.isFollowing);
                
                // Visually update the followers count instantly without refreshing the page
                setProfile(prev => {
                    const currentFollowers = prev.Followers || [];
                    return {
                        ...prev,
                        Followers: data.isFollowing 
                            ? [...currentFollowers, { username: myUsername }] 
                            : currentFollowers.filter(f => f.username !== myUsername)
                    };
                });
            }
        } catch (error) {
            console.error("Follow error:", error);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    if (!profile) return null;

    const getStatusColor = (status) => {
        if (status === 'Open to Collaborate') return '#10b981';
        if (status === 'Looking for Work') return '#3b82f6';
        if (status === 'Busy') return '#ef4444'; 
        return '#64748b'; 
    };

    return (
        <div className="home-container" style={{ display: 'block', maxWidth: '800px', margin: '40px auto' }}>
            
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', marginBottom: '20px', position: 'relative' }}>
                
                {profile.availability_status && (
                    <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '20px', border: `1px solid ${getStatusColor(profile.availability_status)}`, color: getStatusColor(profile.availability_status) }}>
                        ● {profile.availability_status}
                    </div>
                )}

                <div style={{ 
                    width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '40px' 
                }}>
                    {profile.gender === 'Female' ? '👩‍💻' : profile.gender === 'Male' ? '👨‍💻' : '🧑‍💻'}
                </div>
                
                <h1 style={{ marginBottom: '5px' }}>{profile.name}</h1>
                <p style={{ color: 'var(--text-accent)', fontWeight: 'bold', marginBottom: '5px' }}>
                    {profile.current_role || 'Developer'} {profile.years_of_experience ? `• ${profile.years_of_experience} YOE` : ''}
                </p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>@{profile.username}</p>
                
                {/* NEW: Network Stats (Followers / Following) */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '25px', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div>
                        <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>{profile.Followers?.length || 0}</span>
                        <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Followers</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>{profile.Following?.length || 0}</span>
                        <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Following</span>
                    </div>
                </div>

                {profile.tech_stack && profile.tech_stack.length > 0 && !isEditing && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {profile.tech_stack.map((tech, index) => (
                            <span key={index} style={{ padding: '5px 12px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {tech}
                            </span>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {profile.company_university && <span className="tag-normal">🏢 {profile.company_university}</span>}
                    {profile.primary_language && <span className="tag-review">💻 {profile.primary_language}</span>}
                    {profile.field_of_interest && !isEditing && <span className="tag-bounty">🎯 {profile.field_of_interest}</span>}
                </div>

                {/* NEW: The Smart Button Zone (Edit vs Follow) */}
                {isMyProfile ? (
                    !isEditing && <button className="submit-post-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                ) : (
                    <button 
                        className="submit-post-btn" 
                        onClick={handleFollowToggle}
                        style={{ backgroundColor: isFollowing ? 'transparent' : 'var(--text-accent)', border: isFollowing ? '1px solid var(--text-muted)' : 'none', color: isFollowing ? 'var(--text-main)' : '#fff' }}
                    >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
                {!isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <h3 style={{ color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', marginBottom: '5px' }}>Bio</h3>
                            <p>{profile.bio || "This user hasn't written a bio yet."}</p>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <h3 style={{ color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', marginBottom: '5px' }}>GitHub</h3>
                                {profile.github_profile ? (
                                    <a href={profile.github_profile} target="_blank" rel="noreferrer" style={{ color: 'var(--text-accent)' }}>{profile.github_profile}</a>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)' }}>Not linked</p>
                                )}
                            </div>
                            <div>
                                <h3 style={{ color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', marginBottom: '5px' }}>Location</h3>
                                <p>{profile.address || "Not specified"}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group">
                                <label>Current Role</label>
                                <input type="text" name="current_role" value={formData.current_role} onChange={handleChange} placeholder="e.g. Full-Stack Engineer" />
                            </div>
                            <div className="input-group">
                                <label>Years of Experience</label>
                                <input type="number" name="years_of_experience" value={formData.years_of_experience} onChange={handleChange} min="0" />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group">
                                <label>Tech Stack (Comma Separated)</label>
                                <input type="text" name="tech_stack" value={formData.tech_stack} onChange={handleChange} placeholder="React, Node.js, Python" />
                            </div>
                            <div className="input-group">
                                <label>Availability Status</label>
                                <select name="availability_status" value={formData.availability_status} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.2)', color: '#f8fafc' }}>
                                    <option value="Open to Collaborate">Open to Collaborate</option>
                                    <option value="Looking for Work">Looking for Work</option>
                                    <option value="Busy">Busy</option>
                                    <option value="Just Browsing">Just Browsing</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Bio</label>
                            <textarea 
                                name="bio" value={formData.bio} onChange={handleChange} 
                                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '8px', minHeight: '80px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group">
                                <label>Field of Interest</label>
                                <input type="text" name="field_of_interest" value={formData.field_of_interest} onChange={handleChange} placeholder="e.g., Machine Learning" />
                            </div>
                            <div className="input-group">
                                <label>GitHub URL</label>
                                <input type="text" name="github_profile" value={formData.github_profile} onChange={handleChange} />
                            </div>
                            <div className="input-group">
                                <label>Address / Location</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} />
                            </div>
                            <div className="input-group">
                                <label>Birthdate</label>
                                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="button" onClick={() => setIsEditing(false)} style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--text-muted)', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" className="submit-post-btn" style={{ margin: 0 }}>Save Profile</button>
                        </div>
                    </form>
                )}
            </div>

            <h3 style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                Recent Activity
            </h3>
            <div className="posts-container">
                {profile.Posts && profile.Posts.length > 0 ? (
                    profile.Posts.map(post => (
                        <PostCard key={post.id} post={{ ...post, User: { username: profile.username } }} />
                    ))
                ) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                        This user hasn't posted anything yet.
                    </p>
                )}
            </div>

        </div>
    );
};

export default Profile;