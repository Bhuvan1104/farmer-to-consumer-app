import { useEffect, useRef, useState } from "react";

import MapAddressPicker from "../components/MapAddressPicker";
import { useLanguage } from "../context/LanguageContext";
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
  const { language } = useLanguage();
  const te = language === "te";

  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("COD");
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState(null);
  const paymentBannerTimerRef = useRef(null);
  const isDevHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const strictDigitalMode = process.env.REACT_APP_STRICT_DIGITAL_PAYMENT === "1";

  useEffect(() => {
    fetchCart();
    fetchAddresses();
  }, []);

  useEffect(() => {
    return () => {
      if (paymentBannerTimerRef.current) {
        clearTimeout(paymentBannerTimerRef.current);
      }
    };
  }, []);

  const showPaymentBanner = (type, message, persist = false) => {
    setPaymentBanner({ type, message });
    if (paymentBannerTimerRef.current) {
      clearTimeout(paymentBannerTimerRef.current);
    }
    if (!persist) {
      paymentBannerTimerRef.current = setTimeout(() => setPaymentBanner(null), 5000);
    }
  };

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
      alert(te ? "దయచేసి డెలివరీ చిరునామా వివరాలు పూర్తి చేయండి" : "Please complete the delivery address fields");
      return;
    }

    try {
      const res = await API.post("users/addresses/", {
        label: addressForm.label || addressForm.recipientName || (te ? "డెలివరీ చిరునామా" : "Delivery Address"),
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
      alert(te ? "చిరునామా సేవ్ చేయడం విఫలమైంది" : "Failed to save address");
    }
  };

  const handlePlaceOrder = () => {
    if (!payment) {
      alert(te ? "దయచేసి చెల్లింపు విధానాన్ని ఎంచుకోండి" : "Please select payment method");
      return;
    }
    setShowAddressModal(true);
  };

  const placeOrder = async (paymentMeta = {}) => {
    if (!selectedAddressId) {
      alert(te ? "దయచేసి డెలివరీ చిరునామా ఎంచుకోండి" : "Please select delivery address");
      return;
    }

    try {
      await API.post("orders/checkout/", {
        payment_method: payment,
        address_id: selectedAddressId,
        ...paymentMeta,
      });
      showPaymentBanner("success", te ? "ఆర్డర్ విజయవంతంగా పెట్టబడింది." : "Order placed successfully.");
      setShowAddressModal(false);
      fetchCart();
      window.dispatchEvent(new Event("cartUpdated"));
      window.location.href = "/orders";
    } catch (err) {
      console.error(err);
      showPaymentBanner("error", err?.response?.data?.error || (te ? "ఆర్డర్ పెట్టడం విఫలమైంది." : "Failed to place order."), true);
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleDigitalPayment = async () => {
    if (!selectedAddressId) {
      alert(te ? "దయచేసి డెలివరీ చిరునామా ఎంచుకోండి" : "Please select delivery address");
      return;
    }

    setProcessingPayment(true);
    const amount = Math.round((total + 50) * 100); // paise
    const runLocalSimulation = async () => {
      showPaymentBanner(
        "info",
        `Running local ${payment} payment simulation in development mode...`
      );
      await new Promise((resolve) => setTimeout(resolve, 700));
      const simulatedOrderId = `sim_order_${Date.now()}`;
      const simulatedPaymentId = `sim_pay_${Date.now()}`;
      setProcessingPayment(false);
      await placeOrder({
        razorpay_order_id: simulatedOrderId,
        razorpay_payment_id: simulatedPaymentId,
      });
    };

    if (isDevHost && !strictDigitalMode) {
      await runLocalSimulation();
      return;
    }

    try {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setProcessingPayment(false);
        if (!strictDigitalMode) {
          setProcessingPayment(true);
          showPaymentBanner("warning", "Payment gateway unavailable. Falling back to test simulation.");
          await runLocalSimulation();
          return;
        }
        showPaymentBanner("error", "Payment gateway could not be loaded.", true);
        return;
      }

      const paymentOrderRes = await API.post("orders/payments/create-order/", {
        amount,
        currency: "INR",
        payment_mode: payment,
      });
      const { key, order_id: orderId, amount: gatewayAmount, currency } = paymentOrderRes.data || {};

      if (!key || !orderId) {
        setProcessingPayment(false);
        if (!strictDigitalMode) {
          setProcessingPayment(true);
          showPaymentBanner("warning", "Payment gateway init failed. Falling back to test simulation.");
          await runLocalSimulation();
          return;
        }
        showPaymentBanner("error", "Unable to initialize payment gateway.", true);
        return;
      }

      const options = {
        key,
        amount: gatewayAmount || amount,
        currency: currency || "INR",
        name: "FarmDirect",
        description: `Order payment via ${payment}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            await API.post("orders/payments/verify/", {
              razorpay_order_id: response?.razorpay_order_id,
              razorpay_payment_id: response?.razorpay_payment_id,
              razorpay_signature: response?.razorpay_signature,
            });
            setProcessingPayment(false);
            await placeOrder({
              razorpay_order_id: response?.razorpay_order_id,
              razorpay_payment_id: response?.razorpay_payment_id,
            });
          } catch (verifyErr) {
            console.error("Payment verification failed:", verifyErr);
            setProcessingPayment(false);
            showPaymentBanner(
              "error",
              verifyErr?.response?.data?.error || "Payment verification failed. Please try again.",
              true
            );
          }
        },
        retry: {
          enabled: true,
          max_count: 2,
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
            showPaymentBanner("warning", "Payment popup closed. Order not placed.");
          },
        },
        notes: {
          payment_mode: payment,
        },
        theme: {
          color: "#1f8b46",
        },
      };

      const rz = new window.Razorpay(options);
      rz.on("payment.failed", async (response) => {
        console.error("Razorpay payment failed:", response?.error);
        setProcessingPayment(false);
        const reason = response?.error?.description || "Payment failed. Please try again.";
        showPaymentBanner("error", reason, true);
      });
      rz.open();
    } catch (err) {
      console.error(err);
      setProcessingPayment(false);
      const backendError = String(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          ""
      );
      const shouldAutoSimulate = !strictDigitalMode;
      if (shouldAutoSimulate) {
        setProcessingPayment(true);
        showPaymentBanner(
          "warning",
          `Payment gateway unavailable${backendError ? `: ${backendError}` : ""}. Using local test simulation.`
        );
        await runLocalSimulation();
        return;
      }

      showPaymentBanner(
        "error",
        backendError || "Unable to open payment gateway. Please try again.",
        true
      );
    }
  };

  const handleConfirmOrder = async () => {
    if (payment === "COD") {
      await placeOrder();
      return;
    }
    await handleDigitalPayment();
  };

  const total = cart.reduce((sum, item) => sum + Number(item.product_price) * item.quantity, 0);
  if (loading) return <div className="cart-loading">{te ? "కార్ట్ లోడ్ అవుతోంది..." : "Loading Cart..."}</div>;

  return (
    <div className="cart-page">
      <h2 className="cart-title">{te ? "మీ షాపింగ్ కార్ట్" : "Your Shopping Cart"}</h2>
      {paymentBanner ? (
        <div className={`payment-banner payment-banner-${paymentBanner.type}`}>
          {paymentBanner.message}
        </div>
      ) : null}

      {cart.length === 0 ? (
        <div className="empty-cart">
          <h3>{te ? "మీ కార్ట్ ఖాళీగా ఉంది" : "Your cart is empty"}</h3>
          <p>{te ? "ఇక్కడ చూడడానికి ఉత్పత్తులను జోడించండి." : "Add products to see them here."}</p>
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
                  <button className="remove-btn" onClick={() => removeItem(item.id)}>{te ? "తొలగించు" : "Remove"}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>{te ? "ఆర్డర్ సారాంశం" : "Order Summary"}</h3>
            <div className="summary-row"><span>{te ? "వస్తువుల మొత్తం" : "Items Total"}</span><span>Rs.{total}</span></div>
            <div className="summary-row"><span>{te ? "షిప్పింగ్" : "Shipping"}</span><span>Rs.50</span></div>
            <div className="summary-total"><span>{te ? "చెల్లించవలసిన మొత్తం" : "Total Payable"}</span><span>Rs.{total + 50}</span></div>

            <div className="payment-section">
              <label>{te ? "చెల్లింపు విధానాన్ని ఎంచుకోండి" : "Select Payment Method"}</label>
              <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="COD">{te ? "డెలివరీ వద్ద నగదు" : "Cash on Delivery"}</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            <button className="checkout-btn" onClick={handlePlaceOrder}>{te ? "ఆర్డర్ పెట్టండి" : "Place Order"}</button>
          </div>
        </div>
      )}

      {showAddressModal && (
        <div className="address-overlay">
          <div className="address-modal address-modal-xl polished">
            <div className="address-header">
              <h2>{te ? "డెలివరీ చిరునామా ఎంచుకోండి" : "Select Delivery Address"}</h2>
              <p>{te ? "సేవ్ చేసిన చిరునామా ఎంచుకోండి లేదా కొత్త చిరునామా జోడించండి." : "Choose a saved address or add a new one using the structured form, map search, dropped pin, or current location."}</p>
            </div>

            <div className="address-modal-body">
              <div className="address-list-section">
                <h3>{te ? "సేవ్ చేసిన చిరునామాలు" : "Saved Addresses"}</h3>
                <div className="address-list styled-list">
                  {addresses.length === 0 && <div className="no-address">{te ? "ఇంకా సేవ్ చేసిన చిరునామాలు లేవు. దిగువ జోడించండి." : "No saved addresses yet. Add one below."}</div>}
                  {addresses.map((addr) => (
                    <label key={addr.id} className={`address-card ${selectedAddressId === addr.id ? "active" : ""}`}>
                      <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} />
                      <div className="address-details">
                        <div className="address-line"><strong>{addr.label || (te ? "డెలివరీ చిరునామా" : "Delivery Address")}</strong></div>
                        <div className="address-line">{addr.cleaned_preview || addr.normalized_address || addr.address}</div>
                        <div className="address-meta-row">
                          {addr.phone_number ? <span>{te ? "ఫోన్" : "Phone"}: {addr.phone_number}</span> : null}
                          {addr.latitude && addr.longitude ? <span>{te ? "కోఆర్డినేట్లు సేవ్ అయ్యాయి" : "Coordinates saved"}</span> : <span>{te ? "చిరునామా మాత్రమే" : "Address only"}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="address-form-section">
                <div className="structured-address-form polished-form">
                  <div className="section-head-row">
                    <h3>{te ? "కొత్త చిరునామా జోడించండి" : "Add New Address"}</h3>
                    <button type="button" className="map-pick-btn" onClick={() => setShowMapPicker(true)}>{te ? "మ్యాప్ నుంచి ఎంచుకోండి" : "Pick From Map"}</button>
                  </div>
                  <div className="structured-grid">
                    <input type="text" placeholder={te ? "చిరునామా లేబుల్ (ఇల్లు, షాప్...)" : "Address label (Home, Shop, etc.)"} value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} />
                    <input type="text" placeholder={te ? "స్వీకర్త పేరు" : "Recipient name"} value={addressForm.recipientName} onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })} />
                    <input type="text" placeholder={te ? "ఫోన్ నంబర్" : "Phone number"} value={addressForm.phoneNumber} onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })} />
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

                  <button className="save-address-btn" onClick={addAddress}>{te ? "చిరునామా సేవ్ చేయండి" : "Save Address"}</button>
                </div>
              </div>
            </div>

            <div className="address-actions sticky-actions">
              <button className="cancel-btn" onClick={() => setShowAddressModal(false)}>{te ? "రద్దు" : "Cancel"}</button>
              <button
                className="confirm-btn"
                onClick={handleConfirmOrder}
                disabled={!selectedAddressId || processingPayment}
              >
                {processingPayment
                  ? (te ? "చెల్లింపు తెరవబడుతోంది..." : "Opening Payment...")
                  : payment === "COD"
                    ? (te ? "ఆర్డర్ ధృవీకరించండి" : "Confirm Order")
                    : (te ? `${payment} చెల్లింపుకు కొనసాగండి` : `Proceed to ${payment} Payment`)}
              </button>
            </div>
          </div>
        </div>
      )}

      <MapAddressPicker
        open={showMapPicker}
        title={te ? "మ్యాప్ నుండి డెలివరీ చిరునామా ఎంచుకోండి" : "Pick Delivery Address From Map"}
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

