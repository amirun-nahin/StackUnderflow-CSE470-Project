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
            <h1 className="discover-heading">Code Competition Hub</h1>

            <div className="challenges-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        className={`challenges-tab-btn ${activeTab === tab.key ? 'challenges-tab-btn--active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="panel challenges-tab-content">
                {activeTab === 'bounty' && <BountyBoard />}
                {activeTab === 'duel' && <DuelBoard />}
                {activeTab === 'competition' && <CompetitionBoard />}
            </div>
        </div>
    );
};

export default Challenges;
