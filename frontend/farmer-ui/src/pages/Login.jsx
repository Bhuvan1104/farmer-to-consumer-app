import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Forms.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loginUser = async () => {
    try {
      setError("");
      const res = await axios.post("http://127.0.0.1:8000/api/token/", {
        username,
        password,
      });

      localStorage.setItem("token", res.data.access);
      alert("Login Successful");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error:", err.response?.data);
      setError(err.response?.data?.detail || "Invalid credentials");
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>🔐 Login</h2>

        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button className="form-button" onClick={loginUser}>
          Login
        </button>

        <div className="form-link">
          Don't have an account?{" "}
          <a onClick={() => navigate("/register")}>Register here</a>
        </div>

        <div className="form-link">
          <a onClick={() => navigate("/")}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}

export default Login;