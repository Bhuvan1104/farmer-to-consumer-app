import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
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

    fetchProducts();
  }, []);

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>📦 Products</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      <div className="products-content">
        {loading ? (
          <div className="empty-message">
            <h3>Loading products...</h3>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-message">
            <h3>No products available</h3>
            <p>Start by adding a product!</p>
            <button
              className="add-product-btn"
              onClick={() => navigate("/add-product")}
            >
              Add First Product
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-image">🌾</div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-category">{product.category}</p>
                  <div className="product-details">
                    <div className="product-price">₹{product.price}</div>
                    <div className="product-quantity">
                      Qty: {product.quantity}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Products;