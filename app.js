const products = [
  { id: 1, name: "The Sunday Shirt", category: "Clothing", price: 78, label: "Bestseller", image: "photo-1598033129183-c4f50c736f10" },
  { id: 2, name: "Everyday Knit", category: "Knitwear", price: 96, label: "New color", image: "photo-1576566588028-4147f3842f27" },
  { id: 3, name: "Easy Linen Trouser", category: "Clothing", price: 110, label: "", image: "photo-1594633312681-425c7b97ccd1" },
  { id: 4, name: "The Weekender", category: "Accessories", price: 64, label: "", image: "photo-1553062407-98eeb64c6a62" },
  { id: 5, name: "Soft Structure Tee", category: "Clothing", price: 48, label: "", image: "photo-1521572163474-6864f9cf17ab" },
  { id: 6, name: "Ribbed Layer", category: "Knitwear", price: 88, label: "Just in", image: "photo-1618354691373-d851c5c3a990" },
  { id: 7, name: "The Market Tote", category: "Accessories", price: 42, label: "", image: "photo-1544816155-12df9643f363" },
  { id: 8, name: "Relaxed Chino", category: "Clothing", price: 92, label: "", image: "photo-1473966968600-fa801b869a1a" },
];

const storage = {
  read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn(`Could not read ${key} from local storage.`, error);
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not save ${key} to local storage.`, error);
    }
  },
};

const state = {
  category: "All",
  query: "",
  sort: "featured",
  cart: storage.read("commonform-cart", []),
  favorites: storage.read("commonform-favorites", []),
  metrics: storage.read("commonform-experiment-metrics", {
    A: { views: 0, clicks: 0, conversions: 0 },
    B: { views: 0, clicks: 0, conversions: 0 },
  }),
  variant: "A",
};

const formatPrice = (price) => `$${price.toFixed(2)}`;
const imageUrl = (image, width = 720) =>
  `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=80`;
const productGrid = document.querySelector("#product-grid");
const toast = document.querySelector(".toast");
let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2500);
}

function saveMetrics() {
  storage.write("commonform-experiment-metrics", state.metrics);
  document.querySelectorAll("[data-metric]").forEach((element) => {
    const [, variant, metric] = element.dataset.metric.match(/^(views|clicks|conversions)-(A|B)$/);
    element.textContent = state.metrics[variant][metric];
  });
}

function recordMetric(metric) {
  state.metrics[state.variant][metric] += 1;
  saveMetrics();
}

function renderProducts() {
  let visibleProducts = products.filter((product) => {
    const matchesCategory = state.category === "All" || product.category === state.category;
    const matchesQuery = `${product.name} ${product.category}`.toLowerCase().includes(state.query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  if (state.sort === "price-low") visibleProducts = [...visibleProducts].sort((a, b) => a.price - b.price);
  if (state.sort === "price-high") visibleProducts = [...visibleProducts].sort((a, b) => b.price - a.price);
  if (state.sort === "name") visibleProducts = [...visibleProducts].sort((a, b) => a.name.localeCompare(b.name));

  productGrid.innerHTML = visibleProducts.map((product) => {
    const isFavorite = state.favorites.includes(product.id);
    return `
      <article class="product-card">
        <div class="product-image-wrap">
          <img class="product-image" src="${imageUrl(product.image)}" alt="${product.name}" loading="lazy" />
          ${product.label ? `<span class="product-tag">${product.label}</span>` : ""}
          <button class="favorite-button" type="button" data-favorite="${product.id}" aria-label="${isFavorite ? "Remove from" : "Add to"} favorites: ${product.name}" aria-pressed="${isFavorite}">${isFavorite ? "♥" : "♡"}</button>
        </div>
        <div class="product-info">
          <div><h3 class="product-name">${product.name}</h3><p class="product-category">${product.category}</p></div>
          <p class="product-price">${formatPrice(product.price)}</p>
        </div>
        <button class="add-button" type="button" data-add="${product.id}">Add to bag <span aria-hidden="true">＋</span></button>
      </article>`;
  }).join("");

  document.querySelector(".result-count").textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? "piece" : "pieces"}`;
  document.querySelector(".no-results").hidden = visibleProducts.length > 0;
  productGrid.hidden = visibleProducts.length === 0;
}

function renderCart() {
  const count = state.cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = state.cart.reduce((total, item) => total + item.price * item.quantity, 0);
  document.querySelector(".bag-count").textContent = count;
  document.querySelector(".drawer-count").textContent = `(${count})`;
  document.querySelector(".cart-subtotal strong").textContent = formatPrice(subtotal);
  document.querySelector(".shipping-remaining").textContent = formatPrice(Math.max(0, 100 - subtotal));
  document.querySelector(".shipping-note").innerHTML = subtotal >= 100
    ? "You’ve unlocked complimentary shipping."
    : `You’re <strong class="shipping-remaining">${formatPrice(100 - subtotal)}</strong> away from complimentary shipping.`;
  document.querySelector(".cart-items").innerHTML = state.cart.length
    ? state.cart.map((item) => `
      <div class="cart-item">
        <img src="${imageUrl(item.image, 180)}" alt="" />
        <div class="cart-item-info"><strong>${item.name}</strong><span>${formatPrice(item.price)}</span>
          <div class="quantity-control">
            <button type="button" data-quantity="${item.id}" data-change="-1" aria-label="Remove one ${item.name}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-quantity="${item.id}" data-change="1" aria-label="Add one ${item.name}">+</button>
          </div>
        </div>
        <strong class="cart-item-price">${formatPrice(item.price * item.quantity)}</strong>
      </div>`).join("")
    : '<p class="cart-empty">Your bag is taking a little breather.<br />Find something you love.</p>';
  storage.write("commonform-cart", state.cart);
}

function setVariant(variant) {
  state.variant = variant;
  document.querySelectorAll("[data-variant]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.variant === variant));
  });
  const variantContent = variant === "A"
    ? { title: "A little less,<br />a lot more you.", description: "Easy pieces. Better days. Find your new forever favorites.", cta: "Explore the collection" }
    : { title: "Get dressed.<br />Feel like you.", description: "Meet the pieces that make getting ready feel effortless.", cta: "Find your everyday" };
  document.querySelector("#hero-title").innerHTML = variantContent.title;
  document.querySelector(".hero-description").textContent = variantContent.description;
  document.querySelector(".hero-cta").innerHTML = `${variantContent.cta} <span aria-hidden="true">↗</span>`;
  recordMetric("views");
}

function openCart() {
  document.querySelector(".cart-drawer").classList.add("open");
  document.querySelector(".cart-drawer").setAttribute("aria-hidden", "false");
  document.querySelector(".drawer-backdrop").hidden = false;
  document.querySelector(".close-drawer").focus();
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.querySelector(".cart-drawer").classList.remove("open");
  document.querySelector(".cart-drawer").setAttribute("aria-hidden", "true");
  document.querySelector(".drawer-backdrop").hidden = true;
  document.body.style.overflow = "";
  document.querySelector(".bag-button").focus();
}

const themeToggle = document.querySelector("#theme-toggle");
document.documentElement.dataset.theme = storage.read("commonform-theme", "light");
themeToggle.checked = document.documentElement.dataset.theme === "dark";
themeToggle.setAttribute("aria-label", `Use ${themeToggle.checked ? "light" : "dark"} mode`);
state.metrics.A = { views: 0, clicks: 0, conversions: 0, ...state.metrics.A };
state.metrics.B = { views: 0, clicks: 0, conversions: 0, ...state.metrics.B };
saveMetrics();
setVariant("A");
renderProducts();
renderCart();

themeToggle.addEventListener("change", () => {
  const theme = themeToggle.checked ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  storage.write("commonform-theme", theme);
  themeToggle.setAttribute("aria-label", `Use ${theme === "dark" ? "light" : "dark"} mode`);
});

document.querySelectorAll("[data-variant]").forEach((button) => {
  button.addEventListener("click", () => setVariant(button.dataset.variant));
});

document.querySelector(".hero-cta").addEventListener("click", () => recordMetric("clicks"));

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.category = button.dataset.category;
    document.querySelectorAll(".filter-button").forEach((filter) => {
      filter.classList.toggle("active", filter === button);
      filter.setAttribute("aria-pressed", String(filter === button));
    });
    document.querySelectorAll("[data-category-link]").forEach((link) => {
      if (link.dataset.categoryLink === state.category) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    renderProducts();
  });
});

document.querySelectorAll("[data-category-link]").forEach((link) => {
  link.addEventListener("click", () => {
    const category = link.dataset.categoryLink;
    const filter = document.querySelector(`.filter-button[data-category="${category}"]`);
    if (filter) filter.click();
  });
});

document.querySelector("#search-input").addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  renderProducts();
});

document.querySelector("#sort-select").addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

productGrid.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    const id = Number(favoriteButton.dataset.favorite);
    state.favorites = state.favorites.includes(id)
      ? state.favorites.filter((favorite) => favorite !== id)
      : [...state.favorites, id];
    storage.write("commonform-favorites", state.favorites);
    renderProducts();
    return;
  }

  const addButton = event.target.closest("[data-add]");
  if (!addButton) return;
  const product = products.find((item) => item.id === Number(addButton.dataset.add));
  const cartItem = state.cart.find((item) => item.id === product.id);
  if (cartItem) cartItem.quantity += 1;
  else state.cart.push({ ...product, quantity: 1 });
  recordMetric("conversions");
  renderCart();
  showToast(`${product.name} added to your bag`);
});

document.querySelector(".cart-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-quantity]");
  if (!button) return;
  const id = Number(button.dataset.quantity);
  const item = state.cart.find((cartItem) => cartItem.id === id);
  item.quantity += Number(button.dataset.change);
  if (item.quantity <= 0) state.cart = state.cart.filter((cartItem) => cartItem.id !== id);
  renderCart();
});

document.querySelector(".bag-button").addEventListener("click", openCart);
document.querySelector(".close-drawer").addEventListener("click", closeCart);
document.querySelector(".continue-shopping").addEventListener("click", closeCart);
document.querySelector(".drawer-backdrop").addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector(".cart-drawer").classList.contains("open")) closeCart();
});

document.querySelector(".metrics-toggle").addEventListener("click", (event) => {
  const panel = document.querySelector(".metrics-panel");
  const isExpanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  event.currentTarget.setAttribute("aria-expanded", String(!isExpanded));
  event.currentTarget.innerHTML = isExpanded
    ? 'View test results <span aria-hidden="true">＋</span>'
    : 'Hide test results <span aria-hidden="true">−</span>';
  panel.hidden = isExpanded;
});

document.querySelector(".reset-metrics").addEventListener("click", () => {
  state.metrics = { A: { views: 0, clicks: 0, conversions: 0 }, B: { views: 0, clicks: 0, conversions: 0 } };
  saveMetrics();
  showToast("Experiment metrics reset");
});

document.querySelector(".checkout-button").addEventListener("click", () => {
  if (!state.cart.length) {
    showToast("Your bag is empty — find something you love first.");
    return;
  }
  showToast("This is a demo store — checkout is not enabled.");
});

document.querySelector(".newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#email-input");
  document.querySelector(".newsletter-message").textContent = `Thanks — ${email.value} is on the list.`;
  email.value = "";
});
