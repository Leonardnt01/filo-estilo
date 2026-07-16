"use client";

import React from 'react';
import styles from './theme-toggle.module.css';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggle, mounted } = useTheme();
  // Until mounted, mirror the server render (dark) so hydration matches; the
  // knob corrects itself once the saved theme is read after mount.
  const isLightTheme = mounted && theme === "light";
  const actionLabel = isLightTheme ? "Cambiar a tema oscuro" : "Cambiar a tema claro";

  return (
    <div className={styles.toggleSwitch}>
      <label className={styles.switchLabel}>
        <span className="sr-only" suppressHydrationWarning>{actionLabel}</span>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={isLightTheme}
          onChange={toggle}
          suppressHydrationWarning
        />
        <span className={styles.slider} />
      </label>
    </div>
  );
}
