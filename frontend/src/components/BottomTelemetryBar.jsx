import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair } from 'lucide-react';

function Metric({ label, value, unit }) {
    return (
        <div className="flex flex-col items-center gap-0.5 min-w-[72px]">
            <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className="text-[15px] font-mono font-medium text-text-primary tabular-nums">{value}</span>
                {unit && <span className="text-[10px] text-text-tertiary">{unit}</span>}
            </div>
        </div>
    );
}

export default function BottomTelemetryBar({ targetData }) {
    return (
        <AnimatePresence>
            {targetData && (
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
                >
                    <div className="glass-surface rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 flex items-center gap-5">

                        {/* Target Lock */}
                        <div className="flex items-center gap-3 pr-5 border-r border-divider">
                            <div className="w-8 h-8 rounded-full bg-accent-blue/[0.12] flex items-center justify-center">
                                <Crosshair size={15} className="text-accent-blue" strokeWidth={2.2} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Target</span>
                                <span className="text-[14px] font-semibold text-text-primary tracking-tight leading-tight">
                                    {targetData.name || "—"}
                                </span>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="flex items-center gap-6">
                            <Metric label="Alt" value={targetData.alt ? (targetData.alt * 6371).toFixed(0) : "—"} unit="km" />
                            <Metric label="Vel" value={targetData.velocity ? Number(targetData.velocity).toFixed(1) : "—"} unit="km/s" />
                            <Metric label="Lat" value={targetData.lat ? targetData.lat.toFixed(2) : "—"} unit="°" />
                            <Metric label="Lon" value={targetData.lon ? targetData.lon.toFixed(2) : "—"} unit="°" />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
