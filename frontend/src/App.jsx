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
import Discover from "./pages/Discover";
import BountyDetail from "./pages/BountyDetail";
import CompetitionDetail from "./pages/CompetitionDetail";
import HostCompetition from "./pages/HostCompetition";
import Groups from "./pages/Groups";
import CreateGroup from "./pages/CreateGroup";
import GroupDetail from "./pages/GroupDetail";
import Chat from "./pages/Chat";
import NewsReader from "./pages/NewsReader";
import Challenges from "./pages/Challenges";
import DuelDetail from "./pages/DuelDetail";
import NotificationBell from "./components/NotificationBell";
import SearchBar from "./components/SearchBar";

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
    <nav className="navbar">
      <div className="navbar__left">
        <Link
          to="/"
          className="navbar__brand"
          onClick={() => setActiveFeed("global")}
        >
          stackUnderflow
        </Link>

        {token && (
          <div className="navbar__tabs">
            <Link
              to="/"
              onClick={() => setActiveFeed("global")}
              className={`navbar__tab ${activeFeed === "global" ? "navbar__tab--active" : ""}`}
            >
              Global
            </Link>
            <Link
              to="/"
              onClick={() => setActiveFeed("following")}
              className={`navbar__tab ${activeFeed === "following" ? "navbar__tab--active" : ""}`}
            >
              Following
            </Link>
            <Link
              to="/discover"
              onClick={() => setActiveFeed("discover")}
              className={`navbar__tab ${activeFeed === "discover" ? "navbar__tab--active" : ""}`}
            >
              Discover
            </Link>
            <Link
              to="/groups"
              onClick={() => setActiveFeed("groups")}
              className={`navbar__tab ${activeFeed === "groups" ? "navbar__tab--active" : ""}`}
            >
              Groups
            </Link>
            <Link
              to="/chat"
              onClick={() => setActiveFeed("chat")}
              className={`navbar__tab ${activeFeed === "chat" ? "navbar__tab--active" : ""}`}
            >
              Messages
            </Link>
            <Link                                                          
              to="/challenges"                                             
              onClick={() => setActiveFeed("challenges")}                  
              className={`navbar__tab ${activeFeed === "challenges" ? "navbar__tab--active" : ""}`}
            >                                                              
              Competition                                             
            </Link>
          </div>
        )}
      </div>

      <div className="navbar__right">
        {token ? (
          <>
            <NotificationBell />
            <Link
              to={`/profile/${myUsername}`}
              className={`navbar__profile-link ${activeFeed === "profile" ? "navbar__profile-link--active" : ""}`}
              onClick={() => setActiveFeed("profile")}
            >
              Profile
            </Link>
            <button onClick={handleLogout} className="btn btn-outline btn-outline--danger btn-sm">
              Logout
            </button>
          </>
        ) : (
          <div className="navbar__auth-links">
            <Link to="/login" className="navbar__auth-link">
              Login
            </Link>
            <Link to="/register" className="navbar__auth-link">
              Register
            </Link>
          </div>
        )}
      </div>
      <SearchBar />
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
        <Route
          path="/bounty/:id"
          element={
            <ProtectedRoute>
              <BountyDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competition/:id"
          element={
            <ProtectedRoute>
              <CompetitionDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host-competition"
          element={
            <ProtectedRoute>
              <HostCompetition />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <Groups />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-group"
          element={
            <ProtectedRoute>
              <CreateGroup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/group/:id"
          element={
            <ProtectedRoute>
              <GroupDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/news/:id"
          element={
            <ProtectedRoute>
              <NewsReader />
            </ProtectedRoute>
          }
        />
        <Route
          path="/challenges"
          element={
            <ProtectedRoute>
              <Challenges />
            </ProtectedRoute>
          }
        />
        <Route
          path="/duel/:id"
          element={
            <ProtectedRoute>
              <DuelDetail />
            </ProtectedRoute>
          }
        />        
      </Routes>
    </Router>
  );
}

export default App;
