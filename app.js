// =====================================================================
// app.js — Firebase Modular v9 | Auth + Firestore
// Torneo Dota 2 OPEN - VERSIÓN FINAL FUNCIONAL
// =====================================================================

// ─── IMPORTS Firebase Modular v9 ──────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ─── CONFIGURACIÓN FIREBASE ────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCK689qDC94UAo2fCqkeWU-z_Q3HD_yKEY",
  authDomain: "torneo-de-dotita.firebaseapp.com",
  projectId: "torneo-de-dotita",
  storageBucket: "torneo-de-dotita.firebasestorage.app",
  messagingSenderId: "958554768082",
  appId: "1:958554768082:web:fb613bce7b756bdd7da30b",
  measurementId: "G-RTVLG14J1Q"
};

// ─── INICIALIZACIÓN DE FIREBASE ──────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);      // ✅ Faltaba inicializar Auth
const db = getFirestore(app);   // ✅ Faltaba inicializar Firestore
// ❌ Se eliminó getAnalytics para evitar el error de importación que rompía la app

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const COLLECTION = "equipos";
const MAX_TEAMS  = 16;
const WHATSAPP   = "https://chat.whatsapp.com/EDLgOCOg7dACXYFtHRhDIu?mode=gi_t";

// ─── ESTADO GLOBAL ─────────────────────────────────────────────────────────────
let currentUser = null;  // Usuario autenticado actualmente


// ══════════════════════════════════════════════════════════════════════════════
// PARTÍCULAS DE FONDO
// ══════════════════════════════════════════════════════════════════════════════
function initParticles() {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const COLORS = ["rgba(184,24,26,0.6)", "rgba(212,160,23,0.5)", "rgba(240,192,64,0.3)"];
  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < 55; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}


// ══════════════════════════════════════════════════════════════════════════════
// NAVBAR — sombra al hacer scroll
// ══════════════════════════════════════════════════════════════════════════════
function initNavbar() {
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    nav.style.boxShadow = window.scrollY > 50
      ? "0 4px 24px rgba(0,0,0,0.7)" : "none";
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — Tab switcher (login ↔ registro)
// ══════════════════════════════════════════════════════════════════════════════
function switchTab(tab) {
  const panelLogin    = document.getElementById("panelLogin");
  const panelRegister = document.getElementById("panelRegister");
  const tabLogin      = document.getElementById("tabLogin");
  const tabRegister   = document.getElementById("tabRegister");

  if (tab === "login") {
    panelLogin.style.display    = "block";
    panelRegister.style.display = "none";
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
  } else {
    panelLogin.style.display    = "none";
    panelRegister.style.display = "block";
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
  }
  // Limpiar mensajes de error
  clearAuthErrors();
}
window.switchTab = switchTab;  // exponer al HTML


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — Limpiar errores del modal
// ══════════════════════════════════════════════════════════════════════════════
function clearAuthErrors() {
  ["err-loginEmail","err-loginPassword","err-regName","err-regEmail","err-regPassword"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
  const loginErr    = document.getElementById("loginError");
  const registerErr = document.getElementById("registerError");
  if (loginErr)    loginErr.style.display    = "none";
  if (registerErr) registerErr.style.display = "none";
}


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — Loader del botón
// ══════════════════════════════════════════════════════════════════════════════
function setAuthLoading(type, isLoading) {
  const btn    = document.getElementById(type === "login" ? "btnLogin" : "btnRegister");
  const text   = document.getElementById(type === "login" ? "loginBtnText" : "registerBtnText");
  const loader = document.getElementById(type === "login" ? "loginBtnLoader" : "registerBtnLoader");
  if (!btn || !text || !loader) return;
  btn.disabled         = isLoading;
  text.style.display   = isLoading ? "none"   : "inline";
  loader.style.display = isLoading ? "inline" : "none";
}


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — Manejar errores de Firebase Auth (mensajes en español)
// ══════════════════════════════════════════════════════════════════════════════
function translateAuthError(code) {
  const map = {
    "auth/invalid-email":           "El correo electrónico no es válido.",
    "auth/user-not-found":          "No existe una cuenta con ese correo.",
    "auth/wrong-password":          "Contraseña incorrecta.",
    "auth/email-already-in-use":    "Ese correo ya está registrado.",
    "auth/weak-password":           "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests":       "Demasiados intentos. Intenta más tarde.",
    "auth/network-request-failed":  "Error de red. Verifica tu conexión.",
    "auth/invalid-credential":      "Credenciales incorrectas. Verifica tu correo y contraseña.",
  };
  return map[code] || `Error: ${code}`;
}


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — LOGIN
// ══════════════════════════════════════════════════════════════════════════════
async function handleLogin() {
  clearAuthErrors();
  const email    = document.getElementById("loginEmail")?.value.trim()    || "";
  const password = document.getElementById("loginPassword")?.value || "";

  // Validación básica
  if (!email) {
    document.getElementById("err-loginEmail").textContent = "Ingresa tu correo.";
    return;
  }
  if (!password) {
    document.getElementById("err-loginPassword").textContent = "Ingresa tu contraseña.";
    return;
  }

  setAuthLoading("login", true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encarga de cerrar el modal y actualizar la UI
  } catch (err) {
    const loginError = document.getElementById("loginError");
    if (loginError) {
      loginError.textContent  = translateAuthError(err.code);
      loginError.style.display = "block";
    }
  } finally {
    setAuthLoading("login", false);
  }
}
window.handleLogin = handleLogin;


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — REGISTRO DE CUENTA
// ══════════════════════════════════════════════════════════════════════════════
async function handleRegister() {
  clearAuthErrors();
  const name     = document.getElementById("regName")?.value.trim()     || "";
  const email    = document.getElementById("regEmail")?.value.trim()    || "";
  const password = document.getElementById("regPassword")?.value || "";

  let valid = true;
  if (!name) {
    document.getElementById("err-regName").textContent = "Ingresa un nombre de usuario.";
    valid = false;
  }
  if (!email) {
    document.getElementById("err-regEmail").textContent = "Ingresa tu correo.";
    valid = false;
  }
  if (!password || password.length < 6) {
    document.getElementById("err-regPassword").textContent = "La contraseña debe tener al menos 6 caracteres.";
    valid = false;
  }
  if (!valid) return;

  setAuthLoading("register", true);
  try {
    // 1. Crear cuenta en Firebase Auth
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // 2. Guardar displayName en el perfil
    await updateProfile(credential.user, { displayName: name });
    // onAuthStateChanged se encarga del resto
  } catch (err) {
    const registerError = document.getElementById("registerError");
    if (registerError) {
      registerError.textContent   = translateAuthError(err.code);
      registerError.style.display = "block";
    }
  } finally {
    setAuthLoading("register", false);
  }
}
window.handleRegister = handleRegister;


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — LOGOUT
// ══════════════════════════════════════════════════════════════════════════════
async function handleLogout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
  }
}
window.handleLogout = handleLogout;


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — Actualizar UI según estado del usuario
// ══════════════════════════════════════════════════════════════════════════════
function updateAuthUI(user) {
  const overlay        = document.getElementById("authOverlay");
  const userStatus     = document.getElementById("userStatus");
  const userAvatar     = document.getElementById("userAvatar");
  const userNameEl     = document.getElementById("userName");
  const formWrapper    = document.getElementById("formWrapper");
  const loginRequired  = document.getElementById("loginRequired");

  if (user) {
    // ── Usuario LOGUEADO ──────────────────────────────────────────────────
    currentUser = user;

    // Ocultar modal de auth
    if (overlay) overlay.style.display = "none";

    // Mostrar nombre en navbar
    const displayName = user.displayName || user.email.split("@")[0];
    if (userStatus)  userStatus.style.display = "flex";
    if (userAvatar)  userAvatar.textContent   = displayName.charAt(0).toUpperCase();
    if (userNameEl)  userNameEl.textContent   = displayName;

    // Mostrar formulario de registro
    if (formWrapper)   formWrapper.style.display   = "block";
    if (loginRequired) loginRequired.style.display = "none";

    // Verificar si ya tiene un equipo registrado con este UID
    checkUserTeam(user.uid);

  } else {
    // ── Usuario NO LOGUEADO ───────────────────────────────────────────────
    currentUser = null;

    // Mostrar modal de auth
    if (overlay) overlay.style.display = "flex";

    // Ocultar estado de usuario en navbar
    if (userStatus) userStatus.style.display = "none";

    // Ocultar formulario, mostrar banner de login
    if (formWrapper)   formWrapper.style.display   = "none";
    if (loginRequired) loginRequired.style.display = "flex";
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — Verificar si el usuario ya registró un equipo
// ══════════════════════════════════════════════════════════════════════════════
async function checkUserTeam(uid) {
  const registroForm       = document.getElementById("registroForm");
  const alreadyRegistered  = document.getElementById("alreadyRegistered");
  const alreadyName        = document.getElementById("alreadyRegisteredName");

  try {
    const q    = query(collection(db, COLLECTION), where("uid", "==", uid));
    const snap = await getDocs(q);

    if (!snap.empty) {
      // Ya tiene equipo → ocultar form, mostrar mensaje
      const teamData = snap.docs[0].data();
      if (registroForm)      registroForm.style.display      = "none";
      if (alreadyRegistered) alreadyRegistered.style.display = "block";
      if (alreadyName)       alreadyName.textContent         = `Tu equipo "${teamData.teamName}" ya está inscrito. ¡Buena suerte!`;
    } else {
      // No tiene equipo → mostrar form
      if (registroForm)      registroForm.style.display      = "block";
      if (alreadyRegistered) alreadyRegistered.style.display = "none";
    }
  } catch (err) {
    console.error("Error verificando equipo del usuario:", err);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// FIRESTORE — Contador de equipos en el Hero
// ══════════════════════════════════════════════════════════════════════════════
function updateStats(count) {
  const totalEl  = document.getElementById("totalEquipos");
  const libresEl = document.getElementById("cuposLibres");
  if (totalEl)  totalEl.textContent  = count;
  if (libresEl) libresEl.textContent = Math.max(0, MAX_TEAMS - count);
}


// ══════════════════════════════════════════════════════════════════════════════
// FIRESTORE — Cargar equipos en tiempo real
// ══════════════════════════════════════════════════════════════════════════════
function loadTeams() {
  const container = document.getElementById("teamsContainer");
  if (!container) return;

  // ✅ query() modular — NO db.collection().orderBy()
  const q = query(
    collection(db, COLLECTION),
    orderBy("timestamp", "asc")
  );

  // ✅ onSnapshot modular
  onSnapshot(q, (snapshot) => {
    updateStats(snapshot.size);

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">⚔</span>
          <p>Aún no hay equipos inscritos.</p>
          <p>¡Sé el primero en registrarte!</p>
        </div>`;
      return;
    }

    container.innerHTML = "";
    let idx = 1;
    snapshot.forEach(doc => {
      container.appendChild(createTeamCard(doc.data(), idx++));
    });

  }, (err) => {
    console.error("Error cargando equipos:", err);
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <p>Error al cargar equipos.</p>
        <p style="font-size:0.85rem;color:var(--red);">${escapeHtml(err.message)}</p>
      </div>`;
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// UI — Crear tarjeta de equipo
// ══════════════════════════════════════════════════════════════════════════════
function createTeamCard(data, num) {
  const card = document.createElement("div");
  card.className = "team-card";
  card.style.animationDelay = `${(num - 1) * 0.07}s`;  // ✅ backtick correcto

  const initials = data.teamName
    ? data.teamName.substring(0, 2).toUpperCase() : "??";

  const playersArray = Array.isArray(data.players) ? data.players : [];
  const playerTags = playersArray
    .map(p => `<span class="player-tag">⚔ ${escapeHtml(p)}</span>`)
    .join("");

  const registeredBy = data.userDisplayName
    ? `<div class="team-registered-by">Registrado por: ${escapeHtml(data.userDisplayName)}</div>` : "";

  // ✅ Template literals correctos (backticks en toda la cadena)
  card.innerHTML = `
    <span class="team-num">#${String(num).padStart(2, "0")}</span>
    <div class="team-card-header">
      <div class="team-avatar">${escapeHtml(initials)}</div>
      <div>
        <div class="team-name">${escapeHtml(data.teamName || "")}</div>
        <div class="team-captain">👑 ${escapeHtml(data.captain || "")}</div>
        ${registeredBy}
      </div>
    </div>
    <div class="team-players">${playerTags}</div>`;

  return card;
}


// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIO — Limpiar errores
// ══════════════════════════════════════════════════════════════════════════════
function clearErrors() {
  document.querySelectorAll(".error-msg").forEach(el => (el.textContent = ""));
  document.querySelectorAll(".error-field").forEach(el => el.classList.remove("error-field"));
  const fe = document.getElementById("formError");
  if (fe) fe.style.display = "none";
}

function setFieldError(inputId, errId, msg) {
  const field = document.getElementById(inputId);
  const err   = document.getElementById(errId);
  if (field) field.classList.add("error-field");
  if (err)   err.textContent = msg;
}


// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIO — Validar campos
// ══════════════════════════════════════════════════════════════════════════════
function validateForm() {
  clearErrors();
  let valid = true;

  const teamName = document.getElementById("teamName")?.value.trim() || "";
  const captain  = document.getElementById("captain")?.value.trim()  || "";
  const contact  = document.getElementById("contact")?.value.trim()  || "";
  const playerInputs = Array.from(document.querySelectorAll(".player-input"));
  const players  = playerInputs.map(i => i.value.trim());

  if (!teamName || teamName.length < 2) {
    setFieldError("teamName", "err-teamName",
      teamName ? "El nombre debe tener al menos 2 caracteres." : "El nombre del equipo es obligatorio.");
    valid = false;
  }
  if (!captain) {
    setFieldError("captain", "err-captain", "El nombre del capitán es obligatorio.");
    valid = false;
  }
  if (!contact) {
    setFieldError("contact", "err-contact", "El WhatsApp del capitán es obligatorio.");
    valid = false;
  } else if (!/^[\+]?[\d\s\-\(\)]{7,20}$/.test(contact)) {
    setFieldError("contact", "err-contact", "Ingresa un número de teléfono válido.");
    valid = false;
  }

  // 5 jugadores obligatorios
  players.forEach((p, i) => {
    if (!p) {
      playerInputs[i].classList.add("error-field");
      const errEl = document.getElementById(`err-p${i}`);  // ✅ backtick correcto
      if (errEl) errEl.textContent = "Este jugador es obligatorio.";
      valid = false;
    }
  });

  return valid ? { teamName, captain, contact, players } : null;
}


// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIO — Loader del botón de envío
// ══════════════════════════════════════════════════════════════════════════════
function setLoading(isLoading) {
  const btn    = document.getElementById("submitBtn");
  const text   = document.getElementById("btnText");
  const loader = document.getElementById("btnLoader");
  if (!btn || !text || !loader) return;
  btn.disabled         = isLoading;
  text.style.display   = isLoading ? "none"   : "inline";
  loader.style.display = isLoading ? "inline" : "none";
}

function showFormError(msg) {
  const el = document.getElementById("formError");
  if (!el) return;
  el.textContent   = msg;
  el.style.display = "block";
}


// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIO — Submit (registrar equipo)
// ══════════════════════════════════════════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault();

  // 1. ¿Está logueado?
  if (!currentUser) {
    showFormError("🔒 Debes iniciar sesión para registrar tu equipo.");
    return;
  }

  // 2. Validar campos
  const data = validateForm();
  if (!data) return;

  setLoading(true);

  try {
    const ref = collection(db, COLLECTION);

    // 3. ¿Cupos disponibles?
    const allSnap = await getDocs(ref);
    if (allSnap.size >= MAX_TEAMS) {
      showFormError("⚠️ Lo sentimos, todos los cupos están llenos.");
      setLoading(false);
      return;
    }

    // 4. ¿Ya tiene equipo este usuario?
    const myTeamQ    = query(ref, where("uid", "==", currentUser.uid));
    const myTeamSnap = await getDocs(myTeamQ);
    if (!myTeamSnap.empty) {
      showFormError("⚠️ Ya tienes un equipo inscrito en este torneo.");
      setLoading(false);
      await checkUserTeam(currentUser.uid);
      return;
    }

    // 5. ¿Nombre de equipo duplicado?
    const dupQ    = query(ref, where("teamName", "==", data.teamName));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      setFieldError("teamName", "err-teamName", "Ya existe un equipo con ese nombre.");
      setLoading(false);
      return;
    }

    // 6. Suplentes opcionales
    const subs = Array.from(document.querySelectorAll(".sub-input"))
      .map(i => i.value.trim()).filter(Boolean);

    // 7. Guardar en Firestore ✅ addDoc modular correcto
    await addDoc(ref, {
      teamName:        data.teamName,
      captain:         data.captain,
      contact:         data.contact,
      players:         data.players,
      subs:            subs,
      uid:             currentUser.uid,            // ← vincula el equipo al usuario
      userEmail:       currentUser.email,
      userDisplayName: currentUser.displayName || currentUser.email.split("@")[0],
      timestamp:       serverTimestamp()           // ✅ serverTimestamp() modular correcto
    });

    // 8. Éxito
    const form    = document.getElementById("registroForm");
    const success = document.getElementById("formSuccess");
    if (form)    form.style.display    = "none";
    if (success) success.style.display = "block";

  } catch (err) {
    console.error("Error al guardar el equipo:", err);
    showFormError(`❌ Error al guardar: ${err.message}`);
  } finally {
    setLoading(false);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIO — Resetear
// ══════════════════════════════════════════════════════════════════════════════
function resetForm() {
  const form    = document.getElementById("registroForm");
  const success = document.getElementById("formSuccess");
  if (form) {
    form.reset();
    form.style.display = "block";
  }
  if (success) success.style.display = "none";
  clearErrors();
}
window.resetForm = resetForm;  // ✅ Exponer al HTML (necesario por type="module")


// ══════════════════════════════════════════════════════════════════════════════
// UTILIDAD — Escapar HTML para prevenir XSS
// ══════════════════════════════════════════════════════════════════════════════
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}


// ══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN (Y VÍNCULOS DE BOTONES MEJORADOS)
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  initNavbar();
  loadTeams();

  // Vincular submit del formulario de registro de equipo
  const form = document.getElementById("registroForm");
  if (form) form.addEventListener("submit", handleSubmit);

  // 🛡️ MODIFICACIÓN APLICADA: Vincular los botones de Auth directamente aquí
  // para asegurar que el navegador los detecte sin importar el HTML.
  const btnLogin = document.getElementById("btnLogin");
  if (btnLogin) {
    btnLogin.addEventListener("click", (e) => {
      e.preventDefault(); // Evita que la página se recargue al dar clic
      handleLogin();
    });
  }

  const btnRegister = document.getElementById("btnRegister");
  if (btnRegister) {
    btnRegister.addEventListener("click", (e) => {
      e.preventDefault(); // Evita que la página se recargue al dar clic
      handleRegister();
    });
  }

  const btnLogout = document.querySelector(".btn-logout"); // Asumiendo que usas esta clase para el botón de salir
  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // ── Firebase Auth — escucha cambios de sesión en tiempo real ──────────────
  // onAuthStateChanged se dispara al cargar la página y cada vez que
  // el usuario hace login o logout. Es el corazón del sistema de auth.
  onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
  });
});

/* =========================
   DASHBOARD TIPO SECCIONES
========================= */

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const addBoxBtn = document.getElementById("addBoxBtn");
    const dashboardList = document.getElementById("dashboardList");

    if (!addBoxBtn || !dashboardList) return;

    const STORAGE_KEY = "dashboard_torneo_sections_v2";
    let dashboardItems = [];

    function loadDashboardItems() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        dashboardItems = saved ? JSON.parse(saved) : [];
      } catch (error) {
        dashboardItems = [];
        console.error("Error cargando dashboard:", error);
      }
    }

    function saveDashboardItems() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardItems));
      } catch (error) {
        console.error("Error guardando dashboard:", error);
      }
    }

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text || "";
      return div.innerHTML;
    }

    function createEmptySection() {
      return {
        id: Date.now() + Math.random().toString(16).slice(2),
        title: "Nueva sección",
        content: "",
        editing: true,
        isNew: true,
        backup: null
      };
    }

    function renderDashboard() {
      dashboardList.innerHTML = "";

      if (!dashboardItems.length) {
        dashboardList.innerHTML = `
          <div class="dashboard-empty">
            Aún no hay secciones. Presiona <strong>+ Agregar sección</strong>.
          </div>
        `;
        return;
      }

      dashboardItems.forEach((item) => {
        const section = document.createElement("div");
        section.className = "dashboard-section-item";

        if (item.editing) {
          section.innerHTML = `
            <div class="dashboard-editor">
              <input
                type="text"
                class="dashboard-input-title"
                placeholder="Título de la sección"
                value="${escapeHtml(item.title)}"
              />

              <textarea
                class="dashboard-input-content"
                placeholder="Escribe aquí el contenido...">${escapeHtml(item.content)}</textarea>

              <div class="dashboard-actions">
                <button type="button" class="dashboard-btn dashboard-btn-save">Guardar</button>
                <button type="button" class="dashboard-btn dashboard-btn-cancel">Cancelar</button>
                <button type="button" class="dashboard-btn dashboard-btn-delete">Eliminar</button>
              </div>
            </div>
          `;

          const titleInput = section.querySelector(".dashboard-input-title");
          const contentInput = section.querySelector(".dashboard-input-content");
          const saveBtn = section.querySelector(".dashboard-btn-save");
          const cancelBtn = section.querySelector(".dashboard-btn-cancel");
          const deleteBtn = section.querySelector(".dashboard-btn-delete");

          titleInput.addEventListener("input", (e) => {
            item.title = e.target.value;
          });

          contentInput.addEventListener("input", (e) => {
            item.content = e.target.value;
          });

          saveBtn.addEventListener("click", () => {
            item.editing = false;
            item.isNew = false;
            item.backup = null;
            saveDashboardItems();
            renderDashboard();
          });

          cancelBtn.addEventListener("click", () => {
            if (item.isNew) {
              dashboardItems = dashboardItems.filter((x) => x.id !== item.id);
            } else if (item.backup) {
              item.title = item.backup.title;
              item.content = item.backup.content;
              item.editing = false;
              item.backup = null;
            } else {
              item.editing = false;
            }

            saveDashboardItems();
            renderDashboard();
          });

          deleteBtn.addEventListener("click", () => {
            if (!confirm("¿Seguro que quieres eliminar esta sección?")) return;
            dashboardItems = dashboardItems.filter((x) => x.id !== item.id);
            saveDashboardItems();
            renderDashboard();
          });
        } else {
          section.innerHTML = `
            <div class="dashboard-section-title">
              <span>${escapeHtml(item.title || "Sin título")}</span>
              <a class="dashboard-edit-link">[ editar ]</a>
            </div>
            <div class="dashboard-section-line"></div>
            <div class="dashboard-section-content">${escapeHtml(item.content || "")}</div>
          `;

          const editLink = section.querySelector(".dashboard-edit-link");

          editLink.addEventListener("click", () => {
            item.backup = {
              title: item.title,
              content: item.content
            };
            item.editing = true;
            saveDashboardItems();
            renderDashboard();
          });
        }

        dashboardList.appendChild(section);
      });
    }

    addBoxBtn.addEventListener("click", () => {
      dashboardItems.push(createEmptySection());
      saveDashboardItems();
      renderDashboard();
    });

    loadDashboardItems();
    renderDashboard();
  });
})();
