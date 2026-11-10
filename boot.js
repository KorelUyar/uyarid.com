// Runs before the first paint: tells the stylesheet that scripts work, so
// content below the fold may start hidden and be revealed while scrolling.
document.documentElement.classList.add("js");
// If the effects never start (blocked, failed to load), show everything anyway.
setTimeout(() => {
  if (!window.uyaridFx) document.documentElement.classList.remove("js");
}, 4000);
