if(!bluewave) var bluewave={};
if(!bluewave.charts) bluewave.charts={};

//******************************************************************************
//**  PieChart
//******************************************************************************
/**
 *   Circle chart that uses pie slices to show relative sizes of data.
 *
 ******************************************************************************/

bluewave.charts.PieChart = function(parent, config) {

    var me = this;
    var defaultConfig = {
        pieKey: "key",
        pieValue: "value",
        pieCutout: 0.0,

      /** Used to indicate whether to sort the slices by either "key" or "value".
       *  If niether a "key" or "value" is specified, nothing will be sorted.
       */
        pieSort: false,

      /** Used to indicate the sort direction. Options are either "ascending" or
       *  "descending". Only applied when the pieSort is set to "key" or "value".
       */
        pieSortDir: "ascending",

      /** Used to specify the maximum number of slices to render in the chart.
       *  This config is specified as an integer value.
       */
        maximumSlices: null,

        showLabels: true,
        labelOffset: 100,

      /** If true and if the pieCutout is greater than 0, will render a label in
       *  the center of the pie chart. By default, the label will render the sum
       *  of all the values in the chart. This can be overridden with a custom
       *  getCenterLabel() method.
       */
        showSum: false,

        lineColor: "#777",
        borderColor: "#777",
        extendLines: false,
        colors: ["#6699cc","#f8f8f8"], //start->end
        otherColor: "#b8b8b8",
        animationSteps: 1500
    };
    var svg, pieArea;
    var numSlices;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        me.setConfig(config);

        initChart(parent, function(s, g){
            svg = s;
            pieArea = g;
        });
    };


  //**************************************************************************
  //** setConfig
  //**************************************************************************
    this.setConfig = function(chartConfig){
        if (!chartConfig) config = defaultConfig;
        else config = merge(chartConfig, defaultConfig);
    };


  //**************************************************************************
  //** getTooltipLabel
  //**************************************************************************
  /** Called whenever a tooltip is rendered. Override as needed.
   */
    this.getTooltipLabel = function(d, i){
        return me.getKeyLabel(d.key, d) + "<br/>" + me.getValueLabel(d.value);
    };


  //**************************************************************************
  //** getKeyLabel
  //**************************************************************************
  /** Called whenever a label is rendered
   */
    this.getKeyLabel = function(key, data){
        return key;
    };


  //**************************************************************************
  //** getValueLabel
  //**************************************************************************
  /** Called whenever a label is rendered
   */
    this.getValueLabel = function(value, data){
        var val = bluewave.chart.utils.parseFloat(value);
        if (isNaN(val)) return value;
        return round(val, 2);
    };


  //**************************************************************************
  //** getCenterLabel
  //**************************************************************************
  /** Called to create a label in the center of the pie chart when showSum is
   *  true and the pieCutout is greater than 0
   */
    this.getCenterLabel = function(pieData){
        var sum = 0;
        pieData.forEach((d)=>{
            sum+=d.value;
        });

        var units = "";
        if (sum>=1000){
            sum = Math.round(sum/1000);
            units = "k";

            if (sum>=1000){
                sum = Math.round(sum/1000);
                units = "M";

                if (sum>=1000){
                    sum = Math.round(sum/1000);
                    units = "B";
                }

                if (sum>=1000){
                    sum = Math.round(sum/1000);
                    units = "T";
                }
            }
        }
        return sum+units;
    };


  //**************************************************************************
  //** getNumSlices
  //**************************************************************************
  /** Returns the total number of slices in the pie chart
   */
    this.getNumSlices = function(){
        return numSlices;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        clearChart();
        numSlices = 0;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(data, key, value){
        clearChart();

        if (arguments.length>0){
            if (arguments.length===1){
                //Use pieKey and pieValue
            }
            else{
                if (typeof key === "string"){
                    config.pieKey = key;
                    config.pieValue = value;
                }
                else{
                  //bluewave explorer
                    me.setConfig(arguments[0]);
                    data = arguments[1];
                }
            }
        }

        checkSVG(me, function(){
            update(data);
        });
    };


  //**************************************************************************
  //** getSVG
  //**************************************************************************
    this.getSVG = function(){
        return svg;
    };


    var clearChart = function(){
        if (pieArea){
            pieArea.node().innerHTML = "";
            pieArea.attr("transform", null);
        }
    };

    var update = function(data){

        if (isArray(data) && isArray(data[0])) data = data[0];
        if (!config.pieKey || !config.pieValue) return;



      //Create data for the pie chart
        var pieData = createKeyValueDataset(data, config.pieKey, config.pieValue);


      //Sort values as needed
        var pieSort = (config.pieSort+"").toLowerCase();
        var sortDir = (config.pieSortDir+"").toLowerCase();
        var maxSlices = parseFloat(config.maximumSlices);
        if (pieSort === "key") {
            pieData.sort(function(a, b){
                return sort(a.key,b.key,sortDir);
            });
        }
        else if(pieSort === "value") {
            pieData.sort(function(a,b){
                return sort(a.value,b.value,sortDir);
            });
        }
        else{
            maxSlices = null;
        }



      //Truncate data as needed
        numSlices = pieData.length;
        var hasOther = false;
        if (!isNaN(maxSlices) && maxSlices>0) {
            if (maxSlices<numSlices){

                var otherSlices;
                if (sortDir==="descending"){
                    otherSlices = pieData.slice(maxSlices);
                    pieData = pieData.slice(0, maxSlices);
                }
                else{
                    otherSlices = pieData.slice(0, numSlices-maxSlices);
                    pieData = pieData.slice(numSlices-maxSlices, numSlices);
                }

                if (config.showOther===true){

                    var otherSlicesValue = 0;
                    otherSlices.forEach(function(d){
                        var val = d.value;
                        if (!isNaN(val)) otherSlicesValue+=val;
                    });

                    pieData.push({key: "Other", value: otherSlicesValue});
                    hasOther = true;
                }

                numSlices = pieData.length;
            }
        }



        var padding = 0;
        if (typeof config.piePadding !== "undefined") {
            padding = config.piePadding * Math.PI / 180;
        }

        var pie = d3.pie().value(function (d) {
            return d.value;
        })
        .sort(null)
        .padAngle(padding);



        pieData = pie(pieData);



      //Get parent width/height
        var rect = javaxt.dhtml.utils.getRect(svg.node());
        var width = rect.width;
        var height = rect.height;




      //Create group to store all the elements of the pie chart
        var pieChart = pieArea.append("g");
        pieChart.attr("transform",
            "translate(" + width/2 + "," + height/2 + ")"
        );


      //Compute inner and outer radius for the pie chart
        var radius = Math.min(width, height) / 2;
        var cutout = parseFloat(config.pieCutout);
        if (isNaN(cutout)) cutout = 0.65;
        var innerRadius = radius*cutout;


        var tooltip;
        if (config.showTooltip===true){
            tooltip = createTooltip();
        }


        var mouseover = function(e, d) {
            if (tooltip){
                var label = me.getTooltipLabel(d.data);
                tooltip.html(label).show();
            }
            d3.select(this).transition().duration(100).attr("opacity", "0.8");
        };

        var mousemove = function(e) {
            if (tooltip) tooltip
            .style('top', (e.clientY) + "px")
            .style('left', (e.clientX + 20) + "px");
        };

        var mouseleave = function() {
            if (tooltip) tooltip.hide();
            d3.select(this).transition().duration(100).attr("opacity", "1");
        };




      //Set fill colors
        var colors = config.colors;
        var numColors = hasOther ? numSlices-1 : numSlices;
        if (numColors>config.colors.length){
            colors = getColorRange(numColors, colors);
        }
        if (hasOther) colors.push(config.otherColor);


        var arc = d3.arc()
         .innerRadius(innerRadius)
         .outerRadius(radius);

      //Render pie chart
        var pieGroup = pieChart.append("g");
        pieGroup.attr("name", "pie");
        pieGroup.selectAll("*")
        .data(pieData)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", function (d,i) {
            return colors[i];
        })
        .attr("stroke", config.borderColor)
        .style("stroke-width", "1px")
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);



      //Create label in the center of the pie chart as needed
        var showSum = config.showSum===true ? true : false;
        if (showSum && cutout>0){
            var text = me.getCenterLabel(pieData);
            if (text){
                var label = pieChart.append("text")
                  .attr("text-anchor", "middle")
                  .attr('font-size', '4em')
                  .attr('y', 20);

                label.text(text);
            }
        }



      //Render lines and labels as needed
        var showLabels = config.showLabels===true ? true : false;
        var labelGroup;
        if (showLabels && pieData[0].data.key !== "undefined" && !isNaN(pieData[0].value)){

          //Create label group
            labelGroup = pieChart.append("g");
            labelGroup.attr("name", "labels");


            var labelOffset = parseFloat(config.labelOffset);
            if (isNaN(labelOffset) || labelOffset<0) labelOffset = 100;
            var labelEnd = 0;
            if (labelOffset>100){
                labelEnd = radius * (labelOffset/100);
            }
            else{
                var w = radius-innerRadius;
                labelEnd = innerRadius + w*(labelOffset/100);
            }

            var extendLines = config.extendLines===true ? true : false;
            if (extendLines && labelOffset<=110) extendLines = false;


          //Create donut used to define the start of the lines
            var firstArc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(innerRadius + (radius - innerRadius) * 90/50); //line starts slightly inside the pie


          //Create donut used to define the second point on the lines. If
          //we're extending lines, this will be used to define the midpoint
          //of the lines. Otherwise, this will be used to define the end of
          //the lines.
            var secondArc = d3.arc()
            .innerRadius(radius)
            .outerRadius(radius+((labelEnd-radius)*2)); //side thickness 2x larger than the labelOffset



            var labelPadding = parseFloat(config.labelPadding+"");
            if (isNaN(labelPadding)) labelPadding = 5;

            var thirdArc = d3.arc()
            .innerRadius(radius)
            .outerRadius(radius+((labelEnd-radius)*2)+labelPadding);



          //Debugging code used to render labelOffset
            var debug = false;
            if (debug){
                var testGroup = pieChart.append("g").attr("name", "test");
                testGroup.selectAll("*")
                .data([{
                    startAngle: 0,
                    endAngle: 360*Math.PI/180
                }])
                .enter()
                .append("path")
                .attr("d", d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(labelEnd))
                .attr("fill", "none")
                .attr("stroke", "#ff0000")
                .attr("stroke-width", 1);
            }



          //Add the polylines between chart and labels
            let endPoints = [];
            var lineGroup = pieChart.append("g");
            lineGroup.attr("name", "lines");
            lineGroup.selectAll("*")
            .data(pieData)
            .enter()
            .append("polyline")
            .attr("opacity", "0")
            .attr("stroke", config.lineColor)
            .style("fill", "none")
            .attr("stroke-width", 0.7)
            .attr("points", function(d) {

              //Create line
                var a = firstArc.centroid(d);
                var b = secondArc.centroid(d);
                var line = [a, b];


              //Check angle to see if the X position is right or left
                var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                var isRight = (midangle < Math.PI ? true : false);



              //Update line as needed and update endPoints array for label offset
                if (extendLines){

                  //Add 3rd coordinate
                    var x = labelEnd * (isRight ? 1 : -1); //x coordinate
                    var y = b[1]; //y coordinate
                    line.push([x,y]);


                  //Set endpoint
                    endPoints.push([x + (isRight ? labelPadding : -labelPadding), y]);

                }
                else{

                  //Compute endpoint using thirdArc
                    var c = thirdArc.centroid(d);
                    var l = [a, c];
                    endPoints.push(l[l.length-1]);
                }



                return line;
            });

            if (labelOffset > 110) {
                lineGroup.selectAll("polyline").attr("opacity", "1");
            }


          //Add the labels
            labelGroup.selectAll("*")
            .data(pieData)
            .enter()
            .append("text")
            .attr("class", "tick")
            .text(function(d) {
                return me.getKeyLabel(d.data.key, d.data);
            })
            .attr("transform", function (d, i) {
                return "translate(" + endPoints[i] + ")";
            })
            .style("text-anchor", function(d, i) {
                if (i==numSlices-1 && !extendLines){
                    return "middle";
                }
                else{
                    var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                    return midangle < Math.PI ? "start" : "end";
                }
            });



          //Get dimension of all the elements in the chart
            var box = getMinMax(pieArea);
            box.width = (box.maxX - box.minX)*1.1;
            box.height = (box.maxY - box.minY)*1.1;




          //Update pieChart scale and position as needed
            if (box.width>width || box.height>height){
                var scale, x, y;
                var widthDiff = box.width - width;
                var heightDiff = box.height - height;

                if (widthDiff > heightDiff){
                    scale = width/box.width;
                    if (scale>1){
                        scale = 1+(1-scale);
                    }
                    x = width/2; //needs to be updated...
                    y = height/2;
                }
                else if (heightDiff > widthDiff) {
                    scale = height/box.height;
                    x = width/2;
                    y = (box.height); //not quite right...
                }


              //Get text height before scaling
                var orgTextHeight = 0;
                labelGroup.selectAll("text").each(function(d, i) {
                    if (i===0){
                        var box = javaxt.dhtml.utils.getRect(this);
                        orgTextHeight = box.height;
                    }
                });


              //Apply scaling and position
                pieChart
                  .attr("transform",
                    "translate(" + x + "," + y + ") " +
                    "scale(" + scale + ")"
                );



              //Get text height after scaling
                var currTextHeight = 0;
                labelGroup.selectAll("text").each(function(d, i) {
                    if (i===0){
                        var box = javaxt.dhtml.utils.getRect(this);
                        currTextHeight = box.height;
                    }
                });




                if (currTextHeight<orgTextHeight){
                    var labelScale = orgTextHeight/currTextHeight;
                    labelGroup.selectAll("text").each(function(d, i) {
                        console.log(this);
                        var translate = this.getAttribute('transform');
                        this.setAttribute('transform', translate + " scale(" + labelScale + ")");
                        //console.log(this.getAttribute('transform'));
                    });
                }





              //Update position
                //var rect = javaxt.dhtml.utils.getRect(parent);
                var y = rect.y;
                var x = rect.x;
                var cx = rect.x+(rect.width/2);
                var cy = rect.y+(rect.height/2);

                var rect = javaxt.dhtml.utils.getRect(pieChart.node());
                var dy = (height - rect.height)/2;
                var dx = (width - rect.width)/2;


                var x2 = rect.x+(rect.width/2);
                var y2 = rect.y+(rect.height/2);

                var dx = cx-x2;
                var dy = cy-y2;



                //console.log(cx, x2, dx, width/2);
                //console.log(cy, y2, dy, height/2);

                if (dy<0){
                    dy = 0; //seems to work - not sure why
                }

                if (dx<0){
                    dx = 0; //not tested
                }


                pieChart
                  .attr("transform",
                    "translate(" + ((width/2)+dx) + "," + ((height/2)+dy) + ") " +
                    "scale(" + scale + ")"
                );

            }

        };


      //Add animations
        var animationSteps = config.animationSteps;
        if (!isNaN(animationSteps) && animationSteps > 50) {

            var totalDelay = 0;
            animationSteps /= 2;
            var arcs = pieGroup.selectAll("path");


            var zeroaArc = d3.arc()
           .innerRadius(0)
           .outerRadius(0);
           //Reset arcs
            arcs.attr("d", zeroaArc);

            arcs
            .transition().delay(function (d, i) {
              var angleDiff = Math.abs(d.startAngle - d.endAngle) + (d.padAngle);
              var angleRatio = angleDiff / (2 * Math.PI);

              var thisDelay = totalDelay;
              var nextDelay = angleRatio * animationSteps;

              totalDelay += nextDelay ;

              return thisDelay;
            })
            .duration(function (d) {
              var angleDiff = Math.abs(d.startAngle - d.endAngle) + (d.padAngle);
              var angleRatio = angleDiff / (2 * Math.PI);
              return angleRatio * animationSteps;
            })
            .ease(d3.easeLinear)
            .attrTween('d', function (d) {
                var interpolater = d3.interpolate(d.startAngle, d.endAngle);
                return function (t) {
                    d.endAngle = interpolater(t);
                    return arc(d);
                };
            });


            if (showLabels){

                var labels = labelGroup.selectAll("text");
                var polylines = lineGroup.selectAll("polyline");

                //Reset opacity for lines and labels to 0 for transition
                polylines.attr("opacity", 0);
                labels.attr("opacity", 0);

                var delayTransition = function(d, i){
                    return i*animationSteps/numSlices;
                };

              //All the coordinates for the labels and polylines are in endPoints, so we can do any positioning transition I think
                if (labelOffset > 110) {
                    polylines.transition()
                      .delay(delayTransition)
                      .duration(animationSteps)
                      .attr("opacity", 1);
                }


              labels.transition()
                .delay(delayTransition)
                .duration(animationSteps)
                .attr("opacity", 1);
            }


        };

    };


  //**************************************************************************
  //** sort
  //**************************************************************************
    var sort = function(x, y, sortDir){

        var compareStrings = (typeof x === "string" && typeof y === "string");

        sortDir = (sortDir+"").toLowerCase();
        if (sortDir === "descending") {
            if (compareStrings) return y.localeCompare(x);
            else return y-x;
        }
        else{
            if (compareStrings) return x.localeCompare(y);
            else return x-y;
        }
    };


  //**************************************************************************
  //** getMinMax
  //**************************************************************************
    var getMinMax = function(g){
        var minX = Number.MAX_VALUE;
        var maxX = 0;
        var minY = Number.MAX_VALUE;
        var maxY = 0;
        g.selectAll("*").each(function(){
            var rect = javaxt.dhtml.utils.getRect(d3.select(this).node());
            minX = Math.min(rect.left, minX);
            maxX = Math.max(rect.right, maxX);
            minY = Math.min(rect.top, minY);
            maxY = Math.max(rect.bottom, maxY);
        });
        return {
            minX: minX,
            maxX: maxX,
            minY: minY,
            maxY: maxY
        };
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var checkSVG = bluewave.chart.utils.checkSVG;
    var isArray = bluewave.chart.utils.isArray;
    var initChart = bluewave.chart.utils.initChart;
    var getColorRange = bluewave.chart.utils.getColorRange;
    var createTooltip = bluewave.chart.utils.createTooltip;
    var createKeyValueDataset = bluewave.chart.utils.createKeyValueDataset;
    var round = javaxt.dhtml.utils.round;

    init();
};