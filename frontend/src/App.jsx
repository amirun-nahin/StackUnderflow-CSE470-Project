import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PostDetail from "./pages/PostDetail";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover"; // <-- NEW IMPORT

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const NavigationBar = ({ activeFeed, setActiveFeed }) => {
  const token = localStorage.getItem("accessToken");
  const myUsername = localStorage.getItem("username");

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
    window.location.href = "/login";
  };

  return (
    <nav
      className="navbar"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "15px 30px",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
        <Link
          to="/"
          style={{
            fontSize: "20px",
            fontWeight: "800",
            color: "#0f172a",
            textDecoration: "none",
          }}
        >
          StackUnderflow
        </Link>

        {token && (
          <div style={{ display: "flex", gap: "15px" }}>
            <Link
              to="/"
              onClick={() => setActiveFeed("global")}
              style={{
                textDecoration: "none",
                fontWeight: "600",
                color: activeFeed === "global" ? "#3b82f6" : "#64748b",
                borderBottom:
                  activeFeed === "global"
                    ? "2px solid #3b82f6"
                    : "2px solid transparent",
                paddingBottom: "4px",
              }}
            >
              Global
            </Link>
            <Link
              to="/"
              onClick={() => setActiveFeed("following")}
              style={{
                textDecoration: "none",
                fontWeight: "600",
                color: activeFeed === "following" ? "#3b82f6" : "#64748b",
                borderBottom:
                  activeFeed === "following"
                    ? "2px solid #3b82f6"
                    : "2px solid transparent",
                paddingBottom: "4px",
              }}
            >
              Following
            </Link>
            {/* NEW DISCOVER TAB */}
            <Link
              to="/discover"
              onClick={() => setActiveFeed("discover")}
              style={{
                textDecoration: "none",
                fontWeight: "600",
                color: activeFeed === "discover" ? "#3b82f6" : "#64748b",
                borderBottom:
                  activeFeed === "discover"
                    ? "2px solid #3b82f6"
                    : "2px solid transparent",
                paddingBottom: "4px",
              }}
            >
              Discover
            </Link>
          </div>
        )}
      </div>

      <div>
        {token ? (
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <Link
              to={`/profile/${myUsername}`}
              className="nav-link"
              style={{ fontWeight: "600" }}
            >
              My Profile
            </Link>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "15px" }}>
            <Link to="/login" className="nav-link">
              Login
            </Link>
            <Link to="/register" className="nav-link">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

function App() {
  const [activeFeed, setActiveFeed] = useState("global");

  return (
    <Router>
      <NavigationBar activeFeed={activeFeed} setActiveFeed={setActiveFeed} />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home activeFeed={activeFeed} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <Discover />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/post/:id"
          element={
            <ProtectedRoute>
              <PostDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:username"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
