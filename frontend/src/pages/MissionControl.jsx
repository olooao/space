import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase' // Keep this for auth if needed later
import { Crosshair, Shield, AlertTriangle, Search, Zap } from 'lucide-react'

// DIRECT API CALL (Bypassing Supabase for Physics Engine)
const API_URL = "http://127.0.0.1:8000"

export default function MissionControl() {
  const [satellites, setSatellites] = useState([])
  const [obj1, setObj1] = useState('')
  const [obj2, setObj2] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // 1. Load Satellite List on Mount
  useEffect(() => {
    fetch(`${API_URL}/satellites`)
      .then(res => res.json())
      .then(data => setSatellites(data.satellites || []))
      .catch(err => console.error("Radar Down:", err))
  }, [])

  // 2. The Attack Button Logic
  const handleAnalyze = async () => {
    if (!obj1 || !obj2) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(`${API_URL}/analyze-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obj1_name: obj1, obj2_name: obj2 })
      })
      const data = await res.json()
      
      // Fake a "Computing" delay for dramatic effect
      setTimeout(() => {
          setResult(data)
          setLoading(false)
      }, 800)
    } catch (err) {
      console.error("Calculation Failed:", err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-green-500 font-mono p-8 selection:bg-green-500 selection:text-black">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-12 border-b border-white/10 pb-6">
        <Crosshair className="w-8 h-8 text-green-400 animate-[spin_10s_linear_infinite]" />
        <div>
          <h1 className="text-4xl font-black tracking-[0.2em] text-white">INTERCEPTOR</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Manual Conjunction Analysis Terminal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        
        {/* LEFT: CONTROLS */}
        <div className="space-y-8">
          
          {/* Input Group 1 */}
          <div className="relative group">
            <label className="block text-xs font-bold mb-2 text-blue-400 tracking-widest">PRIMARY ASSET (VICTIM)</label>
            <select 
              className="w-full bg-black border border-blue-900/50 p-4 rounded text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all uppercase"
              onChange={(e) => setObj1(e.target.value)}
              value={obj1}
            >
              <option value="">-- SELECT TARGET --</option>
              {satellites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Input Group 2 */}
          <div className="relative group">
            <label className="block text-xs font-bold mb-2 text-red-400 tracking-widest">SECONDARY OBJECT (THREAT)</label>
            <select 
              className="w-full bg-black border border-red-900/50 p-4 rounded text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all uppercase"
              onChange={(e) => setObj2(e.target.value)}
              value={obj2}
            >
              <option value="">-- SELECT THREAT --</option>
              {satellites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* THE BIG BUTTON */}
          <button 
            onClick={handleAnalyze}
            disabled={loading || !obj1 || !obj2}
            className={`
              w-full py-6 font-black tracking-[0.3em] text-lg uppercase transition-all duration-300 relative overflow-hidden group
              ${loading ? 'bg-gray-800 cursor-wait text-gray-500' : 'bg-green-900/20 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]'}
            `}
          >
            {loading ? 'CALCULATING TRAJECTORY...' : 'RUN SIMULATION'}
          </button>
        </div>

        {/* RIGHT: RESULTS DISPLAY */}
        <div className="relative border border-white/10 bg-white/5 rounded-lg p-8 min-h-[400px] flex flex-col justify-center items-center">
            
            {/* 1. IDLE STATE */}
            {!result && !loading && (
                <div className="text-center opacity-30">
                    <Search className="w-16 h-16 mx-auto mb-4" />
                    <p className="tracking-widest">AWAITING TARGET DATA</p>
                </div>
            )}

            {/* 2. LOADING STATE */}
            {loading && (
                <div className="text-center">
                    <Zap className="w-16 h-16 mx-auto mb-4 text-yellow-400 animate-pulse" />
                    <p className="tracking-widest text-yellow-400">RUNNING SGP4 PROPAGATION...</p>
                    <div className="text-xs text-gray-500 mt-2">Checking 300+ time steps</div>
                </div>
            )}

            {/* 3. RESULT STATE */}
            {result && !loading && (
                <div className="w-full h-full flex flex-col justify-between animate-[fadeIn_0.5s_ease-out]">
                    
                    {/* Header Decision */}
                    <div className={`text-center py-4 border-b ${result.risk_score > 50 ? 'border-red-500/30' : 'border-green-500/30'}`}>
                        <h2 className={`text-3xl font-black ${result.risk_score > 50 ? 'text-red-500' : 'text-green-500'}`}>
                            {result.decision}
                        </h2>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 my-8">
                        <div className="bg-black/40 p-4 rounded border border-white/5">
                            <div className="text-xs text-gray-500 tracking-widest mb-1">MISS DISTANCE</div>
                            <div className="text-2xl font-mono text-white">
                                {result.distance_calculated} <span className="text-sm text-gray-600">km</span>
                            </div>
                        </div>
                        <div className="bg-black/40 p-4 rounded border border-white/5">
                            <div className="text-xs text-gray-500 tracking-widest mb-1">REL. VELOCITY</div>
                            <div className="text-2xl font-mono text-white">
                                {result.velocity_kms} <span className="text-sm text-gray-600">km/s</span>
                            </div>
                        </div>
                        <div className="bg-black/40 p-4 rounded border border-white/5 col-span-2">
                            <div className="text-xs text-gray-500 tracking-widest mb-1">COLLISION PROBABILITY</div>
                            <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden mt-2">
                                <div 
                                    className={`h-full transition-all duration-1000 ${result.risk_score > 50 ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${result.risk_score}%` }}
                                ></div>
                            </div>
                            <div className="text-right text-xs mt-1 font-bold">{result.risk_score}%</div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-gray-600 uppercase">
                        Physics Engine: {result.real_physics_used ? 'SKYFIELD SGP4 (ACTIVE)' : 'ESTIMATED'}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}