/**
 * 루미큐브 게임 로직
 */
class RummikubGame {
    constructor(aiEnabled = false, difficulty = 'normal') {
        this.tilePack = new TilePack();
        this.playerHand = [];
        this.tableTiles = []; // [{ tiles: [Tile], type: 'set'|'run', valid: boolean }]
        this.currentPlayer = 1; // 1 = 플레이어, 2-4 = AI 플레이어들
        this.totalPlayers = 4; // 총 4명 (플레이어 1명 + AI 3명)
        this.firstPlay = true; // 첫 플레이인지 (30점 이상 필요)
        
        // 각 플레이어의 첫 플레이 상태
        this.firstPlays = {
            1: true,  // 플레이어
            2: true,  // AI 1
            3: true,  // AI 2
            4: true   // AI 3
        };
        
        // 각 플레이어의 점수
        this.scores = {
            1: 0,  // 플레이어
            2: 0,  // AI 1
            3: 0,  // AI 2
            4: 0   // AI 3
        };
        
        this.aiEnabled = aiEnabled;
        this.difficulty = difficulty;
        
        // AI 플레이어 3명 생성
        this.aiPlayers = [];
        if (aiEnabled) {
            const aiNames = ['AI 1', 'AI 2', 'AI 3'];
            for (let i = 0; i < 3; i++) {
                this.aiPlayers.push(new AIPlayer(aiNames[i], difficulty));
            }
        }
        
        this.turnState = {
            originalHand: [],
            originalTable: [],
            tilesBeforeDraw: [], // 타일을 뽑기 전에 배치한 타일들
            tilesPlacedThisTurn: new Set(), // 이 턴에 배치한 모든 타일 ID
            hasDrawn: false,
            hasPlayed: false
        };
        this.gameStartTime = null;
        this.gameEndTime = null;
    }

    /**
     * 게임 시작 - 모든 플레이어에게 14개 타일 배포
     */
    startGame() {
        this.gameStartTime = Date.now();
        this.playerHand = [];
        for (let i = 0; i < 14; i++) {
            if (!this.tilePack.isEmpty()) {
                this.playerHand.push(this.tilePack.draw());
            }
        }
        this.sortHand();
        this.turnState.originalHand = this.playerHand.map(t => t.clone());
        
        // AI 플레이어들에게도 타일 배포
        if (this.aiEnabled && this.aiPlayers.length > 0) {
            for (const aiPlayer of this.aiPlayers) {
                const aiTiles = [];
                for (let i = 0; i < 14; i++) {
                    if (!this.tilePack.isEmpty()) {
                        aiTiles.push(this.tilePack.draw());
                    }
                }
                aiPlayer.receiveTiles(aiTiles);
            }
        }
    }

    /**
     * 핸드 타일 정렬 (색상별, 숫자순)
     */
    sortHand() {
        const colorOrder = { red: 0, blue: 1, black: 2, yellow: 3 };
        this.playerHand.sort((a, b) => {
            if (a.isJoker && !b.isJoker) return 1;
            if (!a.isJoker && b.isJoker) return -1;
            if (a.isJoker && b.isJoker) return 0;
            
            const colorDiff = colorOrder[a.color] - colorOrder[b.color];
            if (colorDiff !== 0) return colorDiff;
            return a.number - b.number;
        });
    }

    /**
     * 타일 뽑기
     */
    drawTile() {
        if (this.turnState.hasDrawn) {
            return null; // 이미 뽑았음
        }
        if (this.tilePack.isEmpty()) {
            return null; // 타일 팩이 비었음
        }
        
        const tile = this.tilePack.draw();
        this.playerHand.push(tile);
        this.sortHand();
        this.turnState.hasDrawn = true;
        // 타일을 뽑은 후에도 플레이할 수 있음 (단, 뽑기 전에 배치한 타일은 플레이 불가)
        this.turnState.hasPlayed = false;
        return tile;
    }

    /**
     * 타일을 테이블에 배치
     */
    placeTileOnTable(tile, groupIndex = null) {
        if (groupIndex !== null && this.tableTiles[groupIndex]) {
            // 기존 그룹에 추가
            this.tableTiles[groupIndex].tiles.push(tile);
        } else {
            // 새 그룹 생성
            this.tableTiles.push({
                tiles: [tile],
                type: null,
                valid: false
            });
        }
        this.validateTable();
        
        // 이 턴에 배치한 타일 추적
        this.turnState.tilesPlacedThisTurn.add(tile.id);
        
        // 타일을 뽑기 전에 배치한 타일 추적
        if (!this.turnState.hasDrawn) {
            this.turnState.tilesBeforeDraw = this.tableTiles.map(g => ({
                tiles: g.tiles.map(t => t.id),
                type: g.type,
                valid: g.valid
            }));
        }
    }

    /**
     * 테이블의 타일 그룹 검증
     */
    validateTable() {
        for (const group of this.tableTiles) {
            if (group.tiles.length < 3) {
                group.valid = false;
                group.type = null;
                continue;
            }

            // 조커가 있는지 확인
            const jokers = group.tiles.filter(t => t.isJoker);
            const regularTiles = group.tiles.filter(t => !t.isJoker);

            if (regularTiles.length === 0) {
                group.valid = false;
                group.type = null;
                continue;
            }

            // 세트인지 런인지 확인
            if (this.isValidSet(group.tiles)) {
                group.type = 'set';
                group.valid = true;
            } else if (this.isValidRun(group.tiles)) {
                group.type = 'run';
                group.valid = true;
            } else {
                group.valid = false;
                group.type = null;
            }
        }
    }

    /**
     * 세트 검증 (같은 숫자, 다른 색상)
     */
    isValidSet(tiles) {
        const jokers = tiles.filter(t => t.isJoker);
        const regularTiles = tiles.filter(t => !t.isJoker);
        
        if (regularTiles.length === 0) return false;
        if (regularTiles.length + jokers.length < 3) return false;

        // 숫자 확인
        const numbers = new Set(regularTiles.map(t => t.number));
        if (numbers.size > 1) return false; // 모두 같은 숫자여야 함

        // 색상 확인 (중복 색상 없어야 함)
        const colors = regularTiles.map(t => t.color);
        const uniqueColors = new Set(colors);
        
        // 중복 색상이 있으면 안 됨 (조커 제외)
        if (colors.length !== uniqueColors.size) return false;

        // 최소 3개 이상
        return tiles.length >= 3;
    }

    /**
     * 런 검증 (연속 숫자, 같은 색상)
     */
    isValidRun(tiles) {
        const jokers = tiles.filter(t => t.isJoker);
        const regularTiles = tiles.filter(t => !t.isJoker);
        
        if (regularTiles.length === 0) return false;
        if (regularTiles.length + jokers.length < 3) return false;

        // 색상 확인 (모두 같은 색상이어야 함)
        const colors = regularTiles.map(t => t.color);
        const uniqueColors = new Set(colors);
        if (uniqueColors.size > 1) return false;

        // 숫자 정렬
        const numbers = regularTiles.map(t => t.number).sort((a, b) => a - b);
        
        // 조커를 사용하여 연속 숫자 만들기
        let gaps = 0;
        for (let i = 1; i < numbers.length; i++) {
            gaps += numbers[i] - numbers[i - 1] - 1;
        }
        
        // 조커로 모든 간격을 채울 수 있는지 확인
        if (gaps > jokers.length) return false;

        // 최소 3개 이상
        return tiles.length >= 3;
    }

    /**
     * 테이블의 총 점수 계산 (조커 제외 옵션)
     */
    calculateTableScore(excludeJokers = false) {
        let totalScore = 0;
        for (const group of this.tableTiles) {
            if (group.valid) {
                for (const tile of group.tiles) {
                    if (tile.isJoker) {
                        if (!excludeJokers) {
                            totalScore += 30; // 조커는 30점
                        }
                    } else {
                        totalScore += tile.number;
                    }
                }
            }
        }
        return totalScore;
    }

    /**
     * 플레이 가능한지 확인
     * @param {boolean} returnTilesToHand - 플레이 불가 시 타일을 핸드로 되돌릴지 여부
     * @returns {boolean|Array} 플레이 가능 여부, 또는 되돌릴 타일 배열
     */
    canPlay(returnTilesToHand = false) {
        // 테이블에 타일이 없으면 플레이 불가
        if (this.tableTiles.length === 0) {
            if (returnTilesToHand) {
                return { canPlay: false, tilesToReturn: [] };
            }
            return false;
        }

        // 유효하지 않은 그룹 찾기
        const invalidGroups = [];
        let hasValidTiles = false;
        for (const group of this.tableTiles) {
            if (group.tiles.length > 0) {
                hasValidTiles = true;
                if (!group.valid) {
                    invalidGroups.push(group);
                    if (!returnTilesToHand) {
                        return false; // 유효하지 않은 그룹이 있으면 플레이 불가
                    }
                }
            }
        }

        // 테이블에 타일이 하나도 없으면 플레이 불가
        if (!hasValidTiles) {
            if (returnTilesToHand) {
                return { canPlay: false, tilesToReturn: [] };
            }
            return false;
        }

        // 첫 플레이인 경우 30점 이상 필요 (조커 없이)
        const currentPlayerFirstPlay = this.getCurrentPlayerFirstPlay();
        if (currentPlayerFirstPlay) {
            const score = this.calculateTableScore(true);
            if (score < 30) {
                if (returnTilesToHand) {
                    // 첫 플레이 조건 실패 시 이 턴에 배치한 모든 타일을 되돌리기
                    const tilesToReturn = this.getAllTilesPlacedThisTurn();
                    return { canPlay: false, tilesToReturn: tilesToReturn };
                }
                return false;
            }
            
            // 첫 플레이에서는 조커 사용 불가
            for (const group of this.tableTiles) {
                if (group.valid) {
                    const hasJoker = group.tiles.some(t => t.isJoker);
                    if (hasJoker) {
                        if (returnTilesToHand) {
                            // 조커가 있으면 이 턴에 배치한 모든 타일을 되돌리기
                            const tilesToReturn = this.getAllTilesPlacedThisTurn();
                            return { canPlay: false, tilesToReturn: tilesToReturn };
                        }
                        return false;
                    }
                }
            }
        }

        // 유효하지 않은 그룹이 있으면 플레이 불가
        if (invalidGroups.length > 0) {
            if (returnTilesToHand) {
                const tilesToReturn = this.getTilesToReturn(invalidGroups);
                return { canPlay: false, tilesToReturn: tilesToReturn };
            }
            return false;
        }

        if (returnTilesToHand) {
            return { canPlay: true, tilesToReturn: [] };
        }
        return true;
    }

    /**
     * 유효하지 않은 그룹에서 현재 플레이어가 배치한 타일들을 찾아서 반환
     */
    getTilesToReturn(invalidGroups) {
        const tilesToReturn = [];
        for (const group of invalidGroups) {
            for (const tile of group.tiles) {
                // 이 턴에 배치한 타일만 되돌리기
                if (this.turnState.tilesPlacedThisTurn.has(tile.id)) {
                    tilesToReturn.push(tile);
                }
            }
        }
        return tilesToReturn;
    }

    /**
     * 이 턴에 배치한 모든 타일을 반환
     */
    getAllTilesPlacedThisTurn() {
        const tilesToReturn = [];
        for (const group of this.tableTiles) {
            for (const tile of group.tiles) {
                if (this.turnState.tilesPlacedThisTurn.has(tile.id)) {
                    tilesToReturn.push(tile);
                }
            }
        }
        return tilesToReturn;
    }

    /**
     * 플레이 실행
     */
    play() {
        const playCheck = this.canPlay(true);
        if (!playCheck.canPlay) {
            // 플레이 불가 시 유효하지 않은 타일들을 핸드로 되돌리기
            if (playCheck.tilesToReturn && playCheck.tilesToReturn.length > 0) {
                this.returnTilesToHand(playCheck.tilesToReturn);
            }
            return false;
        }

        // 타일을 뽑은 후에는 뽑기 전에 배치한 타일은 플레이할 수 없음
        if (this.turnState.hasDrawn) {
            const beforeDrawTileIds = new Set();
            this.turnState.tilesBeforeDraw.forEach(group => {
                group.tiles.forEach(tileId => {
                    beforeDrawTileIds.add(tileId);
                });
            });
            
            // 뽑기 전 타일이 있는지 확인
            let hasBeforeDrawTiles = false;
            for (const group of this.tableTiles) {
                for (const tile of group.tiles) {
                    if (beforeDrawTileIds.has(tile.id)) {
                        hasBeforeDrawTiles = true;
                        break;
                    }
                }
                if (hasBeforeDrawTiles) break;
            }
            
            if (hasBeforeDrawTiles) {
                return false; // 뽑기 전에 배치한 타일이 있으면 플레이 불가
            }
        }

        // 핸드에서 테이블로 이동한 타일 제거
        const tableTileIds = new Set();
        for (const group of this.tableTiles) {
            for (const tile of group.tiles) {
                tableTileIds.add(tile.id);
            }
        }

        this.playerHand = this.playerHand.filter(tile => 
            !tableTileIds.has(tile.id)
        );

        // 첫 플레이 완료
        const currentPlayerFirstPlay = this.getCurrentPlayerFirstPlay();
        if (currentPlayerFirstPlay) {
            if (this.currentPlayer === 1) {
                this.firstPlays[1] = false;
            } else {
                const aiIndex = this.currentPlayer - 2;
                if (this.aiPlayers && this.aiPlayers[aiIndex]) {
                    this.aiPlayers[aiIndex].firstPlay = false;
                }
            }
        }

        // 점수 업데이트
        const tableScore = this.calculateTableScore();
        this.scores[this.currentPlayer] = tableScore;
        
        // 턴 상태 초기화
        this.turnState.originalHand = this.playerHand.map(t => t.clone());
        this.turnState.originalTable = this.tableTiles.map(g => ({
            tiles: g.tiles.map(t => t.clone()),
            type: g.type,
            valid: g.valid
        }));
        this.turnState.tilesBeforeDraw = [];
        this.turnState.tilesPlacedThisTurn.clear();
        this.turnState.hasDrawn = false;
        this.turnState.hasPlayed = true;

        return true;
    }

    /**
     * 현재 플레이어의 첫 플레이 여부 확인
     */
    getCurrentPlayerFirstPlay() {
        if (this.currentPlayer === 1) {
            return this.firstPlays[1];
        } else {
            const aiIndex = this.currentPlayer - 2;
            if (this.aiPlayers && this.aiPlayers[aiIndex]) {
                return this.aiPlayers[aiIndex].firstPlay;
            }
        }
        return false;
    }

    /**
     * 다음 플레이어로 이동
     */
    nextPlayer() {
        this.currentPlayer = (this.currentPlayer % this.totalPlayers) + 1;
    }

    /**
     * 타일을 핸드로 되돌리기
     */
    returnTilesToHand(tilesToReturn) {
        // 테이블에서 타일 제거
        for (const tile of tilesToReturn) {
            for (let i = this.tableTiles.length - 1; i >= 0; i--) {
                const group = this.tableTiles[i];
                const tileIndex = group.tiles.findIndex(t => t.id === tile.id);
                if (tileIndex !== -1) {
                    group.tiles.splice(tileIndex, 1);
                    // 빈 그룹 제거
                    if (group.tiles.length === 0) {
                        this.tableTiles.splice(i, 1);
                    }
                    break;
                }
            }
        }

        // 핸드에 타일 추가
        this.playerHand.push(...tilesToReturn);
        this.sortHand();

        // 추적 상태에서 제거
        for (const tile of tilesToReturn) {
            this.turnState.tilesPlacedThisTurn.delete(tile.id);
        }

        // 테이블 재검증
        this.validateTable();
    }

    /**
     * 타일을 뽑았지만 플레이할 수 없는 경우 턴 종료
     */
    endTurnAfterDraw() {
        this.turnState.hasDrawn = true;
        this.turnState.hasPlayed = false;
        // 턴 종료 - 다음 플레이어로 넘어감
    }

    /**
     * 턴 되돌리기
     */
    resetTurn() {
        this.playerHand = this.turnState.originalHand.map(t => t.clone());
        this.tableTiles = this.turnState.originalTable.map(g => ({
            tiles: g.tiles.map(t => t.clone()),
            type: g.type,
            valid: g.valid
        }));
        this.validateTable();
        this.turnState.tilesBeforeDraw = [];
        this.turnState.tilesPlacedThisTurn.clear();
        this.turnState.hasDrawn = false;
        this.turnState.hasPlayed = false;
    }

    /**
     * 새 게임 시작
     */
    newGame(difficulty = null) {
        if (difficulty) {
            this.difficulty = difficulty;
        }
        this.tilePack = new TilePack();
        this.playerHand = [];
        this.tableTiles = [];
        this.turnState.tilesPlacedThisTurn.clear();
        this.currentPlayer = 1;
        
        // 첫 플레이 상태 초기화
        this.firstPlays = {
            1: true,
            2: true,
            3: true,
            4: true
        };
        
        // 점수 초기화
        this.scores = {
            1: 0,
            2: 0,
            3: 0,
            4: 0
        };
        
        this.turnState = {
            originalHand: [],
            originalTable: [],
            tilesBeforeDraw: [],
            tilesPlacedThisTurn: new Set(),
            hasDrawn: false,
            hasPlayed: false
        };
        
        // AI 재초기화
        if (this.aiEnabled) {
            this.aiPlayers = [];
            const aiNames = ['AI 1', 'AI 2', 'AI 3'];
            for (let i = 0; i < 3; i++) {
                this.aiPlayers.push(new AIPlayer(aiNames[i], this.difficulty));
            }
        }
        
        this.startGame();
    }

    /**
     * 게임 종료 처리
     */
    endGame(winner) {
        this.gameEndTime = Date.now();
        const duration = this.gameEndTime - this.gameStartTime;
        
        // 승자 확인 (플레이어 1 또는 AI 플레이어 번호)
        const winnerName = winner === 'player' ? '플레이어' : 
                          winner === 'ai1' ? 'AI 1' :
                          winner === 'ai2' ? 'AI 2' :
                          winner === 'ai3' ? 'AI 3' : '플레이어';
        
        return {
            winner: winner,
            winnerName: winnerName,
            playerScore: this.scores[1],
            ai1Score: this.scores[2],
            ai2Score: this.scores[3],
            ai3Score: this.scores[4],
            scores: this.scores,
            duration: duration,
            difficulty: this.difficulty,
            won: winner === 'player'
        };
    }

    /**
     * 직렬화 (저장용)
     */
    serialize() {
        return {
            playerHand: this.playerHand.map(t => ({
                number: t.number,
                color: t.color,
                isJoker: t.isJoker,
                id: t.id
            })),
            tableTiles: this.tableTiles.map(g => ({
                tiles: g.tiles.map(t => ({
                    number: t.number,
                    color: t.color,
                    isJoker: t.isJoker,
                    id: t.id
                })),
                type: g.type,
                valid: g.valid
            })),
            tilePack: this.tilePack.serialize(),
            currentPlayer: this.currentPlayer,
            firstPlay: this.firstPlay,
            aiFirstPlay: this.aiFirstPlay,
            score: this.score,
            aiScore: this.aiScore,
            difficulty: this.difficulty,
            turnState: {
                originalHand: this.turnState.originalHand.map(t => ({
                    number: t.number,
                    color: t.color,
                    isJoker: t.isJoker,
                    id: t.id
                })),
                originalTable: this.turnState.originalTable.map(g => ({
                    tiles: g.tiles.map(t => ({
                        number: t.number,
                        color: t.color,
                        isJoker: t.isJoker,
                        id: t.id
                    })),
                    type: g.type,
                    valid: g.valid
                })),
                tilesBeforeDraw: this.turnState.tilesBeforeDraw,
                hasDrawn: this.turnState.hasDrawn,
                hasPlayed: this.turnState.hasPlayed
            },
            aiHand: this.aiPlayer ? this.aiPlayer.hand.map(t => ({
                number: t.number,
                color: t.color,
                isJoker: t.isJoker,
                id: t.id
            })) : []
        };
    }

    /**
     * 역직렬화 (불러오기용)
     */
    static deserialize(data, difficulty) {
        const game = new RummikubGame(true, difficulty);
        
        // 타일 팩 복원
        game.tilePack = TilePack.deserialize(data.tilePack);
        
        // 플레이어 핸드 복원
        game.playerHand = data.playerHand.map(tileData => {
            const tile = new Tile(tileData.number, tileData.color, tileData.isJoker);
            tile.id = tileData.id;
            return tile;
        });
        
        // 테이블 타일 복원
        game.tableTiles = data.tableTiles.map(groupData => ({
            tiles: groupData.tiles.map(tileData => {
                const tile = new Tile(tileData.number, tileData.color, tileData.isJoker);
                tile.id = tileData.id;
                return tile;
            }),
            type: groupData.type,
            valid: groupData.valid
        }));
        
        // 게임 상태 복원
        game.currentPlayer = data.currentPlayer;
        game.firstPlay = data.firstPlay;
        game.aiFirstPlay = data.aiFirstPlay;
        game.score = data.score;
        game.aiScore = data.aiScore;
        game.difficulty = data.difficulty;
        
        // 턴 상태 복원
        game.turnState.originalHand = data.turnState.originalHand.map(tileData => {
            const tile = new Tile(tileData.number, tileData.color, tileData.isJoker);
            tile.id = tileData.id;
            return tile;
        });
        game.turnState.originalTable = data.turnState.originalTable.map(groupData => ({
            tiles: groupData.tiles.map(tileData => {
                const tile = new Tile(tileData.number, tileData.color, tileData.isJoker);
                tile.id = tileData.id;
                return tile;
            }),
            type: groupData.type,
            valid: groupData.valid
        }));
        game.turnState.tilesBeforeDraw = data.turnState.tilesBeforeDraw;
        game.turnState.hasDrawn = data.turnState.hasDrawn;
        game.turnState.hasPlayed = data.turnState.hasPlayed;
        
        // AI 핸드 복원
        if (data.aiHand && game.aiPlayer) {
            game.aiPlayer.hand = data.aiHand.map(tileData => {
                const tile = new Tile(tileData.number, tileData.color, tileData.isJoker);
                tile.id = tileData.id;
                return tile;
            });
            game.aiPlayer.firstPlay = data.aiFirstPlay;
        }
        
        game.validateTable();
        
        return game;
    }
}
