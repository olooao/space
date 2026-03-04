/**
 * Zustand global store for the ASRIDE app.
 * Shared state between Dashboard, KesslerSimulator, and LiveMonitor.
 */
import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  // ---- Satellite positions (from WS or API) ----
  satellites: [],
  setSatellites: (satellites) => set({ satellites }),

  constellationData: [],
  setConstellationData: (constellationData) => set({ constellationData }),

  // ---- Kessler simulation ----
  fragments: [],
  setFragments: (fragments) => set({ fragments }),

  kesslerStats: null,
  setKesslerStats: (kesslerStats) => set({ kesslerStats }),

  cascadeEvents: [],
  addCascadeEvents: (events) =>
    set((s) => ({
      cascadeEvents: [...events, ...s.cascadeEvents].slice(0, 100),
    })),
  clearCascade: () =>
    set({ fragments: [], kesslerStats: null, cascadeEvents: [] }),

  // ---- Alert feed ----
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 50) })),

  // ---- UI state ----
  isKesslerMode: false,
  setKesslerMode: (v) => set({ isKesslerMode: v }),

  showPaths: false,
  setShowPaths: (v) => set({ showPaths: v }),

  activeConstellation: null,
  setActiveConstellation: (v) => set({ activeConstellation: v }),
}));
