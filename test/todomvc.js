window.onload = function () {
    const {
        box,
        css,
        genID
    } = window.boxjs;

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
        $el: document.body,
        $shadows: [{
            _context: {
                list: [],
                mode: getMode()
            },
            _methods: {
                addTodo(title) {
                    this.context.list = [...this.context.list, {
                        title,
                        completed: false,
                        id: genID()
                    }];
                },
                getFiltered() {
                    return this.context.list.filter(filters[this.context.mode]);
                },

                setItem(id, obj) {
                    this.context.list = this.context.list.map(x => x.id === id ? obj : x);
                },

                removeItem(id) {
                    this.context.list = this.context.list.filter(x => x.id !== id);
                }
            },
            $init() {
                window.onhashchange = () => {
                    this.context.mode = getMode();
                };
            },
            $components: [css `
            @import url(todomvc.css)
            `, {
                $el: `header`,
                $classList: [`todoapp`],
                $components: [{
                    $el: `header`,
                    $classList: [`header`],
                    $components: [{
                        $el: `h1`,
                        $text: `todos`
                    }, {
                        $el: `input`,
                        $classList: [`new-todo`],
                        autofocus: ``,
                        placeholder: `What needs to be done?`,
                        onkeypress(event) {
                            if (event.keyCode === 13 && this.value.length > 0) {
                                event.preventDefault();
                                this.methods.addTodo(this.value);
                                this.value = ``;
                            }
                        }
                    }]
                }, {
                    $el: `section`,
                    $classList: [`main`],
                    $update() {
                        const filtered = this.methods.getFiltered();
                        this.classList.toggle(`hidden`, filtered.length == 0);
                        return true;
                    },
                    $components: [{
                        $el: `input`,
                        $classList: [`toggle-all`],
                        type: `checkbox`,
                        onchange() {
                            this.context.list = this.context.list.map(p => ({ ...p,
                                completed: this.checked
                            }));
                        },
                        $update() {
                            this.checked = !this.context.list.find(p => !p.completed);
                        }
                    }, {
                        $el: `ul`,
                        $classList: [`todo-list`],
                        $update() {
                            const filtered = this.methods.getFiltered();
                            this.components = filtered.map(({
                                id
                            }) => ({
                                $el: `li`,
                                $key: id,
                                $classList: [`todo`],
                                $update() {
                                    this.classList.toggle(`completed`, this.context.list.find(x => x.id == id).completed);
                                    return true;
                                },
                                $components: [{
                                    $classList: [`view`],
                                    $components: [{
                                        $el: `input`,
                                        $classList: [`toggle`],
                                        onchange() {
                                            this.methods.setItem(id, {
                                                ...this.context.list.find(x => x.id == id),
                                                completed: this.checked
                                            });
                                        },
                                        $update() {
                                            this.checked = this.context.list.find(x => x.id == id).completed;
                                        },
                                        type: `checkbox`
                                    }, {
                                        $el: `label`,
                                        $update() {
                                            this.components = [{
                                                $el: `text`,
                                                $value: this.context.list.find(x => x.id == id).title
                                            }];
                                        },
                                    }, {
                                        $el: `button`,
                                        $classList: [`destroy`],
                                        onclick(event) {
                                            event.preventDefault();
                                            this.methods.removeItem(id);
                                        }
                                    }]
                                }, {
                                    $el: `input`,
                                    $classList: [`edit`],
                                    type: `text`
                                }]
                            }));
                            return true;
                        }
                    }]
                }, {
                    $el: `footer`,
                    $classList: [`footer`],
                    $update() {
                        this.classList.toggle(`hidden`, this.context.list.length == 0);
                        return true;
                    },
                    $components: [{
                        $el: `span`,
                        $classList: [`todo-count`],
                        $components: [{
                            $el: `strong`,
                            $update() {
                                const uncompleted = this.context.list.reduce((p, c) => p + (c.completed ? 0 : 1), 0);
                                this.components = [{
                                    $el: `text`,
                                    $value: `${uncompleted}`
                                }];
                            }
                        }, {
                            $el: `text`,
                            $value: ` items left`
                        }]
                    }, {
                        $el: `ul`,
                        $classList: [`filters`],
                        $components: [`all`, `active`, `completed`].map((name, index) => ({
                            $el: `li`,
                            $components: [{
                                $el: `a`,
                                $style: {
                                    textTransform: `capitalize`
                                },
                                $update() {
                                    this.classList.toggle(`selected`, index == this.context.mode);
                                },
                                href: `#/${name}`,
                                $text: `${name}\u200B`
                            }]
                        }))
                    }, {
                        $el: `button`,
                        $classList: [`clear-completed`],
                        $update() {
                            const uncompleted = this.context.list.reduce((p, c) => p + (c.completed ? 1 : 0), 0);
                            this.classList.toggle(`hidden`, uncompleted == 0);
                            return true;
                        },
                        $text: `Clear completed`,
                        onclick() {
                            this.context.list = this.context.list.filter(filters[1]);
                        }
                    }]
                }]
            }, {
                $el: `footer`,
                $classList: [`info`],
                $components: [{
                    $el: `p`,
                    $text: `Double-click to edit a todo`
                }, {
                    $el: `p`,
                    $text: `Written by `,
                    $components: [{
                        $el: `a`,
                        $text: `CodeHz`,
                        href: `https://github/CodeHz`
                    }]
                }]
            }]
        }]
    });
};