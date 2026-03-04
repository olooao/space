import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, MapPin, Gauge, ArrowUpRight, Orbit } from 'lucide-react';

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

function StatusDot({ status }) {
    const color = status === 'operational' ? 'bg-status-success'
        : status === 'debris' || status === 'defunct' ? 'bg-status-critical'
        : 'bg-status-warning';
    return <span className={`w-[6px] h-[6px] rounded-full ${color} shrink-0`} />;
}

export default function BottomTelemetryBar({ targetData, satInfo, lastUpdate }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!lastUpdate) return;
        const timer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [lastUpdate]);

    const elapsedStr = elapsed < 60 ? `${elapsed}s ago` : `${Math.floor(elapsed / 60)}m ago`;

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
                            <div className="w-8 h-8 rounded-full bg-accent-blue/[0.12] flex items-center justify-center relative">
                                <Crosshair size={15} className="text-accent-blue" strokeWidth={2.2} />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-status-success animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    {satInfo && <StatusDot status={satInfo.status} />}
                                    <span className="text-[14px] font-semibold text-text-primary tracking-tight leading-tight">
                                        {targetData.name || "\u2014"}
                                    </span>
                                </div>
                                {satInfo && (
                                    <span className="text-[10px] text-text-tertiary mt-0.5">
                                        {satInfo.type} {satInfo.regime ? `\u00b7 ${satInfo.regime}` : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="flex items-center gap-5">
                            <Metric label="Alt" value={targetData.alt_km ? Math.round(targetData.alt_km) : "\u2014"} unit="km" />
                            <Metric label="Vel" value={targetData.velocity ? Number(targetData.velocity).toFixed(1) : "\u2014"} unit="km/s" />
                            <Metric label="Lat" value={targetData.lat ? targetData.lat.toFixed(2) : "\u2014"} unit="\u00b0" />
                            <Metric label="Lon" value={targetData.lon ? targetData.lon.toFixed(2) : "\u2014"} unit="\u00b0" />
                        </div>

                        {/* Live update indicator */}
                        {lastUpdate && (
                            <div className="flex items-center gap-2 pl-5 border-l border-divider">
                                <span className="w-[5px] h-[5px] rounded-full bg-status-success animate-pulse" />
                                <span className="text-[10px] text-text-tertiary font-mono">{elapsedStr}</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
