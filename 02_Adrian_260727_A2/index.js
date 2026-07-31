document.addEventListener('DOMContentLoaded', function () {

    // ============================
    // BACKGROUND MUSIC
    // ============================
    const music = document.getElementById('bg-music');
    const musicBtn = document.getElementById('music-toggle');
    music.volume = 0.4;

    musicBtn.addEventListener('click', function () {
        if (music.paused) {
            music.play();
            musicBtn.textContent = '🔈 Music';
        } else {
            music.pause();
            musicBtn.textContent = '🔇 Music';
        }
    });

    // ============================
    // PAGE NAVIGATION
    // ============================
    const navLinks = document.querySelectorAll('.nav1 a');
    const pages = document.querySelectorAll('.main article');

    function hideAllPages() {
        for (let page of pages) {
            page.style.display = 'none';
        }
    }

    function showPage(pageId) {
        hideAllPages();
        const target = document.getElementById(pageId);
        if (target) {
            target.style.display = 'block';
        }
        setActiveLink(pageId);
    }

    function setActiveLink(pageId) {
        for (let link of navLinks) {
            const linkPageId = link.getAttribute('href').replace('#', '');
            if (linkPageId === pageId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        }
    }

    for (let link of navLinks) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const pageId = link.getAttribute('href').replace('#', '');
            showPage(pageId);
        });
    }

    // show the first page when the site first loads
    showPage(pages[0].id);

    // ============================
    // RECYCLING SORTING GAME
    // ============================
    const ITEMS = [
        { id: 'cardboard', icon: '📦', bin: 'paper',   binLabel: 'Paper' },
        { id: 'bottle',    icon: '🧴', bin: 'plastic', binLabel: 'Plastic' },
        { id: 'jar',       icon: '🫙', bin: 'glass',   binLabel: 'Glass' },
        { id: 'can',       icon: '🥫', bin: 'metal',   binLabel: 'Metal' }
    ];

    const itemsEl = document.getElementById('game-items');
    const binsEl = document.getElementById('game-bins');
    const scoreEl = document.getElementById('game-score');
    const attemptsEl = document.getElementById('game-attempts');
    const winMsgEl = document.getElementById('game-win-msg');
    const resetBtn = document.getElementById('game-reset');
    const timerEl = document.getElementById('game-timer');

    const correctAudio = new Audio('Audio/correct.mp3');
    const wrongAudio = new Audio('Audio/wrong.mp3');

    var score = 0;
    var attempts = 0;
    var matchedIds = [];
    var elapsedSeconds = 0;
    var timerIntervalId = null;

    // info about whatever item is currently being dragged
    var draggedItem = null;
    var draggedEl = null;
    var offsetX = 0;
    var offsetY = 0;

    // pick a random whole number between min and max
    function GetRandom(min, max) {
        return Math.round(Math.random() * (max - min)) + min;
    }

    // shuffle an array into a random new order
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

    // ============================
    // TIMER
    // ============================
    function formatTime(totalSeconds) {
        var mins = Math.floor(totalSeconds / 60);
        var secs = totalSeconds % 60;
        var minsStr = mins < 10 ? '0' + mins : '' + mins;
        var secsStr = secs < 10 ? '0' + secs : '' + secs;
        return minsStr + ':' + secsStr;
    }

    function updateTimerDisplay() {
        if (timerEl) {
            timerEl.textContent = formatTime(elapsedSeconds);
        }
    }

    function startTimer() {
        stopTimer(); // clear any running timer first
        elapsedSeconds = 0;
        updateTimerDisplay();
        timerIntervalId = setInterval(function () {
            elapsedSeconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (timerIntervalId) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
        }
    }

    function createItemElement(item) {
        const el = document.createElement('div');
        el.className = 'game-item';
        el.textContent = item.icon;
        el.id = 'game-item-' + item.id;

        el.addEventListener('mousedown', function (event) {
            startDrag(event, el, item);
        });

        return el;
    }

    function createBinElement(binId, binLabel) {
        const el = document.createElement('div');
        el.className = 'game-bin';
        el.binId = binId;
        el.innerHTML = '<span class="bin-icon">🗑️</span><span>' + binLabel + '</span>';
        return el;
    }

    function startDrag(event, el, item) {
        if (isMatched(item.id)) {
            return;
        }
        event.preventDefault();

        draggedItem = item;
        draggedEl = el;

        var rect = el.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;

        el.style.position = 'fixed';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.classList.add('dragging');

        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('mouseup', endDrag);
    }

    function moveDrag(event) {
        draggedEl.style.left = (event.clientX - offsetX) + 'px';
        draggedEl.style.top = (event.clientY - offsetY) + 'px';
    }

    function endDrag(event) {
        document.removeEventListener('mousemove', moveDrag);
        document.removeEventListener('mouseup', endDrag);

        draggedEl.classList.remove('dragging');

        var droppedBin = findBinUnderPoint(event.clientX, event.clientY);
        checkAnswer(draggedEl, draggedItem, droppedBin);

        draggedEl = null;
        draggedItem = null;
    }

    function findBinUnderPoint(x, y) {
        var bins = binsEl.querySelectorAll('.game-bin');
        for (let bin of bins) {
            let rect = bin.getBoundingClientRect();
            if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
                return bin;
            }
        }
        return null;
    }

    function checkAnswer(el, item, bin) {
        attempts++;

        if (bin && bin.binId === item.bin) {
            score += 10;
            matchedIds.push(item.id);
            el.classList.add('placed');
            bin.classList.add('filled', 'correct-flash');
            correctAudio.play();
            setTimeout(function () {
                bin.classList.remove('correct-flash');
            }, 500);

            if (matchedIds.length === ITEMS.length) {
                stopTimer();

                //reward speed: divide score by time taken, then scale back up
                //(use at least 1 second so we never divide by zero)
                var timeForScore = elapsedSeconds > 0 ? elapsedSeconds : 1;
                var finalScore = Math.round((score / timeForScore) * 100);

                winMsgEl.innerHTML =
                    'You sorted everything in ' + formatTime(elapsedSeconds) + '!<br>' +
                    'Score: ' + score + '<br>' +
                    'Final score: ' + finalScore;
                winMsgEl.style.display = 'block';
            }
        } else {
            wrongAudio.play();
            el.classList.add('wrong-shake');
            setTimeout(function () {
                el.classList.remove('wrong-shake');
            }, 400);
        }

        // put the item back into the normal page layout
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';

        updateScoreboard();
    }

    function startGame() {
        score = 0;
        attempts = 0;
        matchedIds = [];
        updateScoreboard();
        winMsgEl.style.display = 'none';
        startTimer();

        itemsEl.innerHTML = '';
        binsEl.innerHTML = '';

        var shuffledItems = shuffle(ITEMS);
        for (let i = 0; i < shuffledItems.length; i++) {
            itemsEl.appendChild(createItemElement(shuffledItems[i]));
        }

        var binIds = [];
        for (let i = 0; i < ITEMS.length; i++) {
            if (binIds.indexOf(ITEMS[i].bin) === -1) {
                binIds.push(ITEMS[i].bin);
            }
        }

        var shuffledBinIds = shuffle(binIds);
        for (let i = 0; i < shuffledBinIds.length; i++) {
            var binId = shuffledBinIds[i];
            var binLabel = '';
            for (let j = 0; j < ITEMS.length; j++) {
                if (ITEMS[j].bin === binId) {
                    binLabel = ITEMS[j].binLabel;
                }
            }
            binsEl.appendChild(createBinElement(binId, binLabel));
        }
    }

    resetBtn.addEventListener('click', startGame);
    startGame();
});
