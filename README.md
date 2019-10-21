# snabbdom-js
snabbdom源码详解
snabbdom的原生js版本，snabbdom地址：https://github.com/snabbdom/snabbdom

snabbdom封装了一套从数据映射到dom的方法。优点（1.对比差异渲染dom，无需重新渲染整个dom；2.不需要多次封装data到dom的方法）

我们在用jquery渲染一个列表的时候，会自己封装一个方法，去映射数据和dom，可能是这样的：
```
var data = [1,2,3,4]

function updateDom(data){
  jquery.('body').remove('ul')
  var str;
  for (var i = 0; i < data.length; i++>) {
    str += '<li>' + i + '</li>'
  }
  var ul = jquery.('ul').append(jquery.html(str))
  jquery.('body').append(ul)
}
```
然后，当data更新时，调用updateDom(data)，更新dom，而且只要有一点点变化，我们都要删除原来的dom，重新添加。这样其实不难，但是当页面有大量这样的数据的时候，我们要频繁的操作dom，有人也许会用fragment片段来优化dom节点的插入删除，有人也许创建一个```<li></li>```就更新一次dom，导致页面频繁渲染（dom的回流和重绘），导致页面卡顿。 我们也许会封装很多类似updateDom这样的方法，去映射数据和dom之间的关系，一旦数据发生变化，调用方法就好了，但是我们每次都要费心费力去封装这样的方法，不同的人封装的还不一样，逻辑简单，可能就不封装了。snabbdom解决了这样的问题，他相当于一个封装好的updateDom的究极版。

snabbdom解决了这一问题，我们不再需要自己去做dom的插入删除操作，只要按照一定的格式，把数据和标签组合在一起，做一次初始化，就可以了。我们只需要关心数据的变化，每当数据变化，调用一下更新的方法（patch），snabbdom会帮我们去更新dom，而且，他会对比然后只去更新需要更新的地方，不会因为增加一个li而删除整个ul然后重绘。那么，snabbdom是如何实现从数据到dom这一操作的呢？

答案就是虚拟节点，snabbdom将数据转化为虚拟节点，然后用虚拟节点去映射dom。假如我有一个数字列表，那么映射是这样的（data -> vnode -> dom）:
```
var data = [1,2,3]
->
var vnode = {
  tagName: ul,
  listeners: [
    {click: function(){alert('clickMe!')}}
  ],
  children: [
    {tagName: li, class: 'numberLi', data: 1}
    {tagName: li, class: 'numberLi', data: 2}
    {tagName: li, class: 'numberLi', data: 3}
  ]
}
->
<ul onclick='function(){alert("clickMe!")}'>
  <li>1</li>
  <li>2</li>
  <li>3</li>
</ul>
```
然后，当data发生变化时，我们根据data重新生成vnode，在比较新老vnode，找出他们的不同，然后去更新dom
```
var data = [1,2,3,4]
->
var newVnode = {
  tagName: ul,
  listeners: [
  ],
  children: [
    {tagName: li, class: 'numberLi', data: 1}
    {tagName: li, class: 'numberLi', data: 2}
    {tagName: li, class: 'numberLi', data: 3}
    {tagName: li, class: 'numberLi', data: 4}
  ]
}
->
<ul>
  <li>1</li>
  <li>2</li>
  <li>3</li>
  <li>4</li>
</ul>
```
大致过程就是这样，使用snabbdom，dom的变化只是新增了一个值为4的li，并没有删除整个ul然后重新渲染，我们从主干逻辑入手，一步步揭开snabbdom的面纱（yifu）吧。

1.定义vnode格式

2.数据通过h函数生成vnode，然后将vnode传入patch
例：vnode = h('div#container', {class: {'actives': true}, on: {click: [changeText, 'desc']}}, '我是text文本')

3.初始化patch函数
var patch = snabbdom.init(modules){}，初始化snabbdom，返回patch方法，调用patch方法传入oldVnode和vnode，最后更新dom，modules参数是更新当前节点对应dom的class、props、styles等属性的方法。最后会存在cbs对象中，然后在不同的时机以vnode为参数调用cbs中的方法，更新dom属性

4.执行patch方法

(1)判断vnode类型

oldVnode是dom元素，也就是第一次初始化，用dom元素创建vnode，例如：```patch(document.getElementById('container'), vnode)```
  ```
  if (!isVnode(oldVnode)) {
    oldVnode = emptyNodeAt(oldVnode);
  }
  ```
(2)比较oldVnode和vnode是否相同，再比较他们的子级vnode是否相同，然后更新dom。
sameVnode判断新老vnode是否是同一个节点,是的话调用patchVnode更新当前节点对应dom的属性，并比较他们的子节点。关键就在patchVnode方法了，我们最后来讲。不是同一个节点，直接用心vnode新建dom元素，然后删除老节点对应的dom元素
  ```
  if (sameVnode(oldVnode, vnode)) {
    patchVnode(oldVnode, vnode, insertedVnodeQueue);
  }
  else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);
      createElm(vnode, insertedVnodeQueue);
      if (parent !== null) {
          api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
          removeVnodes(parent, [oldVnode], 0, 0);
      }
  }
  ```
  最后，我们要注意insertedVnodeQueue，在一次patch过程中，所有新增的vnode都会存储在这里，然后遍历，调用每个新节点的insert钩子函数。

snabbdom中有两种方法，一种是cbs中的方法，是内部使用，用来更新当前vnode对用dom的class、attributes、style等属性的，在snabbdom.init(modules)方法中，根据modules，会生成一个cbs对象，它是方法的集合。一类是data.hook中用户自定义的钩子函数，在某些固定的时机触发，和vue的mounted等钩子函数是一样的。


(3)调用patchVnode(只有当前的oldVnode和vnode是同一节点，才会调用patchVnode)
```
patchVnode(oldVnode, vnode, insertedVnodeQueue);
```
patchVnode调用cbs.update方法集更新当前vnode对应的dom属性，同时调用用户在data中自定义的钩子函数，然后调用updateChildren比较新老vnode的子节点。
就这样patchVnode和updateChildren互相调用，遍历了整个虚拟dom树。
patchVnode中，文本节点和子节点是互斥的，如果是文本节点，那么删除vnode的子节点,直接：api.setTextContent(elm, vnode.text)，修改当前dom的文本即可。
```
if (isUndef(vnode.text)) {
  ...
}
else if (oldVnode.text !== vnode.text) {
    if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
    }
    api.setTextContent(elm, vnode.text);
}
```
接下来我们重点分析有子节点的情况：

在新老vnode都存在子节点且不同的情况下，调用updateChildren(elm, oldCh, ch, insertedVnodeQueue);
我们要比较当前两个子节点数组中节点的变化，据此更新dom，这个方法里就是我们总说的diff算法了。

我们只考虑没有key的情况，有key的情况是类似的。注意一点，sameVnode(oldStartVnode, newEndVnode)和sameVnode(oldEndVnode, newStartVnode)这两种情况，我们只在odlCh中移动节点的位置即可。


比较(sameVnode(oldEndVnode, newEndVnode);oEnd--;nEnd--;结果如图2)：
```
   oldVnode                                    newVnode
                                  
oStrat               oEnd                |   nStart                        nEnd
  |                   |                  |    |                             |
  A    B    C    D    E                  |    C    G    A    B    D    F    E

                                图一
```
比较(isUndef(idxInOld); nStart++;结果如图3)：
```
   oldVnode                                    newVnode
                                  
oStrat          oEnd                     |  nStart                    nEnd
  |              |                       |    |                        |
  A    B    C    D    E                  |    C    G    A    B    D    F    E

                                图二
```
比较(isUndef(idxInOld); nStart++;结果如图4)：
```                       
     oStrat         oEnd                 |        nStart                nEnd
       |             |                   |          |                    |
  C    A    B    C   D   E               |    C     G    A    B    D     F    E
 
                                图三
```
比较(sameVnode(oldStartVnode, newStartVnode);oStrat++;nStart++;结果如图5)：
 ```                                 
          oStrat         oEnd            |                 nStart                nEnd
            |             |              |                   |                    |
  C    G    A    B   C    D    E         |    C       G      A      B      D      F        E
            
                                图四
```
比较(sameVnode(oldStartVnode, newStartVnode);oStrat++;nStart++;结果如图6)：
```                                 
              oStrat     oEnd             |                      nStart          nEnd
                 |        |               |                         |             |
  C    G    A    B   C    D    E          |   C       G      A      B      D      F        E
                   
                                图五
```
比较(sameVnode(oldEndVnode, newStartVnode);oEnd--;nStart++;结果如图7)：
```                                  
                   oStrat  oEnd           |                             nStart    nEnd
                      |    |              |                                |      |
  C    G    A    B    C    D    E         |   C       G      A      B      D      F        E
         
                                图六
```
比较(isUndef(idxInOld); nStart++;结果如图8)：
```                               
                    oStrat oEnd           |                                  nStart nEnd
                          ||              |                                       ||
  C    G    A    B    D    C    E         |   C       G      A      B      D      F        E
        
                                图七
```
比较(跳出whilew循环;oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx，循环删除oldCh中多余的节点，如图9)：
```                   
                         oStrat oEnd                                          nEnd      nStart  
                               ||                                                |        |
  C    G    A    B    D    F    C     E   |   C       G      A      B      D     F       E
    
                                 图八     
```
比较结果：
```
                                          |
                                          |                                   nEnd      nStart  
                                          |                                      |        |
  C    G    A    B    D    F    E         |  C       G      A      B      D      F        E
                          
                                  图九

```


在比较过程中，当sameVnode(oldEndVnode, newEndVnode)返回true时，会再次调用patchVnode，然后又去比较这两个节点的子节点。

```
oldVnode = h('a.btn.title', {class: {active: true}, on: {click: [changeSort, 'title']}}, 'oldText')  ---->根据数据(data)生成vnode节点。
        |
        |
        |
vnode = h('a.btn.title', {class: {active: false}, on: {click: []}}, 'newText')  ---->更新后的数据(data)生成vnode节点。
        |
        |
        |
patch(oldVnode, vnode)
        |
        |   sameVnode(oldVnode, vnode) === true
        |
patchVnode(oldVnode, vnode) ---->调用hook.prepatch钩子函数，调用cbs.update更新class等属性更新点前vnode节点对应dom，调用hook.update钩子函数。
        |
        |   isDef(oldCh) && isDef(ch) && (oldCh !== ch) ----> 新老vnode都有子节点且不相等，比较子节点。
        |
updateChildren(oldVnode.children, vnode.children) ----> 有相同节点，继续比较。无相同节点后，调用addVnodes/removeVnodes新增或删除对应的dom元素并更新事件或属性，当前层级比较结束，回去比较父级节点的下。
        |   true                                             这里可以看出，sameVnode(oldVnode, vnode) === true 的节点，属性和事件是在patchVnode中更新的，而不同的节点则是在updateChildren中更新的。
        |<--------- sameVnode(oldVnode.children[i], vnode.children[j]) === true ---->false  当前层级比较结束，回到上层方法。
        |
patchVnode(oldVnode.children[i], vnode.children[j])


```
现在写的稍微有点乱，未完待续。。。。
