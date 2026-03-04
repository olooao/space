import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ShieldAlert, Zap, ChevronDown, X, Radio, Eye, Cpu } from 'lucide-react';
import { CONSTELLATIONS } from '../data/satellites';

/* ─── Collapsible Section ─── */
const Section = ({ title, icon: Icon, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-divider last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-3.5 px-5 hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={13} className="text-text-tertiary" />}
                    <span className="text-[12px] font-semibold text-text-primary">{title}</span>
                </div>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} className="text-text-tertiary" />
                </motion.div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─── Toggle Switch ─── */
const Toggle = ({ label, description, active, onClick, variant = 'blue' }) => {
    const trackColor = active
        ? (variant === 'blue' ? 'bg-accent-blue' : variant === 'red' ? 'bg-status-critical' : 'bg-status-success')
        : 'bg-surface-elevated';

    return (
        <button onClick={onClick} className="w-full flex items-start justify-between py-2 group text-left">
            <div className="flex flex-col gap-0.5 pr-4">
                <span className="text-[13px] font-medium text-text-primary group-hover:text-white transition-colors">{label}</span>
                {description && <span className="text-[11px] text-text-tertiary leading-relaxed">{description}</span>}
            </div>
            <div className={`w-[36px] h-[20px] rounded-full p-[2px] transition-colors duration-200 shrink-0 mt-0.5 ${trackColor}`}>
                <motion.div
                    className="w-4 h-4 rounded-full bg-white shadow-sm"
                    animate={{ x: active ? 16 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
            </div>
        </button>
    );
};

/* ─── Constellation Card ─── */
const ConstellationCard = ({ data, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-3 rounded-xl transition-all duration-150 border ${active
                ? 'bg-accent-blue/[0.1] border-accent-blue/30 shadow-[0_0_0_1px_rgba(76,139,245,0.15)]'
                : 'bg-surface-elevated/40 border-transparent hover:bg-surface-hover hover:border-white/[0.06]'
            }`}
    >
        <div className="flex items-center justify-between mb-1">
            <span className={`text-[12px] font-semibold ${active ? 'text-accent-blue' : 'text-text-primary'}`}>{data.name}</span>
            <span className="text-[10px] text-text-tertiary font-mono px-1.5 py-0.5 bg-white/[0.04] rounded">{data.regime}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
            <span>{data.count.toLocaleString()} sats</span>
            <span>·</span>
            <span>{data.altitude}</span>
            <span>·</span>
            <span>{data.operator}</span>
        </div>
    </button>
);

/* ─── Main Panel ─── */
export default function RightControlPanel({
    onConstellationChange,
    activeConstellation,
    kesslerMode,
    setKesslerMode,
    showPaths,
    setShowPaths,
    isDemoMode,
    setIsDemoMode,
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            {/* Collapsed toggle */}
            {!isOpen && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setIsOpen(true)}
                    className="absolute top-20 right-6 z-20 w-10 h-10 rounded-[10px] glass-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-all pointer-events-auto shadow-lg hover:shadow-xl"
                >
                    <SlidersHorizontal size={17} />
                </motion.button>
            )}

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: 340, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 340, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-20 right-6 w-[300px] max-h-[calc(100vh-120px)] flex flex-col z-20 pointer-events-auto"
                    >
                        <div className="glass-surface rounded-2xl shadow-2xl shadow-black/30 overflow-hidden flex flex-col h-full">

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-divider">
                                <div className="flex items-center gap-2.5">
                                    <SlidersHorizontal size={15} className="text-text-primary" />
                                    <span className="text-[14px] font-semibold text-text-primary">Controls</span>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-md hover:bg-white/[0.06] text-text-tertiary hover:text-text-primary transition-all"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto scrollbar-hide">

                                {/* Data Source */}
                                <Section title="Data Source" icon={Cpu} defaultOpen={false}>
                                    <Toggle label="Demo Mode" description="Use simulated satellite data" active={isDemoMode} onClick={() => setIsDemoMode && setIsDemoMode(!isDemoMode)} variant="green" />
                                </Section>

                                {/* Constellations */}
                                <Section title="Constellations" icon={Radio}>
                                    <p className="text-[11px] text-text-tertiary mb-3 leading-relaxed">Filter by operator network</p>
                                    <div className="space-y-2">
                                        {CONSTELLATIONS.map(c => (
                                            <ConstellationCard key={c.name} data={c} active={activeConstellation === c.name} onClick={() => onConstellationChange(c.name)} />
                                        ))}
                                    </div>
                                </Section>

                                {/* Visualization */}
                                <Section title="Visualization" icon={Eye}>
                                    <div className="space-y-3">
                                        <Toggle label="Orbital Paths" description="Show trajectory arcs" active={showPaths} onClick={() => setShowPaths(!showPaths)} />
                                        <Toggle label="Atmosphere" description="Fresnel glow layer" active={true} onClick={() => { }} />
                                        <Toggle label="Coordinate Grid" description="Lat/Lon reference lines" active={true} onClick={() => { }} />
                                        <Toggle label="Ground Tracks" description="Surface projection" active={showPaths} onClick={() => setShowPaths(!showPaths)} />
                                    </div>
                                </Section>

                                {/* Simulation */}
                                <Section title="Simulation" icon={Zap} defaultOpen={false}>
                                    <div className="space-y-4">
                                        <Toggle label="Kessler Cascade" description="Simulates debris chain reaction" active={kesslerMode} onClick={() => setKesslerMode(!kesslerMode)} variant="red" />

                                        <AnimatePresence>
                                            {kesslerMode && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-3 bg-status-warning/[0.08] border border-status-warning/20 rounded-xl flex items-start gap-2.5">
                                                        <ShieldAlert size={15} className="text-status-warning shrink-0 mt-0.5" />
                                                        <p className="text-[11px] text-text-secondary leading-relaxed">
                                                            High GPU load expected. May reduce frame rate on integrated graphics.
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </Section>
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-divider bg-surface-bg/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] text-text-tertiary">Engine</span>
                                    <span className="text-[10px] font-medium text-text-secondary flex items-center gap-1.5">
                                        <span className="w-[5px] h-[5px] rounded-full bg-status-success" />
                                        WebGL 2.0
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[10px] text-text-tertiary">
                                    <kbd className="bg-surface-elevated px-1.5 py-0.5 rounded font-mono border border-white/[0.06]">/</kbd><span>search</span>
                                    <kbd className="bg-surface-elevated px-1.5 py-0.5 rounded font-mono border border-white/[0.06]">a</kbd><span>alerts</span>
                                    <kbd className="bg-surface-elevated px-1.5 py-0.5 rounded font-mono border border-white/[0.06]">d</kbd><span>demo</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
