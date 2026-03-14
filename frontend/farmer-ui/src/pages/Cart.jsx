import { useEffect, useState } from "react";

import MapAddressPicker from "../components/MapAddressPicker";
import API from "../services/api";
import "../styles/Cart.css";

const EMPTY_ADDRESS_FORM = {
  label: "",
  recipientName: "",
  phoneNumber: "",
  houseNumber: "",
  area: "",
  landmark: "",
  city: "",
  state: "Telangana",
  pincode: "",
  country: "India",
  latitude: null,
  longitude: null,
};

const buildStructuredAddress = (form) => {
  const parts = [
    form.recipientName,
    form.phoneNumber,
    form.houseNumber,
    form.area,
    form.landmark ? `near ${form.landmark}` : "",
    form.city,
    form.state,
    form.pincode,
    form.country,
  ];
  return parts.map((value) => String(value || "").trim()).filter(Boolean).join(", ");
};

const buildFormFromMapResult = (result, currentForm) => {
  const components = result?.components || {};
  const areaParts = [components.road, components.suburb].filter(Boolean).join(", ");
  return {
    ...currentForm,
    houseNumber: components.house_number || currentForm.houseNumber,
    area: areaParts || result?.display_name || currentForm.area,
    city: components.city || currentForm.city,
    state: components.state || currentForm.state,
    pincode: components.postcode || currentForm.pincode,
    country: components.country || currentForm.country,
    latitude: result?.latitude ?? currentForm.latitude,
    longitude: result?.longitude ?? currentForm.longitude,
  };
};

function Cart() {
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("COD");
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    fetchCart();
    fetchAddresses();
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

  const fetchAddresses = async () => {
    try {
      const res = await API.get("users/addresses/");
      const addressList = Array.isArray(res.data) ? res.data : [];
      setAddresses(addressList);
      if (addressList.length > 0) setSelectedAddressId(addressList[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (id) => {
    try {
      await API.delete(`orders/cart/remove/${id}/`);
      fetchCart();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error(err);
    }
  };

  const addAddress = async () => {
    const finalAddress = buildStructuredAddress(addressForm);
    if (!finalAddress) {
      alert("Please complete the delivery address fields");
      return;
    }

    try {
      const res = await API.post("users/addresses/", {
        label: addressForm.label || addressForm.recipientName || "Delivery Address",
        address: finalAddress,
        latitude: addressForm.latitude,
        longitude: addressForm.longitude,
      });
      const saved = res.data;
      setAddresses([saved, ...addresses]);
      setSelectedAddressId(saved.id);
      setAddressForm(EMPTY_ADDRESS_FORM);
    } catch (err) {
      console.error(err);
      alert("Failed to save address");
    }
  };

  const handlePlaceOrder = () => {
    if (!payment) {
      alert("Please select payment method");
      return;
    }
    setShowAddressModal(true);
  };

  const checkout = async () => {
    if (!selectedAddressId) {
      alert("Please select delivery address");
      return;
    }

    try {
      await API.post("orders/checkout/", { payment_method: payment, address_id: selectedAddressId });
      alert("Order placed successfully!");
      setShowAddressModal(false);
      fetchCart();
      window.dispatchEvent(new Event("cartUpdated"));
      window.location.href = "/orders";
    } catch (err) {
      console.error(err);
      alert("Failed to place order");
    }
  };

  const total = cart.reduce((sum, item) => sum + Number(item.product_price) * item.quantity, 0);
  if (loading) return <div className="cart-loading">Loading Cart...</div>;

  return (
    <div className="cart-page">
      <h2 className="cart-title">Your Shopping Cart</h2>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <h3>Your cart is empty</h3>
          <p>Add products to see them here.</p>
        </div>
      ) : (
        <div className="cart-container">
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.id} className="cart-item-card">
                <div className="cart-item-info">
                  <h4>{item.product_name}</h4>
                  <p>Rs.{item.product_price} x {item.quantity}</p>
                </div>
                <div className="cart-actions">
                  <div className="cart-item-total">Rs.{Number(item.product_price) * item.quantity}</div>
                  <button className="remove-btn" onClick={() => removeItem(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-row"><span>Items Total</span><span>Rs.{total}</span></div>
            <div className="summary-row"><span>Shipping</span><span>Rs.50</span></div>
            <div className="summary-total"><span>Total Payable</span><span>Rs.{total + 50}</span></div>

            <div className="payment-section">
              <label>Select Payment Method</label>
              <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="COD">Cash on Delivery</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            <button className="checkout-btn" onClick={handlePlaceOrder}>Place Order</button>
          </div>
        </div>
      )}

      {showAddressModal && (
        <div className="address-overlay">
          <div className="address-modal address-modal-xl polished">
            <div className="address-header">
              <h2>Select Delivery Address</h2>
              <p>Choose a saved address or add a new one using the structured form, map search, dropped pin, or current location.</p>
            </div>

            <div className="address-modal-body">
              <div className="address-list-section">
                <h3>Saved Addresses</h3>
                <div className="address-list styled-list">
                  {addresses.length === 0 && <div className="no-address">No saved addresses yet. Add one below.</div>}
                  {addresses.map((addr) => (
                    <label key={addr.id} className={`address-card ${selectedAddressId === addr.id ? "active" : ""}`}>
                      <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} />
                      <div className="address-details">
                        <div className="address-line"><strong>{addr.label || "Delivery Address"}</strong></div>
                        <div className="address-line">{addr.cleaned_preview || addr.normalized_address || addr.address}</div>
                        <div className="address-meta-row">
                          {addr.phone_number ? <span>Phone: {addr.phone_number}</span> : null}
                          {addr.latitude && addr.longitude ? <span>Coordinates saved</span> : <span>Address only</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="address-form-section">
                <div className="structured-address-form polished-form">
                  <div className="section-head-row">
                    <h3>Add New Address</h3>
                    <button type="button" className="map-pick-btn" onClick={() => setShowMapPicker(true)}>Pick From Map</button>
                  </div>
                  <div className="structured-grid">
                    <input type="text" placeholder="Address label (Home, Shop, etc.)" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} />
                    <input type="text" placeholder="Recipient name" value={addressForm.recipientName} onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })} />
                    <input type="text" placeholder="Phone number" value={addressForm.phoneNumber} onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })} />
                    <input type="text" placeholder="House no / building" value={addressForm.houseNumber} onChange={(e) => setAddressForm({ ...addressForm, houseNumber: e.target.value })} />
                    <input type="text" placeholder="Area / locality" value={addressForm.area} onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })} />
                    <input type="text" placeholder="Landmark" value={addressForm.landmark} onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })} />
                    <input type="text" placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
                    <input type="text" placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
                    <input type="text" placeholder="Pincode" value={addressForm.pincode} onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })} />
                    <input type="text" placeholder="Country" value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} />
                  </div>

                  <div className="address-preview-box">
                    <span>Address Preview</span>
                    <strong>{buildStructuredAddress(addressForm) || "Complete the fields to preview the final delivery address."}</strong>
                    <div className="address-meta-row">
                      {addressForm.latitude && addressForm.longitude ? <span>Lat {Number(addressForm.latitude).toFixed(5)} | Lon {Number(addressForm.longitude).toFixed(5)}</span> : <span>No coordinates selected yet</span>}
                    </div>
                  </div>

                  <button className="save-address-btn" onClick={addAddress}>Save Address</button>
                </div>
              </div>
            </div>

            <div className="address-actions sticky-actions">
              <button className="cancel-btn" onClick={() => setShowAddressModal(false)}>Cancel</button>
              <button className="confirm-btn" onClick={checkout} disabled={!selectedAddressId}>Confirm Order</button>
            </div>
          </div>
        </div>
      )}

      <MapAddressPicker
        open={showMapPicker}
        title="Pick Delivery Address From Map"
        initialQuery={`${addressForm.area} ${addressForm.city} ${addressForm.pincode}`.trim()}
        onClose={() => setShowMapPicker(false)}
        onSelect={(result) => {
          setAddressForm((current) => buildFormFromMapResult(result, current));
          setShowMapPicker(false);
        }}
      />
    </div>
  );
}

export default Cart;

