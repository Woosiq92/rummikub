/**
 * 게임 통계 관리
 */
class GameStatistics {
    constructor(storage) {
        this.storage = storage;
        this.stats = this.storage.loadStatistics();
    }

    /**
     * 게임 결과 기록
     */
    recordGame(result) {
        this.stats.totalGames++;
        
        if (result.won) {
            this.stats.wins++;
        } else {
            this.stats.losses++;
        }

        this.stats.totalScore += result.score || 0;
        if (result.score > this.stats.bestScore) {
            this.stats.bestScore = result.score;
        }

        this.stats.totalTime += result.duration || 0;

        // 난이도별 통계
        if (result.difficulty && this.stats.difficultyStats[result.difficulty]) {
            const diffStats = this.stats.difficultyStats[result.difficulty];
            diffStats.games++;
            if (result.won) {
                diffStats.wins++;
            }
            diffStats.totalScore += result.score || 0;
            if (result.score > diffStats.bestScore) {
                diffStats.bestScore = result.score;
            }
        }

        // 게임 기록 추가
        this.stats.games.push({
            date: new Date().toISOString(),
            difficulty: result.difficulty,
            won: result.won,
            score: result.score || 0,
            duration: result.duration || 0
        });

        // 최근 100개 게임만 유지
        if (this.stats.games.length > 100) {
            this.stats.games = this.stats.games.slice(-100);
        }

        this.save();
    }

    /**
     * 통계 저장
     */
    save() {
        this.storage.saveStatistics(this.stats);
    }

    /**
     * 통계 가져오기
     */
    getStats() {
        return {
            totalGames: this.stats.totalGames,
            wins: this.stats.wins,
            losses: this.stats.losses,
            winRate: this.stats.totalGames > 0 ? (this.stats.wins / this.stats.totalGames * 100).toFixed(1) : 0,
            avgScore: this.stats.totalGames > 0 ? Math.round(this.stats.totalScore / this.stats.totalGames) : 0,
            bestScore: this.stats.bestScore,
            avgTime: this.stats.totalGames > 0 ? Math.round(this.stats.totalTime / this.stats.totalGames / 60) : 0,
            difficultyStats: this.stats.difficultyStats
        };
    }

    /**
     * 통계 초기화
     */
    reset() {
        this.stats = this.storage.getDefaultStatistics();
        this.storage.resetStatistics();
    }

    /**
     * UI에 통계 표시
     */
    displayStats() {
        const stats = this.getStats();
        
        document.getElementById('stat-total-games').textContent = stats.totalGames;
        document.getElementById('stat-wins').textContent = stats.wins;
        document.getElementById('stat-win-rate').textContent = `${stats.winRate}%`;
        document.getElementById('stat-avg-score').textContent = stats.avgScore;
        document.getElementById('stat-best-score').textContent = stats.bestScore;
        document.getElementById('stat-avg-time').textContent = `${stats.avgTime}분`;

        // 난이도별 통계
        const difficultyList = document.getElementById('difficulty-stats-list');
        difficultyList.innerHTML = '';

        const difficultyNames = {
            easy: '🌱 쉬움',
            normal: '⭐ 보통',
            hard: '🔥 어려움',
            expert: '👑 전문가'
        };

        for (const [difficulty, diffStats] of Object.entries(stats.difficultyStats)) {
            if (diffStats.games === 0) continue;

            const diffCard = document.createElement('div');
            diffCard.className = 'difficulty-stat-card';
            const winRate = diffStats.games > 0 ? (diffStats.wins / diffStats.games * 100).toFixed(1) : 0;
            const avgScore = diffStats.games > 0 ? Math.round(diffStats.totalScore / diffStats.games) : 0;

            diffCard.innerHTML = `
                <div class="difficulty-stat-header">
                    <h3>${difficultyNames[difficulty]}</h3>
                </div>
                <div class="difficulty-stat-content">
                    <div class="stat-row">
                        <span>게임 수:</span>
                        <span>${diffStats.games}</span>
                    </div>
                    <div class="stat-row">
                        <span>승리:</span>
                        <span>${diffStats.wins}</span>
                    </div>
                    <div class="stat-row">
                        <span>승률:</span>
                        <span>${winRate}%</span>
                    </div>
                    <div class="stat-row">
                        <span>평균 점수:</span>
                        <span>${avgScore}</span>
                    </div>
                    <div class="stat-row">
                        <span>최고 점수:</span>
                        <span>${diffStats.bestScore}</span>
                    </div>
                </div>
            `;

            difficultyList.appendChild(diffCard);
        }
    }
}

