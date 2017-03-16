(function () {
    let rendered = false
    const Util = G2.Util
    const Shape = G2.Shape

    function getTextAttrs(cfg) {
        const textAttrs = Util.mix(true, {}, {
            fillOpacity: cfg.opacity,
            fontSize: cfg.size,
            rotate: cfg.origin._origin.rotate,
            text: cfg.origin._origin.text,
            textAlign: 'center',
            fill: cfg.color,
            textBaseline: 'Alphabetic'
        }, cfg.style)
        return textAttrs
    }

    // 给point注册一个词云的shape
    Shape.registShape('point', 'cloud', {
        drawShape: function (cfg, container) {
            cfg.points = this.parsePoints(cfg.points);
            const attrs = getTextAttrs(cfg)
            // 给容器添加text类型的shape
            // 坐标仍然是原来的坐标
            // 文字样式为通过getTextAttrs方法获取的样式
            const shape = container.addShape('text', {
                attrs: Util.mix(attrs, {
                    x: cfg.points[0].x,
                    y: cfg.points[0].y
                })
            })
            return shape
        }
    })

    const data = [
        {
            name: 'Tokenization',
            value: 8,
        },
        {
            name: 'Boolean Retrieval',
            value: 8,
        },
        {
            name: 'Crawler',
            value: 7,
        },
        {
            name: 'Page Ranking',
            value: 7,
        },
        {
            name: 'Index Construction',
            value: 7,
        },
        {
            name: 'Segmentation',
            value: 7,
        },
        {
            name: 'Language Recognition',
            value: 2,
        },
        {
            name: 'Optimization',
            value: 2,
        },
        {
            name: 'Word-sense Disambiguation',
            value: 3,
        },
        {
            name: 'New Words Recognition',
            value: 2,
        },
        {
            name: 'Format Analysis',
            value: 5,
        },
        {
            name: 'Dictionary',
            value: 2,
        },
        {
            name: 'Faulty Storage',
            value: 3,
        },
        {
            name: 'Large Scale Storage',
            value: 3,
        },
        {
            name: 'Text Mining',
            value: 7,
        },
        {
            name: 'Vertical Search',
            value: 3,
        },
        {
            name: 'Faceted Search',
            value: 3,
        },
    ]

    Reveal.addEventListener('slidechanged', (event) => {
        // event.previousSlide, event.currentSlide, event.indexh, event.indexv
        if (event.indexh === 6 && event.indexv === 0 && !rendered) {
            data.sort((a, b) =>  b.value - a.value)
            // 获取数据的最大值和最小值
            const max = data[0].value
            const min = data[data.length - 1].value
            // 构造一个词云布局对象
            const layout = new Cloud({
                // 传入数据源
                words: data,
                // 设定宽高（默认为500*500）
                width: 500,
                height: 500,
                // 设定文字大小配置函数(默认为12-40px的随机大小)
                size: (words) => {
                    // 将pv映射到canvas可绘制的size范围14-100(canvas默认最小文字为12px)
                    return ((words.value + 1 - min) / (max - min)) * (100 - 14) + 14
                },
                // 设定文字内容
                text: (words) => {
                    let text = words.name
                    return text
                }
            })
            // 执行词云布局函数，并在回调函数中调用G2对结果进行绘制
            layout.exec((texts) => {
                const chart = new G2.Chart({
                    id: 'other-subjects',
                    // canvas的宽高需要和布局宽高一致
                    width: 500,
                    height: 500,
                    plotCfg: {
                        margin: 0
                    }
                });
                chart.legend(false)
                chart.source(texts)
                chart.axis(false)
                chart.tooltip({
                    title: false
                })
                // 将词云坐标系调整为G2的坐标系
                chart.coord().reflect()
                // 绘制点图，在x*y的坐标点绘制自定义的词云shape，颜色根据text字段进行映射，大小根据size字段的真实值进行映射，文字样式配置为词云布局返回的样式，tooltip显示site*pv两个字段的内容
                chart.point().position('x*y').color('text').size('size', size => size).shape('cloud').style({
                    fontStyle: texts[0].style,
                    fontFamily: texts[0].font,
                    fontWeight: texts[0].weight
                });
                chart.render()
            })
            rendered = true
        }
    })
})()

