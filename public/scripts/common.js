window.addEventListener('load', () => {
  // anti spam protection
  document
    .getElementById('phone')
    .setAttribute('href', 'https://wa.me/1111111111');

  // smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();

      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth',
      });
    });
  });
});
