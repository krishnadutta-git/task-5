/* script.js - GlowCart (vanilla JS)
   Features:
   - product data with brand & product-type
   - filtering by brand, type, price, search, sort
   - cart saved to localStorage (add/remove/update)
   - lazy image loading via IntersectionObserver
   - simple routing (home / products / cart)
   - debounced search
*/

/* ======================
   Sample product dataset
   ====================== */
const PRODUCTS = [
  // The dataset includes diverse skin & hair care items across brands
  { id:101, name:"The Ordinary Hyaluronic Acid 2% + B5", brand:"The Ordinary", type:"Serum", price:699, img:"os.webp" },
  { id:102, name:"Aqualogica Radiance+ Sunscreen", brand:"Aqualogica", type:"Sunscreen", price:499, img:"ss.webp" },
  { id:103, name:"Mamaearth Vitamin C Serum", brand:"Mamaearth", type:"Serum", price:399, img:"c.avif" },
  { id:104, name:"Dot & Key Niacinamide Moisturizer", brand:"Dot & Key", type:"Moisturizer", price:549, img:"n.webp" },
  { id:105, name:"Foxtale Gentle Cleanser", brand:"Foxtale", type:"Cleanser", price:299, img:"ff.webp" },
  { id:106, name:"The Derma Co AHA Peel", brand:"The Derma Co", type:"Peel", price:799, img:"aha.jpeg" },
  { id:107, name:"WOW Skin Science Vitamin C Face Mask", brand:"WOW", type:"Mask", price:349, img:"vc.webp" },
  { id:108, name:"Aqualogica Cleanser", brand:"Aqualogica", type:"Cleanser", price:399, img:"fw.webp" },
  { id:201, name:"Mamaearth Onion Hair Oil", brand:"Mamaearth", type:"Hair Oil", price:499, img:"ho.jpg" },
  { id:202, name:"WOW Anti-Hairfall Shampoo", brand:"WOW", type:"Shampoo", price:299, img:"sh.jpg" },
  { id:203, name:"Foxtale Detan Mask", brand:"Foxtale", type:"Mask", price:349, img:"d.webp" },
  { id:204, name:"The Derma Co Shampoo", brand:"The Derma Co", type:"Shampoo", price:599, img:"hs.jpeg" },
  { id:205, name:"Loreal Hair Cream", brand:"Loreal", type:"Hair Cream", price:249, img:"hc.webp" },
  { id:206, name:"The Derma Co Hair Serum", brand:"The Derma Co", type:"Hair Serum", price:449, img:"hcs.avif" },
  // more items - repeat pattern for variety
  { id:301, name:"Brightening Face Mask", brand:"TATCHA", type:"Mask", price:299, img:"fm.avif" },
  { id:302, name:"Overnight Repair Oil", brand:"The Ordinary", type:"Hair Oil", price:799, img:"st.jpg" },
  { id:303, name:"Sunscreen Gel SPF 50", brand:"Mamaearth", type:"Sunscreen", price:349, img:"msc.avif" },
  { id:304, name:"Exfoliating Face Scrub", brand:"Dot & Key", type:"Scrub", price:399, img:"sc.webp" }
];

/* ===================================================
   Simple client-side routing (home, products, cart)
   =================================================== */
const ROUTES = ['home','products','cart'];
const nodes = {
  home: document.getElementById('page-home'),
  products: document.getElementById('page-products'),
  cart: document.getElementById('page-cart')
};
const navLinks = document.querySelectorAll('.nav-link');

function routeTo(name){
  ROUTES.forEach(r => nodes[r].classList.toggle('hidden', r !== name));
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.route === name));
  // update search focus if on products
  if(name === 'products') document.getElementById('filterBrand').focus();
}

/* init routing listeners */
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const route = a.dataset.route;
    routeTo(route);
  });
});
document.getElementById('shopNow').addEventListener('click', ()=> routeTo('products'));

/* ===========================
   DOM refs for products page
   =========================== */
const filterBrand = document.getElementById('filterBrand');
const filterType  = document.getElementById('filterType');
const sortBy      = document.getElementById('sortBy');
const priceRange  = document.getElementById('priceRange');
const priceLabel  = document.getElementById('priceLabel');
const clearBtn    = document.getElementById('clearFilters');
const productsList = document.getElementById('productsList');
const resultsCount = document.getElementById('resultsCount');
const noResults = document.getElementById('noResults');
const viewMode = document.getElementById('viewMode');

const spotlightRow = document.getElementById('spotlightRow');
const globalSearch = document.getElementById('globalSearch');
const openFilters = document.getElementById('openFilters');

const modalRoot = document.getElementById('modalRoot');

let APP_STATE = {
  brand: 'all',
  type: 'all',
  sort: 'featured',
  maxPrice: Number(priceRange.value),
  query: '',
  view: 'grid'
};

/* Cart state persisted in localStorage */
const CART_KEY = 'glowcart_cart_v1';
let CART = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

/* helper: save cart & update UI */
function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify(CART));
  updateCartCount();
  renderCart();
}

/* update cart count badge */
function updateCartCount(){
  const count = CART.reduce((s, p) => s + p.qty, 0);
  document.getElementById('cartCount').textContent = count;
}

/* ====== populate filters dynamically ====== */
function populateFilters(){
  const brands = Array.from(new Set(PRODUCTS.map(p => p.brand))).sort();
  const types  = Array.from(new Set(PRODUCTS.map(p => p.type))).sort();

  brands.forEach(b => {
    const opt = document.createElement('option'); opt.value = b; opt.textContent = b;
    filterBrand.appendChild(opt);
  });
  types.forEach(t => {
    const opt = document.createElement('option'); opt.value = t; opt.textContent = t;
    filterType.appendChild(opt);
  });
  // Spotlight (Home page) - show 4 random products
function renderSpotlight() {
  const row = document.getElementById("spotlightRow");
  row.innerHTML = "";

  // shuffle and take 4 random products
  const spotlightItems = [...PRODUCTS]
    .sort(() => 0.5 - Math.random())
    .slice(0, 4);

  spotlightItems.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}" class="product-img">
      <h3>${p.name}</h3>
      <p>${p.brand}</p>
      <p>₹${p.price}</p>
      <button onclick="addToCart(${p.id})">Add to Cart</button>
    `;
    row.appendChild(card);
  });
}

// Call both on load
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();   // Products page
  renderSpotlight();  // Home page
  renderCart();       // Cart page
  initSlider();       // Hero slider
});

  // spotlight: show first 4 products as trending
}

/* ====== event bindings ====== */
filterBrand.addEventListener('change', () => { APP_STATE.brand = filterBrand.value; renderProducts(); });
filterType.addEventListener('change', () => { APP_STATE.type = filterType.value; renderProducts(); });
sortBy.addEventListener('change', () => { APP_STATE.sort = sortBy.value; renderProducts(); });
priceRange.addEventListener('input', (e) => { APP_STATE.maxPrice = Number(e.target.value); priceLabel.textContent = `₹${APP_STATE.maxPrice}`; renderProducts(); });
clearBtn.addEventListener('click', () => { resetFilters(); renderProducts(); });
viewMode.addEventListener('change', () => {
  APP_STATE.view = viewMode.value;
  productsList.classList.toggle('products-listview', APP_STATE.view === 'list');
});

/* global search with debounce */
let searchTimer = null;
globalSearch.addEventListener('input', (e) => {
  APP_STATE.query = e.target.value.trim().toLowerCase();
  if(searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(()=> renderProducts(), 220);
});

/* open filter drawer on small screens (simple toggle) */
openFilters.addEventListener('click', () => {
  document.getElementById('filtersPanel').classList.toggle('open');
});

/* reset filters */
function resetFilters(){
  filterBrand.value = 'all'; filterType.value = 'all'; sortBy.value = 'featured'; priceRange.value = 5000;
  priceLabel.textContent = '₹5000';
  APP_STATE = {...APP_STATE, brand:'all', type:'all', sort:'featured', maxPrice:5000, query:''};
  globalSearch.value = '';
}

/* =================
   Render functions
   ================= */
function renderProducts(){
  // filter logic
  const q = APP_STATE.query;
  let list = PRODUCTS.filter(p => {
    if(p.price > APP_STATE.maxPrice) return false;
    if(APP_STATE.brand !== 'all' && p.brand !== APP_STATE.brand) return false;
    if(APP_STATE.type !== 'all' && p.type !== APP_STATE.type) return false;
    if(q && !(p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.type.toLowerCase().includes(q))) return false;
    return true;
  });

  // sort
  if(APP_STATE.sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
  else if(APP_STATE.sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
  else if(APP_STATE.sort === 'name') list.sort((a,b)=>a.name.localeCompare(b.name));

  // render
  productsList.innerHTML = '';
  resultsCount.textContent = list.length;
  if(list.length === 0){
    noResults.classList.remove('hidden');
    return;
  } else noResults.classList.add('hidden');

  const frag = document.createDocumentFragment();
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="media"><img data-src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div>
        <div class="product-title">${p.name}</div>
        <div class="product-meta">
          <div class="brand-pill">${p.brand}</div>
          <div class="price">₹${p.price}</div>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
          <button class="btn add-to-cart" data-id="${p.id}">Add to cart</button>
          <button class="btn-outline view-btn" data-id="${p.id}">View</button>
        </div>
      </div>
    `;
    // click listeners
    card.querySelector('.view-btn').addEventListener('click', ()=> openProductModal(p));
    card.querySelector('.add-to-cart').addEventListener('click', ()=> addToCart(p.id, 1));
    card.addEventListener('keypress', (e) => { if(e.key === 'Enter') openProductModal(p); });
    frag.appendChild(card);
  });
  productsList.appendChild(frag);
  lazyLoadImages();
}

/* lazy load using IntersectionObserver */
function lazyLoadImages(){
  const imgs = Array.from(document.querySelectorAll('img[data-src]'));
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          obs.unobserve(img);
        }
      });
    }, {rootMargin: '200px 0px', threshold: 0.01});
    imgs.forEach(i => io.observe(i));
  } else {
    imgs.forEach(i => { i.src = i.dataset.src; i.removeAttribute('data-src'); });
  }
}

/* ================
   Product Modal
   ================ */
function openProductModal(p){
  modalRoot.innerHTML = '';
  modalRoot.setAttribute('aria-hidden', 'false');

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.4);display:flex;align-items:center;justify-content:center;z-index:2000';
  overlay.tabIndex = -1;

  const card = document.createElement('div');
  card.className = 'card';
  card.style.maxWidth = '720px';
  card.style.width = '94%';
  card.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:0 0 260px"><img src="${p.img}" alt="${p.name}" style="width:100%;border-radius:8px" /></div>
      <div style="flex:1;min-width:200px">
        <h2 style="margin:0 0 8px">${p.name}</h2>
        <div class="muted" style="margin-bottom:8px">${p.brand} • ${p.type}</div>
        <div style="font-weight:700;font-size:18px;color:#0b7a6f;margin-bottom:8px">₹${p.price}</div>
        <p class="muted">This is our product. Just grab it!</p>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
          <button id="modalAdd" class="btn">Add to cart</button>
          <button id="modalClose" class="btn-outline">Close</button>
        </div>
      </div>
    </div>
  `;
  overlay.appendChild(card);
  modalRoot.appendChild(overlay);

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalAdd').addEventListener('click', ()=> { addToCart(p.id,1); closeModal(); });

  overlay.addEventListener('click', (e)=> { if(e.target === overlay) closeModal(); });
  function closeModal(){ modalRoot.innerHTML=''; modalRoot.setAttribute('aria-hidden','true'); }
}

/* ====================
   Cart operations
   ==================== */
function addToCart(productId, qty = 1){
  const product = PRODUCTS.find(p => p.id === productId);
  if(!product) return;
  const existing = CART.find(i => i.id === productId);
  if(existing){ existing.qty += qty; }
  else CART.push({ id: productId, qty });
  saveCart();
  // optional micro-feedback
  flashMessage(`${product.name} added to cart`);
}

function removeFromCart(productId){
  CART = CART.filter(i => i.id !== productId);
  saveCart();
}

function updateQty(productId, qty){
  CART = CART.map(i => i.id === productId ? {...i, qty: Math.max(1, qty)} : i);
  saveCart();
}

/* render cart area */
function renderCart(){
  const container = document.getElementById('cartContainer');
  container.innerHTML = '';
  if(!CART.length){ container.innerHTML = '<div class="muted">Your cart is empty. Add some glow ✨</div>'; document.getElementById('cartSummary').innerHTML=''; return; }

  const frag = document.createDocumentFragment();
  let subtotal = 0;
  CART.forEach(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if(!product) return;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${product.img}" alt="${product.name}">
      <div style="flex:1">
        <div style="font-weight:700">${product.name}</div>
        <div class="muted">${product.brand} • ${product.type}</div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
          <div class="qty-controls">
            <button class="btn-outline dec" data-id="${item.id}">-</button>
            <span style="padding:4px 8px">${item.qty}</span>
            <button class="btn-outline inc" data-id="${item.id}">+</button>
          </div>
          <button class="btn-outline remove" data-id="${item.id}">Remove</button>
        </div>
      </div>
      <div style="font-weight:700">₹${product.price * item.qty}</div>
    `;
    frag.appendChild(div);
    subtotal += product.price * item.qty;
  });
  container.appendChild(frag);

  // attach controls
  container.querySelectorAll('.inc').forEach(b => b.addEventListener('click', (e)=> {
    const id = Number(e.currentTarget.dataset.id);
    updateQty(id, (CART.find(i=>i.id===id).qty + 1)); }));
  container.querySelectorAll('.dec').forEach(b => b.addEventListener('click', (e)=> {
    const id = Number(e.currentTarget.dataset.id);
    updateQty(id, (CART.find(i=>i.id===id).qty - 1)); }));
  container.querySelectorAll('.remove').forEach(b => b.addEventListener('click', (e)=> {
    const id = Number(e.currentTarget.dataset.id);
    removeFromCart(id);
  }));

  // summary
  const summary = document.getElementById('cartSummary');
  summary.innerHTML = `<div><strong>Subtotal</strong></div><div style="font-weight:700">₹${subtotal}</div>
                       <div style="margin-top:12px"><button class="btn" id="checkoutBtn">Checkout (Demo)</button></div>`;
  document.getElementById('checkoutBtn').addEventListener('click', ()=> {
    alert('This is a demo checkout. Integrate a payment gateway for real checkout.');
    // clear cart for demo
    CART = []; saveCart();
  });
}

/* =================
   Small UI helpers
   ================= */
function flashMessage(text){
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;right:18px;bottom:18px;background:#0b7a6f;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 8px 20px rgba(11,122,111,0.12);z-index:3000';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity = '0', 1400);
  setTimeout(()=> el.remove(), 2000);
}

/* =================
   Initial render
   ================= */
(function init(){
  populateFilters();
  renderProducts();
  updateCartCount();
  renderCart();
  // route default
  routeTo('home');
})();
   

// Hero slider
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".hero-slider .slide");
  const prevBtn = document.querySelector(".hero-slider .prev");
  const nextBtn = document.querySelector(".hero-slider .next");
  const dotsContainer = document.querySelector(".hero-slider .dots");
  let index = 0;

  // Create dots
  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    if (i === 0) dot.classList.add("active");
    dotsContainer.appendChild(dot);
    dot.addEventListener("click", () => showSlide(i));
  });
  const dots = dotsContainer.querySelectorAll("button");

  function showSlide(i) {
    index = (i + slides.length) % slides.length;
    document.querySelector(".hero-slider .slides").style.transform =
      `translateX(${-index * 100}%)`;
    dots.forEach(dot => dot.classList.remove("active"));
    dots[index].classList.add("active");
  }

  prevBtn.addEventListener("click", () => showSlide(index - 1));
  nextBtn.addEventListener("click", () => showSlide(index + 1));

  // Auto play every 4s
  setInterval(() => showSlide(index + 1), 4000);
});
