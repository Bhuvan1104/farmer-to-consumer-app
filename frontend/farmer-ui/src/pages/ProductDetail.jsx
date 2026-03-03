import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/ProductDetail.css";
import { isFarmer, isConsumer } from "../utils/auth";
import ReactMarkdown from "react-markdown";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const res = await API.get(`products/${id}/`);
      setProduct(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
  try {
    await API.post("orders/cart/add/", {
      product_id: product.id,
      quantity: quantity,
    });

    // 🔥 Trigger global cart update event
    window.dispatchEvent(new Event("cartUpdated"));

    alert("Added to Cart");
  } catch (err) {
    console.error(err);
  }
};

  const buyNow = async () => {
    try {
      await API.post("orders/cart/add/", {
        product_id: product.id,
        quantity: quantity,
      });
      navigate("/cart");
    } catch (err) {
      alert("Failed to proceed");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
  <div className="product-page">
    <div className="product-container">

      {/* LEFT - IMAGE */}
      <div className="product-image">
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <div className="image-placeholder">🌾</div>
        )}
      </div>

      {/* RIGHT - DETAILS */}
      <div className="product-details">

        <h1 className="product-title">{product.name}</h1>

        <div className="product-meta">
          <span className="category">{product.category}</span>
          <span className="price">₹{product.price}</span>
        </div>

        <div className="description">
          <ReactMarkdown>
            {product.description || "No description available."}
          </ReactMarkdown>
        </div>

        <div className="stock-info">
          {product.quantity > 0 ? (
            <span className="in-stock">
              ✔ In Stock ({product.quantity})
            </span>
          ) : (
            <span className="out-stock">
              ✖ Out of Stock
            </span>
          )}
        </div>

        {isConsumer() && product.quantity > 0 && (
          <>
            <div className="quantity-selector">
              <button
                onClick={() =>
                  setQuantity(Math.max(1, quantity - 1))
                }
              >
                -
              </button>

              <span>{quantity}</span>

              <button
                onClick={() =>
                  setQuantity(
                    Math.min(product.quantity, quantity + 1)
                  )
                }
              >
                +
              </button>
            </div>

            <div className="action-buttons">
              <button className="add-btn" onClick={addToCart}>
                🛒 Add to Cart
              </button>

              <button className="buy-btn" onClick={buyNow}>
                ⚡ Buy Now
              </button>
            </div>
          </>
        )}

        <button
          className="back-btn"
          onClick={() => navigate("/products")}
        >
          ← Back to Products
        </button>

      </div>
    </div>
  </div>
);
}

export default ProductDetail;