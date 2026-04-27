import { useTheme } from "../context/ThemeContext";
import "./ThemeToggle.css";

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const nextThemeLabel = isDark ? "Light" : "Dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextThemeLabel} theme`}
      title={`Switch to ${nextThemeLabel} theme`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? "☀" : "☾"}
      </span>
    </button>
  );
}

export default ThemeToggle;
