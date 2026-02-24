import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link> | 
      <Link to="/products">Products</Link> | 
      <Link to="/add-product">Add Product</Link> | 
      <Link to="/pricing">Pricing</Link> | 
      <Link to="/delivery">Delivery</Link> | 
      <Link to="/orders">Orders</Link> | 
      <Link to="/chatbot">Chatbot</Link> | 
      <Link to="/chat-history">Chat History</Link> | 
      <Link to="/profile">Profile</Link>
    </nav>
  );
}

export default Navbar;