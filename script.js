let timeLeft = 25 * 60;
let timerId = null;
let isBreakMode = false;
let currentTask = "";

let completedSessions = parseInt(localStorage.getItem('completedSessions')) || 0;
let sessionHistory = JSON.parse(localStorage.getItem('sessionHistory')) || [];
let miniDoughnut, detailedChart;

// --- SƏS EFFEKTLƏRİ ---
const startSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); 
const alertSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'); 
const breakEndSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 

window.onload = () => {
    initCharts();
    loadTasks('focus');
    loadTasks('break');
    updateStats('day'); 
    updateDisplay();
    const skipBtn = document.getElementById('skipBtn');
    if(skipBtn) skipBtn.classList.add('hidden');
    // Brauzer səslərini əvvəlcədən yükləyirik
    window.speechSynthesis.getVoices();
};

// --- 1. ANALİZ VƏ QRAFİK FUNKSİYALARI ---
function initCharts() {
    const ctxMini = document.getElementById('miniDoughnut').getContext('2d');
    miniDoughnut = new Chart(ctxMini, {
        type: 'doughnut',
        data: { datasets: [{ data: [completedSessions, 12], backgroundColor: ['#3b82f6', 'rgba(255,255,255,0.01)'], borderWidth: 0, cutout: '85%' }] },
        options: { plugins: { legend: { display: false } }, maintainAspectRatio: false }
    });

    const ctxFull = document.getElementById('detailedChart').getContext('2d');
    detailedChart = new Chart(ctxFull, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Sessiyalar', data: [], backgroundColor: '#3b82f6', borderRadius: 8 }] },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }, 
            plugins: { legend: { display: false } } 
        }
    });
}

function updateStats(filter = 'day') {
    const now = new Date();
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${filter}`);
    if(activeBtn) activeBtn.classList.add('active');

    let filteredData = sessionHistory.filter(item => {
        const itemDate = new Date(item.date);
        if (filter === 'day') return itemDate.toDateString() === now.toDateString();
        if (filter === 'month') return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        if (filter === 'year') return itemDate.getFullYear() === now.getFullYear();
        return true;
    });

    document.getElementById('totalCount').innerText = completedSessions;
    document.getElementById('totalHours').innerText = `${Math.floor((completedSessions*25)/60)}s ${(completedSessions*25)%60}d`;
    
    const target = filter === 'day' ? 8 : (filter === 'month' ? 150 : 1000);
    const score = Math.min((filteredData.length / target) * 100, 100).toFixed(0);
    
    if(document.getElementById('productivityScore')) document.getElementById('productivityScore').innerText = score + "%";
    if(document.getElementById('statusLabel')) {
        document.getElementById('statusLabel').innerText = score > 70 ? "Yüksək" : (score > 30 ? "Stabil" : "Aşağı");
    }

    renderTaskLog(filteredData);
    updateDetailedChart(filteredData, filter);
    
    if(miniDoughnut) {
        miniDoughnut.data.datasets[0].data[0] = completedSessions;
        miniDoughnut.update();
    }
}

function updateDetailedChart(data, filter) {
    if (!detailedChart) return;

    let labels = [];
    let counts = [];

    // Datanın boş olub-olmadığını yoxlayırıq
    if (!data || data.length === 0) {
        // Data yoxdursa qrafiki sıfırlayırıq
        detailedChart.data.labels = [];
        detailedChart.data.datasets[0].data = [];
        detailedChart.update();
        return;
    }

    if (filter === 'day') {
        labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
        counts = new Array(6).fill(0);
        data.forEach(item => {
            const itemDate = new Date(item.date);
            if (!isNaN(itemDate)) { // Tarixin doğruluğunu yoxlayırıq
                const h = itemDate.getHours();
                const index = Math.floor(h / 4);
                if (index >= 0 && index < 6) counts[index]++;
            }
        });
    } else if (filter === 'month') {
        labels = ['Həftə 1', 'Həftə 2', 'Həftə 3', 'Həftə 4+'];
        counts = new Array(4).fill(0);
        data.forEach(item => {
            const itemDate = new Date(item.date);
            if (!isNaN(itemDate)) {
                const d = itemDate.getDate();
                const index = Math.min(Math.floor((d - 1) / 7), 3);
                counts[index]++;
            }
        });
    } else if (filter === 'year') {
        labels = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];
        counts = new Array(12).fill(0);
        data.forEach(item => {
            const itemDate = new Date(item.date);
            if (!isNaN(itemDate)) {
                const monthIndex = itemDate.getMonth();
                counts[monthIndex]++;
            }
        });
    }

    // Chart-ı yeniləməzdən əvvəl datanı mənimsədirik
    detailedChart.data.labels = labels;
    detailedChart.data.datasets[0].data = counts;
    
    // Vizual olaraq daha rəvan keçid üçün update çağırırıq
    detailedChart.update('none'); 
}

function renderTaskLog(data) {
    const log = document.getElementById('taskLog');
    if (!log) return;
    log.innerHTML = data.slice().reverse().map(item => `
        <div class="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 mb-2">
            <div class="flex flex-col">
                <span class="text-xs font-medium">${item.task}</span>
                <span class="text-[9px] text-zinc-500">${new Date(item.date).toLocaleDateString()}</span>
            </div>
            <span class="text-[10px] text-blue-400 font-bold">${new Date(item.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
    `).join('') || '<p class="text-center text-zinc-600 text-[10px] mt-4">Məlumat yoxdur</p>';
}

// --- 2. JSON FAYLDAN MOTİVASİYA SEÇİMİ ---
async function getFileMotivation(recommendedBreak = "") {
    const display = document.getElementById('activeTaskDisplay');
    display.innerText = "🤖 Sitat seçilir...";

    try {
        const response = await fetch('quotes.json');
        const quotes = await response.json();
        const randomIndex = Math.floor(Math.random() * quotes.length);
        let msg = quotes[randomIndex];

        if (recommendedBreak) {
            msg += `. İndi isə istirahət vaxtıdır: ${recommendedBreak}`;
        }
        processAiResponse(msg);
    } catch (e) {
        let fallback = "Hər bir çətinliyin mərkəzində fürsət dayanır. - Albert Eynşteyn";
        if (recommendedBreak) fallback += `. İndi ${recommendedBreak} zamanıdır.`;
        processAiResponse(fallback);
    }
}

function processAiResponse(msg) {
    const display = document.getElementById('activeTaskDisplay');
    display.innerHTML = `<span style="color:#fbbf24; font-weight:bold;">🤖 ${msg}</span>`;
    
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(msg);
    const voices = window.speechSynthesis.getVoices();
    
    let selectedVoice = voices.find(v => v.lang.includes('az')) || 
                        voices.find(v => v.lang.includes('tr') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.includes('tr'));
    
    if (selectedVoice) speech.voice = selectedVoice;
    
    speech.lang = selectedVoice ? selectedVoice.lang : 'tr-TR';
    speech.rate = 0.95; 
    speech.pitch = 1.0; 
    speech.volume = 1.0;

    window.speechSynthesis.speak(speech);
}

// --- 3. TAYMER VƏ KEÇİD (SƏS EFFEKTLƏRİ İLƏ) ---
function handleSwitch() {
    stopTimer();
    
    if (!isBreakMode) {
        alertSound.play().catch(e => console.log("Səs çalınmadı"));
        
        completedSessions++;
        // Yeni "type" sahəsi əlavə olunur ki, exportda bilinsin
        sessionHistory.push({ 
            task: currentTask || "Adsız iş", 
            date: new Date().toISOString(),
            type: "Focus",
            duration: "25 dəq"
        });
        localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));
        localStorage.setItem('completedSessions', completedSessions);
        
        const breakTasks = JSON.parse(localStorage.getItem('breakTasks')) || [];
        const randomBreak = breakTasks.length > 0 ? breakTasks[Math.floor(Math.random() * breakTasks.length)] : "";

        updateStats('day');
        getFileMotivation(randomBreak); 
        
        isBreakMode = true; 
        timeLeft = 5 * 60;
        document.getElementById('mainTitle').innerText = "REST TIME";
        document.getElementById('mainTitle').style.color = "#10b981";
    } else {
        breakEndSound.play().catch(e => console.log("Səs çalınmadı"));
        
        // Fasilə sessiyasını da tarixçəyə yazırıq (Opsional, amma analiz üçün yaxşıdır)
        sessionHistory.push({ 
            task: "Fasilə", 
            date: new Date().toISOString(),
            type: "Break",
            duration: "5 dəq"
        });
        localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));

        isBreakMode = false; 
        timeLeft = 25 * 60;
        resetToFocus();
    }
    updateDisplay();
}

function updateDisplay() {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    document.getElementById('timer').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    const maxTime = isBreakMode ? 300 : 1500;
    document.getElementById('progress').style.strokeDashoffset = 848 - (timeLeft / maxTime) * 848;
}

document.getElementById('startBtn').onclick = function() {
    if (timerId) { 
        stopTimer(); 
        this.innerText = "DAVAM ET"; 
        return; 
    }
    if (!currentTask) return alert("Zəhmət olmasa bir task seçin!");
    
    startSound.play().catch(e => console.log("Səs çalınmadı"));

    const skipBtn = document.getElementById('skipBtn');
    if(skipBtn) skipBtn.classList.remove('hidden');

    timerId = setInterval(() => { 
        timeLeft--; 
        updateDisplay(); 
        if(timeLeft <= 0) handleSwitch(); 
    }, 1000);
    this.innerText = "DURDUR";
};

const skipBtn = document.getElementById('skipBtn');
if(skipBtn) {
    skipBtn.onclick = handleSwitch;
}

function stopTimer() { 
    clearInterval(timerId); 
    timerId = null; 
    document.getElementById('startBtn').innerText = "BAŞLA";
}

function resetToFocus() { 
    isBreakMode = false; 
    currentTask = ""; 
    document.getElementById('activeTaskDisplay').innerText = "Növbəti işi seç";
    document.getElementById('activeTaskDisplay').style.color = "white";
    document.getElementById('mainTitle').style.color = "#3b82f6";
    document.getElementById('mainTitle').innerText = "FOCUS AI";
    const skipBtn = document.getElementById('skipBtn');
    if(skipBtn) skipBtn.classList.add('hidden');
}

// --- 4. TƏKMİLLƏŞDİRİLMİŞ EXCEL EXPORT ---
function exportToExcel() {
    if (sessionHistory.length === 0) {
        alert("Eksport etmək üçün heç bir tarixçə yoxdur!");
        return;
    }

    const weekdays = ["Bazar", "Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə axşamı", "Cümə", "Şənbə"];

    let csvContent = "\ufeff"; 
    // Başlıqları daha detallı edirik
    csvContent += "Tapşırıq,Növ,Müddət,Tarix,Gün,Saat\n";

    sessionHistory.forEach(item => {
        const dateObj = new Date(item.date);
        const dateStr = dateObj.toLocaleDateString('az-AZ');
        const dayStr = weekdays[dateObj.getDay()];
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const type = item.type || "Focus";
        const duration = item.duration || "25 dəq";

        csvContent += `"${item.task}","${type}","${duration}","${dateStr}","${dayStr}","${timeStr}"\n`;
    });

    const now = new Date();
    const today = now.toLocaleDateString('az-AZ').replace(/\//g, '.');
    const fileName = `Cavid - ${today}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 5. TASK İDARƏETMƏSİ ---
function addTask(type) {
    const input = document.getElementById(type + 'Input');
    const val = input.value.trim();
    if (!val) return;
    saveTaskToLocal(type, val);
    renderTask(type, val);
    input.value = "";
}

function renderTask(type, val) {
    const list = document.getElementById(type + 'List');
    const li = document.createElement('li');
    li.className = "p-3 bg-white/5 rounded-2xl mb-2 cursor-pointer border border-white/5 hover:border-blue-500/50 transition flex justify-between group";
    li.innerHTML = `<span class="text-xs truncate">${val}</span><button class="text-red-500 opacity-0 group-hover:opacity-100 transition">×</button>`;
    
    li.onclick = () => { 
        currentTask = val; 
        isBreakMode = (type === 'break'); 
        timeLeft = isBreakMode ? 5 * 60 : 25 * 60; 
        document.getElementById('activeTaskDisplay').innerText = (isBreakMode ? "İSTİRAHƏT: " : "İŞ: ") + val;
        document.getElementById('activeTaskDisplay').style.color = isBreakMode ? "#10b981" : "#3b82f6";
        updateDisplay();
    };

    li.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        removeTaskFromLocal(type, val);
        li.remove();
    };

    list.appendChild(li);
}

function saveTaskToLocal(t, v) { let arr = JSON.parse(localStorage.getItem(t+'Tasks')) || []; arr.push(v); localStorage.setItem(t+'Tasks', JSON.stringify(arr)); }
function loadTasks(t) { (JSON.parse(localStorage.getItem(t+'Tasks')) || []).forEach(v => renderTask(t, v)); }
function removeTaskFromLocal(t, v) { let arr = JSON.parse(localStorage.getItem(t+'Tasks')) || []; localStorage.setItem(t+'Tasks', JSON.stringify(arr.filter(i => i !== v))); }

function clearAllData() { 
    if(confirm("Bütün tarixçə silinsin?")) { 
        localStorage.clear(); 
        location.reload(); 
    } 
}

// Analiz pəncərəsini idarə etmək üçün
function updateStats(filter = 'day') {
    const now = new Date();
    // Filtrləri vizual yenilə
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('bg-blue-600', 'text-white'));
    const activeBtn = document.getElementById(`btn-${filter}`);
    if(activeBtn) activeBtn.classList.add('bg-blue-600', 'text-white');

    let filteredData = sessionHistory.filter(item => {
        const itemDate = new Date(item.date);
        if (filter === 'day') return itemDate.toDateString() === now.toDateString();
        if (filter === 'month') return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        if (filter === 'year') return itemDate.getFullYear() === now.getFullYear();
        return true;
    });

    // Statları yenilə
    document.getElementById('totalCount').innerText = completedSessions;
    document.getElementById('totalHours').innerText = `${Math.floor((completedSessions*25)/60)}s ${(completedSessions*25)%60}d`;
    
    const target = filter === 'day' ? 8 : (filter === 'month' ? 150 : 1000);
    const score = Math.min((filteredData.length / target) * 100, 100).toFixed(0);
    
    if(document.getElementById('productivityScore')) document.getElementById('productivityScore').innerText = score + "%";
    if(document.getElementById('statusLabel')) {
        document.getElementById('statusLabel').innerText = score > 70 ? "Yüksək" : (score > 30 ? "Stabil" : "Aşağı");
    }

    renderTaskLog(filteredData);
    updateDetailedChart(filteredData, filter);
    
    if(miniDoughnut) {
        miniDoughnut.data.datasets[0].data[0] = completedSessions;
        miniDoughnut.update();
    }
}

// HTML-də çatışmayan clearTasks funksiyası
function clearTasks(type) {
    if(confirm("Bu siyahını təmizləmək istəyirsiniz?")) {
        localStorage.removeItem(type + 'Tasks');
        document.getElementById(type + 'List').innerHTML = "";
    }
}