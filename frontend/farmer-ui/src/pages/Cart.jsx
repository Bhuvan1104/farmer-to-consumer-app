import { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/Cart.css";

function Cart() {
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("COD");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await API.get("orders/cart/");
      setCart(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkout = async () => {
  try {
    await API.post("orders/checkout/", {
      payment_method: payment,
    });

    alert("Order placed successfully!");
    fetchCart();

    // 🔥 Update cart badge
    window.dispatchEvent(new Event("cartUpdated"));

  } catch (err) {
    console.error(err);
  }
};

  const removeItem = async (id) => {
  try {
    await API.delete(`orders/cart/remove/${id}/`);

    fetchCart();

    // 🔥 Trigger update event
    window.dispatchEvent(new Event("cartUpdated"));

  } catch (err) {
    console.error(err);
  }
};

  const total = cart.reduce(
    (sum, item) => sum + Number(item.product_price) * item.quantity,
    0
  );

  if (loading) return <div className="cart-loading">Loading Cart...</div>;

  return (
    <div className="cart-page">
      <h2 className="cart-title">🛒 Your Shopping Cart</h2>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <h3>Your cart is empty</h3>
          <p>Add products to see them here.</p>
        </div>
      ) : (
        <div className="cart-container">
          
          {/* LEFT - CART ITEMS */}
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.id} className="cart-item-card">
  <div className="cart-item-info">
    <h4>{item.product_name}</h4>
    <p>
      ₹{item.product_price} × {item.quantity}
    </p>
  </div>

  <div className="cart-actions">
    <div className="cart-item-total">
      ₹{Number(item.product_price) * item.quantity}
    </div>

    <button
      className="remove-btn"
      onClick={() => removeItem(item.id)}
    >
      Remove
    </button>
  </div>
</div>
            ))}
          </div>

          {/* RIGHT - SUMMARY */}
          <div className="cart-summary">
            <h3>Order Summary</h3>

            <div className="summary-row">
              <span>Items Total</span>
              <span>₹{total}</span>
            </div>

            <div className="summary-row">
              <span>Shipping</span>
              <span>₹50</span>
            </div>

            <div className="summary-total">
              <span>Total Payable</span>
              <span>₹{total + 50}</span>
            </div>

            <div className="payment-section">
              <label>Select Payment Method</label>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              >
                <option value="COD">Cash on Delivery</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            <button className="checkout-btn" onClick={checkout}>
              Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;