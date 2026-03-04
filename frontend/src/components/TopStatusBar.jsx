import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Wifi, X, AlertTriangle, Shield, Satellite, Clock } from 'lucide-react';

function StatusPill({ children, variant = 'default' }) {
    const styles = {
        default: 'bg-white/[0.04] border-white/[0.06] text-text-secondary',
        live: 'bg-status-success/10 border-status-success/20 text-status-success',
        sim: 'bg-status-warning/10 border-status-warning/20 text-status-warning',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${styles[variant]}`}>
            {children}
        </span>
    );
}

/* ─── Notification Panel ─── */
function NotificationPanel({ isOpen, onClose, notifications }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={onClose}
                    />
                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-12 right-0 z-50 w-[360px] glass-surface rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-divider">
                            <div className="flex items-center gap-2">
                                <Bell size={14} className="text-text-primary" />
                                <span className="text-[13px] font-semibold text-text-primary">Notifications</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-text-tertiary font-mono">{notifications.length}</span>
                                <button onClick={onClose} className="p-1 rounded-md hover:bg-white/[0.06] text-text-tertiary transition-colors">
                                    <X size={13} />
                                </button>
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[360px] overflow-y-auto scrollbar-hide">
                            {notifications.length === 0 ? (
                                <div className="px-5 py-12 text-center">
                                    <Bell size={28} className="mx-auto mb-3 text-text-tertiary/50" />
                                    <p className="text-[13px] text-text-tertiary">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map((notif, i) => (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, x: 8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="px-5 py-3.5 border-b border-divider last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${notif.type === 'critical' ? 'bg-status-critical/10' :
                                                    notif.type === 'warning' ? 'bg-status-warning/10' :
                                                        notif.type === 'success' ? 'bg-status-success/10' :
                                                            'bg-accent-blue/10'
                                                }`}>
                                                {notif.type === 'critical' ? <AlertTriangle size={14} className="text-status-critical" /> :
                                                    notif.type === 'warning' ? <Shield size={14} className="text-status-warning" /> :
                                                        notif.type === 'success' ? <Satellite size={14} className="text-status-success" /> :
                                                            <Bell size={14} className="text-accent-blue" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-semibold text-text-primary mb-0.5">{notif.title}</div>
                                                <div className="text-[11px] text-text-secondary leading-relaxed">{notif.message}</div>
                                                <div className="text-[10px] text-text-tertiary mt-1.5 flex items-center gap-1">
                                                    <Clock size={10} /> {notif.time}
                                                </div>
                                            </div>
                                            {!notif.read && (
                                                <div className="w-[6px] h-[6px] rounded-full bg-accent-blue shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-5 py-3 border-t border-divider">
                                <button className="w-full text-center text-[12px] font-medium text-accent-blue hover:text-accent-blue-hover transition-colors">
                                    Mark all as read
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default function TopStatusBar({ isDemoMode, satellitesCount, onSearchOpen }) {
    const [time, setTime] = useState(new Date());
    const [notifOpen, setNotifOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Generate realistic notifications
    const notifications = useMemo(() => [
        { id: 1, type: 'critical', title: 'High-Risk Conjunction', message: 'ISS (ZARYA) ↔ COSMOS 2251 DEB — 72.3% probability, 0.8 km miss distance', time: '2 min ago', read: false },
        { id: 2, type: 'warning', title: 'Orbit Decay Alert', message: 'ENVISAT altitude decreased by 1.2 km in the last 24 hours', time: '15 min ago', read: false },
        { id: 3, type: 'success', title: 'TLE Updated', message: '847 orbital elements refreshed from Space-Track.org', time: '32 min ago', read: true },
        { id: 4, type: 'info', title: 'Constellation Loaded', message: 'STARLINK constellation: 5,800 objects tracked and mapped', time: '1 hr ago', read: true },
        { id: 5, type: 'warning', title: 'Solar Storm Advisory', message: 'G2-level geomagnetic storm forecast — increased drag on LEO objects expected', time: '2 hr ago', read: true },
        { id: 6, type: 'success', title: 'Avoidance Maneuver Computed', message: 'Delta-V: 0.32 m/s for NOAA 20 to clear debris corridor', time: '3 hr ago', read: true },
    ], []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="absolute top-0 left-16 right-0 h-14 z-30 flex items-center justify-between px-6 pointer-events-auto"
            style={{
                background: 'linear-gradient(to bottom, rgba(15, 17, 21, 0.85) 0%, rgba(15, 17, 21, 0) 100%)',
            }}
        >
            {/* Left — Status */}
            <div className="flex items-center gap-4">
                <StatusPill variant={isDemoMode ? 'sim' : 'live'}>
                    <span className={`w-[5px] h-[5px] rounded-full ${isDemoMode ? 'bg-status-warning' : 'bg-status-success'}`} />
                    {isDemoMode ? 'Simulation' : 'Live'}
                </StatusPill>

                <div className="flex items-center gap-2 text-[12px] text-text-secondary">
                    <Wifi size={13} className="text-status-success" />
                    <span><span className="text-text-primary font-medium">{satellitesCount}</span> objects</span>
                </div>
            </div>

            {/* Center — Search trigger */}
            <button
                onClick={onSearchOpen}
                className="hidden md:flex items-center gap-3 px-4 py-[7px] rounded-[10px] bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-150 cursor-text group min-w-[320px]"
            >
                <Search size={14} className="text-text-tertiary group-hover:text-text-secondary transition-colors" />
                <span className="text-[13px] text-text-tertiary group-hover:text-text-secondary transition-colors flex-1 text-left">Search objects...</span>
                <kbd className="text-[10px] text-text-tertiary bg-white/[0.06] px-1.5 py-0.5 rounded font-mono border border-white/[0.06]">/</kbd>
            </button>

            {/* Right — Notifications + Clock */}
            <div className="flex items-center gap-3 relative">
                <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className={`relative p-2 rounded-lg transition-all duration-150 ${notifOpen ? 'bg-white/[0.08] text-text-primary' : 'hover:bg-white/[0.04] text-text-secondary hover:text-text-primary'}`}
                >
                    <Bell size={17} strokeWidth={1.8} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-accent-blue rounded-full flex items-center justify-center ring-2 ring-surface-bg">
                            <span className="text-[9px] text-white font-bold">{unreadCount}</span>
                        </span>
                    )}
                </button>

                <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} />

                <div className="h-5 w-px bg-divider" />

                <div className="font-mono text-[12px] text-text-secondary tracking-wide tabular-nums">
                    {time.toISOString().split('T')[1].split('.')[0]} <span className="text-text-tertiary text-[10px]">UTC</span>
                </div>
            </div>
        </motion.header>
    );
}
