const STORAGE = {
  users: "bookloop_users_v1",
  current: "bookloop_current_user_v1",
  books: "bookloop_books_v1",
  requests: "bookloop_requests_v1",
  theme: "bookloop_theme_v1"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const read = (key, fallback) => {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

let users = read(STORAGE.users, []);
let books = read(STORAGE.books, null);
let exchangeRequests = read(STORAGE.requests, []);
let currentUser = read(STORAGE.current, null);
let activeBookId = null;
let toastTimer;
const coverColors = ["#315c48", "#a85e42", "#586d8c", "#9a854c", "#684f73", "#427b78", "#9a5e66"];

const starterBooks = [
  {id:"seed-1",title:"The Alchemist",author:"Paulo Coelho",genre:"Fiction",summary:"A young shepherd named Santiago travels from Spain to the Egyptian desert in search of treasure. Along the way, he learns to listen to his heart, recognise opportunities and follow his personal legend.",condition:"Very good",cover:"",ownerId:"sample-maya",ownerName:"Maya R.",ownerJob:"Design student",createdAt:1},
  {id:"seed-2",title:"Atomic Habits",author:"James Clear",genre:"Self-development",summary:"A practical guide to building good habits and breaking bad ones. James Clear explains how tiny, consistent improvements can create remarkable long-term change.",condition:"Like new",cover:"",ownerId:"sample-youssef",ownerName:"Youssef A.",ownerJob:"Developer",createdAt:2},
  {id:"seed-3",title:"The Hobbit",author:"J.R.R. Tolkien",genre:"Fantasy",summary:"Bilbo Baggins, a comfort-loving hobbit, is swept into an unexpected adventure with a company of dwarves. A classic journey full of riddles, courage, friendship and dragons.",condition:"Good",cover:"",ownerId:"sample-sara",ownerName:"Sara B.",ownerJob:"Teacher",createdAt:3},
  {id:"seed-4",title:"A Brief History of Time",author:"Stephen Hawking",genre:"Science",summary:"Stephen Hawking explores the big questions of the universe, from the Big Bang and black holes to the nature of time, in an accessible introduction to cosmology.",condition:"Well loved",cover:"",ownerId:"sample-omar",ownerName:"Omar K.",ownerJob:"Physics student",createdAt:4},
  {id:"seed-5",title:"The Little Prince",author:"Antoine de Saint-Exupéry",genre:"Fiction",summary:"A pilot stranded in the desert meets a young prince who tells him about his travels between tiny planets. A poetic story about love, friendship and seeing with the heart.",condition:"Very good",cover:"",ownerId:"sample-lina",ownerName:"Lina M.",ownerJob:"Illustrator",createdAt:5},
  {id:"seed-6",title:"Sapiens",author:"Yuval Noah Harari",genre:"History",summary:"A sweeping look at the history of humankind, exploring how biology, culture and shared stories shaped the societies we live in today.",condition:"Good",cover:"",ownerId:"sample-adam",ownerName:"Adam E.",ownerJob:"Reader",createdAt:6}
];
if (!Array.isArray(books)) { books = starterBooks; write(STORAGE.books, books); }

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}
function initials(name = "Reader") {
  return name.trim().split(/\s+/).slice(0,2).map(part => part[0] || "").join("").toUpperCase() || "R";
}
function safeCoverUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch { return ""; }
}
function coverMarkup(book, extraClass = "") {
  const cover = safeCoverUrl(book.cover || "");
  if (cover) return `<img class="${extraClass || "book-cover"}" src="${escapeHTML(cover)}" alt="Cover of ${escapeHTML(book.title)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cover-placeholder',innerHTML:'<strong>${escapeHTML(book.title)}</strong><small>${escapeHTML(book.author)}</small>'}))">`;
  const color = coverColors[Math.abs(hashCode(book.id || book.title)) % coverColors.length];
  return `<div class="cover-placeholder" style="background:${color}"><strong>${escapeHTML(book.title)}</strong><small>${escapeHTML(book.author)}</small></div>`;
}
function hashCode(text) {
  let hash = 0;
  for (let i = 0; i < String(text).length; i++) hash = ((hash << 5) - hash + String(text).charCodeAt(i)) | 0;
  return hash;
}
function setAuthMode(mode) {
  const signup = mode === "signup";
  $("#loginForm").classList.toggle("hidden", signup);
  $("#signupForm").classList.toggle("hidden", !signup);
  $("#authEyebrow").textContent = signup ? "JOIN THE READING CIRCLE" : "WELCOME BACK";
  $("#authTitle").innerHTML = signup ? "Make room for<br>new stories." : "Your next chapter<br>starts here.";
  $("#authSubtitle").textContent = signup ? "Create your reader profile and start exchanging books." : "Sign in to discover books worth passing on.";
}
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  write(STORAGE.theme, theme);
  const label = theme === "dark" ? "☾ Dark mode" : "☼ Light mode";
  ["#authThemeToggle", "#topThemeToggle"].forEach(selector => {
    const button = $(selector);
    if (button) button.innerHTML = `${theme === "dark" ? "☾" : "☼"} <span>${selector === "#topThemeToggle" ? "Theme" : (theme === "dark" ? "Dark mode" : "Light mode")}</span>`;
  });
}
function toggleTheme() { applyTheme(document.body.classList.contains("dark") ? "light" : "dark"); }
function showApp() {
  if (!currentUser) return;
  $("#authScreen").classList.add("hidden");
  $("#appScreen").classList.remove("hidden");
  $("#sidebarUserName").textContent = currentUser.name;
  $("#sidebarUserJob").textContent = currentUser.job || "BookLoop member";
  $("#userAvatar").textContent = initials(currentUser.name);
  $("#topAvatar").textContent = initials(currentUser.name);
  renderAll();
}
function logout() {
  currentUser = null;
  localStorage.removeItem(STORAGE.current);
  $("#appScreen").classList.add("hidden");
  $("#authScreen").classList.remove("hidden");
  $("#loginForm").reset();
  setAuthMode("login");
}
function renderAll() {
  renderBooks();
  renderMyBooks();
  renderRequests();
  updateCounts();
}
function getMyBooks() {
  return books.filter(book => book.ownerId === currentUser?.id);
}
function renderBookCard(book) {
  return `<article class="book-card" data-book-id="${escapeHTML(book.id)}" tabindex="0" role="button" aria-label="View details for ${escapeHTML(book.title)}">
    <div class="book-cover-wrap">${coverMarkup(book, "book-cover")}<span class="genre-pill">${escapeHTML(book.genre)}</span></div>
    <div class="card-content"><div class="card-title-row"><div><h3>${escapeHTML(book.title)}</h3><p class="book-author">by ${escapeHTML(book.author)}</p></div><span class="card-arrow">↗</span></div>
    <div class="card-meta"><div class="owner-line"><span class="owner-avatar">${escapeHTML(initials(book.ownerName))}</span><span class="owner-name">${escapeHTML(book.ownerId === currentUser?.id ? "You" : book.ownerName)}</span></div><span class="condition">${escapeHTML(book.condition)}</span></div></div></article>`;
}
function renderBooks() {
  const search = ($("#searchInput")?.value || "").trim().toLowerCase();
  const genre = $("#categoryFilter")?.value || "all";
  const visibleBooks = books.filter(book => {
    const notMine = book.ownerId !== currentUser?.id;
    const matchesSearch = `${book.title} ${book.author} ${book.summary} ${book.ownerName}`.toLowerCase().includes(search);
    return notMine && matchesSearch && (genre === "all" || book.genre === genre);
  });
  $("#booksGrid").innerHTML = visibleBooks.map(renderBookCard).join("");
  $("#emptyDiscover").classList.toggle("hidden", visibleBooks.length > 0);
  $("#totalBooksStat").textContent = books.filter(book => book.ownerId !== currentUser?.id).length;
  $("#totalRequestsStat").textContent = exchangeRequests.filter(request => request.fromUserId === currentUser?.id || request.toUserId === currentUser?.id).length;
}
function renderMyBooks() {
  const mine = getMyBooks();
  $("#myBooksGrid").innerHTML = mine.map(renderBookCard).join("");
  $("#emptyMyBooks").classList.toggle("hidden", mine.length > 0);
}
function renderRequests() {
  const mine = exchangeRequests.filter(request => request.fromUserId === currentUser?.id || request.toUserId === currentUser?.id);
  $("#requestsList").innerHTML = mine.map(request => {
    const incoming = request.toUserId === currentUser.id;
    const statusClass = request.status === "Accepted" ? "accepted" : request.status === "Declined" ? "declined" : "";
    const actions = incoming && request.status === "Pending"
      ? `<div class="request-actions"><button class="small-action accept" data-request-action="Accepted" data-request-id="${escapeHTML(request.id)}">Accept</button><button class="small-action" data-request-action="Declined" data-request-id="${escapeHTML(request.id)}">Decline</button></div>`
      : "";
    const offered = request.offeredBookTitle ? `They offer: ${escapeHTML(request.offeredBookTitle)}.` : "No book was selected.";
    const detail = incoming
      ? `${escapeHTML(request.fromUserName)} wants your book. ${offered}`
      : `You offered ${escapeHTML(request.offeredBookTitle || "a book")} to ${escapeHTML(request.toUserName)}.`;
    return `<article class="request-card"><div class="request-book-mini" style="background:${coverColors[Math.abs(hashCode(request.bookTitle)) % coverColors.length]}">${escapeHTML(request.bookTitle)}</div><div class="request-info"><h3>${escapeHTML(request.bookTitle)}</h3><p>${detail}</p></div><span class="request-status ${statusClass}">${escapeHTML(request.status)}</span>${actions}</article>`;
  }).join("");
  $("#emptyRequests").classList.toggle("hidden", mine.length > 0);
}
function updateCounts() {
  $("#myBooksCount").textContent = getMyBooks().length;
  const pendingIncoming = exchangeRequests.filter(request => request.toUserId === currentUser?.id && request.status === "Pending").length;
  $("#requestCount").textContent = pendingIncoming;
}
function switchView(view) {
  const names = {discover:"Discover",mybooks:"My bookshelf",requests:"Exchange requests"};
  ["discover","mybooks","requests"].forEach(name => $(`#${name}View`).classList.toggle("hidden", name !== view));
  $$(".nav-link[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#breadcrumbCurrent").textContent = names[view] || "Discover";
  if (view === "discover") renderBooks();
  if (view === "mybooks") renderMyBooks();
  if (view === "requests") renderRequests();
}
function openBook(bookId) {
  const book = books.find(item => item.id === bookId);
  if (!book) return;
  activeBookId = bookId;
  const isMine = book.ownerId === currentUser.id;
  const hasOwnBooks = getMyBooks().length > 0;
  const alreadyRequested = exchangeRequests.some(request => request.bookId === book.id && request.fromUserId === currentUser.id && request.status !== "Declined");
  const ownerInitial = initials(book.ownerName);
  $("#modalContent").innerHTML = `<div class="modal-book-layout"><div class="modal-cover">${coverMarkup(book, "modal-cover-image")}</div><div class="modal-book-info"><p class="eyebrow">${escapeHTML(book.genre)} · COMMUNITY BOOK</p><h2 id="modalTitle">${escapeHTML(book.title)}</h2><p class="modal-author">Written by ${escapeHTML(book.author)}</p><div class="detail-pills"><span>${escapeHTML(book.condition)} condition</span><span>Exchange only · No money</span></div><h4>About this book</h4><p class="modal-summary">${escapeHTML(book.summary)}</p><div class="owner-detail"><div class="owner-avatar">${escapeHTML(ownerInitial)}</div><div><strong>${escapeHTML(book.ownerName)}</strong><span>${escapeHTML(book.ownerJob || "BookLoop member")}</span></div></div>${isMine ? `<button class="btn btn-secondary btn-full" id="deleteBookBtn">Remove from my shelf</button>` : hasOwnBooks ? `<div class="exchange-box"><label for="offerBookSelect">Choose a book to offer in exchange</label><select id="offerBookSelect">${getMyBooks().map(own => `<option value="${escapeHTML(own.id)}">${escapeHTML(own.title)} — ${escapeHTML(own.author)}</option>`).join("")}</select></div><button class="btn btn-primary btn-full" id="requestExchangeBtn" ${alreadyRequested ? "disabled" : ""}>${alreadyRequested ? "Request already sent ✓" : "Ask to exchange ↗"}</button>` : `<div class="exchange-box"><strong style="font-size:11px">Your shelf is empty</strong><p style="font-size:10px;color:var(--muted);line-height:1.6;margin:7px 0 0">List a book first, then you can offer it to ${escapeHTML(book.ownerName)} in exchange.</p></div><button class="btn btn-primary btn-full" id="addBookFromDetails">＋ List a book first</button>`}</div></div>`;
  const modalCover = $(".modal-cover", $("#modalContent"));
  const cover = safeCoverUrl(book.cover || "");
  if (cover) {
    modalCover.innerHTML = `<img src="${escapeHTML(cover)}" alt="Cover of ${escapeHTML(book.title)}">`;
  } else {
    const color = coverColors[Math.abs(hashCode(book.id || book.title)) % coverColors.length];
    modalCover.innerHTML = `<div class="cover-placeholder" style="background:${color}"><strong>${escapeHTML(book.title)}</strong><small>${escapeHTML(book.author)}</small></div>`;
  }
  $("#bookModal").classList.remove("hidden");
}
function closeBookModal() { $("#bookModal").classList.add("hidden"); activeBookId = null; }
function openAddModal() {
  $("#addBookForm").reset();
  $("#addBookModal").classList.remove("hidden");
  setTimeout(() => $("#bookTitle").focus(), 30);
}
function closeAddModal() { $("#addBookModal").classList.add("hidden"); }

$("#loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#loginName").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  const user = users.find(item => item.name.toLowerCase() === name && item.password === password);
  if (!user) { showToast("We couldn't find that name and password. Check your details or create an account."); return; }
  currentUser = {id:user.id,name:user.name,email:user.email,job:user.job,phone:user.phone};
  write(STORAGE.current, currentUser);
  showApp();
});
$("#signupForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = String(data.get("name")).trim();
  const email = String(data.get("email")).trim().toLowerCase();
  const phone = String(data.get("phone")).trim();
  const job = String(data.get("job")).trim();
  const password = String(data.get("password"));
  if (users.some(user => user.name.toLowerCase() === name.toLowerCase())) { showToast("That name is already registered. Please sign in or choose another name."); return; }
  if (users.some(user => user.email.toLowerCase() === email)) { showToast("That email is already registered. Please sign in."); return; }
  const user = {id:makeId("user"),name,email,phone,job,password};
  users.push(user);
  write(STORAGE.users, users);
  currentUser = {id:user.id,name:user.name,email:user.email,job:user.job,phone:user.phone};
  write(STORAGE.current, currentUser);
  showApp();
  showToast(`Welcome to BookLoop, ${name}!`);
});
$$("[data-auth-mode]").forEach(button => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
$("#authThemeToggle").addEventListener("click", toggleTheme);
$("#topThemeToggle").addEventListener("click", toggleTheme);
$("#sidebarThemeToggle").addEventListener("click", toggleTheme);
$("#logoutBtn").addEventListener("click", logout);
$$("[data-view]").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
$("#searchInput").addEventListener("input", renderBooks);
$("#categoryFilter").addEventListener("change", renderBooks);
["#openAddBook","#openAddBook2","#emptyAddBook","#emptyAddBook2"].forEach(selector => $(selector).addEventListener("click", openAddModal));
$("#goDiscoverBtn").addEventListener("click", () => switchView("discover"));
$("#booksGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-book-id]");
  if (card) openBook(card.dataset.bookId);
});
$("#myBooksGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-book-id]");
  if (card) openBook(card.dataset.bookId);
});
$("#booksGrid").addEventListener("keydown", event => {
  const card = event.target.closest("[data-book-id]");
  if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openBook(card.dataset.bookId); }
});
$("#myBooksGrid").addEventListener("keydown", event => {
  const card = event.target.closest("[data-book-id]");
  if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openBook(card.dataset.bookId); }
});
$("#addBookForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const book = {
    id:makeId("book"), title:String(data.get("title")).trim(), author:String(data.get("author")).trim(),
    genre:String(data.get("genre")), summary:String(data.get("summary")).trim(), condition:String(data.get("condition")),
    cover:safeCoverUrl(String(data.get("cover") || "").trim()), ownerId:currentUser.id, ownerName:currentUser.name,
    ownerJob:currentUser.job || "BookLoop member", createdAt:Date.now()
  };
  books.unshift(book);
  write(STORAGE.books, books);
  closeAddModal();
  renderAll();
  switchView("mybooks");
  showToast("Your book is now on the community shelf.");
});
$("#modalContent").addEventListener("click", event => {
  if (event.target.id === "requestExchangeBtn") {
    const book = books.find(item => item.id === activeBookId);
    const offeredBook = books.find(item => item.id === $("#offerBookSelect")?.value);
    if (!book || !offeredBook) return;
    const exists = exchangeRequests.some(request => request.bookId === book.id && request.fromUserId === currentUser.id && request.status === "Pending");
    if (exists) { showToast("You already have a pending request for this book."); return; }
    exchangeRequests.unshift({id:makeId("request"),bookId:book.id,bookTitle:book.title,fromUserId:currentUser.id,fromUserName:currentUser.name,toUserId:book.ownerId,toUserName:book.ownerName,offeredBookId:offeredBook.id,offeredBookTitle:offeredBook.title,status:"Pending",createdAt:Date.now()});
    write(STORAGE.requests, exchangeRequests);
    closeBookModal();
    renderAll();
    showToast("Exchange request sent! You can track it in Exchange requests.");
  }
  if (event.target.id === "deleteBookBtn") {
    const book = books.find(item => item.id === activeBookId);
    if (!book || book.ownerId !== currentUser.id) return;
    books = books.filter(item => item.id !== book.id);
    exchangeRequests = exchangeRequests.filter(request => request.bookId !== book.id && request.offeredBookId !== book.id);
    write(STORAGE.books, books);
    write(STORAGE.requests, exchangeRequests);
    closeBookModal();
    renderAll();
    showToast("Book removed from your shelf.");
  }
  if (event.target.id === "addBookFromDetails") {
    closeBookModal();
    openAddModal();
  }
});
$("#requestsList").addEventListener("click", event => {
  const button = event.target.closest("[data-request-action]");
  if (!button) return;
  const request = exchangeRequests.find(item => item.id === button.dataset.requestId);
  if (!request || request.toUserId !== currentUser.id || request.status !== "Pending") return;
  request.status = button.dataset.requestAction;
  write(STORAGE.requests, exchangeRequests);
  renderAll();
  showToast(request.status === "Accepted" ? "Exchange request accepted." : "Exchange request declined.");
});
$$("[data-close-modal]").forEach(button => button.addEventListener("click", closeBookModal));
$$("[data-close-add]").forEach(button => button.addEventListener("click", closeAddModal));
$("#bookModal").addEventListener("click", event => { if (event.target === $("#bookModal")) closeBookModal(); });
$("#addBookModal").addEventListener("click", event => { if (event.target === $("#addBookModal")) closeAddModal(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape") { closeBookModal(); closeAddModal(); }
});

applyTheme(read(STORAGE.theme, "light"));
if (currentUser && users.some(user => user.id === currentUser.id)) {
  showApp();
} else {
  currentUser = null;
  localStorage.removeItem(STORAGE.current);
  $("#authScreen").classList.remove("hidden");
  $("#appScreen").classList.add("hidden");
  setAuthMode("login");
}
