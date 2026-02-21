import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link> | 
      <Link to="/products">Products</Link> | 
      <Link to="/add-product">Add Product</Link>
    </nav>
  );
}

export default Navbar;