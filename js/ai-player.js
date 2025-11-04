/**
 * AI 플레이어 클래스 (난이도별)
 */
class AIPlayer {
    constructor(name = '컴퓨터', difficulty = 'normal') {
        this.name = name;
        this.hand = [];
        this.firstPlay = true;
        this.score = 0;
        this.difficulty = difficulty;
        
        // 난이도별 설정
        this.config = {
            easy: {
                mistakeRate: 0.20, // 실수 확률 20%
                useTableTiles: false, // 테이블 타일 활용 안 함
                strategy: 'simple' // 단순 전략
            },
            normal: {
                mistakeRate: 0.10, // 실수 확률 10%
                useTableTiles: false, // 테이블 타일 활용 안 함
                strategy: 'optimal' // 최적 플레이
            },
            hard: {
                mistakeRate: 0.05, // 실수 확률 5%
                useTableTiles: true, // 테이블 타일 활용
                strategy: 'strategic' // 전략적 플레이
            },
            expert: {
                mistakeRate: 0.01, // 실수 확률 1%
                useTableTiles: true, // 테이블 타일 활용
                strategy: 'optimal' // 최적의 전략
            }
        };
        
        this.currentConfig = this.config[difficulty];
    }

    /**
     * AI 플레이어에게 타일 배포
     */
    receiveTiles(tiles) {
        this.hand = tiles;
        this.sortHand();
    }

    /**
     * 핸드 정렬
     */
    sortHand() {
        const colorOrder = { red: 0, blue: 1, black: 2, yellow: 3 };
        this.hand.sort((a, b) => {
            if (a.isJoker && !b.isJoker) return 1;
            if (!a.isJoker && b.isJoker) return -1;
            if (a.isJoker && b.isJoker) return 0;
            
            const colorDiff = colorOrder[a.color] - colorOrder[b.color];
            if (colorDiff !== 0) return colorDiff;
            return a.number - b.number;
        });
    }

    /**
     * 가능한 모든 조합 찾기
     */
    findPossibleCombinations(game) {
        const combinations = [];
        
        // 세트 찾기 (같은 숫자, 다른 색상)
        const sets = this.findSets();
        combinations.push(...sets);
        
        // 런 찾기 (연속 숫자, 같은 색상)
        const runs = this.findRuns();
        combinations.push(...runs);
        
        // 어려움 이상: 테이블 타일 활용
        if (this.currentConfig.useTableTiles && game.tableTiles) {
            const tableCombinations = this.findTableCombinations(game.tableTiles);
            combinations.push(...tableCombinations);
        }
        
        return combinations;
    }

    /**
     * 세트 찾기
     */
    findSets() {
        const sets = [];
        const numberGroups = {};
        const jokers = this.hand.filter(t => t.isJoker);
        
        // 숫자별로 그룹화
        for (const tile of this.hand) {
            if (tile.isJoker) continue;
            
            if (!numberGroups[tile.number]) {
                numberGroups[tile.number] = [];
            }
            numberGroups[tile.number].push(tile);
        }
        
        // 각 숫자 그룹에서 세트 찾기
        for (const number in numberGroups) {
            const tiles = numberGroups[number];
            const colors = new Set(tiles.map(t => t.color));
            
            // 같은 숫자, 다른 색상이 3개 이상이면 세트
            // 색상이 3개 이상이거나, 색상 + 조커가 3개 이상이면 가능
            const neededTiles = 3;
            const availableColors = colors.size;
            const availableJokersCount = jokers.length;
            
            if (availableColors + availableJokersCount >= neededTiles) {
                // 사용할 타일 선택 (색상이 중복되지 않도록)
                const selectedTiles = [];
                const usedColors = new Set();
                
                // 먼저 일반 타일 선택 (색상 중복 방지)
                for (const tile of tiles) {
                    if (!usedColors.has(tile.color)) {
                        selectedTiles.push(tile);
                        usedColors.add(tile.color);
                        if (selectedTiles.length >= 4) break; // 최대 4개
                    }
                }
                
                // 조커 추가 (필요한 만큼)
                const tilesNeeded = neededTiles - selectedTiles.length;
                for (let i = 0; i < Math.min(tilesNeeded, availableJokersCount); i++) {
                    if (jokers[i]) {
                        selectedTiles.push(jokers[i]);
                    }
                }
                
                // 최소 3개 이상이면 세트
                if (selectedTiles.length >= 3) {
                    sets.push({
                        type: 'set',
                        tiles: selectedTiles,
                        score: selectedTiles.reduce((sum, t) => sum + (t.isJoker ? 30 : t.number), 0)
                    });
                }
            }
        }
        
        return sets;
    }

    /**
     * 런 찾기
     */
    findRuns() {
        const runs = [];
        const colorGroups = { red: [], blue: [], black: [], yellow: [] };
        
        // 색상별로 그룹화
        for (const tile of this.hand) {
            if (tile.isJoker) continue;
            if (colorGroups[tile.color]) {
                colorGroups[tile.color].push(tile);
            }
        }
        
        // 각 색상별로 런 찾기
        for (const color in colorGroups) {
            const tiles = colorGroups[color];
            if (tiles.length < 2) continue;
            
            // 숫자별로 정렬
            tiles.sort((a, b) => a.number - b.number);
            
            // 연속된 숫자 찾기
            const sequences = this.findSequences(tiles);
            runs.push(...sequences);
        }
        
        return runs;
    }

    /**
     * 연속된 숫자 시퀀스 찾기
     */
    findSequences(tiles) {
        const sequences = [];
        const jokers = this.hand.filter(t => t.isJoker);
        
        if (tiles.length < 2 && jokers.length === 0) return sequences;
        
        // 숫자 정렬
        const sortedTiles = [...tiles].sort((a, b) => a.number - b.number);
        
        // 가능한 모든 연속 시퀀스 찾기
        for (let start = 0; start < sortedTiles.length; start++) {
            const sequence = [sortedTiles[start]];
            let currentNumber = sortedTiles[start].number;
            let availableJokers = [...jokers];
            
            // 다음 타일들을 확인하면서 시퀀스 확장
            for (let i = start + 1; i < sortedTiles.length; i++) {
                const nextNumber = sortedTiles[i].number;
                const gap = nextNumber - currentNumber - 1;
                
                if (gap === 1) {
                    // 바로 연속
                    sequence.push(sortedTiles[i]);
                    currentNumber = nextNumber;
                } else if (gap > 1 && gap <= availableJokers.length) {
                    // 조커로 채울 수 있음
                    // 조커를 사용하여 간격 채우기
                    for (let j = 0; j < gap; j++) {
                        if (availableJokers.length > 0) {
                            sequence.push(availableJokers.shift());
                        }
                    }
                    sequence.push(sortedTiles[i]);
                    currentNumber = nextNumber;
                } else if (gap === 0) {
                    // 같은 숫자 (런에 포함 불가)
                    continue;
                } else {
                    // 간격이 너무 큼 - 현재 시퀀스 저장 후 다음 시작점으로
                    break;
                }
            }
            
            // 조커로 시작하거나 끝에 조커를 추가할 수 있는 경우도 고려
            // 최소 3개 이상이면 런
            if (sequence.length >= 3) {
                // 시퀀스 복사하여 추가 (중복 방지)
                const sequenceCopy = [...sequence];
                sequences.push({
                    type: 'run',
                    tiles: sequenceCopy,
                    score: sequenceCopy.reduce((sum, t) => sum + (t.isJoker ? 30 : t.number), 0)
                });
            }
        }
        
        // 타일이 2개 이하지만 조커가 있어서 런을 만들 수 있는 경우
        if (sortedTiles.length >= 2 && jokers.length >= 1) {
            const firstTile = sortedTiles[0];
            const lastTile = sortedTiles[sortedTiles.length - 1];
            const gap = lastTile.number - firstTile.number - 1;
            
            if (gap >= 0 && gap <= jokers.length && sortedTiles.length + jokers.length >= 3) {
                const sequence = [firstTile];
                for (let i = 0; i < gap; i++) {
                    if (jokers[i]) {
                        sequence.push(jokers[i]);
                    }
                }
                if (lastTile !== firstTile) {
                    sequence.push(lastTile);
                }
                
                if (sequence.length >= 3) {
                    sequences.push({
                        type: 'run',
                        tiles: sequence,
                        score: sequence.reduce((sum, t) => sum + (t.isJoker ? 30 : t.number), 0)
                    });
                }
            }
        }
        
        return sequences;
    }

    /**
     * 테이블 타일 활용 조합 찾기 (어려움 이상)
     */
    findTableCombinations(tableTiles) {
        const combinations = [];
        
        // 테이블의 기존 조합에 타일 추가 가능한 경우 찾기
        for (const group of tableTiles) {
            if (!group.valid) continue;
            
            // 각 타일을 테이블 그룹에 추가할 수 있는지 확인
            for (const tile of this.hand) {
                if (tile.isJoker) continue;
                
                // 세트에 추가 가능한지 확인
                if (group.type === 'set') {
                    const groupNumbers = new Set(group.tiles.filter(t => !t.isJoker).map(t => t.number));
                    if (groupNumbers.has(tile.number)) {
                        // 같은 숫자이지만 다른 색상인지 확인
                        const groupColors = new Set(group.tiles.filter(t => !t.isJoker).map(t => t.color));
                        if (!groupColors.has(tile.color)) {
                            combinations.push({
                                type: 'set',
                                tiles: [tile],
                                score: tile.number,
                                addToGroup: true,
                                groupIndex: tableTiles.indexOf(group)
                            });
                        }
                    }
                }
                
                // 런에 추가 가능한지 확인
                if (group.type === 'run') {
                    const groupColor = group.tiles.find(t => !t.isJoker)?.color;
                    if (groupColor === tile.color) {
                        const groupNumbers = group.tiles.filter(t => !t.isJoker).map(t => t.number).sort((a, b) => a - b);
                        const minNumber = Math.min(...groupNumbers);
                        const maxNumber = Math.max(...groupNumbers);
                        
                        // 앞이나 뒤에 추가 가능한지 확인
                        if (tile.number === minNumber - 1 || tile.number === maxNumber + 1) {
                            combinations.push({
                                type: 'run',
                                tiles: [tile],
                                score: tile.number,
                                addToGroup: true,
                                groupIndex: tableTiles.indexOf(group)
                            });
                        }
                    }
                }
            }
        }
        
        return combinations;
    }

    /**
     * 최적의 플레이 선택 (난이도별)
     */
    chooseBestPlay(game) {
        // 실수 체크
        if (Math.random() < this.currentConfig.mistakeRate) {
            // 실수: 랜덤하게 플레이하거나 플레이하지 않음
            if (Math.random() < 0.5) {
                return null; // 플레이하지 않음
            }
        }
        
        const combinations = this.findPossibleCombinations(game);
        
        if (combinations.length === 0) {
            return null;
        }
        
        // 첫 플레이인 경우 30점 이상 찾기 (조커 없이)
        if (this.firstPlay) {
            const validPlays = combinations.filter(c => {
                // 조커가 있으면 제외
                if (c.tiles.some(t => t.isJoker)) {
                    return false;
                }
                // 조커 없이 점수 계산
                const score = c.tiles.reduce((sum, t) => sum + t.number, 0);
                return score >= 30;
            });
            
            if (validPlays.length > 0) {
                // 난이도별 선택 방식
                if (this.difficulty === 'easy') {
                    // 쉬움: 랜덤 선택
                    return validPlays[Math.floor(Math.random() * validPlays.length)];
                } else {
                    // 보통 이상: 가장 높은 점수 선택
                    validPlays.sort((a, b) => b.score - a.score);
                    return validPlays[0];
                }
            }
            
            return null;
        }
        
        // 첫 플레이가 아니면 난이도별 전략
        if (this.difficulty === 'easy') {
            // 쉬움: 랜덤 선택
            return combinations[Math.floor(Math.random() * combinations.length)];
        } else if (this.difficulty === 'normal') {
            // 보통: 가장 높은 점수 선택
            combinations.sort((a, b) => b.score - a.score);
            return combinations[0];
        } else if (this.difficulty === 'hard' || this.difficulty === 'expert') {
            // 어려움/전문가: 전략적 선택
            // 1. 핸드를 최대한 줄이는 조합 우선
            // 2. 점수가 높은 조합 우선
            combinations.sort((a, b) => {
                const aTiles = a.tiles.length;
                const bTiles = b.tiles.length;
                if (aTiles !== bTiles) {
                    return bTiles - aTiles; // 더 많은 타일 사용 우선
                }
                return b.score - a.score; // 점수 우선
            });
            return combinations[0];
        }
        
        return combinations[0];
    }

    /**
     * AI 플레이 (타일 배치)
     */
    play(game) {
        const bestPlay = this.chooseBestPlay(game);
        
        if (!bestPlay) {
            return null; // 플레이할 수 없음
        }
        
        // 게임 검증 로직 사용
        const tempGroup = {
            tiles: bestPlay.tiles,
            type: bestPlay.type,
            valid: false
        };
        
        // 게임의 검증 로직 사용
        const tempTable = [tempGroup];
        const originalTable = game.tableTiles;
        game.tableTiles = tempTable;
        game.validateTable();
        
        if (!tempGroup.valid) {
            game.tableTiles = originalTable;
            return null; // 유효하지 않은 조합
        }
        
        game.tableTiles = originalTable;
        
        // 테이블 그룹에 추가하는 경우
        if (bestPlay.addToGroup && bestPlay.groupIndex !== undefined) {
            const group = game.tableTiles[bestPlay.groupIndex];
            if (group && group.valid) {
                // 그룹에 타일 추가
                for (const tile of bestPlay.tiles) {
                    group.tiles.push(tile);
                }
                game.validateTable();
                
                // 핸드에서 타일 제거
                const playedTileIds = new Set(bestPlay.tiles.map(t => t.id));
                this.hand = this.hand.filter(t => !playedTileIds.has(t.id));
                
                // 점수 계산
                const score = bestPlay.tiles.reduce((sum, t) => {
                    return sum + (t.isJoker ? 30 : t.number);
                }, 0);
                
                this.score += score;
                this.firstPlay = false;
                
                return {
                    group: group,
                    score: score,
                    remainingTiles: this.hand.length,
                    addedToGroup: true
                };
            }
        }
        
        // 새 그룹 생성
        const group = {
            tiles: bestPlay.tiles,
            type: bestPlay.type,
            valid: true
        };
        
        game.tableTiles.push(group);
        game.validateTable();
        
        // 핸드에서 타일 제거
        const playedTileIds = new Set(bestPlay.tiles.map(t => t.id));
        this.hand = this.hand.filter(t => !playedTileIds.has(t.id));
        
        // 점수 계산
        const score = bestPlay.tiles.reduce((sum, t) => {
            return sum + (t.isJoker ? 30 : t.number);
        }, 0);
        
        this.score += score;
        this.firstPlay = false;
        
        return {
            group: group,
            score: score,
            remainingTiles: this.hand.length
        };
    }

    /**
     * 타일 뽑기 (AI는 랜덤하게 뽑기)
     */
    drawTile(tilePack) {
        if (tilePack.isEmpty()) {
            return null;
        }
        
        const tile = tilePack.draw();
        this.hand.push(tile);
        this.sortHand();
        return tile;
    }

    /**
     * AI 턴 처리
     */
    async processTurn(game, ui, delay = 2000) {
        return new Promise((resolve) => {
            setTimeout(async () => {
                // 먼저 플레이할 수 있는지 확인
                const bestPlay = this.chooseBestPlay(game);
                
                if (bestPlay) {
                    // 플레이할 조합이 있으면 애니메이션으로 타일 이동
                    await ui.animateAIPlay(bestPlay, game, this);
                    
                    // 실제로 타일 배치
                    const playResult = this.play(game);
                    
                    if (playResult) {
                        // 플레이 성공
                        ui.renderTable();
                        ui.updateScore();
                        ui.updateTileCounts();
                        ui.showStatus(`${this.name}이(가) ${playResult.score}점을 플레이했습니다! (남은 타일: ${playResult.remainingTiles}개)`, 'info');
                        
                        // 약간의 지연 후 다음 액션
                        await new Promise(r => setTimeout(r, 500));
                        resolve({ action: 'play', result: playResult });
                    } else {
                        resolve({ action: 'pass' });
                    }
                } else {
                    // 타일 뽑기
                    const tile = this.drawTile(game.tilePack);
                    if (tile) {
                        ui.updateRackCount();
                        ui.updateTileCounts();
                        ui.showStatus(`${this.name}이(가) 타일을 뽑았습니다.`, 'info');
                        resolve({ action: 'draw', tile: tile });
                    } else {
                        ui.showStatus(`${this.name}이(가) 타일을 뽑을 수 없습니다.`, 'info');
                        resolve({ action: 'pass' });
                    }
                }
            }, delay);
        });
    }
}
