import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Radio, ShieldAlert, PlayCircle } from 'lucide-react';

export default function Navbar() {
  const links = [
    { to: "/", label: "Risk Command", icon: <LayoutDashboard size={18} /> },
    { to: "/live", label: "Global Monitor", icon: <Activity size={18} /> },
    { to: "/demo", label: "Mission Sim", icon: <PlayCircle size={18} /> },
    { to: "/constellation", label: "Fleet Intel", icon: <Radio size={18} /> },
  ];

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-20 md:w-64 bg-slate-950 border-r border-white/5 flex flex-col z-50">
      {/* Brand */}
      <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <ShieldAlert className="text-white" size={24} />
        </div>
        <div className="hidden md:block ml-3">
             <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                ASRIDE
            </h1>
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Defense System</span>
        </div>
      </div>

      {/* Links */}
      <div className="flex-grow py-6 space-y-2 px-2 md:px-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 group ${
                isActive
                  ? "bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <span className="group-hover:scale-110 transition-transform">{link.icon}</span>
            <span className="hidden md:block text-sm font-medium tracking-wide">{link.label}</span>
            {link.label === "Global Monitor" && (
                <span className="hidden md:flex ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
            )}
          </NavLink>
        ))}
      </div>

      {/* System Status Foot */}
      <div className="p-4 border-t border-white/5 hidden md:block">
        <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">System Status</span>
                <span className="text-[10px] font-mono text-green-400">ONLINE</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="w-full h-full bg-green-500/50 animate-pulse"></div>
            </div>
        </div>
      </div>
    </nav>
  );
}
