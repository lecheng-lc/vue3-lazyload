### 用法
目前和vue-lazyload大致使用方法一样，[传送门](https://github.com/hilongjw/vue-lazyload/blob/master/README.md)

---
## 更改地方如下
* cdn地址改动
* 新增v-view指令和view方法
* 新增viewNodeNames参数
### 新增参数

| key | description| default | options|
|-|-|-|
|viewNodeNames| 允许曝光的dom节点|[]| Array |

### 新增指令
v-view
```html
<ul>
  <li v-for="img in list">
    <img v-view @view="doTracking" >
  </li>
</ul>'
```

