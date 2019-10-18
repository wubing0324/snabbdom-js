"use strict";
function updateClass(oldVnode, vnode) {
    var cur, name, elm = vnode.elm, oldClass = oldVnode.data.class, klass = vnode.data.class;
    if (!oldClass && !klass)
        return;
    if (oldClass === klass)
        return;
    oldClass = oldClass || {};
    klass = klass || {};

    // 移除已经没有的class
    for (name in oldClass) {
        if (!klass[name]) {
            elm.classList.remove(name);
        }
    }

    // 增加新的class，新老class对象中都有的不管
    for (name in klass) {
        cur = klass[name];
        if (cur !== oldClass[name]) {
            elm.classList[cur ? 'add' : 'remove'](name);
        }
    }
}
var classModule = { create: updateClass, update: updateClass };