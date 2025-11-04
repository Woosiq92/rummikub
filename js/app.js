/**
 * 루미큐브 앱 메인
 */

let game;
let ui;
let gameStorage;
let gameStatistics;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    // Storage 및 Statistics 초기화
    gameStorage = new GameStorage();
    gameStatistics = new GameStatistics(gameStorage);
    
    // 전역 변수로 설정
    window.gameStorage = gameStorage;
    window.gameStatistics = gameStatistics;
    
    // 화면 전환 이벤트 리스너 설정
    setupScreenListeners();
    
    // 시작 화면 표시
    showStartScreen();
});

/**
 * 화면 전환 이벤트 리스너 설정
 */
function setupScreenListeners() {
    // 난이도 선택 버튼
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const difficulty = btn.dataset.difficulty;
            startGame(difficulty);
        });
    });
    
    // 게임 규칙 버튼
    document.getElementById('btn-rules')?.addEventListener('click', () => {
        showRulesModal();
    });
    
    // 통계 보기 버튼
    document.getElementById('btn-statistics')?.addEventListener('click', () => {
        showStatisticsScreen();
    });
    
    // 저장된 게임 불러오기 버튼
    document.getElementById('btn-load-game')?.addEventListener('click', () => {
        loadGame();
    });
    
    // 메뉴 버튼
    document.getElementById('btn-menu')?.addEventListener('click', () => {
        showMenuModal();
    });
    
    // 메뉴 모달 닫기
    document.getElementById('menu-close')?.addEventListener('click', () => {
        hideMenuModal();
    });
    
    // 게임 규칙 모달 닫기
    document.getElementById('rules-close')?.addEventListener('click', () => {
        hideRulesModal();
    });
    
    // 통계 화면 닫기
    document.getElementById('btn-close-stats')?.addEventListener('click', () => {
        hideStatisticsScreen();
    });
    
    // 통계 초기화 버튼
    document.getElementById('btn-reset-stats')?.addEventListener('click', () => {
        if (confirm('정말로 통계를 초기화하시겠습니까?')) {
            gameStatistics.reset();
            gameStatistics.displayStats();
        }
    });
    
    // 게임 종료 모달 닫기
    document.getElementById('game-over-close')?.addEventListener('click', () => {
        hideGameOverModal();
    });
    
    // 다시 플레이 버튼
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
        hideGameOverModal();
        startGame(game.difficulty);
    });
    
    // 메뉴로 돌아가기 버튼
    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
        hideGameOverModal();
        showStartScreen();
    });
    
    // 메뉴 모달 내부 버튼들
    document.getElementById('btn-menu-save')?.addEventListener('click', () => {
        hideMenuModal();
        if (ui) {
            ui.handleSaveGame();
        }
    });
    
    document.getElementById('btn-menu-load')?.addEventListener('click', () => {
        hideMenuModal();
        loadGame();
    });
    
    document.getElementById('btn-menu-statistics')?.addEventListener('click', () => {
        hideMenuModal();
        showStatisticsScreen();
    });
    
    document.getElementById('btn-menu-rules')?.addEventListener('click', () => {
        hideMenuModal();
        showRulesModal();
    });
    
    document.getElementById('btn-menu-new-game')?.addEventListener('click', () => {
        hideMenuModal();
        if (ui) {
            ui.handleNewGame();
        }
    });
    
    document.getElementById('btn-menu-quit')?.addEventListener('click', () => {
        if (confirm('게임을 종료하시겠습니까?')) {
            hideMenuModal();
            showStartScreen();
        }
    });
    
    // 모달 오버레이 클릭 시 닫기
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                // 조합 모달인 경우 선택 초기화
                if (overlay.id === 'combinations-modal' && ui) {
                    ui.selectedCombinationIndex = null;
                }
            }
        });
    });
}

/**
 * 시작 화면 표시
 */
function showStartScreen() {
    document.getElementById('start-screen')?.classList.remove('hidden');
    document.getElementById('game-screen')?.classList.add('hidden');
    document.getElementById('statistics-screen')?.classList.add('hidden');
}

/**
 * 게임 화면 표시
 */
function showGameScreen() {
    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('game-screen')?.classList.remove('hidden');
    document.getElementById('statistics-screen')?.classList.add('hidden');
}

/**
 * 게임 시작
 */
function startGame(difficulty = 'normal') {
    // 게임 초기화
    game = new RummikubGame(true, difficulty);
    game.startGame();
    
    // UI 초기화
    ui = new RummikubUI(game);
    
    // 전역 변수로 설정
    window.game = game;
    window.ui = ui;
    
    // 게임 화면 표시
    showGameScreen();
    
    // 턴 타이머 시작
    ui.startTurnTimer();
}

/**
 * 게임 불러오기
 */
function loadGame() {
    const gameData = gameStorage.loadGame();
    
    if (!gameData) {
        alert('저장된 게임이 없습니다.');
        return;
    }
    
    if (confirm('저장된 게임을 불러오시겠습니까?')) {
        // 게임 복원
        game = RummikubGame.deserialize(gameData, gameData.difficulty);
        
        // UI 초기화
        ui = new RummikubUI(game);
        
        // 전역 변수로 설정
        window.game = game;
        window.ui = ui;
        
        // 게임 화면 표시
        showGameScreen();
        
        // UI 새로고침
        ui.refresh();
        
        // 턴 타이머 시작
        if (game.currentPlayer === 1) {
            ui.startTurnTimer();
        }
        
        ui.showStatus('게임을 불러왔습니다!', 'success');
    }
}

/**
 * 게임 규칙 모달 표시
 */
function showRulesModal() {
    const modal = document.getElementById('rules-modal');
    const content = document.getElementById('rules-content');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div class="rules-content">
            <h3>목표</h3>
            <p>모든 타일을 조합하여 테이블에 배치하면 승리합니다!</p>
            
            <h3>게임 구성</h3>
            <ul>
                <li>숫자 타일: 1-13 × 4색상(빨강, 파랑, 검정, 노랑) × 2세트 = 104개</li>
                <li>조커: 2개 (어떤 타일로도 사용 가능)</li>
            </ul>
            
            <h3>조합 규칙</h3>
            <ul>
                <li><strong>세트(Set)</strong>: 같은 숫자, 다른 색상 (최소 3개)</li>
                <li><strong>런(Run)</strong>: 연속 숫자, 같은 색상 (최소 3개)</li>
            </ul>
            
            <h3>게임 진행</h3>
            <ul>
                <li>각 플레이어는 14개의 타일을 받습니다</li>
                <li><strong>첫 플레이</strong>: 30점 이상의 조합이 필요합니다 (조커 사용 불가)</li>
                <li>타일을 드래그하여 테이블에 배치할 수 있습니다</li>
                <li>타일을 뽑거나 플레이한 후 턴이 종료됩니다</li>
                <li>모든 조합이 유효해야 플레이할 수 있습니다</li>
            </ul>
            
            <h3>조작 방법</h3>
            <ul>
                <li>타일을 드래그하여 테이블에 배치</li>
                <li>타일 클릭으로 선택/해제</li>
                <li>타일을 뽑으면 자동으로 턴이 넘어갑니다</li>
                <li>"게임 저장" 버튼으로 진행 상황 저장</li>
            </ul>
            
            <h3>난이도 설명</h3>
            <ul>
                <li><strong>쉬움 🌱</strong>: 기본 조합만 사용, 실수 확률 20%</li>
                <li><strong>보통 ⭐</strong>: 최적 플레이, 실수 확률 10%</li>
                <li><strong>어려움 🔥</strong>: 전략적 플레이, 테이블 타일 활용, 실수 확률 5%</li>
                <li><strong>전문가 👑</strong>: 최적의 전략, 테이블 타일 활용, 실수 확률 1%</li>
            </ul>
            
            <p style="margin-top: 20px; text-align: center; color: #667eea; font-weight: 600;">
                즐거운 게임 되세요! 🎲
            </p>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

/**
 * 게임 규칙 모달 숨기기
 */
function hideRulesModal() {
    document.getElementById('rules-modal')?.classList.add('hidden');
}

/**
 * 통계 화면 표시
 */
function showStatisticsScreen() {
    const statsScreen = document.getElementById('statistics-screen');
    if (!statsScreen) return;
    
    gameStatistics.displayStats();
    statsScreen.classList.remove('hidden');
}

/**
 * 통계 화면 숨기기
 */
function hideStatisticsScreen() {
    document.getElementById('statistics-screen')?.classList.add('hidden');
}

/**
 * 메뉴 모달 표시
 */
function showMenuModal() {
    document.getElementById('menu-modal')?.classList.remove('hidden');
}

/**
 * 메뉴 모달 숨기기
 */
function hideMenuModal() {
    document.getElementById('menu-modal')?.classList.add('hidden');
}

/**
 * 게임 종료 모달 숨기기
 */
function hideGameOverModal() {
    document.getElementById('game-over-modal')?.classList.add('hidden');
}
