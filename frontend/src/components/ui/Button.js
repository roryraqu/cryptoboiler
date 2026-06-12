import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) {
  const baseStyles = 'inline-flex justify-center items-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';
  
  const variants = {
    primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow focus:ring-blue-500 border border-transparent',
    secondary: 'bg-white text-slate-700 shadow-sm border border-slate-300 hover:bg-slate-50 focus:ring-slate-500',
    danger: 'bg-red-500 text-white shadow-sm hover:bg-red-600 focus:ring-red-500 border border-transparent',
    success: 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 focus:ring-emerald-500 border border-transparent',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-500 border border-transparent',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const classes = `${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}