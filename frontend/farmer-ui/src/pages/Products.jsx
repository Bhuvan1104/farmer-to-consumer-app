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
  <div className="products-page">
    <div className="products-container">

      <div className="products-header">
        <div>
          <h1>Product Inventory</h1>
          <p>Manage and monitor your marketplace products</p>
        </div>

        {isFarmer() && (
          <button
            className="btn-primary"
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
            <div
              key={product.id}
              className="product-card"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              <div className="product-image-wrapper">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                  />
                ) : (
                  <div className="product-icon">
                    {icon}
                  </div>
                )}
              </div>

              <div className="product-content">
                <h3>{product.name}</h3>
                <span className="category-badge">
                  {product.category}
                </span>

                <div className="product-footer">
                  <div className="price">
                    ₹{product.price}
                  </div>

                  <div
                    className={`stock ${
                      product.quantity > 0
                        ? "in-stock"
                        : "out-stock"
                    }`}
                  >
                    {product.quantity > 0
                      ? `In Stock (${product.quantity})`
                      : "Out of Stock"}
                  </div>
                </div>

                {isFarmer() && (
                  <button
                    className="btn-danger small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  </div>
);
}

export default Products;