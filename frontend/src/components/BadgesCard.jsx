import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MAX_PINNED = 4;

const BadgesCard = ({ username, isMyProfile }) => {
    const [earned, setEarned] = useState([]);
    const [pinned, setPinned] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const token = localStorage.getItem('accessToken');

    const fetchBadges = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/badges/${username}`, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                setEarned(data.earned || []);
                setPinned(data.pinned || []);
                setSelectedIds((data.pinned || []).map(b => b.id));
            }
        } catch (error) {
            console.error('Failed to fetch badges', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBadges();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= MAX_PINNED) return prev; // already full, ignore
            return [...prev, id];
        });
    };

    const openEditor = () => {
        setSelectedIds(pinned.map(b => b.id));
        setErrorMessage('');
        setEditing(true);
    };

    const savePinned = async () => {
        setSaving(true);
        setErrorMessage('');
        try {
            const response = await fetch('http://localhost:3001/api/badges/pin', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ badge_ids: selectedIds })
            });
            if (response.ok) {
                setEditing(false);
                fetchBadges();
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Could not save badges.');
            }
        } catch (error) {
            console.error('Pin badges error:', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    // Always render a fixed 4-slot grid — unfilled slots stay empty
    const slots = [...pinned];
    while (slots.length < MAX_PINNED) slots.push(null);

    return (
        <div className="panel badges-card">
            <h3 className="section-heading">Badges</h3>

            <div className="badges-card__grid">
                {slots.map((badge, idx) => (
                    <div
                        key={badge?.id || `empty-${idx}`}
                        className={`badges-card__slot ${badge ? 'badges-card__slot--filled' : ''}`}
                        title={badge ? `${badge.name} — ${badge.description}` : 'Empty slot'}
                    >
                        {badge ? badge.icon : ''}
                    </div>
                ))}
            </div>

            {pinned.length === 0 && (
                <p className="empty-state">No badges pinned yet.</p>
            )}

            {isMyProfile && (
                <div className="badges-card__actions">
                    <Link to="/milestones" className="btn btn-outline btn-sm badges-card__edit-btn">
                        Milestones
                    </Link>
                    <button className="btn btn-outline btn-sm badges-card__edit-btn" onClick={openEditor}>
                        Edit Badges
                    </button>
                </div>
            )}

            {editing && (
                <div className="modal-overlay" onClick={() => setEditing(false)}>
                    <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Choose up to {MAX_PINNED} badges</h3>
                            <button className="modal-close-btn" onClick={() => setEditing(false)}>✕</button>
                        </div>

                        {errorMessage && <p className="error-text">{errorMessage}</p>}

                        {earned.length === 0 ? (
                            <p className="empty-state">
                                You haven't earned any badges yet — keep playing Duels, Bounties, and Competitions!
                            </p>
                        ) : (
                            <div className="badges-card__picker-grid">
                                {earned.map(badge => (
                                    <button
                                        type="button"
                                        key={badge.id}
                                        className={`badges-card__picker-item ${selectedIds.includes(badge.id) ? 'badges-card__picker-item--selected' : ''}`}
                                        onClick={() => toggleSelect(badge.id)}
                                    >
                                        <span className="badges-card__picker-icon">{badge.icon}</span>
                                        <span className="badges-card__picker-name">{badge.name}</span>
                                        <span className="badges-card__picker-desc">{badge.description}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="profile-edit-actions">
                            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={savePinned} disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BadgesCard;
