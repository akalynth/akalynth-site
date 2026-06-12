/*
 * Akalynth community forum — READ-ONLY PREVIEW.
 *
 * Boundary: this static site does not own forum authority. Seed boards/threads
 * below are read-only in-world flavour authored as lore figures. Posting stays
 * disabled until a server-backed account-character forum API exists.
 *
 * Identity: reading is public. Posting requires future server account-character
 * authority and is intentionally unavailable here.
 *
 * Security: posts are free user text. ALL user/author strings reach the DOM via
 * textContent only — never innerHTML — so post content cannot inject markup.
 *
 * Loaded only on forum.html, after js/app.js (which owns the shared chrome).
 */
(function () {
  "use strict";

  var root = null;

  var WORLD_NAMES = { azura: "High City", rookhold: "Rookguard", emberfell: "Emberfell" };
  function worldNameOf(id) { return WORLD_NAMES[id] || "the realm"; }

  // ---- Boards (static, original Akalynth) ----------------------------------
  var BOARDS = [
    { id: "azura-square", name: "The High City Square",
      desc: "General talk for the realm — news, first impressions, and notices from the city." },
    { id: "world-azura", name: "High City Board",
      desc: "Players gathering in High City: meetups, sightings, and stories from the open city." },
    { id: "plots-trade", name: "Plots & Trade",
      desc: "The House Plots below the Guild Hall, and trading in in-game gold between characters." },
    { id: "guild-hall", name: "The Guild Hall",
      desc: "Forming guilds, finding members, and planning gatherings in the hall that waits for one." },
    { id: "wardens-help", name: "Wardens' Help Desk",
      desc: "New to Rookguard? Ask the Wardens (and other players) how the realm works." },
    { id: "the-tavern", name: "The Tavern",
      desc: "Off-topic and tales by the fire. Tem keeps the bots out; you keep it friendly." }
  ];
  var boardById = {};
  BOARDS.forEach(function (b) { boardById[b.id] = b; });

  // ---- Seed threads (read-only, locked, authored as lore figures) ----------
  function seedPost(id, name, world, role, body, at) {
    return { id: id, authorName: name, authorWorld: world, role: role, body: body, createdAt: at };
  }
  var SEED_THREADS = [
    { id: "seed-1", boardId: "azura-square", title: "Welcome to the High City Square",
      authorName: "Chronicler Veyl", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-05-28T09:00:00.000Z",
      posts: [ seedPost("seed-1-1", "Chronicler Veyl", "azura", "Chronicler",
        "These boards are a quiet corner of the realm — a place to leave word for travellers who come after you. Read freely; when you carry a character, you may add your own voice.",
        "2026-05-28T09:00:00.000Z") ] },
    { id: "seed-2", boardId: "azura-square", title: "Notices from the city",
      authorName: "Warden Ashpenny", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-06-01T12:00:00.000Z",
      posts: [ seedPost("seed-2-1", "Warden Ashpenny", "azura", "Warden",
        "The gate to High City opens for any who clear the keep at Rookguard. If the road feels strange at first, the Wardens are watching — not judging.",
        "2026-06-01T12:00:00.000Z") ] },

    { id: "seed-3", boardId: "world-azura", title: "Sightings on the open road",
      authorName: "Wanderer Pell", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-05-30T18:30:00.000Z",
      posts: [ seedPost("seed-3-1", "Wanderer Pell", "azura", "Wayfarer",
        "Saw a lantern burning at the plaza past dusk and no one tending it. High City keeps its small mysteries.",
        "2026-05-30T18:30:00.000Z") ] },
    { id: "seed-4", boardId: "world-azura", title: "Meet at the fountain",
      authorName: "Tavernkeep Moll", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-06-02T20:00:00.000Z",
      posts: [
        seedPost("seed-4-1", "Tavernkeep Moll", "azura", "Tavernkeep",
          "When there are enough of us, we gather at the plaza fountain. Standing still is its own kind of adventure here.",
          "2026-06-02T20:00:00.000Z"),
        seedPost("seed-4-2", "Wanderer Pell", "azura", "Wayfarer",
          "I'll bring the lantern. Someone has to keep it lit.",
          "2026-06-02T21:15:00.000Z") ] },

    { id: "seed-5", boardId: "plots-trade", title: "The plots below the Guild Hall",
      authorName: "Steward Calder", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-05-27T10:00:00.000Z",
      posts: [ seedPost("seed-5-1", "Steward Calder", "azura", "Steward",
        "Three plots are marked along the residential row, still without owners. When trade opens between characters, this is where word will be left.",
        "2026-05-27T10:00:00.000Z") ] },
    { id: "seed-6", boardId: "plots-trade", title: "On in-game gold",
      authorName: "Steward Calder", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-05-29T14:00:00.000Z",
      posts: [ seedPost("seed-6-1", "Steward Calder", "azura", "Steward",
        "Gold earned in the world is the realm's coin. What changes hands here will be plots and goods — never advantage.",
        "2026-05-29T14:00:00.000Z") ] },

    { id: "seed-7", boardId: "guild-hall", title: "A hall that waits for a guild",
      authorName: "Chronicler Veyl", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-05-26T08:00:00.000Z",
      posts: [ seedPost("seed-7-1", "Chronicler Veyl", "azura", "Chronicler",
        "The Guild Hall stands with its doors shut, raised before there were guilds to fill it. Leave word here if you would gather others.",
        "2026-05-26T08:00:00.000Z") ] },
    { id: "seed-8", boardId: "guild-hall", title: "Looking for fellow travellers",
      authorName: "Wanderer Pell", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-06-03T16:00:00.000Z",
      posts: [ seedPost("seed-8-1", "Wanderer Pell", "azura", "Wayfarer",
        "No guild yet, only the wish for one. If you read this and feel the same, the hall is a good place to begin.",
        "2026-06-03T16:00:00.000Z") ] },

    { id: "seed-9", boardId: "wardens-help", title: "New to Rookguard? Start here",
      authorName: "Warden Ashpenny", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-05-25T11:00:00.000Z",
      posts: [
        seedPost("seed-9-1", "Warden Ashpenny", "azura", "Warden",
          "The keep teaches three things — to move, to speak, and to answer Tem. Pass them and the gate opens. Ask here if any step puzzles you.",
          "2026-05-25T11:00:00.000Z"),
        seedPost("seed-9-2", "Chronicler Veyl", "azura", "Chronicler",
          "And once you are through, the Legend Stone remembers what you do. No hurry — the realm keeps its hours.",
          "2026-05-25T13:30:00.000Z") ] },
    { id: "seed-10", boardId: "wardens-help", title: "Who is Tem?",
      authorName: "Warden Ashpenny", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-05-31T09:30:00.000Z",
      posts: [ seedPost("seed-10-1", "Warden Ashpenny", "azura", "Warden",
        "Tem is the realm's guardian against bots — a friendly challenge at the keep, no more. Humans, not machines, earn what High City offers.",
        "2026-05-31T09:30:00.000Z") ] },

    { id: "seed-11", boardId: "the-tavern", title: "Tales by the fire",
      authorName: "Tavernkeep Moll", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-05-24T19:00:00.000Z",
      posts: [ seedPost("seed-11-1", "Tavernkeep Moll", "azura", "Tavernkeep",
        "Pull up a chair. The Tavern is for the off-topic and the unhurried — stories, jokes, and quiet company. Keep it kind.",
        "2026-05-24T19:00:00.000Z") ] },
    { id: "seed-12", boardId: "the-tavern", title: "What brought you to High City?",
      authorName: "Tavernkeep Moll", authorWorld: "azura", isSeed: true, locked: true,
      createdAt: "2026-06-02T22:00:00.000Z",
      posts: [ seedPost("seed-12-1", "Tavernkeep Moll", "azura", "Tavernkeep",
        "Everyone arrives for a different reason. Mine was the lantern light on the water. What was yours?",
        "2026-06-02T22:00:00.000Z") ] }
  ];

  // ---- Read-only state -----------------------------------------------------
  function loadForum() {
    return { version: 1, threads: [] };
  }
  function saveForum(state) {
    void state;
  }
  function clearMyPosts() {
    return;
  }
  function forumAccount() {
    return null;
  }

  // ---- Derived helpers ------------------------------------------------------
  function allThreads(state) { return SEED_THREADS.concat(state.threads); }
  function lastPostTime(t) {
    return t.posts.length
      ? new Date(t.posts[t.posts.length - 1].createdAt).getTime()
      : new Date(t.createdAt).getTime();
  }
  function threadsForBoard(boardId, state) {
    var list = allThreads(state).filter(function (t) { return t.boardId === boardId; });
    list.sort(function (a, b) {
      var ap = a.isSeed ? 1 : 0, bp = b.isSeed ? 1 : 0;
      if (ap !== bp) return bp - ap;               // pinned (seed) first
      return lastPostTime(b) - lastPostTime(a);    // then most recent activity
    });
    return list;
  }
  function boardThreadCount(boardId, state) {
    return allThreads(state).filter(function (t) { return t.boardId === boardId; }).length;
  }
  function boardPostCount(boardId, state) {
    return allThreads(state).filter(function (t) { return t.boardId === boardId; })
      .reduce(function (s, t) { return s + t.posts.length; }, 0);
  }
  function boardLastThread(boardId, state) {
    var list = allThreads(state).filter(function (t) { return t.boardId === boardId; });
    if (!list.length) return null;
    list.sort(function (a, b) { return lastPostTime(b) - lastPostTime(a); });
    return list[0];
  }
  function roleLine(post) {
    var w = worldNameOf(post.authorWorld);
    return post.role ? (post.role + " · " + w) : ("Citizen of " + w);
  }
  function relativeTime(iso) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "";
    var s = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (s < 60) return "just now";
    var m = Math.floor(s / 60); if (m < 60) return m + (m === 1 ? " minute" : " minutes") + " ago";
    var h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? " hour" : " hours") + " ago";
    var d = Math.floor(h / 24); if (d < 30) return d + (d === 1 ? " day" : " days") + " ago";
    var mo = Math.floor(d / 30); if (mo < 12) return mo + (mo === 1 ? " month" : " months") + " ago";
    var y = Math.floor(mo / 12); return y + (y === 1 ? " year" : " years") + " ago";
  }

  // ---- DOM helpers (text-only; user strings never touch innerHTML) ---------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function breadcrumb(items) {
    var nav = el("nav", "forum-crumbs");
    nav.setAttribute("aria-label", "Breadcrumb");
    items.forEach(function (it, idx) {
      if (idx > 0) nav.appendChild(document.createTextNode(" / "));
      if (it.href) { var a = el("a", null, it.text); a.href = it.href; nav.appendChild(a); }
      else nav.appendChild(el("span", "crumb-current", it.text));
    });
    return nav;
  }
  function signInPrompt(lead) {
    var wrap = el("article", "parchment forum-signin");
    wrap.appendChild(el("p", "lede", lead));
    var p = el("p", null, "Posting will require a server-backed account character once forum authority exists. ");
    var a = el("a", null, "Create your character"); a.href = "account.html";
    p.appendChild(a);
    wrap.appendChild(p);
    return wrap;
  }
  function boardHref(id) { return "forum.html?board=" + encodeURIComponent(id); }
  function threadHref(boardId, threadId) {
    return "forum.html?board=" + encodeURIComponent(boardId) + "&thread=" + encodeURIComponent(threadId);
  }

  // ---- Mutations ------------------------------------------------------------
  function createThread(boardId, title, body) {
    void boardId; void title; void body;
    return "Forum posting is read-only until server-backed account-character posting exists.";
  }
  function addReply(boardId, threadId, body) {
    void boardId; void threadId; void body;
    return "Forum replies are read-only until server-backed account-character posting exists.";
  }

  // ---- Rendering ------------------------------------------------------------
  function postNode(post) {
    var wrap = el("article", "post");
    var sig = el("div", "post-sig");
    sig.appendChild(el("span", "sig-name", post.authorName));
    sig.appendChild(el("span", "sig-role", roleLine(post)));
    wrap.appendChild(sig);
    wrap.appendChild(el("div", "post-time", relativeTime(post.createdAt)));
    wrap.appendChild(el("div", "post-body", post.body));
    return wrap;
  }

  function renderBoardIndex() {
    clear(root);
    var state = loadForum();
    root.appendChild(el("h1", "page-title", "The Community Boards"));
    var intro = el("article", "parchment");
    intro.appendChild(el("p", "lede",
      "Boards for High City and the wider Akalynth preview. Read freely; posting waits for server-backed account-character authority."));
    root.appendChild(intro);

    var list = el("div", "forum-board-list");
    BOARDS.forEach(function (b) {
      var row = el("div", "forum-board-row");
      var main = el("div", "forum-board-main");
      var nameA = el("a", "forum-board-name", b.name); nameA.href = boardHref(b.id);
      main.appendChild(nameA);
      main.appendChild(el("p", "forum-board-desc", b.desc));
      row.appendChild(main);

      var meta = el("div", "forum-board-meta");
      meta.appendChild(el("div", "forum-board-stats",
        boardThreadCount(b.id, state) + " threads · " + boardPostCount(b.id, state) + " posts"));
      var lt = boardLastThread(b.id, state);
      if (lt) {
        var lp = lt.posts[lt.posts.length - 1];
        meta.appendChild(el("div", "forum-last", "Last: " + lp.authorName + " · " + relativeTime(lp.createdAt)));
      }
      row.appendChild(meta);
      list.appendChild(row);
    });
    root.appendChild(list);

  }

  function renderBoardView(boardId) {
    var board = boardById[boardId];
    if (!board) return renderBoardIndex();
    clear(root);
    var state = loadForum();
    root.appendChild(breadcrumb([{ text: "Community Boards", href: "forum.html" }, { text: board.name }]));
    root.appendChild(el("h1", "page-title", board.name));

    var head = el("article", "parchment");
    head.appendChild(el("p", "lede", board.desc));
    var actions = el("div", "forum-actions");
    var nt = el("button", "btn btn-ghost", "Posting disabled");
    nt.type = "button";
    nt.disabled = true;
    actions.appendChild(nt);
    head.appendChild(actions);
    root.appendChild(head);

    var threads = threadsForBoard(boardId, state);
    if (!threads.length) {
      root.appendChild(el("article", "parchment", "No threads yet. Posting requires future server-backed forum authority."));
      return;
    }
    var list = el("div", "forum-thread-list");
    threads.forEach(function (t) {
      var row = el("div", "forum-thread-row");
      var main = el("div", "forum-thread-main");
      var pills = el("div", "forum-pills");
      if (t.isSeed) {
        pills.appendChild(el("span", "forum-pill pill-pinned", "Pinned"));
        pills.appendChild(el("span", "forum-pill pill-locked", "Locked"));
      }
      if (t.posts.length >= 5) pills.appendChild(el("span", "forum-pill pill-hot", "Hot"));
      if (pills.childNodes.length) main.appendChild(pills);
      var titleA = el("a", "thread-title", t.title); titleA.href = threadHref(boardId, t.id);
      main.appendChild(titleA);
      main.appendChild(el("div", "thread-meta", "by " + t.authorName + " · " + worldNameOf(t.authorWorld)));
      row.appendChild(main);

      var side = el("div", "forum-thread-side");
      var replies = t.posts.length - 1;
      side.appendChild(el("div", "thread-replies", replies + (replies === 1 ? " reply" : " replies")));
      var lp = t.posts[t.posts.length - 1];
      side.appendChild(el("div", "thread-last", "Last: " + lp.authorName + " · " + relativeTime(lp.createdAt)));
      row.appendChild(side);
      list.appendChild(row);
    });
    root.appendChild(list);
  }

  function renderThreadView(boardId, threadId) {
    var board = boardById[boardId];
    if (!board) return renderBoardIndex();
    var state = loadForum();
    var all = allThreads(state), thread = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === threadId) { thread = all[i]; break; } }
    if (!thread) return renderBoardView(boardId);

    clear(root);
    root.appendChild(breadcrumb([
      { text: "Community Boards", href: "forum.html" },
      { text: board.name, href: boardHref(boardId) },
      { text: thread.title }
    ]));
    root.appendChild(el("h1", "page-title", thread.title));

    var posts = el("div", "forum-posts");
    thread.posts.forEach(function (p) { posts.appendChild(postNode(p)); });
    root.appendChild(posts);

    if (thread.isSeed || thread.locked) {
      root.appendChild(el("p", "muted small forum-locked-note",
        "Read-only preview thread — replies require future server-backed forum authority."));
      return;
    }
    root.appendChild(signInPrompt("Forum replies are not live yet."));
  }

  function renderNewThread(boardId) {
    var board = boardById[boardId];
    if (!board) return renderBoardIndex();
    clear(root);
    root.appendChild(breadcrumb([
      { text: "Community Boards", href: "forum.html" },
      { text: board.name, href: boardHref(boardId) },
      { text: "New thread" }
    ]));
    root.appendChild(el("h1", "page-title", "Forum posting unavailable"));
    root.appendChild(el("p", "muted", "Posting to " + board.name + " requires future server-backed forum authority."));
    root.appendChild(signInPrompt("Create a character now; posting opens only when the server forum API exists."));
  }

  // ---- Router ---------------------------------------------------------------
  function boot() {
    root = document.getElementById("forum-root");
    if (!root) return; // not the forum page
    var params = new URLSearchParams(location.search);
    var boardId = params.get("board");
    var threadId = params.get("thread");
    var isNew = params.get("new") === "1";
    if (boardId && threadId) renderThreadView(boardId, threadId);
    else if (boardId && isNew) renderNewThread(boardId);
    else if (boardId) renderBoardView(boardId);
    else renderBoardIndex();
  }

  boot();
})();
