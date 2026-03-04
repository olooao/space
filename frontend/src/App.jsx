import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import LiveMonitor from "./pages/LiveMonitor";
import MissionControl from "./pages/MissionControl";
import MissionDemo from "./pages/MissionDemo";
import Landing from "./pages/Landing";
import KesslerSimulator from "./pages/KesslerSimulator";
import Settings from "./pages/Settings";

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
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface-bg/90 backdrop-blur-md text-text-primary gap-4 p-8">
          <div className="text-status-critical text-2xl font-sans font-semibold tracking-wide">Interface Error</div>
          <p className="text-[14px] text-text-secondary max-w-md text-center font-sans">
            The spatial visualization component encountered an unexpected error.
          </p>
          <pre className="text-[12px] text-text-secondary bg-surface-panel rounded-lg p-5 max-w-lg overflow-auto border border-white/10 font-mono shadow-md w-full">
            {this.state.error?.message || "Unknown error"}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="btn-primary px-6 py-2.5 rounded-lg text-[13px]"
          >
            Reload Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <AppLayout>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/live" element={<LiveMonitor />} />
            <Route path="/analyze" element={<MissionControl />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/demo" element={<MissionDemo />} />
            <Route path="/kessler" element={<KesslerSimulator />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/constellation" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </AppLayout>
    </Router>
  );
}

export default App;