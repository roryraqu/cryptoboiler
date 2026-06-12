import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div {...props} className={`card p-6 ${className}`}>
      {children}
    </div>
  );
}