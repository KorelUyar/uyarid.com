// Runs before the first paint: tells the stylesheet that scripts work, so
// content below the fold may start hidden and be revealed while scrolling.
document.documentElement.classList.add("js");
