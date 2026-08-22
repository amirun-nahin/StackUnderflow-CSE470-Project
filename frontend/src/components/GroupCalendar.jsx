import { useState } from 'react';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const GroupCalendar = ({ meetings }) => {
    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

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
        </div>
    );
};

export default GroupCalendar;
