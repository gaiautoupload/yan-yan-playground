window.YanFamilyPhotos=[{"id":"petshop","name":"🐶 寵物店","puzzle":"./assets/petshop-puzzle.avif","scene":"./assets/petshop-scene.avif"},{"id":"playground","name":"🛝 公園探險","puzzle":"./assets/playground-puzzle.avif","scene":"./assets/playground-scene.avif"},{"id":"restaurant","name":"🍝 親子餐廳","puzzle":"./assets/restaurant-puzzle.avif","scene":"./assets/restaurant-scene.avif"},{"id":"bedtime","name":"📖 睡前故事","puzzle":"./assets/bedtime-puzzle.avif","scene":"./assets/bedtime-scene.avif"},{"id":"school","name":"🎒 上學準備","puzzle":"./assets/school-puzzle.avif","scene":"./assets/school-scene.avif"},{"id":"swing","name":"🎠 公園盪鞦韆","puzzle":"./assets/swing-puzzle.avif","scene":"./assets/swing-scene.avif"},{"id":"picnic","name":"🐶🐱 寵物野餐","puzzle":"./assets/picnic-puzzle.avif","scene":"./assets/picnic-scene.avif"}];

;(() => {
  'use strict';
  // If a device cannot decode one of the 14 family AVIF photos, keep its game usable.
  const familyAvif = /\/assets\/(?:petshop|playground|restaurant|bedtime|school|swing|picnic)-(puzzle|scene)\.avif(?:[?#]|$)/i;
  document.addEventListener('error', (event) => {
    const image = event.target;
    if (!image || image.tagName !== 'IMG' || image.dataset.yanFamilyFallback === '1') return;
    const url = image.currentSrc || image.getAttribute('src') || image.src || '';
    const found = familyAvif.exec(url);
    if (!found) return;
    image.dataset.yanFamilyFallback = '1';
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    if (image.parentElement && image.parentElement.tagName === 'PICTURE') {
      for (const source of image.parentElement.querySelectorAll('source[type="image/avif"]')) source.remove();
    }
    image.src = found[1].toLowerCase() === 'puzzle'
      ? './assets/family-play-puzzle.webp'
      : './assets/family-play.webp';
  }, true);
})();
