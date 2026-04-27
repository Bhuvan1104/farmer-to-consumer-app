import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../context/LanguageContext";

import API from "../services/api";
import "../styles/ProductDetail.css";
import { isConsumer, isFarmer } from "../utils/auth";

function ProductDetail() {
  const { language } = useLanguage();
  const te = language === "te";
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", price: "", quantity: "", description: "" });

  useEffect(() => {
    fetchProduct();
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await API.get("users/profile/");
      setCurrentUsername(res.data?.username || "");
    } catch {
      setCurrentUsername("");
    }
  };

  const fetchProduct = async () => {
    try {
      const res = await API.get(`products/${id}/`);
      setProduct(res.data);
      setForm({
        name: res.data.name || "",
        category: res.data.category || "",
        price: res.data.price || "",
        quantity: res.data.quantity || "",
        description: res.data.description || "",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetEditForm = () => {
    setEditing(false);
    setImageFile(null);
    setError("");
    setForm({
      name: product?.name || "",
      category: product?.category || "",
      price: product?.price || "",
      quantity: product?.quantity || "",
      description: product?.description || "",
    });
  };

  const addToCart = async () => {
    try {
      await API.post("orders/cart/add/", { product_id: product.id, quantity });
      window.dispatchEvent(new Event("cartUpdated"));
      alert(te ? "????????? ????????????" : "Added to Cart");
    } catch (err) {
      console.error(err);
    }
  };

  const buyNow = async () => {
    try {
      await API.post("orders/cart/add/", { product_id: product.id, quantity });
      navigate("/cart");
    } catch {
      alert(te ? "???????????????" : "Failed to proceed");
    }
  };

  const generateDescription = async () => {
    if (!form.name.trim()) {
      setError(te ? "??????? ???????? ???? ????? ??????" : "Enter product name first");
      return;
    }

    try {
      setGenerating(true);
      let res;
      try {
        res = await API.post("products/generate-description/", { name: form.name, category: form.category });
      } catch {
        res = await API.post("products/generate-description", { name: form.name, category: form.category });
      }

      const generatedText = res?.data?.generated_description || res?.data?.description || "";
      if (!generatedText) {
        throw new Error("No description returned from generator");
      }

      setForm((prev) => ({ ...prev, description: generatedText.trim() }));
      setError("");
    } catch (err) {
      const backendMsg = err?.response?.data?.error || err?.response?.data?.detail || "";
      setError(backendMsg ? `Failed to generate description: ${backendMsg}` : "Failed to generate description");
    } finally {
      setGenerating(false);
    }
  };

  const saveProduct = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("category", form.category);
      formData.append("price", parseFloat(form.price || 0));
      formData.append("quantity", parseInt(form.quantity || 0, 10));
      formData.append("description", form.description || "");
      if (imageFile) formData.append("image", imageFile);

      const res = await API.patch(`products/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProduct(res.data);
      setForm({
        name: res.data.name || "",
        category: res.data.category || "",
        price: res.data.price || "",
        quantity: res.data.quantity || "",
        description: res.data.description || "",
      });
      setImageFile(null);
      setEditing(false);
      setSuccess(te ? "???????? ?????????? ??????????????." : "Product updated successfully.");
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data || { error: "Update failed" }));
    } finally {
      setSaving(false);
    }
  };

  const canEdit = isFarmer() && currentUsername && currentUsername === product?.farmer_username;
  const stockLevel = Number(product?.quantity || 0);
  const priceNumber = Number(product?.price || 0);
  const inventoryValue = stockLevel * priceNumber;
  const stockTone = stockLevel <= 0 ? "out-stock" : stockLevel <= 5 ? "low-stock" : "in-stock";
  const stockLabel = stockLevel <= 0 ? "Out of Stock" : stockLevel <= 5 ? `Low Stock (${stockLevel})` : `In Stock (${stockLevel})`;

  if (loading) return (
    <div className="pd-loading-screen">
      <div className="pd-loading-spinner"></div>
      <span>Loading product…</span>
    </div>
  );
  if (!product) return <div className="pd-not-found">Product not found</div>;

  return (
    <div className="pd-page">
      {/* Breadcrumb */}
      <div className="pd-breadcrumb">
        <button className="pd-back-link" onClick={() => navigate("/products")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {te ? "??????????? ?????? ??????" : "Back to Marketplace"}
        </button>
        <span className="pd-breadcrumb-sep">/</span>
        <span className="pd-breadcrumb-current">{product.name}</span>
      </div>

      <div className="pd-layout">
        {/* LEFT: Image Panel */}
        <aside className="pd-image-col">
          <div className="pd-image-frame">
            {imageFile ? (
              <img src={URL.createObjectURL(imageFile)} alt="preview" className="pd-product-img" />
            ) : product.image ? (
              <img src={product.image} alt={product.name} className="pd-product-img" />
            ) : (
              <div className="pd-image-placeholder">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm0 8c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6zm0 28c-5.007 0-9.449-2.457-12.182-6.238C12.26 30.649 17.866 28 24 28s11.74 2.649 12.182 5.762C33.449 37.543 29.007 40 24 40z" fill="currentColor" opacity="0.3"/>
                </svg>
                <span>{te ? "?????? ????" : "No image"}</span>
              </div>
            )}

            {canEdit && editing && (
              <label className="pd-image-upload-overlay">
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v10M5 8l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {te ? "?????? ??????" : "Replace Image"}
              </label>
            )}
          </div>

          {/* Seller + Inventory cards */}
          <div className="pd-sidebar-cards">
            <div className="pd-sidebar-card">
              <span className="pd-sidebar-label">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Seller
              </span>
              <span className="pd-sidebar-value">{product.farmer_username || "FarmDirect Farmer"}</span>
            </div>
            <div className="pd-sidebar-card">
              <span className="pd-sidebar-label">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 3V2a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Inventory Value
              </span>
              <span className="pd-sidebar-value accent">Rs. {inventoryValue.toFixed(2)}</span>
            </div>
          </div>
        </aside>

        {/* RIGHT: Detail Panel */}
        <main className="pd-detail-col">
          {/* Header row */}
          <div className="pd-header">
            <div className="pd-header-left">
              <span className="pd-listing-tag">Marketplace Listing</span>
              {editing ? (
                <div className="pd-field-group">
                  <label className="pd-label">Product Name</label>
                  <input
                    className="pd-input pd-title-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Product name"
                  />
                </div>
              ) : (
                <h1 className="pd-title">{product.name}</h1>
              )}
            </div>

            {canEdit && (
              <div className="pd-edit-actions">
                {!editing ? (
                  <button className="pd-btn pd-btn-edit" onClick={() => { setEditing(true); setSuccess(""); setError(""); }}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {te ? "?????? ???????" : "Edit Listing"}
                  </button>
                ) : (
                  <>
                    <button className="pd-btn pd-btn-save" onClick={saveProduct} disabled={saving}>
                      {saving ? (
                        <><span className="pd-btn-spinner"></span>Saving…</>
                      ) : (
                        <><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 8l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{te ? "???????? ???? ??????" : "Save Changes"}</>
                      )}
                    </button>
                    <button className="pd-btn pd-btn-cancel" onClick={resetEditForm}>{te ? "?????" : "Cancel"}</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Alerts */}
          {error && (
            <div className="pd-alert pd-alert-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="pd-alert pd-alert-success">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {success}
            </div>
          )}

          {/* Key stats strip */}
          <div className="pd-stats-strip">
            <div className="pd-stat">
              <span className="pd-stat-label">{te ? "?????" : "Category"}</span>
              <span className="pd-stat-value">{product.category || "—"}</span>
            </div>
            <div className="pd-stat-divider"></div>
            <div className="pd-stat">
              <span className="pd-stat-label">{te ? "????????? ??" : "Price per unit"}</span>
              <span className="pd-stat-value pd-stat-price">Rs. {priceNumber.toFixed(2)}</span>
            </div>
            <div className="pd-stat-divider"></div>
            <div className="pd-stat">
              <span className="pd-stat-label">{te ? "??????? ????????" : "Units available"}</span>
              <span className="pd-stat-value">{stockLevel}</span>
            </div>
            <div className="pd-stat-divider"></div>
            <div className="pd-stat">
              <span className="pd-stat-label">{te ? "??????" : "Status"}</span>
              <span className={`pd-stock-badge ${stockTone}`}>{stockLabel}</span>
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="pd-edit-panel">
              <div className="pd-edit-panel-header">
                <h3>{te ? "?????? ??????? ???????????" : "Update Listing Details"}</h3>
                <p>Adjust pricing, stock, and presentation before the next order comes in.</p>
              </div>

              <div className="pd-edit-grid">
                <div className="pd-field-group">
                  <label className="pd-label">{te ? "?????" : "Category"}</label>
                  <select className="pd-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select Category</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Grains">Grains</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Herbs">Herbs</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div className="pd-field-group">
                  <label className="pd-label">Price Per Unit (Rs.)</label>
                  <input className="pd-input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                </div>

                <div className="pd-field-group">
                  <label className="pd-label">Available Quantity</label>
                  <input className="pd-input" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                </div>

                <div className="pd-field-group pd-live-summary">
                  <span className="pd-label">Live Summary</span>
                  <div className="pd-summary-rows">
                    <div className="pd-summary-row">
                      <span>Projected inventory</span>
                      <strong>Rs. {(Number(form.price || 0) * Number(form.quantity || 0)).toFixed(2)}</strong>
                    </div>
                    <div className="pd-summary-row">
                      <span>{te ? "??????" : "Status"}</span>
                      <strong>{Number(form.quantity || 0) > 5 ? "✓ Healthy stock" : Number(form.quantity || 0) > 0 ? "⚠ Restock soon" : "✕ Needs replenishment"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="pd-description-section">
            <div className="pd-description-header">
              <h3>{te ? "?????" : "Description"}</h3>
              {canEdit && editing && (
                <button className="pd-btn pd-btn-ai" onClick={generateDescription} disabled={generating}>
                  {generating ? (
                    <><span className="pd-btn-spinner"></span>Generating…</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.05 3.05l1.41 1.41M9.54 9.54l1.41 1.41M3.05 10.95l1.41-1.41M9.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>{te ? "AI ?? ??????????" : "Generate with AI"}</>
                  )}
                </button>
              )}
            </div>

            {editing ? (
              <div className="pd-field-group">
                <label className="pd-label">{te ? "???????? ?????" : "Product Story"}</label>
                <textarea
                  className="pd-textarea"
                  maxLength={200}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your product…"
                />
                <div className="pd-char-count">{form.description.length} / 200</div>
              </div>
            ) : (
              <div className="pd-description-body">
                <ReactMarkdown>{product.description || "No description available."}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Consumer actions */}
          {isConsumer() && product.quantity > 0 && !editing && (
            <div className="pd-purchase-section">
              <div className="pd-qty-control">
                <span className="pd-qty-label">Quantity</span>
                <div className="pd-qty-stepper">
                  <button className="pd-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <span className="pd-qty-value">{quantity}</span>
                  <button className="pd-qty-btn" onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}>+</button>
                </div>
                <span className="pd-qty-total">= Rs. {(priceNumber * quantity).toFixed(2)}</span>
              </div>

              <div className="pd-cta-row">
                <button className="pd-btn pd-btn-cart" onClick={addToCart}>
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <path d="M1.5 1.5h2l1.5 8h8l1.5-6H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="7.5" cy="14" r="1" fill="currentColor"/>
                    <circle cx="12" cy="14" r="1" fill="currentColor"/>
                  </svg>
                  Add to Cart
                </button>
                <button className="pd-btn pd-btn-buy" onClick={buyNow}>
                  Buy Now
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5h9M8.5 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ProductDetail;

