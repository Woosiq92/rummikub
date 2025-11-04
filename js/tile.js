/**
 * 루미큐브 타일 클래스
 */
class Tile {
    constructor(number, color, isJoker = false) {
        this.number = number; // 1-13 또는 0 (조커)
        this.color = color; // 'red', 'blue', 'black', 'yellow'
        this.isJoker = isJoker;
        this.id = isJoker ? `joker-${Date.now()}-${Math.random()}` : `${color}-${number}-${Date.now()}-${Math.random()}`;
    }

    /**
     * 타일을 DOM 요소로 렌더링
     */
    render() {
        const tile = document.createElement('div');
        tile.className = `tile ${this.color} ${this.isJoker ? 'joker' : ''}`;
        tile.dataset.tileId = this.id;
        tile.dataset.number = this.number;
        tile.dataset.color = this.color;
        tile.dataset.isJoker = this.isJoker;

        if (this.isJoker) {
            tile.innerHTML = '<div class="tile-number">🃏</div>';
        } else {
            tile.innerHTML = `
                <div class="tile-number">${this.number}</div>
                <div class="tile-color-indicator" style="background: ${this.getColorValue()}"></div>
            `;
        }

        return tile;
    }

    /**
     * 색상 값을 반환
     */
    getColorValue() {
        const colors = {
            red: '#e74c3c',
            blue: '#3498db',
            black: '#2c3e50',
            yellow: '#f1c40f'
        };
        return colors[this.color] || '#000000';
    }

    /**
     * 타일 복사
     */
    clone() {
        return new Tile(this.number, this.color, this.isJoker);
    }

    /**
     * 타일 비교 (같은 타일인지)
     */
    equals(other) {
        if (!other) return false;
        return this.id === other.id ||
               (!this.isJoker && !other.isJoker && 
                this.number === other.number && 
                this.color === other.color);
    }
}

/**
 * 타일 팩 생성 (루미큐브 전체 타일)
 */
class TilePack {
    constructor() {
        this.tiles = [];
        this.createPack();
        this.shuffle();
    }

    /**
     * 타일 팩 생성
     * - 1-13 숫자 × 4색 × 2세트 = 104개
     * - 조커 2개
     */
    createPack() {
        const colors = ['red', 'blue', 'black', 'yellow'];
        
        // 일반 타일 2세트
        for (let set = 0; set < 2; set++) {
            for (let number = 1; number <= 13; number++) {
                for (const color of colors) {
                    this.tiles.push(new Tile(number, color));
                }
            }
        }
        
        // 조커 2개
        this.tiles.push(new Tile(0, 'red', true));
        this.tiles.push(new Tile(0, 'blue', true));
    }

    /**
     * 타일 섞기 (Fisher-Yates 알고리즘)
     */
    shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    /**
     * 타일 뽑기
     */
    draw() {
        return this.tiles.pop();
    }

    /**
     * 남은 타일 개수
     */
    count() {
        return this.tiles.length;
    }

    /**
     * 타일 팩이 비었는지 확인
     */
    isEmpty() {
        return this.tiles.length === 0;
    }

    /**
     * 직렬화 (저장용)
     */
    serialize() {
        return this.tiles.map(tile => ({
            number: tile.number,
            color: tile.color,
            isJoker: tile.isJoker,
            id: tile.id
        }));
    }

    /**
     * 역직렬화 (불러오기용)
     */
    static deserialize(data) {
        const pack = new TilePack();
        pack.tiles = data.map(tileData => {
            const tile = new Tile(tileData.number, tileData.color, tileData.isJoker);
            tile.id = tileData.id;
            return tile;
        });
        return pack;
    }
}
