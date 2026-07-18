'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

interface AnimatedProgressBarProps {
  percent: number;
  isExceeded?: boolean;
  isUnlimited?: boolean;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  percent,
  isExceeded = false,
  isUnlimited = false
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <TrackBar>
      <FillBar 
        $percent={animate ? percent : 0} 
        $isExceeded={isExceeded}
        $isUnlimited={isUnlimited}
      />
    </TrackBar>
  );
};

// ------------- STYLED COMPONENTS -------------
const TrackBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
`;

const FillBar = styled.div<{ $percent: number; $isExceeded?: boolean; $isUnlimited?: boolean }>`
  width: ${p => p.$percent}%;
  height: 100%;
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${p => {
    if (p.$isUnlimited) {
      return 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)';
    }
    if (p.$isExceeded) {
      return 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)';
    }
    return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
  }};
`;
