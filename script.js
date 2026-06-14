document.body.classList.add("loading");
// =============================================
// FIREBASE IMPORTS
// =============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =============================================
// KONFIGURASI FIREBASE
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyAIQH3SnJHxv4260fakedFUygJljPZJfQw",
  authDomain: "web-alford.firebaseapp.com",
  projectId: "web-alford",
  storageBucket: "web-alford.firebasestorage.app",
  messagingSenderId: "399231138143",
  appId: "1:399231138143:web:c3651d82bc0a108984deea",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Anti Spam
let lastSendTime = 0;
const COOLDOWN = 30000; // 30 detik

// =============================================
// 01 — TOMBOL SAPA
// =============================================
document.getElementById("btnSapa").addEventListener("click", function () {
  const pesan = document.getElementById("pesanSapaan");
  const isHidden = pesan.classList.contains("hidden");
  pesan.classList.toggle("hidden");
  this.textContent = isHidden ? "✖ Sembunyikan" : "👋 Sapa Alford!";
});

// =============================================
// 02 — LOGIN GOOGLE
// =============================================
window.loginGoogle = async function () {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      alert("Login gagal: " + err.message);
    }
  }
};

window.logoutGoogle = async function () {
  try {
    await signOut(auth);
  } catch (err) {
    alert("Logout gagal: " + err.message);
  }
};

// =============================================
// 03 — PANTAU STATUS LOGIN
// =============================================
onAuthStateChanged(auth, (user) => {
  const belumLogin = document.getElementById("statusBelumLogin");
  const formMenfess = document.getElementById("formMenfess");
  const namaEl = document.getElementById("namaUser");
  const photoEl = document.getElementById("userPhoto");

  if (user) {
    // Sudah login
    belumLogin.classList.add("hidden");
    formMenfess.classList.remove("hidden");
    namaEl.textContent = user.displayName || user.email;
    if (user.photoURL) {
      photoEl.src = user.photoURL;
      photoEl.style.display = "inline-block";
    } else {
      photoEl.style.display = "none";
    }
  } else {
    // Belum login
    belumLogin.classList.remove("hidden");
    formMenfess.classList.add("hidden");
  }
});

// =============================================
// 04 — KIRIM PESAN KE FIRESTORE
// =============================================
window.kirimPesan = async function () {
  const user = auth.currentUser;
  const isi = document.getElementById("inputPesan").value.trim();
  const btnKirim = document.getElementById("btnKirim");

  if (!user) {
    alert("Kamu belum login!");
    return;
  }
  if (!isi) {
    alert("Pesanmu kosong! Tulis sesuatu dulu ya 😊");
    return;
  }

  const now = Date.now();

  if (now - lastSendTime < COOLDOWN) {
    const sisa = Math.ceil((COOLDOWN - (now - lastSendTime)) / 1000);

    alert(`Tunggu ${sisa} detik sebelum mengirim pesan lagi!`);

    return;
  }

  btnKirim.disabled = true;
  btnKirim.textContent = "⏳ Mengirim...";

  try {
    await addDoc(collection(db, "pesan"), {
      isi: isi,
      timestamp: serverTimestamp(),
    });

    lastSendTime = Date.now();

    document.getElementById("inputPesan").value = "";
    showToast("✅ Pesan berhasil dikirim!");
  } catch (err) {
    alert("Gagal kirim pesan: " + err.message);
    console.error(err);
  }

  btnKirim.disabled = false;
  btnKirim.textContent = "📨 Kirim Pesan";
};

// =============================================
// 05 — LOAD PESAN REALTIME DARI FIRESTORE
// =============================================
function loadPesan() {
  const loadingEl = document.getElementById("loadingPesan");
  const listEl = document.getElementById("listPesan");

  loadingEl.classList.remove("hidden");

  const q = query(collection(db, "pesan"), orderBy("timestamp", "desc"));

  onSnapshot(
    q,
    (snapshot) => {
      loadingEl.classList.add("hidden");
      listEl.innerHTML = "";

      if (snapshot.empty) {
        listEl.innerHTML =
          '<p class="empty-msg">Belum ada pesan. Jadilah yang pertama! 💬</p>';
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "pesan-item show";

        let waktu = "—";
        if (data.timestamp) {
          const d = data.timestamp.toDate();
          waktu =
            d.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }) +
            " " +
            d.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });
        }

        item.innerHTML =
          '<div class="pesan-header">' +
          '<span class="pesan-time">' +
          waktu +
          "</span>" +
          "</div>" +
          '<div class="pesan-isi">' +
          escapeHtml(data.isi) +
          "</div>";

        listEl.appendChild(item);
      });
    },
    (err) => {
      loadingEl.classList.add("hidden");
      listEl.innerHTML =
        '<p class="empty-msg" style="color:#dc2626">❌ Gagal memuat pesan: ' +
        err.message +
        "</p>";
      console.error(err);
    },
  );
}

// =============================================
// 06 — ANIMASI SKILL BAR + INIT
// =============================================
window.addEventListener("load", () => {
  document.querySelectorAll(".skill-fill").forEach((el) => {
    const target = el.getAttribute("data-width") || 0;
    el.style.width = "0%";
    setTimeout(() => {
      el.style.width = target + "%";
    }, 400);
  });

  loadPesan();
});

// =============================================
// HELPER
// =============================================

function showToast(message) {
  const toast = document.getElementById("toastNotif");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.addEventListener("load", () => {

  setTimeout(() => {

    const loader = document.getElementById("loader");

    loader.classList.add("hide");

    document.body.classList.remove("loading");

  }, 4000);

});
document.body.classList.add("loading");

window.addEventListener("load", () => {

  setTimeout(() => {

    document.getElementById("loader")
      .classList.add("hide");

    document.body.classList.remove("loading");

  }, 4000);

});

// =========================
// JARVIS SCROLL REVEAL
// =========================

const cards = document.querySelectorAll(".card");

cards.forEach(card => {
  card.classList.add("reveal");
  card.classList.add("jarvis-card");
});

const observer = new IntersectionObserver((entries)=>{

  entries.forEach(entry=>{

    if(entry.isIntersecting){

      entry.target.classList.add("active");

    }

  });

},{
  threshold:0.15
});

cards.forEach(card=>{
  observer.observe(card);
});

// =========================
// MOBILE PARALLAX
// =========================

if(window.innerWidth <= 768){

  window.addEventListener("scroll",()=>{

    const scrollY = window.scrollY;

    document.querySelectorAll(".card").forEach((card,index)=>{

      const speed = 0.015 + (index * 0.002);

      card.style.transform =
      `translateY(${scrollY * speed}px)`;

    });

  });

}