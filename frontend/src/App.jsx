import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
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
import Milestones from "./pages/Milestones";
import Extra from "./pages/Extra";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Maps a URL path to the navbar tab it corresponds to, so the highlighted
// tab always matches the actual page — including on refresh, back/forward,
// or any navigation that isn't a direct click on a tab (e.g. a username
// link elsewhere in the app taking you to your own profile).
// "/" is ambiguous between Global and Following (both live at "/"), so
// that distinction is left to the tabs' own onClick handlers below.
const PATH_PREFIX_TO_FEED = [
  ["/discover", "discover"],
  ["/groups", "groups"],
  ["/group/", "groups"],
  ["/chat", "chat"],
  ["/challenges", "challenges"],
  ["/extra", "extra"],
];

function deriveActiveFeed(pathname, myUsername) {
  if (myUsername && pathname.startsWith(`/profile/${myUsername}`)) return "profile";
  const match = PATH_PREFIX_TO_FEED.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : null;
}

const NavigationBar = ({ activeFeed, setHomeSubFeed }) => {
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
          onClick={() => setHomeSubFeed("global")}
        >
          stackUnderflow
        </Link>

        {token && (
          <div className="navbar__tabs">
            <Link
              to="/"
              onClick={() => setHomeSubFeed("global")}
              className={`navbar__tab ${activeFeed === "global" ? "navbar__tab--active" : ""}`}
            >
              Global
            </Link>
            <Link
              to="/"
              onClick={() => setHomeSubFeed("following")}
              className={`navbar__tab ${activeFeed === "following" ? "navbar__tab--active" : ""}`}
            >
              Following
            </Link>
            <Link
              to="/discover"
              className={`navbar__tab ${activeFeed === "discover" ? "navbar__tab--active" : ""}`}
            >
              Discover
            </Link>
            <Link
              to="/groups"
              className={`navbar__tab ${activeFeed === "groups" ? "navbar__tab--active" : ""}`}
            >
              Groups
            </Link>
            <Link
              to="/chat"
              className={`navbar__tab ${activeFeed === "chat" ? "navbar__tab--active" : ""}`}
            >
              Messages
            </Link>
            <Link                                                          
              to="/challenges"                                             
              className={`navbar__tab ${activeFeed === "challenges" ? "navbar__tab--active" : ""}`}
            >                                                              
              Competition                                             
            </Link>
            <Link
              to="/extra"
              className={`navbar__tab ${activeFeed === "extra" ? "navbar__tab--active" : ""}`}
            >
              Extra
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
    </nav>
  );
};

function AppContent() {
  const location = useLocation();
  const myUsername = localStorage.getItem("username");

  // Only Global vs Following needs real state — both live at "/" so the
  // URL alone can't tell them apart. Every other tab (and Profile) is
  // derived straight from the current path on every render, so it's
  // always correct on refresh, back/forward, or any other navigation —
  // no separate state to fall out of sync with the URL.
  const [homeSubFeed, setHomeSubFeed] = useState("global");
  const activeFeed =
    deriveActiveFeed(location.pathname, myUsername) ??
    (location.pathname === "/" ? homeSubFeed : null);

  return (
    <>
      <NavigationBar activeFeed={activeFeed} setHomeSubFeed={setHomeSubFeed} />
      <SearchBar />
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
          path="/milestones"
          element={
            <ProtectedRoute>
              <Milestones />
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
        <Route
          path="/extra"
          element={
            <ProtectedRoute>
              <Extra />
            </ProtectedRoute>
          }
        />        
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
