import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Forms.css";

function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "consumer",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const registerUser = async () => {
    try {
      setError("");
      setSuccess("");

      if (!form.username || !form.email || !form.password) {
        setError("All fields are required");
        return;
      }

      console.log("📤 Sending registration data:", form);
      
      const response = await API.post("auth/register/", form);
      
      console.log("✅ Registration successful:", response.data);
      setSuccess("Registered Successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error("❌ Full error object:", err);
      console.error("❌ Error response:", err.response);
      console.error("❌ Error data:", err.response?.data);
      console.error("❌ Error status:", err.response?.status);
      
      const errors = err.response?.data;
      
      if (typeof errors === "object" && errors !== null) {
        // Handle field validation errors (e.g., {username: ["error1"], email: ["error2"]})
        const errorMessages = Object.values(errors)
          .flat()
          .join(", ");
        console.error("Formatted error messages:", errorMessages);
        setError(errorMessages);
      } else if (typeof errors === "string") {
        setError(errors);
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>📝 Register</h2>

        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            placeholder="Choose a username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Create a password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="consumer">Consumer</option>
            <option value="farmer">Farmer</option>
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button className="form-button" onClick={registerUser}>
          Register
        </button>

        <div className="form-link">
          Already have an account?{" "}
          <a onClick={() => navigate("/login")}>Login here</a>
        </div>

        <div className="form-link">
          <a onClick={() => navigate("/")}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}

export default Register;