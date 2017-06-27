(function (global) {
    class ContextUpdateEvent extends Event {
        constructor() {
            super(ContextUpdateEvent.name, {
                bubbles: false,
            });
        }
    }
    ContextUpdateEvent.name = `context-update`;

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
        $update = () => true,
        $shadows = [],
        ...props
    } = {}) {
        const el = createElement($el);
        if ($text) $components.unshift({
            $el: `text`,
            $value: $text
        });
        if (el.appendChild) $components.forEach(e => el.appendChild(box(e)));
        if (el.style) Object.entries($style).forEach(([k, v]) => el.style[k] = v);
        if (el.classList) $classList.forEach(c => el.classList.add(c));
        if ($value && el.nodeValue) el.nodeValue = $value;
        Object.entries(props).filter(([k]) => !k.startsWith(`_`)).forEach(([k, v]) => typeof v === `string` ? el.setAttribute(k, v) : el[k] = v);
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
                            shadow.update(changed);
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
                    if (snode !== JSON.stringify(cpos)) {
                        el.insertBefore(box(node), el.childNodes.item(i));
                        $components.splice(i, 0, node);
                        for (let j = i + 1; j < $components.length; j++) {
                            if (JSON.stringify($components[j]) === snode) {
                                $components.splice(j, 1);
                                break;
                            }
                        }
                    }
                }
                $components.length = i;
                while (i < el.childNodes.length) {
                    const onode = el.childNodes.item(i);
                    el.removeChild(onode);
                }
            }
        });
        defineConst(el, `update`, async() => {
            if ($update.call(el)) await Promise.all(Array.from(el.childNodes).map(async x => x.update && await x.update()));
        });
        return el;
    }

    function css(slices, ...insert) {
        const target = slices.map((x, i) => x + (insert[i] || ``)).join(``);
        const cooked = target.split(target.match(/^\n( +)/g)[0]).join(`\n`);
        return {
            $el: `style`,
            $text: cooked
        };
    }
    global.boxjs = {
        box,
        css
    };
})(window);