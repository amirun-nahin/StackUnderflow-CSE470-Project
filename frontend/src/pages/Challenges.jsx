import { useState } from 'react';
import BountyBoard from '../components/BountyBoard';
import CompetitionBoard from '../components/CompetitionBoard';
import DuelBoard from '../components/DuelBoard';

const TABS = [
    { key: 'bounty', label: 'Micro Bounty Board' },
    { key: 'duel', label: '1v1 Coding Duel' },
    { key: 'competition', label: 'Timed Coding Competition' }
];

const Challenges = () => {
    const [activeTab, setActiveTab] = useState('bounty');

    return (
        <div className="page-container">
            <div className="form-container form-container--wide">
                <div className="hub-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <h2 className="discover-heading">Code Competition Hub</h2>
                </div>

                {/* Tab Switcher using btn styling */}
                <div className="news-tabs challenges-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'} challenges-tab-btn ${activeTab === tab.key ? 'challenges-tab-btn--active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="feed challenges-tab-content" style={{ marginTop: '1.5rem' }}>
                    {activeTab === 'bounty' && <BountyBoard />}
                    {activeTab === 'duel' && <DuelBoard />}
                    {activeTab === 'competition' && <CompetitionBoard />}
                </div>
            </div>
        </div>
    );
};

export default Challenges;
