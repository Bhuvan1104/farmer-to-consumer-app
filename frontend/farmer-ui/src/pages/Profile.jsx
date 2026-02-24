import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Pages.css";

function Profile() {
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
        setError("Failed to load profile");
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
      });

      setProfile(response.data);
      setEditMode(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) return <div className="page-container"><p>Loading profile...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👤 My Profile</h1>
        <p>Manage your account information</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {profile && (
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {profile.first_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{profile.first_name} {profile.last_name}</h2>
              <p className="username">@{profile.username}</p>
              <span className={`role-badge ${profile.role}`}>{profile.role?.toUpperCase()}</span>
            </div>
          </div>

          <div className="profile-details">
            <h3>Account Information</h3>

            {editMode ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>First Name:</label>
                  <input
                    type="text"
                    value={formData.first_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Last Name:</label>
                  <input
                    type="text"
                    value={formData.last_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="form-actions">
                  <button className="primary-button" onClick={handleUpdate}>
                    Save Changes
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setEditMode(false);
                      setFormData(profile);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-view">
                <div className="detail-item">
                  <span className="label">Username:</span>
                  <span className="value">{profile.username}</span>
                </div>

                <div className="detail-item">
                  <span className="label">Email:</span>
                  <span className="value">{profile.email}</span>
                </div>

                <div className="detail-item">
                  <span className="label">Role:</span>
                  <span className="value">{profile.role}</span>
                </div>

                <div className="detail-item">
                  <span className="label">Member Since:</span>
                  <span className="value">
                    {new Date(profile.date_joined).toLocaleDateString()}
                  </span>
                </div>

                <button
                  className="primary-button"
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          <div className="profile-actions">
            <button className="danger-button" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
