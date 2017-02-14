思维导图自动布局算法
=================

## 概述

为了让整理思路的过程更流畅，市面上的思维导图软件一般采用自动布局，使用户不必关心图形布局也能画出比较优美的思维导图。而为了用相对较小的代价（需要实时交互，实时布局）实现自动布局，常见的思维导图软件处理的图数据格式都是树形数据。本文以经典思维导图软件XMind接受的数据格式为例，汇总常见的思维导图自动布局算法。

### 输入

```javascript
{
  "topics": [ // 扁平化，用parent来表示思维导图节点上下级关系的数据结构
    {
      "label": "root",
      "id": "root"
    },
    {
      "label": "child-1",
      "id": "child-1",
      "parent": "root"
    },
    {
      "label": "child-2",
      "id": "child-2",
      "parent": "root"
    },
    {
      "label": "child-1-1",
      "id": "child-1-1",
      "parent": "child-1"
    },
    {
      "label": "child-1-2",
      "id": "child-1-2",
      "parent": "child-1"
    }
  ],
  "links": [ // 上下级关系以外的额外连线
    {
      "source": "child-1-1",
			"label": "special link",
      "target": "child-2"
    }
  ]
}
```

### 输出

```javascript
{
	"nodes": [], // 带坐标信息的节点
	"edges": [], // 带起点终点坐标信息的边
}
```

## 算法汇总

### 经典布局 standard

### 右向树布局 rightTree

### 左向树布局 leftTree

### 右向鱼骨布局 rightFishBone

### 左向鱼骨布局 leftFishBone

### 弧树布局 arcTree

### 肘树布局 elbowTree

### 右向分层布局 rightHierarchical

### 向下分层布局 downwardHierarchical

### 组织结构布局 organizational

### 向上组织结构布局 upwardOrganizational

### 水平时间轴 horizontalTimeline

### 垂直时间轴 verticalTimeline

