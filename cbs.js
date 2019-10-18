// attributes.js
function updateAttrs() {

}
function updateClass() {

}

// dataaset.js
function updateDataset() {

}

// eventListeners.js
function updateEventListeners() {

}

// propsModule.js
function updateProps() {

}

// style.js
function updateStyle() {

}

cbs = {
  'create': [updateAttrs, updateClass, updateDataset, updateEventListeners, updateProps, updateStyle],
  'update': [updateAttrs, updateClass, updateDataset, updateEventListeners, updateProps, updateStyle],
  'remove': [applyRemoveStyle],
  'destory': [updateEventListeners, applyDestroyStyle],
  'pre': [forceReflow],
  'post': [],
}
