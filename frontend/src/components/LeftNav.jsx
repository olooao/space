import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Globe, Activity, Target, Layers,
  Settings, Zap
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: Globe, label: 'Overview' },
  { to: '/live', icon: Activity, label: 'Tracking' },
  { to: '/analyze', icon: Target, label: 'Analysis' },
  { to: '/demo', icon: Layers, label: 'Simulator' },
  { to: '/kessler', icon: Zap, label: 'Kessler' },
];

const NavItem = ({ to, icon: Icon, label, expanded }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      group relative flex items-center h-11 rounded-[10px] transition-all duration-200 ease-out
      ${expanded ? 'px-3 mx-2' : 'px-0 mx-auto justify-center w-11'}
      ${isActive
        ? 'bg-accent-blue/[0.12] text-accent-blue'
        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
      }
    `}
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-blue rounded-r-full"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}

        <div className="flex items-center justify-center shrink-0 w-5">
          <Icon
            size={19}
            strokeWidth={isActive ? 2.2 : 1.8}
            className="transition-all duration-200"
          />
        </div>

        {expanded && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="ml-3 text-[13px] font-medium whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </>
    )}
  </NavLink>
);

export default function LeftNav() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.nav
      className="fixed top-0 left-0 h-full flex flex-col z-40 pointer-events-auto"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      animate={{ width: expanded ? 200 : 64 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'linear-gradient(to right, rgba(15, 17, 21, 0.95) 0%, rgba(15, 17, 21, 0.85) 80%, rgba(15, 17, 21, 0) 100%)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <NavLink to="/" className="h-16 flex items-center px-[18px] shrink-0 mt-1 group">
        <div className="w-[28px] h-[28px] rounded-lg bg-accent-blue flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(76,139,245,0.3)] group-hover:scale-110 transition-transform">
          <span className="text-white text-[13px] font-bold leading-none">O</span>
        </div>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: 0.05 }}
            className="ml-3 overflow-hidden"
          >
            <span className="text-[15px] font-semibold text-text-primary tracking-tight">Orbital</span>
          </motion.div>
        )}
      </NavLink>

      {/* Section label */}
      <div className="px-5 mt-6 mb-2">
        {expanded && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider"
          >
            Navigation
          </motion.span>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {navItems.map(item => (
          <NavItem key={item.to} {...item} expanded={expanded} />
        ))}
      </div>

      {/* Bottom Section */}
      <div className="mt-auto pb-5 flex flex-col gap-0.5 border-t border-divider pt-3">
        <NavItem to="/settings" icon={Settings} label="Settings" expanded={expanded} />
      </div>
    </motion.nav>
  );
}
