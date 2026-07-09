import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

// We extract the Navbar into its own component to keep App clean
const NavigationBar = () => {
  const token = localStorage.getItem('accessToken');

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    window.location.href = '/login'; 
  };

  return (
    <nav className="navbar" style={{ justifyContent: 'flex-end' }}>
      
      {token ? (
        // IF LOGGED IN: ONLY show Logout
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      ) : (
        // IF LOGGED OUT: ONLY show Login and Register
        <>
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/register" className="nav-link">Register</Link>
        </>
      )}
      
    </nav>
  );
};

function App() {
  return (
    <Router>
      <NavigationBar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;
