"use client";

import React from 'react';
import styles from './theme-toggle.module.css';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLightTheme = theme === "light";
  const actionLabel = isLightTheme ? "Cambiar a tema oscuro" : "Cambiar a tema claro";

  return (
    <div className={styles.toggleSwitch}>
      <label className={styles.switchLabel}>
        <span className="sr-only">{actionLabel}</span>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={isLightTheme}
          onChange={toggle}
        />
        <span className={styles.slider} />
      </label>
    </div>
  );
}
