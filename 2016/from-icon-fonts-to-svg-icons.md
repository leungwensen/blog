# 从icon fonts到SVG icons

作为一个前端开发，在做项目，尤其是做个人项目的时候，使用[icon fonts](https://www.w3.org/WAI/GL/wiki/Icon_Font_with_an_On-Screen_Text_Alternative)这件事常常让我感到很挫败。因为通常一个icon fonts库无法涵盖项目所有的图标需求，而混用不同的icon fonts库会带来进一步的问题：有时候你发现命名空间有冲突，有时候你发现两个库的图标padding不一致，从而有一堆修修补补的事情要做。如果项目需要用到彩色的图标，或者要基于图标做一些复杂的动画效果，又要引入SVG或者gif了。

要解决这些问题，统一用SVG icons是一个可行的办法。当然，用icon fonts还是SVG icons这个话题太大，不在本文讨论之列。有兴趣的同学可以看看这些文章。

* [icon fonts vs SVG](https://css-tricks.com/icon-fonts-vs-svg/)
* [icon fonts vs SVG debate](https://www.sitepoint.com/icon-fonts-vs-svg-debate/)
* [why and how I am using SVG over fonts for icons](https://medium.com/@webprolific/why-and-how-i-m-using-svg-over-fonts-for-icons-7241dab890f0#.oskcbcmfi)

我自己总结了一下，如果不考虑浏览器兼容性的话，SVG icons从易用性／可维护性／表现力等各方面都比传统的icon fonts更有优势。从根本上说，一个是矢量文字（font），一个是表现矢量图形的XML（SVG），有点降维打击的意思。

不过有个问题，现存的大部分开源图标库都是icon fonts的，包括影响力巨大的FontAwesome项目。相对而言，SVG icons方案可用的开源资源并不多。于是一个想法自然而言地诞生：能不能把现有的icon fonts直接转换成SVG icons？如果可以的话，从icon fonts升级到SVG icons的过程就非常平滑了。

最直接的办法是从icon fonts图标库里的[SVG font](https://www.w3.org/TR/SVG/fonts.html)文件（一般的icon fonts库都会带的一个SVG font文件，譬如FontAwesome的[fontawesome-webfont.svg](https://github.com/FortAwesome/Font-Awesome/blob/master/fonts/fontawesome-webfont.svg)。如果没有，也可以很简单地从ttf文件转换得到：[ttf2svg](https://github.com/qdsang/ttf2svg)）入手转换。

得到这个SVG font文件之后，转换成可用的SVG文件就很简单了。仔细看看这个SVG font文件，会发现每个图标就是内部定义的一个glyph元素，这个元素内部就是一段SVG。取出这些glyph元素，我们就得到了一堆可独立使用的SVG片段。这里只需要注意一点：SVG font里的glyph的坐标系和SVG内嵌到HTML内时的坐标系是不一样的。glyph和普通的文字一样，左下角是坐标轴原点，而内嵌的SVG则和Canvas一样，左上角是坐标轴原点。所以第一步转换后还要在每个SVG片段最外层加一个用于坐标转换的`<g>`节点。

```xml
<!-- 原始的glyph元素 -->
<glyph unicode="xxx"><!-- Outline of xxx glyph --></glyph>

<!-- 转换后的SVG片段 -->
<svg xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(1, -1)">
    <!-- Outline of xxx glyph -->
  </g>
</svg>
```

其中`transform="scale(1, -1)"`就是负责转换坐标轴的关键。至此，我们已经从一个传统的icon fonts图标库里提取出可用的SVG icon了，似乎就可以拿这些SVG icon合并成[SVG sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/)直接使用了？

还是不行。首先你会发现简单粗暴的坐标变换（y轴反转）会导致图标矢量在显示的时候是偏离中心线的，所以作为inline图标内嵌到HTML里会有问题。为解决这个问题，可以在得到的SVG片段上再加一个坐标偏移的transform。

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(1, -1) translate(0 -${iconHeight})">
    <!-- Outline of xxx glyph -->
  </g>
</svg>
```

这里的`-${iconHeight}`就是矢量图形的高度，对应原本的SVG fonts文件中的`<font-face>`节点的`units-per-em`值。具体细节上的调整不少，关键点还是在坐标转换上。

解决了这个问题之后基本上和原来使用icon fonts的体验差不多了，还顺带解决了命名冲突／表现力等各方面的问题。不过慢慢地你会发现原来icon fonts方案的一个致命问题没有解决：如果两个图标分别来自两个不同的图标库，padding等还是有不统一的问题（怎么同一行同样样式的两个图标看着大小不一样？）！而且现在你手里的SVG片段全部都包了一层用来做坐标转换的`<g>`元素，怎么看怎么别扭。

先解决第二个问题，把这层碍眼的`<g>`元素干掉。幸好这件事不用太操心，已经有人做掉了。用[svgo](https://github.com/svg/svgo)这个库就可以把这些杂七杂八的坐标转换干掉，还你一个清爽的SVG片段。

第一个问题有点棘手。最理想的结果是，我们把所有来自不同icon fonts库得到的SVG片段都清理一遍，去掉所有的padding，只留下表示矢量图形的片段，和一个`viewBox`属性标示这个矢量图形的实际宽高。这样只要给每个SVG片段设置同样的`width`和`height`属性，就可以得到统一的视觉效果了。

根据前面的经验，我们只要设置恰当的`transform`把整个矢量图形移动到其边缘和两条坐标轴相切，剩下的事情就可以交给svgo了。关键就在于，我们怎么知道目前矢量图形偏离两个坐标轴多远（top和left）？

图标的SVG片段我们有了。通过遍历这个SVG片段内部的各种图形（Rect, Path, etc）和它们的各种属性，计算出与两个坐标轴的最短距离就能得到top和left的值。不过这件事相当难，举个例子，如果矢量图形里有个曲线，那计算起来真的是要了命了。另外，要得到正确的结果就一定要遍历所有的情况。而如果依靠穷举来做，最终代码维护一定是个深坑。

那么，最笨的办法是什么呢？创建一个SVG文件把这个SVG片段写进去，打开浏览器，打开调试控制台，看矢量图形部分的top和left属性。然后编辑这个文件，`transform`里加上`translate=(-${left}, -${top})`。返回浏览器刷新，我们得到了想要的结果。

好了，思路有了。既然浏览器能做，那直接拿一个无头浏览器也可以做，然后就可以脚本化、自动化了。经过试验，[PhantomJS](http://phantomjs.org/)和[Electron](https://github.com/electron/electron)都符合要求。一旦祭出这个终极方案，前面很多工作都可以省略了，譬如解释SVG font文件，计算坐标转换的各种参数等。

最终从icon fonts得到SVG icons的整个流程可以描述如下：由icon fonts库得到SVG fonts文件（可能要转换），然后抽取各个glyph片段，翻转坐标系得到SVG片段，用无头浏览器把矢量图形对齐到坐标轴，用svgo优化输出。

然后就可以享用SVG icon了。内嵌到页面／sprite／做动画／加彩色／更好的渲染效果......新世界的大门已经向你打开。

这个事情说起来逻辑还算简单清晰，似乎没有什么特别难的地方。不过说到底，icon fonts是一套标准，SVG fonts又是一套标准，SVG symbol/sprites又是不同的标准。在标准的转换之间需要特别严谨，兼容各种开源icon fonts库，兼容它们背后各种不同的设计风格等等又是另一堆问题。还有个比较尴尬的点：一旦转换的图标数量上来了，性能就成了不得不考虑的问题：每处理一个图标就要开一个无头浏览器进程，每次优化完还要重新所有图标处理一遍。不做任何优化的话，NodeJS进程是会挂掉的（弱爆了）。

好消息是，我已经把整个流程自动化了。绝大多数的坑也已经填好。还准备了10k+个从开源图标库里转换过来的SVG icons。如果你还在犹豫要不要从icon fonts转为SVG icons，那么你最后的借口已经没了。项目地址：[svg-icon](https://github.com/leungwensen/svg-icon)。目前项目在重构当中，欢迎各种issue和pull request。

