(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const items = document.querySelectorAll('.poem-metadata, .stanza, .divider, footer');

  items.forEach(el => {
    el.style.opacity = '0';
    if (!el.classList.contains('divider')) {
      el.style.transform = 'translateY(36px)';
    }
    el.style.transition = 'opacity 0.9s ease, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      observer.unobserve(el);
    });
  }, { threshold: 0.12 });

  items.forEach(el => observer.observe(el));
})();
