import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import LiveMonitor from "./pages/LiveMonitor";
import MissionDemo from "./pages/MissionDemo";
import Landing from "./pages/Landing"; // Import the new page

function Layout({ children }) {
  const location = useLocation();
  // Hide Navbar on Landing Page for full immersion
  const showNav = location.pathname !== "/"; 

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {showNav && <Navbar />}
      <main className={`flex-grow ${showNav ? 'md:ml-64 p-4 md:p-6' : ''} overflow-hidden`}>
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
            {/* Landing is now Home */}
            <Route path="/" element={<Landing />} />
            
            {/* Dashboard moved to /dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route path="/live" element={<LiveMonitor />} />
            <Route path="/demo" element={<MissionDemo />} />
            <Route path="/constellation" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;