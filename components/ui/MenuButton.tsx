import React from 'react';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type MenuButtonProps = {
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function MenuButton({ children, className = '', ...props }: MenuButtonProps) {
  return (
    <button
      type="button"
      className={`flex justify-start items-center w-full px-3 py-2 text-sm bg-transparent border-0 hover:bg-surface-weak rounded text-left ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
