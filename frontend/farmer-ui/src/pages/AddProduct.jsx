import { useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";

function AddProduct() {

  const [product, setProduct] = useState({
    name:"",
    category:"",
    price:"",
    quantity:""
  });

  const addProduct = async () => {
    await API.post("products/", product);
    alert("Product Added");
  };

  return (
    <div>
      <Navbar />
      <h2>Add Product</h2>

      <input placeholder="Name"
        onChange={(e)=>setProduct({...product,name:e.target.value})} />

      <input placeholder="Category"
        onChange={(e)=>setProduct({...product,category:e.target.value})} />

      <input placeholder="Price"
        onChange={(e)=>setProduct({...product,price:e.target.value})} />

      <input placeholder="Quantity"
        onChange={(e)=>setProduct({...product,quantity:e.target.value})} />

      <button onClick={addProduct}>Add</button>
    </div>
  );
}

export default AddProduct;