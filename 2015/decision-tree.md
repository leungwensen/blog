决策树算法
=========

## 概述

决策树是一种实现分治策略的层次数据结构。[^footnote-introduction-to-machine-learning]

举个 :chestnut: 要不要去见相亲对象呢？

```graph-TB
    A["年龄"] -->|>=30| no1("不见")
    A -->|<30| B["长相"]
    B -->|"丑"| no2("不见")
    B -->|"中等偏帅"| C["收入"]
    C -->|"<100k"| no3("不见")
    C -->|">=500"| yes1("见！💖")
    C -->|"(100k, 500k)"| D["程序🐵"]
    D -->|"是"| no4("什么鬼？")
    D -->|"否"| yes2("见！")
```

这就是一棵已经构造好的决策树，其中，每个矩形代表一个特征，每个圆角矩形代表一个类标签。输入数据后，根据不同的特征值过滤最终可以得到输入数据所属的类别。决策树算法的目标就是从一堆原始数据里构造这么一棵决策树，以作为预测、判断和决策的参考。

决策树算法可以用作分类（分类决策树）也可以用作回归（回归决策树），可以用于提取特征值、相关性分析、建立专家系统、搜索排序、邮件过滤等。

在2006年，国际数据挖掘社区推出的《数据挖掘十大算法》中评选出来的十大算法里有两个是决策树相关的算法（C4.5和CART），可见决策树算法算法在数据挖掘中应用的广泛程度。

## ID3(Iterative Dichotomiser 3)

![Ross Quinlan](./decision-tree/ross-quinlan.jpg)

ID3诞生于70年代末，由[Ross Quinlan](http://www.rulequest.com/Personal/)提出。这个算法倾向更小的树，并且越能带来熵减的决策节点离根节点越近。

ID3每次确定划分数据集S的特征时，会计算每一个未使用的属性，计算其[熵（Entropy）](https://en.wikipedia.org/wiki/Entropy_(information_theory)`H(S)`，然后选取导致最小熵值的属性作为特征值，分割数据集S得到子数据集。这是一种贪心算法，并不保证得到一棵最小树（找最小树的算法是NP完全算法），只是准确度和效率的一个权衡的结果。然后对每一个子数据集进行同样的处理，并且在下列情况下停止递归处理：

- 子数据集所有元素归属同一类别，这时创建叶子节点并标记为该类别
- 没有任何未使用的属性，这时创建叶子节点并标记为子数据集中出现次数最多的类别
- 子数据集中没有元素，这时创建叶子节点，并标记为父数据集中出现最多的类别

**熵值**的计算方式为：

```math
    H(S) = - \sum_{x \in X}p(x)log_{2}p(x)
```

- S: 当前数据集
- X: S中的所有类别
- p(x): 类别x在S中所占的比例

用ID3构建一棵决策树的过程可以用下述伪代码来表示：

```
tree = {};
tree.root = ID3(S);
function ID3(S){
    IF 数据集S纯度达到标准或者符合其它终止条件 THEN 返回类标签
    ELSE
        计算所有特征的熵值
        取最小熵值对应特征划分数据集S
        创建分支节点B
            FOR 每个划分的子数据集S'
                B.splitS' = ID3(S')
        RETURN 分支节点B
}
```

### ID3可视化

```html-
<div id="visualize-id3">
    <nav class="toolbar">
        <div class="menu menu-horizontal u-1-2">
            <ul class="menu-list">
                <li class="menu-item">
                    <span class="color-select menu-link" data-color="#33CCFF" style="background-color: #33CCFF;">&nbsp;</span>
                </li>
                <li class="menu-item">
                <li class="menu-item">
                    <span class="color-select menu-link" data-color="#009933" style="background-color: #009933;">&nbsp;</span>
                </li>
                <li class="menu-item">
                    <span class="color-select menu-link" data-color="#FF6600" style="background-color: #FF6600;">&nbsp;</span>
                </li>
                <li class="menu-item">
                    <span class="color-select menu-link" data-color="#FFC508" style="background-color: #FFC508;">&nbsp;</span>
                </li>
                <li class="menu-item">
                    <span class="btn-clear menu-link">清空</span>
                </li>
                <li class="menu-item">
                    <span class="menu-link">选择颜色并画点</span>
                </li>
            </ul>
        </div>
    </nav>
    <canvas class="training-canvas" width="450" height="450"></canvas>
    <svg class="decision-tree" width="450" height="450"><g/></svg>
</div>
```

```link-
./decision-tree/main.css
```

```script-
../lib/d3/d3.js
../lib/dagre-d3/dist/dagre-d3.js
./decision-tree/main.dist.js
```

forked from [lagodiuk/decision-tree-js](https://github.com/lagodiuk/decision-tree-js)

数据示例（x和y为特征列，color为预测分类）

```
{
    x: 200,
    y: 100,
    color: '#FFC508'
}
```

但这个例子不是非常纯粹的ID3实现，它对整数值进行了离散化。譬如这里是根据取值把坐标轴的划分为两个区间，每个区间对应同一个特征值的两个取值范围（譬如y>=200和y<200）。这里借鉴了一部分C4.5处理连续值的办法。

## C4.5(successor of ID3)

这个算法也是[Ross Quinlan](http://www.rulequest.com/Personal/)提出的，作为对ID3的改进。

算法过程与ID3算法在宏观上一致。

改进点：

### 选择特征列是通过信息增益率（而不是熵值）

其中，**[信息增益（IG）](https://en.wikipedia.org/wiki/Information_gain_in_decision_trees)**指的是计算某一个属性导致的熵值下降的幅度。其计算方法为：

```math
    IG(S,a) = H(S) - H(S|a)
            = H(S) - (
                \sum_{v \in vals(a)} \frac{|\{x \in S | x_{a} = v\}|}{|S|} \cdot
                H({x \in S|x_{a} = v})
            )
```

而，**[信息增益率（IGR）](https://en.wikipedia.org/wiki/Information_gain_ratio)**则是

```math
    IGR(S,a) = IG(S,a)/IV(S,a)
```

其中，IV(S,a)的定义为

```math
    IV(S,a) = - \sum_{v \in vals(a)} \frac{|\{x \in S | x_{a} = v\}|}{|S|} \cdot
            log_{2}(\frac{|\{x \in S | x_{a} = v\}|}{|S|})
```

### 在树构造的过程中剪枝

所谓的剪枝，就是用节点的子树或者子叶子节点来替换这个节点，以得到更低的错误率。为解决ID3过度拟合的问题，C4.5的软件包实现了基于悲观剪枝（Pessimistic Pruning）方法的剪枝。

这个方法通过递归地计算目标节点分支的错误率来获得这个目标节点的错误率。例如，对于一个有N个实例和E个错误（也就是和该叶子节点类别不一致的实例）的叶子节点，用`$(E + 0.5)/N$`表示这个叶子节点的错误率。假设一个节点有L个子节点，这些子节点共有`$\sum E$`个错误和`$\sum N$`个实例，那么该节点的错误率为`$(\sum E + 0.5xL)/\sum N$`。假设这个节点被它的最佳子节点替代后，在训练集上得到的错误分类数为J，那么如果`$(J + 0.5)$`在`$(\sum E + 0.5xL)$`的1标准差范围内，悲观剪枝法就采用这个子节点来替代该节点。

### 处理连续数据

选取多决策准则来产生分支。譬如上述可视化的实现中，对连续值x采取了这样的策略：

* 对每一个x的取值，把测试集分为(>= x)和(< x)两个分支
* 对每一个分支计算信息增益

不过Quinlan论文中讲到的两个处理连续值的方法比这个复杂。第一个方法是对每一个属性用信息增益率选择阀值，第二个方法是用Risannen的最小描述长度原理（MDL）。

### 处理数据缺失

在Quinlan的文献中有很多处理数据缺失的议题，其中比较重点的是三个。这里简单介绍一下问题并且提几个典型的解法。

#### 生成树分支的时候需要比较多个属性值，但有些属性在某些实例中没有值

* 直接忽略实例
* 填充属性值（常用值、均值或者最能带来信息增益的值等）

#### 选定属性后，没有该属性值的实例没有办法放入这个训练的任何输出中

* 直接忽略实例
* 选取常用值
* 切分用例放到每一个输出下

#### 构建好的树测试实例时有可能被测试用例缺失某个测试节点对应的属性值，这时如何让测试进行下去

* 如果对于缺失值有单独分支，走这个分支
* 选取最常用分支走
* 确定最可能的属性值，并填充这个属性值
* 不再走余下分支测试，直接设置成最常用类别

## 扩展阅读

### C5.0/See5

### CART(Classification and Regression Tree)

和C4.5的不同在于：

* CART算法可以不转换的情况下直接处理连续型和标称型数据
* CART算法没有停止准则，树会一直生长到最大尺寸
* CART算法的剪枝步骤采用的是代价复杂度（Cost-Complexity Pruning）

### 多变量树

上面讨论的算法都是基于一个输入维度来划分数据的，而构造**多变量树**时每个决策节点都可以使用所有的输入维度，因此更加一般化。当然这个已经超出本文的讨论范围了

### [随机森林](https://en.wikipedia.org/wiki/Random_forest)

### [GBDT](https://en.wikipedia.org/wiki/Gradient_boosting)

## 附录

### 参考资料

* [University of Regina cs831: Knowledge Discovery in Databases](http://www2.cs.uregina.ca/~dbd/cs831/index.html)
* [wiki: ID3_algorithm](https://en.wikipedia.org/wiki/ID3_algorithm)
* [Top10 data mining algrithms](http://www.cs.umd.edu/~samir/498/10Algorithms-08.pdf)

[^footnote-introduction-to-machine-learning]: 《机器学习导论》，Ethem Alpaydin著
