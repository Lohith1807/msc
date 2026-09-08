import React from 'react';
import logoImg from '../../assets/logo.png';

/**
 * MindLab Logo component with multiply blend mode treatment
 */
export default function Logo({ width = 190, className = 'logo-full', style = {} }) {
  return (
    <img
      src={logoImg}
      alt="MindLab — Understand, Heal, Grow"
      className={className}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: 'auto',
        display: 'block',
        mixBlendMode: 'multiply',
        ...style,
      }}
    />
  );
}
