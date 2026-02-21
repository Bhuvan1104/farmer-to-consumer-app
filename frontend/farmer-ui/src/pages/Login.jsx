import { useState } from "react";
import axios from "axios";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginUser = async () => {
    const res = await axios.post(
      "http://127.0.0.1:8000/api/token/",
      { username, password }
    );

    localStorage.setItem("token", res.data.access);
    alert("Login Successful");
    window.location.href = "/dashboard";
  };

  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Username"
        onChange={(e)=>setUsername(e.target.value)} />

      <input type="password"
        placeholder="Password"
        onChange={(e)=>setPassword(e.target.value)} />

      <button onClick={loginUser}>Login</button>
    </div>
  );
}

export default Login;