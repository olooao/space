import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import LiveMonitor from "./pages/LiveMonitor";
import MissionDemo from "./pages/MissionDemo";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
        
        {/* Navigation Sidebar */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-grow md:ml-64 p-4 md:p-6 overflow-hidden">
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/live" element={<LiveMonitor />} />
                <Route path="/demo" element={<MissionDemo />} />
                <Route path="/constellation" element={<Navigate to="/" replace />} /> {/* Placeholder to redirect back for now */}
            </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
