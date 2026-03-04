import React, { useState, useEffect } from 'react';
import Globe3D from '../components/Globe3D';
import { motion } from 'framer-motion';
import { Play, RotateCcw, ShieldCheck, AlertTriangle, ArrowRight, Zap } from 'lucide-react';

export default function MissionDemo() {
    const [step, setStep] = useState(0);
    const [scenario, setScenario] = useState('impact');
    const [satellites, setSatellites] = useState([]);
    const [message, setMessage] = useState("");
    const [showExplosion, setShowExplosion] = useState(false);
    const [kesslerActive, setKesslerActive] = useState(false);

    const startPos1 = { lat: 0, lon: -60 };
    const startPos2 = { lat: 0, lon: 60 };
    const impactPos = { lat: 0, lon: 0 };

    useEffect(() => { resetDemo(); }, [scenario]);

    const resetDemo = () => {
        setStep(0);
        setShowExplosion(false);
        setKesslerActive(false);
        setMessage(scenario === 'impact' ? "Scenario: Unmitigated collision" : "Scenario: Autonomous avoidance");
        setSatellites([
            { name: "PRIMARY ASSET", lat: 0, lon: -90, path: [[-90, 0], [0, 0], [90, 0]] },
            { name: "DEBRIS OBJECT", lat: 0, lon: 90, path: [[90, 0], [0, 0], [-90, 0]] }
        ]);
    };

    const nextStep = () => {
        const newStep = step + 1;
        setStep(newStep);
        if (scenario === 'impact') { runImpactScenario(newStep); }
        else { runAvoidanceScenario(newStep); }
    };

    const runImpactScenario = (s) => {
        if (s === 1) {
            setMessage("Collision course detected. Time to closest approach: 10s");
            setSatellites([
                { name: "PRIMARY ASSET", lat: 0, lon: -20, path: [[-90, 0], [0, 0]] },
                { name: "DEBRIS OBJECT", lat: 0, lon: 20, path: [[90, 0], [0, 0]] }
            ]);
        } else if (s === 2) {
            setMessage("Impact confirmed. Signal lost.");
            setSatellites([{ name: "IMPACT", lat: 0, lon: 0, type: 'EVENT', risk: 100 }]);
            setShowExplosion(true);
            setTimeout(() => setKesslerActive(true), 500);
        }
    };

    const runAvoidanceScenario = (s) => {
        if (s === 1) {
            setMessage("Collision risk >99% detected. Computing optimal maneuver...");
            setSatellites([
                { name: "PRIMARY ASSET", lat: 0, lon: -40, path: [[-90, 0], [0, 0]] },
                { name: "DEBRIS OBJECT", lat: 0, lon: 40, path: [[90, 0], [0, 0]] }
            ]);
        } else if (s === 2) {
            setMessage("Executing delta-V thruster burn (+5 m/s)");
            setSatellites([
                { name: "PRIMARY ASSET", lat: 0, lon: -10, path: [[-90, 0], [-20, 0], [-10, 10], [0, 20], [20, 20]] },
                { name: "DEBRIS OBJECT", lat: 0, lon: 10, path: [[90, 0], [0, 0]] }
            ]);
        } else if (s === 3) {
            setMessage("Collision avoided. Clearance: 25km. Orbit stable.");
            setSatellites([
                { name: "PRIMARY ASSET", lat: 20, lon: 20, path: [[-10, 10], [0, 20], [20, 20], [50, 20]] },
                { name: "DEBRIS OBJECT", lat: 0, lon: -20, path: [[10, 0], [0, 0], [-20, 0], [-50, 0]] }
            ]);
        }
    };

    const isComplete = (scenario === 'impact' && step >= 2) || (scenario === 'avoidance' && step >= 3);

    const stepLabels = scenario === 'impact'
        ? [{ text: 'Objects on collision course', color: 'text-text-primary' }, { text: 'Reaction time exceeded', color: 'text-status-warning' }, { text: 'Kinetic impact (Kessler cascade)', color: 'text-status-critical' }]
        : [{ text: 'Early detection', color: 'text-text-primary' }, { text: 'Automated maneuver calculation', color: 'text-accent-blue' }, { text: 'Risk eliminated', color: 'text-status-success' }];

    return (
        <div className="flex flex-col h-full font-sans text-text-primary pl-16">

            {/* Header */}
            <header className="flex justify-between items-center px-8 py-5 border-b border-divider shrink-0">
                <div>
                    <h2 className="text-[20px] font-bold tracking-tight">Mission Simulator</h2>
                    <p className="text-[12px] text-text-secondary mt-0.5">Scenario demonstration & training</p>
                </div>
                <div className="flex bg-surface-panel rounded-xl p-1 border border-white/[0.06]">
                    <button
                        onClick={() => { setScenario('impact'); resetDemo(); }}
                        className={`px-4 py-2 text-[12px] font-medium rounded-lg flex items-center gap-2 transition-all ${scenario === 'impact' ? 'bg-status-critical/10 text-status-critical' : 'text-text-tertiary hover:text-text-secondary'}`}
                    >
                        <AlertTriangle size={13} /> Failure
                    </button>
                    <button
                        onClick={() => { setScenario('avoidance'); resetDemo(); }}
                        className={`px-4 py-2 text-[12px] font-medium rounded-lg flex items-center gap-2 transition-all ${scenario === 'avoidance' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-tertiary hover:text-text-secondary'}`}
                    >
                        <ShieldCheck size={13} /> Protection
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-grow overflow-hidden">
                {/* Globe */}
                <div className="lg:col-span-8 relative bg-surface-bg">
                    <div className="h-full relative">
                        {/* Status Message */}
                        <div className="absolute top-5 left-0 right-0 flex justify-center z-10 pointer-events-none">
                            <motion.div
                                key={message}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-surface px-5 py-2 rounded-full shadow-lg"
                            >
                                <span className={`text-[13px] font-medium ${message.includes("Impact") || message.includes("lost") ? "text-status-critical" :
                                        message.includes("avoided") || message.includes("stable") ? "text-status-success" : "text-text-primary"
                                    }`}>
                                    {message}
                                </span>
                            </motion.div>
                        </div>

                        <Globe3D satellites={satellites} kesslerMode={kesslerActive} />

                        {showExplosion && (
                            <div className="absolute inset-0 bg-white/10 animate-ping pointer-events-none" />
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="lg:col-span-4 flex flex-col border-l border-divider bg-surface-panel/50">
                    <div className="p-6 flex-grow flex flex-col justify-center">
                        <h3 className="text-[18px] font-bold text-text-primary mb-2">
                            {scenario === 'impact' ? "The Consequence" : "The Solution"}
                        </h3>
                        <p className="text-[13px] text-text-secondary leading-relaxed mb-8">
                            {scenario === 'impact'
                                ? "Without automated intervention, high-speed intercepts occur faster than human reaction. A single collision creates debris that renders orbits unusable for decades."
                                : "The system continuously propagates orbits 90 minutes into the future. When risk exceeds 5%, it autonomously computes the most fuel-efficient avoidance maneuver."
                            }
                        </p>

                        {/* Step Progress */}
                        <div className="space-y-2.5 mb-8">
                            {stepLabels.map((s, i) => (
                                <div key={i} className={`p-3 rounded-xl border transition-all duration-300 ${step > i ? 'bg-surface-elevated border-white/[0.08] opacity-100' :
                                        step === i ? 'bg-accent-blue/[0.06] border-accent-blue/20 opacity-100' :
                                            'bg-surface-bg border-white/[0.04] opacity-40'
                                    }`}>
                                    <div className="text-[10px] text-text-tertiary font-medium mb-0.5">Phase {i + 1}</div>
                                    <div className={`text-[13px] font-semibold ${step >= i ? s.color : 'text-text-tertiary'}`}>{s.text}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={resetDemo}
                                className="p-3 rounded-xl bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors border border-white/[0.06]"
                            >
                                <RotateCcw size={18} />
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={isComplete}
                                className="flex-grow btn-primary py-3 rounded-xl text-[13px] disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {step === 0 ? "Start Simulation" : "Next Phase"} <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
