import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Login.css";

function Login() {
  const { language } = useLanguage();
  const te = language === "te";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loginUser = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.post("http://127.0.0.1:8000/api/auth/login/", {
        username,
        password,
      });

      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("user_role", res.data.role);
      navigate("/dashboard");
    } catch {
      setError(te ? "తప్పు వివరాలు" : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">🔐 {te ? "మళ్లీ స్వాగతం" : "Welcome Back"}</h2>
        <p className="login-subtitle">
          {te ? "డాష్‌బోర్డ్‌కి ప్రవేశించడానికి లాగిన్ చేయండి" : "Login to access your dashboard"}
        </p>

        <div className="input-group">
          <label>{te ? "వాడుకరి పేరు" : "Username"}</label>
          <input
            type="text"
            placeholder={te ? "వాడుకరి పేరు నమోదు చేయండి" : "Enter username"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>{te ? "పాస్‌వర్డ్" : "Password"}</label>
          <input
            type="password"
            placeholder={te ? "పాస్‌వర్డ్ నమోదు చేయండి" : "Enter password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="login-button" onClick={loginUser} disabled={loading}>
          {loading ? (te ? "లాగిన్ అవుతోంది..." : "Logging in...") : (te ? "లాగిన్" : "Login")}
        </button>

        <div className="login-footer">
          <button className="link-button" onClick={() => navigate("/register")}>
            {te ? "ఖాతా లేదా? రిజిస్టర్ చేయండి" : "Don't have an account? Register"}
          </button>
          <button className="link-button" onClick={() => navigate("/")}>
            {te ? "← హోమ్‌కి తిరిగి వెళ్ళు" : "← Back to Home"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

