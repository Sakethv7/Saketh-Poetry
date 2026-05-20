(function () {
  const SUPABASE_URL = 'https://vcukqmjzgcinlyelxcju.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdWtxbWp6Z2Npbmx5ZWx4Y2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDExNjEsImV4cCI6MjA5NDg3NzE2MX0.4kxwHUavmRqg89YMPIbwGyCrN9UUlPOyDWYzd0vm80w';

  const slug = window.location.pathname.split('/').pop().replace('.html', '');
  if (!slug) return;

  const LIKED_KEY = 'wp_liked_' + slug;
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };

  async function fetchCount() {
    try {
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/poem_reactions?slug=eq.' + encodeURIComponent(slug) + '&select=hearts',
        { headers }
      );
      const d = await r.json();
      return d[0]?.hearts ?? 0;
    } catch { return null; }
  }

  async function increment() {
    try {
      await fetch(SUPABASE_URL + '/rest/v1/rpc/increment_hearts', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ poem_slug: slug })
      });
    } catch { /* silent fail */ }
  }

  function render(count, liked) {
    const bar  = document.getElementById('reaction-bar');
    if (!bar) return;
    const btn  = bar.querySelector('.heart-btn');
    const num  = bar.querySelector('.heart-count');
    btn.classList.toggle('liked', liked);
    btn.setAttribute('aria-label', liked ? 'You liked this poem' : 'Like this poem');
    num.textContent = count !== null ? count : '—';
  }

  async function init() {
    const liked = !!localStorage.getItem(LIKED_KEY);
    const count = await fetchCount();
    render(count, liked);

    document.getElementById('heart-btn')?.addEventListener('click', async () => {
      if (localStorage.getItem(LIKED_KEY)) return;
      localStorage.setItem(LIKED_KEY, '1');
      const cur = parseInt(document.querySelector('.heart-count').textContent) || 0;
      render(cur + 1, true);
      await increment();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
