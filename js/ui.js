/**
 * UI 관리 클래스
 */
class RummikubUI {
    constructor(game) {
        this.game = game;
        this.draggedTile = null;
        this.dragTarget = null;
        this.selectedTiles = new Set();
        this.turnTimer = null;
        this.turnTimeLeft = 30;
        this.selectedCombinationIndex = null;
        this.isPaused = false;
        this.pausedTimeLeft = 0;
        this.init();
    }

    /**
     * UI 초기화
     */
    init() {
        this.renderHand();
        this.renderTable();
        this.updateRackCount();
        this.updateScore();
        this.updatePlayButton();
        this.updateCurrentPlayerDisplay();
        this.updateDifficultyBadge();
        this.updateTileCounts();
        this.setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 타일 뽑기 버튼
        document.getElementById('btn-draw')?.addEventListener('click', () => {
            this.handleDraw();
        });

        // 플레이 버튼
        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.handlePlay();
        });

        // 턴 넘기기 버튼
        document.getElementById('btn-pass-turn')?.addEventListener('click', () => {
            this.handlePassTurn();
        });

        // 새 게임 버튼
        document.getElementById('btn-new-game')?.addEventListener('click', () => {
            this.handleNewGame();
        });

        // 게임 저장 버튼
        document.getElementById('btn-save-game')?.addEventListener('click', () => {
            this.handleSaveGame();
        });

        // RUN 정렬 버튼
        document.getElementById('btn-sort-run')?.addEventListener('click', () => {
            this.sortHandByRun();
        });

        // SET 정렬 버튼
        document.getElementById('btn-sort-set')?.addEventListener('click', () => {
            this.sortHandBySet();
        });

        // 되돌리기 버튼
        document.getElementById('btn-undo')?.addEventListener('click', () => {
            this.handleUndo();
        });

        // 일시정지 버튼
        document.getElementById('btn-pause')?.addEventListener('click', () => {
            this.togglePause();
        });

        // 타일 랙 클릭
        document.getElementById('rack-tile')?.addEventListener('click', () => {
            this.handleDraw();
        });

        // 드래그 앤 드롭 설정
        this.setupDragAndDrop();
    }

    /**
     * 드래그 앤 드롭 설정
     */
    setupDragAndDrop() {
        const tableArea = document.getElementById('table-area');
        const tableTilesContainer = document.getElementById('table-tiles');
        
        if (tableArea) {
            tableArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                tableArea.classList.add('drop-zone');
            });

            tableArea.addEventListener('dragleave', (e) => {
                if (!tableArea.contains(e.relatedTarget)) {
                    tableArea.classList.remove('drop-zone');
                }
            });

            tableArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                tableArea.classList.remove('drop-zone');
                this.handleDrop(e);
            });
        }
        
        if (tableTilesContainer) {
            tableTilesContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            
            tableTilesContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleDrop(e);
            });
        }
    }

    /**
     * 핸드 렌더링
     */
    renderHand(sortedHand = null) {
        const handContainer = document.getElementById('hand-tiles');
        if (!handContainer) return;
        
        handContainer.innerHTML = '';
        
        // 정렬된 핸드가 제공되면 사용, 아니면 기본 핸드 사용
        const handToRender = sortedHand || this.game.playerHand;
        
        for (const tile of handToRender) {
            const tileElement = tile.render();
            tileElement.classList.add('in-hand');
            tileElement.draggable = true;
            tileElement.dataset.tileId = tile.id;
            
            // 드래그 이벤트
            tileElement.addEventListener('dragstart', (e) => {
                this.draggedTile = tile;
                this.dragTarget = { fromHand: true, tile: tile };
                tileElement.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
            });

            tileElement.addEventListener('dragend', () => {
                tileElement.classList.remove('dragging');
            });

            // 클릭으로 선택
            tileElement.addEventListener('click', () => {
                this.toggleTileSelection(tileElement, tile);
            });

            handContainer.appendChild(tileElement);
        }

        // 핸드 개수 업데이트
        const handCountEl = document.getElementById('hand-count');
        if (handCountEl) {
            handCountEl.textContent = this.game.playerHand.length;
        }
        
        // 타일 개수 업데이트
        this.updateTileCounts();
    }

    /**
     * 테이블 렌더링
     */
    renderTable() {
        const tableContainer = document.getElementById('table-tiles');
        if (!tableContainer) return;
        
        tableContainer.innerHTML = '';

        if (this.game.tableTiles.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = '타일을 여기에 드래그하여 배치하세요';
            tableContainer.appendChild(emptyMsg);
            return;
        }

        for (let i = 0; i < this.game.tableTiles.length; i++) {
            const group = this.game.tableTiles[i];
            const groupElement = document.createElement('div');
            groupElement.className = `tile-group ${group.valid ? 'valid' : 'invalid'} ${group.type ? `type-${group.type}` : ''}`;
            groupElement.dataset.groupIndex = i;
            groupElement.dataset.groupType = group.type || '';

            // 그룹 타입 레이블 추가
            if (group.valid && group.type) {
                const typeLabel = document.createElement('div');
                typeLabel.className = 'group-type-label';
                if (group.type === 'set') {
                    typeLabel.textContent = 'SET';
                    typeLabel.title = '세트: 같은 숫자, 다른 색상';
                } else if (group.type === 'run') {
                    typeLabel.textContent = 'RUN';
                    typeLabel.title = '런: 연속 숫자, 같은 색상';
                }
                groupElement.appendChild(typeLabel);
            }

            // 타일 컨테이너
            const tilesContainer = document.createElement('div');
            tilesContainer.className = 'tiles-container';

            for (let j = 0; j < group.tiles.length; j++) {
                const tile = group.tiles[j];
                const tileElement = tile.render();
                tileElement.classList.add('on-table');
                tileElement.draggable = true;
                tileElement.dataset.tileIndex = j;
                tileElement.dataset.groupIndex = i;

                // 드래그 이벤트
                tileElement.addEventListener('dragstart', (e) => {
                    this.draggedTile = tile;
                    this.dragTarget = { groupIndex: i, tileIndex: j, tile: tile };
                    tileElement.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });

                tileElement.addEventListener('dragend', () => {
                    tileElement.classList.remove('dragging');
                    this.draggedTile = null;
                    this.dragTarget = null;
                });

                // 클릭으로 선택
                tileElement.addEventListener('click', () => {
                    this.toggleTileSelection(tileElement, tile);
                });

                tilesContainer.appendChild(tileElement);
            }

            groupElement.appendChild(tilesContainer);
            tableContainer.appendChild(groupElement);
        }

        this.updatePlayButton();
    }

    /**
     * 타일 선택 토글
     */
    toggleTileSelection(tileElement, tile) {
        if (this.selectedTiles.has(tile.id)) {
            this.selectedTiles.delete(tile.id);
            tileElement.classList.remove('selected');
        } else {
            this.selectedTiles.add(tile.id);
            tileElement.classList.add('selected');
        }
    }

    /**
     * 드롭 처리
     */
    handleDrop(e) {
        if (!this.draggedTile) return;

        const dropTarget = e.target.closest('.tile-group');
        
        // 테이블에서 테이블로 이동 (매니풀레이션)
        if (this.dragTarget && this.dragTarget.groupIndex !== undefined && this.dragTarget.tileIndex !== undefined) {
            const sourceGroup = this.game.tableTiles[this.dragTarget.groupIndex];
            const sourceTileIndex = this.dragTarget.tileIndex;
            
            sourceGroup.tiles.splice(sourceTileIndex, 1);
            
            if (dropTarget) {
                const targetGroupIndex = parseInt(dropTarget.dataset.groupIndex);
                if (targetGroupIndex !== undefined) {
                    const targetGroup = this.game.tableTiles[targetGroupIndex];
                    if (targetGroup) {
                        targetGroup.tiles.push(this.draggedTile);
                    }
                }
            } else {
                this.game.tableTiles.push({
                    tiles: [this.draggedTile],
                    type: null,
                    valid: false
                });
            }
            
            this.game.tableTiles = this.game.tableTiles.filter(g => g.tiles.length > 0);
            this.game.validateTable();
            this.renderTable();
            this.updateScore();
            this.updatePlayButton(); // 되돌리기 버튼 상태도 업데이트
            this.showStatus('타일을 재배치했습니다.', 'info');
            return;
        }
        
        // 핸드에서 테이블로 이동
        const isFromHand = this.dragTarget?.fromHand || this.game.playerHand.some(t => t.id === this.draggedTile.id);
        
        if (isFromHand) {
            const tileIndex = this.game.playerHand.findIndex(t => t.id === this.draggedTile.id);
            if (tileIndex === -1) {
                this.draggedTile = null;
                this.dragTarget = null;
                return;
            }
            
            const tileToMove = this.draggedTile;
            this.game.playerHand = this.game.playerHand.filter(t => t.id !== tileToMove.id);
            
            if (dropTarget) {
                const groupIndex = parseInt(dropTarget.dataset.groupIndex);
                this.game.placeTileOnTable(tileToMove, groupIndex);
            } else {
                this.game.placeTileOnTable(tileToMove);
            }

            this.renderHand();
            this.renderTable();
            this.updateScore();
            this.updatePlayButton(); // 되돌리기 버튼 상태도 업데이트
            this.showStatus('타일을 테이블에 배치했습니다.', 'info');
        }
        
        this.draggedTile = null;
        this.dragTarget = null;
    }

    /**
     * 타일 뽑기 처리
     */
    handleDraw() {
        if (this.game.currentPlayer !== 1) {
            this.showStatus('AI의 턴입니다. 기다려주세요.', 'info');
            return;
        }

        if (this.game.turnState.hasDrawn) {
            this.showStatus('이미 타일을 뽑았습니다.', 'error');
            return;
        }

        if (this.game.tilePack.isEmpty()) {
            this.showStatus('더 이상 뽑을 타일이 없습니다.', 'error');
            return;
        }

        const tile = this.game.drawTile();
        if (tile) {
            // 애니메이션으로 타일 랙에서 핸드로 이동
            this.animateTileFromRack(tile, () => {
                this.renderHand();
                this.updateRackCount();
                this.updateTileCounts();
                this.showStatus('타일을 뽑았습니다. 턴이 넘어갑니다.', 'success');
                // 타일을 뽑으면 자동으로 턴 종료
                setTimeout(() => {
                    this.endTurn();
                }, 1000); // 1초 후 턴 종료
            });
        }
    }

    /**
     * 플레이 처리
     */
    handlePlay() {
        if (this.game.currentPlayer !== 1) {
            this.showStatus('AI의 턴입니다. 기다려주세요.', 'info');
            return;
        }

        // 먼저 테이블 검증
        this.game.validateTable();
        
        // 첫 플레이 검증을 먼저 수행 (조합 유효성 검사 전에)
        const currentPlayerFirstPlay = this.game.getCurrentPlayerFirstPlay();
        if (currentPlayerFirstPlay) {
            // 조커 사용 확인
            let hasJoker = false;
            for (const group of this.game.tableTiles) {
                if (group.tiles.some(t => t.isJoker)) {
                    hasJoker = true;
                    break;
                }
            }
            
            if (hasJoker) {
                this.showStatus('첫 플레이에서는 조커를 사용할 수 없습니다.', 'error');
                return;
            }
            
            // 조합 유효성 확인
            let hasValidGroup = false;
            for (const group of this.game.tableTiles) {
                if (group.tiles.length >= 3 && group.valid) {
                    hasValidGroup = true;
                    break;
                }
            }
            
            if (!hasValidGroup) {
                this.showStatus('유효한 조합이 아닙니다. 세트 또는 런을 만들어주세요.', 'error');
                return;
            }
            
            // 점수 계산 (조커 제외, 유효한 그룹만)
            const score = this.game.calculateTableScore(true);
            
            // 디버깅: 점수 정보 표시
            console.log('첫 플레이 점수 계산:', {
                score: score,
                groups: this.game.tableTiles.map(g => ({
                    valid: g.valid,
                    tileCount: g.tiles.length,
                    tiles: g.tiles.map(t => t.isJoker ? '조커' : `${t.color} ${t.number}`),
                    score: g.valid ? g.tiles.filter(t => !t.isJoker).reduce((sum, t) => sum + t.number, 0) : 0
                }))
            });
            
            if (score < 30) {
                this.showStatus(`첫 플레이는 조커 없이 30점 이상이어야 합니다. (현재: ${score}점)`, 'error');
                return;
            }
        }

        if (!this.game.canPlay()) {
            this.showStatus('유효한 조합이 아닙니다. 세트 또는 런을 만들어주세요.', 'error');
            return;
        }

        const success = this.game.play();
        if (success) {
            // 플레이 성공 시 tilesPlacedThisTurn이 비워지므로 
            // endTurn()에서 되돌릴 타일이 없음
            this.renderHand();
            this.renderTable();
            this.updateScore();
            this.updateTileCounts();
            this.updatePlayButton(); // 턴 넘기기 버튼 활성화
            this.showStatus('플레이 성공! 턴 넘기기 버튼을 눌러 턴을 종료하세요.', 'success');
            
            if (this.game.playerHand.length === 0) {
                this.showStatus('🎉 승리! 모든 타일을 사용했습니다!', 'success');
                setTimeout(() => {
                    this.endGame('player');
                }, 2000);
                return;
            }
            
            // 플레이 성공 후 자동으로 턴 종료하지 않음
            // 사용자가 턴 넘기기 버튼을 눌러야 함
        } else {
            // 플레이 실패 시 타일이 핸드로 되돌아갔으므로 UI 업데이트
            this.renderHand();
            this.renderTable();
            this.updateScore();
            this.updateTileCounts();
            this.showStatus('플레이할 수 없습니다. 조합이 유효하지 않아 타일을 핸드로 되돌렸습니다.', 'error');
        }
    }

    /**
     * 되돌리기 처리
     */
    handleUndo() {
        if (this.game.currentPlayer !== 1) {
            this.showStatus('AI의 턴입니다. 기다려주세요.', 'info');
            return;
        }

        if (this.isPaused) {
            this.showStatus('일시정지를 해제한 후 되돌릴 수 있습니다.', 'error');
            return;
        }

        // 타일을 뽑은 후에는 되돌리기 불가
        if (this.game.turnState.hasDrawn) {
            this.showStatus('타일을 뽑은 후에는 되돌릴 수 없습니다.', 'error');
            return;
        }

        // 이 턴에 배치한 타일 가져오기
        const tilesToReturn = this.game.getAllTilesPlacedThisTurn();
        
        if (tilesToReturn.length === 0) {
            this.showStatus('되돌릴 타일이 없습니다.', 'info');
            return;
        }

        // 타일을 핸드로 되돌리기
        this.game.returnTilesToHand(tilesToReturn);
        
        // UI 업데이트
        this.renderHand();
        this.renderTable();
        this.updateScore();
        this.updateTileCounts();
        this.updatePlayButton();
        
        this.showStatus(`${tilesToReturn.length}개의 타일을 핸드로 되돌렸습니다.`, 'success');
    }

    /**
     * 턴 넘기기 처리
     */
    handlePassTurn() {
        // 먼저 테이블 검증
        this.game.validateTable();
        
        // 공용 테이블에 유효한 조합이 있는지 확인
        if (!this.game.canPlay()) {
            this.showStatus('유효한 조합이 없으면 턴을 넘길 수 없습니다. 타일을 뽑아야 합니다.', 'error');
            return;
        }
        
        // 타일을 이미 뽑았으면 턴 종료
        if (this.game.turnState.hasDrawn) {
            this.endTurn();
            return;
        }
        
        // 유효한 조합이 있으면 턴 넘기기
        // 이 턴에 배치한 타일 중 유효한 타일은 그대로 두고, 유효하지 않은 타일만 되돌리기
        const tilesPlacedThisTurn = this.game.getAllTilesPlacedThisTurn();
        
        if (tilesPlacedThisTurn.length > 0) {
            // 유효하지 않은 그룹에 속한 타일들만 되돌리기
            const invalidGroups = this.game.tableTiles.filter(g => !g.valid || g.tiles.length < 3);
            const tilesToReturn = [];
            
            for (const group of invalidGroups) {
                for (const tile of group.tiles) {
                    // 이 턴에 배치한 타일만 되돌리기
                    if (this.game.turnState.tilesPlacedThisTurn.has(tile.id)) {
                        tilesToReturn.push(tile);
                    }
                }
            }
            
            if (tilesToReturn.length > 0) {
                // 유효하지 않은 타일들을 핸드로 되돌리기
                this.game.returnTilesToHand(tilesToReturn);
                
                // UI 업데이트
                this.renderHand();
                this.renderTable();
                this.updateScore();
                this.updateTileCounts();
                this.updatePlayButton();
                
                this.showStatus(`유효하지 않은 조합의 타일 ${tilesToReturn.length}개를 핸드로 되돌렸습니다.`, 'info');
            }
            
            // 유효한 그룹에 속한 이 턴에 배치한 타일들을 추적에서 제거 (플레이 성공으로 간주)
            const validGroups = this.game.tableTiles.filter(g => g.valid && g.tiles.length >= 3);
            for (const group of validGroups) {
                for (const tile of group.tiles) {
                    // 이 턴에 배치한 타일이고 유효한 그룹에 속하면 추적에서 제거
                    if (this.game.turnState.tilesPlacedThisTurn.has(tile.id)) {
                        this.game.turnState.tilesPlacedThisTurn.delete(tile.id);
                    }
                }
            }
        }
        
        // 턴 넘기기
        this.endTurn();
    }

    /**
     * 턴 종료
     */
    endTurn() {
        this.stopTurnTimer();
        
        // 플레이어 턴이 끝날 때 테이블에 남아있는 이 턴에 배치한 타일들을 되돌리기
        if (this.game.currentPlayer === 1) {
            this.returnUnfinishedTilesToHand();
        }
        
        // 다음 플레이어로 이동
        this.game.nextPlayer();
        this.updateCurrentPlayerDisplay();
        
        // 다음 플레이어가 AI면 AI 턴 처리
        if (this.game.aiEnabled && this.game.currentPlayer >= 2 && this.game.currentPlayer <= 4) {
            this.processAITurn();
        } else {
            // 플레이어 턴 시작
            this.game.turnState.hasDrawn = false;
            this.game.turnState.hasPlayed = false;
            this.startTurnTimer();
            this.updatePlayButton();
        }
    }

    /**
     * 완성되지 않은 조합의 타일들을 핸드로 되돌리기
     */
    returnUnfinishedTilesToHand() {
        // 이 턴에 배치한 타일들 가져오기
        const tilesPlacedThisTurn = this.game.getAllTilesPlacedThisTurn();
        
        if (tilesPlacedThisTurn.length === 0) {
            return; // 되돌릴 타일이 없음 (플레이 성공했거나 타일을 배치하지 않음)
        }

        // 플레이가 성공했는지 확인
        // 플레이 성공 시에는 tilesPlacedThisTurn이 비워지지만, 
        // 플레이하지 않았거나 실패한 경우 모든 이 턴에 배치한 타일을 되돌려야 함
        
        // 유효하지 않은 그룹에 속한 타일들 찾기
        const invalidGroups = this.game.tableTiles.filter(g => !g.valid || g.tiles.length < 3);
        
        const tilesToReturn = [];
        
        // 유효하지 않은 그룹의 타일들 추가
        for (const group of invalidGroups) {
            for (const tile of group.tiles) {
                // 이 턴에 배치한 타일만 되돌리기
                if (this.game.turnState.tilesPlacedThisTurn.has(tile.id)) {
                    tilesToReturn.push(tile);
                }
            }
        }
        
        // 플레이가 성공하지 않았다면 이 턴에 배치한 모든 타일을 되돌리기
        // 플레이 성공 시에는 tilesPlacedThisTurn이 비워지므로 
        // tilesPlacedThisTurn.length === 0이면 이미 return 했음
        // 따라서 여기 도달했다면 플레이가 성공하지 않았거나 
        // 완성되지 않은 조합이 남아있는 경우
        const returnedTileIds = new Set(tilesToReturn.map(t => t.id));
        for (const tile of tilesPlacedThisTurn) {
            if (!returnedTileIds.has(tile.id)) {
                // 유효한 그룹이지만 플레이가 성공하지 않았으므로 되돌리기
                tilesToReturn.push(tile);
            }
        }
        
        if (tilesToReturn.length > 0) {
            // 타일을 핸드로 되돌리기
            this.game.returnTilesToHand(tilesToReturn);
            
            // UI 업데이트
            this.renderHand();
            this.renderTable();
            this.updateScore();
            this.updateTileCounts();
            
            this.showStatus(`턴 종료: 완성되지 않은 조합의 타일 ${tilesToReturn.length}개를 핸드로 되돌렸습니다.`, 'info');
        }
    }

    /**
     * 턴 타이머 시작
     */
    startTurnTimer() {
        this.stopTurnTimer();
        this.turnTimeLeft = 30;
        this.updateTurnTimerDisplay();
        
        // 플레이어 턴일 때만 버튼 상태 업데이트
        if (this.game.currentPlayer === 1) {
            this.updatePlayButton();
        }
        
        this.turnTimer = setInterval(() => {
            // 일시정지 중이면 타이머 업데이트 안 함
            if (this.isPaused) {
                return;
            }
            
            this.turnTimeLeft--;
            this.updateTurnTimerDisplay();
            
            if (this.turnTimeLeft <= 0) {
                this.stopTurnTimer();
                if (!this.game.turnState.hasDrawn) {
                    this.showStatus('시간 초과! 자동으로 타일을 뽑습니다.', 'warning');
                    this.handleDraw();
                } else {
                    this.showStatus('시간 초과! 턴이 넘어갑니다.', 'warning');
                    this.endTurn();
                }
            }
        }, 1000);
    }

    /**
     * 턴 타이머 중지
     */
    stopTurnTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
    }

    /**
     * 턴 타이머 표시 업데이트
     */
    updateTurnTimerDisplay() {
        const timerElement = document.getElementById('turn-timer');
        const timerContainer = timerElement?.parentElement;
        
        if (timerElement) {
            timerElement.textContent = this.turnTimeLeft;
            
            if (timerContainer) {
                timerContainer.classList.remove('warning', 'danger');
                if (this.turnTimeLeft <= 10) {
                    timerContainer.classList.add('danger');
                } else if (this.turnTimeLeft <= 15) {
                    timerContainer.classList.add('warning');
                }
            }
        }
    }

    /**
     * AI 턴 처리
     */
    async processAITurn() {
        if (!this.game.aiEnabled || !this.game.aiPlayers || this.game.aiPlayers.length === 0) return;
        
        // 현재 플레이어가 AI인지 확인 (2-4번)
        if (this.game.currentPlayer < 2 || this.game.currentPlayer > 4) return;
        
        const aiIndex = this.game.currentPlayer - 2;
        const currentAI = this.game.aiPlayers[aiIndex];
        
        if (!currentAI) return;
        
        document.getElementById('btn-play').disabled = true;
        document.getElementById('btn-draw').disabled = true;
        this.stopTurnTimer();
        
        const result = await currentAI.processTurn(this.game, this);
        
        if (result.action === 'play') {
            // AI 플레이 후 점수 업데이트
            const tableScore = this.game.calculateTableScore();
            this.game.scores[this.game.currentPlayer] = tableScore;
            
            this.renderTable();
            this.updateScore();
            this.updateTileCounts();
            
            if (result.result.remainingTiles === 0) {
                const winnerId = `ai${aiIndex + 1}`;
                this.showStatus(`😢 ${currentAI.name}이(가) 승리했습니다!`, 'error');
                setTimeout(() => {
                    this.endGame(winnerId);
                }, 2000);
                return;
            }
        } else if (result.action === 'draw') {
            this.updateRackCount();
            this.updateTileCounts();
        }
        
        // 다음 플레이어로 이동
        this.game.nextPlayer();
        this.updateCurrentPlayerDisplay();
        this.game.turnState.hasDrawn = false;
        this.game.turnState.hasPlayed = false;
        
        // 다음 플레이어가 AI면 계속 처리, 플레이어면 타이머 시작
        if (this.game.currentPlayer >= 2 && this.game.currentPlayer <= 4) {
            // 다음 AI 턴 처리
            setTimeout(() => {
                this.processAITurn();
            }, 500);
        } else {
            // 플레이어 턴 시작
            this.startTurnTimer();
            this.updatePlayButton();
        }
    }

    /**
     * AI가 타일을 플레이하는 애니메이션
     */
    async animateAIPlay(bestPlay, game, aiPlayer) {
        const tilesToMove = bestPlay.tiles;
        const targetGroupIndex = bestPlay.addToGroup ? bestPlay.groupIndex : null;
        
        // 약간의 지연 후 애니메이션 시작
        await new Promise(r => setTimeout(r, 300));
        
        // 타일을 하나씩 애니메이션으로 이동
        // 타일 뒷면만 보여서 내용을 숨김
        const animationPromises = [];
        
        for (let i = 0; i < tilesToMove.length; i++) {
            const tile = tilesToMove[i];
            const promise = this.animateAITileToTable(tile, targetGroupIndex, i, tilesToMove.length);
            animationPromises.push(promise);
        }
        
        // 모든 애니메이션 완료 대기
        await Promise.all(animationPromises);
    }

    /**
     * AI 타일 뒷면 렌더링 (내용을 숨김)
     */
    renderAITileBack(tile) {
        const tileBack = document.createElement('div');
        tileBack.className = 'tile tile-back';
        tileBack.style.width = '56px';
        tileBack.style.height = '80px';
        tileBack.style.backgroundColor = '#34495e';
        tileBack.style.border = '2px solid #2c3e50';
        tileBack.style.borderRadius = '8px';
        tileBack.style.display = 'flex';
        tileBack.style.alignItems = 'center';
        tileBack.style.justifyContent = 'center';
        tileBack.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        tileBack.style.position = 'relative';
        tileBack.style.overflow = 'hidden';
        
        // 뒷면 패턴
        const pattern = document.createElement('div');
        pattern.style.width = '100%';
        pattern.style.height = '100%';
        pattern.style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)';
        tileBack.appendChild(pattern);
        
        return tileBack;
    }

    /**
     * AI 타일을 테이블로 이동하는 애니메이션
     */
    animateAITileToTable(tile, targetGroupIndex, index, totalTiles) {
        return new Promise((resolve) => {
            // 목표 위치 계산 (테이블)
            const tableContainer = document.getElementById('table-tiles');
            if (!tableContainer) {
                resolve();
                return;
            }
            
            let targetX, targetY;
            
            if (targetGroupIndex !== null && targetGroupIndex !== undefined) {
                // 기존 그룹에 추가하는 경우
                const groupElement = tableContainer.querySelectorAll('.tile-group')[targetGroupIndex];
                if (groupElement) {
                    const groupRect = groupElement.getBoundingClientRect();
                    const tilesContainer = groupElement.querySelector('.tiles-container');
                    if (tilesContainer) {
                        const existingTiles = tilesContainer.querySelectorAll('.tile');
                        const tileWidth = 56;
                        const tileGap = 10;
                        targetX = groupRect.left + tilesContainer.offsetLeft + (existingTiles.length * (tileWidth + tileGap)) + tileWidth / 2;
                        targetY = groupRect.top + tilesContainer.offsetTop + 40; // 타일 높이의 절반
                    } else {
                        targetX = groupRect.left + groupRect.width / 2;
                        targetY = groupRect.top + groupRect.height / 2;
                    }
                } else {
                    const tableRect = tableContainer.getBoundingClientRect();
                    targetX = tableRect.left + tableRect.width / 2;
                    targetY = tableRect.top + tableRect.height / 2;
                }
            } else {
                // 새 그룹 생성하는 경우
                const tableRect = tableContainer.getBoundingClientRect();
                const existingGroups = tableContainer.querySelectorAll('.tile-group');
                const groupWidth = 300;
                const groupGap = 20;
                targetX = tableRect.left + (existingGroups.length * (groupWidth + groupGap)) + 50 + (index * 66); // 타일 간격
                targetY = tableRect.top + 50;
            }
            
            // 화면 중앙에서 시작 (AI 타일을 보이지 않게)
            const startX = window.innerWidth / 2;
            const startY = window.innerHeight / 2;
            
            // 애니메이션용 타일 뒷면 요소 생성 (내용을 숨김)
            const animatedTile = this.renderAITileBack(tile);
            animatedTile.style.position = 'fixed';
            animatedTile.style.left = startX - 28 + 'px'; // 타일 너비의 절반
            animatedTile.style.top = startY - 40 + 'px'; // 타일 높이의 절반
            animatedTile.style.zIndex = '10000';
            animatedTile.style.pointerEvents = 'none';
            animatedTile.style.opacity = '0';
            animatedTile.style.transform = 'scale(0.5) rotate(-180deg)';
            document.body.appendChild(animatedTile);
            
            // 약간의 지연 후 애니메이션 시작 (타일을 순차적으로 이동)
            setTimeout(() => {
                // 페이드 인 및 회전
                animatedTile.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
                animatedTile.style.opacity = '1';
                animatedTile.style.transform = 'scale(1) rotate(0deg)';
                
                // 이동 애니메이션
                setTimeout(() => {
                    animatedTile.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    animatedTile.style.left = targetX + 'px';
                    animatedTile.style.top = targetY + 'px';
                    animatedTile.style.transform = 'scale(1.1)';
                    
                    // 애니메이션 완료 후 정리
                    setTimeout(() => {
                        animatedTile.style.transition = 'opacity 0.2s ease-out';
                        animatedTile.style.opacity = '0';
                        setTimeout(() => {
                            animatedTile.remove();
                            resolve();
                        }, 200);
                    }, 600);
                }, 200);
            }, index * 150); // 각 타일마다 150ms씩 지연
        });
    }

    /**
     * 현재 플레이어 표시 업데이트
     */
    updateCurrentPlayerDisplay() {
        const playerElement = document.getElementById('current-player');
        
        if (playerElement) {
            if (this.game.currentPlayer === 1) {
                playerElement.textContent = '나의';
            } else if (this.game.currentPlayer >= 2 && this.game.currentPlayer <= 4) {
                const aiIndex = this.game.currentPlayer - 2;
                if (this.game.aiPlayers && this.game.aiPlayers[aiIndex]) {
                    playerElement.textContent = this.game.aiPlayers[aiIndex].name;
                } else {
                    playerElement.textContent = `AI ${this.game.currentPlayer - 1}`;
                }
            }
        }
    }

    /**
     * 난이도 배지 업데이트
     */
    updateDifficultyBadge() {
        const difficultyBadge = document.getElementById('difficulty-badge');
        const currentDifficulty = document.getElementById('current-difficulty');
        
        if (difficultyBadge && currentDifficulty) {
            const difficultyNames = {
                easy: '🌱 쉬움',
                normal: '⭐ 보통',
                hard: '🔥 어려움',
                expert: '👑 전문가'
            };
            currentDifficulty.textContent = difficultyNames[this.game.difficulty] || '보통';
        }
    }

    /**
     * 새 게임 처리
     */
    handleNewGame() {
        if (confirm('새 게임을 시작하시겠습니까? 진행 중인 게임은 저장되지 않습니다.')) {
            this.game.newGame();
            this.selectedTiles.clear();
            this.renderHand();
            this.renderTable();
            this.updateRackCount();
            this.updateScore();
            this.updateTileCounts();
            this.showStatus('새 게임이 시작되었습니다!', 'success');
            this.startTurnTimer();
        }
    }

    /**
     * 게임 저장 처리
     */
    handleSaveGame() {
        if (window.gameStorage && window.gameStatistics) {
            const success = window.gameStorage.saveGame(this.game, this.game.difficulty);
            if (success) {
                this.showStatus('게임이 저장되었습니다!', 'success');
            } else {
                this.showStatus('게임 저장 실패', 'error');
            }
        }
    }

    /**
     * 게임 종료 처리
     */
    endGame(winner) {
        this.stopTurnTimer();
        
        const result = this.game.endGame(winner);
        
        if (window.gameStatistics) {
            window.gameStatistics.recordGame({
                won: result.won,
                score: result.playerScore,
                duration: result.duration,
                difficulty: result.difficulty
            });
        }
        
        // 게임 종료 모달 표시
        const gameOverModal = document.getElementById('game-over-modal');
        const gameOverTitle = document.getElementById('game-over-title');
        const gameOverMessage = document.getElementById('game-over-message');
        
        if (gameOverModal && gameOverTitle && gameOverMessage) {
            if (winner === 'player') {
                gameOverTitle.textContent = '🎉 승리!';
                gameOverMessage.innerHTML = `
                    <p>축하합니다! 모든 타일을 사용하여 승리했습니다!</p>
                    <p>점수: ${result.playerScore}점</p>
                    <p>게임 시간: ${Math.round(result.duration / 1000)}초</p>
                `;
            } else {
                const winnerName = result.winnerName || 'AI';
                gameOverTitle.textContent = `😢 ${winnerName} 승리`;
                gameOverMessage.innerHTML = `
                    <p>${winnerName}이(가) 먼저 모든 타일을 사용했습니다.</p>
                    <p>내 점수: ${result.playerScore}점</p>
                    <p>AI 1 점수: ${result.ai1Score || 0}점</p>
                    <p>AI 2 점수: ${result.ai2Score || 0}점</p>
                    <p>AI 3 점수: ${result.ai3Score || 0}점</p>
                    <p>게임 시간: ${Math.round(result.duration / 1000)}초</p>
                `;
            }
            
            gameOverModal.classList.remove('hidden');
        }
    }

    /**
     * 타일 랙 개수 업데이트
     */
    updateRackCount() {
        const rackCountEl = document.getElementById('rack-count');
        if (rackCountEl) {
            rackCountEl.textContent = this.game.tilePack.count();
        }
    }

    /**
     * 점수 업데이트
     */
    updateScore() {
        // 플레이어 점수
        const playerScoreEl = document.getElementById('player-score');
        if (playerScoreEl) {
            playerScoreEl.textContent = this.game.scores[1] || 0;
        }
        
        // AI 플레이어들 점수
        for (let i = 0; i < 3; i++) {
            const aiScoreEl = document.getElementById(`ai${i + 1}-score`);
            if (aiScoreEl) {
                aiScoreEl.textContent = this.game.scores[i + 2] || 0;
            }
        }
        
        // 타일 개수 업데이트
        this.updateTileCounts();
    }

    /**
     * 타일 개수 업데이트
     */
    updateTileCounts() {
        // 플레이어 타일 개수
        const playerTileCountEl = document.getElementById('player-tile-count');
        if (playerTileCountEl) {
            playerTileCountEl.textContent = `${this.game.playerHand.length}개`;
        }
        
        // AI 플레이어들 타일 개수
        if (this.game.aiPlayers && this.game.aiPlayers.length > 0) {
            for (let i = 0; i < 3; i++) {
                const aiTileCountEl = document.getElementById(`ai${i + 1}-tile-count`);
                if (aiTileCountEl && this.game.aiPlayers[i]) {
                    aiTileCountEl.textContent = `${this.game.aiPlayers[i].hand.length}개`;
                }
            }
        }
    }

    /**
     * 플레이 버튼 상태 업데이트
     */
    updatePlayButton() {
        const playBtn = document.getElementById('btn-play');
        const drawBtn = document.getElementById('btn-draw');
        const passBtn = document.getElementById('btn-pass-turn');
        const undoBtn = document.getElementById('btn-undo');
        
        if (!playBtn || !drawBtn || !passBtn || !undoBtn) return;
        
        // 타일을 뽑으면 더 이상 플레이할 수 없음
        if (this.game.turnState.hasDrawn) {
            drawBtn.disabled = true;
            playBtn.disabled = true;
            undoBtn.disabled = true; // 타일을 뽑은 후에는 되돌리기 불가
            // 타일을 뽑았으면 턴 넘기기 버튼 활성화
            if (this.game.currentPlayer === 1) {
                passBtn.disabled = false;
            }
            return;
        }
        
        const canPlay = this.game.canPlay();
        playBtn.disabled = !canPlay;
        drawBtn.disabled = false;
        
        // 턴 넘기기 버튼 상태 업데이트
        if (this.game.currentPlayer === 1) {
            // 공용 테이블에 유효한 조합이 있으면 턴 넘기기 버튼 활성화
            passBtn.disabled = !canPlay;
            
            // 되돌리기: 이 턴에 배치한 타일이 있고 플레이하지 않았을 때만 활성화
            const hasPlacedTiles = this.game.turnState.tilesPlacedThisTurn.size > 0;
            undoBtn.disabled = !hasPlacedTiles || this.game.turnState.hasPlayed;
        } else {
            passBtn.disabled = true;
            undoBtn.disabled = true;
        }
    }

    /**
     * 상태 메시지 표시
     */
    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `game-status ${type}`;
            
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'game-status';
            }, 3000);
        }
    }

    /**
     * 전체 UI 새로고침
     */
    refresh() {
        this.renderHand();
        this.renderTable();
        this.updateRackCount();
        this.updateScore();
        this.updatePlayButton();
        this.updateCurrentPlayerDisplay();
        this.updateDifficultyBadge();
        this.updateTileCounts();
    }

    /**
     * 랙에서 타일 뽑기 애니메이션
     */
    animateTileFromRack(tile, callback) {
        const rackTile = document.getElementById('rack-tile');
        const handContainer = document.getElementById('hand-tiles');
        
        if (!rackTile || !handContainer) {
            if (callback) callback();
            return;
        }

        // 랙 타일 펄스 애니메이션
        rackTile.classList.add('animating');
        setTimeout(() => {
            rackTile.classList.remove('animating');
        }, 300);

        // 타일 팩 개수 업데이트 (애니메이션 전에)
        this.updateRackCount();

        // 임시 타일 요소 생성 (애니메이션용)
        const tempTile = tile.render();
        tempTile.classList.add('in-hand', 'animate-from-rack');
        tempTile.style.position = 'fixed';
        tempTile.style.pointerEvents = 'none';
        tempTile.style.zIndex = '9999';
        tempTile.style.width = '56px';
        tempTile.style.height = '80px';
        
        // 랙 위치 계산
        const rackRect = rackTile.getBoundingClientRect();
        const handRect = handContainer.getBoundingClientRect();
        
        // 랙 중앙에서 시작
        const startX = rackRect.left + rackRect.width / 2;
        const startY = rackRect.top + rackRect.height / 2;
        
        // 핸드 영역의 끝 위치 계산 (현재 타일 개수 기반)
        const currentTiles = handContainer.querySelectorAll('.tile.in-hand');
        const tileWidth = 56;
        const tileGap = 10;
        const tilesInRow = Math.floor(handRect.width / (tileWidth + tileGap));
        const currentRow = Math.floor(currentTiles.length / tilesInRow);
        const currentCol = currentTiles.length % tilesInRow;
        
        const endX = handRect.left + (currentCol * (tileWidth + tileGap)) + tileWidth / 2;
        const endY = handRect.top + (currentRow * 90) + 40; // 타일 높이 + 간격
        
        // 시작 위치 설정
        tempTile.style.left = `${startX - 28}px`; // 타일 너비의 절반
        tempTile.style.top = `${startY - 40}px`; // 타일 높이의 절반
        tempTile.style.transform = 'scale(0.8) rotate(-10deg)';
        tempTile.style.opacity = '0';
        
        document.body.appendChild(tempTile);

        // 애니메이션 시작
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // 페이드 인 및 확대 (램 타일에서 나타남)
                tempTile.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                tempTile.style.opacity = '1';
                tempTile.style.transform = 'scale(1.2) rotate(0deg)';
                
                // 이동 애니메이션 (핸드로 이동)
                setTimeout(() => {
                    tempTile.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    tempTile.style.left = `${endX - 28}px`;
                    tempTile.style.top = `${endY - 40}px`;
                    tempTile.style.transform = 'scale(1) rotate(0deg)';
                    
                    // 애니메이션 완료 후 정리
                    setTimeout(() => {
                        // 페이드 아웃
                        tempTile.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
                        tempTile.style.opacity = '0';
                        tempTile.style.transform = 'scale(0.9)';
                        
                        setTimeout(() => {
                            tempTile.remove();
                            if (callback) callback();
                        }, 200);
                    }, 800);
                }, 300);
            });
        });
    }

    /**
     * 핸드에서 가능한 조합 찾기
     */
    findHandCombinations() {
        const combinations = [];
        const hand = this.game.playerHand;
        
        // 세트 찾기
        const numberGroups = {};
        for (const tile of hand) {
            if (tile.isJoker) continue;
            if (!numberGroups[tile.number]) {
                numberGroups[tile.number] = [];
            }
            numberGroups[tile.number].push(tile);
        }
        
        for (const number in numberGroups) {
            const tiles = numberGroups[number];
            const colors = new Set(tiles.map(t => t.color));
            const jokers = hand.filter(t => t.isJoker);
            
            if (colors.size + jokers.length >= 3) {
                const selectedTiles = [];
                const usedColors = new Set();
                
                for (const tile of tiles) {
                    if (!usedColors.has(tile.color)) {
                        selectedTiles.push(tile);
                        usedColors.add(tile.color);
                        if (selectedTiles.length >= 4) break;
                    }
                }
                
                const tilesNeeded = 3 - selectedTiles.length;
                for (let i = 0; i < Math.min(tilesNeeded, jokers.length); i++) {
                    if (jokers[i]) {
                        selectedTiles.push(jokers[i]);
                    }
                }
                
                if (selectedTiles.length >= 3) {
                    combinations.push({
                        type: 'set',
                        tiles: selectedTiles,
                        score: selectedTiles.reduce((sum, t) => sum + (t.isJoker ? 30 : t.number), 0)
                    });
                }
            }
        }
        
        // 런 찾기
        const colorGroups = { red: [], blue: [], black: [], yellow: [] };
        for (const tile of hand) {
            if (tile.isJoker) continue;
            if (colorGroups[tile.color]) {
                colorGroups[tile.color].push(tile);
            }
        }
        
        for (const color in colorGroups) {
            const tiles = colorGroups[color];
            if (tiles.length < 2) continue;
            
            tiles.sort((a, b) => a.number - b.number);
            const jokers = hand.filter(t => t.isJoker);
            
            for (let start = 0; start < tiles.length; start++) {
                const sequence = [tiles[start]];
                let currentNumber = tiles[start].number;
                let availableJokers = [...jokers];
                
                for (let i = start + 1; i < tiles.length; i++) {
                    const nextNumber = tiles[i].number;
                    const gap = nextNumber - currentNumber - 1;
                    
                    if (gap === 1) {
                        sequence.push(tiles[i]);
                        currentNumber = nextNumber;
                    } else if (gap > 1 && gap <= availableJokers.length) {
                        for (let j = 0; j < gap; j++) {
                            if (availableJokers.length > 0) {
                                sequence.push(availableJokers.shift());
                            }
                        }
                        sequence.push(tiles[i]);
                        currentNumber = nextNumber;
                    } else if (gap === 0) {
                        continue;
                    } else {
                        break;
                    }
                }
                
                if (sequence.length >= 3) {
                    combinations.push({
                        type: 'run',
                        tiles: [...sequence],
                        score: sequence.reduce((sum, t) => sum + (t.isJoker ? 30 : t.number), 0)
                    });
                }
            }
        }
        
        return combinations;
    }

    /**
     * 조합 확인 모달 표시
     */
    showCombinations() {
        // 일시정지 중이면 조합 확인 불가
        if (this.isPaused) {
            this.showStatus('일시정지를 해제한 후 조합을 확인할 수 있습니다.', 'error');
            return;
        }
        
        const combinations = this.findHandCombinations();
        const content = document.getElementById('combinations-content');
        const modal = document.getElementById('combinations-modal');
        
        if (!content || !modal) {
            console.error('조합 확인 모달 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 선택 초기화
        this.selectedCombinationIndex = null;
        
        if (combinations.length === 0) {
            content.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">가능한 조합이 없습니다.</p>';
            const applyBtn = document.getElementById('btn-apply-combination');
            if (applyBtn) {
                applyBtn.disabled = true;
            }
        } else {
            let html = '<div class="combinations-list">';
            
            // 첫 플레이인 경우 30점 이상 필터링
            const validCombinations = this.game.firstPlay 
                ? combinations.filter(c => {
                    const score = c.tiles.filter(t => !t.isJoker).reduce((sum, t) => sum + t.number, 0);
                    const hasJoker = c.tiles.some(t => t.isJoker);
                    return score >= 30 && !hasJoker;
                })
                : combinations;
            
            if (validCombinations.length === 0 && this.game.firstPlay) {
                html += '<p style="text-align: center; padding: 20px; color: #666;">첫 플레이는 30점 이상의 조합이 필요합니다 (조커 사용 불가).</p>';
                html += '<p style="text-align: center; padding: 10px; color: #999; font-size: 0.9rem;">전체 조합을 보시려면 아래를 확인하세요.</p>';
                
                // 첫 플레이 조건을 만족하지 않는 조합도 표시
                if (combinations.length > 0) {
                    html += '<h3 style="margin-top: 20px; font-size: 1rem; color: #666;">전체 조합 (첫 플레이 불가):</h3>';
                    combinations.forEach((combo, index) => {
                        html += `
                            <div class="combination-item invalid" data-index="${index}">
                                <div class="combination-header">
                                    <span class="combination-type ${combo.type === 'set' ? 'type-set' : 'type-run'}">
                                        ${combo.type === 'set' ? 'SET' : 'RUN'}
                                    </span>
                                    <span class="combination-score">${combo.score}점</span>
                                </div>
                                <div class="combination-tiles">
                                    ${combo.tiles.map(tile => {
                                        const tileElement = tile.render();
                                        tileElement.style.transform = 'scale(0.8)';
                                        tileElement.style.pointerEvents = 'none';
                                        return tileElement.outerHTML;
                                    }).join('')}
                                </div>
                                <p class="combination-warning">첫 플레이는 30점 이상 필요 (조커 불가)</p>
                            </div>
                        `;
                    });
                }
                
                const applyBtn = document.getElementById('btn-apply-combination');
                if (applyBtn) {
                    applyBtn.disabled = true;
                }
            } else {
                const displayCombinations = validCombinations.length > 0 ? validCombinations : combinations;
                
                displayCombinations.forEach((combo, index) => {
                    const isFirstPlayValid = this.game.firstPlay 
                        ? combo.tiles.filter(t => !t.isJoker).reduce((sum, t) => sum + t.number, 0) >= 30 && !combo.tiles.some(t => t.isJoker)
                        : true;
                    
                    html += `
                        <div class="combination-item ${isFirstPlayValid ? 'valid' : 'invalid'}" data-index="${index}">
                            <div class="combination-header">
                                <span class="combination-type ${combo.type === 'set' ? 'type-set' : 'type-run'}">
                                    ${combo.type === 'set' ? 'SET' : 'RUN'}
                                </span>
                                <span class="combination-score">${combo.score}점</span>
                            </div>
                            <div class="combination-tiles">
                                ${combo.tiles.map(tile => {
                                    const tileElement = tile.render();
                                    tileElement.style.transform = 'scale(0.8)';
                                    tileElement.style.pointerEvents = 'none';
                                    return tileElement.outerHTML;
                                }).join('')}
                            </div>
                            ${!isFirstPlayValid && this.game.firstPlay ? '<p class="combination-warning">첫 플레이는 30점 이상 필요 (조커 불가)</p>' : ''}
                        </div>
                    `;
                });
                
                const applyBtn = document.getElementById('btn-apply-combination');
                if (applyBtn) {
                    applyBtn.disabled = false;
                }
            }
            
            html += '</div>';
            content.innerHTML = html;
            
            // 조합 선택 이벤트
            setTimeout(() => {
                content.querySelectorAll('.combination-item').forEach(item => {
                    item.addEventListener('click', () => {
                        content.querySelectorAll('.combination-item').forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');
                        this.selectedCombinationIndex = parseInt(item.dataset.index);
                        const applyBtn = document.getElementById('btn-apply-combination');
                        if (applyBtn && !item.classList.contains('invalid')) {
                            applyBtn.disabled = false;
                        }
                    });
                });
            }, 100);
        }
        
        modal.classList.remove('hidden');
    }

    /**
     * 조합 확인 모달 숨기기
     */
    hideCombinations() {
        document.getElementById('combinations-modal')?.classList.add('hidden');
        this.selectedCombinationIndex = null;
    }

    /**
     * 선택한 조합 적용
     */
    applySelectedCombination() {
        if (this.selectedCombinationIndex === null || this.selectedCombinationIndex === undefined) {
            this.showStatus('조합을 선택해주세요.', 'error');
            return;
        }
        
        const combinations = this.findHandCombinations();
        const validCombinations = this.game.firstPlay 
            ? combinations.filter(c => {
                const score = c.tiles.filter(t => !t.isJoker).reduce((sum, t) => sum + t.number, 0);
                const hasJoker = c.tiles.some(t => t.isJoker);
                return score >= 30 && !hasJoker;
            })
            : combinations;
        
        const displayCombinations = validCombinations.length > 0 ? validCombinations : combinations;
        
        if (this.selectedCombinationIndex >= displayCombinations.length) {
            this.showStatus('선택한 조합을 찾을 수 없습니다.', 'error');
            return;
        }
        
        const combo = displayCombinations[this.selectedCombinationIndex];
        
        // 조합 타일 ID 저장 (중복 방지)
        const usedTileIds = new Set();
        const tilesToPlace = [];
        
        // 선택한 조합의 타일을 핸드에서 찾기
        for (const comboTile of combo.tiles) {
            let tileInHand = null;
            
            // 1. ID로 먼저 찾기
            if (comboTile.id) {
                tileInHand = this.game.playerHand.find(t => 
                    t.id === comboTile.id && !usedTileIds.has(t.id)
                );
            }
            
            // 2. ID로 찾지 못했으면 속성으로 찾기
            if (!tileInHand) {
                if (comboTile.isJoker) {
                    // 조커인 경우
                    tileInHand = this.game.playerHand.find(t => 
                        t.isJoker && !usedTileIds.has(t.id)
                    );
                } else {
                    // 일반 타일인 경우
                    tileInHand = this.game.playerHand.find(t => 
                        !t.isJoker && 
                        !usedTileIds.has(t.id) &&
                        t.number === comboTile.number && 
                        t.color === comboTile.color
                    );
                }
            }
            
            if (tileInHand) {
                usedTileIds.add(tileInHand.id);
                tilesToPlace.push(tileInHand);
            }
        }
        
        if (tilesToPlace.length === 0) {
            this.showStatus('조합 타일을 찾을 수 없습니다.', 'error');
            return;
        }
        
        // 타일을 테이블에 배치
        for (const tile of tilesToPlace) {
            this.game.placeTileOnTable(tile);
        }
        
        this.renderHand();
        this.renderTable();
        this.updateScore();
        this.updatePlayButton();
        this.hideCombinations();
        this.showStatus('조합이 테이블에 배치되었습니다.', 'success');
    }

    /**
     * RUN 조합에 맞게 핸드 정렬
     */
    sortHandByRun() {
        if (this.isPaused) {
            this.showStatus('일시정지를 해제한 후 정렬할 수 있습니다.', 'error');
            return;
        }
        
        const combinations = this.findHandCombinations();
        const runCombinations = combinations.filter(c => c.type === 'run');
        
        if (runCombinations.length === 0) {
            this.showStatus('RUN 조합이 없습니다.', 'info');
            // RUN 조합이 없어도 색상별로 정렬
            this.sortHandByColor();
            return;
        }
        
        // 가장 긴 RUN 조합 선택
        runCombinations.sort((a, b) => b.tiles.length - a.tiles.length);
        const bestRun = runCombinations[0];
        
        // RUN 조합에 포함된 타일 찾기
        const runTileIds = new Set();
        const runTiles = [];
        
        for (const runTile of bestRun.tiles) {
            const tileInHand = this.game.playerHand.find(h => {
                if (h.id === runTile.id) return true;
                if (runTile.isJoker && h.isJoker) return true;
                if (!h.isJoker && !runTile.isJoker && h.number === runTile.number && h.color === runTile.color) {
                    return true;
                }
                return false;
            });
            
            if (tileInHand && !runTileIds.has(tileInHand.id)) {
                runTileIds.add(tileInHand.id);
                runTiles.push(tileInHand);
            }
        }
        
        // 정렬된 핸드 생성
        const sortedHand = [...runTiles];
        
        // 나머지 타일 추가 (색상별, 숫자순)
        const remainingTiles = this.game.playerHand.filter(t => !runTileIds.has(t.id));
        const colorOrder = { red: 0, blue: 1, black: 2, yellow: 3 };
        remainingTiles.sort((a, b) => {
            if (a.isJoker && !b.isJoker) return 1;
            if (!a.isJoker && b.isJoker) return -1;
            if (a.isJoker && b.isJoker) return 0;
            
            const colorDiff = colorOrder[a.color] - colorOrder[b.color];
            if (colorDiff !== 0) return colorDiff;
            return a.number - b.number;
        });
        
        sortedHand.push(...remainingTiles);
        
        // 정렬된 핸드 렌더링
        this.renderHand(sortedHand);
        this.showStatus(`RUN 조합 (${runTiles.length}개)에 맞게 타일을 정렬했습니다.`, 'success');
    }

    /**
     * SET 조합에 맞게 핸드 정렬
     */
    sortHandBySet() {
        if (this.isPaused) {
            this.showStatus('일시정지를 해제한 후 정렬할 수 있습니다.', 'error');
            return;
        }
        
        const combinations = this.findHandCombinations();
        const setCombinations = combinations.filter(c => c.type === 'set');
        
        if (setCombinations.length === 0) {
            this.showStatus('SET 조합이 없습니다.', 'info');
            // SET 조합이 없어도 숫자별로 정렬
            this.sortHandByNumber();
            return;
        }
        
        // 가장 큰 SET 조합 선택
        setCombinations.sort((a, b) => b.score - a.score);
        const bestSet = setCombinations[0];
        
        // SET 조합에 포함된 타일 찾기
        const setTileIds = new Set();
        const setTiles = [];
        
        for (const setTile of bestSet.tiles) {
            const tileInHand = this.game.playerHand.find(h => {
                if (h.id === setTile.id) return true;
                if (setTile.isJoker && h.isJoker) return true;
                if (!h.isJoker && !setTile.isJoker && h.number === setTile.number && h.color === setTile.color) {
                    return true;
                }
                return false;
            });
            
            if (tileInHand && !setTileIds.has(tileInHand.id)) {
                setTileIds.add(tileInHand.id);
                setTiles.push(tileInHand);
            }
        }
        
        // 정렬된 핸드 생성
        const sortedHand = [...setTiles];
        
        // 나머지 타일 추가 (숫자별, 색상순)
        const remainingTiles = this.game.playerHand.filter(t => !setTileIds.has(t.id));
        const colorOrder = { red: 0, blue: 1, black: 2, yellow: 3 };
        remainingTiles.sort((a, b) => {
            if (a.isJoker && !b.isJoker) return 1;
            if (!a.isJoker && b.isJoker) return -1;
            if (a.isJoker && b.isJoker) return 0;
            
            const numberDiff = a.number - b.number;
            if (numberDiff !== 0) return numberDiff;
            return colorOrder[a.color] - colorOrder[b.color];
        });
        
        sortedHand.push(...remainingTiles);
        
        // 정렬된 핸드 렌더링
        this.renderHand(sortedHand);
        this.showStatus(`SET 조합 (${setTiles.length}개)에 맞게 타일을 정렬했습니다.`, 'success');
    }

    /**
     * 색상별 정렬 (RUN 정렬 대체)
     */
    sortHandByColor() {
        const sortedHand = [...this.game.playerHand];
        const colorOrder = { red: 0, blue: 1, black: 2, yellow: 3 };
        sortedHand.sort((a, b) => {
            if (a.isJoker && !b.isJoker) return 1;
            if (!a.isJoker && b.isJoker) return -1;
            if (a.isJoker && b.isJoker) return 0;
            
            const colorDiff = colorOrder[a.color] - colorOrder[b.color];
            if (colorDiff !== 0) return colorDiff;
            return a.number - b.number;
        });
        this.renderHand(sortedHand);
        this.showStatus('색상별로 타일을 정렬했습니다.', 'info');
    }

    /**
     * 숫자별 정렬 (SET 정렬 대체)
     */
    sortHandByNumber() {
        const sortedHand = [...this.game.playerHand];
        const colorOrder = { red: 0, blue: 1, black: 2, yellow: 3 };
        sortedHand.sort((a, b) => {
            if (a.isJoker && !b.isJoker) return 1;
            if (!a.isJoker && b.isJoker) return -1;
            if (a.isJoker && b.isJoker) return 0;
            
            const numberDiff = a.number - b.number;
            if (numberDiff !== 0) return numberDiff;
            return colorOrder[a.color] - colorOrder[b.color];
        });
        this.renderHand(sortedHand);
        this.showStatus('숫자별로 타일을 정렬했습니다.', 'info');
    }

    /**
     * 일시정지 토글
     */
    togglePause() {
        if (this.isPaused) {
            // 일시정지 해제
            this.isPaused = false;
            const pauseBtn = document.getElementById('btn-pause');
            if (pauseBtn) {
                pauseBtn.textContent = '일시정지';
                pauseBtn.classList.remove('paused');
            }
            
            // 타이머 재개
            if (this.pausedTimeLeft > 0) {
                this.turnTimeLeft = this.pausedTimeLeft;
                this.startTurnTimer();
            }
            
            // 버튼 활성화
            this.updatePlayButton();
            
            this.showStatus('게임이 재개되었습니다.', 'info');
        } else {
            // 일시정지
            this.isPaused = true;
            const pauseBtn = document.getElementById('btn-pause');
            if (pauseBtn) {
                pauseBtn.textContent = '재개';
                pauseBtn.classList.add('paused');
            }
            
            // 타이머 중지
            this.pausedTimeLeft = this.turnTimeLeft;
            this.stopTurnTimer();
            
            // 버튼 비활성화
            document.getElementById('btn-draw').disabled = true;
            document.getElementById('btn-play').disabled = true;
            document.getElementById('btn-undo').disabled = true;
            document.getElementById('btn-pass-turn').disabled = true;
            document.getElementById('btn-sort-run').disabled = true;
            document.getElementById('btn-sort-set').disabled = true;
            
            this.showStatus('게임이 일시정지되었습니다.', 'info');
        }
    }
}
