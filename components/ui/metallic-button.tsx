"use client";

import type React from "react";
import { useMemo, useRef, useState } from "react";
import styles from "./metallic-button.module.css";

type Ripple = { x: number; y: number; id: number };

export type MetallicButtonProps = {
  label?: string;
  onClick?: () => void;
  className?: string;
  baseColor?: string;
  sheenColor?: string;
  accentColor?: string;
  compact?: boolean;
};

export default function MetallicButton({
  label = "Get Started",
  onClick,
  className = "",
  baseColor = "#111111",
  sheenColor = "#f8f8f8",
  accentColor = "#ffffff",
  compact = false,
}: MetallicButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  const cssVars = useMemo(
    () =>
      ({
        "--metal-base": baseColor,
        "--metal-sheen": sheenColor,
        "--metal-accent": accentColor,
      }) as React.CSSProperties,
    [accentColor, baseColor, sheenColor],
  );

  function addRipple(event: React.MouseEvent<HTMLButtonElement>) {
    const node = buttonRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const hasPointer = event.clientX !== 0 || event.clientY !== 0;
    const ripple = {
      x: hasPointer ? event.clientX - rect.left : rect.width / 2,
      y: hasPointer ? event.clientY - rect.top : rect.height / 2,
      id: rippleId.current++,
    };
    setRipples((current) => [...current, ripple]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== ripple.id));
    }, 620);
  }

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    addRipple(event);
    onClick?.();
  }

  return (
    <span
      className={`${styles.root} ${compact ? styles.compact : ""} ${className}`}
      data-hovered={isHovered ? "true" : "false"}
      data-pressed={isPressed ? "true" : "false"}
      style={cssVars}
    >
      <span className={styles.rim} aria-hidden="true" />
      <span className={styles.depth} aria-hidden="true" />
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        className={styles.button}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onBlur={() => setIsPressed(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setIsPressed(true);
        }}
        onKeyUp={(event) => {
          if (event.key === "Enter" || event.key === " ") setIsPressed(false);
        }}
      >
        <span className={styles.metal} aria-hidden="true" />
        <span className={styles.tint} aria-hidden="true" />
        <span className={styles.gloss} aria-hidden="true" />
        <span className={styles.content}>
          <span className={styles.spark} aria-hidden="true">✦</span>
          <span>{label}</span>
          <span className={styles.arrow} aria-hidden="true">→</span>
        </span>
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className={styles.ripple}
            aria-hidden="true"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ))}
      </button>
    </span>
  );
}
