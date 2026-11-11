// Runs before the first paint: tells the stylesheet that scripts work, so the
// pictures of an app may start out of sight and arrive when scrolled to.
document.documentElement.classList.add("js");
// If app.js never starts (blocked, failed to load), show everything anyway.
setTimeout(() => {
  if (!window.uyaridReady) document.documentElement.classList.remove("js");
}, 3000);
