import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/ProductDetail.css";
import { isFarmer, isConsumer } from "../utils/auth";
import ReactMarkdown from "react-markdown";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showFull, setShowFull] = useState(false);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({});
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const res = await API.get(`products/${id}/`);
      setProduct(res.data);
      setForm(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setNewImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async () => {
    try {
      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("category", form.category);
      formData.append("price", form.price);
      formData.append("quantity", form.quantity);
      formData.append("description", form.description);

      if (newImage) {
        formData.append("image", newImage);
      }

      const res = await API.patch(
        `products/${id}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setProduct(res.data);
      setForm(res.data);
      setNewImage(null);
      setPreview(null);
      setEditMode(false);

    } catch (err) {
      console.error("Update failed:", err.response?.data);
      alert("Failed to update product.");
    }
  };

  const handleDelete = async () => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this product?"
  );
  if (!confirmDelete) return;

  try {
    await API.delete(`products/${id}/`);
    navigate("/products");
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Failed to delete product.");
  }
};

const handleBuyNow = async () => {
  try {
    const response = await API.post("orders/", {
      product: product.id,
      quantity: 1,
    });

    alert("Order placed successfully!");
    navigate(`/orders/${response.data.id}`);

  } catch (err) {
    console.error("Order error:", err.response?.data);
    alert("Failed to place order.");
  }
};

  if (loading) return <div>Loading...</div>;

  return (
  <div className="detail-page">
    <div className="detail-wrapper">

      <div className="detail-card">

        {/* LEFT - IMAGE */}
        <div className="detail-image-section">
          {!editMode ? (
            product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="detail-image"
              />
            ) : (
              <div className="image-placeholder">🌾</div>
            )
          ) : (
            <div className="image-edit-wrapper">
              <img
                src={preview || product.image}
                alt="Preview"
                className="detail-image"
              />
              <label className="upload-btn">
                Change Image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />
              </label>
            </div>
          )}
        </div>

        {/* RIGHT - INFO */}
        <div className="detail-info-section">

          {!editMode ? (
            <>
              <h1 className="product-title">{product.name}</h1>
              <span className="category-badge">{product.category}</span>

              <div className="price-tag">₹{product.price}</div>

              <div className="product-description">
  <h4>About this product</h4>

  {product.description ? (
    <div className="markdown-content">
      <ReactMarkdown>
        {showFull ? product.description : product.description.slice(0, 150)}
      </ReactMarkdown>
    </div>
  ) : (
    <p>No description available.</p>
  )}

  {product.description?.length > 150 && (
    <button
      className="read-more-btn"
      onClick={() => setShowFull(!showFull)}
    >
      {showFull ? "Show Less" : "Read More"}
    </button>
  )}
</div>
<br></br>
<br></br>

              <div className="stock-status">
                {product.quantity > 0 ? (
                  <span className="in-stock">
                    ● In Stock ({product.quantity})
                  </span>
                ) : (
                  <span className="out-stock">
                    ● Out of Stock
                  </span>
                )}
              </div>

              <div className="action-buttons">
                {isFarmer() && (
                  <>
                    <button
                      className="btn-primary"
                      onClick={() => setEditMode(true)}
                    >
                      Edit
                    </button>

                    <button
                      className="btn-danger"
                      onClick={handleDelete}
                    >
                      Delete
                    </button>
                  </>
                )}

                {isConsumer() && (
                  <button className="btn-primary" onClick={handleBuyNow}>
  🛒 Buy Now
</button>
                )}

                <button
                  className="btn-secondary"
                  onClick={() => navigate("/products")}
                >
                  ← Back
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Edit Product</h2>

              <div className="form-group">
                <input
                  type="text"
                  value={form.name || ""}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Product Name"
                />
              </div>

              <div className="form-group">
                <input
                  type="text"
                  value={form.category || ""}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Category"
                />
              </div>
              <div className="form-group">
  <textarea
    value={form.description || ""}
    onChange={(e) =>
      setForm({ ...form, description: e.target.value })
    }
    placeholder="Enter product description"
  />
</div>

              <div className="form-row">
                <input
                  type="number"
                  value={form.price || ""}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                  placeholder="Price"
                />

                <input
                  type="number"
                  value={form.quantity || ""}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                  placeholder="Quantity"
                />
              </div>

              <div className="action-buttons">
                <button className="btn-primary" onClick={handleUpdate}>
                  Save Changes
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  </div>
);
}

export default ProductDetail;