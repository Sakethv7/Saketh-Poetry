(function () {
  var nav = document.querySelector('.poem-nav');
  if (!nav || !window.POEMS) return;

  var slug = location.pathname.split('/').pop().replace('.html', '');
  var idx  = window.POEMS.findIndex(function (p) { return p.slug === slug; });
  if (idx === -1) return;

  var links = nav.querySelectorAll('a');
  var prevA = links[0];
  var nextA = links[1];

  if (idx === 0) {
    prevA.style.visibility = 'hidden';
  } else {
    prevA.href        = window.POEMS[idx - 1].slug + '.html';
    prevA.textContent = '← ' + window.POEMS[idx - 1].title;
  }

  if (idx === window.POEMS.length - 1) {
    nextA.style.visibility = 'hidden';
  } else {
    nextA.href        = window.POEMS[idx + 1].slug + '.html';
    nextA.textContent = window.POEMS[idx + 1].title + ' →';
  }
})();
