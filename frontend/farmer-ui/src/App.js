import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import FloatingChat from "./components/FloatingChat";
import AddProduct from "./pages/AddProduct";
import Cart from "./pages/Cart";
import Chatbot from "./pages/Chatbot";
import ChatHistory from "./pages/ChatHistory";
import Dashboard from "./pages/Dashboard";
import Delivery from "./pages/Delivery";
import FarmerOrders from "./pages/FarmerOrders";
import Home from "./pages/Home";
import Login from "./pages/Login";
import OrderDetail from "./pages/OrderDetail";
import Orders from "./pages/Orders";
import Pricing from "./pages/Pricing";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";

function AppWrapper() {
  const location = useLocation();
  const hideNavbar = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="app-container">
      {!hideNavbar && <Navbar />}
      <main className="route-stage" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/farmer-orders" element={<ProtectedRoute allowedRoles={["farmer"]}><FarmerOrders /></ProtectedRoute>} />
          <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/add-product" element={<ProtectedRoute allowedRoles={["farmer"]}><AddProduct /></ProtectedRoute>} />
          <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
          <Route path="/chat-history" element={<ProtectedRoute allowedRoles={["consumer", "farmer"]}><ChatHistory /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute allowedRoles={["farmer"]}><Pricing /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute allowedRoles={["farmer"]}><Delivery /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute allowedRoles={["consumer"]}><Orders /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute allowedRoles={["consumer"]}><OrderDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </main>
      <FloatingChat />
    </div>
  );
}

function App() {
  useEffect(() => {
    try {
      const legacy = localStorage.getItem("token");
      if (legacy && !localStorage.getItem("access_token")) {
        localStorage.setItem("access_token", legacy);
        localStorage.removeItem("token");
      }
    } catch (e) {
      console.warn("Storage migration error:", e);
    }
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AppWrapper />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
