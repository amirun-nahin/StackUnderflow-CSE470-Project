import { useState, useEffect } from 'react';

// Shown on a profile page for the "Open-Source Collaboration" feature.
// - On your own profile: fetches live connection status, lets you connect
//   (via a GitHub username + Personal Access Token — GitHub retired
//   third-party username/password login years ago, so a PAT is the
//   supported way to act on your behalf) or disconnect, and lists your repos.
// - On someone else's profile: just shows whether they've linked GitHub,
//   using the (non-sensitive) github_username already present on their
//   profile data — their access token is never sent to the client.
const GitHubConnect = ({ isMyProfile, profileGithubUsername, token }) => {
    const [status, setStatus] = useState(null); // { connected, github_username }
    const [loadingStatus, setLoadingStatus] = useState(isMyProfile);

    const [showConnectModal, setShowConnectModal] = useState(false);
    const [connectUsername, setConnectUsername] = useState('');
    const [connectTokenInput, setConnectTokenInput] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [connectError, setConnectError] = useState('');

    const [showReposModal, setShowReposModal] = useState(false);
    const [repos, setRepos] = useState([]);
    const [reposLoading, setReposLoading] = useState(false);
    const [reposError, setReposError] = useState('');

    useEffect(() => {
        if (!isMyProfile) return;

        const fetchStatus = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/github/status', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStatus(data);
                }
            } catch (error) {
                console.error('Failed to fetch GitHub status', error);
            } finally {
                setLoadingStatus(false);
            }
        };

        fetchStatus();
    }, [isMyProfile, token]);

    const handleConnect = async (e) => {
        e.preventDefault();
        setConnecting(true);
        setConnectError('');

        try {
            const response = await fetch('http://localhost:3001/api/github/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    github_username: connectUsername,
                    access_token: connectTokenInput
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ connected: true, github_username: data.github_username });
                setShowConnectModal(false);
                setConnectUsername('');
                setConnectTokenInput('');
            } else {
                setConnectError(data.error || 'Failed to connect GitHub account');
            }
        } catch (error) {
            console.error('Error connecting GitHub account', error);
            setConnectError('Failed to connect GitHub account');
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Disconnect your GitHub account?')) return;
        try {
            const response = await fetch('http://localhost:3001/api/github/disconnect', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setStatus({ connected: false, github_username: null });
            }
        } catch (error) {
            console.error('Error disconnecting GitHub account', error);
        }
    };

    const openRepos = async () => {
        setShowReposModal(true);
        setReposLoading(true);
        setReposError('');
        try {
            const response = await fetch('http://localhost:3001/api/github/repositories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setRepos(data);
            } else {
                setReposError(data.error || 'Failed to load repositories');
            }
        } catch (error) {
            console.error('Error fetching repositories', error);
            setReposError('Failed to load repositories');
        } finally {
            setReposLoading(false);
        }
    };

    // --- Read-only view for someone else's profile ---
    if (!isMyProfile) {
        return (
            <div className="github-panel">
                <h3 className="profile-field__label">GitHub</h3>
                <div className="github-status-row">
                    {profileGithubUsername ? (
                        <span className="github-status-badge github-status-badge--connected">
                            ✅ Connected to GitHub as {profileGithubUsername}
                        </span>
                    ) : (
                        <span className="github-status-badge github-status-badge--disconnected">
                            Not connected to GitHub
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // --- Interactive view for your own profile ---
    return (
        <div className="github-panel">
            <h3 className="profile-field__label">GitHub</h3>

            {loadingStatus ? (
                <p className="profile-field__value profile-field__value--muted">Checking connection...</p>
            ) : (
                <div className="github-status-row">
                    {status?.connected ? (
                        <span className="github-status-badge github-status-badge--connected">
                            ✅ Connected to GitHub as {status.github_username}
                        </span>
                    ) : (
                        <span className="github-status-badge github-status-badge--disconnected">
                            Not connected to GitHub
                        </span>
                    )}

                    <div className="github-actions">
                        {status?.connected ? (
                            <>
                                <button className="btn btn-outline btn-sm" onClick={openRepos}>
                                    Repositories
                                </button>
                                <button className="btn btn-outline btn-outline--danger btn-sm" onClick={handleDisconnect}>
                                    Disconnect
                                </button>
                            </>
                        ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowConnectModal(true)}>
                                Add GitHub Account
                            </button>
                        )}
                    </div>
                </div>
            )}

            {showConnectModal && (
                <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Connect GitHub</h3>
                            <button className="modal-close-btn" onClick={() => setShowConnectModal(false)}>✕</button>
                        </div>
                        <p className="modal-hint">
                            GitHub no longer supports signing in with just a username and password for apps like this one.
                            Enter your GitHub username and a Personal Access Token instead — you can generate one from
                            GitHub Settings → Developer settings → Personal access tokens.
                        </p>
                        <form onSubmit={handleConnect} className="profile-edit-form">
                            <div className="input-group">
                                <label>GitHub Username</label>
                                <input
                                    type="text"
                                    value={connectUsername}
                                    onChange={(e) => setConnectUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Personal Access Token</label>
                                <input
                                    type="password"
                                    value={connectTokenInput}
                                    onChange={(e) => setConnectTokenInput(e.target.value)}
                                    placeholder="ghp_..."
                                    required
                                />
                            </div>
                            {connectError && <p className="github-error">{connectError}</p>}
                            <div className="profile-edit-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowConnectModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={connecting}>
                                    {connecting ? 'Connecting...' : 'Connect'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showReposModal && (
                <div className="modal-overlay" onClick={() => setShowReposModal(false)}>
                    <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Your Repositories</h3>
                            <button className="modal-close-btn" onClick={() => setShowReposModal(false)}>✕</button>
                        </div>
                        {reposLoading ? (
                            <p className="profile-field__value profile-field__value--muted">Loading repositories...</p>
                        ) : reposError ? (
                            <p className="github-error">{reposError}</p>
                        ) : repos.length === 0 ? (
                            <p className="empty-state">No repositories found on this GitHub account.</p>
                        ) : (
                            <div className="github-repo-list">
                                {repos.map((repo) => (
                                    <div key={repo.id} className="github-repo-item">
                                        <a
                                            href={repo.html_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="github-repo-item__name"
                                        >
                                            {repo.full_name}
                                        </a>
                                        {repo.description && (
                                            <p className="github-repo-item__desc">{repo.description}</p>
                                        )}
                                        <div className="github-repo-item__meta">
                                            {repo.language && <span>💻 {repo.language}</span>}
                                            <span>⭐ {repo.stargazers_count}</span>
                                            <span>🍴 {repo.forks_count}</span>
                                            {repo.private && <span>🔒 Private</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GitHubConnect;
