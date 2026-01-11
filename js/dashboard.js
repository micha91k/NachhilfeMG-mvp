import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const user = session.user;

  // Rolle abfragen
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = roleData?.role || "student";

  const studentArea = document.getElementById("student-area");
  const teacherArea = document.getElementById("teacher-area");

  // ------------------------
  // Bereich anzeigen & Logik
  // ------------------------
  if (role === "student") {
    studentArea?.classList.remove("hidden");

    // Terminbuchung
    const bookingForm = document.getElementById("booking-form");
    bookingForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const subject = bookingForm.querySelector("select").value;
      const datetime = bookingForm.querySelector("input[type=datetime-local]").value;
      if (!datetime) { alert("Bitte Datum und Uhrzeit auswählen"); return; }

      const { error } = await supabase.from("appointments").insert([
        { student_id: user.id, subject, datetime }
      ]);

      if (error) { alert("Fehler beim Buchen"); console.error(error); return; }
      alert("Termin erfolgreich gebucht!");
      bookingForm.reset();
    });

    // Videos laden
    if (document.getElementById("video-list")) loadStudentVideos();

  } else if (role === "teacher") {
    teacherArea?.classList.remove("hidden");

    if (document.getElementById("teacher-video-list")) loadTeacherVideos();
    if (document.getElementById("upload-form")) setupUploadForm();
    if (document.getElementById("teacher-appointments")) loadTeacherAppointments();
  }

  // ------------------------
  // Logout
  // ------------------------
  document.getElementById("logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  // ------------------------
  // Funktionen für Videos & Termine
  // ------------------------

  async function loadStudentVideos() {
    const { data, error } = await supabase.storage.from("videos").list("", { limit: 100 });
    if (error) return console.error(error);

    const freeList = document.getElementById("free-video-list");
    const exclusiveList = document.getElementById("exclusive-video-list");
    freeList.innerHTML = "";
    exclusiveList.innerHTML = "";

    for (const file of data) {
      const { publicUrl } = supabase.storage.from("videos").getPublicUrl(file.name);
      const li = document.createElement("li");
      li.innerHTML = `<a href="${publicUrl}" target="_blank">${file.name}</a>`;

      // Naming convention: filenames starting with "public_" or "free_" are shown as free content;
      // others (e.g. prefixed with "private_" or "members_") are exclusive.
      const lower = file.name.toLowerCase();
      if (lower.startsWith("public_") || lower.startsWith("free_") || lower.includes("sample")) {
        freeList.appendChild(li);
      } else {
        exclusiveList.appendChild(li);
      }
    }

    // If exclusive list is empty, hide the heading to avoid empty section
    if (exclusiveList.children.length === 0) {
      exclusiveList.previousElementSibling && (exclusiveList.previousElementSibling.style.display = "none");
    }
  }

  async function loadTeacherVideos() {
    const { data, error } = await supabase.storage.from("videos").list("", { limit: 100 });
    if (error) return console.error(error);

    const teacherList = document.getElementById("teacher-video-list");
    teacherList.innerHTML = "";
    for (const file of data) {
      const { publicUrl } = supabase.storage.from("videos").getPublicUrl(file.name);
      const li = document.createElement("li");
      li.innerHTML = `<a href="${publicUrl}" target="_blank">${file.name}</a>`;
      teacherList.appendChild(li);
    }
  }

  function setupUploadForm() {
    const form = document.getElementById("upload-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = form.querySelector("input[type=text]");
      const fileInput = form.querySelector("input[type=file]");
      if (!fileInput.files[0]) return alert("Bitte eine Datei auswählen");

      const file = fileInput.files[0];
      const { error } = await supabase.storage.from("videos").upload(file.name, file, { upsert: true });
      if (error) { alert("Upload fehlgeschlagen"); console.error(error); return; }

      alert("Upload erfolgreich!");
      loadTeacherVideos();
    });
  }

  async function loadTeacherAppointments() {
    const { data, error } = await supabase
      .from("appointments")
      .select(`id, student_id, subject, datetime`)
      .order("datetime", { ascending: true });

    if (error) return console.error(error);

    const appointmentsDiv = document.getElementById("teacher-appointments");
    appointmentsDiv.innerHTML = "";
    data.forEach((appt) => {
      const div = document.createElement("div");
      div.textContent = `Student ID: ${appt.student_id}, Fach: ${appt.subject}, Datum: ${new Date(appt.datetime).toLocaleString()}`;
      appointmentsDiv.appendChild(div);
    });
  }

});
