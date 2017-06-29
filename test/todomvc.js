window.onload = function () {
    `use strict`;

    const {
        symbols: sym,
        utils: {
            css,
            genID
        },
        box,
    } = window.boxjs;

    const elKey = Symbol(`elKey`);

    function getMode() {
        const hash = location.hash;
        const ret = ({
            [`#/all`]: 0,
            [`#/active`]: 1,
            [`#/completed`]: 2
        })[hash];
        if (typeof ret === `number`) return ret;
        location.hash = `#\all`;
        return 0;
    }

    const filters = [
        () => true,
        ({
            completed
        }) => !completed,
        ({
            completed
        }) => completed
    ];

    box({
        [sym.element]: document.body,
        [sym.shadows]: [{
            [sym.context]: {
                list: [],
                mode: getMode()
            },
            [sym.methods]: {
                addTodo(title) {
                    this[sym.context].list = [...this[sym.context].list, {
                        title,
                        completed: false,
                        [sym.key]: genID()
                    }];
                },
                getFiltered() {
                    return this[sym.context].list.filter(filters[this[sym.context].mode]);
                },

                setItem(key, obj) {
                    this[sym.context].list = this[sym.context].list.map(x => x[sym.key] === key ? { ...x,
                        ...obj
                    } : x);
                },

                removeItem(key) {
                    this[sym.context].list = this[sym.context].list.filter(x => x[sym.key] !== key);
                }
            },
            [sym.init]() {
                window.onhashchange = () => {
                    this[sym.context].mode = getMode();
                };
            },
            [sym.components]: [css `
            @import url(todomvc.css)
            `, {
                [sym.element]: `header`,
                [sym.classList]: [`todoapp`],
                [sym.components]: [{
                    [sym.element]: `header`,
                    [sym.classList]: [`header`],
                    [sym.components]: [{
                        [sym.element]: `h1`,
                        [sym.text]: `todos`
                    }, {
                        [sym.element]: `input`,
                        [sym.classList]: [`new-todo`],
                        autofocus: ``,
                        placeholder: `What needs to be done?`,
                        onkeypress(event) {
                            if (event.keyCode === 13 && this.value.length > 0) {
                                event.preventDefault();
                                this[sym.methods].addTodo(this.value);
                                this.value = ``;
                            }
                        }
                    }]
                }, {
                    [sym.element]: `section`,
                    [sym.classList]: [`main`],
                    [sym.init]() {
                        this[sym.update]();
                    },
                    [sym.update]() {
                        const filtered = this[sym.methods].getFiltered();
                        this.classList.toggle(`hidden`, filtered.length == 0);
                        return true;
                    },
                    [sym.components]: [{
                        [sym.element]: `input`,
                        [sym.classList]: [`toggle-all`],
                        [sym.update]() {
                            this.checked = !this[sym.context].list.find(p => !p.completed);
                        },
                        type: `checkbox`,
                        onchange() {
                            this[sym.context].list = this[sym.context].list.map(p => ({ ...p,
                                completed: this.checked
                            }));
                        }
                    }, {
                        [sym.element]: `ul`,
                        [sym.classList]: [`todo-list`],
                        [sym.fetch]() {
                            return this[sym.methods].getFiltered();
                        },
                        [sym.template]: {
                            [sym.element]: `li`,
                            [sym.classList]: [`todo`],
                            [sym.render](node) {
                                this.classList.toggle(`completed`, node.completed);
                                return true;
                            },
                            [sym.components]: [{
                                [sym.classList]: [`view`],
                                [sym.components]: [{
                                    [sym.element]: `input`,
                                    [sym.classList]: [`toggle`],
                                    onchange() {
                                        this[sym.methods].setItem(this[elKey], {
                                            completed: this.checked
                                        });
                                    },
                                    [sym.render]({
                                        completed,
                                        [sym.key]: key
                                    }) {
                                        this[elKey] = key;
                                        this.checked = completed;
                                    },
                                    type: `checkbox`
                                }, {
                                    [sym.element]: `label`,
                                    ondblclick() {
                                        this.parentNode.parentNode.classList.toggle(`editing`, true);
                                        this.parentNode.parentNode.querySelector(`input.edit`).focus();
                                    },
                                    [sym.render]({
                                        title,
                                        [sym.key]: key
                                    }) {
                                        this[sym.components] = [{
                                            [sym.element]: sym.text,
                                            [sym.value]: title
                                        }];
                                        this[elKey] = key;
                                    }
                                }, {
                                    [sym.element]: `button`,
                                    [sym.classList]: [`destroy`],
                                    [sym.render]({
                                        [sym.key]: key
                                    }) {
                                        this[elKey] = key;
                                    },
                                    onclick(event) {
                                        event.preventDefault();
                                        this[sym.methods].removeItem(this[elKey]);
                                    }
                                }]
                            }, {
                                [sym.element]: `input`,
                                [sym.classList]: [`edit`],
                                [sym.render]({
                                    title,
                                    [sym.key]: key
                                }) {
                                    this.value = title;
                                    this[elKey] = key;
                                },
                                type: `text`,
                                onblur() {
                                    this.parentNode.classList.toggle(`editing`, false);
                                    if (this.value === ``) return;
                                    this[sym.methods].setItem(this[elKey], {
                                        title: this.value
                                    });
                                },
                                onkeypress() {
                                    if (event.keyCode === 13) {
                                        this.blur();
                                    }
                                }
                            }]
                        }
                    }]
                }, {
                    [sym.element]: `footer`,
                    [sym.classList]: [`footer`],
                    [sym.init]() {
                        this[sym.update]();
                    },
                    [sym.update]() {
                        this.classList.toggle(`hidden`, this[sym.context].list.length == 0);
                        return true;
                    },
                    [sym.components]: [{
                        [sym.element]: `span`,
                        [sym.classList]: [`todo-count`],
                        [sym.components]: [{
                            [sym.element]: `strong`,
                            [sym.update]() {
                                const uncompleted = this[sym.context].list.reduce((p, c) => p + (c.completed ? 0 : 1), 0);
                                this[sym.components] = [{
                                    [sym.element]: sym.text,
                                    [sym.value]: `${uncompleted}`
                                }];
                            }
                        }, {
                            [sym.element]: sym.text,
                            [sym.value]: ` items left`
                        }]
                    }, {
                        [sym.element]: `ul`,
                        [sym.classList]: [`filters`],
                        [sym.components]: [`all`, `active`, `completed`].map((name, index) => ({
                            [sym.element]: `li`,
                            [sym.components]: [{
                                [sym.element]: `a`,
                                [sym.style]: {
                                    textTransform: `capitalize`
                                },
                                [sym.update]() {
                                    this.classList.toggle(`selected`, index == this[sym.context].mode);
                                },
                                href: `#/${name}`,
                                [sym.text]: `${name}\u200B`
                            }]
                        }))
                    }, {
                        [sym.element]: `button`,
                        [sym.classList]: [`clear-completed`],
                        [sym.update]() {
                            const uncompleted = this[sym.context].list.reduce((p, c) => p + (c.completed ? 1 : 0), 0);
                            this.classList.toggle(`hidden`, uncompleted == 0);
                            return true;
                        },
                        [sym.text]: `Clear completed`,
                        onclick() {
                            this[sym.context].list = this[sym.context].list.filter(filters[1]);
                        }
                    }]
                }]
            }, {
                [sym.element]: `footer`,
                [sym.classList]: [`info`],
                [sym.components]: [{
                    [sym.element]: `p`,
                    [sym.text]: `Double-click to edit a todo`
                }, {
                    [sym.element]: `p`,
                    [sym.text]: `Written by `,
                    [sym.components]: [{
                        [sym.element]: `a`,
                        [sym.text]: `CodeHz`,
                        href: `https://github/CodeHz`
                    }]
                }]
            }]
        }]
    });
};