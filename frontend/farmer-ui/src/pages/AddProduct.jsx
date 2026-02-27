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

  /* -----------------------------
     Utility: Count plain text length
  ------------------------------*/
  const getPlainTextLength = (html) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent.length;
  };

  /* -----------------------------
     AI Generate Description
  ------------------------------*/
  const generateDescription = async () => {
    if (!product.name) {
      setError("Enter product name first");
      return;
    }

    try {
      setError("");

      const res = await API.post("products/generate-description/", {
        name: product.name,
        category: product.category
      });

      setProduct((prev) => ({
        ...prev,
        description: res.data.generated_description
      }));

    } catch (err) {
      setError("Failed to generate description");
    }
  };

  /* -----------------------------
     Add Product
  ------------------------------*/
  const addProduct = async () => {
    try {
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
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("category", product.category);
      formData.append("price", parseFloat(product.price));
      formData.append("quantity", parseInt(product.quantity));
      formData.append("description", product.description);

      if (image) {
        formData.append("image", image);
      }

      await API.post("products/", formData);

      setSuccess("Product added successfully! Redirecting...");
      setTimeout(() => navigate("/products"), 2000);

    } catch (err) {
  console.log("FULL BACKEND ERROR:", err.response?.data);
  console.log("STRING:", JSON.stringify(err.response?.data, null, 2));
  setError(JSON.stringify(err.response?.data));
}
finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     JSX
  ------------------------------*/
  return (
    <div className="add-page-container">
      <div className="add-card">

        <div className="add-header">
          <h1>Add New Product</h1>
          <button
            className="btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            ← Back
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        {/* Product Name */}
        <div className="form-group">
          <label>Product Name</label>
          <input
            type="text"
            placeholder="Organic Tomatoes"
            value={product.name}
            onChange={(e) =>
              setProduct({ ...product, name: e.target.value })
            }
          />
        </div>

        {/* Category + Price */}
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
              step="0.01"
              min="0"
              value={product.price}
              onChange={(e) =>
                setProduct({ ...product, price: e.target.value })
              }
            />
          </div>
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            min="0"
            value={product.quantity}
            onChange={(e) =>
              setProduct({ ...product, quantity: e.target.value })
            }
          />
        </div>

        {/* Description */}
        <div className="form-group">
  <label>Description (Max 200 characters)</label>

  <textarea
    maxLength={200}
    value={product.description}
    onChange={(e) =>
      setProduct({ ...product, description: e.target.value })
    }
    placeholder="Write a short product description..."
  />

  <div className="char-counter">
    {product.description.length}/200
  </div>

  <button
    type="button"
    className="ai-generate-btn"
    onClick={generateDescription}
  >
    ✨ Generate with AI
  </button>
</div>
        {/* Image Upload */}
        <div className="form-group">
          <label>Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
          />

          {image && (
            <div className="image-preview">
              <img
                src={URL.createObjectURL(image)}
                alt="preview"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          className="btn-primary full-width"
          onClick={addProduct}
          disabled={loading}
        >
          {loading ? "Adding Product..." : "Add Product"}
        </button>

      </div>
    </div>
  );
}

export default AddProduct;