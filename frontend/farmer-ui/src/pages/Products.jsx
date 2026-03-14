import { useEffect, useMemo, useState } from "react";
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
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await API.delete(`products/${id}/`);
      setProducts((prev) => prev.filter((product) => product.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete product.");
    }
  };

  const categoryIcons = {
    vegetables: "Harvest",
    fruits: "Fruit",
    dairy: "Dairy",
    meats: "Protein",
    herbs: "Leaf",
    berries: "Berry",
  };

  const inventoryStats = useMemo(() => ({
    total: products.length,
    available: products.filter((p) => Number(p.quantity) > 0).length,
    lowStock: products.filter((p) => Number(p.quantity) > 0 && Number(p.quantity) <= 5).length,
  }), [products]);

  if (loading) {
    return <div className="products-page"><div className="products-container"><p className="loading-text">Loading products...</p></div></div>;
  }

  return (
    <div className="products-page refined-products">
      <div className="products-container">
        <div className="products-hero">
          <div>
            <span className="products-eyebrow">Inventory Hub</span>
            <h1>Product Inventory</h1>
            <p>Manage listings, monitor stock levels, and keep the marketplace shelf polished and ready for buyers.</p>
          </div>
          {isFarmer() && <button className="btn-primary hero-add" onClick={() => navigate("/add-product")}>Add Product</button>}
        </div>

        <div className="products-stats-row">
          <div className="product-stat-card"><span>Total Listings</span><strong>{inventoryStats.total}</strong></div>
          <div className="product-stat-card"><span>Available</span><strong>{inventoryStats.available}</strong></div>
          <div className="product-stat-card warning"><span>Low Stock</span><strong>{inventoryStats.lowStock}</strong></div>
        </div>

        <div className="products-grid refined-grid">
          {products.map((product, index) => {
            const icon = categoryIcons[product.category?.toLowerCase()] || "Produce";
            const inStock = Number(product.quantity) > 0;
            return (
              <div key={product.id} className="product-card refined-card" style={{ animationDelay: `${index * 60}ms` }} onClick={() => navigate(`/products/${product.id}`)}>
                <div className="product-image-wrapper cinematic">
                  {product.image ? <img src={product.image} alt={product.name} /> : <div className="product-icon">{icon}</div>}
                  <div className={`stock-ribbon ${inStock ? "in-stock" : "out-stock"}`}>{inStock ? "Ready to sell" : "Out of stock"}</div>
                </div>

                <div className="product-content">
                  <div className="product-head-row">
                    <h3>{product.name}</h3>
                    <span className="category-badge">{product.category}</span>
                  </div>
                  <div className="product-meta-grid">
                    <div><span>Price</span><strong>Rs.{product.price}</strong></div>
                    <div><span>Units</span><strong>{product.quantity}</strong></div>
                  </div>

                  <div className="product-footer">
                    <div className={`stock-inline ${inStock ? "in-stock" : "out-stock"}`}>{inStock ? `In Stock (${product.quantity})` : "Out of Stock"}</div>
                  </div>

                  {isFarmer() && (
                    <button className="btn-danger small" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}>
                      Delete Listing
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
