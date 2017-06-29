(function (global) {
    function createElement(name) {
        switch (name) {
        case `text`:
            return document.createTextNode(`text`);
        case `svg`:
            return document.createElementNS(`http://www.w3.org/2000/svg`, `svg`);
        default:
            if (typeof name === `string`) return document.createElement(name);
            return name;
        }
    }

    const nextTick = () => new Promise(resolve => setTimeout(resolve, 0));

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

    const emptyObj = Object.freeze({});

    function box({
        $el = `div`,
        $style = {},
        $classList = [],
        $components = [],
        $text = null,
        $value = null,
        $datasource = [],
        $fetch = () => [],
        $template = null,
        $update = () => true,
        $render = $template ? () => false : () => true,
        $shadows = [],
        $key = NaN,
        $init = () => true,
        ...props
    } = {}) {
        const el = createElement($el);
        while (el.firstChild) el.removeChild(el.firstChild);
        if ($text) $components = [{
            $el: `text`,
            $value: $text
        }, ...$components];
        if (el.appendChild) $components.forEach(e => el.appendChild(box(e)));
        if (el.style) Object.entries($style).forEach(([k, v]) => el.style[k] = v);
        if (el.classList) $classList.forEach(c => el.classList.add(c));
        if ($value && el.nodeValue) el.nodeValue = $value;
        Object.entries(props).filter(([k]) => !k.startsWith(`_`)).forEach(([k, v]) => typeof v === `string` ? el.setAttribute(k.replace(/([A-Z])/g, `-$1`).toLowerCase(), v) : el[k] = v);
        if (!el.context)
            defineConst(el, `context`, new Proxy(emptyObj, {
                get: (t, p) => {
                    if (p in emptyObj) return emptyObj[p];
                    if (el.parentNode && el.parentNode.context) return el.parentNode.context[p];
                },
                set: (t, p, v) => {
                    if (p in emptyObj) return v;
                    if (el.parentNode && el.parentNode.context) return el.parentNode.context[p] = v;
                }
            }));
        if (!el.methods)
            defineConst(el, `methods`, new Proxy(emptyObj, {
                get: (t, p) => {
                    if (p in emptyObj) return emptyObj[p];
                    if (el.parentNode && el.parentNode.methods) return el.parentNode.methods[p];
                }
            }));
        defineConst(el, `shadows`, $shadows.map(content => {
            const shadow = el.attachShadow({
                mode: `open`
            });
            const changed = new Set;

            defineConst(shadow, `context`, new Proxy(content._context || {}, {
                set: (target, property, receiver) => {
                    if (changed.size === 0) {
                        setTimeout(async() => {
                            await shadow.update(changed);
                            changed.clear();
                        }, 0);
                    }
                    changed.add(property);
                    return Reflect.set(target, property, receiver);
                }
            }));

            defineConst(shadow, `methods`, new Proxy(content._methods || {}, {
                get: (target, property) => {
                    const ret = Reflect.get(target, property);
                    if (typeof ret === `function`) return ret.bind(shadow);
                    return ret;
                }
            }));

            box(Object.assign(content, {
                $el: shadow
            }));

            return shadow;
        }));
        if ($template) {
            Object.defineProperty(el, `datasource`, {
                get() {
                    return Object.freeze($datasource);
                },
                set(newSource) {
                    console.log(`set`, $datasource, newSource);
                    let i = 0;
                    for (; i < newSource.length; i++) {
                        const node = newSource[i];
                        const skey = node.$key || NaN;
                        const snode = JSON.stringify(node);
                        const cpos = $datasource[i];
                        const ckey = cpos && cpos.$key || NaN;
                        if (skey !== ckey) {
                            let j = i + 1;
                            for (; j < $datasource.length; j++) {
                                if ($datasource[j].$key === skey) {
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
                            el.childNodes.item(i).render(node);
                        } else if (snode !== JSON.stringify(cpos)) {
                            $datasource[i] = node;
                            el.childNodes.item(i).render(node);
                        }
                    }
                    $datasource.length = i;
                    console.log($datasource);
                    while (i < el.childNodes.length) {
                        const onode = el.childNodes.item(i);
                        el.removeChild(onode);
                    }
                }
            });
        } else
            Object.defineProperty(el, `components`, {
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
        defineConst(el, `$key`, $key);
        defineConst(el, `update`, async(obj) => {
            if ($template) el.datasource = await $fetch.call(el);
            if (await $update.call(el, obj)) await Promise.all(Array.from(el.childNodes).map(async x => x.update && await x.update(obj)));
        });
        defineConst(el, `render`, async(obj) => {
            if (await $render.call(el, obj)) await Promise.all(Array.from(el.childNodes).map(async x => x.render && await x.render(obj)));
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
            $el: `style`,
            $text: cooked
        };
    }
    global.boxjs = {
        box,
        css,
        genID
    };
})(window);