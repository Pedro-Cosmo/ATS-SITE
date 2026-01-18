document.addEventListener('DOMContentLoaded', () => {
  const includes = document.querySelectorAll('[data-include]');

  includes.forEach(async (el) => {
    const path = el.getAttribute('data-include');
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Failed to fetch ${path}`);
      const text = await res.text();
      el.innerHTML = text;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Include error:', path, err);
    }
  });
});
