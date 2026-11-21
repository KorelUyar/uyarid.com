// Runs before the first paint: tells the stylesheet that scripts work, so the
// pictures of an app may start out of sight and arrive when scrolled to.
document.documentElement.classList.add("js");
// If app.js never starts (blocked, failed to load), show everything anyway.
setTimeout(() => {
  if (!window.uyaridReady) document.documentElement.classList.remove("js");
}, 3000);
// Aced was called Spurt: a link to the old place on the page leads to the new one.
if (location.hash === "#spurt") {
  addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("spurt") && document.getElementById("aced")) location.replace("#aced");
  });
}
