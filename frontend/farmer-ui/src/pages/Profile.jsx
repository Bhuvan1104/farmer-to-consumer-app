import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import "../styles/Profile.css";

function Profile() {
  const { language } = useLanguage();
  const te = language === "te";

  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get("auth/profile/");
      setProfile(response.data);
      setFormData(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        setError(te ? "ప్రొఫైల్ లోడ్ కాలేదు" : "Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await API.put("auth/profile/", {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        preferred_language: formData.preferred_language,
      });

      setProfile(response.data);
      setEditMode(false);
      setSuccess(te ? "ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది!" : "Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || (te ? "ప్రొఫైల్ నవీకరణ విఫలమైంది" : "Failed to update profile"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) return <div className="page-container"><p>{te ? "ప్రొఫైల్ లోడ్ అవుతోంది..." : "Loading profile..."}</p></div>;

  return (
    <div className="page-container">
      <div className="profile-wrapper">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {profile?.first_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase()}
            </div>

            <div className="profile-info">
              <h2>{profile?.first_name} {profile?.last_name}</h2>
              <p>@{profile?.username}</p>
              <span className={`role-badge ${profile?.role}`}>{profile?.role?.toUpperCase()}</span>
            </div>
          </div>

          {error && <div className="alert error">{error}</div>}
          {success && <div className="alert success">{success}</div>}

          <div className="profile-body">
            <h3>{te ? "ఖాతా సమాచారం" : "Account Information"}</h3>

            {editMode ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>{te ? "మొదటి పేరు" : "First Name"}</label>
                  <input
                    type="text"
                    value={formData.first_name || ""}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{te ? "చివరి పేరు" : "Last Name"}</label>
                  <input
                    type="text"
                    value={formData.last_name || ""}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{te ? "ఇమెయిల్" : "Email"}</label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{te ? "ప్రాధాన్య భాష" : "Preferred Language"}</label>
                  <select
                    value={formData.preferred_language || "en"}
                    onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="te">Telugu</option>
                    <option value="ta">Tamil</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button className="btn-primary" onClick={handleUpdate}>
                    {te ? "మార్పులు సేవ్ చేయండి" : "Save Changes"}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setEditMode(false);
                      setFormData(profile);
                    }}
                  >
                    {te ? "రద్దు" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-view">
                <div className="detail-item">
                  <span>{te ? "వాడుకరి పేరు" : "Username"}</span>
                  <strong>{profile?.username}</strong>
                </div>

                <div className="detail-item">
                  <span>{te ? "ఇమెయిల్" : "Email"}</span>
                  <strong>{profile?.email}</strong>
                </div>

                <div className="detail-item">
                  <span>{te ? "పాత్ర" : "Role"}</span>
                  <strong>{profile?.role}</strong>
                </div>

                <div className="detail-item">
                  <span>{te ? "ప్రాధాన్య భాష" : "Preferred Language"}</span>
                  <strong>{profile?.preferred_language || "en"}</strong>
                </div>

                <div className="detail-item">
                  <span>{te ? "సభ్యత్వం ప్రారంభం" : "Member Since"}</span>
                  <strong>{new Date(profile?.date_joined).toLocaleDateString()}</strong>
                </div>

                <button className="btn-primary" onClick={() => setEditMode(true)}>
                  {te ? "ప్రొఫైల్ సవరించు" : "Edit Profile"}
                </button>
              </div>
            )}
          </div>

          <div className="profile-footer">
            <button className="btn-danger" onClick={handleLogout}>
              {te ? "లాగౌట్" : "Logout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

