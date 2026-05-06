(function () {
  const backToTopButton = document.getElementById("back-to-top");
  if (!backToTopButton) return;

  const prefersReducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const updateVisibility = () => {
    backToTopButton.classList.toggle("is-visible", window.scrollY > 420);
  };

  backToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth"
    });
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();
})();
