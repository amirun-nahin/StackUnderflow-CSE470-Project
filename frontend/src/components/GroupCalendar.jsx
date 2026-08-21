import { useState } from 'react';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const GroupCalendar = ({ meetings, canSchedule, onSchedule }) => {
    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [showModal, setShowModal] = useState(false);
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const meetingDays = new Set(
        meetings
            .filter((m) => {
                const d = new Date(m.scheduled_at);
                return d.getFullYear() === year && d.getMonth() === month;
            })
            .map((m) => new Date(m.scheduled_at).getDate())
    );

    const isToday = (day) =>
        today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const upcomingMeetings = meetings
        .filter((m) => new Date(m.scheduled_at) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formDate || !formTime || !formDescription.trim()) return;

        setSubmitting(true);
        setFormError('');
        try {
            await onSchedule({
                description: formDescription.trim(),
                scheduled_at: new Date(`${formDate}T${formTime}`).toISOString()
            });
            setShowModal(false);
            setFormDate('');
            setFormTime('');
            setFormDescription('');
        } catch (error) {
            setFormError(error.message || 'Failed to schedule meeting');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="panel calendar-widget">
            <div className="calendar-header">
                <button type="button" className="calendar-nav-btn" onClick={goPrevMonth} aria-label="Previous month">‹</button>
                <span className="calendar-month-label">{monthLabel}</span>
                <button type="button" className="calendar-nav-btn" onClick={goNextMonth} aria-label="Next month">›</button>
            </div>

            <div className="calendar-weekdays">
                {WEEKDAY_LABELS.map((w, i) => (
                    <span key={i} className="calendar-weekday">{w}</span>
                ))}
            </div>

            <div className="calendar-grid">
                {cells.map((day, i) => (
                    <div
                        key={i}
                        className={`calendar-day ${day === null ? 'calendar-day--empty' : ''} ${day && isToday(day) ? 'calendar-day--today' : ''}`}
                    >
                        {day && <span>{day}</span>}
                        {day && meetingDays.has(day) && <span className="calendar-day-dot" />}
                    </div>
                ))}
            </div>

            {canSchedule && (
                <button type="button" className="btn btn-outline btn-sm calendar-schedule-btn" onClick={() => setShowModal(true)}>
                    + Schedule Meeting
                </button>
            )}

            <div className="calendar-upcoming">
                <p className="search-section-title">Upcoming Meetings</p>
                {upcomingMeetings.length === 0 ? (
                    <p className="empty-state">No meetings scheduled.</p>
                ) : (
                    <div className="calendar-meeting-list">
                        {upcomingMeetings.map((m) => (
                            <div key={m.id} className="calendar-meeting-item">
                                <p className="calendar-meeting-item__date">
                                    {new Date(m.scheduled_at).toLocaleString(undefined, {
                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                    })}
                                </p>
                                <p className="calendar-meeting-item__desc">{m.description}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Schedule Meeting</h3>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="profile-edit-form">
                            <div className="input-group">
                                <label>Date</label>
                                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
                            </div>
                            <div className="input-group">
                                <label>Time</label>
                                <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} required />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea
                                    className="post-textarea"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="What's this meeting about?"
                                    required
                                />
                            </div>
                            {formError && <p className="github-error">{formError}</p>}
                            <div className="profile-edit-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Scheduling...' : 'Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupCalendar;
