import React from 'react';
import RotatingLogo from './RotatingLogo';

export default function AppHeader() {
  return (
    <div className="shrink-0 flex justify-center pt-2 pb-1 border-b border-[#00ff88]/20 bg-black">
      <RotatingLogo />
    </div>
  );
}
