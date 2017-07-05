(function (global) {
    const symbols = Object.freeze([
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
        `shadows`,
        `key`,
        `init`,
        `context`,
        `methods`,
        `changed`,
        `ignore`,
        `broadcast`
    ].reduce((o, name) => Object.assign({}, o, {
        [name]: Symbol(name)
    }), {}));

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
            writable: false,
        });
    }

    function box({
        [symbols.element]: $el = `div`,
        [symbols.style]: $style = {},
        [symbols.classList]: $classList = [],
        [symbols.components]: $components = [],
        [symbols.text]: $text = null,
        [symbols.value]: $value = null,
        [symbols.datasource]: $datasource = [],
        [symbols.fetch]: $fetch = () => symbols.ignore,
        [symbols.template]: $template = null,
        [symbols.update]: $update = () => symbols.broadcast,
        [symbols.render]: $render = $template ? () => false : () => true,
        [symbols.shadows]: $shadows = [],
        [symbols.key]: $key = NaN,
        [symbols.init]: $init = () => true,
        [symbols.context]: $context = {},
        [symbols.methods]: $methods = {},
        ...props
    } = {}) {
        const el = createElement($el);
        while (el.firstChild) el.removeChild(el.firstChild);
        if ($text) $components = [{
            [symbols.element]: symbols.text,
            [symbols.value]: $text
        }, ...$components];
        if (el.appendChild) $components.forEach(e => el.appendChild(box(e)));
        if (el.style) Object.entries($style).forEach(([k, v]) => el.style[k] = v);
        if (el.classList) $classList.forEach(c => el.classList.add(c));
        if ($value && el.nodeValue) el.nodeValue = $value;
        Object.entries(props).filter(([k]) => !k.startsWith(`_`)).forEach(([k, v]) => typeof v === `string` ? el.setAttribute(k.replace(/([A-Z])/g, `-$1`).toLowerCase(), v) : el[k] = v);
        defineConst(el, symbols.changed, new Set);
        defineConst(el, symbols.context, new Proxy($context, {
            get(target, property) {
                if (property in $context)
                    return $context[property];
                else if (el.parentNode && el.parentNode[symbols.context])
                    return el.parentNode[symbols.context][property];
            },
            set(target, property, value) {
                if (property in $context) {
                    if (el[symbols.changed].size === 0) {
                        setTimeout(async() => {
                            const next = await el[symbols.update](el[symbols.changed]);
                            el[symbols.changed].clear();
                            await nextTick();
                            await Promise.all(next.map(x => typeof x === `function` ? x() : 0));
                        }, 0);
                    }
                    el[symbols.changed].add(property);
                    return $context[property] = value;
                } else if (el.parentNode && el.parentNode[symbols.context])
                    return el.parentNode[symbols.context][property] = value;
            }
        }));
        defineConst(el, symbols.methods, new Proxy($methods, {
            get(target, property) {
                if (property in $methods)
                    return $methods[property].bind(el);
                else if (el.parentNode && el.parentNode[symbols.methods])
                    return el.parentNode[symbols.methods][property];
            }
        }));
        defineConst(el, symbols.shadows, $shadows.map(content => box(Object.assign(content, {
            [symbols.element]: el.attachShadow({
                mode: `open`
            })
        }))));
        if ($template) {
            Object.defineProperty(el, symbols.datasource, {
                get() {
                    return Array.from($datasource);
                },
                set(newSource) {
                    let i = 0;
                    for (; i < newSource.length; i++) {
                        const node = newSource[i];
                        const {
                            [symbols.key]: skey = NaN
                        } = node;
                        const snode = JSON.stringify(node);
                        const cpos = $datasource[i] || {};
                        const {
                            [symbols.key]: ckey = NaN
                        } = cpos;
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
        defineConst(el, symbols.update, async(obj) => {
            if ($template) {
                const newDataSource = await $fetch.call(el, obj);
                if (newDataSource !== symbols.ignore)
                    el[symbols.datasource] = newDataSource;
            }
            const result = await $update.call(el, obj);
            if (result === symbols.broadcast)
                return [].concat.apply([],
                    await Promise.all(Array.from(el.childNodes).map(
                        async x => x[symbols.update] && await x[symbols.update](obj)))).filter(x => x !== symbols.ignore);
            return [result].filter(x => x !== symbols.ignore);
        });
        defineConst(el, symbols.render, async(obj) => {
            const result = await $render.call(el, obj);
            if (result === symbols.broadcast)
                return [].concat.apply([],
                    await Promise.all(Array.from(el.childNodes).map(
                        async x => x[symbols.render] && await x[symbols.render](obj)))).filter(x => x !== symbols.ignore);
            return [result].filter(x => x !== symbols.ignore);
        });
        setTimeout(() => {
            if (el.getRootNode() === el && !(el instanceof ShadowRoot)) return;
            $init.call(el);
        }, 0);
        return el;
    }

    function css(slices, ...insert) {
        const target = slices.map((x, i) => x + (insert[i] || ``)).join(``);
        let matched = target.match(/^\n(\s*)/g);
        let cooked;
        if (matched !== null)
            cooked = target.split(matched[0]).join(`\n`);
        else
            cooked = target.trim();
        return {
            [symbols.element]: `style`,
            [symbols.text]: cooked
        };
    }

    function text(slices, ...insert) {
        const target = slices.map((x, i) => x + (insert[i] || ``)).join(``);
        let matched = target.match(/^\n(\s*)/g);
        let cooked;
        if (matched !== null)
            cooked = target.split(matched[0]).join(`\n`).trim();
        else
            cooked = target.trim();
        return {
            [symbols.element]: symbols.text,
            [symbols.value]: cooked
        };
    }
    text.raw = function (slices, ...insert) {
        const target = slices.map((x, i) => x + (insert[i] || ``)).join(``);
        return {
            [symbols.element]: symbols.text,
            [symbols.value]: target
        };
    };

    defineConst(global, `boxjs`, Object.freeze({
        symbols,
        box,
        utils: {
            nextTick,
            css,
            text,
            genID
        }
    }));
})(window);