"use client";

import React from 'react';
import styles from './theme-toggle.module.css';
import { useTheme } from './theme-provider';

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, toggle } = useTheme();

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-all hover:border-[var(--accent-border)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface-hover)] active:scale-95 cursor-pointer self-center"
      >
        {theme === "dark" ? (
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className={styles.toggleSwitch}>
      <label className={styles.switchLabel}>
        <input 
          type="checkbox" 
          className={styles.checkbox} 
          checked={theme === "light"}
          onChange={toggle}
          aria-label="Toggle theme"
        />
        <span className={styles.slider} />
      </label>
    </div>
  );
}
