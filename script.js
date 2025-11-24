const TIMER_DEFAULT = 25 * 60;
let timeLeft = TIMER_DEFAULT;
let timerInterval = null;
let isRunning = false;

// DOM Elements
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const themeToggleBtn = document.getElementById('themeToggle');
const musicToggleBtn = document.getElementById('musicToggle');
const canvas = document.getElementById('backgroundCanvas');
const customTimerBtn = document.getElementById('customTimerBtn');
const alarmSound = document.getElementById('alarmSound');
const bgm = document.getElementById('bgm');

// Themes
const snowTheme = new PixelSnowTheme(canvas);
const leavesTheme = new PixelLeavesTheme(canvas);
let currentTheme = 'snow'; // 'snow' or 'leaves'

// Audio State
let isMusicOn = true;

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return {
        h: h > 0 ? h.toString().padStart(2, '0') : null,
        m: m.toString().padStart(2, '0'),
        s: s.toString().padStart(2, '0')
    };
}

function updateDisplay() {
    const time = formatTime(timeLeft);
    if (time.h) {
        minutesEl.textContent = `${time.h}:${time.m}`;
        secondsEl.textContent = time.s;
        document.title = `${time.h}:${time.m}:${time.s} - Focus`;
    } else {
        minutesEl.textContent = time.m;
        secondsEl.textContent = time.s;
        document.title = `${time.m}:${time.s} - Focus`;
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendNotification() {
    if ('serviceWorker' in navigator && 'Notification' in window) {
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('Pomodoro Complete', {
                    body: 'Time’s up! Take a break.',
                    icon: 'icon.jpg',
                    vibrate: [200, 100, 200]
                });
            });
        }
    }
}

function unlockAudio() {
    // Only unlock alarm here. BGM is handled by user interaction on start/toggle.
    const alarm = document.getElementById("alarmSound");
    alarm.play().then(() => {
        alarm.pause();
        alarm.currentTime = 0;
    }).catch(() => { });
}

function startTimer() {
    if (isRunning) return;

    requestNotificationPermission();
    unlockAudio();

    isRunning = true;
    startPauseBtn.textContent = 'Pause';
    startPauseBtn.classList.add('active');

    if (isMusicOn) {
        bgm.loop = true;
        bgm.currentTime = 0;
        bgm.play().catch(e => console.log("BGM play failed", e));
    }

    // Use Date.now() for accuracy
    const endTime = Date.now() + timeLeft * 1000;

    timerInterval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((endTime - now) / 1000);

        if (remaining >= 0) {
            timeLeft = remaining;
            updateDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            timeLeft = 0;
            updateDisplay();
            startPauseBtn.textContent = 'Start';
            startPauseBtn.classList.remove('active');

            bgm.pause();
            bgm.currentTime = 0;

            sendNotification();
            try {
                alarmSound.currentTime = 0;
                alarmSound.play();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            } catch (e) {
                console.log("Audio play failed", e);
            }
            showTimeUpModal();
        }
    }, 1000);
}

// Time Up Modal Logic
const timeUpModal = document.getElementById('timeUpModal');
const timeUpOkBtn = document.getElementById('timeUpOkBtn');

function showTimeUpModal() {
    timeUpModal.classList.remove('hidden');
}

function hideTimeUpModal() {
    timeUpModal.classList.add('hidden');
    alarmSound.pause();
    alarmSound.currentTime = 0;
}

timeUpOkBtn.addEventListener('click', hideTimeUpModal);

function pauseTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    startPauseBtn.textContent = 'Start';
    startPauseBtn.classList.remove('active');

    bgm.pause();

    alarmSound.pause();
    alarmSound.currentTime = 0;
}

function resetTimer() {
    pauseTimer();
    timeLeft = TIMER_DEFAULT;
    updateDisplay();

    bgm.pause();
    bgm.currentTime = 0;

    alarmSound.pause();
    alarmSound.currentTime = 0;
}

// Event Listeners
startPauseBtn.addEventListener('click', () => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);

document.querySelectorAll('.preset-btn').forEach(btn => {
    if (btn.id === 'customTimerBtn') return;
    btn.addEventListener('click', (e) => {
        const minutes = parseInt(e.target.dataset.time);
        pauseTimer();
        timeLeft = minutes * 60;
        updateDisplay();
    });
});

// Custom Timer Modal Logic
const customTimerModal = document.getElementById('customTimerModal');
const modalHr = document.getElementById('modalHr');
const modalMin = document.getElementById('modalMin');
const modalSec = document.getElementById('modalSec');
const unitBtns = document.querySelectorAll('.unit-btn');
const numBtns = document.querySelectorAll('.num-btn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalSetBtn = document.getElementById('modalSetBtn');

let customTime = { hr: "00", min: "00", sec: "00" };
let currentUnit = 'min'; // Default unit

function openCustomTimer() {
    customTime = { hr: "00", min: "00", sec: "00" };
    currentUnit = 'min';
    updateModalDisplay();
    updateUnitButtons();
    customTimerModal.classList.remove('hidden');
}

function closeCustomTimer() {
    customTimerModal.classList.add('hidden');
}

function updateModalDisplay() {
    modalHr.textContent = customTime.hr;
    modalMin.textContent = customTime.min;
    modalSec.textContent = customTime.sec;
}

function updateUnitButtons() {
    unitBtns.forEach(btn => {
        if (btn.dataset.unit === currentUnit) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentUnit = btn.dataset.unit;
        updateUnitButtons();
    });
});

numBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const num = btn.dataset.num;
        let currentVal = customTime[currentUnit];

        // Append number, max 2 digits
        if (currentVal === "00") {
            currentVal = "0" + num;
        } else {
            currentVal += num;
        }

        // Keep last 2 digits
        currentVal = currentVal.slice(-2);

        customTime[currentUnit] = currentVal;
        updateModalDisplay();
    });
});

modalCancelBtn.addEventListener('click', closeCustomTimer);

modalSetBtn.addEventListener('click', () => {
    const hours = parseInt(customTime.hr);
    const minutes = parseInt(customTime.min);
    const seconds = parseInt(customTime.sec);

    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

    if (totalSeconds > 0) {
        pauseTimer();
        timeLeft = totalSeconds;
        updateDisplay();
        closeCustomTimer();
    } else {
        alert("Please set a time greater than 0.");
    }
});

if (customTimerBtn) {
    customTimerBtn.addEventListener('click', openCustomTimer);
}

// Theme Switching
function switchTheme() {
    if (currentTheme === 'snow') {
        currentTheme = 'leaves';
        snowTheme.stop();
        leavesTheme.start();
        document.body.style.backgroundColor = '#2d3436'; // Darker grey for autumn
    } else {
        currentTheme = 'snow';
        leavesTheme.stop();
        snowTheme.start();
        document.body.style.backgroundColor = '#202020'; // Darker for pixel snow
    }
}

themeToggleBtn.addEventListener('click', switchTheme);

// Music Toggle
musicToggleBtn.addEventListener('click', () => {
    isMusicOn = !isMusicOn;
    musicToggleBtn.textContent = isMusicOn ? '[MUSIC: ON]' : '[MUSIC: OFF]';

    if (isRunning) {
        if (isMusicOn) {
            bgm.play().catch(e => console.log("BGM play failed", e));
        } else {
            bgm.pause();
        }
    }
});

// Handle Resize
window.addEventListener('resize', () => {
    if (currentTheme === 'snow') snowTheme.resize();
    if (currentTheme === 'leaves') leavesTheme.resize();
});

// Init
updateDisplay();
snowTheme.start(); // Default theme
