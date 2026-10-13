/* Offline fallback: same content as products.json and customers.json.
   Used only when fetch() is blocked (e.g. opening the page by double-click). */
window.KOZI_DATA = {
 "products": [
  {
   "id": "k1",
   "category": "Eyewear",
   "name": "Halo Flame",
   "price": 2490,
   "description": "Chrome sport wrap with a sapphire stud and flame-cut temples. UV400 mirror lens.",
   "stock": 24,
   "image": "assets/products/k1.jpg",
   "featured": true
  },
  {
   "id": "k2",
   "category": "Eyewear",
   "name": "Nightstar Wrap",
   "price": 2290,
   "description": "Matte black wrap frame with star-cast metal temples. Smoke lens, UV400.",
   "stock": 18,
   "image": "assets/products/k2.jpg",
   "featured": false
  },
  {
   "id": "k3",
   "category": "Eyewear",
   "name": "Thornwing",
   "price": 2790,
   "description": "Barbed mask frame in recycled alloy with a smoked lens. Hand polished.",
   "stock": 12,
   "image": "assets/products/k3.jpg",
   "featured": true
  },
  {
   "id": "k4",
   "category": "Eyewear",
   "name": "Venom Lattice",
   "price": 3190,
   "description": "Oil-slick lattice visor band in purple-green metal. Limited to 200 pieces.",
   "stock": 8,
   "image": "assets/products/k4.jpg",
   "featured": false
  },
  {
   "id": "k5",
   "category": "Eyewear",
   "name": "Mirror Blade",
   "price": 1990,
   "description": "Single-lens chrome visor with a mirrored shield. Light, bold, everyday.",
   "stock": 30,
   "image": "assets/products/k5.jpg",
   "featured": false
  },
  {
   "id": "k6",
   "category": "Eyewear",
   "name": "Glacier Edge",
   "price": 2190,
   "description": "Rimless frame with iridescent prism lenses. Built to catch the light.",
   "stock": 15,
   "image": "assets/products/k6.jpg",
   "featured": false
  },
  {
   "id": "k7",
   "category": "Clothing",
   "name": "Spine Rider",
   "price": 7990,
   "description": "Leather jacket with a red rib-cage panel down the back. Boxy, lined, heavy.",
   "stock": 3,
   "image": "assets/products/k7.jpg",
   "featured": true
  },
  {
   "id": "k8",
   "category": "Clothing",
   "name": "Checkmate Crop",
   "price": 5490,
   "description": "Distressed red and cream checker work jacket, cropped and cut loose.",
   "stock": 9,
   "image": "assets/products/k8.jpg",
   "featured": false
  },
  {
   "id": "k9",
   "category": "Clothing",
   "name": "Red Line Tee",
   "price": 1890,
   "description": "240gsm heavyweight cotton tee with a harness-stripe panel across the chest.",
   "stock": 40,
   "image": "assets/products/k9.jpg",
   "featured": true
  },
  {
   "id": "k10",
   "category": "Clothing",
   "name": "Slipstream Baggy",
   "price": 3990,
   "description": "Baggy denim with raw-edge flame-cut appliqués. Washed indigo or raw black.",
   "stock": 14,
   "image": "assets/products/k10.jpg",
   "featured": false
  }
 ],
 "customers": [
  {
   "id": "c01",
   "name": "Bianca Dizon",
   "email": "bianca.dizon@example.com",
   "city": "Angeles City",
   "favorite": "Halo Flame",
   "orders": 3,
   "since": "2024-11",
   "tier": "Crew"
  },
  {
   "id": "c02",
   "name": "Marco Lacson",
   "email": "marco.lacson@example.com",
   "city": "San Fernando",
   "favorite": "Spine Rider",
   "orders": 2,
   "since": "2025-01",
   "tier": "Crew"
  },
  {
   "id": "c03",
   "name": "Trisha Manalo",
   "email": "trisha.manalo@example.com",
   "city": "Mabalacat",
   "favorite": "Mirror Blade",
   "orders": 4,
   "since": "2024-12",
   "tier": "Core"
  },
  {
   "id": "c04",
   "name": "Jerome Pineda",
   "email": "jerome.pineda@example.com",
   "city": "Clark Freeport",
   "favorite": "Slipstream Baggy",
   "orders": 1,
   "since": "2025-03",
   "tier": "Member"
  },
  {
   "id": "c05",
   "name": "Aira Gonzales",
   "email": "aira.gonzales@example.com",
   "city": "Quezon City",
   "favorite": "Glacier Edge",
   "orders": 2,
   "since": "2025-02",
   "tier": "Crew"
  },
  {
   "id": "c06",
   "name": "Paolo Santos",
   "email": "paolo.santos@example.com",
   "city": "Makati",
   "favorite": "Nightstar Wrap",
   "orders": 5,
   "since": "2024-10",
   "tier": "Core"
  },
  {
   "id": "c07",
   "name": "Kyla Reyes",
   "email": "kyla.reyes@example.com",
   "city": "Cebu City",
   "favorite": "Red Line Tee",
   "orders": 1,
   "since": "2025-06",
   "tier": "Member"
  },
  {
   "id": "c08",
   "name": "Dion Valdez",
   "email": "dion.valdez@example.com",
   "city": "Tarlac City",
   "favorite": "Thornwing",
   "orders": 3,
   "since": "2025-04",
   "tier": "Crew"
  }
 ]
};
