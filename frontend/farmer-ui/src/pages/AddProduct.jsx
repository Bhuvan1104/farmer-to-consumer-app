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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const addProduct = async () => {
    try {
      setError("");
      setSuccess("");

      if (!product.name || !product.category || !product.price || !product.quantity) {
        setError("All fields are required");
        return;
      }

      await API.post("products/", {
        ...product,
        price: parseFloat(product.price),
        quantity: parseInt(product.quantity),
      });

      setSuccess("Product added successfully! Redirecting...");
      setTimeout(() => navigate("/products"), 2000);
    } catch (err) {
      console.error("Error:", err.response?.data);
      const errors = err.response?.data;
      if (typeof errors === "object") {
        const errorMessages = Object.values(errors)
          .flat()
          .join(", ");
        setError(errorMessages);
      } else {
        setError(err.response?.data?.detail || "Failed to add product");
      }
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

          <button className="submit-button" onClick={addProduct}>
            Add Product
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddProduct;