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
    description: "",
  });

  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [quickMode, setQuickMode] = useState(true);

  const inferCategoryFromName = (name) => {
    const value = String(name || "").toLowerCase();
    if (!value) return "Others";
    if (value.includes("milk") || value.includes("paneer") || value.includes("curd") || value.includes("ghee")) return "Dairy";
    if (value.includes("rice") || value.includes("wheat") || value.includes("grain")) return "Grains";
    if (value.includes("mint") || value.includes("coriander") || value.includes("leaf")) return "Herbs";
    if (
      value.includes("mango") || value.includes("banana") || value.includes("apple") ||
      value.includes("orange") || value.includes("grape") || value.includes("fruit")
    ) return "Fruits";
    if (
      value.includes("tomato") || value.includes("onion") || value.includes("potato") ||
      value.includes("chilli") || value.includes("vegetable")
    ) return "Vegetables";
    return "Others";
  };

  const resolvedCategory = quickMode ? inferCategoryFromName(product.name) : product.category;

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
          category: resolvedCategory,
        });
      } catch {
        res = await API.post("products/generate-description", {
          name: product.name,
          category: resolvedCategory,
        });
      }

      const generatedText = res?.data?.generated_description || res?.data?.description || "";
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

      if (!product.name || !resolvedCategory || !product.price || !product.quantity) {
        setError("All required fields are needed");
        setLoading(false);
        return;
      }
      if (quickMode && !image) {
        setError("Quick Add needs a product image");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("category", resolvedCategory);
      formData.append("price", parseFloat(product.price));
      formData.append("quantity", parseInt(product.quantity, 10));
      formData.append("description", product.description || `${product.name} sourced from local farm.`);
      if (image) formData.append("image", image);

      await API.post("products/", formData);
      setSuccess("Product added successfully! Redirecting...");
      setTimeout(() => navigate("/products"), 1800);
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
      <div className="ap-breadcrumb">
        <button className="ap-back-link" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
        <span className="ap-breadcrumb-sep">/</span>
        <span className="ap-breadcrumb-current">New Listing</span>
      </div>

      <div className="ap-layout">
        <main className="ap-form-col">
          <div className="ap-form-header">
            <span className="ap-listing-tag">New Marketplace Listing</span>
            <h1 className="ap-title">Add a Product</h1>
            <p className="ap-subtitle">Fill in details to list your produce on FarmDirect.</p>
            <div className="ap-mode-toggle">
              <button
                type="button"
                className={`ap-mode-btn ${quickMode ? "active" : ""}`}
                onClick={() => setQuickMode(true)}
              >
                Quick Add 
              </button>
              <button
                type="button"
                className={`ap-mode-btn ${!quickMode ? "active" : ""}`}
                onClick={() => setQuickMode(false)}
              >
                Full Form
              </button>
            </div>
            {quickMode && (
              <div className="ap-quick-hint">
                Quick Add uses: Product Name, Price, Quantity, Image. Category is auto-detected.
              </div>
            )}
          </div>

          {error && <div className="ap-alert ap-alert-error">{error}</div>}
          {success && <div className="ap-alert ap-alert-success">{success}</div>}

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
              {!quickMode && (
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
              )}

              <div className="ap-field-group">
                <label className="ap-label">Price per Unit</label>
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

            {quickMode && (
              <div className="ap-auto-category">
                Auto Category: <strong>{resolvedCategory}</strong>
              </div>
            )}
          </section>

          {!quickMode && (
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
                    {generating ? "Generating..." : "Generate with AI"}
                  </button>
                </div>
                <textarea
                  className="ap-textarea"
                  maxLength={200}
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  placeholder="Describe freshness, origin, and quality..."
                />
                <div className="ap-char-count">{product.description.length} / 200</div>
              </div>
            </section>
          )}

          <section className="ap-section">
            <div className="ap-section-label">
              <span className="ap-section-num">{quickMode ? "02" : "03"}</span>
              Product Image
            </div>

            {image ? (
              <div className="ap-image-preview">
                <img src={URL.createObjectURL(image)} alt="preview" />
                <button className="ap-image-remove" onClick={() => setImage(null)}>
                  Remove
                </button>
              </div>
            ) : (
              <label
                className={`ap-dropzone ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
                <span className="ap-dropzone-primary">Drop image here or browse</span>
                <span className="ap-dropzone-sub">PNG, JPG, WEBP up to 10MB</span>
              </label>
            )}
          </section>

          <button className="ap-btn ap-btn-submit" onClick={addProduct} disabled={loading}>
            {loading ? "Adding Product..." : "Add to Marketplace"}
          </button>
        </main>

        <aside className="ap-summary-col">
          <div className="ap-summary-card">
            <div className="ap-summary-header">Live Preview</div>
            <div className="ap-summary-image">
              {image ? <img src={URL.createObjectURL(image)} alt="preview" /> : <div className="ap-summary-image-placeholder">No image yet</div>}
            </div>
            <div className="ap-summary-body">
              <span className="ap-summary-category">{resolvedCategory}</span>
              <p className="ap-summary-name">{product.name || <span className="ap-placeholder-text">Product name</span>}</p>
              {product.description && !quickMode && <p className="ap-summary-desc">{product.description}</p>}
              <div className="ap-summary-stats">
                <div className="ap-summary-stat"><span>Price</span><strong>{product.price ? `Rs. ${parseFloat(product.price).toFixed(2)}` : "-"}</strong></div>
                <div className="ap-summary-stat"><span>Quantity</span><strong>{product.quantity || "-"}</strong></div>
                <div className="ap-summary-stat"><span>Inventory value</span><strong>{product.price && product.quantity ? `Rs. ${projectedValue}` : "-"}</strong></div>
              </div>
            </div>
          </div>
          <p className="ap-summary-note">Preview updates as you fill the form.</p>
        </aside>
      </div>
    </div>
  );
}

export default AddProduct;
