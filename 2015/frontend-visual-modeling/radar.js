(function() {
  var myChart = echarts.init(document.getElementById('radar'));
  var option = {
    //title : {
      //text: '常用可视化建模工具对比',
      //subtext: ''
    //},
    legend: {
      orient : 'vertical',
      x : 'right',
      y : 'bottom',
      data:[
        'mxGraph',
        'Joint',
        'jsPlumb',
        'Alloy-UI',
      ]
    },
    polar : [
      {
        indicator : [
          { text: '接口简单', max: 100 },
          { text: '功能完善', max: 100 },
          { text: '文档齐全', max: 100 },
          { text: '社区支持', max: 100 },
          { text: '可定制'  , max: 100 },
          { text: '设计合理', max: 100 },
        ]
      }
    ],
    calculable : true,
    series : [
      {
        name: '常用可视化建模工具',
        type: 'radar',
        data : [
          {
            value : [99, 99, 99, 80, 99, 99],
            name : 'mxGraph'
          },
          {
            value : [60, 60, 80, 60, 80, 80],
            name : 'Joint'
          },
          {
            value : [70, 50, 60, 50, 80, 40],
            name : 'jsPlumb'
          },
          {
            value : [80, 50, 40, 50, 50, 40],
            name : 'Alloy-UI'
          },
        ]
      }
    ]
  };
  myChart.setOption(option);
}());
