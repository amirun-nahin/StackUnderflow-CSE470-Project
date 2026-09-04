import { useState } from 'react';
import { Link } from 'react-router-dom';
import BountyBoard from '../components/BountyBoard';
import BountyStats from '../components/BountyStats';
import CompetitionStats from '../components/CompetitionStats';
import DuelStats from '../components/DuelStats';
import CompetitionBoard from '../components/CompetitionBoard';
import DuelBoard from '../components/DuelBoard';

const TABS = [
    { key: 'bounty', label: '💰 Micro Bounty' },
    { key: 'duel', label: '⚔️ 1v1 Duels' },
    { key: 'competition', label: '🏆 Competition' }
];

const BOUNTY_LANGUAGES = ['General', 'JavaScript', 'Python', 'Java', 'C++', 'React', 'SQL'];

const Challenges = () => {
    const [activeTab, setActiveTab] = useState('bounty');

    // Micro-Bounty creation
    const [bountyText, setBountyText] = useState('');
    const [bountyLanguage, setBountyLanguage] = useState('General');
    const [bountyReward, setBountyReward] = useState('');
    const [bountyDeadline, setBountyDeadline] = useState('');
    const [postingBounty, setPostingBounty] = useState(false);
    const [bountyError, setBountyError] = useState('');
    const [bountyRefreshKey, setBountyRefreshKey] = useState(0);

    const handlePostBounty = async (e) => {
        e.preventDefault();
        if (!bountyText.trim()) return;

        setPostingBounty(true);
        setBountyError('');
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:3001/api/posts/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    text_content: bountyText,
                    category: 'MICRO_BOUNTY',
                    language: bountyLanguage,
                    ...(bountyReward ? { bounty_reward_points: Number(bountyReward) } : {}),
                    ...(bountyDeadline ? { bounty_deadline: bountyDeadline } : {})
                })
            });

            if (response.ok) {
                setBountyText('');
                setBountyReward('');
                setBountyDeadline('');
                setBountyRefreshKey((k) => k + 1);
            } else {
                const data = await response.json().catch(() => ({}));
                setBountyError(data.error || 'Failed to post bounty.');
            }
        } catch (error) {
            console.error('Failed to post bounty', error);
            setBountyError('Could not connect to the server.');
        } finally {
            setPostingBounty(false);
        }
    };

    return (
        <div className="extra-layout">
            {/* LEFT: nav for the three challenge types */}
            <aside className="extra-nav">
                <div className="panel">
                    <h3>Competitions</h3>
                    <nav className="extra-nav-list">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                className={`extra-nav-item ${activeTab === tab.key ? 'extra-nav-item--active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* MIDDLE: creation + listing/history for the active tab */}
            <main className="extra-main">
                {activeTab === 'bounty' && (
                    <>
                        <div className="create-post-card panel">
                            <h3 className="section-heading">Post a Micro-Bounty</h3>
                            <form onSubmit={handlePostBounty}>
                                <textarea
                                    className="post-textarea"
                                    placeholder="Describe the bounty challenge..."
                                    value={bountyText}
                                    onChange={(e) => setBountyText(e.target.value)}
                                    required
                                />
                                <div className="create-post-selects">
                                    <select
                                        className="select-input"
                                        value={bountyLanguage}
                                        onChange={(e) => setBountyLanguage(e.target.value)}
                                    >
                                        {BOUNTY_LANGUAGES.map((lang) => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        className="select-input"
                                        placeholder="Reward points"
                                        value={bountyReward}
                                        onChange={(e) => setBountyReward(e.target.value)}
                                        min="0"
                                    />
                                    <input
                                        type="date"
                                        className="select-input"
                                        value={bountyDeadline}
                                        onChange={(e) => setBountyDeadline(e.target.value)}
                                    />
                                
                                    <button type="submit" className="btn btn-primary" disabled={postingBounty}>
                                        {postingBounty ? 'Posting...' : 'Post Bounty'}
                                    </button>
                                </div>
                                {bountyError && <p className="error-text">{bountyError}</p>}
                            </form>
                        </div>

                        <BountyBoard key={bountyRefreshKey} />
                    </>
                )}

                {activeTab === 'duel' && <DuelBoard variant="main" />}

                {activeTab === 'competition' && (
                    <>
                        <div className="create-post-card panel competition-host-cta">
                            <div>
                                <h3 className="section-heading">Host a Coding Competition</h3>
                                <p className="empty-state">Set a problem, a time window, and let the community compete.</p>
                            </div>
                            <Link to="/host-competition" className="btn btn-primary">
                                + Host a Competition
                            </Link>
                        </div>

                        <CompetitionBoard />
                    </>
                )}
            </main>

            {/* RIGHT: activity + stats for whichever tab is active */}
            <aside className="extra-options">
                {activeTab === 'duel' && (
                    <>
                        <DuelStats />
                        <DuelBoard variant="sidebar" />
                    </>
                )}
                {activeTab === 'bounty' && <BountyStats refreshKey={bountyRefreshKey} />}
                {activeTab === 'competition' && <CompetitionStats />}
            </aside>
        </div>
    );
};

export default Challenges;
