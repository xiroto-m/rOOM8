import { db } from "./src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

async function seedProducts() {
  const products = [
    {
      name: "rOOM8 Official T-Shirt",
      description: "High-quality heavy cotton tee with the official rOOM8 'passion' design. Limited edition.",
      price: 4500,
      currency: "JPY",
      imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
      status: "active",
      order: 1,
      createdAt: new Date().toISOString()
    },
    {
      name: "Original Art Print #001",
      description: "A3 size premium print of the main gallery visual. Signed by the artists.",
      price: 8000,
      currency: "JPY",
      imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop",
      status: "active",
      order: 2,
      createdAt: new Date().toISOString()
    }
  ];

  try {
    const productsRef = collection(db, "products");
    for (const product of products) {
      await addDoc(productsRef, {
        ...product,
        updatedAt: serverTimestamp()
      });
      console.log(`Added product: ${product.name}`);
    }
    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding products:", error);
  }
}

// Note: This script is intended to be run manually or triggered by the user.
// seedProducts();
