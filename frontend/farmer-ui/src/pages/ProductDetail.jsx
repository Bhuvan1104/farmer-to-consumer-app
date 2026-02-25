import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/ProductDetail.css";
import { isFarmer, isConsumer } from "../utils/auth";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="detail-container">
      <div className="detail-card">

        {/* IMAGE SECTION */}
        <div className="detail-image-section">
  {!editMode ? (
    product.image ? (
      <img
        src={product.image}
        alt={product.name}
        className="detail-image"
      />
    ) : (
      <div className="detail-image-placeholder">🌾</div>
    )
  ) : (
    <div className="image-edit-wrapper">
      <img
        src={preview || product.image}
        alt="Preview"
        className="detail-image"
      />

      <label className="image-upload-label">
        Change Image
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          hidden
        />
      </label>
    </div>
  )}
</div>

        {/* INFO SECTION */}
        <div className="detail-info-section">

          {!editMode ? (
            <>
              <h1 className="detail-title">{product.name}</h1>
              <p className="detail-category">{product.category}</p>
              <div className="detail-price">₹{product.price}</div>
              <div className="detail-stock">
                {product.quantity > 0 ? (
                  <span className="in-stock">
                    In Stock ({product.quantity})
                  </span>
                ) : (
                  <span className="out-stock">
                    Out of Stock
                  </span>
                )}


              </div>

              <div className="detail-actions">
                {isFarmer() && (
  <>
    <button onClick={() => setEditMode(true)}>✏ Edit</button>
    <button onClick={handleDelete}>🗑 Delete</button>
  </>
)}

{isConsumer() && (
  <button className="buy-btn">
    🛒 Buy Now
  </button>
)}

                <button
                  className="back-btn"
                  onClick={() => navigate("/products")}
                >
                  ← Back
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Edit Product</h2>

              <input
                type="text"
                value={form.name || ""}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Product Name"
              />

              <input
                type="text"
                value={form.category || ""}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                placeholder="Category"
              />

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

              <div className="detail-actions">
                <button
                  className="save-btn"
                  onClick={handleUpdate}
                >
                  💾 Save
                </button>

                <button
                  className="cancel-btn"
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
  );
}

export default ProductDetail;