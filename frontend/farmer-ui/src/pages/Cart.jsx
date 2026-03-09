import { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/Cart.css";

function Cart() {

  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("COD");
  const [loading, setLoading] = useState(true);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");

  const [newAddress, setNewAddress] = useState("");

  const [showAddressModal, setShowAddressModal] = useState(false);


  /* =========================
     LOAD CART
  ========================= */

  useEffect(() => {
    fetchCart();
    fetchAddresses();
  }, []);

  useEffect(()=>{
  if(addresses.length>0){
    setSelectedAddress(addresses[0].address)
  }
},[addresses])



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


  /* =========================
     LOAD ADDRESSES
  ========================= */

  const fetchAddresses = async () => {

    try {

      const res = await API.get("users/addresses/");

      setAddresses(res.data);

      if (res.data.length > 0) {
        setSelectedAddress(res.data[0].address);
      }

    } catch (err) {
      console.error(err);
    }
  };


  /* =========================
     REMOVE CART ITEM
  ========================= */

  const removeItem = async (id) => {

    try {

      await API.delete(`orders/cart/remove/${id}/`);

      fetchCart();

      window.dispatchEvent(new Event("cartUpdated"));

    } catch (err) {
      console.error(err);
    }
  };


  /* =========================
     ADD NEW ADDRESS
  ========================= */

  const addAddress = async () => {

    if (!newAddress.trim()) {
      alert("Please enter address");
      return;
    }

    try {

      const res = await API.post("users/addresses/", {
        address: newAddress
      });

      setAddresses([...addresses, res.data]);

      setSelectedAddress(res.data.address);

      setNewAddress("");

    } catch (err) {
      console.error(err);
    }
  };


  /* =========================
     PLACE ORDER BUTTON
  ========================= */

  const handlePlaceOrder = () => {

    if (!payment) {
      alert("Please select payment method");
      return;
    }

    setShowAddressModal(true);
  };


  /* =========================
     FINAL CHECKOUT
  ========================= */

const checkout = async () => {

  if (!selectedAddress) {
    alert("Please select delivery address");
    return;
  }

  try {

    await API.post("orders/checkout/", {
      payment_method: payment,
      address: selectedAddress
    });

    alert("Order placed successfully!");

    setShowAddressModal(false);

    fetchCart();

    window.dispatchEvent(new Event("cartUpdated"));

    // ✅ Redirect to Orders Page
    window.location.href = "/orders";

  } catch (err) {
    console.error(err);
    alert("Failed to place order");
  }
};


  /* =========================
     TOTAL PRICE
  ========================= */

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


          {/* =========================
              CART ITEMS
          ========================= */}

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


          {/* =========================
              ORDER SUMMARY
          ========================= */}

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


            {/* =========================
                PAYMENT METHOD
            ========================= */}

            <div className="payment-section">

              <label>Select Payment Method</label>

              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              >
                <option value="COD">💵 Cash on Delivery</option>
                <option value="UPI">📱 UPI</option>
                <option value="CARD">💳 Card</option>
              </select>

            </div>


            {/* =========================
                PLACE ORDER
            ========================= */}

            <button
              className="checkout-btn"
              onClick={handlePlaceOrder}
            >
              Place Order
            </button>

          </div>

        </div>

      )}


      {/* =========================
          ADDRESS MODAL
      ========================= */}

{showAddressModal && (

<div className="address-overlay">

  <div className="address-modal">

    <div className="address-header">
      <h2>📍 Select Delivery Address</h2>
      <p>Choose where your order should be delivered</p>
    </div>

    {/* SAVED ADDRESSES */}

    <div className="address-list">

      {addresses.length === 0 && (
        <div className="no-address">
          No saved addresses. Please add a new address.
        </div>
      )}

{addresses.map((addr, index) => (

<label
  key={index}
  className={`address-card ${
    selectedAddress === addr.address ? "active" : ""
  }`}
>

  <input
    type="radio"
    name="address"
    checked={selectedAddress === addr.address}
    onChange={() => setSelectedAddress(addr.address)}
  />

  <div className="address-details">

    <div className="address-line">
      {addr.address}
    </div>

  </div>

</label>

))}

    </div>


    {/* ADD NEW ADDRESS */}

    <div className="add-address">

      <textarea
        placeholder="Enter full delivery address with city and pincode..."
        value={newAddress}
        onChange={(e) => setNewAddress(e.target.value)}
      />

      <button
        className="save-address-btn"
        onClick={addAddress}
      >
        + Save Address
      </button>

    </div>


    {/* ACTION BUTTONS */}

    <div className="address-actions">

      <button
        className="cancel-btn"
        onClick={() => setShowAddressModal(false)}
      >
        Cancel
      </button>

      <button
        className="confirm-btn"
        onClick={checkout}
        disabled={!selectedAddress}
      >
        Confirm Order
      </button>

    </div>

  </div>

</div>

)}

    </div>
  );
}

export default Cart;