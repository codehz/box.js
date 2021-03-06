window.onload = function() {
    `use strict`;

    const { symbols: sym, utils: { text, genID, el, patch, watch }, box } = window.boxjs;

    const elKey = Symbol(`elKey`);

    function getMode() {
        const hash = location.hash;
        const ret = {
            [`#/all`]: 0,
            [`#/active`]: 1,
            [`#/completed`]: 2
        }[hash];
        if (typeof ret === `number`) return ret;
        location.hash = `#/all`;
        return 0;
    }

    const filters = [() => true, ({ completed }) => !completed, ({ completed }) => completed];

    box({
        [sym.element]: document.body,
        [sym.context]: {
            list: [],
            mode: getMode()
        },
        [sym.methods]: {
            addTodo(title) {
                this[sym.context](
                    patch`list`(list => [
                        ...list,
                        {
                            title,
                            completed: false,
                            [sym.key]: genID()
                        }
                    ])
                );
            },

            getFiltered() {
                return this[sym.context].list.filter(filters[this[sym.context].mode]);
            },

            setItem(key, obj) {
                this[sym.context](
                    patch`list`(list => list.map(x => (x[sym.key] === key ? Object.assign({}, x, obj) : x)))
                );
            },

            removeItem(key) {
                this[sym.context].list = this[sym.context].list.filter(x => x[sym.key] !== key);
            }
        },
        [sym.init]() {
            window.onhashchange = () => {
                this[sym.context](patch`mode`(getMode()));
            };
        },
        [sym.components]: [
            el`section.todoapp[ariaLabel="TodoApp"]`([
                el`header.header`([
                    el`h1`(`todos`),
                    el`input.new-todo`({
                        autofocus: ``,
                        placeholder: `What needs to be done?`,
                        ariaLabel: `Press the Enter key to add todo`,
                        onkeypress(event) {
                            if (event.keyCode === 13 && this.value.length > 0) {
                                event.preventDefault();
                                this[sym.methods].addTodo(this.value);
                                this.value = ``;
                            }
                        }
                    })
                ]),
                el`section.main`(
                    {
                        [sym.init]() {
                            this[sym.update](new Set([`list`]));
                        },
                        [sym.update]: watch`list;mode`(self => {
                            const filtered = self[sym.methods].getFiltered();
                            self.classList.toggle(`hidden`, filtered.length == 0);
                            return sym.default;
                        })
                    },
                    [
                        el`input.toggle-all[type="checkbox"]`({
                            [sym.update]: watch`list`((self, list) => (self.checked = !list.find(p => !p.completed))),
                            ariaLabel: `Toggle all todo's completed state.`,
                            onchange() {
                                this[sym.context](
                                    patch`list`(list =>
                                        list.map(p =>
                                            Object.assign({}, p, {
                                                completed: this.checked
                                            })
                                        )
                                    )
                                );
                            }
                        }),
                        el`ul.todo-list[ariaLabel="Todo list"]`({
                            [sym.fetch]: watch`list;mode`(self => self[sym.methods].getFiltered()),
                            [sym.template]: el`li.todo[ariaLabel="Todo item"]`(
                                {
                                    [sym.render](node) {
                                        this.classList.toggle(`completed`, node.completed);
                                        return sym.default;
                                    }
                                },
                                [
                                    el`div.view`([
                                        el`input.toggle[type="checkbox"][ariaLabel="Completed"]`({
                                            onchange() {
                                                this[sym.methods].setItem(this[elKey], {
                                                    completed: this.checked
                                                });
                                            },
                                            [sym.render]({ completed, [sym.key]: key }) {
                                                this[elKey] = key;
                                                this.checked = completed;
                                            }
                                        }),
                                        el`label`({
                                            ondblclick() {
                                                this.parentNode.parentNode.classList.toggle(`editing`, true);
                                                this.parentNode.parentNode.querySelector(`input.edit`).focus();
                                            },
                                            [sym.render]({ title, [sym.key]: key }) {
                                                this[sym.components] = [text.raw`${title}`];
                                                this[elKey] = key;
                                            }
                                        }),
                                        el`button.destroy`({
                                            ariaHidden: `false`,
                                            ariaLabel: `Delete`,
                                            [sym.render]({ [sym.key]: key }) {
                                                this[elKey] = key;
                                            },
                                            onclick(event) {
                                                event.preventDefault();
                                                this[sym.methods].removeItem(this[elKey]);
                                            }
                                        })
                                    ]),
                                    el`input.edit[type="text"]`({
                                        [sym.render]({ title, [sym.key]: key }) {
                                            this.value = title;
                                            this[elKey] = key;
                                        },
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
                                    })
                                ]
                            )
                        })
                    ]
                ),
                el`footer.footer`(
                    {
                        [sym.init]() {
                            this[sym.update](new Set([`list`]));
                        },
                        [sym.update]: watch`list`((self, list) => {
                            self.classList.toggle(`hidden`, list.length == 0);
                            return sym.default;
                        })
                    },
                    [
                        el`span.todo-count`([
                            el`strong`({
                                [sym.update]: watch`list`((self, list) => {
                                    const uncompleted = list.reduce((p, c) => p + (c.completed ? 0 : 1), 0);
                                    self[sym.components] = [text.raw`${uncompleted | 0} `];
                                })
                            }),
                            text.raw`items left`
                        ]),
                        el`ul.filters[style="text-transform: capitalize"]`(
                            [`all`, `active`, `completed`].map((name, index) =>
                                el`li`([
                                    el`a[href="#/${name}"]`(`${name}\u200B`, {
                                        [sym.update]: watch`mode`((self, mode) =>
                                            self.classList.toggle(`selected`, index === mode)
                                        )
                                    })
                                ])
                            )
                        ),
                        el`button.clear-completed`(`Clear completed`, {
                            [sym.update]: watch`list`((self, list) => {
                                const uncompleted = list.reduce((p, c) => p + (c.completed ? 1 : 0), 0);
                                self.classList.toggle(`hidden`, uncompleted == 0);
                                return sym.default;
                            }),
                            onclick() {
                                this[sym.context](patch`list`(list => list.filter(filters[1])));
                            }
                        })
                    ]
                )
            ]),
            el`footer.info`([
                el`p`(`Double-click to edit a todo`),
                el`p`(`Written by `, [el`a[href="https://github/CodeHz"]`(`CodeHz`)])
            ])
        ]
    });
};
