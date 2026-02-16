// 🎯 Search filter for student cards
const searchInput = document.getElementById("search");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const studentCards = document.querySelectorAll(".student-card");

    studentCards.forEach((card) => {
      // Get student name - check multiple possible selectors
      let name = "";
      
      // Try different selectors for the name
      const nameElement = card.querySelector("h4") || 
                         card.querySelector("p.font-semibold") ||
                         card.querySelector("p.font-medium") ||
                         card.querySelector(".student-name");
      
      if (nameElement) {
        name = nameElement.textContent.toLowerCase();
      } else {
        // Fallback to data attribute if no text element found
        name = card.dataset.studentName?.toLowerCase() || 
               card.dataset.name?.toLowerCase() || "";
      }
      
      // Also check student ID
      const idElement = card.querySelector("p.text-xs") ||
                       card.querySelector(".student-id");
      const studentId = idElement ? idElement.textContent.toLowerCase() : "";
      
      // Show card if query matches name OR student ID
      const shouldShow = name.includes(query) || studentId.includes(query);
      
      // Toggle hidden class
      if (shouldShow) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    });
  });
}