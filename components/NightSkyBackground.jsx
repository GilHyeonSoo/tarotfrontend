'use client';

import './NightSkyBackground.css';

const NightSkyBackground = () => (
    <div className="night-sky" aria-hidden="true">
        <div className="night-sky__photo" />
        <div className="night-sky__twinkle" />
        <div className="night-sky__veil" />
    </div>
);

export default NightSkyBackground;
