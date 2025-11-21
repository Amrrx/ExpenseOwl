const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFBE0B', '#FF006E', '#8338EC', '#3A86FF', 
    '#FB5607', '#38B000', '#9B5DE5', '#F15BB5'
];
const currencyBehaviors = {
    usd: {symbol: "$", useComma: false, useDecimals: true, useSpace: false, right: false},
    eur: {symbol: "€", useComma: true, useDecimals: true, useSpace: false, right: false},
    egp: {symbol: "E£", useComma: false, useDecimals: true, useSpace: true, right: false},
    gbp: {symbol: "£", useComma: false, useDecimals: true, useSpace: false, right: false},
    jpy: {symbol: "¥", useComma: false, useDecimals: false, useSpace: false, right: false},
    cny: {symbol: "¥", useComma: false, useDecimals: true, useSpace: false, right: false},
    krw: {symbol: "₩", useComma: false, useDecimals: false, useSpace: false, right: false},
    inr: {symbol: "₹", useComma: false, useDecimals: true, useSpace: false, right: false},
    rub: {symbol: "₽", useComma: true, useDecimals: true, useSpace: false, right: false},
    brl: {symbol: "R$", useComma: true, useDecimals: true, useSpace: false, right: false},
    zar: {symbol: "R", useComma: false, useDecimals: true, useSpace: true, right: true},
    aed: {symbol: "AED", useComma: false, useDecimals: true, useSpace: true, right: true},
    aud: {symbol: "A$", useComma: false, useDecimals: true, useSpace: false, right: false},
    cad: {symbol: "C$", useComma: false, useDecimals: true, useSpace: false, right: false},
    chf: {symbol: "Fr", useComma: false, useDecimals: true, useSpace: true, right: true},
    hkd: {symbol: "HK$", useComma: false, useDecimals: true, useSpace: false, right: false},
    bdt: {symbol: "৳", useComma: false, useDecimals: true, useSpace: false, right: false},
    sgd: {symbol: "S$", useComma: false, useDecimals: true, useSpace: false, right: false},
    thb: {symbol: "฿", useComma: false, useDecimals: true, useSpace: false, right: false},
    try: {symbol: "₺", useComma: true, useDecimals: true, useSpace: false, right: false},
    mxn: {symbol: "Mex$", useComma: false, useDecimals: true, useSpace: false, right: false},
    php: {symbol: "₱", useComma: false, useDecimals: true, useSpace: false, right: false},
    pln: {symbol: "zł", useComma: true, useDecimals: true, useSpace: true, right: true},
    sek: {symbol: "kr", useComma: false, useDecimals: true, useSpace: true, right: true},
    nzd: {symbol: "NZ$", useComma: false, useDecimals: true, useSpace: false, right: false},
    dkk: {symbol: "kr.", useComma: true, useDecimals: true, useSpace: true, right: true},
    idr: {symbol: "Rp", useComma: false, useDecimals: true, useSpace: true, right: true},
    ils: {symbol: "₪", useComma: false, useDecimals: true, useSpace: false, right: false},
    vnd: {symbol: "₫", useComma: true, useDecimals: false, useSpace: true, right: true},
    myr: {symbol: "RM", useComma: false, useDecimals: true, useSpace: false, right: false},
    mad: {symbol: "DH", useComma: false, useDecimals: true, useSpace: true, right: true},
};

function formatCurrency(amount) {
    const behavior = currencyBehaviors[currentCurrency] || {
        symbol: "$",
        useComma: false,
        useDecimals: true,
        useSpace: false,
        right: false,
    };
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    const options = {
        minimumFractionDigits: behavior.useDecimals ? 2 : 0,
        maximumFractionDigits: behavior.useDecimals ? 2 : 0,
    };
    let formattedAmount = new Intl.NumberFormat(behavior.useComma ? "de-DE" : "en-US",options).format(absAmount);
    let result = behavior.right
        ? `${formattedAmount}${behavior.useSpace ? " " : ""}${behavior.symbol}`
        : `${behavior.symbol}${behavior.useSpace ? " " : ""}${formattedAmount}`;
    return isNegative ? `-${result}` : result;
}

function getUserTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatMonth(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        timeZone: getUserTimeZone()
    });
}

function getISODateWithLocalTime(dateInput) {
    const [year, month, day] = dateInput.split('-').map(Number);
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const localDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
    return localDateTime.toISOString();
}

function formatDateFromUTC(utcDateString) {
    const date = new Date(utcDateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

function updateMonthDisplay() {
    const currentMonthEl = document.getElementById('currentMonth');
    if (currentMonthEl) {
        currentMonthEl.textContent = formatMonth(currentDate);
    }
}

function getMonthBounds(date) {
    const localDate = new Date(date);
    if (startDate === 1) {
        const startLocal = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
        const endLocal = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: new Date(startLocal.toISOString()), end: new Date(endLocal.toISOString()) };
    }
    let thisMonthStartDate = startDate;
    let prevMonthStartDate = startDate;

    const currentMonth = localDate.getMonth();
    const currentYear = localDate.getFullYear();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    thisMonthStartDate = Math.min(thisMonthStartDate, daysInCurrentMonth);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    prevMonthStartDate = Math.min(prevMonthStartDate, daysInPrevMonth);

    if (localDate.getDate() < thisMonthStartDate) {
        const startLocal = new Date(prevYear, prevMonth, prevMonthStartDate);
        const endLocal = new Date(currentYear, currentMonth, thisMonthStartDate - 1, 23, 59, 59, 999);
        return { start: new Date(startLocal.toISOString()), end: new Date(endLocal.toISOString()) };
    } else {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
        let nextMonthStartDate = Math.min(startDate, daysInNextMonth);
        const startLocal = new Date(currentYear, currentMonth, thisMonthStartDate);
        const endLocal = new Date(nextYear, nextMonth, nextMonthStartDate - 1, 23, 59, 59, 999);
        return { start: new Date(startLocal.toISOString()), end: new Date(endLocal.toISOString()) };
    }
}

function getMonthExpenses(expenses) {
    const { start, end } = getMonthBounds(currentDate);
    return expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ============================================================
// Voice Recording & AI Parsing
// ============================================================

let mediaRecorder;
let audioChunks = [];
let recordingTimeout;
const MAX_RECORDING_TIME = 15000; // 15 seconds
let currentCategories = [];

async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendAudioForParsing(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();

        // Auto-stop after 15 seconds
        recordingTimeout = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopVoiceRecording();
            }
        }, MAX_RECORDING_TIME);

        updateVoiceUI('recording');
    } catch (error) {
        console.error('Error starting recording:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        clearTimeout(recordingTimeout);
        mediaRecorder.stop();
        updateVoiceUI('processing');
    }
}

async function sendAudioForParsing(audioBlob) {
    try {
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);

        reader.onloadend = async () => {
            try {
                const base64Audio = reader.result;

                const response = await fetch('/voice/parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audioData: base64Audio })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to parse audio');
                }

                const result = await response.json();
                showReviewScreen(result);
            } catch (error) {
                console.error('Error parsing audio:', error);
                alert('Failed to parse voice input: ' + error.message);
                updateVoiceUI('idle');
            }
        };
    } catch (error) {
        console.error('Error processing audio:', error);
        alert('Failed to process audio: ' + error.message);
        updateVoiceUI('idle');
    }
}

function updateVoiceUI(state) {
    const voiceButton = document.getElementById('voiceButton');
    const voiceStatus = document.getElementById('voiceStatus');

    if (!voiceButton) return;

    switch (state) {
        case 'recording':
            voiceButton.classList.add('recording');
            voiceButton.innerHTML = '<i class="fas fa-stop-circle"></i>';
            if (voiceStatus) voiceStatus.textContent = 'Recording... (tap to stop)';
            voiceButton.onclick = stopVoiceRecording;
            break;
        case 'processing':
            voiceButton.classList.remove('recording');
            voiceButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            if (voiceStatus) voiceStatus.textContent = 'Processing...';
            voiceButton.onclick = null;
            break;
        case 'idle':
        default:
            voiceButton.classList.remove('recording');
            voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            if (voiceStatus) voiceStatus.textContent = '';
            voiceButton.onclick = startVoiceRecording;
            break;
    }
}

function showReviewScreen(parseResult) {
    const reviewModal = document.getElementById('voiceReviewModal');
    const reviewList = document.getElementById('reviewExpenseList');
    const transcript = document.getElementById('voiceTranscript');

    if (!reviewModal) return;

    // Show transcript
    if (transcript && parseResult.transcript) {
        transcript.textContent = '"' + parseResult.transcript + '"';
    }

    // Clear previous results
    reviewList.innerHTML = '';

    if (!parseResult.expenses || parseResult.expenses.length === 0) {
        reviewList.innerHTML = '<p class="no-expenses">No expenses detected in audio.</p>';
    } else {
        // Create expense cards
        parseResult.expenses.forEach((expense, index) => {
            const card = createExpenseReviewCard(expense, index);
            reviewList.appendChild(card);
        });
    }

    // Show modal
    reviewModal.style.display = 'flex';
    updateVoiceUI('idle');
}

function createExpenseReviewCard(expense, index) {
    const card = document.createElement('div');
    card.className = 'expense-review-card';
    if (expense.confidence < 0.7 || expense.ambiguous) {
        card.classList.add('low-confidence');
    }

    const categoryOptions = currentCategories.map(cat =>
        '<option value="' + cat + '"' + (cat === expense.category ? ' selected' : '') + '>' + cat + '</option>'
    ).join('');

    card.innerHTML = `
        <div class="expense-review-header">
            <input type="text" class="expense-name-input" value="${escapeHTML(expense.name)}" data-index="${index}" />
            <button class="delete-expense-btn" onclick="removeExpenseCard(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="expense-review-body">
            <div class="expense-field">
                <label>Amount:</label>
                <input type="number" step="0.01" class="expense-amount-input" value="${expense.amount}" data-index="${index}" />
            </div>
            <div class="expense-field">
                <label>Category:</label>
                <select class="expense-category-select" data-index="${index}">
                    ${categoryOptions}
                </select>
            </div>
            <div class="expense-field">
                <label>Date:</label>
                <input type="date" class="expense-date-input" value="${expense.date.split('T')[0]}" data-index="${index}" />
            </div>
            ${expense.confidence < 0.7 || expense.ambiguous ?
                '<div class="confidence-warning"><i class="fas fa-exclamation-triangle"></i> Low confidence - please review</div>' :
                ''}
        </div>
    `;

    return card;
}

function removeExpenseCard(index) {
    const card = document.querySelector('.expense-review-card:nth-child(' + (index + 1) + ')');
    if (card) {
        card.remove();
    }
}

async function confirmAllExpenses() {
    const cards = document.querySelectorAll('.expense-review-card');
    const expenses = [];

    cards.forEach(card => {
        const index = card.querySelector('.expense-name-input').dataset.index;
        const name = card.querySelector('.expense-name-input').value;
        const amount = parseFloat(card.querySelector('.expense-amount-input').value);
        const category = card.querySelector('.expense-category-select').value;
        const date = card.querySelector('.expense-date-input').value;

        expenses.push({
            name,
            amount,
            category,
            date: getISODateWithLocalTime(date),
            tags: []
        });
    });

    // Add each expense
    let successCount = 0;
    let failCount = 0;

    for (const expense of expenses) {
        try {
            const response = await fetch('/expense', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expense)
            });

            if (response.ok) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            failCount++;
        }
    }

    closeReviewModal();

    if (successCount > 0) {
        alert('Successfully added ' + successCount + ' expense(s)!');
        // Reload expenses
        if (typeof loadExpenses === 'function') {
            loadExpenses();
        }
    }

    if (failCount > 0) {
        alert('Failed to add ' + failCount + ' expense(s). Please try again.');
    }
}

function closeReviewModal() {
    const reviewModal = document.getElementById('voiceReviewModal');
    if (reviewModal) {
        reviewModal.style.display = 'none';
    }
}

function reRecord() {
    closeReviewModal();
    startVoiceRecording();
}

// Load categories on page load
async function loadCategories() {
    try {
        const response = await fetch('/categories');
        if (response.ok) {
            currentCategories = await response.json();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Initialize voice button when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateVoiceUI('idle');
    loadCategories();
});
