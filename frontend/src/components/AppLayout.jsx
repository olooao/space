import React from 'react';
import { useLocation } from 'react-router-dom';
import LeftNav from './LeftNav';

export default function AppLayout({ children }) {
    const location = useLocation();
    const showNav = location.pathname !== "/";

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-surface-bg text-text-primary font-sans">
            {/* Route content fills entire viewport */}
            <div className="absolute inset-0 z-0">
                {children}
            </div>

            {/* Cinematic vignette framing the globe */}
            {showNav && (
                <div className="absolute inset-0 z-[5] pointer-events-none vignette" />
            )}

            {/* Left Navigation Rail */}
            {showNav && <LeftNav />}
        </div>
    );
}
