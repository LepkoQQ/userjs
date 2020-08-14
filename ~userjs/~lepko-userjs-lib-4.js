const _ = {
  nodeText(element) {
    const arr = [];
    Array.from(element.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        arr.push(node.textContent);
      }
    });
    return arr.join("");
  },
  toBase64(string) {
    return window.btoa.call(window, encodeURIComponent(string).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(`0x${p1}`)));
  },
  cleanSplit(string) {
    return string.trim().split(/\s+/);
  },
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },
  cleanArray(arr) {
    return arr.filter(e => e !== undefined && e !== null && e !== "" && (typeof e !== "number" || !isNaN(e)));
  },
  onChangeURL(callback, { ignoreHash = false, interval = 250 } = {}) {
    let currentURL = ignoreHash ? window.location.href.split("#")[0] : window.location.href;
    function checkURL() {
      const newURL = ignoreHash ? window.location.href.split("#")[0] : window.location.href;
      if (newURL !== currentURL) {
        currentURL = ignoreHash ? window.location.href.split("#")[0] : window.location.href;
        callback();
      }
    }
    // window.addEventListener("popstate", checkURL);
    window.setInterval(checkURL, interval);
  },
};
