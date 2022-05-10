# bluewave-charts

Library used to create charts and graphs using D3

## Demos
- [BarChart](https://bluewavetechnologies.github.io/bluewave-charts/demos/BarChart.html)
- [LineChart](https://bluewavetechnologies.github.io/bluewave-charts/demos/LineChart.html)
- [PieChart](https://bluewavetechnologies.github.io/bluewave-charts/demos/PieChart.html)
- [ScatterChart](https://bluewavetechnologies.github.io/bluewave-charts/demos/ScatterChart.html)
- [MapChart](https://bluewavetechnologies.github.io/bluewave-charts/demos/MapChart.html)
- [CalendarChart](https://bluewavetechnologies.github.io/bluewave-charts/demos/CalendarChart.html)
- [TreeMapChart](https://bluewavetechnologies.github.io/bluewave-charts/demos/TreeMapChart.html)

## Basic Usage

The chart classes all have a very similar constructor used to instantiate the class and an update() method used to render data. Example:

```javascript
  //Create pie chart using "demo1" div
    var div = document.getElementById("demo1");
    var pieChart = new bluewave.charts.PieChart(div, {
        labelOffset: 50
    });
    
    
  //Update the chart using custom data
    pieChart.update([
        {
            "key": "Complete",
            "value": 67.7
        },
        {
            "key": "Remaining",
            "value": 33.3
        }
    ]);    
```
