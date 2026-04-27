import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import "../styles/AddProduct.css";

function AddProduct() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const te = language === "te";

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
      setError(te ? "ముందుగా ఉత్పత్తి పేరు నమోదు చేయండి" : "Enter product name first");
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
      setError(backendMsg ? `${te ? "వివరణ రూపొందించడం విఫలమైంది" : "Failed to generate description"}: ${backendMsg}` : (te ? "వివరణ రూపొందించడం విఫలమైంది" : "Failed to generate description"));
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
        setError(te ? "అన్ని తప్పనిసరి ఫీల్డ్స్ అవసరం" : "All required fields are needed");
        setLoading(false);
        return;
      }
      if (quickMode && !image) {
        setError(te ? "క్విక్ యాడ్‌కు ఉత్పత్తి చిత్రం అవసరం" : "Quick Add needs a product image");
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
      setSuccess(te ? "ఉత్పత్తి విజయవంతంగా జోడించబడింది! మళ్లించబడుతోంది..." : "Product added successfully! Redirecting...");
      setTimeout(() => navigate("/products"), 1800);
    } catch (err) {
      setError(JSON.stringify(err.response?.data || { error: te ? "ఉత్పత్తి జోడింపు విఫలమైంది" : "Failed to add product" }));
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
          {te ? "డాష్‌బోర్డ్‌కు తిరిగి వెళ్ళు" : "Back to Dashboard"}
        </button>
        <span className="ap-breadcrumb-sep">/</span>
        <span className="ap-breadcrumb-current">{te ? "కొత్త జాబితా" : "New Listing"}</span>
      </div>

      <div className="ap-layout">
        <main className="ap-form-col">
          <div className="ap-form-header">
            <span className="ap-listing-tag">{te ? "కొత్త మార్కెట్ జాబితా" : "New Marketplace Listing"}</span>
            <h1 className="ap-title">{te ? "ఉత్పత్తి జోడించండి" : "Add a Product"}</h1>
            <p className="ap-subtitle">{te ? "FarmDirect లో మీ ఉత్పత్తిని జాబితా చేయడానికి వివరాలు నమోదు చేయండి." : "Fill in details to list your produce on FarmDirect."}</p>
            <div className="ap-mode-toggle">
              <button
                type="button"
                className={`ap-mode-btn ${quickMode ? "active" : ""}`}
                onClick={() => setQuickMode(true)}
              >
                {te ? "క్విక్ యాడ్" : "Quick Add"} 
              </button>
              <button
                type="button"
                className={`ap-mode-btn ${!quickMode ? "active" : ""}`}
                onClick={() => setQuickMode(false)}
              >
                {te ? "పూర్తి ఫారం" : "Full Form"}
              </button>
            </div>
            {quickMode && (
              <div className="ap-quick-hint">
                {te ? "క్విక్ యాడ్‌లో: ఉత్పత్తి పేరు, ధర, పరిమాణం, చిత్రం మాత్రమే. కేటగిరీ ఆటోగా గుర్తించబడుతుంది." : "Quick Add uses: Product Name, Price, Quantity, Image. Category is auto-detected."}
              </div>
            )}
          </div>

          {error && <div className="ap-alert ap-alert-error">{error}</div>}
          {success && <div className="ap-alert ap-alert-success">{success}</div>}

          <section className="ap-section">
            <div className="ap-section-label">
              <span className="ap-section-num">01</span>
              {te ? "ప్రధాన వివరాలు" : "Core Details"}
            </div>

            <div className="ap-field-group">
              <label className="ap-label">{te ? "ఉత్పత్తి పేరు" : "Product Name"}</label>
              <input
                className="ap-input"
                type="text"
                placeholder={te ? "ఉదా: ఆర్గానిక్ టమాటాలు" : "e.g. Organic Tomatoes"}
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
              />
            </div>

            <div className="ap-two-col">
              {!quickMode && (
                <div className="ap-field-group">
                  <label className="ap-label">{te ? "వర్గం" : "Category"}</label>
                  <select
                    className="ap-input"
                    value={product.category}
                    onChange={(e) => setProduct({ ...product, category: e.target.value })}
                  >
                    <option value="">{te ? "వర్గం ఎంచుకోండి" : "Select Category"}</option>
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
                <label className="ap-label">{te ? "యూనిట్‌కు ధర" : "Price per Unit"}</label>
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
              <label className="ap-label">{te ? "లభ్యమైన పరిమాణం" : "Available Quantity"}</label>
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
                {te ? "ఆటో కేటగిరీ" : "Auto Category"}: <strong>{resolvedCategory}</strong>
              </div>
            )}
          </section>

          {!quickMode && (
            <section className="ap-section">
              <div className="ap-section-label">
                <span className="ap-section-num">02</span>
                {te ? "ఉత్పత్తి వివరణ" : "Product Story"}
              </div>

              <div className="ap-field-group">
                <div className="ap-label-row">
                  <label className="ap-label">{te ? "వివరణ" : "Description"}</label>
                  <button
                    type="button"
                    className="ap-btn ap-btn-ai"
                    onClick={generateDescription}
                    disabled={generating}
                  >
                    {generating ? (te ? "రూపొందుతోంది..." : "Generating...") : (te ? "AI తో రూపొందించు" : "Generate with AI")}
                  </button>
                </div>
                <textarea
                  className="ap-textarea"
                  maxLength={200}
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  placeholder={te ? "తాజాదనం, మూలం, నాణ్యత గురించి వివరించండి..." : "Describe freshness, origin, and quality..."}
                />
                <div className="ap-char-count">{product.description.length} / 200</div>
              </div>
            </section>
          )}

          <section className="ap-section">
            <div className="ap-section-label">
              <span className="ap-section-num">{quickMode ? "02" : "03"}</span>
              {te ? "ఉత్పత్తి చిత్రం" : "Product Image"}
            </div>

            {image ? (
              <div className="ap-image-preview">
                <img src={URL.createObjectURL(image)} alt="preview" />
                <button className="ap-image-remove" onClick={() => setImage(null)}>
                  {te ? "తొలగించు" : "Remove"}
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
                <span className="ap-dropzone-primary">{te ? "ఇక్కడ చిత్రం వదలండి లేదా బ్రౌజ్ చేయండి" : "Drop image here or browse"}</span>
                <span className="ap-dropzone-sub">{te ? "PNG, JPG, WEBP - గరిష్టం 10MB" : "PNG, JPG, WEBP up to 10MB"}</span>
              </label>
            )}
          </section>

          <button className="ap-btn ap-btn-submit" onClick={addProduct} disabled={loading}>
            {loading ? (te ? "ఉత్పత్తి జోడిస్తోంది..." : "Adding Product...") : (te ? "మార్కెట్‌లో జోడించు" : "Add to Marketplace")}
          </button>
        </main>

        <aside className="ap-summary-col">
          <div className="ap-summary-card">
            <div className="ap-summary-header">{te ? "ప్రత్యక్ష ప్రివ్యూ" : "Live Preview"}</div>
            <div className="ap-summary-image">
              {image ? <img src={URL.createObjectURL(image)} alt="preview" /> : <div className="ap-summary-image-placeholder">{te ? "ఇంకా చిత్రం లేదు" : "No image yet"}</div>}
            </div>
            <div className="ap-summary-body">
              <span className="ap-summary-category">{resolvedCategory}</span>
              <p className="ap-summary-name">{product.name || <span className="ap-placeholder-text">{te ? "ఉత్పత్తి పేరు" : "Product name"}</span>}</p>
              {product.description && !quickMode && <p className="ap-summary-desc">{product.description}</p>}
              <div className="ap-summary-stats">
                <div className="ap-summary-stat"><span>{te ? "ధర" : "Price"}</span><strong>{product.price ? `Rs. ${parseFloat(product.price).toFixed(2)}` : "-"}</strong></div>
                <div className="ap-summary-stat"><span>{te ? "పరిమాణం" : "Quantity"}</span><strong>{product.quantity || "-"}</strong></div>
                <div className="ap-summary-stat"><span>{te ? "స్టాక్ విలువ" : "Inventory value"}</span><strong>{product.price && product.quantity ? `Rs. ${projectedValue}` : "-"}</strong></div>
              </div>
            </div>
          </div>
          <p className="ap-summary-note">{te ? "మీరు ఫారం నింపుతుండగా ప్రివ్యూ అప్డేట్ అవుతుంది." : "Preview updates as you fill the form."}</p>
        </aside>
      </div>
    </div>
  );
}

export default AddProduct;
