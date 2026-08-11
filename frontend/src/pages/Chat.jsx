import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const Chat = () => {
  const location = useLocation();

  // New State Management
  const [conversations, setConversations] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [showFollowersMenu, setShowFollowersMenu] = useState(false);

  const [activeUser, setActiveUser] = useState(
    location.state?.openUser || null,
  );
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem("accessToken");

  // Fetch Active Conversations (with polling so new chats appear instantly)
  useEffect(() => {
    const fetchConversations = () => {
      fetch("http://localhost:3001/api/chat/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          // Keep the active user in the list if they came from the homepage routing
          if (activeUser && !data.find((u) => u.id === activeUser.id)) {
            setConversations([activeUser, ...data]);
          } else {
            setConversations(data);
          }
        })
        .catch((err) => console.error(err));
    };

    fetchConversations(); // Fetch immediately
    const interval = setInterval(fetchConversations, 5000); // Check for new chats every 5s

    return () => clearInterval(interval);
  }, [token, activeUser]);

  // Fetch Followers (Triggered by the New Chat button)
  const handleOpenNewChat = async () => {
    if (followers.length === 0) {
      try {
        const res = await fetch("http://localhost:3001/api/chat/followers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setFollowers(await res.json());
      } catch (err) {
        console.error(err);
      }
    }
    setShowFollowersMenu(!showFollowersMenu);
  };

  const startConversation = (user) => {
    setActiveUser(user);
    setShowFollowersMenu(false);
    // Add to active list immediately if not already there
    if (!conversations.find((u) => u.id === user.id)) {
      setConversations((prev) => [user, ...prev]);
    }
  };

  // Polling for Messages
  useEffect(() => {
    if (!activeUser) return;
    setMessages([]);
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `http://localhost:3001/api/chat/${activeUser.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();

          setMessages((prevMessages) => {
            if (prevMessages.length !== data.length) {
              return data;
            }
            return prevMessages;
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeUser, token]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/chat/${activeUser.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text_content: newMessage }),
        },
      );

      if (res.ok) {
        const sentMsg = await res.json();
        setMessages((prev) => [...prev, sentMsg]);
        setNewMessage("");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="page-container">
      <h1 className="discover-heading">Messages</h1>
      <div className="chat-layout">
        {/* Left Sidebar - Active Conversations */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <span>Conversations</span>
          </div>

          {/* Active Conversations List */}
          <div className="chat-sidebar-list">
            {conversations.length > 0
              ? conversations.map((user) => (
                  <div
                    key={user.id}
                    className={`chat-user-item ${activeUser?.id === user.id ? "chat-user-item--active" : ""}`}
                    onClick={() => setActiveUser(user)}
                  >
                    {user.username}
                  </div>
                ))
              : !showFollowersMenu && (
                  <p className="chat-empty-text">No active conversations.</p>
                )}
          </div>

          {/* New Chat Dropdown Menu */}
          {showFollowersMenu && (
            <div className="chat-dropdown-menu">
              <p className="chat-dropdown-title">Start Chat With:</p>
              {followers.length > 0 ? (
                followers.map((f) => (
                  <div
                    key={f.id}
                    className="chat-user-item"
                    onClick={() => startConversation(f)}
                  >
                    {f.username}
                  </div>
                ))
              ) : (
                <p className="chat-empty-text">You have no followers yet.</p>
              )}
            </div>
          )}

          {/* Sidebar Footer with the Button */}
          <div className="chat-sidebar-footer">
            <button
              className="btn btn-outline btn-block"
              onClick={handleOpenNewChat}
            >
              {showFollowersMenu ? "Close Menu" : "+ New Conversation"}
            </button>
          </div>
        </div>

        {/* Right Window - Chat Area */}
        <div className="chat-window">
          {activeUser ? (
            <>
              <div className="chat-window-header">
                Chat with {activeUser.username}
              </div>

              <div className="chat-messages">
                {messages.map((msg) => {
                  const isReceived = msg.SenderId === activeUser.id;

                  // Format full date and time for the hover (e.g., "Oct 24, 10:45 AM")
                  const hoverDateTime = new Date(msg.createdAt).toLocaleString([], { 
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`chat-bubble ${isReceived ? "chat-bubble--received" : "chat-bubble--sent"}`}
                      title={hoverDateTime}
                    >
                      {msg.text_content}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="chat-input-area">
                <input
                  type="text"
                  className="chat-input"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                />
                <button type="submit" className="btn btn-primary">
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state chat-window-empty">
              Select a conversation to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
