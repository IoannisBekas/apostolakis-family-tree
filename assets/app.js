(() => {
  "use strict";

  const dataUrl = "assets/family_units.json";
  const svgNs = "http://www.w3.org/2000/svg";
  const knownPlaces = [
    "Πρινές", "Ελεύθερνα", "Αθήνα", "Ρέθυμνο", "Ηράκλειο", "Χανιά", "Τριπόδος", "Ύδρα",
    "Χουμέρι", "Βισταγή", "Μάραθος", "Πέραμα", "Πλευριανά", "Καλογέρου", "Αγγελιανά",
    "Λαγκά", "Ελευσίνα", "Ορθές", "Αλφά", "Βόλος", "Ανώγεια", "Ζωνιανά", "Αμάρι",
    "Αργυρούπολη", "Πάνορμος", "Σίσσες", "Μπαλί", "Αξός", "Κρήτη",
  ];
  const fallbackAccents = new Map([
    ["αννα", "Άννα"], ["αντωνια", "Αντωνία"], ["αποστολακης", "Αποστολάκης"], ["αποστολακη", "Αποστολάκη"],
    ["αποστολης", "Αποστόλης"], ["αργυρουλα", "Αργυρούλα"], ["αθανασιος", "Αθανάσιος"], ["βασιλικος", "Βασιλικός"],
    ["βασιλικη", "Βασιλική"], ["βασιλης", "Βασίλης"], ["γεωργιος", "Γεώργιος"], ["γεωργιου", "Γεωργίου"],
    ["γιαννης", "Γιάννης"], ["γιωργης", "Γιώργης"], ["γιωργος", "Γιώργος"], ["δημητρουλης", "Δημητρούλης"],
    ["δημητριος", "Δημήτριος"], ["ελενα", "Έλενα"], ["ελενη", "Ελένη"], ["ευαγγελια", "Ευαγγελία"],
    ["ζαχαριας", "Ζαχαρίας"], ["ζαχαριαδου", "Ζαχαριάδου"], ["ηλιας", "Ηλίας"], ["θεοδωρος", "Θεόδωρος"],
    ["ιακωβος", "Ιάκωβος"], ["ιακωβου", "Ιακώβου"], ["ιωαννης", "Ιωάννης"], ["ιωαννου", "Ιωάννου"],
    ["καλλιοπη", "Καλλιόπη"], ["κωνσταντινος", "Κωνσταντίνος"], ["κωστας", "Κώστας"], ["κωστακης", "Κωστάκης"],
    ["κωσταντης", "Κωσταντής"], ["κυριακος", "Κυριάκος"], ["μαρια", "Μαρία"], ["μανωλης", "Μανώλης"],
    ["μαρκος", "Μάρκος"], ["μιχαλης", "Μιχάλης"], ["νικολαος", "Νικόλαος"], ["νικολης", "Νικολής"],
    ["παντελης", "Παντελής"], ["ραφαηλ", "Ραφαήλ"], ["σταυρος", "Σταύρος"], ["στελιος", "Στέλιος"],
    ["σωτηρης", "Σωτήρης"], ["χρηστος", "Χρήστος"], ["χρυσουλα", "Χρυσούλα"], ["χρυση", "Χρυσή"],
  ]);

  const els = {
    searchForm: document.getElementById("person-search"),
    searchInput: document.getElementById("person-search-input"),
    searchOptions: document.getElementById("person-options"),
    searchStatus: document.getElementById("search-status"),
    placeFilter: document.getElementById("place-filter"),
    spouseToggle: document.getElementById("spouse-toggle"),
    backButton: document.getElementById("back-button"),
    homeButton: document.getElementById("home-button"),
    focusButton: document.getElementById("focus-button"),
    zoomOutButton: document.getElementById("zoom-out-button"),
    zoomInButton: document.getElementById("zoom-in-button"),
    fitButton: document.getElementById("fit-button"),
    shareButton: document.getElementById("share-button"),
    relationshipForm: document.getElementById("relationship-form"),
    relativeOne: document.getElementById("relative-one"),
    relativeTwo: document.getElementById("relative-two"),
    clearRelationshipButton: document.getElementById("clear-relationship-button"),
    relationshipStatus: document.getElementById("relationship-status"),
    treeViewport: document.getElementById("tree-viewport"),
    tree: document.getElementById("family-tree"),
    treeKicker: document.getElementById("tree-kicker"),
    treeTitle: document.getElementById("tree-title"),
    treeStatus: document.getElementById("tree-status"),
    personCard: document.getElementById("person-card"),
    exportImageButton: document.getElementById("export-image-button"),
    exportPdfButton: document.getElementById("export-pdf-button"),
    viewButtons: [...document.querySelectorAll(".view-button")],
  };

  const state = {
    rootUnionIndex: 0,
    path: [],
    selectedId: "root",
    view: "explore",
    place: "",
    showSpouses: true,
    zoom: 1,
    relationship: null,
  };

  let familyData;
  let nodesById;
  let familiesByPrincipal;
  let accentVocabulary = new Map(fallbackAccents);
  let currentDrawing = { width: 900, height: 400 };
  let pendingResize;

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[«»()[\].,;:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayLabel(value) {
    const compact = String(value || "")
      .normalize("NFC")
      .replace(/\s+/g, " ")
      .replace(/\s*\(\s*/g, " (")
      .replace(/\s*\)/g, ")")
      .replace(/\s*«\s*/g, " «")
      .replace(/\s*»\s*/g, "» ")
      .replace(/\s*-\s*/g, "-")
      .replace(/\s+/g, " ")
      .trim();
    return compact.toLocaleLowerCase("el-GR").replace(/\p{L}+/gu, normalizeNameWord);
  }

  function titleCaseWord(word) {
    const lowered = word.toLocaleLowerCase("el-GR");
    return lowered.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("el-GR"));
  }

  function normalizeNameWord(word) {
    return accentVocabulary.get(normalize(word)) || titleCaseWord(word);
  }

  function displayNarrative(value) {
    const compact = String(value)
      .normalize("NFC")
      .replace(/([.,;:])(?=[\p{L}])/gu, "$1 ")
      .replace(/\s*\(\s*/g, " (")
      .replace(/\s*\)/g, ")")
      .replace(/\s*«\s*/g, " «")
      .replace(/\s*»\s*/g, "» ")
      .replace(/\s+/g, " ")
      .trim();
    return compact.replace(/\p{Lu}{2,}/gu, normalizeNameWord)
      .replace(/\.\s*Συζ\.?/g, ". Συζ.")
      .replace(/:\s*/g, ": ");
  }

  function buildAccentVocabulary() {
    const candidates = new Map();
    const addCandidate = (token) => {
      if (!token || token === token.toLocaleUpperCase("el-GR")) return;
      const key = normalize(token);
      const value = titleCaseWord(token);
      const option = candidates.get(key) || new Map();
      option.set(value, (option.get(value) || 0) + 1);
      candidates.set(key, option);
    };
    const addText = (text) => {
      String(text || "").match(/\p{L}+/gu)?.forEach(addCandidate);
    };
    familyData.nodes.forEach((person) => [person.label, person.detail, person.source].forEach(addText));
    familyData.families.forEach((family) => {
      addText(family.spouse);
      family.children.forEach((child) => addText(child.label));
    });
    candidates.forEach((options, key) => {
      if (fallbackAccents.has(key)) return;
      const best = [...options.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (best) accentVocabulary.set(key, best);
    });
  }

  function personName(person) {
    const label = displayLabel(person.label);
    return normalize(label).includes("αποστολακ") ? label : label + " Αποστολάκης";
  }

  function personFromId(id) {
    return nodesById.get(id) || null;
  }

  function familiesFor(id) {
    return familiesByPrincipal.get(id) || [];
  }

  function emptyFamily(id) {
    return { id: "family-" + id + "-none", principal_id: id, spouse: null, children: [], source: "" };
  }

  function unionAt(id, index) {
    const families = familiesFor(id);
    if (families.length === 0) return emptyFamily(id);
    return families[Math.max(0, Math.min(index || 0, families.length - 1))];
  }

  function childrenOf(family) {
    return family.children.map((reference) => {
      const person = reference.recorded ? personFromId(reference.id) : null;
      return person ? { ...person, recorded: true } : { id: reference.id, label: reference.label, recorded: false, children: [], generation: null };
    });
  }

  function unionIndexForChild(parentId, childId) {
    return familiesFor(parentId).findIndex((family) => family.children.some((child) => child.recorded && child.id === childId));
  }

  function activeUnionIndex(id) {
    if (id === "root") return state.rootUnionIndex;
    const entry = state.path.find((item) => item.personId === id);
    return entry ? entry.unionIndex : 0;
  }

  function activeUnion(id) {
    return unionAt(id, activeUnionIndex(id));
  }

  function fullLineage(id) {
    const lineage = [];
    let cursor = personFromId(id);
    while (cursor && cursor.id !== "root") {
      lineage.unshift(cursor.id);
      cursor = cursor.parent ? personFromId(cursor.parent) : null;
    }
    return lineage;
  }

  function makePathFor(id) {
    const lineage = fullLineage(id);
    if (lineage.length === 0) return { rootUnionIndex: 0, path: [] };
    const rootIndex = unionIndexForChild("root", lineage[0]);
    if (rootIndex < 0) return null;
    return {
      rootUnionIndex: rootIndex,
      path: lineage.map((personId, index) => ({
        personId,
        unionIndex: index < lineage.length - 1 ? Math.max(0, unionIndexForChild(personId, lineage[index + 1])) : 0,
      })),
    };
  }

  function allPathIds() {
    return new Set(state.path.map((item) => item.personId));
  }

  function relationshipIds() {
    return new Set(state.relationship ? state.relationship.ids : []);
  }

  function sourceText(person) {
    return [person.detail, person.source].filter(Boolean).join(" ");
  }

  function placesFor(person) {
    const text = normalize(sourceText(person));
    return knownPlaces.filter((place) => text.includes(normalize(place)));
  }

  function hasPlace(person) {
    return !state.place || placesFor(person).includes(state.place);
  }

  function getMatches(query) {
    const value = normalize(query);
    if (!value) return [];
    const terms = value.split(" ");
    return familyData.nodes
      .map((person) => {
        const label = normalize(person.label);
        const expanded = normalize(personName(person));
        let score = 0;
        if (expanded === value) score = 100;
        else if (label === value) score = 96;
        else if (expanded.startsWith(value)) score = 82;
        else if (terms.every((term) => expanded.includes(term))) score = 64;
        return { person, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.person.generation - b.person.generation || displayLabel(a.person.label).localeCompare(displayLabel(b.person.label), "el"))
      .map((result) => result.person);
  }

  function choosePerson(query) {
    return getMatches(query)[0] || null;
  }

  function setSelected(id, options = {}) {
    const person = personFromId(id);
    if (!person) return;
    state.selectedId = id;
    if (options.openLineage) {
      const next = makePathFor(id);
      if (next) {
        state.rootUnionIndex = next.rootUnionIndex;
        state.path = next.path;
      }
    }
    render();
    if (options.focus) focusSelected();
  }

  function buildExploreLevels() {
    const levels = [];
    let parent = personFromId("root");
    let family = unionAt("root", state.rootUnionIndex);
    levels.push({ parent, family, depth: 0 });
    let validLength = 0;

    for (let index = 0; index < state.path.length; index += 1) {
      const entry = state.path[index];
      const child = childrenOf(family).find((candidate) => candidate.recorded && candidate.id === entry.personId);
      if (!child) break;
      parent = personFromId(child.id);
      family = unionAt(child.id, entry.unionIndex);
      levels.push({ parent, family, depth: index + 1 });
      validLength += 1;
    }

    if (validLength !== state.path.length) state.path = state.path.slice(0, validLength);
    return levels;
  }

  function nodeSize() {
    const compact = window.matchMedia("(max-width: 600px)").matches;
    return compact ? { width: 148, height: 78, gap: 46 } : { width: 168, height: 82, gap: 54 };
  }

  function createSvg(tag, attributes = {}) {
    const element = document.createElementNS(svgNs, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    return element;
  }

  function appendLine(layer, x1, y1, x2, y2, isRoute = false) {
    const line = createSvg("line", { x1, y1, x2, y2, class: "connector" + (isRoute ? " is-route" : "") });
    layer.append(line);
  }

  function splitLabel(text, maxLength = 18) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (line && candidate.length > maxLength) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2) return lines;
    return [lines[0], lines.slice(1).join(" ").slice(0, maxLength - 1) + "…"];
  }

  function appendText(group, x, y, text, className, maxLength) {
    const label = createSvg("text", { x, y, "text-anchor": "middle", class: className || "" });
    const lines = splitLabel(text, maxLength);
    lines.forEach((line, index) => {
      const span = createSvg("tspan", { x, dy: index === 0 ? 0 : 16 });
      span.textContent = line;
      label.append(span);
    });
    group.append(label);
  }

  function nodeMeta(person) {
    const count = (person.children || []).length;
    if (!count) return "χωρίς καταγεγραμμένα παιδιά";
    return count === 1 ? "1 παιδί" : count + " παιδιά";
  }

  function drawPerson(layer, person, x, y, size, options = {}) {
    const label = displayLabel(person.label);
    const interactive = person.recorded !== false;
    const classNames = ["node"];
    if (person.id === state.selectedId) classNames.push("is-selected");
    if (options.route) classNames.push("is-route");
    const group = createSvg("g", {
      class: classNames.join(" "),
      transform: "translate(" + x + " " + y + ")",
      "data-person-id": person.id,
      tabindex: interactive ? 0 : -1,
      role: interactive ? "button" : "img",
      "aria-label": interactive ? label + ". " + (options.actionLabel || "Επιλογή προσώπου.") : label + ". Αναφέρεται χωρίς πρόσθετα στοιχεία.",
    });
    group.append(createSvg("rect", { width: size.width, height: size.height, rx: 10, ry: 10 }));
    appendText(group, size.width / 2, 29, label, "", size.width < 160 ? 16 : 19);
    appendText(group, size.width / 2, size.height - 15, nodeMeta(person), "node-meta", 26);
    if (interactive && options.onSelect) {
      group.addEventListener("click", options.onSelect);
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          options.onSelect();
        }
      });
    }
    layer.append(group);
    return group;
  }

  function drawSpouse(layer, label, x, y, size) {
    const normalizedLabel = label === "Σύζυγος: δεν καταγράφεται" ? label : displayLabel(label);
    const group = createSvg("g", {
      class: "spouse-node",
      transform: "translate(" + x + " " + y + ")",
      role: "img",
      "aria-label": normalizedLabel,
    });
    group.append(createSvg("rect", { width: size.width, height: size.height, rx: 10, ry: 10 }));
    appendText(group, size.width / 2, 31, normalizedLabel, "", size.width < 160 ? 16 : 20);
    group.append(createSvg("text", { x: size.width / 2, y: size.height - 15, "text-anchor": "middle", class: "node-meta" }));
    group.lastChild.textContent = "σύζυγος";
    layer.append(group);
  }

  function familyCoordinates(canvasWidth, size, spouseVisible) {
    if (!spouseVisible) return { personX: (canvasWidth - size.width) / 2, spouseX: null, lineStart: null, lineEnd: null };
    const gap = 18;
    const personX = canvasWidth / 2 - size.width - gap / 2;
    const spouseX = canvasWidth / 2 + gap / 2;
    return { personX, spouseX, lineStart: personX + size.width, lineEnd: spouseX };
  }

  function visibleChildren(family) {
    const pathIds = allPathIds();
    return childrenOf(family).filter((person) => person.id === state.selectedId || pathIds.has(person.id) || hasPlace(person));
  }

  function routeFor(personId) {
    return allPathIds().has(personId) || relationshipIds().has(personId);
  }

  function spouseLabel(family, unknownLabel = "Σύζυγος: δεν καταγράφεται") {
    return family.spouse ? displayLabel(family.spouse) : unknownLabel;
  }

  function renderExplore() {
    const levels = buildExploreLevels();
    const size = nodeSize();
    const viewportWidth = Math.max(els.treeViewport.clientWidth || 860, 620);
    const maxChildren = Math.max(2, ...levels.map((level) => visibleChildren(level.family).length));
    const canvasWidth = Math.max(viewportWidth, maxChildren * size.width + (maxChildren - 1) * size.gap + 64);
    const connectors = createSvg("g");
    const nodes = createSvg("g");
    els.tree.replaceChildren(connectors, nodes);
    let y = 28;

    levels.forEach((level) => {
      const spouseName = spouseLabel(level.family);
      const spouseVisible = state.showSpouses && Boolean(level.family.spouse || level.parent.id !== "root");
      const pair = familyCoordinates(canvasWidth, size, spouseVisible);
      if (pair.lineStart !== null) appendLine(connectors, pair.lineStart, y + size.height / 2, pair.lineEnd, y + size.height / 2, routeFor(level.parent.id));
      drawPerson(nodes, level.parent, pair.personX, y, size, {
        route: routeFor(level.parent.id),
        actionLabel: "Επιλογή για λεπτομέρειες.",
        onSelect: () => setSelected(level.parent.id),
      });
      if (spouseVisible) drawSpouse(nodes, spouseName, pair.spouseX, y, size);

      const children = visibleChildren(level.family);
      if (children.length > 0) {
        const totalWidth = children.length * size.width + (children.length - 1) * size.gap;
        const startX = (canvasWidth - totalWidth) / 2;
        const railY = y + size.height + 35;
        const childY = y + size.height + 72;
        const parentCenter = pair.personX + size.width / 2;
        const firstCenter = startX + size.width / 2;
        const lastCenter = startX + (children.length - 1) * (size.width + size.gap) + size.width / 2;
        appendLine(connectors, parentCenter, y + size.height, parentCenter, railY, routeFor(level.parent.id));
        if (children.length > 1) appendLine(connectors, firstCenter, railY, lastCenter, railY, false);
        children.forEach((child, index) => {
          const childX = startX + index * (size.width + size.gap);
          const childCenter = childX + size.width / 2;
          appendLine(connectors, childCenter, railY, childCenter, childY, routeFor(child.id));
          drawPerson(nodes, child, childX, childY, size, {
            route: routeFor(child.id),
            actionLabel: child.recorded ? "Άνοιγμα γάμου και παιδιών." : "Αναφερόμενο παιδί χωρίς διαθέσιμη συνέχεια.",
            onSelect: () => selectExploreChild(child, level.depth),
          });
        });
        y = childY + size.height + 58;
      } else {
        y += size.height + 58;
      }
    });

    els.treeKicker.textContent = "Εξερεύνηση";
    els.treeTitle.textContent = "Οικογενειακό δένδρο";
    finishDrawing(canvasWidth, Math.max(y, 190));
    els.treeStatus.textContent = state.place ? "Φίλτρο τόπου: " + state.place + ". Τα πρόσωπα της επιλεγμένης διαδρομής παραμένουν ορατά." : "Επίλεξε ένα παιδί για να προσθέσεις τον επόμενο γάμο και τα παιδιά του.";
  }

  function renderAncestors() {
    const selected = personFromId(state.selectedId) || personFromId("root");
    const lineage = [personFromId("root"), ...fullLineage(selected.id).map(personFromId)];
    const size = nodeSize();
    const canvasWidth = Math.max(els.treeViewport.clientWidth || 860, state.showSpouses ? size.width * 2 + 90 : size.width + 90);
    const connectors = createSvg("g");
    const nodes = createSvg("g");
    els.tree.replaceChildren(connectors, nodes);
    let y = 28;
    lineage.forEach((person, index) => {
      const nextChild = lineage[index + 1];
      const indexForNext = nextChild ? Math.max(0, unionIndexForChild(person.id, nextChild.id)) : activeUnionIndex(person.id);
      const family = unionAt(person.id, indexForNext);
      const spouseVisible = state.showSpouses && Boolean(family.spouse || person.id !== "root");
      const pair = familyCoordinates(canvasWidth, size, spouseVisible);
      if (pair.lineStart !== null) appendLine(connectors, pair.lineStart, y + size.height / 2, pair.lineEnd, y + size.height / 2, true);
      if (index > 0) appendLine(connectors, canvasWidth / 2, y - 38, canvasWidth / 2, y, true);
      drawPerson(nodes, person, pair.personX, y, size, {
        route: true,
        actionLabel: "Επιλογή για λεπτομέρειες.",
        onSelect: () => setSelected(person.id),
      });
      if (spouseVisible) drawSpouse(nodes, spouseLabel(family), pair.spouseX, y, size);
      y += size.height + 38;
    });
    els.treeKicker.textContent = "Εστιασμένη προβολή";
    els.treeTitle.textContent = "Πρόγονοι του/της " + displayLabel(selected.label);
    finishDrawing(canvasWidth, y + 8);
    els.treeStatus.textContent = "Η γραμμή καταγωγής από τον γενάρχη έως το επιλεγμένο πρόσωπο.";
  }

  function renderDescendants() {
    const selected = personFromId(state.selectedId) || personFromId("root");
    const family = activeUnion(selected.id);
    const size = nodeSize();
    const children = visibleChildren(family);
    const viewportWidth = Math.max(els.treeViewport.clientWidth || 860, 620);
    const canvasWidth = Math.max(viewportWidth, Math.max(2, children.length) * size.width + Math.max(1, children.length - 1) * size.gap + 64);
    const connectors = createSvg("g");
    const nodes = createSvg("g");
    els.tree.replaceChildren(connectors, nodes);
    const y = 28;
    const spouseVisible = state.showSpouses && Boolean(family.spouse || selected.id !== "root");
    const pair = familyCoordinates(canvasWidth, size, spouseVisible);
    if (pair.lineStart !== null) appendLine(connectors, pair.lineStart, y + size.height / 2, pair.lineEnd, y + size.height / 2, routeFor(selected.id));
    drawPerson(nodes, selected, pair.personX, y, size, {
      route: routeFor(selected.id),
      actionLabel: "Επιλογή για λεπτομέρειες.",
      onSelect: () => setSelected(selected.id),
    });
    if (spouseVisible) drawSpouse(nodes, spouseLabel(family), pair.spouseX, y, size);
    if (children.length > 0) {
      const totalWidth = children.length * size.width + (children.length - 1) * size.gap;
      const startX = (canvasWidth - totalWidth) / 2;
      const railY = y + size.height + 35;
      const childY = y + size.height + 72;
      const parentCenter = pair.personX + size.width / 2;
      appendLine(connectors, parentCenter, y + size.height, parentCenter, railY, routeFor(selected.id));
      if (children.length > 1) appendLine(connectors, startX + size.width / 2, railY, startX + (children.length - 1) * (size.width + size.gap) + size.width / 2, railY, false);
      children.forEach((child, index) => {
        const childX = startX + index * (size.width + size.gap);
        const center = childX + size.width / 2;
        appendLine(connectors, center, railY, center, childY, routeFor(child.id));
        drawPerson(nodes, child, childX, childY, size, {
          route: routeFor(child.id),
          actionLabel: child.recorded ? "Μετάβαση στους απογόνους του/της." : "Αναφερόμενο παιδί χωρίς διαθέσιμη συνέχεια.",
          onSelect: () => {
            if (child.recorded) setSelected(child.id, { openLineage: true });
          },
        });
      });
      els.treeKicker.textContent = "Εστιασμένη προβολή";
      els.treeTitle.textContent = "Απόγονοι του/της " + displayLabel(selected.label);
      finishDrawing(canvasWidth, childY + size.height + 44);
    } else {
      els.treeKicker.textContent = "Εστιασμένη προβολή";
      els.treeTitle.textContent = "Απόγονοι του/της " + displayLabel(selected.label);
      finishDrawing(canvasWidth, y + size.height + 44);
    }
    els.treeStatus.textContent = children.length ? "Επίλεξε ένα παιδί για να συνεχίσεις στον επόμενο κλάδο." : "Δεν καταγράφονται παιδιά για τον τρέχοντα γάμο.";
  }

  function finishDrawing(width, height) {
    currentDrawing = { width, height };
    els.tree.setAttribute("viewBox", "0 0 " + width + " " + height);
    els.tree.setAttribute("width", width * state.zoom);
    els.tree.setAttribute("height", height * state.zoom);
    els.tree.setAttribute("aria-label", els.treeTitle.textContent || "Οικογενειακό δένδρο");
  }

  function selectExploreChild(child, depth) {
    if (!child.recorded) return;
    state.selectedId = child.id;
    const current = state.path[depth];
    if (current && current.personId === child.id) {
      state.path = state.path.slice(0, depth + 1);
    } else {
      state.path = state.path.slice(0, depth);
      state.path.push({ personId: child.id, unionIndex: 0 });
    }
    render();
    requestAnimationFrame(focusSelected);
  }

  function renderPersonCard() {
    const person = personFromId(state.selectedId) || personFromId("root");
    const family = activeUnion(person.id);
    const places = placesFor(person);
    const children = childrenOf(family).filter((child) => child.recorded);
    const spouse = spouseLabel(family, "Δεν καταγράφεται");
    els.personCard.replaceChildren();
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Επιλεγμένο πρόσωπο";
    const heading = document.createElement("h2");
    heading.textContent = displayLabel(person.label);
    const summary = document.createElement("p");
    summary.textContent = person.detail ? displayNarrative(person.detail) : "Δεν υπάρχει πρόσθετη βιογραφική σημείωση στο αρχείο.";
    const details = document.createElement("dl");
    addDefinition(details, "Γενιά", person.generation ? person.generation + "η" : "—");
    addDefinition(details, "Τόποι", places.length ? places.join(", ") : "Δεν καταγράφεται");
    addDefinition(details, "Σύζυγος", spouse);
    addDefinition(details, "Καταγεγραμμένα παιδιά", String(children.length));
    els.personCard.append(eyebrow, heading, summary, details);

    if (children.length) {
      const childrenHeading = document.createElement("dt");
      childrenHeading.textContent = "Παιδιά";
      const list = document.createElement("ul");
      list.className = "children-list";
      children.forEach((child) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.className = "person-link";
        button.type = "button";
        button.textContent = displayLabel(child.label);
        button.addEventListener("click", () => setSelected(child.id, { openLineage: true, focus: true }));
        item.append(button);
        list.append(item);
      });
      details.append(childrenHeading, list);
    }
    if (person.source) {
      const sourceHeading = document.createElement("dt");
      sourceHeading.textContent = "Απόσπασμα αρχείου (πρωτότυπη γραφή)";
      const source = document.createElement("dd");
      source.className = "source";
      source.textContent = person.source;
      details.append(sourceHeading, source);
    }
  }

  function addDefinition(details, title, value) {
    const term = document.createElement("dt");
    term.textContent = title;
    const description = document.createElement("dd");
    description.textContent = value;
    details.append(term, description);
  }

  function renderNavigation() {
    els.backButton.disabled = state.path.length === 0;
    const targetId = state.path.length ? state.path[state.path.length - 1].personId : "root";
    const unions = familiesFor(targetId);
    const unionIndex = activeUnionIndex(targetId);
    const previous = document.getElementById("previous-union-button");
    const next = document.getElementById("next-union-button");
    if (previous && next) {
      previous.disabled = unions.length < 2 || unionIndex <= 0;
      next.disabled = unions.length < 2 || unionIndex >= unions.length - 1;
    }
    els.viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === state.view)));
    els.placeFilter.value = state.place;
    els.spouseToggle.checked = state.showSpouses;
  }

  function render() {
    if (!familyData) return;
    if (state.view === "ancestors") renderAncestors();
    else if (state.view === "descendants") renderDescendants();
    else renderExplore();
    renderPersonCard();
    renderNavigation();
    writeHash();
  }

  function focusSelected() {
    const target = els.tree.querySelector('[data-person-id="' + CSS.escape(state.selectedId) + '"]');
    if (!target) return;
    const targetBox = target.getBoundingClientRect();
    const viewportBox = els.treeViewport.getBoundingClientRect();
    const nextLeft = els.treeViewport.scrollLeft + targetBox.left - viewportBox.left - (els.treeViewport.clientWidth - targetBox.width) / 2;
    els.treeViewport.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
  }

  function updatePlaceOptions() {
    const foundPlaces = knownPlaces.filter((place) => familyData.nodes.some((person) => placesFor(person).includes(place)));
    els.placeFilter.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "Όλοι οι τόποι";
    els.placeFilter.append(all);
    foundPlaces.forEach((place) => {
      const option = document.createElement("option");
      option.value = place;
      option.textContent = place;
      els.placeFilter.append(option);
    });
  }

  function updatePersonOptions() {
    const fragment = document.createDocumentFragment();
    familyData.nodes
      .slice()
      .sort((a, b) => a.generation - b.generation || displayLabel(a.label).localeCompare(displayLabel(b.label), "el"))
      .forEach((person) => {
        const option = document.createElement("option");
        option.value = personName(person);
        option.label = displayLabel(person.label) + " · " + person.generation + "η γενιά";
        fragment.append(option);
      });
    els.searchOptions.replaceChildren(fragment);
  }

  function findRelationship(first, second) {
    const firstAncestors = [first.id, ...fullLineage(first.id).reverse()];
    const secondAncestors = [second.id, ...fullLineage(second.id).reverse()];
    const secondSet = new Set(secondAncestors);
    const common = firstAncestors.find((id) => secondSet.has(id));
    if (!common) return null;
    const firstRoute = [first.id];
    let cursor = first;
    while (cursor && cursor.id !== common) {
      cursor = cursor.parent ? personFromId(cursor.parent) : null;
      if (cursor) firstRoute.push(cursor.id);
    }
    const secondRoute = [second.id];
    cursor = second;
    while (cursor && cursor.id !== common) {
      cursor = cursor.parent ? personFromId(cursor.parent) : null;
      if (cursor) secondRoute.push(cursor.id);
    }
    return { firstId: first.id, secondId: second.id, commonId: common, ids: [...new Set([...firstRoute, ...secondRoute])] };
  }

  function writeHash() {
    const params = new URLSearchParams();
    if (state.rootUnionIndex) params.set("root", state.rootUnionIndex);
    if (state.path.length) params.set("path", state.path.map((entry) => entry.personId + ":" + entry.unionIndex).join(","));
    if (state.selectedId !== "root") params.set("person", state.selectedId);
    if (state.view !== "explore") params.set("view", state.view);
    if (state.place) params.set("place", state.place);
    if (!state.showSpouses) params.set("spouses", "0");
    if (state.relationship) {
      params.set("a", state.relationship.firstId);
      params.set("b", state.relationship.secondId);
    }
    const nextHash = params.toString();
    if (location.hash.slice(1) !== nextHash) history.replaceState(null, "", location.pathname + location.search + (nextHash ? "#" + nextHash : ""));
  }

  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const rootIndex = Number(params.get("root"));
    state.rootUnionIndex = Number.isFinite(rootIndex) && rootIndex >= 0 ? rootIndex : 0;
    state.path = (params.get("path") || "")
      .split(",")
      .filter(Boolean)
      .map((entry) => {
        const [personId, index] = entry.split(":");
        return { personId, unionIndex: Math.max(0, Number(index) || 0) };
      })
      .filter((entry) => personFromId(entry.personId));
    state.selectedId = personFromId(params.get("person")) ? params.get("person") : (state.path.at(-1)?.personId || "root");
    state.view = ["explore", "ancestors", "descendants"].includes(params.get("view")) ? params.get("view") : "explore";
    state.place = knownPlaces.includes(params.get("place")) ? params.get("place") : "";
    state.showSpouses = params.get("spouses") !== "0";
    const first = personFromId(params.get("a"));
    const second = personFromId(params.get("b"));
    state.relationship = first && second ? findRelationship(first, second) : null;
  }

  async function copyShareLink() {
    writeHash();
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      els.searchStatus.textContent = "Ο σύνδεσμος αντιγράφηκε. Ανοίγει την ίδια ακριβώς προβολή.";
    } catch {
      els.searchInput.value = url;
      els.searchInput.select();
      els.searchStatus.textContent = "Ο σύνδεσμος εμφανίστηκε στο πεδίο αναζήτησης· επίλεξέ τον και αντέγραψέ τον.";
    }
  }

  function inlineStylesForExport() {
    const root = getComputedStyle(document.documentElement);
    const color = (name) => root.getPropertyValue(name).trim();
    return `
      .connector{fill:none;stroke:${color("--line")};stroke-width:1.25}.connector.is-route{stroke:${color("--route")};stroke-width:2.5}
      .node rect{fill:${color("--surface")};stroke:${color("--border")};stroke-width:1.25}.node.is-selected rect{fill:${color("--accent-soft")};stroke:${color("--accent")};stroke-width:2}.node.is-route rect{fill:${color("--route-soft")};stroke:${color("--route")};stroke-width:2}
      .node text,.spouse-node text{fill:${color("--text")};font-family:Arial,sans-serif;font-size:13px;font-weight:600}.node .node-meta,.spouse-node .node-meta{fill:${color("--muted")};font-size:10.5px;font-weight:400}.spouse-node rect{fill:${color("--surface-raised")};stroke:${color("--border")};stroke-width:1.25}
    `;
  }

  function exportPng() {
    const clone = els.tree.cloneNode(true);
    clone.setAttribute("xmlns", svgNs);
    clone.setAttribute("width", currentDrawing.width);
    clone.setAttribute("height", currentDrawing.height);
    clone.removeAttribute("style");
    const style = createSvg("style");
    style.textContent = inlineStylesForExport();
    clone.prepend(style);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = currentDrawing.width * scale;
      canvas.height = currentDrawing.height * scale;
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface-raised").trim();
      context.fillRect(0, 0, currentDrawing.width, currentDrawing.height);
      context.drawImage(image, 0, 0, currentDrawing.width, currentDrawing.height);
      URL.revokeObjectURL(url);
      const anchor = document.createElement("a");
      anchor.download = "genealogiko-dentro-apostolaki.png";
      anchor.href = canvas.toDataURL("image/png");
      anchor.click();
      els.treeStatus.textContent = "Το ορατό δένδρο εξήχθη ως εικόνα PNG.";
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      els.treeStatus.textContent = "Η εξαγωγή PNG δεν ολοκληρώθηκε. Δοκίμασε την επιλογή Εκτύπωση / PDF.";
    };
    image.src = url;
  }

  function changeCurrentUnion(delta) {
    const targetId = state.path.length ? state.path.at(-1).personId : "root";
    const families = familiesFor(targetId);
    const current = activeUnionIndex(targetId);
    const next = current + delta;
    if (next < 0 || next >= families.length) return;
    if (targetId === "root") state.rootUnionIndex = next;
    else state.path[state.path.length - 1].unionIndex = next;
    state.selectedId = targetId;
    render();
  }

  function bindEvents() {
    els.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const person = choosePerson(els.searchInput.value);
      if (!person) {
        els.searchStatus.textContent = "Δεν βρέθηκε πρόσωπο με αυτή την αναζήτηση.";
        return;
      }
      els.searchInput.value = personName(person);
      els.searchStatus.textContent = "Άνοιξε η διαδρομή προς: " + personName(person) + ".";
      setSelected(person.id, { openLineage: true, focus: true });
    });

    els.placeFilter.addEventListener("change", () => {
      state.place = els.placeFilter.value;
      render();
    });
    els.spouseToggle.addEventListener("change", () => {
      state.showSpouses = els.spouseToggle.checked;
      render();
    });
    els.viewButtons.forEach((button) => button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    }));
    els.backButton.addEventListener("click", () => {
      if (!state.path.length) return;
      state.path.pop();
      state.selectedId = state.path.at(-1)?.personId || "root";
      render();
    });
    els.homeButton.addEventListener("click", () => {
      state.rootUnionIndex = 0;
      state.path = [];
      state.selectedId = "root";
      state.relationship = null;
      els.relationshipStatus.textContent = "";
      render();
    });
    els.focusButton.addEventListener("click", focusSelected);
    els.zoomOutButton.addEventListener("click", () => {
      state.zoom = Math.max(.65, Number((state.zoom - .15).toFixed(2)));
      render();
    });
    els.zoomInButton.addEventListener("click", () => {
      state.zoom = Math.min(1.65, Number((state.zoom + .15).toFixed(2)));
      render();
    });
    els.fitButton.addEventListener("click", () => {
      state.zoom = Number(Math.max(.5, Math.min(1, (els.treeViewport.clientWidth - 8) / currentDrawing.width)).toFixed(2));
      render();
      els.treeViewport.scrollTo({ left: 0, behavior: "smooth" });
    });
    els.shareButton.addEventListener("click", copyShareLink);
    els.relationshipForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const first = choosePerson(els.relativeOne.value);
      const second = choosePerson(els.relativeTwo.value);
      if (!first || !second) {
        els.relationshipStatus.textContent = "Γράψε δύο ονόματα όπως εμφανίζονται στην αναζήτηση.";
        return;
      }
      const relationship = findRelationship(first, second);
      if (!relationship) {
        els.relationshipStatus.textContent = "Δεν βρέθηκε κοινή καταγεγραμμένη γραμμή καταγωγής.";
        return;
      }
      state.relationship = relationship;
      els.relativeOne.value = personName(first);
      els.relativeTwo.value = personName(second);
      els.relationshipStatus.textContent = "Κοινός πρόγονος: " + displayLabel(personFromId(relationship.commonId).label) + ". Η διαδρομή τονίστηκε στο δένδρο.";
      render();
    });
    els.clearRelationshipButton.addEventListener("click", () => {
      state.relationship = null;
      els.relativeOne.value = "";
      els.relativeTwo.value = "";
      els.relationshipStatus.textContent = "";
      render();
    });
    els.exportImageButton.addEventListener("click", exportPng);
    els.exportPdfButton.addEventListener("click", () => window.print());
    document.getElementById("previous-union-button")?.addEventListener("click", () => changeCurrentUnion(-1));
    document.getElementById("next-union-button")?.addEventListener("click", () => changeCurrentUnion(1));
    window.addEventListener("resize", () => {
      clearTimeout(pendingResize);
      pendingResize = setTimeout(render, 140);
    });
    window.addEventListener("hashchange", () => {
      readHash();
      render();
      requestAnimationFrame(focusSelected);
    });
  }

  async function boot() {
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) throw new Error("Δεν ήταν δυνατή η φόρτωση των δεδομένων.");
      familyData = await response.json();
      nodesById = new Map(familyData.nodes.map((person) => [person.id, person]));
      familiesByPrincipal = new Map();
      familyData.families.forEach((family) => {
        const families = familiesByPrincipal.get(family.principal_id) || [];
        families.push(family);
        familiesByPrincipal.set(family.principal_id, families);
      });
      buildAccentVocabulary();
      updatePersonOptions();
      updatePlaceOptions();
      readHash();
      bindEvents();
      render();
      requestAnimationFrame(focusSelected);
    } catch (error) {
      els.treeStatus.textContent = error.message || "Η φόρτωση του δένδρου απέτυχε.";
    }
  }

  boot();
})();
