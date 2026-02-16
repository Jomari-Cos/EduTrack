  const openBtn = document.getElementById("openStudentsModal");
  const closeBtn = document.getElementById("closeStudentsModal");
  const modal = document.getElementById("studentsModal");

  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  });

  // Close when clicking outside the modal
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  });