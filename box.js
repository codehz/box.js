(function(global) {
    const symbols = Object.freeze(
        [
            `id`,
            `element`,
            `style`,
            `classList`,
            `components`,
            `text`,
            `value`,
            `datasource`,
            `fetch`,
            `template`,
            `update`,
            `render`,
            `autoupdate`,
            `shadows`,
            `key`,
            `init`,
            `context`,
            `methods`,
            `changed`,
            `ignore`,
            `default`
        ].reduce(
            (o, name) =>
                Object.assign({}, o, {
                    [name]: Symbol(name)
                }),
            {}
        )
    );

    Object.prototype.hasOwnProperty.call(Node.prototype, `getRootNode`) ||
        (() => {
            function getRootNode(opt) {
                const composed = typeof opt === `object` && Boolean(opt.composed);

                return composed ? getShadowIncludingRoot(this) : getRoot(this);
            }

            function getShadowIncludingRoot(node) {
                const root = getRoot(node);

                if (isShadowRoot(root)) {
                    return getShadowIncludingRoot(root.host);
                }

                return root;
            }

            function getRoot(node) {
                if (node.parentNode != null) {
                    return getRoot(node.parentNode);
                }

                return node;
            }

            function isShadowRoot(node) {
                return typeof ShadowRoot === `function` && node instanceof ShadowRoot;
            }

            Object.defineProperty(Node.prototype, `getRootNode`, {
                enumerable: false,
                configurable: false,
                value: getRootNode
            });
        })();

    function createElement(name) {
        switch (name) {
        case symbols.text:
            return document.createTextNode(`text`);
        case `svg`:
            return document.createElementNS(`http://www.w3.org/2000/svg`, `svg`);
        default:
            if (typeof name === `string`) return document.createElement(name);
            return name;
        }
    }

    const nextTick = (delay = 0) => new Promise(resolve => setTimeout(resolve, delay));

    let count = 0;

    function genID() {
        count = count + 1 % (1 << 8);
        return (((Date.now() % (1 << 15)) << 16) + ((performance.now() * 1000 % (1 << 8)) << 8) + count) | 0;
    }

    function defineConst(obj, name, value) {
        Object.defineProperty(obj, name, {
            value,
            configurable: false,
            writable: false
        });
    }

    function box(props = {}) {
        let {
            [symbols.element]: $el = `div`,
            [symbols.style]: $style = {},
            [symbols.classList]: $classList = [],
            [symbols.components]: $components = [],
            [symbols.text]: $text = null,
            [symbols.value]: $value = null,
            [symbols.datasource]: $datasource = [],
            [symbols.fetch]: $fetch = () => symbols.default,
            [symbols.template]: $template = null,
            [symbols.update]: $update = () => symbols.default,
            [symbols.render]: $render = $template ? () => symbols.ignore : () => symbols.default,
            [symbols.autoupdate]: $autoupdate = [],
            [symbols.shadows]: $shadows = [],
            [symbols.key]: $key = NaN,
            [symbols.init]: $init = () => true,
            [symbols.context]: $context = {},
            [symbols.methods]: $methods = {}
        } = props;
        const el = createElement($el);
        while (el.firstChild) el.removeChild(el.firstChild);
        if ($text)
            $components = [
                {
                    [symbols.element]: symbols.text,
                    [symbols.value]: $text
                },
                ...$components
            ];
        if (el.appendChild) $components.forEach(e => el.appendChild(box(e)));
        if (el.style) Object.entries($style).forEach(([k, v]) => (el.style[k] = v));
        if (el.classList) $classList.forEach(c => el.classList.add(c));
        if ($value && el.nodeValue) el.nodeValue = $value;
        Object.entries(props)
            .filter(([k]) => !k.startsWith(`_`))
            .forEach(
                ([k, v]) =>
                    typeof v === `string` ? el.setAttribute(k.replace(/([A-Z])/g, `-$1`).toLowerCase(), v) : (el[k] = v)
            );
        defineConst(el, symbols.changed, new Set());
        function triggerUpdate(path) {
            if (el[symbols.changed].size === 0) {
                setTimeout(async () => {
                    const next = await el[symbols.update](el[symbols.changed]);
                    el[symbols.changed].clear();
                    await nextTick();
                    await Promise.all(next.map(x => (typeof x === `function` ? x() : 0)));
                }, 0);
            }
            el[symbols.changed].add(path);
        }
        defineConst(
            el,
            symbols.context,
            new Proxy(function() {}, {
                apply(target, thisArg, argumentsList) {
                    const next = argumentsList.reduce((p, { path: [property, ...rest], value }) => {
                        if (property in $context) {
                            triggerUpdate(property);
                            if (rest.length === 0) {
                                if (typeof value === `function`) $context[property] = value($context[property]);
                                else $context[property] = value;
                            } else {
                                rest.reduce((p, c) => {
                                    const ret = [p, c].join(`/`);
                                    triggerUpdate(ret);
                                    return ret;
                                }, property);
                                const key = rest.pop();
                                const target = rest.reduce((p, c) => p[c] || (p[c] = {}), $context);
                                if (typeof value === `function`) target[key] = value(target[key]);
                                target[key] = value;
                            }
                            return p;
                        } else {
                            return [...p, { path: [property, ...rest], value }];
                        }
                    }, []);
                    if (next.length && el.parentNode && el.parentNode[symbols.context])
                        el.parentNode[symbols.context](...next);
                    return undefined;
                },
                get(target, property) {
                    if (property in $context) return $context[property];
                    else if (el.parentNode && el.parentNode[symbols.context])
                        return el.parentNode[symbols.context][property];
                },
                set(target, property, value) {
                    if (property in $context) {
                        triggerUpdate(property);
                        return ($context[property] = value);
                    } else if (el.parentNode && el.parentNode[symbols.context])
                        return (el.parentNode[symbols.context][property] = value);
                }
            })
        );
        defineConst(
            el,
            symbols.methods,
            new Proxy($methods, {
                get(target, property) {
                    if (property in $methods) return $methods[property].bind(el);
                    else if (el.parentNode && el.parentNode[symbols.methods])
                        return el.parentNode[symbols.methods][property];
                }
            })
        );
        defineConst(
            el,
            symbols.shadows,
            $shadows.map(content =>
                box(
                    Object.assign(content, {
                        [symbols.element]: el.attachShadow({
                            mode: `open`
                        })
                    })
                )
            )
        );
        if ($template) {
            Object.defineProperty(el, symbols.datasource, {
                get() {
                    return Array.from($datasource);
                },
                set(newSource) {
                    let i = 0;
                    for (; i < newSource.length; i++) {
                        const node = newSource[i];
                        const { [symbols.key]: skey = NaN } = node;
                        const snode = JSON.stringify(node);
                        const cpos = $datasource[i] || {};
                        const { [symbols.key]: ckey = NaN } = cpos;
                        if (skey !== ckey) {
                            let j = i + 1;
                            for (; j < $datasource.length; j++) {
                                if ($datasource[j][symbols.key] === skey) {
                                    $datasource.splice(j, 1);
                                    break;
                                }
                            }
                            if (j < el.childNodes.length) {
                                el.insertBefore(el.childNodes.item(j), el.childNodes.item(i));
                            } else {
                                el.insertBefore(box($template), el.childNodes.item(i));
                            }
                            $datasource.splice(i, 0, node);
                            el.childNodes.item(i)[symbols.render](node);
                        } else if (snode !== JSON.stringify(cpos)) {
                            $datasource[i] = node;
                            el.childNodes.item(i)[symbols.render](node);
                        }
                    }
                    $datasource.length = i;
                    while (i < el.childNodes.length) {
                        const onode = el.childNodes.item(i);
                        el.removeChild(onode);
                    }
                }
            });
        } else
            Object.defineProperty(el, symbols.components, {
                get() {
                    return $components;
                },
                set(newList) {
                    let i = 0;
                    for (i = 0; i < newList.length; i++) {
                        const node = newList[i];
                        const snode = JSON.stringify(node);
                        const cpos = $components[i];
                        if (cpos === snode) continue;
                        let j = i + 1;
                        for (; j < $components.length; j++) {
                            if (JSON.stringify($components[j]) === snode) {
                                $components.splice(j, 1);
                                break;
                            }
                        }
                        if (j < el.childNodes.length) {
                            el.insertBefore(el.childNodes.item(j), el.childNodes.item(i));
                        } else {
                            el.insertBefore(box(node), el.childNodes.item(i));
                        }
                        $components.splice(i, 0, node);
                    }
                    $components.length = i;
                    while (i < el.childNodes.length) {
                        const onode = el.childNodes.item(i);
                        el.removeChild(onode);
                    }
                }
            });
        defineConst(el, symbols.key, $key);
        defineConst(el, symbols.update, async obj => {
            if ($template) {
                const newDataSource = await $fetch.call(el, obj);
                if (newDataSource !== symbols.default) el[symbols.datasource] = newDataSource;
            }
            const result = await $update.call(el, obj);
            if (result === symbols.default)
                return [].concat
                    .apply(
                        [],
                        await Promise.all(
                            Array.from(el.childNodes).map(
                                async x => x[symbols.update] && (await x[symbols.update](obj))
                            )
                        )
                    )
                    .filter(x => x !== symbols.ignore);
            return [result].filter(x => x !== symbols.ignore);
        });
        defineConst(el, symbols.render, async obj => {
            const result = await $render.call(el, obj);
            if (result === symbols.default)
                return [].concat
                    .apply(
                        [],
                        await Promise.all(
                            Array.from(el.childNodes).map(
                                async x => x[symbols.render] && (await x[symbols.render](obj))
                            )
                        )
                    )
                    .filter(x => x !== symbols.ignore);
            return [result].filter(x => x !== symbols.ignore);
        });
        setTimeout(() => {
            if (el.getRootNode() === el && !(el instanceof ShadowRoot)) return;
            $init.call(el);
            if ($autoupdate.length > 0) {
                el[symbols.update]($autoupdate);
            }
        }, 0);
        return el;
    }

    function genText(slices, ...insert) {
        return slices.map((x, i) => x + (typeof insert[i] == `undefined` ? `` : insert[i])).join(``);
    }

    function css(slices, ...insert) {
        const target = genText(slices, insert);
        let matched = target.match(/^\n(\s*)/g);
        let cooked;
        if (matched !== null) cooked = target.split(matched[0]).join(`\n`);
        else cooked = target.trim();
        return {
            [symbols.element]: `style`,
            [symbols.text]: cooked
        };
    }

    function text(slices, ...insert) {
        const target = genText(slices, insert);
        let matched = target.match(/^\n(\s*)/g);
        let cooked;
        if (matched !== null) cooked = target.split(matched[0]).join(`\n`).trim();
        else cooked = target.trim();
        return {
            [symbols.element]: symbols.text,
            [symbols.value]: cooked
        };
    }
    text.raw = function(slices, ...insert) {
        const target = genText(slices, insert);
        return {
            [symbols.element]: symbols.text,
            [symbols.value]: target
        };
    };
    function el(slices, ...insert) {
        const target = genText(slices, insert);
        const addition = {
            [symbols.element]: target.match(/^[\w-]*/g)[0]
        };
        if (/#[\w-_]*/g.test(target)) addition.id = target.match(/#[\w-_]*/g)[0].slice(1);
        if (/\.[\w-_]*/g.test(target)) addition[symbols.classList] = target.match(/\.[\w-_]*/g).map(x => x.slice(1));
        if (/\[[\w_]+=(?:\\.|[^\]])+\]/g.test(target))
            target
                .match(/\[[\w_]+=(?:\\.|[^\]])+\]/g)
                .forEach(
                    equ => (addition[equ.match(/\[([\w_]+)=/)[1]] = JSON.parse(equ.match(/=((?:\\.|[^\]])+)\]/)[1]))
                );
        if (/\[[\w_]\]/g.test(target))
            target.match(/\[[\w_]+\]/g).forEach(attr => (addition[attr.match(/\[([\w_]+)\]/)[1]] = true));
        return (...arr) =>
            Object.assign(
                {},
                ...arr.map(
                    obj =>
                        typeof obj === `string`
                            ? { [symbols.text]: `${obj}` }
                            : Array.isArray(obj) ? { [symbols.components]: obj } : obj
                ),
                addition
            );
    }

    function patch(slices, ...insert) {
        const target = genText(slices, insert);
        return value => ({
            path: target.split(`/`),
            value
        });
    }

    function watch(slices, ...insert) {
        const target = genText(slices, insert);
        const paths = target.split(`;`);
        return fn =>
            function(set) {
                if (paths.reduce((p, c) => p || set.has(c), false))
                    return fn.call(
                        null,
                        this,
                        ...paths.map(path => path.split(`/`).reduce((p, c) => p[c], this[symbols.context]))
                    );
                return symbols.default;
            };
    }

    defineConst(
        global,
        `boxjs`,
        Object.freeze({
            symbols,
            box,
            utils: {
                nextTick,
                css,
                text,
                genID,
                el,
                patch,
                watch
            }
        })
    );
})(window);
