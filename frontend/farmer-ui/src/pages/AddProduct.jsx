import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import "../styles/AddProduct.css";

function AddProduct() {
  const navigate = useNavigate();

  const [product, setProduct] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    description: ""
  });

  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const generateDescription = async () => {
    if (!product.name.trim()) {
      setError("Enter product name first");
      return;
    }

    try {
      setError("");
      setGenerating(true);

      let res;
      try {
        res = await API.post("products/generate-description/", {
          name: product.name,
          category: product.category,
        });
      } catch {
        res = await API.post("products/generate-description", {
          name: product.name,
          category: product.category,
        });
      }

      const generatedText =
        res?.data?.generated_description ||
        res?.data?.description ||
        "";

      if (!generatedText) throw new Error("No description returned from generator");

      setProduct((prev) => ({ ...prev, description: generatedText.trim() }));
    } catch (err) {
      const backendMsg = err?.response?.data?.error || err?.response?.data?.detail || "";
      setError(backendMsg ? `Failed to generate description: ${backendMsg}` : "Failed to generate description");
    } finally {
      setGenerating(false);
    }
  };

  const addProduct = async () => {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      if (!product.name || !product.category || !product.price || !product.quantity) {
        setError("All fields are required");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("category", product.category);
      formData.append("price", parseFloat(product.price));
      formData.append("quantity", parseInt(product.quantity, 10));
      formData.append("description", product.description);
      if (image) formData.append("image", image);

      await API.post("products/", formData);
      setSuccess("Product added successfully! Redirecting...");
      setTimeout(() => navigate("/products"), 2000);
    } catch (err) {
      setError(JSON.stringify(err.response?.data || { error: "Failed to add product" }));
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) setImage(file);
  };

  const projectedValue = (parseFloat(product.price || 0) * parseInt(product.quantity || 0, 10)).toFixed(2);

  return (
    <div className="ap-page">

      {/* Breadcrumb */}
      <div className="ap-breadcrumb">
        <button className="ap-back-link" onClick={() => navigate("/dashboard")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </button>
        <span className="ap-breadcrumb-sep">/</span>
        <span className="ap-breadcrumb-current">New Listing</span>
      </div>

      <div className="ap-layout">

        {/* ── LEFT: form ── */}
        <main className="ap-form-col">
          <div className="ap-form-header">
            <span className="ap-listing-tag">New Marketplace Listing</span>
            <h1 className="ap-title">Add a Product</h1>
            <p className="ap-subtitle">Fill in the details below to list your produce on FarmDirect.</p>
          </div>

          {error && (
            <div className="ap-alert ap-alert-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="ap-alert ap-alert-success">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {success}
            </div>
          )}

          {/* Section 01 — Core Details */}
          <section className="ap-section">
            <div className="ap-section-label">
              <span className="ap-section-num">01</span>
              Core Details
            </div>

            <div className="ap-field-group">
              <label className="ap-label">Product Name</label>
              <input
                className="ap-input"
                type="text"
                placeholder="e.g. Organic Tomatoes"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
              />
            </div>

            <div className="ap-two-col">
              <div className="ap-field-group">
                <label className="ap-label">Category</label>
                <select
                  className="ap-input"
                  value={product.category}
                  onChange={(e) => setProduct({ ...product, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Grains">Grains</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Herbs">Herbs</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="ap-field-group">
                <label className="ap-label">Price per Unit</label>
                {/*
                  Price prefix fix:
                  - .ap-input-prefix-wrap is position:relative
                  - .ap-input-prefix is absolutely centred at left:13px
                  - CSS rule `.ap-input-prefix-wrap > .ap-input` sets padding-left:46px
                    so the typed value never slides under the "Rs." label
                */}
                <div className="ap-input-prefix-wrap">
                  <span className="ap-input-prefix">Rs.</span>
                  <input
                    className="ap-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={product.price}
                    onChange={(e) => setProduct({ ...product, price: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="ap-field-group">
              <label className="ap-label">Available Quantity</label>
              <input
                className="ap-input"
                type="number"
                min="0"
                placeholder="0"
                value={product.quantity}
                onChange={(e) => setProduct({ ...product, quantity: e.target.value })}
              />
            </div>
          </section>

          {/* Section 02 — Product Story */}
          <section className="ap-section">
            <div className="ap-section-label">
              <span className="ap-section-num">02</span>
              Product Story
            </div>

            <div className="ap-field-group">
              <div className="ap-label-row">
                <label className="ap-label">Description</label>
                <button
                  type="button"
                  className="ap-btn ap-btn-ai"
                  onClick={generateDescription}
                  disabled={generating}
                >
                  {generating ? (
                    <><span className="ap-spinner"></span>Generating…</>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.05 3.05l1.41 1.41M9.54 9.54l1.41 1.41M3.05 10.95l1.41-1.41M9.54 4.46l1.41-1.41"
                          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
              <textarea
                className="ap-textarea"
                maxLength={200}
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                placeholder="Describe your product — freshness, origin, best uses…"
              />
              <div className="ap-char-count">{product.description.length} / 200</div>
            </div>
          </section>

          {/* Section 03 — Product Image */}
          <section className="ap-section">
            <div className="ap-section-label">
              <span className="ap-section-num">03</span>
              Product Image
            </div>

            {image ? (
              <div className="ap-image-preview">
                <img src={URL.createObjectURL(image)} alt="preview" />
                <button className="ap-image-remove" onClick={() => setImage(null)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Remove
                </button>
              </div>
            ) : (
              <label
                className={`ap-dropzone ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="2" y="6" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="11" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 22l7-6 5 5 4-3 7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="ap-dropzone-primary">Drop image here or <u>browse</u></span>
                <span className="ap-dropzone-sub">PNG, JPG, WEBP up to 10MB</span>
              </label>
            )}
          </section>

          <button className="ap-btn ap-btn-submit" onClick={addProduct} disabled={loading}>
            {loading ? (
              <><span className="ap-spinner"></span>Adding Product…</>
            ) : (
              <>
                Add to Marketplace
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </main>

        {/* ── RIGHT: live preview sidebar ── */}
        <aside className="ap-summary-col">
          <div className="ap-summary-card">
            <div className="ap-summary-header">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.854 3.757L14 5.528l-3 2.923.708 4.127L8 10.5l-3.708 2.078L5 8.451 2 5.528l4.146-.771L8 1z"
                  stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              Live Preview
            </div>

            <div className="ap-summary-image">
              {image ? (
                <img src={URL.createObjectURL(image)} alt="preview" />
              ) : (
                <div className="ap-summary-image-placeholder">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect x="2" y="4" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M2 20l6-5 4 4 3-2.5 6 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  No image yet
                </div>
              )}
            </div>

            <div className="ap-summary-body">
              {product.category && (
                <span className="ap-summary-category">{product.category}</span>
              )}

              <p className="ap-summary-name">
                {product.name || <span className="ap-placeholder-text">Product name</span>}
              </p>

              {product.description && (
                <p className="ap-summary-desc">{product.description}</p>
              )}

              <div className="ap-summary-stats">
                <div className="ap-summary-stat">
                  <span>Price</span>
                  <strong>{product.price ? `Rs. ${parseFloat(product.price).toFixed(2)}` : "—"}</strong>
                </div>
                <div className="ap-summary-stat">
                  <span>Quantity</span>
                  <strong>{product.quantity || "—"}</strong>
                </div>
                <div className="ap-summary-stat">
                  <span>Inventory value</span>
                  <strong>{product.price && product.quantity ? `Rs. ${projectedValue}` : "—"}</strong>
                </div>
                <div className="ap-summary-stat">
                  <span>Stock status</span>
                  <strong className={
                    !product.quantity ? "" :
                    parseInt(product.quantity) > 5 ? "stat-good" :
                    parseInt(product.quantity) > 0 ? "stat-warn" : "stat-bad"
                  }>
                    {!product.quantity ? "—" :
                     parseInt(product.quantity) > 5 ? "✓ Healthy" :
                     parseInt(product.quantity) > 0 ? "⚠ Low stock" : "✕ Out of stock"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <p className="ap-summary-note">
            Preview updates as you fill in the form. Your listing goes live immediately after submission.
          </p>
        </aside>

      </div>
    </div>
  );
}

export default AddProduct;