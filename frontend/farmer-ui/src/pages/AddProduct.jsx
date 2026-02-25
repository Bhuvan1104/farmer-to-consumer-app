import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/AddProduct.css";

function AddProduct() {
  const [product, setProduct] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
  });
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const addProduct = async () => {
  try {
    console.log('AddProduct: submit clicked');
    setError("");
    setSuccess("");
    setLoading(true);

   if (
  !product.name ||
  !product.category ||
  !product.price ||
  !product.quantity
) {
  setError("All fields are required");
  return;
}

    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("category", product.category);
    formData.append("price", parseFloat(product.price));
    formData.append("quantity", parseInt(product.quantity));
    if (image) {
      formData.append("image", image);
    }

    const res = await API.post("products/", formData);
    console.log('AddProduct: response', res);
    setSuccess("Product added successfully! Redirecting...");
    setTimeout(() => navigate("/products"), 2000);

  } catch (err) {
    console.error("AddProduct error:", err);
    const errors = err.response?.data;
    if (typeof errors === "object") {
      const errorMessages = Object.values(errors)
        .flat()
        .join(", ");
      setError(errorMessages);
    } else {
      setError(err.response?.data?.detail || err.message || "Failed to add product");
    }
  }
  
  // ensure loading state cleared
  finally {
    setLoading(false);
  }
};

  return (
    <div className="add-product-container">
      <div className="add-product-header">
        <h1>➕ Add Product</h1>
        <button
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>
      </div>

      <div className="add-product-content">
        <div className="add-product-form">
          <h2>Add a New Product</h2>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label>Product Name</label>
            <input
              type="text"
              placeholder="Enter product name (e.g., Organic Tomatoes)"
              value={product.name}
              onChange={(e) =>
                setProduct({ ...product, name: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={product.category}
                onChange={(e) =>
                  setProduct({ ...product, category: e.target.value })
                }
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

            <div className="form-group">
              <label>Price (₹)</label>
              <input
                type="number"
                placeholder="Price per unit"
                step="0.01"
                min="0"
                value={product.price}
                onChange={(e) =>
                  setProduct({ ...product, price: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Quantity (in kg/units)</label>
            <input
              type="number"
              placeholder="Available quantity"
              min="0"
              value={product.quantity}
              onChange={(e) =>
                setProduct({ ...product, quantity: e.target.value })
              }
            />
          </div>
          <div className="form-group">
  <label>Product Image</label>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => setImage(e.target.files[0])}
  />
</div>

          <button className="submit-button" onClick={addProduct} disabled={loading}>
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddProduct;