import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import "../styles/Register.css";

function Register() {
  const { language } = useLanguage();
  const te = language === "te";

  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "consumer",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const registerUser = async () => {
    setError("");
    setSuccess("");

    if (!form.username || !form.email || !form.password) {
      setError(te ? "అన్ని ఫీల్డ్స్ తప్పనిసరి" : "All fields are required");
      return;
    }

    try {
      setLoading(true);
      await API.post("auth/register/", form);
      setSuccess(te ? "🎉 నమోదు విజయవంతం! మళ్లించబడుతోంది..." : "🎉 Registration successful! Redirecting...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === "object" && errors !== null) {
        const errorMessages = Object.values(errors).flat().join(", ");
        setError(errorMessages);
      } else {
        setError(te ? "నమోదు విఫలమైంది. మళ్లీ ప్రయత్నించండి." : "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-header">
        <h1>🌾 {te ? "Farmer to Consumer లో చేరండి" : "Join Farmer to Consumer"}</h1>
        <p>{te ? "మీ ఖాతా సృష్టించి స్మార్ట్ ట్రేడింగ్ ప్రారంభించండి" : "Create your account and start trading smartly"}</p>
      </div>

      <div className="register-card">
        <h2>{te ? "ఖాతా సృష్టించండి" : "Create Account"}</h2>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="form-group">
          <label>{te ? "వాడుకరి పేరు" : "Username"}</label>
          <input
            type="text"
            placeholder={te ? "వాడుకరి పేరు నమోదు చేయండి" : "Enter username"}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>{te ? "ఇమెయిల్" : "Email"}</label>
          <input
            type="email"
            placeholder={te ? "ఇమెయిల్ నమోదు చేయండి" : "Enter email"}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="form-group password-group">
          <label>{te ? "పాస్‌వర్డ్" : "Password"}</label>
          <input
            type={showPassword ? "text" : "password"}
            placeholder={te ? "పాస్‌వర్డ్ సృష్టించండి" : "Create password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? "🙈" : "👁"}
          </span>
        </div>

        <div className="role-toggle">
          <button
            className={form.role === "consumer" ? "active" : ""}
            onClick={() => setForm({ ...form, role: "consumer" })}
          >
            🛒 {te ? "వినియోగదారు" : "Consumer"}
          </button>
          <button
            className={form.role === "farmer" ? "active" : ""}
            onClick={() => setForm({ ...form, role: "farmer" })}
          >
            🚜 {te ? "రైతు" : "Farmer"}
          </button>
        </div>

        <button className="primary-button" onClick={registerUser} disabled={loading}>
          {loading ? (te ? "ఖాతా సృష్టిస్తోంది..." : "Creating Account...") : (te ? "నమోదు" : "Register")}
        </button>

        <div className="register-footer">
          <button onClick={() => navigate("/login")}>
            {te ? "ఖాతా ఉందా? లాగిన్" : "Already have an account? Login"}
          </button>
          <button onClick={() => navigate("/")}>
            {te ? "← హోమ్‌కి తిరిగి వెళ్ళు" : "← Back to Home"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;

