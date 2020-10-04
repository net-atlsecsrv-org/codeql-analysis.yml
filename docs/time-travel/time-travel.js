/**
 * compile with `babel`, sourcemap inline & preset `babel-preset-env`.
 */
const timeTravel = async () => {
  class Toast {
    constructor(parent) {
      const $parent = parent || document.body;
      const $toast = document.createElement("div");

      $toast.classList.add("toast", "js-inactive");
      $toast.id = "js-toast";
      $parent.appendChild($toast);

      this.toast = $toast;
      this.currentTimer = null;
    }
    show(msg, typeClass) {
      const $toast = this.toast;
      $toast.classList.remove("js-inactive");

      setTimeout(() => {
        $toast.textContent = msg;
        $toast.classList.add(typeClass, "js-active");
      }, 16);
    }
    hide(typeClass) {
      const $toast = this.toast;
      $toast.classList.remove(typeClass, "js-active");

      setTimeout(() => {
        $toast.classList.add("js-inactive");
        $toast.textContent = "";
      }, 300);
    }
    send(options) {
      if (!!this.currentTimer) clearTimeout(this.currentTimer);

      const _options = Object.assign(
        { duration: 2000, type: "default" },
        options
      );
      const { msg, type, duration } = _options;
      if (typeof msg !== "string") {
        console.error(
          `Error: in \`sendToast({msg, duration})\`,\`msg\` has to be a string. Got ${msg} instead`
        );
        return;
      }
      if (typeof duration !== "number") {
        console.error(
          `Error: in \`sendToast({msg, duration})\`,\`duration\` has to be a number. Got ${duration} instead`
        );
        return;
      }

      const typeClass = `toast--${type}`;
      this.show(msg, typeClass);

      this.currentTimer = setTimeout(() => {
        this.hide(typeClass);
      }, duration);
    }
  }

  class DisplayCount {
    constructor(length = 0) {
      this.max = length - 1;
      this.count = this.max;
    }
    validate(v) {
      const parsedV = parseInt(v, 10);
      if (isNaN(parsedV)) {
        console.warn(
          `DisplayCount: invalid value (${v} has to be a finite number.)`
        );
        return this.max;
      }
      return parsedV;
    }
    reset() {
      this.count = 0;
      return this.count;
    }
    maximize() {
      this.count = this.max;
      return this.count;
    }
    limit(v) {
      v = this.validate(v);
      if (v > this.max) v = this.max;
      if (v < 0) v = 0;
      return v;
    }
    add(v = 0) {
      v = this.validate(v);
      this.count = this.limit(this.count + v);
      return this.count;
    }
    jumpTo(v) {
      v = this.validate(v);
      this.count = this.limit(v);
      return this.count;
    }
    isFirst() {
      return this.count === 0;
    }
    isLast() {
      return this.count === this.max;
    }
  }

  const getPullRequests = () =>
    fetch("./index.json")
      .then(res => res.json())
      .then(res => res.data.repository.pullRequests.edges)
      .catch(err => console.warn(err));

  const getEl = id => document.getElementById(id);

  const $buttonFirst = getEl("js-button-first");
  const $buttonNext = getEl("js-button-next");
  const $buttonPrevious = getEl("js-button-previous");
  const $buttonLast = getEl("js-button-last");

  const $display = getEl("js-display");
  const $history = getEl("js-history");
  const $historyId = getEl("js-history-id");
  const $historyMax = getEl("js-history-max");

  const $prTitle = getEl("js-pr-title");
  const $prAuthor = getEl("js-pr-author");
  const $prAuthorAvatar = getEl("js-pr-author-avatar");
  const $prEditor = getEl("js-pr-editor");
  const $prEditorAvatar = getEl("js-pr-editor-avatar");
  const $prMergedAt = getEl("js-pr-mergedAt");
  const $prUrl = getEl("js-pr-url");

  const onKeyPress = (key, callback) => {
    window.addEventListener("keyup", e => {
      if (e.key === key) {
        callback();
      }
    });
    return callback;
  };

  // handle links inside iframe
  const handleInnerLinks = iframe => {
    iframe.onload = () => {
      const iframeDoc = iframe.contentWindow.document || iframe.contentDocument;
      const innerLinks = Array.from(iframeDoc.querySelectorAll("a"));

      if (innerLinks.length === 0) return;

      innerLinks.forEach($link => {
        // disable time travel
        if ($link.href.includes("time-travel")) {
          $link.onclick = e => {
            e.preventDefault();

            toast.send({
              msg: `⚠️ Can't time travel while traveling time.`,
              type: `warning`,
              duration: 3000
            });
          };
        }
        // open external link in a new browser window
        if ($link.href.includes("http")) {
          $link.setAttribute("target", "_blank");
        }
      });
    };
  };

  const updateDisplay = count => {
    const pr = pullRequests[count];
    const { id, title, author, editor, mergedAt, url } = pr.node;

    // https://stackoverflow.com/a/2257295
    $display.contentWindow.location.replace(`./history/${id}/docs/`);
    handleInnerLinks($display);

    $historyId.textContent = count + 1;
    $prTitle.textContent = title;

    $prAuthor.textContent = author.login;
    $prAuthorAvatar.src = author.avatarUrl;
    $prAuthorAvatar.setAttribute("alt", `Author: ${author.login}`);

    if (editor) {
      $prEditor.textContent = editor && editor.login;
      $prEditorAvatar.src = editor.avatarUrl;
      $prAuthorAvatar.setAttribute("alt", `Author: ${author.login}`);
    } else {
      $prEditor.textContent = "No editor";
      $prEditorAvatar.src = "";
      $prAuthorAvatar.setAttribute("alt", `No editor`);
    }

    $prMergedAt.textContent = `Merged at ${mergedAt}`;
    $prUrl.href = url;
  };

  const updateHashURL = hash => {
    window.history.pushState(null, null, `#${hash + 1}`);
  };

  const updateView = currentCount => {
    updateHashURL(currentCount);
    updateDisplay(currentCount);
  };

  const pullRequests = await getPullRequests();
  const count = new DisplayCount(pullRequests.length);

  // get hash link
  const getHashCount = () => {
    if (window.location.hash) return window.location.hash.split("#")[1];
    return null;
  };
  // pop back
  window.onpopstate = () => {
    console.log(`state popped: ${window.location.hash}`);
    updateDisplay(count.jumpTo(getHashCount()));
  };

  // start
  $historyMax.textContent = count.max + 1;
  updateView(count.jumpTo(getHashCount()));

  // placeholder for toast
  toast = new Toast($history);

  // button control
  $buttonFirst.onclick = () => {
    if (!count.isFirst()) {
      updateView(count.reset());
    }
  };
  $buttonPrevious.onclick = onKeyPress("ArrowLeft", () => {
    if (!count.isFirst()) {
      updateView(count.add(-1));
    }
  });
  $buttonNext.onclick = onKeyPress("ArrowRight", () => {
    if (!count.isLast()) {
      updateView(count.add(1));
    }
  });
  $buttonLast.onclick = () => {
    if (!count.isLast()) {
      updateView(count.maximize());
    }
  };
};

window.onload = timeTravel; deactivate
