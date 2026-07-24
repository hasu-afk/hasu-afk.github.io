// Fires once the page's HTML has finished loading
document.addEventListener('DOMContentLoaded', function () {

    const music = document.getElementById('bg-music');
    const toggleBtn = document.getElementById('music-toggle');
    if (!music || !toggleBtn) {
        return;
    }

    music.volume = 0.4;

    // tracks whether the music has ever been started
    var hasStarted = false;

    function updateButtonLabel() {
        if (music.paused) {
            toggleBtn.textContent = '🔇 Music';
        } else {
            toggleBtn.textContent = '🔈 Music';
        }
    }

    function startMusic() {
        if (hasStarted) {
            return;
        }
        hasStarted = true;
        music.play();
        updateButtonLabel();
    }

    // start music on the first interaction anywhere on the page
    var startEvents = ['click', 'keydown', 'touchstart'];
    for (let i = 0; i < startEvents.length; i++) {
        document.addEventListener(startEvents[i], startMusic, { once: true });
    }

    // manual toggle button
    toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation(); // don't also trigger the page-wide startMusic listener
        if (music.paused) {
            music.play();
            hasStarted = true;
        } else {
            music.pause();
        }
        updateButtonLabel();
    });

    music.addEventListener('play', updateButtonLabel);
    music.addEventListener('pause', updateButtonLabel);
});
// Music track: Donut by Lukrembo
//Source: https://freetouse.com/music
//https://freetouse.com/music/lukrembo/donut
//No Copyright Vlog Music for Videos

// PAGE MANAGEMENT
// lay everything out in advance, hide all, display only on demand
document.addEventListener('DOMContentLoaded', function () {

    const navLinks = document.querySelectorAll('.nav1 a');
    const pages = document.querySelectorAll('.main article');

    var defaultPageId = null;
    if (pages.length > 0) {
        defaultPageId = pages[0].id;
    }

    // quick lookup of pages by id
    const pageMap = {};
    for (let page of pages) {
        pageMap[page.id] = page;
    }

    function showPage(pageId) {
        // fall back to the default page if the id doesn't match anything
        if (!pageMap[pageId]) {
            pageId = defaultPageId;
        }

        // hide every page, then reveal only the target one
        for (let page of pages) {
            page.hidden = page.id !== pageId;
        }

        // sync the "active" class on the nav links
        for (let link of navLinks) {
            let linkId = link.getAttribute('href').replace('#', '');
            if (linkId === pageId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        }

        // keep the main content area scrolled to the top on page change
        window.scrollTo({ top: document.querySelector('.main').offsetTop, behavior: 'smooth' });
    }

    function handleNavClick(event) {
        var href = event.currentTarget.getAttribute('href');

        // only intercept internal #anchor links; let external links behave normally
        if (href.indexOf('#') !== 0) {
            return;
        }

        event.preventDefault();
        var pageId = href.replace('#', '');

        // update the URL hash without a jarring jump-scroll
        history.pushState(null, '', href);
        showPage(pageId);
    }

    for (let link of navLinks) {
        link.addEventListener('click', handleNavClick);
    }

    // support browser Back/Forward buttons
    window.addEventListener('popstate', function () {
        var pageId = window.location.hash.replace('#', '');
        if (!pageId) {
            pageId = defaultPageId;
        }
        showPage(pageId);
    });

    // initial page load: honor a hash in the URL, otherwise show the first page
    var initialPageId = window.location.hash.replace('#', '');
    if (!initialPageId) {
        initialPageId = defaultPageId;
    }
    showPage(initialPageId);
});

// RECYCLING SORTING GAME
// drag each item into its matching bin
document.addEventListener('DOMContentLoaded', function () {

    const ITEMS = [
        { id: 'cardboard', icon: '📦', bin: 'paper',   binLabel: 'Paper' },
        { id: 'bottle',    icon: '🧴', bin: 'plastic', binLabel: 'Plastic' },
        { id: 'jar',       icon: '🫙', bin: 'glass',   binLabel: 'Glass' },
        { id: 'can',       icon: '🥫', bin: 'metal',   binLabel: 'Metal' },
        { id: 'banana',    icon: '🍌', bin: 'compost', binLabel: 'Compost' }
    ];

    const itemsEl = document.getElementById('game-items');
    const binsEl = document.getElementById('game-bins');

    // if the game markup isn't on the page, don't run any of this
    if (!itemsEl || !binsEl) {
        return;
    }

    const scoreEl = document.getElementById('game-score');
    const attemptsEl = document.getElementById('game-attempts');
    const winMsgEl = document.getElementById('game-win-msg');
    const resetBtn = document.getElementById('game-reset');

    // feedback sounds - if these files are missing, play() just fails quietly
    const correctAudio = new Audio('Audio/correct.mp3');
    const wrongAudio = new Audio('Audio/wrong.mp3');

    var score = 0;
    var attempts = 0;
    var matchedIds = []; // ids of items already placed in the correct bin

    // info about whatever item is currently being dragged
    var dragEl = null;
    var dragItem = null;
    var dragOffsetX = 0;
    var dragOffsetY = 0;

    // pick a random whole number between min and max
    function GetRandom(min, max) {
        return Math.round(Math.random() * (max - min)) + min;
    }

    // return a shuffled copy of an array
    function shuffle(arr) {
        var copy = [];
        for (let i = 0; i < arr.length; i++) {
            copy.push(arr[i]);
        }
        for (let i = copy.length - 1; i > 0; i--) {
            let j = GetRandom(0, i);
            let temp = copy[i];
            copy[i] = copy[j];
            copy[j] = temp;
        }
        return copy;
    }

    function isMatched(id) {
        for (let i = 0; i < matchedIds.length; i++) {
            if (matchedIds[i] === id) {
                return true;
            }
        }
        return false;
    }

    function updateScoreboard() {
        scoreEl.textContent = score;
        attemptsEl.textContent = attempts;
    }

    function clearBinHighlights() {
        var bins = binsEl.querySelectorAll('.game-bin');
        for (let bin of bins) {
            bin.classList.remove('over');
        }
    }

    // find which bin (if any) contains the given page coordinate
    function findBinAtPoint(x, y) {
        var bins = binsEl.querySelectorAll('.game-bin');
        for (let bin of bins) {
            let r = bin.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
                return bin;
            }
        }
        return null;
    }

    function startDrag(evt, el, item) {
        if (isMatched(item.id)) {
            return;
        }
        evt.preventDefault();

        var rect = el.getBoundingClientRect();
        dragEl = el;
        dragItem = item;
        dragOffsetX = evt.clientX - rect.left;
        dragOffsetY = evt.clientY - rect.top;

        // lock in the current size, then switch to fixed positioning so
        // it can be moved freely with left/top
        el.style.width = rect.width + "px";
        el.style.height = rect.height + "px";
        el.style.left = rect.left + "px";
        el.style.top = rect.top + "px";
        el.style.position = "fixed";
        el.classList.add("dragging");

        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    function onDragMove(evt) {
        if (!dragEl) {
            return;
        }

        dragEl.style.left = (evt.clientX - dragOffsetX) + "px";
        dragEl.style.top = (evt.clientY - dragOffsetY) + "px";

        // highlight whichever bin the mouse is currently over
        var hoverBin = findBinAtPoint(evt.clientX, evt.clientY);
        var bins = binsEl.querySelectorAll(".game-bin");
        for (let bin of bins) {
            if (bin === hoverBin) {
                bin.classList.add("over");
            } else {
                bin.classList.remove("over");
            }
        }
    }

    function onDragEnd(evt) {
        if (!dragEl) {
            return;
        }

        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);

        var el = dragEl;
        var item = dragItem;
        el.classList.remove("dragging");

        var dropBin = findBinAtPoint(evt.clientX, evt.clientY);
        clearBinHighlights();
        handleDrop(el, item, dropBin);

        dragEl = null;
        dragItem = null;
    }

    function handleDrop(el, item, bin) {
        attempts++;

        if (bin && item.bin === bin.binId) {
            // correct bin!
            score += 10;
            matchedIds.push(item.id);
            correctAudio.currentTime = 0;
            correctAudio.play();

            el.classList.add("placed");
            bin.classList.add("filled", "correct-flash");
            setTimeout(function () {
                bin.classList.remove("correct-flash");
            }, 500);

            if (matchedIds.length === ITEMS.length) {
                winMsgEl.style.display = "block";
            }
        } else {
            // wrong bin, or dropped outside any bin - give a little shake
            wrongAudio.currentTime = 0;
            wrongAudio.play();

            el.classList.add("wrong-shake");
            setTimeout(function () {
                el.classList.remove("wrong-shake");
            }, 400);

            if (bin) {
                bin.classList.add("wrong-flash");
                setTimeout(function () {
                    bin.classList.remove("wrong-flash");
                }, 500);
            }
        }

        // release the fixed positioning so the item snaps back into its
        // normal spot (or disappears, since "placed" hides it via CSS)
        el.style.position = "";
        el.style.left = "";
        el.style.top = "";
        el.style.width = "";
        el.style.height = "";

        updateScoreboard();
    }

    function createDraggableItem(item) {
        const el = document.createElement("div");
        el.className = "game-item";
        el.textContent = item.icon;
        el.id = "game-item-" + item.id;

        el.addEventListener("mousedown", function (evt) {
            startDrag(evt, el, item);
        });

        return el;
    }

    function createBin(bin) {
        const el = document.createElement("div");
        el.className = "game-bin";
        el.binId = bin.id; // store the bin's id directly on the element
        el.innerHTML = "<span class=\"bin-icon\">🗑️</span><span>" + bin.label + "</span>";
        return el;
    }

    // build a de-duplicated list of bins from the items' bin categories
    function buildUniqueBins() {
        var uniqueBins = [];
        for (let i = 0; i < ITEMS.length; i++) {
            let alreadyAdded = false;
            for (let j = 0; j < uniqueBins.length; j++) {
                if (uniqueBins[j].id === ITEMS[i].bin) {
                    alreadyAdded = true;
                }
            }
            if (!alreadyAdded) {
                uniqueBins.push({ id: ITEMS[i].bin, label: ITEMS[i].binLabel });
            }
        }
        return uniqueBins;
    }

    function initGame() {
        score = 0;
        attempts = 0;
        matchedIds = [];
        dragEl = null;
        dragItem = null;
        updateScoreboard();
        winMsgEl.style.display = "none";

        itemsEl.innerHTML = "";
        binsEl.innerHTML = "";

        var shuffledItems = shuffle(ITEMS);
        for (let i = 0; i < shuffledItems.length; i++) {
            itemsEl.appendChild(createDraggableItem(shuffledItems[i]));
        }

        var shuffledBins = shuffle(buildUniqueBins());
        for (let i = 0; i < shuffledBins.length; i++) {
            binsEl.appendChild(createBin(shuffledBins[i]));
        }
    }

    resetBtn.addEventListener("click", initGame);

    initGame();
});
