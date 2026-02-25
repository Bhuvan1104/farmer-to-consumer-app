import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const loginUser = async () => {
  try {
    const res = await axios.post(
      "http://127.0.0.1:8000/api/auth/login/",
      {
        username,
        password,
      }
    );

    localStorage.setItem("access_token", res.data.access);
    localStorage.setItem("refresh_token", res.data.refresh);

    // ✅ VERY IMPORTANT
    localStorage.setItem("user_role", res.data.role);

    navigate("/dashboard");

  } catch (err) {
    setError("Invalid credentials");
  }
};

  return (
    <div className="login-wrapper">

      <div className="login-card">
        <h2 className="login-title">🔐 Welcome Back</h2>
        <p className="login-subtitle">
          Login to access your dashboard
        </p>

        <div className="input-group">
          <label>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error-box">{error}</div>}

        <button
          className="login-button"
          onClick={loginUser}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="login-footer">
          <button
            className="link-button"
            onClick={() => navigate("/register")}
          >
            Don't have an account? Register
          </button>

          <button
            className="link-button"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>
        </div>
      </div>

    </div>
  );
}

export default Login;