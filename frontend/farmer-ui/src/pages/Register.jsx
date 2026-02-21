import { useState } from "react";
import API from "../services/api";

function Register() {
  const [form, setForm] = useState({
    username:"",
    email:"",
    password:"",
    role:"consumer"
  });

  const registerUser = async () => {
    await API.post("auth/register/", form);
    alert("Registered Successfully");
  };

  return (
    <div>
      <h2>Register</h2>

      <input placeholder="Username"
        onChange={(e)=>setForm({...form,username:e.target.value})} />

      <input placeholder="Email"
        onChange={(e)=>setForm({...form,email:e.target.value})} />

      <input type="password"
        placeholder="Password"
        onChange={(e)=>setForm({...form,password:e.target.value})} />

      <select
        onChange={(e)=>setForm({...form,role:e.target.value})}>
        <option value="consumer">Consumer</option>
        <option value="farmer">Farmer</option>
      </select>

      <button onClick={registerUser}>Register</button>
    </div>
  );
}

export default Register;