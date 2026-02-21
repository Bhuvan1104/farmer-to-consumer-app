import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";

function Products() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    API.get("products/")
      .then(res => setProducts(res.data));
  }, []);

  return (
    <div>
      <Navbar />
      <h2>Products</h2>

      {products.map(p => (
        <div key={p.id}>
          <h3>{p.name}</h3>
          <p>Price: ₹{p.price}</p>
          <p>Quantity: {p.quantity}</p>
        </div>
      ))}
    </div>
  );
}

export default Products;