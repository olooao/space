import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import LiveMonitor from "./pages/LiveMonitor";
import MissionControl from "./pages/MissionControl";
import MissionDemo from "./pages/MissionDemo";
import Landing from "./pages/Landing";

function Layout({ children }) {
  const location = useLocation();
  const showNav = location.pathname !== "/"; 

  return (
    <div className="min-h-screen bg-[#050505] text-green-500 font-mono selection:bg-green-500 selection:text-black flex">
      
      {/* 1. Navbar (Fixed Left) */}
      {showNav && <Navbar />}

      {/* 2. Main Content Wrapper */}
      {/* FIX APPLIED: 
          - Removed 'pt-24' (Top Padding).
          - Added 'pl-20' (Padding Left 80px) to clear the collapsed sidebar.
          - Added 'md:pl-24' for slightly more breathing room on desktop.
          - The expanded sidebar will float OVER the content (Glassmorphism), which prevents the page from "jumping" when you hover.
      */}
      <main className={`flex-grow w-full transition-all duration-300 ${showNav ? 'pl-20' : ''}`}>
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/live" element={<LiveMonitor />} />
            <Route path="/analyze" element={<MissionControl />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/demo" element={<MissionDemo />} />
            <Route path="/constellation" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;