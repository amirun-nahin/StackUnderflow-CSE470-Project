import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PostCard from '../components/PostCard';

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

    if (loading) return <div className="loading-state">Loading...</div>;
    if (!profile) return null;

    // Same status -> presentation mapping as before, just returning a short
    // key used to pick a CSS modifier class instead of a raw color.
    const getStatusKey = (status) => {
        if (status === 'Open to Collaborate') return 'open';
        if (status === 'Looking for Work') return 'looking';
        if (status === 'Busy') return 'busy';
        return 'browsing';
    };

    return (
        <div className="page-container">

            <div className="profile-header panel">

                {profile.availability_status && (
                    <div className={`profile-status-badge profile-status-badge--${getStatusKey(profile.availability_status)}`}>
                        ● {profile.availability_status}
                    </div>
                )}

                <div className="avatar-circle avatar-circle--lg">
                    {profile.gender === 'Female' ? '👩‍💻' : profile.gender === 'Male' ? '👨‍💻' : '🧑‍💻'}
                </div>

                <h1 className="profile-name">{profile.name}</h1>
                <p className="profile-role">
                    {profile.current_role || 'Developer'} {profile.years_of_experience ? `• ${profile.years_of_experience} YOE` : ''}
                </p>
                <p className="profile-handle">@{profile.username}</p>

                {/* NEW: Network Stats (Followers / Following) */}
                <div className="profile-stats">
                    <div>
                        <span className="profile-stat__value">{profile.Followers?.length || 0}</span>
                        <span className="profile-stat__label">Followers</span>
                    </div>
                    <div>
                        <span className="profile-stat__value">{profile.Following?.length || 0}</span>
                        <span className="profile-stat__label">Following</span>
                    </div>
                    <div>                                                                      {/* ADD */}
                        <span className="profile-stat__value">{profile.points || 0}</span>       {/* ADD */}
                        <span className="profile-stat__label">Bounty Points</span>                {/* ADD */}
                    </div>
                </div>

                {profile.tech_stack && profile.tech_stack.length > 0 && !isEditing && (
                    <div className="profile-chips">
                        {profile.tech_stack.map((tech, index) => (
                            <span key={index} className="profile-tech-chip">
                                {tech}
                            </span>
                        ))}
                    </div>
                )}

                <div className="profile-chips">
                    {profile.company_university && <span className="category-chip category-chip--normal">🏢 {profile.company_university}</span>}
                    {profile.primary_language && <span className="category-chip category-chip--review">💻 {profile.primary_language}</span>}
                    {profile.field_of_interest && !isEditing && <span className="category-chip category-chip--bounty">🎯 {profile.field_of_interest}</span>}
                </div>

                {/* NEW: The Smart Button Zone (Edit vs Follow) */}
                {isMyProfile ? (
                    !isEditing && <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Profile</button>
                ) : (
                    <button
                        className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                        onClick={handleFollowToggle}
                    >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                )}
            </div>

            <div className="profile-body panel">
                {!isEditing ? (
                    <div className="profile-view">
                        <div>
                            <h3 className="profile-field__label">Bio</h3>
                            <p className="profile-field__value">{profile.bio || "This user hasn't written a bio yet."}</p>
                        </div>

                        <div className="profile-field-grid">
                            <div>
                                <h3 className="profile-field__label">GitHub</h3>
                                {profile.github_profile ? (
                                    <a href={profile.github_profile} target="_blank" rel="noreferrer">{profile.github_profile}</a>
                                ) : (
                                    <p className="profile-field__value profile-field__value--muted">Not linked</p>
                                )}
                            </div>
                            <div>
                                <h3 className="profile-field__label">Location</h3>
                                <p className="profile-field__value">{profile.address || "Not specified"}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="profile-edit-form">

                        <div className="profile-field-grid">
                            <div className="input-group">
                                <label>Current Role</label>
                                <input type="text" name="current_role" value={formData.current_role} onChange={handleChange} placeholder="e.g. Full-Stack Engineer" />
                            </div>
                            <div className="input-group">
                                <label>Years of Experience</label>
                                <input type="number" name="years_of_experience" value={formData.years_of_experience} onChange={handleChange} min="0" />
                            </div>
                        </div>

                        <div className="profile-field-grid">
                            <div className="input-group">
                                <label>Tech Stack (Comma Separated)</label>
                                <input type="text" name="tech_stack" value={formData.tech_stack} onChange={handleChange} placeholder="React, Node.js, Python" />
                            </div>
                            <div className="input-group">
                                <label>Availability Status</label>
                                <select name="availability_status" value={formData.availability_status} onChange={handleChange} className="select-input">
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
                            />
                        </div>

                        <div className="profile-field-grid">
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

                        <div className="profile-edit-actions">
                            <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline">Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Profile</button>
                        </div>
                    </form>
                )}
            </div>
            <h3 className="profile-activity-heading">
                Bounty Activity
            </h3>
            <div className="posts-container">
                {(profile.BountyEnrollments?.length > 0 || profile.BountySubmissions?.length > 0) ? (
                    <>
                        {profile.BountyEnrollments?.map(enrollment => {
                            const submission = profile.BountySubmissions?.find(
                                s => s.Post?.id === enrollment.Post?.id
                            );
                            return (
                                <div key={`enrollment-${enrollment.id}`} className="bounty-card panel">
                                    <Link to={`/bounty/${enrollment.Post?.id}`} className="bounty-card__title">
                                        {enrollment.Post?.text_content}
                                    </Link>
                                    <div className="bounty-card__meta">
                                        <span className="category-chip category-chip--bounty">
                                            {submission ? `Submitted • ${submission.status}` : enrollment.status || 'Enrolled'}
                                        </span>
                                        {submission?.status === 'REVIEWED' && (
                                            <span className="bounty-meta-chip bounty-meta-chip--reward">
                                                🏆 {submission.marks} pts
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                ) : (
                    <p className="empty-state">No bounty activity yet.</p>
                )}
            </div>
            <h3 className="profile-activity-heading">
                Recent Activity
            </h3>
            <h3 className="profile-activity-heading">
                Recent Activity
            </h3>
            <div className="posts-container">
                {profile.Posts && profile.Posts.length > 0 ? (
                    profile.Posts.map(post => (
                        <PostCard key={post.id} post={{ ...post, User: { username: profile.username } }} />
                    ))
                ) : (
                    <p className="empty-state">
                        This user hasn't posted anything yet.
                    </p>
                )}
            </div>

        </div>
    );
};

export default Profile;
