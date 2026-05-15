"use client";

import React from 'react';
import styles from './theme-toggle.module.css';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

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
