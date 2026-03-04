import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import LiveMonitor from "./pages/LiveMonitor";
import MissionControl from "./pages/MissionControl";
import MissionDemo from "./pages/MissionDemo";
import Landing from "./pages/Landing";
import KesslerSimulator from "./pages/KesslerSimulator";

// --- Error Boundary: prevents blank screen on Three.js / render crash ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-4 p-8">
          <div className="text-red-500 text-4xl font-black tracking-wider">SYSTEM FAULT</div>
          <p className="text-sm text-slate-400 max-w-md text-center font-mono">
            A rendering error occurred. This may be due to WebGL not being available or a component crash.
          </p>
          <pre className="text-xs text-red-400/70 bg-slate-900 rounded-lg p-4 max-w-lg overflow-auto border border-red-900/30">
            {this.state.error?.message || "Unknown error"}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold tracking-wider"
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Layout({ children }) {
  const location = useLocation();
  const showNav = location.pathname !== "/";

  return (
    <div className="h-screen bg-[#050505] text-green-500 font-mono selection:bg-green-500 selection:text-black flex overflow-hidden">

      {/* 1. Navbar (Fixed Left) */}
      {showNav && <Navbar />}

      {/* 2. Main Content Area — scrollable pages (Landing, Live, etc.) use overflow-y-auto */}
      <main className={`flex-1 flex flex-col min-h-0 overflow-y-auto transition-all duration-300 ${showNav ? 'pl-20' : ''}`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
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
            <Route path="/kessler" element={<KesslerSimulator />} />
            <Route path="/constellation" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;