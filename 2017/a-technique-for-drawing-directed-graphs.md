# 一种画有向图的技术

## 原文信息

原文是AT&T贝尔实验室graphviz项目组沉淀的一篇论文，描述了graphviz中的dot布局所用的算法。

### 作者信息

```
Emden R. Gansner
Eleftherios Koutsofios
Stephen C. North
Kiem-Phong Vo

AT&T Bell Laboratories Murray Hill, New Jersey 07974
```

## 术语表

| 英文 | 中文 |
|---|---|
| B-spline | B样条 |
| component | 组件 |
| edge | 边 |
| node | 节点 |
| rank | 层级 |
| ranking | 排序 |
| self-edge | 自连边 |
| spline | 样条 |
| vertex | 顶点 |


### 相关链接

- [原文](http://www.graphviz.org/Documentation/TSE93.pdf)
- [graphviz](http://www.graphviz.org/)
- [dot language](http://www.graphviz.org/pdf/dotguide.pdf)

## 摘要

本文描述了一种四步画有向图的算法。第一步用网络单纯形算法找出最优的节点层级分配。第二步用结合了新型加权函数和局部置换的迭代启发式算法为同一层级的顶点确定次序，以减少交叉。第三步通过构建和排序辅助图的方式确定最优的节点坐标。第四步通过计算样条来画边。这个算法能快速画出美观的有向图。

## 1. 引言

画抽象图是一个活跃的研究领域，其应用范围包括程序和数据结构可视化，以及文档准备等。本文描述了一种平面上画有向图的技术。目标是能找到快速画高质量图的方法，以供实时交互使用。这些算法是一个实际应用[^GNV1] 的基石。

### 1.1 美学标准

如果假设有向图有一个总体的流向或者方向，那么画图时会简单很多。譬如自顶向下（像本文大部分例子一样），或者从左往右。手绘的从起始状态到终止状态的有限状态机或者从输入到输出的数据流图中这样的流向很常见。这样的结论催生了基于以下美学准则的一系列有向图绘图方法。

- A1. 在图中展示层次结构。并且尽可能让所有的边指向同一个方向。这样有助于找出有向路径和定位起始和终止节点。
- A2. 避免和图无关的视觉异常。譬如要避免边的交叉和急转。
- A3. 尽量用短边。这样有助于定位关联节点和A2。
- A4. 倾向于对称和平衡。此标准在本文算法的某些环节中是次要的。

兼顾所有这些标准是不可能的。举个例子，A1决定的节点布局和边的方向也许会造成边交叉，从而违反了A2。并且，要最小化边交叉或者布局出对称的子图，会导致巨量的计算。所以本文作了一些简化的假设，并且依赖启发式算法以达到在普遍的情况下能快速得到一个美观的布局。读者如果需要进一步了解其他美学准则，可以参考Eades和Tamassia的注释书目中的画图算法[^ET]。

### 1.2 问题描述

画图算法的输入是一个可能包含环和多边的属性图$$G=(V,E)$$。假设$$G$$已连接，并且每个连接的组件可以单独列举。其属性如下。

| 表达式 | 含义 |
|---|---|
| $$xsize(v)$$, $$ysize(v)$$ | 节点v边界框的大小 |
| $$nodesep(G)$$ | 节点边界框之间最小水平间隔 |
| $$ranksep(G)$$ | 节点边界框之间最小竖直间隔 |
| $$w(e)$$ | 边e的权重，通常是1。权重代表边的重要程度，权重大的边在图中会更短并且竖直方向对齐 |

算法会在平面上为每个节点v分配一个矩形的中心点$$(x(v),y(v))$$，并给每条边生成一条B样条的控制点序列$$(x_0(e),y_0(e)),...,(x_n(e),y_n(e))$$。这些值都没有指定单位，根据经验，用72单位／英寸的坐标系统有助于实现。实际布局会遵循美学标准A1-A4以及图本身的属性。随后的章节会展示这些条件限制的细节。

算法还提供了画带活动表的图或者高亮起始终止节点的方法，用户可以据此进一步定制布局。下一章节描述的初始化步骤会把各个节点分配到互相独立的层级上（$$0...Max_rank$$）。同一层级上的节点的$$Y$$坐标相等。用户还可以指定顶点集$$V$$的子集$$S_{max},S_{min},S_0,S_1,...,S_k$$。这些（可能是空集的）顶点集将会被各自强制分配到最大层级，最小层级或者某个统一层级上。

### 1.3 相关工作

Warfield[^Wa]最先提出使用启发式算法画有向图以减少边交叉，Carpano[^Ca]和Sugiyama，Tagawa以及Toda等人[^STT]也发现了类似的方法。Di Battista和Tamassia提出了一种所有边指向同一方向的平面布局有向图的算法[^DT]。本文算法是基于Warfield，Sugiyama等人工作之上的。

### 1.4 概述

如图1-1所示，本画图算法分四步。第一步把节点分配到各个独立层级上。第二步为每一层的节点排序，以减少边交叉。第三步确定节点的实际布局坐标。最后一步确定每条边的B样条控制点。

> 图1-1. 主算法

```
procedure draw_graph()
begin
    rank();
    ordering();
    position();
    make_splines();
end
```

本文的贡献在于

1. 使用网络单纯形算法高效地为节点指定层级
2. 使用一种优化的启发式算法减少边交叉
3. 为层级分配问题使用一种节点坐标计算方法
4. 一种指定样条控制点的方法

1和2种的方法最先在画图软件dag中实现[^GNV1]。进一步的工作，尤其是3和4被纳入dag的替代品dot[^KN]中。图1-2和1-3是dot的布局示例及其输入文件。

> 图1-2a. (Sun-4/28机器上渲染用时1.11秒)

```viz-dot
digraph world_dynamics {
    size="6,6";
    S8 -> 9; S24 -> 27; S24 -> 25; S1 -> 10; S1 -> 2; S35 -> 36;
    S35 -> 43; S30 -> 31; S30 -> 33; 9 -> 42; 9 -> T1; 25 -> T1;
    25 -> 26; 27 -> T24; 2 -> 3; 2 -> 16; 2 -> 17; 2 -> T1; 2 -> 18;
    10 -> 11; 10 -> 14; 10 -> T1; 10 -> 13; 10 -> 12;
    31 -> T1; 31 -> 32; 33 -> T30; 33 -> 34; 42 -> 4; 26 -> 4;
    3 -> 4; 16 -> 15; 17 -> 19; 18 -> 29; 11 -> 4; 14 -> 15;
    37 -> 39; 37 -> 41; 37 -> 38; 37 -> 40; 13 -> 19; 12 -> 29;
    43 -> 38; 43 -> 40; 36 -> 19; 32 -> 23; 34 -> 29; 39 -> 15;
    41 -> 29; 38 -> 4; 40 -> 19; 4 -> 5; 19 -> 21; 19 -> 20;
    19 -> 28; 5 -> 6; 5 -> T35; 5 -> 23; 21 -> 22; 20 -> 15; 28 -> 29;
    6 -> 7; 15 -> T1; 22 -> 23; 22 -> T35; 29 -> T30; 7 -> T8;
    23 -> T24; 23 -> T1;
}
```

> 图1-2b. 图文件

```
digraph world_dynamics {
    size="6,6";
    S8 -> 9; S24 -> 27; S24 -> 25; S1 -> 10; S1 -> 2; S35 -> 36;
    S35 -> 43; S30 -> 31; S30 -> 33; 9 -> 42; 9 -> T1; 25 -> T1;
    25 -> 26; 27 -> T24; 2 -> 3; 2 -> 16; 2 -> 17; 2 -> T1; 2 -> 18;
    10 -> 11; 10 -> 14; 10 -> T1; 10 -> 13; 10 -> 12;
    31 -> T1; 31 -> 32; 33 -> T30; 33 -> 34; 42 -> 4; 26 -> 4;
    3 -> 4; 16 -> 15; 17 -> 19; 18 -> 29; 11 -> 4; 14 -> 15;
    37 -> 39; 37 -> 41; 37 -> 38; 37 -> 40; 13 -> 19; 12 -> 29;
    43 -> 38; 43 -> 40; 36 -> 19; 32 -> 23; 34 -> 29; 39 -> 15;
    41 -> 29; 38 -> 4; 40 -> 19; 4 -> 5; 19 -> 21; 19 -> 20;
    19 -> 28; 5 -> 6; 5 -> T35; 5 -> 23; 21 -> 22; 20 -> 15; 28 -> 29;
    6 -> 7; 15 -> T1; 22 -> 23; 22 -> T35; 29 -> T30; 7 -> T8;
    23 -> T24; 23 -> T1;
}
```

> 图1-3a. (Sun-4/28机器上渲染用时0.5秒)

```viz-dot
digraph shells {
    size="7,8";
    node [fontsize=24, shape = plaintext];
    1972 -> 1976 -> 1978 -> 1980 -> 1982 -> 1984 -> 1986 -> 1988
        -> 1990 -> future;
    node [fontsize=20, shape = box];
    { rank = same;  1976 Mashey Bourne; }
    { rank = same;  1978 Formshell csh; }
    { rank = same;  1980 esh vsh; }
    { rank = same;  1982 ksh "System-V"; }
    { rank = same;  1984 v9sh tcsh; }
    { rank = same;  1986 "ksh-i"; }
    { rank = same;  1988 KornShell Perl rc; }
    { rank = same;  1990 tcl Bash; }
    { rank = same;  "future" POSIX "ksh-POSIX"; }
    Thompson -> {Mashey Bourne csh}; csh -> tcsh;
    Bourne -> {ksh esh vsh "System-V" v9sh}; v9sh -> rc;
           {Bourne "ksh-i" KornShell} -> Bash;
    {esh vsh Formshell csh} -> ksh;
    {KornShell "System-V"} -> POSIX;
    ksh -> "ksh-i" -> KornShell -> "ksh-POSIX";
    Bourne -> Formshell;
    /* ’invisible’ edges to adjust node placement */
    edge [style=invis];
    1984 -> v9sh -> tcsh ; 1988 -> rc -> KornShell;
    Formshell -> csh; KornShell -> Perl;
}
```

> 图1-2b. 图文件

```
digraph shells {
    size="7,8";
    node [fontsize=24, shape = plaintext];
    1972 -> 1976 -> 1978 -> 1980 -> 1982 -> 1984 -> 1986 -> 1988
        -> 1990 -> future;
    node [fontsize=20, shape = box];
    { rank = same;  1976 Mashey Bourne; }
    { rank = same;  1978 Formshell csh; }
    { rank = same;  1980 esh vsh; }
    { rank = same;  1982 ksh "System-V"; }
    { rank = same;  1984 v9sh tcsh; }
    { rank = same;  1986 "ksh-i"; }
    { rank = same;  1988 KornShell Perl rc; }
    { rank = same;  1990 tcl Bash; }
    { rank = same;  "future" POSIX "ksh-POSIX"; }
    Thompson -> {Mashey Bourne csh}; csh -> tcsh;
    Bourne -> {ksh esh vsh "System-V" v9sh}; v9sh -> rc;
           {Bourne "ksh-i" KornShell} -> Bash;
    {esh vsh Formshell csh} -> ksh;
    {KornShell "System-V"} -> POSIX;
    ksh -> "ksh-i" -> KornShell -> "ksh-POSIX";
    Bourne -> Formshell;
    /* ’invisible’ edges to adjust node placement */
    edge [style=invis];
    1984 -> v9sh -> tcsh ; 1988 -> rc -> KornShell;
    Formshell -> csh; KornShell -> Perl;
}
```

## 2. 最优层级分配

第一步是为$$G$$中的每一个节点$$v$$根据其边分配一个整数层级$$lambda(v)$$。即对于边集$$E$$中的每一天边$$e=(v,w),l(e)>=delta(e)$$，其中$$e=(v,w)$$的长度$$l(e)$$为$$(lambda(w)-labda(v))$$，而$$delta(e)$$表示某个指定的最小长度限制。$$delta(e)$$通常是1，也可以是任意非负整数。由于下述技术上的原因，$$delta(e)$$通常是内部指定的，用户如果想要调整层级分配，也可以从外部指定。在这一步中，每个非空的集合$$S_{max},S_{min},S_0,S_1,...,S_k$$会被临时合并成一个节点。另外，环会被忽略，多条边也会被合并为一条，并设置其权重为所有合并边权重之和。为提高性能，那些不从属于上述子集的叶子节点也会被忽略，因为这些叶子节点的层级可以很简单地通过最优层级分配指定。

### 2.1 图形去环

要有一个固定的层级分配，图一定不能存在环。而因为输入的图可能存在环，所以会有一个预处理步骤检测环并且通过反转某个边来去环[^RDM]。

### 2.2 问题定义

### 2.3 网络单纯形

### 2.4 实现细节

## 3. 层级内顶点排序

## 4. 节点坐标
第三部是计算节点坐标。之前的论文把计算节点坐标作为计算质心或者中心的后置步骤，为了布局的美观做一些局部的调整。我们将节点的位置作为一个独立的明确的问题，但是要为了更好的布局和未来的扩展性让步，例如顶点的排序是用拓扑算法还是几何算法。      
X和Y坐标计算分两步进行。第一步是根据已经计算好的排序顺序，给所有节点分配X坐标(包括可见的节点)。第二步是根据同样的排序顺序分配Y坐标。Y坐标的分配必须在节点的盒模型外维持最小的间隔$$ranksep(G)$$。当然，也可以调大邻近节点的间隔，增加邻近边的斜率，让整个图更具可读性。因为Y坐标的步骤很明确，所以这一小节的剩余部分会介绍如何计算X坐标。
### 4.1 启发式方法

### 4.2 最优节点放置

### 4.3 实现细节重审

## 5. 画边

### 5.1 确定区域

#### 5.1.1 不同层级间的边

#### 5.1.2 同层级的边

#### 5.1.3 自连边

### 5.2 计算样条

### 5.3 边标签

## 6. 总结

## 7. 致谢

## 索引

[^AHU]:  Aho, A., J. Hopcroft, and J. Ullman, The Design and Analysis of Computer Algorithms, Addison-Wesley, Reading, Massachusetts, 1974.

[^Ca]:  Carpano, M., ‘‘Automatic display of hierarchized graphs for computer aided decision analysis,’’ IEEE Transactions on Software Engineering SE-12(4), 1980, pp. 538-546.

[^Ch]:  Chvatal, V., Linear Programming, W. H. Freeman, New York, 1983.

[^Cu]:  Cunningham, W. H., ‘‘A network simplex method,’’ Mathematical Programming 11, 1976, pp. 5-116.

[^DT]:  Di Battista, G., and R. Tamassia, ‘‘Algorithms for Plane Representations of Acyclic Digraphs,’’ eoretical Computer Science 61, 1988, pp. 175--198.

[^EMW]:  Eades, P., B. McKay and N. Wormald, ‘‘On an Edge Crossing Problem,’’ Proc. 9th Australian mputer Science Conf., 1986, pp. 327-334.

[^ET]:  Eades, P. and Roberto Tamassia, ‘‘Algorithms for Automatic Graph Drawing: An Annotated Bibliography,’’ Technical Report CS-89-09 (Revised Version), Brown University, Department of Computer Science, Providence RI, October 1989.

[^EW]:  Eades, P. and N. Wormald, ‘‘The Median Heuristic for Drawing 2-Layers Networks,’’ Technical Report 69, Dept. of Computer Science, Univ. of Queensland, 1986.

[^FA]:  Freeman, Herbert and John Ahn, ‘‘On The Problem of Placing Names in a Geographic Map,’’ International Journal of Pattern Recognition and Artificial Intelligence, 1(1), 1987, pp. 121-140. [GJ]:  Garey, Michael R. and David S. Johnson, Computers and Intractability, W. H. Freeman, San Francisco, 1979.

[^Gl]:  Glassner, Andrew S., Graphics Gems (editor), Academic Press, San Diego, 1990.

[^GNV1]:  Gansner, E. R., S. C. North and K.-P. Vo, ‘‘DAG - A Program that Draws Directed Graphs,’’ Software - Practice and Experience 17(1), 1988, pp. 1047-1062.

[^GNV2]:  Gansner, E. R., S. C. North and K.-P. Vo, ‘‘On the Rank Assignment Problem,’’ to be submitted.

[^GT]:  Goldberg, A. V. and R. E. Tarjan, ‘‘Finding minimum-cost circulations by successive approximation,’’ Mathematics of Operations Research, 15(3), 1990, pp. 430-466.

[^Ka]:  Karmarkar, N., ‘‘A new polynomial-time algorithm for linear programming,’’ Proc. 16th ACM STOC, Washington, 1984, pp. 302-311.

[^Kh]:  Khachiyan, L. G., ‘‘A polynomial algorithm in linear programming,’’ Sov. Math. Doklady 20, 1979, pp 191-194.

[^KN]:  Koutsofios, E., and S. North, ‘‘Drawing graphs with dot,’’ technical report (available from the authors), AT&T Bell Laboratories, Murray Hill NJ, 1992.

[^Ro]:  Robbins, G., ‘‘The ISI grapher, a portable tool for diplaying graphs pictorially,’’ Symboliikka ’87, Helsinki, Finland, also Technical Report IST/RS-87-196, Information Sciences Institute, Marina Del Rey, CA.

[^RDM]: Rowe, L. A., M. Davis, E. Messinger, C. Meyer, C. Spirakis, and A. Tuan, ‘‘A Browser for Directed Graphs,’’ Software - Practice and Experience 17(1), January, 1987, pp. 61-76.

[^STT]:  Sugiyama, K., S. Tagawa and M. Toda, ‘‘Methods for Visual Understanding of Hierarchical System Structures,’’ IEEE Transactions on Systems, Man, and Cybernetics SMC-11(2), February, 1981, pp. 109-125.

[^Su]:  Suri, Subhash. ‘‘A linear time algorithm for minimum link paths inside a simple polygon,’’ Computer Vision, Graphics, and Image Processing 35, 1986, pp. 99-110.

[^Ta]:  Tarjan, R. E. ‘‘Depth first search and linear graph algorithms,’’ SIAM Journal of Computing 1(2), 1972, pp. 146-160.

[^Wa]:  Warfield, John, ‘‘Crossing Theory and Hierarchy Mapping,’’ IEEE Transactions on Systems, Man, and Cybernetics SMC-7(7), July, 1977, pp. 505-523.

