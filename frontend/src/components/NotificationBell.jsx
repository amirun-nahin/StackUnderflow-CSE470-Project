import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const wrapperRef = useRef(null);

    const token = localStorage.getItem('accessToken');

    const fetchNotifications = () => {
        if (!token) return;
        fetch('http://localhost:3001/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => (res.ok ? res.json() : []))
            .then(data => setNotifications(data))
            .catch(err => console.error('Failed to fetch notifications', err));
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleNotificationClick = async (notification) => {
        setOpen(false);

        if (!notification.is_read) {
            try {
                await fetch(`http://localhost:3001/api/notifications/${notification.id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setNotifications(prev =>
                    prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
                );
            } catch (error) {
                console.error('Failed to mark notification read', error);
            }
        }

        if (notification.link) navigate(notification.link);
    };

    if (!token) return null;

    return (
        <div className="notification-bell" ref={wrapperRef}>
            <button
                type="button"
                className="notification-bell__trigger"
                onClick={() => setOpen(!open)}
            >
                🕭
                {unreadCount > 0 && (
                    <span className="notification-bell__badge">{unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="notification-bell__dropdown">
                    <p className="chat-dropdown-title">Notifications</p>
                    {notifications.length > 0 ? (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`chat-user-item ${!notification.is_read ? 'chat-user-item--active' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <p>{notification.message}</p>
                                <span className="discover-card__meta">
                                    {new Date(notification.createdAt).toLocaleString()}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="chat-empty-text">No notifications yet.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
