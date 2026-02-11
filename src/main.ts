import './style.css'

interface Word {
    id: string;
    vietnamese: string;
    korean: string;
    createdAt: number;
    checked: boolean;
}

class VietPlayerApp {
    private words: Word[] = [];
    private currentTab: string = 'input';
    private playHistory: { date: string, count: number }[] = [];
    private editingWordId: string | null = null;
    private searchQuery: string = '';

    // Player State
    private isPlaying: boolean = false;
    private currentWordIndex: number = 0;
    private repeatCount: number = 0; // 0 or 1 for 2 repeats
    private languageMode: 'vi' | 'ko' = 'vi';
    private playlist: Word[] = [];

    constructor() {
        this.loadData();
        this.initEventListeners();
        this.render();
    }

    private loadData() {
        const savedWords = localStorage.getItem('vietplayer_words');
        if (savedWords) {
            this.words = JSON.parse(savedWords).map((w: any) => ({
                ...w,
                checked: w.checked !== undefined ? w.checked : true // 기본값 true
            }));
        }

        const savedHistory = localStorage.getItem('vietplayer_history');
        if (savedHistory) this.playHistory = JSON.parse(savedHistory);
    }

    private saveData() {
        localStorage.setItem('vietplayer_words', JSON.stringify(this.words));
    }

    private logPlay() {
        const today = new Date().toISOString().split('T')[0];
        const entry = this.playHistory.find(h => h.date === today);
        if (entry) {
            entry.count++;
        } else {
            this.playHistory.push({ date: today, count: 1 });
        }
        localStorage.setItem('vietplayer_history', JSON.stringify(this.playHistory));
    }

    private initEventListeners() {
        document.getElementById('tab-input')?.addEventListener('click', () => this.switchTab('input'));
        document.getElementById('tab-stats')?.addEventListener('click', () => this.switchTab('stats'));
        document.getElementById('tab-play')?.addEventListener('click', () => this.switchTab('play'));
    }

    private switchTab(tab: string) {
        this.currentTab = tab;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${tab}`)?.classList.add('active');
        this.render();
    }

    private render() {
        const container = document.getElementById('main-content');
        if (!container) return;

        container.innerHTML = '';

        switch (this.currentTab) {
            case 'input':
                this.renderInputTab(container);
                break;
            case 'stats':
                this.renderStatsTab(container);
                break;
            case 'play':
                this.renderPlayTab(container);
                break;
        }
    }

    /* --- INPUT TAB --- */
    private renderInputTab(container: HTMLElement) {
        const isEditing = this.editingWordId !== null;
        const editingWord = isEditing ? this.words.find(w => w.id === this.editingWordId) : null;

        container.innerHTML = `
      <div class="glass-panel card fade-in" style="padding: 20px;">
        <h2 style="margin-top:0; font-size: 1.2rem; color: var(--accent-blue);">
            ${isEditing ? '단어 수정' : '단어 추가'}
        </h2>
        <div class="input-group">
          <input type="text" id="v-input" placeholder="베트남어" class="futuristic-input" value="${editingWord?.vietnamese || ''}">
          <input type="text" id="k-input" placeholder="한국어" class="futuristic-input" value="${editingWord?.korean || ''}">
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button id="save-btn" class="action-btn primary">${isEditing ? '수정 완료' : '저장'}</button>
          <button id="clear-btn" class="action-btn">${isEditing ? '취소' : '비우기'}</button>
        </div>
      </div>

      <div class="search-container fade-in" style="margin-top: 20px;">
        <input type="text" id="search-input" placeholder="단어 검색 (VN/KR)..." class="search-bar" value="${this.searchQuery}">
      </div>

      <div id="word-list" class="fade-in" style="margin-top: 15px;">
        ${this.renderWordList()}
      </div>

      <div class="glass-panel card fade-in" style="margin-top: 30px; padding: 20px; border-style: dashed;">
        <h3 style="margin-top:0; font-size: 0.9rem; color: #8892b0; letter-spacing:1px;">데이터 백업 및 모바일 전송</h3>
        <p style="font-size:0.75rem; color:#555; margin-bottom:15px;">노트북의 단어를 휴대폰으로 옮기려면 [내보내기] 후 텍스트를 복사하여 휴대폰에서 [가져오기] 하세요.</p>
        <div style="display: flex; gap: 10px;">
          <button id="export-btn" class="action-btn" style="padding: 10px; font-size: 0.8rem;">내보내기 (복사)</button>
          <button id="import-btn" class="action-btn" style="padding: 10px; font-size: 0.8rem;">가져오기 (붙여넣기)</button>
        </div>
      </div>
    `;

        document.getElementById('save-btn')?.addEventListener('click', () => this.saveWord());
        document.getElementById('clear-btn')?.addEventListener('click', () => {
            this.editingWordId = null;
            this.render();
        });

        document.getElementById('export-btn')?.addEventListener('click', () => this.exportData());
        document.getElementById('import-btn')?.addEventListener('click', () => this.importData());

        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value;
            const wordListContainer = document.getElementById('word-list');
            if (wordListContainer) wordListContainer.innerHTML = this.renderWordList();
        });
    }

    private exportData() {
        const data = {
            words: this.words,
            history: this.playHistory
        };
        const json = JSON.stringify(data);
        navigator.clipboard.writeText(json).then(() => {
            alert('단어 데이터가 복사되었습니다! 카카오톡 등으로 나에게 전송한 뒤 휴대폰에서 [가져오기] 하세요.');
        }).catch(err => {
            console.error('복사 실패:', err);
            alert('복사 실패: ' + json); // 수동 복사 유도
        });
    }

    private importData() {
        const json = prompt('복사한 데이터 문자열을 여기에 붙여넣으세요:');
        if (!json) return;

        try {
            const data = JSON.parse(json);
            if (!data.words || !Array.isArray(data.words)) throw new Error('올바른 데이터 형식이 아닙니다.');

            if (confirm(`기존 데이터를 유지하고 새로운 단어(${data.words.length}개)를 합치겠습니까?\n(취소를 누르면 기존 데이터가 삭제되고 덮어씌워집니다.)`)) {
                // 병합 로직 (ID 중복 체크)
                data.words.forEach((newWord: Word) => {
                    if (!this.words.find(w => w.id === newWord.id)) {
                        this.words.push(newWord);
                    }
                });
                // 히스토리 병합
                if (data.history) {
                    data.history.forEach((newH: any) => {
                        const existing = this.playHistory.find(h => h.date === newH.date);
                        if (existing) {
                            existing.count = Math.max(existing.count, newH.count);
                        } else {
                            this.playHistory.push(newH);
                        }
                    });
                }
            } else {
                // 덮어쓰기
                this.words = data.words;
                this.playHistory = data.history || [];
            }

            this.saveData();
            localStorage.setItem('vietplayer_history', JSON.stringify(this.playHistory));
            alert('데이터를 성공적으로 가져왔습니다!');
            this.render();
        } catch (e) {
            alert('가져오기 실패: 올바른 데이터 형식이 아닙니다.');
        }
    }

    private saveWord() {
        const vInput = document.getElementById('v-input') as HTMLInputElement;
        const kInput = document.getElementById('k-input') as HTMLInputElement;

        if (!vInput?.value.trim() || !kInput?.value.trim()) return;

        if (this.editingWordId) {
            const index = this.words.findIndex(w => w.id === this.editingWordId);
            if (index !== -1) {
                this.words[index] = {
                    ...this.words[index],
                    vietnamese: vInput.value.trim(),
                    korean: kInput.value.trim()
                };
            }
            this.editingWordId = null;
        } else {
            const newWord: Word = {
                id: Date.now().toString(),
                vietnamese: vInput.value.trim(),
                korean: kInput.value.trim(),
                createdAt: Date.now(),
                checked: true
            };
            this.words.push(newWord);
        }

        this.saveData();
        this.render();
    }

    private renderWordList() {
        let filteredWords = this.words.filter(w =>
            w.vietnamese.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            w.korean.toLowerCase().includes(this.searchQuery.toLowerCase())
        );

        const sortedWords = filteredWords.sort((a, b) =>
            a.vietnamese.localeCompare(b.vietnamese, 'vi')
        );

        if (sortedWords.length === 0) {
            return `<p style="text-align:center; color:#555; margin-top:40px;">${this.searchQuery ? '검색 결과가 없습니다.' : '등록된 단어가 없습니다.'}</p>`;
        }

        return sortedWords.map(word => `
      <div class="word-item glass-panel">
        <div class="checkbox-custom ${word.checked ? 'checked' : ''}" onclick="window.app.toggleCheck('${word.id}')"></div>
        <div class="word-info" style="flex: 1; margin-left: 15px;">
          <span class="v-text">${word.vietnamese}</span>
          <span class="k-text">${word.korean}</span>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <button onclick="window.app.editWord('${word.id}')" style="background:none; border:none; color:var(--accent-blue); font-size:0.8rem; cursor:pointer;">편집</button>
          <button onclick="window.app.deleteWord('${word.id}')" style="background:none; border:none; color:var(--neon-pink); font-size:0.8rem; cursor:pointer;">삭제</button>
        </div>
      </div>
    `).join('');
    }

    public toggleCheck(id: string) {
        const word = this.words.find(w => w.id === id);
        if (word) {
            word.checked = !word.checked;
            this.saveData();
            // 전체 렌더링 대신 리스트만 부분 갱신하여 검색창 포커스 유지 가능하게 함
            const wordListContainer = document.getElementById('word-list');
            if (wordListContainer) wordListContainer.innerHTML = this.renderWordList();
        }
    }

    public editWord(id: string) {
        this.editingWordId = id;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    public deleteWord(id: string) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        this.words = this.words.filter(w => w.id !== id);
        if (this.editingWordId === id) this.editingWordId = null;
        this.saveData();
        this.render();
    }

    /* --- STATS TAB --- */
    private renderStatsTab(container: HTMLElement) {
        const today = new Date().toISOString().split('T')[0];
        const todayEntry = this.playHistory.find(h => h.date === today);
        const todayCount = todayEntry ? todayEntry.count : 0;

        container.innerHTML = `
      <div class="glass-panel card fade-in" style="padding: 20px;">
        <h2 style="margin-top:0; font-size: 1.2rem; color: var(--accent-blue);">학습 통계</h2>
        
        <div class="stats-summary">
            <div class="stats-value">${todayCount}</div>
            <div class="stats-label-main">TODAY'S LISTENS</div>
        </div>

        <div style="height: 250px; width: 100%;">
          <canvas id="stats-chart"></canvas>
        </div>
        <div style="margin-top:20px; text-align:center; color:#8892b0; font-size:0.8rem;">
          최근 7일간의 일일 청취 횟수 추이
        </div>
      </div>
    `;
        setTimeout(() => this.initChart(), 100);
    }

    private async initChart() {
        const canvas = document.getElementById('stats-chart') as HTMLCanvasElement;
        if (!canvas) return;

        const { Chart, registerables } = await import('chart.js');
        Chart.register(...registerables);

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const data = last7Days.map(date => {
            const entry = this.playHistory.find(h => h.date === date);
            return entry ? entry.count : 0;
        });

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: last7Days.map(d => d.split('-').slice(1).join('/')),
                datasets: [{
                    label: '청취 횟수',
                    data: data,
                    backgroundColor: 'rgba(0, 242, 255, 0.2)',
                    borderColor: '#00f2ff',
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#555' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#555' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    /* --- PLAY TAB --- */
    private renderPlayTab(container: HTMLElement) {
        this.playlist = this.words.filter(w => w.checked);

        if (this.playlist.length === 0) {
            container.innerHTML = `
                <div class="glass-panel card fade-in" style="padding: 30px; text-align:center;">
                    <p style="margin-bottom:20px; color:var(--text-white);">재생할 단어가 없습니다.</p>
                    <p style="font-size:0.85rem; color:#8892b0;">단어장에서 학습하고 싶은 단어의 <br><strong>체크박스</strong>를 클릭해 주세요.</p>
                </div>`;
            return;
        }

        // 현재 인덱스가 새 플레이리스트 범위 밖이면 초기화
        if (this.currentWordIndex >= this.playlist.length) {
            this.currentWordIndex = 0;
        }

        container.innerHTML = `
      <div class="player-container fade-in">
        <div class="glass-panel playback-card">
          <div class="repeat-indicator" id="repeat-info">REPEAT 1/2</div>
          <div id="current-word-display">READY?</div>
          <div class="status-label" id="status-text">PRESS PLAY TO START</div>
        </div>
        
        <div class="player-controls">
          <button id="prev-btn" class="nav-btn" style="flex:none; width:48px; height:48px; border-radius:50%; font-size:0.6rem;">PREV</button>
          
          <button id="play-btn" class="play-main-btn">
            <!-- Premium Play Icon -->
            <svg id="play-icon" viewBox="0 0 24 24">
              <path d="M7 6v12l10-6z" />
              <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
            </svg>
            <!-- Premium Pause Icon -->
            <svg id="pause-icon" class="hidden" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
            </svg>
          </button>
          
          <button id="next-btn" class="nav-btn" style="flex:none; width:48px; height:48px; border-radius:50%; font-size:0.6rem;">NEXT</button>
        </div>
      </div>
    `;

        document.getElementById('play-btn')?.addEventListener('click', () => this.togglePlayback());
        document.getElementById('prev-btn')?.addEventListener('click', () => this.movePlaylist(-1));
        document.getElementById('next-btn')?.addEventListener('click', () => this.movePlaylist(1));

        this.updatePlayerUI();
    }

    private togglePlayback() {
        this.isPlaying = !this.isPlaying;
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');

        if (this.isPlaying) {
            playIcon?.classList.add('hidden');
            pauseIcon?.classList.remove('hidden');
            this.startPlayback();
        } else {
            playIcon?.classList.remove('hidden');
            pauseIcon?.classList.add('hidden');
            speechSynthesis.cancel();
        }
    }

    private startPlayback() {
        if (!this.isPlaying) return;
        this.speakCurrent();
    }

    private speakCurrent() {
        if (!this.isPlaying || this.playlist.length === 0) return;
        const word = this.playlist[this.currentWordIndex];
        const textToSpeak = this.languageMode === 'vi' ? word.vietnamese : word.korean;
        const lang = this.languageMode === 'vi' ? 'vi-VN' : 'ko-KR';

        this.updatePlayerUI();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = lang;
        utterance.rate = 0.9;

        utterance.onend = () => {
            setTimeout(() => {
                this.handlePlaybackEnd();
            }, 800);
        };

        speechSynthesis.speak(utterance);
    }

    private handlePlaybackEnd() {
        if (!this.isPlaying || this.playlist.length === 0) return;

        if (this.languageMode === 'vi') {
            this.languageMode = 'ko';
        } else {
            this.languageMode = 'vi';
            this.repeatCount++;
            if (this.repeatCount >= 2) {
                this.repeatCount = 0;
                this.logPlay();
                this.currentWordIndex = (this.currentWordIndex + 1) % this.playlist.length;
            }
        }
        this.speakCurrent();
    }

    private movePlaylist(delta: number) {
        if (this.playlist.length === 0) return;
        this.currentWordIndex = (this.currentWordIndex + delta + this.playlist.length) % this.playlist.length;
        this.repeatCount = 0;
        this.languageMode = 'vi';
        this.updatePlayerUI();
        if (this.isPlaying) {
            speechSynthesis.cancel();
            this.speakCurrent();
        }
    }

    private updatePlayerUI() {
        const display = document.getElementById('current-word-display');
        const status = document.getElementById('status-text');
        const repeat = document.getElementById('repeat-info');

        if (!display || this.playlist.length === 0 || !this.playlist[this.currentWordIndex]) return;

        const word = this.playlist[this.currentWordIndex];
        display.innerText = this.languageMode === 'vi' ? word.vietnamese : word.korean;
        display.style.color = this.languageMode === 'vi' ? 'var(--accent-blue)' : 'var(--accent-purple)';

        if (status) status.innerText = this.languageMode === 'vi' ? 'SPEAKING VIETNAMESE' : 'SPEAKING KOREAN';
        if (repeat) repeat.innerText = `REPEAT ${this.repeatCount + 1}/2`;
    }
}

const app = new VietPlayerApp();
(window as any).app = app;
