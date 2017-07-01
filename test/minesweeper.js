window.onload = function () {
    `use strict`;

    const {
        symbols: sym,
        utils: {
            css
        },
        box,
    } = window.boxjs;

    document.head.appendChild(box(css `
    body {
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 100vw;
        height: 100vh;
        font-family: monospace;
    }
    header {
        display: flex;
        justify-content: center;
        align-items: center;
        background: #888;
        transition: all 0.2s ease;
        box-shadow: inset 0 -40px 40px -40px;
        padding: 0 20px;
    }
    header:hover {
        box-shadow: inset 0 -20px 20px -20px;
    }
    h1 {
        color: white;
        margin: 20px 50px 20px 0;
        padding: 0;
    }
    .config {
        background: white;
        padding: 5px;
        display: flex;
        transition: all 0.2s ease;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.8), 0 10px 20px rgba(0, 0, 0, 0);
    }
    .config:hover {
        box-shadow: 0 5px 10px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(0, 0, 0, 0.2);
    }
    .config form {
        display: flex;
    }
    .config label {
        display: flex;
        flex-direction: column;
        font-size: 12px;
        color: #777;
        width: 10vw;
        min-width: 100px;
        padding: 0 2px;
        box-sizing: border-box;
    }
    .config label input {
        border: none;
        outline: none;
        transition: all 0.2s ease;
        box-shadow: 0 0.5px 0;
    }
    .config label input:hover {
        box-shadow: 0 1.5px 0;
    }
    .config label input:focus {
        box-shadow: 0 1.5px 0 red;
    }
    .config input[type="submit"] {
        margin-left: 2px;
        border: none;
        outline: none;
        background: #e33;
        color: black;
        cursor: pointer;
        box-shadow: inset 0 0 0 20px white;
        transition: all 0.2s ease;
    }
    .config input[type="submit"]:hover,
    .config input[type="submit"]:focus {
        color: white;
        box-shadow: inset 0 0 0 0 white;
    }
    .pad {
        flex: 1;
    }
    .scoreboard {
        display: flex;
        color: white;
        margin: 0 -5px;
    }
    .scoreboard div {
        display: flex;
        margin: 0 5px;
        flex-direction: column;
    }
    .scoreboard div::after {
        content: attr(data-text);
    }
    .container {
        position: relative;
        overflow: auto;
        flex: 1;
    }
    .map {
        display: grid;
        grid-gap: 2.5px;
        background: white;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        overflow: hidden;
    }
    .map .cell {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: 0.1s all ease;
        background: #eee;
        box-shadow: inset 0 0 0 12px rgba(204, 204, 204, 1), 0 0 0 0 rgba(255, 255, 255, 0);
        z-index: 0;
        user-select: none;
        -webkit-user-select: none;
        cursor: pointer;
    }
    .map .cell:hover {
        box-shadow: inset 0 0 0 12px rgba(204, 204, 204, 1), 0 0 0 24px rgba(255, 255, 255, 0.3);
        z-index: 1;
    }
    .map .cell.opened {
        box-shadow: inset 0 0 0 0 rgba(204, 204, 204, 0.8), 0 0 0 0 rgba(255, 255, 255, 0);
    }
    .map .cell.opened:hover {
        box-shadow: inset 0 0 0 0 rgba(204, 204, 204, 0.8), 0 0 0 24px rgba(255, 255, 255, 0.3);
    }
    .map .cell::before {
        content: attr(data-flag);
        color: red;
    }
    .map .cell.opened::before {
        content: attr(data-number);
        color: black;
    }
    .map .cell.mine {
        box-shadow: inset 0 0 0 0 rgba(204, 204, 204, 0), 0 0 0 0 rgba(255, 255, 255, 0);
        background: red;
        z-index: 1;
    }
    `));

    function mapGet(map, x, y, width, height) {
        if (y < 0 || x < 0 || x >= width || y >= height) return 0;
        return map[y * width + x];
    }

    function mapSet(map, x, y, px, py, width) {
        if (map[y * width + x] || (x === px && y === py)) return 0;
        return map[y * width + x] = 1;
    }

    function rand(num) {
        return (Math.random() * num) | 0;
    }

    const neighbors = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
    ];

    box({
        [sym.element]: document.body,
        [sym.context]: {
            data: [],
            src: [],
            state: {
                first: true,
                start: false,
                time: 0,
                remain: 0,
                opened: 0,
            },
            config: {
                width: 0,
                height: 0,
                mines: 0,
            }
        },
        [sym.methods]: {
            async open(pos, rec) {
                if (!this[sym.context].state.start) return;
                const {
                    width,
                    height,
                    mines
                } = this[sym.context].config;
                const x = pos % width;
                const y = pos / width | 0;
                if (this[sym.context].state.first) {
                    return this[sym.methods].create(x, y);
                }
                if (this[sym.context].data[pos].opened) {
                    if (rec) {
                        return;
                    }
                    const map = this[sym.context].data;
                    let count = neighbors.reduce((p, [px, py]) => {
                        const tx = x + px;
                        const ty = y + py;
                        if (ty < 0 ||
                            tx < 0 ||
                            ty >= height ||
                            tx >= width ||
                            map[ty * width + tx].opened)
                            return p;
                        if (map[ty * width + tx].flag === 2) return -18;
                        else if (map[ty * width + tx].flag === 1) return p + 1;
                        return p;
                    }, 0);
                    if (count === this[sym.context].data[pos].nums) {
                        neighbors.filter(([px, py]) => {
                            const tx = x + px;
                            const ty = y + py;
                            return !(ty < 0 ||
                                tx < 0 ||
                                ty >= height ||
                                tx >= width ||
                                map[ty * width + tx].opened ||
                                map[ty * width + tx].flag === 1);
                        }).forEach(([px, py]) => {
                            const tx = x + px;
                            const ty = y + py;
                            this[sym.methods].open(ty * width + tx, true);
                        });
                    } else if (count >= 0) {
                        let block = neighbors.reduce((p, [px, py]) => {
                            const tx = x + px;
                            const ty = y + py;
                            if (ty < 0 ||
                                tx < 0 ||
                                ty >= height ||
                                tx >= width ||
                                map[ty * width + tx].opened)
                                return p;
                            return p + 1;
                        }, 0);
                        if (block > this[sym.context].data[pos].nums) return;
                        neighbors.forEach(([px, py]) => {
                            const tx = x + px;
                            const ty = y + py;
                            if (ty < 0 ||
                                tx < 0 ||
                                ty >= height ||
                                tx >= width ||
                                map[ty * width + tx].opened ||
                                map[ty * width + tx].flag === 1)
                                return;
                            this[sym.methods].flag(ty * width + tx);
                        });
                    }
                    return;
                }
                if (this[sym.context].data[pos].flag !== 0) return;
                if (this[sym.context].data[pos].mine) {
                    this[sym.context].data = Array.from(this[sym.context].data,
                        (cell) => ({ ...cell,
                            opened: true
                        }));
                    return this[sym.context].state = { ...this[sym.context].state,
                        start: false
                    };
                }
                this[sym.context].data = Array.from(this[sym.context].data,
                    (cell, p) => p === (pos) ? { ...cell,
                        opened: true
                    } : cell);
                this[sym.context].state = {
                    ...this[sym.context].state,
                    opened: this[sym.context].state.opened + 1
                };
                if (this[sym.context].state.opened === width * height - mines) {
                    return this[sym.context].state = { ...this[sym.context].state,
                        start: false
                    };
                }
                const map = this[sym.context].data;
                neighbors.forEach(([px, py]) => {
                    const tx = x + px;
                    const ty = y + py;
                    if (ty < 0 ||
                        tx < 0 ||
                        ty >= height ||
                        tx >= width ||
                        map[ty * width + tx].opened ||
                        map[ty * width + tx].mine ||
                        (map[pos].nums !== 0 && map[ty * width + tx].nums !== 0))
                        return;
                    this[sym.methods].open(ty * width + tx, true);
                });
            },
            async flag(pos) {
                if (!this[sym.context].state.start) return;
                if (this[sym.context].state.first || this[sym.context].data[pos].opened) return;
                this[sym.context].data = this[sym.context].data.map(
                    (x, i) => {
                        if (i === pos) {
                            this[sym.context].state = {
                                ...this[sym.context].state,
                                remain: this[sym.context].state.remain + (3 - x.flag) % 3 - 1
                            };
                            return { ...x,
                                flag: (x.flag + 1) % 3
                            };
                        }
                        return x;
                    });
            },
            create(x, y) {
                const {
                    width,
                    height,
                    mines
                } = this[sym.context].config;
                let remain = mines;
                if (mines > width * height - 1 || mines < 3) return;
                const ret = Array.from(Array(height * width), () => 0);
                while (remain > 0) remain -= mapSet(ret, rand(width), rand(height), x, y, width);
                this[sym.context].src = ret;
                this[sym.context].state = {
                    first: false,
                    start: true,
                    time: 0,
                    remain: mines,
                    opened: 0,
                    tx: x,
                    ty: y
                };
                const interval = setInterval(() => {
                    const {
                        first,
                        start,
                        time
                    } = this[sym.context].state;
                    if (first || !start) return clearInterval(interval);
                    this[sym.context].state = {
                        ...this[sym.context].state,
                        time: time + 1
                    };
                }, 1000);
            },
            restart() {
                const {
                    width,
                    height,
                    mines
                } = this[sym.context].config;
                this[sym.context].data = Array.from(Array(width * height), () => ({
                    opened: false,
                    mine: false,
                    flag: 0,
                    nums: 0
                }));
                this[sym.context].state = {
                    first: true,
                    start: true,
                    time: 0,
                    remain: mines,
                    opened: 0,
                    tx: 0,
                    ty: 0
                };
            }
        },
        [sym.update](changed) {
            if (changed.has(`src`)) {
                const src = this[sym.context].src;
                const {
                    tx,
                    ty
                } = this[sym.context].state;
                const {
                    width,
                    height
                } = this[sym.context].config;
                const newData = src.map((cell, pos) => {
                    const x = pos % width;
                    const y = pos / width | 0;
                    return {
                        opened: false,
                        mine: !!cell,
                        flag: 0,
                        nums: [-1, 0, 1].reduce((sy, py) => sy + [-1, 0, 1].reduce((sx, px) => sx + (py || px ? mapGet(src, x + px, y + py, width, height) : 0), 0), 0)
                    };
                });
                return () => {
                    this[sym.context].data = newData;
                    this[sym.methods].open(ty * width + tx);
                };
            }
            return sym.broadcast;
        },
        [sym.components]: [{
            [sym.element]: `header`,
            [sym.components]: [{
                [sym.element]: `h1`,
                [sym.text]: `MineSweeper`
            }, {
                [sym.element]: `section`,
                [sym.classList]: [`config`],
                [sym.components]: [{
                    [sym.element]: `form`,
                    onsubmit(event) {
                        event.preventDefault();
                        this[sym.context].config = {
                            width: +this.width.value,
                            height: +this.height.value,
                            mines: +this.mines.value
                        };
                        this[sym.methods].restart();
                    },
                    [sym.components]: [{
                        [sym.element]: `label`,
                        [sym.text]: `width`,
                        [sym.components]: [{
                            [sym.element]: `input`,
                            type: `number`,
                            min: 3,
                            max: 100,
                            value: 10,
                            required: `true`,
                            name: `width`,
                            placeholder: `width`
                        }]
                    }, {
                        [sym.element]: `label`,
                        [sym.text]: `height`,
                        [sym.components]: [{
                            [sym.element]: `input`,
                            type: `number`,
                            min: 3,
                            max: 100,
                            value: 10,
                            required: `true`,
                            name: `height`,
                            placeholder: `height`
                        }]
                    }, {
                        [sym.element]: `label`,
                        [sym.text]: `mines`,
                        [sym.components]: [{
                            [sym.element]: `input`,
                            type: `number`,
                            min: 3,
                            max: 9999,
                            value: 20,
                            required: `true`,
                            name: `mines`,
                            placeholder: `mines`
                        }]
                    }, {
                        [sym.element]: `input`,
                        type: `submit`,
                        value: `Start!`,
                        autofocus: `true`,
                        ariaLabel: `start new game`
                    }]
                }]
            }, {
                [sym.classList]: [`pad`]
            }, {
                [sym.classList]: [`scoreboard`],
                [sym.components]: [{
                    [sym.element]: `div`,
                    [sym.text]: `TIME`,
                    dataText: `none`,
                    [sym.update](changed) {
                        if (changed.has(`state`)) {
                            this.setAttribute(`data-text`, this[sym.context].state.time);
                        }
                    }
                }, {
                    [sym.element]: `div`,
                    [sym.text]: `REMAIN`,
                    dataText: `none`,
                    [sym.update](changed) {
                        if (changed.has(`state`)) {
                            this.setAttribute(`data-text`, this[sym.context].state.remain);
                        }
                    }
                }]
            }]
        }, {
            [sym.element]: `article`,
            [sym.classList]: [`container`],
            [sym.components]: [{
                [sym.classList]: [`map`],
                [sym.fetch](changed) {
                    if (changed.has(`data`)) {
                        const {
                            width,
                            height
                        } = this[sym.context].config;
                        this.style.gridTemplateColumns = `20px `.repeat(width);
                        this.style.gridTemplateRows = `20px `.repeat(height);
                        return this[sym.context].data.map((cell, index) => ({
                            ...cell,
                            [sym.key]: index
                        }));
                    }
                    return sym.ignore;
                },
                oncontextmenu(event) {
                    event.preventDefault();
                },
                [sym.template]: {
                    [sym.classList]: [`cell`],
                    [sym.render]({
                        opened,
                        nums,
                        mine,
                        flag,
                        [sym.key]: pos
                    }) {
                        this._pos = pos;
                        if (opened) {
                            this.classList.toggle(`opened`, true);
                            if (nums > 0) this.setAttribute(`data-number`, nums + ``);
                            else this.setAttribute(`data-number`, ``);
                            this.classList.toggle(`mine`, mine);
                        } else {
                            this.classList.toggle(`opened`, false);
                            this.classList.toggle(`mine`, false);
                            this.setAttribute(`data-flag`, [``, `❗`, `❓`][flag]);
                        }
                        return sym.ignore;
                    },
                    onclick() {
                        this[sym.methods].open(this._pos);
                    },
                    oncontextmenu(event) {
                        event.preventDefault();
                        this[sym.methods].flag(this._pos);
                    }
                }
            }]
        }]
    });
};