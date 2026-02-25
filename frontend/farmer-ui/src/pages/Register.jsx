import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Register.css";

function Register() {
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
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("auth/register/", form);

      setSuccess("🎉 Registration successful! Redirecting...");
      setTimeout(() => navigate("/login"), 2000);

    } catch (err) {
      const errors = err.response?.data;

      if (typeof errors === "object" && errors !== null) {
        const errorMessages = Object.values(errors).flat().join(", ");
        setError(errorMessages);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-wrapper">

      {/* HEADER */}
      <div className="register-header">
        <h1>🌾 Join Farmer to Consumer</h1>
        <p>Create your account and start trading smartly</p>
      </div>

      <div className="register-card">

        <h2>Create Account</h2>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            value={form.username}
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />
        </div>

        <div className="form-group password-group">
          <label>Password</label>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Create password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁"}
          </span>
        </div>

        {/* Role Toggle */}
        <div className="role-toggle">
          <button
            className={form.role === "consumer" ? "active" : ""}
            onClick={() => setForm({ ...form, role: "consumer" })}
          >
            🛒 Consumer
          </button>

          <button
            className={form.role === "farmer" ? "active" : ""}
            onClick={() => setForm({ ...form, role: "farmer" })}
          >
            🚜 Farmer
          </button>
        </div>

        <button
          className="primary-button"
          onClick={registerUser}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Register"}
        </button>

        <div className="register-footer">
          <button onClick={() => navigate("/login")}>
            Already have an account? Login
          </button>

          <button onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;