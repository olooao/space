import React, { useState, useEffect } from 'react';
import EarthSVG from '../EarthSVG';
import { Play, RotateCcw, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';

export default function MissionDemo() {
    const [step, setStep] = useState(0);
    const [scenario, setScenario] = useState('impact'); // 'impact' or 'avoidance'
    const [satellites, setSatellites] = useState([]);
    const [message, setMessage] = useState("");
    const [showExplosion, setShowExplosion] = useState(false);
    const [kesslerActive, setKesslerActive] = useState(false);

    // Initial Positions
    const startPos1 = { lat: 0, lon: -60 };
    const startPos2 = { lat: 0, lon: 60 };
    
    // Impact Point
    const impactPos = { lat: 0, lon: 0 };

    useEffect(() => {
        resetDemo();
    }, [scenario]);

    const resetDemo = () => {
        setStep(0);
        setShowExplosion(false);
        setKesslerActive(false);
        setMessage("Initializing Scenario: " + (scenario === 'impact' ? "Catastrophic Failure" : "Successful Mitigation"));
        
        // Initial State: Two satellites far apart
        setSatellites([
            { name: "OUR ASSET", lat: 0, lon: -90, path: [[-90, 0], [0, 0], [90, 0]] },
            { name: "SPACE DEBRIS", lat: 0, lon: 90, path: [[90, 0], [0, 0], [-90, 0]] }
        ]);
    };

    const nextStep = () => {
        const newStep = step + 1;
        setStep(newStep);

        if (scenario === 'impact') {
            runImpactScenario(newStep);
        } else {
            runAvoidanceScenario(newStep);
        }
    };

    const runImpactScenario = (s) => {
        if (s === 1) { // Approach
            setMessage("CRITICAL ALERT: Collision Course Detected. T-Minus 10s.");
            setSatellites([
                { name: "OUR ASSET", lat: 0, lon: -20, path: [[-90, 0], [0, 0]] }, // Closer
                { name: "SPACE DEBRIS", lat: 0, lon: 20, path: [[90, 0], [0, 0]] }
            ]);
        } else if (s === 2) { // Impact
            setMessage("IMPACT CONFIRMED. SIGNAL LOST.");
            setSatellites([
                { name: "IMPACT", lat: 0, lon: 0, type: 'EVENT', risk: 100 }
            ]);
            setShowExplosion(true);
            setTimeout(() => setKesslerActive(true), 500); // Trigger debris field
        }
    };

    const runAvoidanceScenario = (s) => {
        if (s === 1) { // Detection
            setMessage("ASRIDE AI Detected Collision Risk (99%). Computing Solution...");
            setSatellites([
                { name: "OUR ASSET", lat: 0, lon: -40, path: [[-90, 0], [0, 0]] },
                { name: "SPACE DEBRIS", lat: 0, lon: 40, path: [[90, 0], [0, 0]] }
            ]);
        } else if (s === 2) { // Maneuver
            setMessage("EXECUTING MANEUVER: Delta-V Thruster Burn (+5 m/s).");
            setSatellites([
                { 
                    name: "OUR ASSET", lat: 0, lon: -10, 
                    // New path curving up
                    path: [[-90, 0], [-20, 0], [-10, 10], [0, 20], [20, 20]] 
                },
                { name: "SPACE DEBRIS", lat: 0, lon: 10, path: [[90, 0], [0, 0]] }
            ]);
        } else if (s === 3) { // Success
            setMessage("COLLISION AVOIDED. Object cleared by 25km. Orbit stable.");
            setSatellites([
                { name: "OUR ASSET", lat: 20, lon: 20, path: [[-10, 10], [0, 20], [20, 20], [50, 20]] },
                { name: "SPACE DEBRIS", lat: 0, lon: -20, path: [[10, 0], [0, 0], [-20, 0], [-50, 0]] }
            ]);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <header className="flex justify-between items-end border-b border-white/5 pb-4">
                <div>
                     <h2 className="text-2xl font-display font-bold text-white">Mission Simulator</h2> 
                     <p className="text-xs text-slate-400 font-mono">SCENARIO DEMONSTRATION & TRAINING MODULE</p>
                </div>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-white/10">
                    <button 
                        onClick={() => { setScenario('impact'); resetDemo(); }}
                        className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-all ${scenario === 'impact' ? 'bg-red-500/20 text-red-500 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <AlertTriangle size={12}/> FAILURE SCENARIO
                    </button>
                    <button 
                        onClick={() => { setScenario('avoidance'); resetDemo(); }}
                        className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-all ${scenario === 'avoidance' ? 'bg-blue-500/20 text-blue-500 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <ShieldCheck size={12}/> ASRIDE PROTECTION
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
                {/* Visualizer */}
                <div className="lg:col-span-8 relative">
                    <div className="glass-card rounded-2xl overflow-hidden h-[600px] border border-white/10 relative">
                        {/* Overlay Message */}
                        <div className="absolute top-5 left-0 right-0 flex justify-center z-10 pointer-events-none">
                            <div className="bg-slate-950/80 backdrop-blur border border-white/10 px-6 py-2 rounded-full shadow-2xl">
                                <span className={`font-mono font-bold text-sm ${
                                    message.includes("CRITICAL") || message.includes("IMPACT") ? "text-red-500 animate-pulse" : 
                                    message.includes("AVOIDED") ? "text-green-400" : "text-blue-300"
                                }`}>
                                    {message}
                                </span>
                            </div>
                        </div>

                        <div className="w-full h-full bg-slate-950">
                            <EarthSVG satellites={satellites} kessler={kesslerActive} />
                        </div>

                        {/* Impact Flash Overlay */}
                        {showExplosion && (
                            <div className="absolute inset-0 bg-white/20 animate-ping pointer-events-none"></div>
                        )}
                    </div>
                </div>

                {/* Controls & Narrative */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="glass-card p-6 rounded-xl flex-grow flex flex-col justify-center">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white mb-2">
                                {scenario === 'impact' ? "The Consequence" : "The Solution"}
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {scenario === 'impact' 
                                    ? "Without automated intervention, high-speed orbital intercepts occur faster than human operators can react. A single collision creates a cloud of debris that renders orbits unusable for decades."
                                    : "ASRIDE continuously propagates orbits 90 minutes into the future. Upon detecting a risk >5% probability, it autonomously calculates the most fuel-efficient maneuver to ensure asset safety."
                                }
                            </p>
                        </div>

                        {/* Step Progress */}
                        <div className="space-y-4 mb-8">
                             {scenario === 'impact' ? (
                                <>
                                    <div className={`p-3 rounded border border-white/5 bg-slate-900/50 ${step >= 0 ? 'opacity-100' : 'opacity-30'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Step 1</div>
                                        <div className="text-sm font-bold text-red-200">Assets on Collision Course</div>
                                    </div>
                                    <div className={`p-3 rounded border border-white/5 bg-slate-900/50 ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Step 2</div>
                                        <div className="text-sm font-bold text-red-300">Reaction Time Exceeded</div>
                                    </div>
                                    <div className={`p-3 rounded border border-white/5 bg-slate-900/50 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Step 3</div>
                                        <div className="text-sm font-bold text-red-500">Kinetic Impact (Kessler Syndrome)</div>
                                    </div>
                                </>
                             ) : (
                                <>
                                    <div className={`p-3 rounded border border-white/5 bg-slate-900/50 ${step >= 0 ? 'opacity-100' : 'opacity-30'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Step 1</div>
                                        <div className="text-sm font-bold text-blue-200">Early Detection</div>
                                    </div>
                                    <div className={`p-3 rounded border border-white/5 bg-slate-900/50 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Step 2</div>
                                        <div className="text-sm font-bold text-blue-300">Auto-Maneuver Calculation</div>
                                    </div>
                                    <div className={`p-3 rounded border border-white/5 bg-slate-900/50 ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Step 3</div>
                                        <div className="text-sm font-bold text-green-400">Risk Eliminated</div>
                                    </div>
                                </>
                             )}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={resetDemo}
                                className="px-4 py-3 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <RotateCcw size={18} />
                            </button>
                            <button 
                                onClick={nextStep}
                                className={`flex-grow px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                                    scenario === 'impact' && step >= 2 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                                    scenario === 'avoidance' && step >= 3 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                                    'bg-white text-slate-900 hover:bg-blue-50'
                                }`}
                                disabled={(scenario === 'impact' && step >= 2) || (scenario === 'avoidance' && step >= 3)}
                            >
                                {step === 0 ? "Start Simulation" : "Next Phase"} <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
