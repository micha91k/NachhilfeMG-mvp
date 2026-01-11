const role = localStorage.getItem("userRole");

const studentArea = document.getElementById("student-area");
const teacherArea = document.getElementById("teacher-area");
const logoutBtn = document.getElementById("logout");

if (!role) {
  window.location.href = "login.html";
}

if (role === "student") {
  studentArea.classList.remove("hidden");
}

if (role === "teacher") {
  teacherArea.classList.remove("hidden");
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("userRole");
  window.location.href = "index.html";
});
