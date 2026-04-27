import { useLanguage } from "../context/LanguageContext";
import "./LanguageSelector.css";

function LanguageSelector() {
  const { language, setLanguage, languages, t } = useLanguage();

  return (
    <label className="lang-global-selector" title={t("navLanguageAria", "Change app language")}>
      <span className="lang-global-icon" aria-hidden="true">🌐</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label={t("navLanguageAria", "Change app language")}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSelector;

