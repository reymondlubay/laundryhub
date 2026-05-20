import type { CSSProperties } from "react";
import { Box } from "@mui/material";
import { useThemeContext } from "../ThemeContext/ThemeContext";
import "./WashingMachineLoader.css";

type WashingMachineLoaderProps = {
  message: string;
};

const WashingMachineLoader = ({ message }: WashingMachineLoaderProps) => {
  const { darkMode } = useThemeContext();

  const cssVars = (darkMode
    ? {
        "--wm-border": "#6b8aa8",
        "--wm-body-top": "#1e2733",
        "--wm-body-bottom": "#161d26",
        "--wm-panel": "#0f141a",
        "--wm-accent": "#8eb6d8",
        "--wm-door-bg": "#2a3d52",
        "--wm-water": "#4a7ba7",
        "--wm-water-deep": "#2d5a7a",
        "--wm-caption": "#9aacbd",
      }
    : {
        "--wm-border": "#5c7a94",
        "--wm-body-top": "#e8eef5",
        "--wm-body-bottom": "#d2dde8",
        "--wm-panel": "#f1f5f9",
        "--wm-accent": "#4a7ba7",
        "--wm-door-bg": "#b8cfe0",
        "--wm-water": "#7eb8d8",
        "--wm-water-deep": "#4a8fb5",
        "--wm-caption": "#5c6d7e",
      }) as CSSProperties;

  return (
    <Box
      className="washing-loader"
      style={cssVars}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className="washing-loader__machine">
        <div className="washing-loader__body">
          <div className="washing-loader__panel">
            <span className="washing-loader__panel-dot" />
            <span className="washing-loader__panel-dot" />
            <span className="washing-loader__panel-dot" />
          </div>
          <div className="washing-loader__door">
            <div className="washing-loader__water" />
            <div className="washing-loader__drum">
              <div className="washing-loader__drum-inner" />
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className={`washing-loader__bubble washing-loader__bubble--${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="washing-loader__caption washing-loader__caption--pulse">
        {message}
      </p>
    </Box>
  );
};

export default WashingMachineLoader;
