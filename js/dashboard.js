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
  const myArea = document.getElementById("my-area");
  const userNameDisplay = document.getElementById("user-name-display");

  // Benutzernamen anzeigen
  if (userNameDisplay) {
    userNameDisplay.textContent = `Willkommen, ${user.email}!`;
  }

  // Mein Bereich - für alle Nutzer
  if (myArea) {
    myArea.classList.remove("hidden");
  }

  // ------------------------
  // Bereich anzeigen & Logik
  // ------------------------
  if (role === "student") {
    studentArea?.classList.remove("hidden");
    
    // Bildergalerie für Schüler
    setupGallery(user);

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

  // ------------------------
  // Bildergalerie Funktionen
  // ------------------------

  async function setupGallery(user) {
    const gallerySection = document.getElementById("student-gallery-section");
    if (!gallerySection) return;

    gallerySection.classList.remove("hidden");
    const uploadForm = document.getElementById("image-upload-form");
    const gallery = document.getElementById("student-gallery");

    // Form submit event
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById("image-input");
      const captionInput = document.getElementById("image-caption");

      if (!fileInput.files[0]) {
        alert("Bitte wähle ein Bild aus");
        return;
      }

      const file = fileInput.files[0];
      const caption = captionInput.value.trim();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      // Bild hochladen
      const { error: uploadError } = await supabase.storage
        .from("user_gallery")
        .upload(fileName, file);

      if (uploadError) {
        alert("Fehler beim Upload: " + uploadError.message);
        console.error(uploadError);
        return;
      }

      // Metadaten in Database speichern
      const { error: dbError } = await supabase.from("user_gallery").insert([{
        user_id: user.id,
        image_filename: fileName,
        caption: caption,
        created_at: new Date().toISOString()
      }]);

      if (dbError) {
        alert("Fehler beim Speichern: " + dbError.message);
        console.error(dbError);
        return;
      }

      alert("Bild erfolgreich hochgeladen!");
      uploadForm.reset();
      await loadGallery(user);
    });

    // Galerie laden
    await loadGallery(user);
  }

  async function loadGallery(user) {
    const gallery = document.getElementById("student-gallery");
    if (!gallery) return;

    const { data, error } = await supabase
      .from("user_gallery")
      .select("id, image_filename, caption, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fehler beim Laden der Galerie:", error);
      return;
    }

    gallery.innerHTML = "";

    for (const item of data) {
      const { data: urlData } = supabase.storage
        .from("user_gallery")
        .getPublicUrl(item.image_filename);

      const galleryItem = document.createElement("div");
      galleryItem.className = "gallery-item";

      const img = document.createElement("img");
      img.src = urlData.publicUrl;
      img.alt = item.caption || "Bild";

      const caption = document.createElement("div");
      caption.className = "gallery-item-caption";
      caption.textContent = item.caption || "(Keine Beschriftung)";

      const dateDiv = document.createElement("div");
      dateDiv.className = "gallery-item-date";
      dateDiv.textContent = new Date(item.created_at).toLocaleDateString("de-DE");

      galleryItem.appendChild(img);
      galleryItem.appendChild(caption);
      galleryItem.appendChild(dateDiv);

      galleryItem.addEventListener("click", () => {
        openImageModal(item.id, urlData.publicUrl, item.caption, user);
      });

      gallery.appendChild(galleryItem);
    }
  }

  function openImageModal(imageId, imageUrl, caption, user) {
    // Modal erstellen
    let modal = document.getElementById("image-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "image-modal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }

    const modalContent = `
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <img src="${imageUrl}" alt="Bild" class="modal-image">
        <div class="modal-caption">${caption || "(Keine Beschriftung)"}</div>
        <div class="modal-date">${new Date().toLocaleDateString("de-DE")}</div>
        <div class="modal-actions">
          <button class="modal-delete-btn" id="delete-image-btn">Löschen</button>
        </div>
        <div class="comments-section">
          <div class="comments-title">Kommentare</div>
          <form id="comment-form" class="comment-form">
            <input type="text" class="comment-input" placeholder="Schreibe einen Kommentar..." id="comment-text">
            <button type="submit" class="comment-submit">Posten</button>
          </form>
          <div id="comments-list" class="comments-list"></div>
        </div>
      </div>
    `;

    modal.innerHTML = modalContent;
    modal.classList.add("show");

    // Close button
    document.querySelector(".modal-close").addEventListener("click", () => {
      modal.classList.remove("show");
    });

    // Delete button
    document.getElementById("delete-image-btn").addEventListener("click", async () => {
      if (confirm("Möchtest du dieses Bild wirklich löschen?")) {
        // Get filename from database first
        const { data: imageData } = await supabase
          .from("user_gallery")
          .select("image_filename")
          .eq("id", imageId)
          .single();

        // Delete image from storage
        if (imageData?.image_filename) {
          await supabase.storage.from("user_gallery").remove([imageData.image_filename]);
        }

        // Delete from database
        await supabase.from("user_gallery").delete().eq("id", imageId);

        // Delete comments
        await supabase.from("gallery_comments").delete().eq("gallery_id", imageId);

        alert("Bild wurde gelöscht!");
        modal.classList.remove("show");
        await loadGallery(user);
      }
    });

    // Load comments
    loadComments(imageId, user);

    // Comment form
    document.getElementById("comment-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const commentText = document.getElementById("comment-text").value.trim();

      if (!commentText) {
        alert("Bitte schreibe einen Kommentar");
        return;
      }

      const { error } = await supabase.from("gallery_comments").insert([{
        gallery_id: imageId,
        user_id: user.id,
        comment_text: commentText,
        created_at: new Date().toISOString()
      }]);

      if (error) {
        console.error("Fehler beim Speichern des Kommentars:", error);
        return;
      }

      document.getElementById("comment-text").value = "";
      await loadComments(imageId, user);
    });

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.remove("show");
      }
    });
  }

  async function loadComments(imageId, user) {
    const { data, error } = await supabase
      .from("gallery_comments")
      .select("id, user_id, comment_text, created_at")
      .eq("gallery_id", imageId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fehler beim Laden der Kommentare:", error);
      return;
    }

    const commentsList = document.getElementById("comments-list");
    commentsList.innerHTML = "";

    for (const comment of data) {
      const commentDiv = document.createElement("div");
      commentDiv.className = "comment-item";

      const authorDiv = document.createElement("div");
      authorDiv.className = "comment-author";
      authorDiv.textContent = comment.user_id === user.id ? "Du" : comment.user_id;

      const dateDiv = document.createElement("div");
      dateDiv.className = "comment-date";
      dateDiv.textContent = new Date(comment.created_at).toLocaleString("de-DE");

      const textDiv = document.createElement("div");
      textDiv.className = "comment-text";
      textDiv.textContent = comment.comment_text;

      const deleteDiv = document.createElement("div");
      deleteDiv.className = "comment-delete";
      deleteDiv.textContent = "Löschen";

      if (comment.user_id === user.id) {
        deleteDiv.style.display = "none";
        deleteDiv.addEventListener("click", async () => {
          if (confirm("Möchtest du diesen Kommentar löschen?")) {
            await supabase.from("gallery_comments").delete().eq("id", comment.id);
            await loadComments(imageId, user);
          }
        });
        commentDiv.appendChild(deleteDiv);
      }

      commentDiv.appendChild(authorDiv);
      commentDiv.appendChild(dateDiv);
      commentDiv.appendChild(textDiv);

      commentsList.appendChild(commentDiv);
    }
  }


});

