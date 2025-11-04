/**
 * 게임 저장/불러오기 관리
 */
class GameStorage {
    constructor() {
        this.storageKey = 'rummikub_saved_game';
        this.statsKey = 'rummikub_statistics';
    }

    /**
     * 게임 저장
     */
    saveGame(game, difficulty) {
        try {
            const gameData = {
                difficulty: difficulty,
                playerHand: game.playerHand.map(t => ({
                    number: t.number,
                    color: t.color,
                    isJoker: t.isJoker,
                    id: t.id
                })),
                tableTiles: game.tableTiles.map(g => ({
                    tiles: g.tiles.map(t => ({
                        number: t.number,
                        color: t.color,
                        isJoker: t.isJoker,
                        id: t.id
                    })),
                    type: g.type,
                    valid: g.valid
                })),
                tilePack: game.tilePack.serialize(),
                currentPlayer: game.currentPlayer,
                firstPlay: game.firstPlay,
                aiFirstPlay: game.aiFirstPlay,
                score: game.score,
                aiScore: game.aiScore,
                turnState: {
                    originalHand: game.turnState.originalHand.map(t => ({
                        number: t.number,
                        color: t.color,
                        isJoker: t.isJoker,
                        id: t.id
                    })),
                    originalTable: game.turnState.originalTable.map(g => ({
                        tiles: g.tiles.map(t => ({
                            number: t.number,
                            color: t.color,
                            isJoker: t.isJoker,
                            id: t.id
                        })),
                        type: g.type,
                        valid: g.valid
                    })),
                    tilesBeforeDraw: game.turnState.tilesBeforeDraw,
                    hasDrawn: game.turnState.hasDrawn,
                    hasPlayed: game.turnState.hasPlayed
                },
                aiHand: game.aiPlayer ? game.aiPlayer.hand.map(t => ({
                    number: t.number,
                    color: t.color,
                    isJoker: t.isJoker,
                    id: t.id
                })) : [],
                savedAt: new Date().toISOString()
            };

            localStorage.setItem(this.storageKey, JSON.stringify(gameData));
            return true;
        } catch (error) {
            console.error('게임 저장 실패:', error);
            return false;
        }
    }

    /**
     * 게임 불러오기
     */
    loadGame() {
        try {
            const gameDataStr = localStorage.getItem(this.storageKey);
            if (!gameDataStr) {
                return null;
            }

            const gameData = JSON.parse(gameDataStr);
            return gameData;
        } catch (error) {
            console.error('게임 불러오기 실패:', error);
            return null;
        }
    }

    /**
     * 저장된 게임이 있는지 확인
     */
    hasSavedGame() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    /**
     * 게임 삭제
     */
    deleteGame() {
        localStorage.removeItem(this.storageKey);
    }

    /**
     * 통계 저장
     */
    saveStatistics(stats) {
        try {
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
            return true;
        } catch (error) {
            console.error('통계 저장 실패:', error);
            return false;
        }
    }

    /**
     * 통계 불러오기
     */
    loadStatistics() {
        try {
            const statsStr = localStorage.getItem(this.statsKey);
            if (!statsStr) {
                return this.getDefaultStatistics();
            }

            return JSON.parse(statsStr);
        } catch (error) {
            console.error('통계 불러오기 실패:', error);
            return this.getDefaultStatistics();
        }
    }

    /**
     * 기본 통계 데이터
     */
    getDefaultStatistics() {
        return {
            totalGames: 0,
            wins: 0,
            losses: 0,
            totalScore: 0,
            bestScore: 0,
            totalTime: 0,
            games: [],
            difficultyStats: {
                easy: { games: 0, wins: 0, totalScore: 0, bestScore: 0 },
                normal: { games: 0, wins: 0, totalScore: 0, bestScore: 0 },
                hard: { games: 0, wins: 0, totalScore: 0, bestScore: 0 },
                expert: { games: 0, wins: 0, totalScore: 0, bestScore: 0 }
            }
        };
    }

    /**
     * 통계 초기화
     */
    resetStatistics() {
        localStorage.removeItem(this.statsKey);
    }
}

