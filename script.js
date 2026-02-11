let timeLeft = 25 * 60;
let timerId = null;
let isBreakMode = false;
let currentTask = "";
// AD FUNKSİSAYI ÜÇÜN ƏLAVƏ
let userName = localStorage.getItem('userName') || "";

let completedSessions = parseInt(localStorage.getItem('completedSessions')) || 0;
let sessionHistory = JSON.parse(localStorage.getItem('sessionHistory')) || [];
let lastCheckDate = localStorage.getItem('lastCheckDate') || ""; 
let miniDoughnut, detailedChart;

const startSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); 
const alertSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'); 
const breakEndSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 

window.onload = () => {
    // ADI SORUŞMAQ VƏ BAŞLIĞI YENİLƏMƏK (Əlavə olundu)
    if (!userName) {
        userName = prompt("Zəhmət olmasa adınızı daxil edin:");
        if (userName) localStorage.setItem('userName', userName);
        else userName = "İstifadəçi";
    }
    
    // 1. Mərkəzdəki başlığı dəyişir (şəkildə gördüyün hissə)
    document.getElementById('mainTitle').innerText = `FOCUS AI - ${userName}`;
        
    // 2. Brauzer tabındakı başlığı dəyişir (sənin qeyd etdiyin hissə)
    document.title = `${userName}'s Focus AI - Pro`;
    checkNewDay(); 
    initCharts();
    loadTasks('focus');
    loadTasks('break');
    updateStats('day'); 
    updateDisplay();
    const skipBtn = document.getElementById('skipBtn');
    if(skipBtn) skipBtn.classList.add('hidden');
    setupEnterKey();
};

function setupEnterKey() {
    const focusInput = document.getElementById('focusInput');
    const breakInput = document.getElementById('breakInput');
    if (focusInput) {
        focusInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask('focus');
        });
    }
    if (breakInput) {
        breakInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask('break');
        });
    }
}

function checkNewDay() {
    const today = new Date().toDateString(); 
    if (lastCheckDate !== today) {
        completedSessions = 0; 
        localStorage.setItem('completedSessions', 0);
        localStorage.setItem('lastCheckDate', today);
        lastCheckDate = today;
    }
}

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

    const displayCount = (filter === 'day') ? completedSessions : filteredData.length;
    document.getElementById('totalCount').innerText = displayCount;
    document.getElementById('totalHours').innerText = `${Math.floor((displayCount*25)/60)}s ${(displayCount*25)%60}d`;
    
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

    if (filter === 'day') {
        labels = ['00:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
        counts = new Array(6).fill(0);
        data.forEach(item => {
            const h = new Date(item.date).getHours();
            counts[Math.floor(h/4)]++;
        });
    } else if (filter === 'month') {
        labels = ['Həftə 1', 'Həftə 2', 'Həftə 3', 'Həftə 4+'];
        counts = new Array(4).fill(0);
        data.forEach(item => {
            const d = new Date(item.date).getDate();
            counts[Math.min(Math.floor((d-1)/7), 3)]++;
        });
    } else if (filter === 'year') {
        labels = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];
        counts = new Array(12).fill(0);
        data.forEach(item => {
            counts[new Date(item.date).getMonth()]++;
        });
    }

    detailedChart.data.labels = labels;
    detailedChart.data.datasets[0].data = counts;
    detailedChart.update();
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

// async function getFileMotivation(recommendedBreak = "") {
//     const display = document.getElementById('activeTaskDisplay');
//     display.innerText = "🤖 Sitat seçilir...";
//     try {
//         const response = await fetch('quotes.json?t=' + new Date().getTime());
//         if (!response.ok) throw new Error("Fayl tapılmadı");
//         const quotes = await response.json();
//         const randomIndex = Math.floor(Math.random() * quotes.length);
//         let msg = quotes[randomIndex].quote; 

//         if (recommendedBreak) {
//             display.innerHTML = `
//                 <div class="flex flex-col items-center gap-2 px-4 text-center">
//                     <span class="text-[13px] text-zinc-300 leading-relaxed italic">" ${msg} "</span>
//                     <div class="mt-1 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-full">
//                         <span class="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Tövsiyə:</span>
//                         <span class="text-[11px] text-emerald-100 font-medium">${recommendedBreak}</span>
//                     </div>
//                 </div>`;
//         } else {
//             display.innerHTML = `<div class="px-6 text-center"><span class="text-[13px] text-zinc-300 leading-relaxed italic">" ${msg} "</span></div>`;
//         }
//     } catch (e) {
//         display.innerHTML = `<div class="px-6 text-center"><span class="text-[13px] text-amber-400 font-bold italic">🤖 Hər bir çətinliyin mərkəzində fürsət dayanır.</span></div>`;
//     }
// }

async function getFileMotivation(recommendedBreak = "") {
    const display = document.getElementById('activeTaskDisplay');
    try {
        // Keşlənmənin qarşısını almaq üçün Date.now() əlavə edirik
        const response = await fetch('quotes.json?t=' + Date.now());
        
        if (!response.ok) throw new Error("Fayl oxunmadı");
        
        const quotes = await response.json();
        
        // Random sitat seçimi
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const msg = quotes[randomIndex].quote; 

        if (recommendedBreak) {
            display.innerHTML = `
                <div class="flex flex-col items-center gap-2 px-4 text-center">
                    <span class="text-[13px] text-zinc-300 leading-relaxed italic">" ${msg} "</span>
                    <div class="mt-1 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-full">
                        <span class="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Tövsiyə:</span>
                        <span class="text-[11px] text-emerald-100 font-medium">${recommendedBreak}</span>
                    </div>
                </div>`;
        } else {
            display.innerHTML = `<div class="px-6 text-center"><span class="text-[13px] text-zinc-300 leading-relaxed italic">" ${msg} "</span></div>`;
        }
    } catch (e) {
        // Əgər fayl oxunmazsa (məsələn, birbaşa fayl kimi açdıqda), konsola baxın
        console.error("Sitat yükləmə xətası:", e);
        display.innerHTML = `<div class="px-6 text-center"><span class="text-[13px] text-amber-400 font-bold italic">🤖 Hər bir çətinliyin mərkəzində fürsət dayanır.</span></div>`;
    }
}


function handleSwitch() {
    stopTimer();
    if (!isBreakMode) {
        alertSound.play().catch(e => console.log("Səs çalınmadı"));
        completedSessions++;
        
        let breakDuration = 5; 
        let breakTitle = "İstirahət Vaxtı ☕";

        if (completedSessions % 4 === 0) {
            breakDuration = 15; 
            breakTitle = "Uzun İstirahət vaxtı ☕";
        }

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
        timeLeft = breakDuration * 60; 
        
        document.getElementById('mainTitle').innerText = breakTitle;
        document.getElementById('mainTitle').style.color = "#10b981";
    } else {
        breakEndSound.play().catch(e => console.log("Səs çalınmadı"));
        sessionHistory.push({ 
            task: "Fasilə", date: new Date().toISOString(), type: "Break", duration: timeLeft === 900 ? "15 dəq" : "5 dəq"
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
    if (timerId) { stopTimer(); this.innerText = "DAVAM ET"; return; }
    if (!currentTask) return alert("Zəhmət olmasa bir task seçin!");
    startSound.play().catch(e => console.log("Səs çalınmadı"));
    const skipBtn = document.getElementById('skipBtn');
    if(skipBtn) skipBtn.classList.remove('hidden');
    timerId = setInterval(() => { timeLeft--; updateDisplay(); if(timeLeft <= 0) handleSwitch(); }, 1000);
    this.innerText = "DURDUR";
};

const skipBtn = document.getElementById('skipBtn');
if(skipBtn) { skipBtn.onclick = handleSwitch; }

function stopTimer() { clearInterval(timerId); timerId = null; document.getElementById('startBtn').innerText = "BAŞLA"; }

function resetToFocus() { 
    isBreakMode = false; currentTask = ""; 
    document.getElementById('activeTaskDisplay').innerText = "Növbəti işi seç";
    document.getElementById('activeTaskDisplay').style.color = "white";
    document.getElementById('mainTitle').style.color = "#3b82f6";
    // BAŞLIĞI AD İLƏ BİRLİKDƏ SIFIRLA (Əlavə olundu)
    document.getElementById('mainTitle').innerText = `FOCUS AI - ${userName}`;
    const skipBtn = document.getElementById('skipBtn');
    if(skipBtn) skipBtn.classList.add('hidden');
}

function exportToExcel() {
    if (sessionHistory.length === 0) return alert("Eksport etmək üçün heç bir tarixçə yoxdur!");
    try {
        const weekdays = ["Bazar", "Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə axşamı", "Cümə", "Şənbə"];
        const dataForExport = sessionHistory.map(item => {
            const d = new Date(item.date);
            return {
                "Tapşırıq": item.task,
                "Növ": item.type || (item.task === "Fasilə" ? "Break" : "Focus"),
                "Müddət": item.duration || "25 dəq",
                "Tarix": d.toLocaleDateString('az-AZ'),
                "Gün": weekdays[d.getDay()],
                "Saat": d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Hesabat");
        // FAYL ADINI AD İLƏ DİNAMİK ET (Dəyişdirildi)
        const fileName = `${userName}_FocusAI_Hesabat_${new Date().toLocaleDateString('az-AZ').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    } catch (error) {
        console.error("Export xətası:", error);
    }
}

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
    li.className = "task-item p-3 bg-white/5 rounded-2xl mb-2 cursor-pointer border border-white/5 hover:border-blue-500/50 transition flex justify-between group items-center";
    li.innerHTML = `
        <div class="flex items-center gap-3 flex-1 overflow-hidden">
            <div class="check-box w-4 h-4 rounded-full border border-white/20 flex-shrink-0 transition-all"></div>
            <span class="task-text text-xs truncate transition-all">${val}</span>
        </div>
        <button class="text-red-500 opacity-0 group-hover:opacity-100 transition px-2 text-lg">×</button>
    `;
    li.onclick = (e) => { 
        if (e.target.tagName === 'BUTTON') return;
        const span = li.querySelector('.task-text');
        const box = li.querySelector('.check-box');
        if (currentTask === val) {
            li.classList.toggle('completed');
            if (li.classList.contains('completed')) {
                span.style.textDecoration = "line-through";
                span.style.opacity = "0.4";
                box.style.background = "#3b82f6";
                box.style.borderColor = "#3b82f6";
            } else {
                span.style.textDecoration = "none";
                span.style.opacity = "1";
                box.style.background = "transparent";
                box.style.borderColor = "rgba(255,255,255,0.2)";
            }
        } else {
            currentTask = val; 
            isBreakMode = (type === 'break'); 
            timeLeft = isBreakMode ? 5 * 60 : 25 * 60; 
            document.getElementById('activeTaskDisplay').innerText = (isBreakMode ? "İSTİRAHƏT: " : "İŞ: ") + val;
            document.getElementById('activeTaskDisplay').style.color = isBreakMode ? "#10b981" : "#3b82f6";
            updateDisplay();
            document.querySelectorAll('.task-item').forEach(el => el.style.borderColor = "rgba(255,255,255,0.05)");
            li.style.borderColor = isBreakMode ? "#10b981" : "#3b82f6";
        }
    };
    li.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        removeTaskFromLocal(type, val);
        li.remove();
        if(currentTask === val) resetToFocus();
    };
    list.appendChild(li);
}

function saveTaskToLocal(t, v) { let arr = JSON.parse(localStorage.getItem(t+'Tasks')) || []; arr.push(v); localStorage.setItem(t+'Tasks', JSON.stringify(arr)); }
function loadTasks(t) { (JSON.parse(localStorage.getItem(t+'Tasks')) || []).forEach(v => renderTask(t, v)); }
function removeTaskFromLocal(t, v) { let arr = JSON.parse(localStorage.getItem(t+'Tasks')) || []; localStorage.setItem(t+'Tasks', JSON.stringify(arr.filter(i => i !== v))); }

function clearAllData() { 
    if(confirm("Bugünkü proqresi sıfırlamaq və taskları təmizləmək istəyirsiniz? (Arxiv və detallı statistika saxlanılacaq)")) { 
        completedSessions = 0;
        localStorage.setItem('completedSessions', 0);
        localStorage.removeItem('focusTasks');
        localStorage.removeItem('breakTasks');
        currentTask = "";
        location.reload(); 
    } 
}

function clearTasks(type) {
    if (confirm(type === 'focus' ? "Bütün iş taskları silinsin?" : "Bütün istirahət planı silinsin?")) {
        localStorage.removeItem(type + 'Tasks');
        const list = document.getElementById(type + 'List');
        if (list) list.innerHTML = "";
        if ((type === 'focus' && !isBreakMode) || (type === 'break' && isBreakMode)) resetToFocus();
    }
}

function changeName() {
    let newName = prompt("Yeni adınızı daxil edin:", userName);
    if (newName && newName.trim() !== "") {
        userName = newName;
        localStorage.setItem('userName', userName);
        // Səhifəni yeniləyirik ki, başlıq və digər yerlər dərhal dəyişsin
        location.reload(); 
    }
}