/*
  Akalynth Codex Library — typed asset registry + renderer.

  Single source of truth for the browsable visual codex on library.html.
  The page is built from CODEX_LIBRARY below, not from hand-repeated markup.

  Static lore preview only: nothing here is connected to a live service,
  account, economy, or runtime state. Images are original Akalynth world art.
  Internal source and world-bible planning sheets are intentionally NOT
  published here.
*/
(function () {
  "use strict";

  /**
   * @typedef {Object} CodexAsset
   * @property {string} id          Stable slug, also used as the card anchor.
   * @property {string} title       Display name.
   * @property {string} category    Human-readable category label.
   * @property {string} subtitle    In-world epithet or volume line.
   * @property {string|null} image  Path under assets/codex/, or null if no plate yet.
   * @property {string} alt         Image alt text (omit when image is null).
   * @property {string} description Short summary drawn from the provided lore.
   * @property {"created"|"planned"} status
   */

  /**
   * @typedef {Object} CodexCategory
   * @property {string} id
   * @property {string} title
   * @property {string} blurb
   * @property {CodexAsset[]} assets
   */

  /** @type {CodexCategory[]} */
  var CODEX_LIBRARY = [
    {
      id: "world-foundation",
      title: "World Foundation",
      blurb:
        "The shape of Azura itself — the charters and atlases that map where civilization stands and how deep its archives run.",
      assets: [
        {
          id: "high-city-charter",
          title: "High City Charter",
          category: "World Foundation",
          subtitle: "Crown of Convergence",
          image: "assets/codex/high-city-charter.png",
          alt: "City charter poster for High City, the Crown of Convergence.",
          description:
            "Capital of Akalynth and birthplace of the Great Accord, raised where the ley currents converge. Home to the Trinity Nexus, the Great Archive Vaults, and the Accord Chambers.",
          status: "created",
        },
        {
          id: "emberwilds-atlas",
          title: "Emberwilds Atlas",
          category: "World Foundation",
          subtitle: "Frontier of Ash & Flame",
          image: "assets/codex/emberwilds-atlas.png",
          alt: "Regional atlas poster for the Emberwilds region.",
          description:
            "Regional atlas of the Emberwilds — the volcanic frontier of Forgehold Citadel and Cindervale, where the Flamebound temper purpose in living fire.",
          status: "created",
        },
        {
          id: "high-city-cross-section",
          title: "High City Cross-Section",
          category: "World Foundation",
          subtitle: "The Vertical City",
          image: "assets/codex/high-city-cross-section.png",
          alt: "Vertical cross-section poster of High City, from sky spires to vaults.",
          description:
            "A vertical cutaway of High City, from the Sky Spires above to the Great Archive Vaults sunk beneath the converging currents.",
          status: "created",
        },
      ],
    },
    {
      id: "creature-codex",
      title: "Creature Codex",
      blurb:
        "Older than any city, the archive entities exist to remember. Some record truth, some unspool it, some carry it across ages, and some return it to silence.",
      assets: [
        {
          id: "memory-serpent",
          title: "Memory Serpent",
          category: "Creature Codex",
          subtitle: "Guardian of Forgotten Truths",
          image: "assets/codex/memory-serpent.png",
          alt: "Creature codex plate for the Memory Serpent.",
          description:
            "A colossal ancient entity bound to drowned libraries and submerged histories. It threatens not the body but memory, identity, and truth itself.",
          status: "created",
        },
        {
          id: "echo-stalker",
          title: "Echo Stalker",
          category: "Creature Codex",
          subtitle: "Shadow Hunter of Forgotten Sounds",
          image: "assets/codex/echo-stalker.png",
          alt: "Creature codex plate for the Echo Stalker.",
          description:
            "A predator of silence and names. It hunts the proof that a person was ever there, thriving in ruined cities, silent halls, and abandoned sanctums.",
          status: "created",
        },
        {
          id: "witness-moth",
          title: "Witness Moth",
          category: "Creature Codex",
          subtitle: "Keeper of Seen Truths",
          image: "assets/codex/witness-moth.png",
          alt: "Creature codex plate for the Witness Moth, with crystalline memory-facet wings.",
          description:
            "A living archive whose wings record light, sound, emotion, and intent. Harmless undisturbed — dangerous when overloaded with centuries of truth.",
          status: "created",
        },
        {
          id: "void-whale",
          title: "Void Whale",
          category: "Creature Codex",
          subtitle: "Skybound Leviathan · Herald of the Gap",
          image: "assets/codex/void-whale.png",
          alt: "Creature codex plate for the Void Whale.",
          description:
            "A skybound leviathan that swims through absence, consuming abandoned histories and the spaces where memory has failed.",
          status: "created",
        },
        {
          id: "dreamweaver",
          title: "Dreamweaver",
          category: "Creature Codex",
          subtitle: "Architect of Dreams · Weaver of Possibilities",
          image: "assets/codex/dreamweaver.png",
          alt: "Creature codex plate for the Dreamweaver.",
          description:
            "Dweller of the Liminal Web between waking thought and sleeping possibility. It does not create destiny — it shows futures, fears, and possible selves.",
          status: "created",
        },
        {
          id: "chronoshell-turtle",
          title: "Chronoshell Turtle",
          category: "Creature Codex",
          subtitle: "Keeper of Ages · Shell of Millennia",
          image: "assets/codex/chronoshell-turtle.png",
          alt: "Creature codex plate for the Chronoshell Turtle.",
          description:
            "Bearer of time itself; its shell can hold cities, rivers, ruins, and whole forgotten ages. It restores continuity simply by enduring.",
          status: "created",
        },
      ],
    },
    {
      id: "civilization-codices",
      title: "Civilization Codices",
      blurb:
        "Heroes change history. Villains corrupt it. Artifacts preserve it. Factions move it. These collected volumes record the peoples and powers of Azura.",
      assets: [
        {
          id: "heroes-codex",
          title: "Heroes Codex",
          category: "Civilization Codices",
          subtitle: "Volume I — The First Legends",
          image: "assets/codex/heroes-codex.png",
          alt: "Heroes Codex collection poster, Volume I: The First Legends.",
          description:
            "Volume I of the figures who carved their names into eternity — the First Archivist, the Flame Saint, and the first legends of the Accord.",
          status: "created",
        },
        {
          id: "villains-codex",
          title: "Villains Codex",
          category: "Civilization Codices",
          subtitle: "Volume I — The Fallen Legends",
          image: null,
          alt: "",
          description:
            "Volume I of the fallen — among them the Nameless King, erased from history by his own attempt to rewrite it. Lore entry; poster plate forthcoming.",
          status: "created",
        },
        {
          id: "artifacts-codex",
          title: "Artifacts Codex",
          category: "Civilization Codices",
          subtitle: "Volume I — Relics of Power",
          image: "assets/codex/artifacts-codex.png",
          alt: "Artifacts Codex collection poster, Volume I: Relics of Power.",
          description:
            "Volume I of the relics that preserve history — the First Codex, the Heartforge Hammer, and the powers that outlast their makers.",
          status: "created",
        },
        {
          id: "factions-codex",
          title: "Factions Codex",
          category: "Civilization Codices",
          subtitle: "Volume I — Powers That Shape the World",
          image: "assets/codex/factions-codex.png",
          alt: "Factions Codex collection poster, Volume I: Powers That Shape the World.",
          description:
            "Volume I of the powers that shape the world — the Codexborn keepers of truth, the Flamebound, and the orders that move Azura.",
          status: "created",
        },
      ],
    },
    {
      id: "history-dungeons",
      title: "History & Dungeons",
      blurb:
        "What remains are the moments that changed everything — and the places where that history still breathes beneath the earth.",
      assets: [
        {
          id: "chronicle-of-ages",
          title: "Chronicle of Ages",
          category: "History & Dungeons",
          subtitle: "Volume I — Events That Changed the World",
          image: "assets/codex/chronicle-of-ages.png",
          alt: "Chronicle of Ages collection poster, Volume I: Events That Changed the World.",
          description:
            "Volume I of the events that changed everything — the First Binding, the Great Accord, and the moments that made history possible.",
          status: "created",
        },
        {
          id: "dungeon-codex",
          title: "Dungeon Codex",
          category: "History & Dungeons",
          subtitle: "Volume I — Places Where History Still Breathes",
          image: "assets/codex/dungeon-codex.png",
          alt: "Dungeon Codex collection poster, Volume I: Places Where History Still Breathes.",
          description:
            "Volume I of the places where history still breathes — the First Archive beneath High City, the Heartforge Core, and other wounds in history not yet closed.",
          status: "created",
        },
      ],
    },
    {
      id: "next-planned",
      title: "Next Planned",
      blurb:
        "Entries the Chroniclers have outlined but not yet illustrated. Listed here for the road ahead — not yet part of the published archive.",
      assets: [
        {
          id: "origins-codex",
          title: "Origins Codex",
          category: "Next Planned",
          subtitle: "Volume I — Before the First Binding",
          image: null,
          alt: "",
          description:
            "Planned: the dawn before the First Binding — the origin of the Vault and the earliest archive traditions. Not yet illustrated.",
          status: "planned",
        },
      ],
    },
  ];

  // Expose the registry for reuse/inspection without forcing a module system.
  window.AKALYNTH_CODEX_LIBRARY = CODEX_LIBRARY;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildPlate(asset) {
    // Planned or image-less entries get a parchment placeholder instead of a plate.
    if (!asset.image) {
      var empty = el(
        "div",
        "codex-plate lib-card__plate lib-card__plate--empty",
      );
      var glyph = el("span", "lib-card__glyph", asset.status === "planned" ? "✶" : "❧");
      glyph.setAttribute("aria-hidden", "true");
      var note = el(
        "p",
        "lib-card__plate-note",
        asset.status === "planned" ? "Plate planned" : "Lore entry · plate forthcoming",
      );
      empty.appendChild(glyph);
      empty.appendChild(note);
      return empty;
    }

    var figure = el("figure", "codex-plate lib-card__plate");
    var link = el("a");
    link.href = asset.image;
    link.target = "_blank";
    link.rel = "noopener";

    var img = el("img");
    img.src = asset.image;
    img.alt = asset.alt;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 1024;
    img.height = 1536;

    link.appendChild(img);
    figure.appendChild(link);

    var cap = el("figcaption", null, asset.category + " · open full plate ↗");
    figure.appendChild(cap);
    return figure;
  }

  function buildCard(asset) {
    var card = el("article", "lib-card");
    card.id = "asset-" + asset.id;

    if (asset.status === "planned") {
      var badge = el("span", "lib-badge lib-badge--planned", "Planned");
      card.appendChild(badge);
    }

    card.appendChild(buildPlate(asset));

    var body = el("div", "lib-card__body");
    body.appendChild(el("h3", "news-title", asset.title));
    body.appendChild(el("p", "codex-sub", asset.subtitle));
    body.appendChild(el("p", "lib-card__desc", asset.description));
    card.appendChild(body);

    return card;
  }

  function countCreated() {
    var n = 0;
    CODEX_LIBRARY.forEach(function (cat) {
      cat.assets.forEach(function (a) {
        if (a.status === "created" && a.image) n += 1;
      });
    });
    return n;
  }

  function render(root) {
    var frag = document.createDocumentFragment();

    // Quick category jump list for a browsable archive feel.
    var nav = el("nav", "lib-jump");
    nav.setAttribute("aria-label", "Codex Library sections");
    CODEX_LIBRARY.forEach(function (cat) {
      var a = el("a", "lib-jump__link", cat.title);
      a.href = "#section-" + cat.id;
      nav.appendChild(a);
    });
    frag.appendChild(nav);

    CODEX_LIBRARY.forEach(function (cat) {
      var section = el("section", "lib-section");
      section.id = "section-" + cat.id;

      section.appendChild(el("h2", "section-title", cat.title));

      var intro = el("article", "parchment");
      intro.appendChild(el("p", null, cat.blurb));
      section.appendChild(intro);

      var grid = el("div", "lib-grid");
      cat.assets.forEach(function (asset) {
        grid.appendChild(buildCard(asset));
      });
      section.appendChild(grid);

      frag.appendChild(section);
    });

    root.innerHTML = "";
    root.appendChild(frag);

    var countEl = document.getElementById("lib-asset-count");
    if (countEl) {
      countEl.textContent = String(countCreated());
    }
  }

  function init() {
    var root = document.getElementById("codex-library-root");
    if (root) render(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
