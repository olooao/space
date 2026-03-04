import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Monitor, Database, Keyboard, Info, Moon, Zap, Bell, RotateCcw, Check, Volume2, VolumeX } from 'lucide-react';
import { useAppStore } from '../store/appStore';

/* ─── Toast notification ─── */
function Toast({ message, visible }) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white text-[13px] font-medium rounded-xl shadow-lg shadow-accent-blue/20"
                >
                    <Check size={15} /> {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ─── Toggle ─── */
const Toggle = ({ active, onClick, variant = 'blue' }) => {
    const colors = {
        blue: active ? 'bg-accent-blue' : 'bg-surface-elevated',
        green: active ? 'bg-status-success' : 'bg-surface-elevated',
        red: active ? 'bg-status-critical' : 'bg-surface-elevated',
    };
    return (
        <button onClick={onClick} className={`w-[40px] h-[22px] rounded-full p-[2px] transition-colors duration-200 shrink-0 ${colors[variant]}`}>
            <motion.div className="w-[18px] h-[18px] rounded-full bg-white shadow-sm" animate={{ x: active ? 18 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
        </button>
    );
};

/* ─── Section ─── */
const Section = ({ title, icon: Icon, children, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
    >
        <div className="flex items-center gap-2.5 mb-4 px-1">
            <Icon size={16} className="text-accent-blue" />
            <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
        </div>
        <div className="bg-surface-panel border border-white/[0.04] rounded-2xl overflow-hidden divide-y divide-divider">{children}</div>
    </motion.div>
);

/* ─── Setting Row ─── */
const SettingRow = ({ label, description, children }) => (
    <div className="flex items-center justify-between py-3.5 px-5 hover:bg-white/[0.015] transition-colors">
        <div className="flex-1 pr-6">
            <div className="text-[13px] font-medium text-text-primary">{label}</div>
            {description && <div className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">{description}</div>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

/* ─── Shortcut Row ─── */
const ShortcutRow = ({ keys, action }) => (
    <div className="flex items-center justify-between py-3 px-5">
        <span className="text-[13px] text-text-secondary">{action}</span>
        <div className="flex items-center gap-1">
            {keys.map((k, i) => (
                <kbd key={i} className="text-[11px] text-text-primary bg-surface-elevated px-2 py-1 rounded-lg font-mono border border-white/[0.06] min-w-[28px] text-center">{k}</kbd>
            ))}
        </div>
    </div>
);

/* ─── Slider ─── */
const SettingSlider = ({ value, onChange, min, max, step, unit, label }) => (
    <div className="flex items-center gap-3">
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-24 accent-accent-blue cursor-pointer"
        />
        <span className="text-[12px] text-text-primary font-mono min-w-[40px] text-right">{value}{unit}</span>
    </div>
);

export default function SettingsPage() {
    const { settings, updateSetting, resetSettings } = useAppStore();
    const [toast, setToast] = useState({ visible: false, message: '' });

    const showToast = useCallback((message) => {
        setToast({ visible: true, message });
        setTimeout(() => setToast({ visible: false, message: '' }), 2000);
    }, []);

    const handleToggle = (key) => {
        updateSetting(key, !settings[key]);
        showToast(`${key === 'demoMode' ? 'Demo mode' : key === 'autoRotate' ? 'Auto-rotate' : key === 'highPerformance' ? 'High performance' : key === 'notifications' ? 'Notifications' : 'Sound effects'} ${!settings[key] ? 'enabled' : 'disabled'}`);
    };

    const handleReset = () => {
        resetSettings();
        showToast('Settings reset to defaults');
    };

    return (
        <div className="h-full overflow-y-auto bg-surface-bg text-text-primary font-sans pl-16">
            {/* Header */}
            <header className="px-8 py-6 border-b border-divider">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <SettingsIcon size={20} className="text-accent-blue" />
                            <h1 className="text-[22px] font-bold tracking-tight">Settings</h1>
                        </div>
                        <p className="text-[13px] text-text-secondary">Configure visualization, data sources, and preferences</p>
                    </div>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-text-secondary hover:text-text-primary bg-surface-panel border border-white/[0.06] hover:border-white/[0.1] transition-all"
                    >
                        <RotateCcw size={13} /> Reset All
                    </button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-8 py-8">

                {/* ── Appearance ── */}
                <Section title="Appearance" icon={Monitor} delay={0.05}>
                    <SettingRow label="Auto-Rotate Globe" description="Slowly rotates the 3D globe when no mouse interaction is detected">
                        <Toggle active={settings.autoRotate} onClick={() => handleToggle('autoRotate')} />
                    </SettingRow>
                    <SettingRow label="Dark Mode" description="Interface color scheme — dark mode optimized for mission control environments">
                        <div className="flex items-center gap-2 text-[12px] text-text-tertiary">
                            <Moon size={14} /> Always Dark
                        </div>
                    </SettingRow>
                    <SettingRow label="High Performance Mode" description="Disables atmosphere glow, reduces star count, and lowers DPR for smoother rendering on integrated GPUs">
                        <Toggle active={settings.highPerformance} onClick={() => handleToggle('highPerformance')} variant="green" />
                    </SettingRow>
                </Section>

                {/* ── Data Source ── */}
                <Section title="Data Source" icon={Database} delay={0.1}>
                    <SettingRow label="Demo Mode" description="Simulates satellite positions and conjunction alerts without requiring a running backend">
                        <Toggle active={settings.demoMode} onClick={() => handleToggle('demoMode')} />
                    </SettingRow>
                    <SettingRow label="API Endpoint" description="Backend server for SGP4 propagation, collision analysis, and Kessler simulation">
                        <code className="text-[11px] text-text-secondary bg-surface-elevated px-3 py-1.5 rounded-lg border border-white/[0.06] font-mono">localhost:8000</code>
                    </SettingRow>
                    <SettingRow label="TLE Update Interval" description="How frequently orbital elements are re-fetched from the API">
                        <SettingSlider
                            value={settings.tleUpdateInterval}
                            onChange={(v) => { updateSetting('tleUpdateInterval', v); showToast(`Update interval set to ${v}s`); }}
                            min={1} max={30} step={1} unit="s"
                        />
                    </SettingRow>
                </Section>

                {/* ── Notifications ── */}
                <Section title="Notifications" icon={Bell} delay={0.15}>
                    <SettingRow label="Conjunction Alerts" description="Display popup alerts when collision probability exceeds the threshold below">
                        <Toggle active={settings.notifications} onClick={() => handleToggle('notifications')} />
                    </SettingRow>
                    <SettingRow label="Sound Effects" description="Play an audio chime on critical conjunction warnings">
                        <div className="flex items-center gap-3">
                            {settings.soundEffects ? <Volume2 size={16} className="text-text-secondary" /> : <VolumeX size={16} className="text-text-tertiary" />}
                            <Toggle active={settings.soundEffects} onClick={() => handleToggle('soundEffects')} variant="green" />
                        </div>
                    </SettingRow>
                    <SettingRow label="Alert Threshold" description="Minimum collision probability (%) required to trigger a notification">
                        <SettingSlider
                            value={settings.alertThreshold}
                            onChange={(v) => { updateSetting('alertThreshold', v); showToast(`Alert threshold set to ${v}%`); }}
                            min={5} max={95} step={5} unit="%"
                        />
                    </SettingRow>
                </Section>

                {/* ── Keyboard Shortcuts ── */}
                <Section title="Keyboard Shortcuts" icon={Keyboard} delay={0.2}>
                    <ShortcutRow keys={['/']} action="Open Command Palette" />
                    <ShortcutRow keys={['↑', '↓']} action="Navigate Search Results" />
                    <ShortcutRow keys={['↵']} action="Select / Confirm" />
                    <ShortcutRow keys={['Esc']} action="Close Modal / Dismiss" />
                    <ShortcutRow keys={['A']} action="Toggle Conjunction Alerts" />
                    <ShortcutRow keys={['D']} action="Toggle Demo Mode" />
                    <ShortcutRow keys={['L']} action="Toggle Live Data Feed" />
                </Section>

                {/* ── About ── */}
                <Section title="About" icon={Info} delay={0.25}>
                    <div className="p-5">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-11 h-11 rounded-xl bg-accent-blue flex items-center justify-center shadow-[0_2px_12px_rgba(76,139,245,0.3)]">
                                <span className="text-white text-[18px] font-bold">O</span>
                            </div>
                            <div>
                                <div className="text-[16px] font-semibold text-text-primary">Orbital Command</div>
                                <div className="text-[12px] text-text-tertiary">Space Situational Awareness Platform</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[12px]">
                            <div className="flex justify-between">
                                <span className="text-text-tertiary">Version</span>
                                <span className="text-text-secondary font-mono">2.1.0</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-tertiary">Build</span>
                                <span className="text-text-secondary font-mono">2026.03.04</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-tertiary">Propagation</span>
                                <span className="text-text-secondary font-mono">SGP4 + TLE</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-tertiary">Renderer</span>
                                <span className="text-text-secondary font-mono">Three.js r169</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-tertiary">Physics</span>
                                <span className="text-text-secondary font-mono">Skyfield + SBAM</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-tertiary">Graphics</span>
                                <span className="text-text-secondary font-mono">WebGL 2.0</span>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Footer spacer */}
                <div className="h-8" />
            </div>

            {/* Toast */}
            <Toast {...toast} />
        </div>
    );
}
