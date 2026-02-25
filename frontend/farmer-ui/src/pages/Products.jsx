import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Products.css";
import { isFarmer } from "../utils/auth";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await API.get("products/");
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );
    if (!confirmDelete) return;

    try {
      await API.delete(`products/${id}/`);

      // Remove from UI without refetching
      setProducts((prev) =>
        prev.filter((product) => product.id !== id)
      );
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete product.");
    }
  };

  const categoryIcons = {
    vegetables: "🥬",
    fruits: "🍎",
    dairy: "🥛",
    meats: "🥩",
    herbs: "🌿",
    berries: "🫐",
  };

  if (loading) {
    return (
      <div className="products-wrapper">
        <p className="loading-text">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="products-wrapper">
      <div className="products-header">
        <div>
          <h1>📦 Products</h1>
          <p>Manage and monitor your product inventory</p>
        </div>

        {isFarmer() && (
  <button
    className="primary-button"
    onClick={() => navigate("/add-product")}
  >
    + Add Product
  </button>
)}
      </div>

      <div className="products-grid">
        {products.map((product) => {
          const icon =
            categoryIcons[product.category?.toLowerCase()] || "🌾";

          return (
            <div key={product.id} className="product-card">

              {/* IMAGE OR ICON */}
              <div className="product-thumbnail">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                  />
                ) : (
                  <div className="product-icon-fallback">
                    {icon}
                  </div>
                )}
              </div>

              <h3>{product.name}</h3>
              <p className="category">{product.category}</p>

              <div className="product-meta">
                <span>₹{product.price}</span>
                <span>Stock: {product.quantity}</span>
              </div>

              <div className="product-actions">

                <button
                  className="secondary-button"
                  onClick={() =>
                    navigate(`/products/${product.id}`)
                  }
                >
                  View
                </button>

               

                <button
                  className="delete-button"
                  onClick={() =>
                    handleDelete(product.id)
                  }
                >
                  🗑 Delete
                </button>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Products;