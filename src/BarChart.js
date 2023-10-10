if(!bluewave) var bluewave={};
if(!bluewave.charts) bluewave.charts={};

//******************************************************************************
//**  BarChart
//******************************************************************************
/**
 *   Chart used to display different categories of data using rectangular bars.
 *
 ******************************************************************************/

bluewave.charts.BarChart = function(parent, config) {

    var me = this;
    var defaultConfig = {
        layout: "vertical",
        animationSteps: 1500, //duration in milliseconds
        stackValues: false,
        borderRadius: 0,
        colors: d3.schemeCategory10,
        showTooltip: false
    };
    var svg, chart, plotArea;
    var x, y;
    var xAxis, yAxis;
    var layers = [];


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        me.setConfig(config);


        initChart(parent, function(s, g){
            svg = s;
            chart = g;
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
  //** getBarColor
  //**************************************************************************
    this.getBarColor = function(d, i, arr){
        var colors = config.colors;
        var barColor = config["barColor" + i];
        if (!barColor) {
            barColor = colors[i%colors.length];
            config["barColor" + i] = barColor;
        }
        return barColor;
    };


  //**************************************************************************
  //** getTooltipLabel
  //**************************************************************************
  /** Called whenever a tooltip is rendered. Override as needed.
   */
    this.getTooltipLabel = function(d, i, data){

        var label = me.getKeyLabel(d.key, d) + "<br/>" + me.getValueLabel(d.value);
        var group = config.group;
        if (group){
            group = (group+"").trim();
            if (group.length>0){
                try{
                    label = group + ": " + data[0][config.group] + "<br/>" + label;
                }
                catch(e){}
            }
        }

        return label;
    };


  //**************************************************************************
  //** getKeyLabel
  //**************************************************************************
  /** Called whenever a label is rendered
   */
    this.getKeyLabel = function(key, data){
        var xKey, yKey;
        var layout = config.layout;
        if (layout === "horizontal") {
            yKey = config.xAxis;
            xKey = config.yAxis;
        }
        else{
            xKey = config.xAxis;
            yKey = config.yAxis;
        }

        return xKey + ": " + key;
    };


  //**************************************************************************
  //** getValueLabel
  //**************************************************************************
  /** Called whenever a label is rendered
   */
    this.getValueLabel = function(value, data){

        var xKey, yKey;
        var layout = config.layout;
        if (layout === "horizontal") {
            yKey = config.xAxis;
            xKey = config.yAxis;
        }
        else{
            xKey = config.xAxis;
            yKey = config.yAxis;
        }

        var val = bluewave.chart.utils.parseFloat(value);
        if (!isNaN(val)) value = round(val, 2);

        return yKey + ": " + value;

    };


  //**************************************************************************
  //** getXAxis
  //**************************************************************************
    this.getXAxis = function(){
        return xAxis;
    };


  //**************************************************************************
  //** getYAxis
  //**************************************************************************
    this.getYAxis = function(){
        return yAxis;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        if (chart) chart.selectAll("*").remove();
    };


  //**************************************************************************
  //** addLine
  //**************************************************************************
    this.addLine = function(line, data, xAxis, yAxis){
        layers.push({
            line: line,
            data: data,
            xAxis: xAxis + "",
            yAxis: yAxis + ""
        });
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(chartConfig, data){
        me.clear();

        if (arguments.length>1){
            me.setConfig(chartConfig);
        }
        else{
            data = arguments[0];
        }


        checkSVG(me, function(){
            renderChart(data);
        });
    };


  //**************************************************************************
  //** getSVG
  //**************************************************************************
    this.getSVG = function(){
        return svg;
    };


  //**************************************************************************
  //** renderChart
  //**************************************************************************
    var renderChart = function(data){

        var chartConfig = config;


        var rect = javaxt.dhtml.utils.getRect(svg.node());
        var width = rect.width;
        var height = rect.height;
        var axisHeight = height;
        var axisWidth = width;
        plotArea = chart.append("g");
        plotArea
            .attr("width", width)
            .attr("height", height);



      //Get chart options
        var layout = chartConfig.layout;
        var stackValues = chartConfig.stackValues===true;
        var r = parseInt(chartConfig.borderRadius);
        if (isNaN(r) || r<0) r=0;


        var xKey;
        var yKey;


        var barType = chartConfig.barType;
        if (barType === "histogram"){
            xKey = chartConfig.values;
            yKey = xKey;
        }
        else{
            if (layout === "horizontal") {
                yKey = chartConfig.xAxis;
                xKey = chartConfig.yAxis;
            }
            else{
                xKey = chartConfig.xAxis;
                yKey = chartConfig.yAxis;
            }
        }
        if ((xKey===null || xKey===undefined) || (yKey===null || yKey===undefined)) return;


        var dataSets = data;



        var mergedData = d3.merge(dataSets);

        var maxData = createKeyValueDataset(mergedData, xKey, yKey);


        //To ensure max is found in line data - probably phenomenally inefficient
        if (layers.length > 0) {

            let max = d3.max(maxData, d => bluewave.chart.utils.parseFloat(d.value));

            layers.forEach(function(l){
                let lineData = l.data;
                let xKey = l.xAxis;
                let yKey = l.yAxis;
                let lineMax = d3.max(lineData, d=>bluewave.chart.utils.parseFloat(d[yKey]));

                if (lineMax > max){
                    maxData = createKeyValueDataset(lineData, xKey, yKey);
                }

            });

        }

        //Get sum of tallest bar
        //TODO: axis being set by first dataset - set with largest data

        //Sort bars if option checked
        var sort = chartConfig.sort;
        if (sort) {
            maxData.sort(function (a, b) {
                return d3[sort](a.value, b.value);
            });
        };



        var group = chartConfig.group;
        if (group){
            group = (group+"").trim();
            if (group.length===0) group = null;
        }



      //Reformat data if "group by" is selected
        if (group){

            dataSets = [];
            var map = d3.group(mergedData, d => d[group]);
            for (var key of map.keys()) {

                var arr = map.get(key);
                var groupName = arr[0][group];


                var temp = {};
                arr.forEach((d)=>{
                    var key = d[xKey];
                    var val = bluewave.chart.utils.parseFloat(d[yKey]);
                    if (isNaN(val)) val = 0;

                    if (temp.hasOwnProperty(key)){
                        temp[key] += val;
                    }
                    else{
                        temp[key] = val;
                    }
                });


                arr = [];
                for (var key in temp) {
                    if (temp.hasOwnProperty(key)){
                        var val = temp[key];
                        var entry = {};
                        entry[group] = groupName;
                        entry[xKey] = key;
                        entry[yKey] = val;
                        arr.push(entry);
                    }
                }

                dataSets.push(arr);
            };

        }
        else{
            stackValues = false;
        }



      //Get x and y values for each data set and format object for rendering
        var arr = [];
        for (let i=0; i<dataSets.length; i++){

            var n = i>0 ? (i+1) : "";

            let xAxisN = chartConfig[`xAxis${i+1}`];
            let yAxisN = chartConfig[`yAxis${i+1}`];

            //If axes not picked, skip pushing/rendering this dataset
            if ((!xAxisN || !yAxisN) && !group && barType !== "histogram" && i>0) continue;

            if (chartConfig.hasOwnProperty(`xAxis${i+1}`) && chartConfig.hasOwnProperty(`yAxis${i+1}`)){

                xKey = xAxisN;
                yKey = yAxisN;
            }


            var sumData = createKeyValueDataset(dataSets[i], xKey, yKey);
            arr.push(sumData);
        }



      //Create new maxData for axis rendering
        if (stackValues){
            maxData = createKeyValueDataset(d3.merge(arr), "key", "value");
        }
        else{
            maxData = [];
            arr.forEach((sumData)=>{
                maxData.push(...sumData);
            });
        }




        //Flip axes if layout is horizontal
        var leftLabel, bottomLabel;




      //Render X/Y axis
        var axisKey, axisValue;
        if (barType === "histogram") {
            axisKey = "key";
            axisValue = "key";
            if (layout === "vertical") {
                leftLabel = "Frequency";
                bottomLabel = chartConfig.xAxis;
            }
            else if (layout === "horizontal") {
                leftLabel = chartConfig.xAxis;
                bottomLabel = "Frequency";
            }
        }
        else{
            if (layout === "vertical") {
                axisKey = "key";
                axisValue = "value";
                leftLabel = chartConfig.yAxis;
                bottomLabel = chartConfig.xAxis;
            }
            else if (layout === "horizontal") {
                axisKey = "value";
                axisValue = "key";
                leftLabel = chartConfig.xAxis;
                bottomLabel = chartConfig.yAxis;
            }
        }


      //Render X/Y axis
        var axes = drawAxes(plotArea, axisWidth, axisHeight, axisKey, axisValue, maxData, null, chartConfig, "barChart");


      //Update X/Y axis as needed
        var margin = axes.margin;
        if (margin){

            var marginLeft = margin.left;
            var marginRight = margin.right;
            var marginTop = margin.top;
            var marginBottom = margin.bottom;



            if (marginTop>0 || marginBottom>0 || marginLeft>0 || marginRight>0){
                axisHeight-=(marginTop+marginBottom);
                axisWidth-=(marginLeft+marginRight);
                plotArea.selectAll("*").remove();
                plotArea
                    .attr(
                        "transform",
                        "translate(" + marginLeft + "," + marginTop + ")"
                    );

                axes = drawAxes(plotArea, axisWidth, axisHeight, axisKey, axisValue, maxData, null, chartConfig, "barChart");
            }
            margin = {
                top: marginTop,
                right: marginRight,
                bottom: marginBottom,
                left: marginLeft
            };
        }



      //Get x and y functions from the axes
        x = axes.x;
        y = axes.y;
        xAxis = axes.xAxis;
        yAxis = axes.yAxis;


        height = height-(margin.top+margin.bottom);
        width = width-(margin.left+margin.right);





      //Create defs tag as needed
        var defs;
        if (r) defs = plotArea.append("defs");


      //Create group for all the bars
        var barGroup = plotArea.append("g");


      //Mapping object to store accumulated values for stacking
        var keyMap = {};


      //Create bars for each dataset
        for (let i=0; i<dataSets.length; i++){

            var g = barGroup.append("g");
            var id = (Math.random() + 1).toString(36).substring(7);
            var sumData = arr[i];

            let fillOpacity = parseFloat(chartConfig["fillOpacity" + i]);
            if (isNaN(fillOpacity) || fillOpacity<0 || fillOpacity>1) fillOpacity = 1;


          //Define functions used to draw rectangles
            var _x, _y, getWidth, getHeight;
            if (stackValues){ //Only supports vertical layout for now

                let keyType = getType(sumData[0].key);
                if (keyType === "date") keyType = "string";

                _x = function (d) {
                    if (keyType === "date") {
                        return x(new Date(d.key));
                    }
                    else {
                        return x(d.key);
                    }
                };

                _y = function (d) {
                    var key = d.key;
                    var val = d.value;

                    //Check if key exists in keyMap and accumulate value
                    if (!keyMap[key]) keyMap[key] = 0;
                    var v = bluewave.chart.utils.parseFloat(val);
                    keyMap[key] += v;

                    return y(keyMap[key]);
                };

                let getY = function (d) {
                    var v = bluewave.chart.utils.parseFloat(d["value"]);
                    return y(v);
                };


                getWidth = function (d) {
                    return x.bandwidth ? x.bandwidth() : _x(d);
                };

                getHeight = function (d) {
                    return y.bandwidth
                        ? y.bandwidth()
                        : (height - getY(d));
                };

            }
            else{

                if (barType === "histogram"){


                    let binWidth = parseInt(chartConfig.binWidth);
                    if (isNaN(binWidth) || binWidth<1) binWidth = 10;

                    //Ensure consistent bin size
                    x.nice();

                    var histogram = d3.histogram()
                        .value(function(d) { return d.key; })
                        .domain(x.domain())
                        .thresholds(x.ticks(binWidth));


                        //TODO: find general solution for time and ordinal scale
                        // .thresholds(x.domain()) //Not sure why this doesn't work for dates/strings

                    var bins = histogram(sumData);

                    var frequencyMax = d3.max(bins, d => d.length)

                    var frequencyAxis = d3.scaleLinear()
                        .range(layout === "vertical" ? [height, 0] : [0, width]);
                        frequencyAxis.domain([0, frequencyMax]);

                    if (layout === "vertical") displayHistogramAxis(x, frequencyAxis, axisHeight);
                    else if(layout === "horizontal") displayHistogramAxis(frequencyAxis, y, axisHeight);

                    _x = function (d) {
                        return (layout === "vertical") ? x(d.x0) : 0;
                    };

                    _y = function (d) {
                        return (layout === "vertical") ? frequencyAxis(d.length) : height - x(d.x1)/(width/height) //This is a dumb way of doing this probably
                        // y(d.key) - height/sumData.length / 2;
                    };

                    getWidth = function (d) {
                        return (layout === "vertical") ? (x(d.x1) - x(d.x0) - 0.5) : frequencyAxis(d.length);
                    };

                    getHeight = function (d) {
                        return (layout === "vertical") ? height - frequencyAxis(d.length) : (x(d.x1) - x(d.x0))/(width/height) - 0.5;
                    };

                }
                else { //regular bar chart


                    let keyType = getType(sumData[0].key);
                    if (keyType === "date") keyType = "string";

                    var getX = function (d) {
                        if (keyType === "date") {
                            return x(new Date(d.key));
                        }
                        else {
                            return x(d.key);
                        }
                    };

                    var getY = function(d){
                        var v = bluewave.chart.utils.parseFloat(d["value"]);
                        return y(v);
                    };


                    if (y.bandwidth || x.bandwidth) {

                        if (chartConfig.layout === "vertical"){

                            getWidth = function(d){
                                if(group){
                                    return x.bandwidth ? x.bandwidth()/dataSets.length : getX(d);
                                }
                                else{
                                    return x.bandwidth ? x.bandwidth() : getX(d);
                                }
                            };

                            getHeight = function(d) {
                                return y.bandwidth
                                    ? y.bandwidth()
                                    : height - getY(d);
                            };

                            _x = function(d) {
                                var w = getWidth(d);
                                var left = x.bandwidth ? getX(d) : 0;
                                return group ? left+(w*i): getX(d);
                            };

                            _y = getY;

                        }
                        else if(chartConfig.layout === "horizontal"){

                            _x = function(){
                                return 0;
                            };

                            _y = function (d) {
                                var w = y.bandwidth ? y.bandwidth()/dataSets.length : height - y(d["key"]);
                                var left = y.bandwidth ? y(d["key"]) : 0;
                                return group ? left+(w*i): y(d["key"]);

                            };

                            getWidth = function (d) {
                                return x.bandwidth ? x.bandwidth() : x(d["value"]);
                            };

                            getHeight = function (d) {

                                if (group){
                                    return y.bandwidth ? y.bandwidth()/dataSets.length : height - y(d["value"]);
                                }
                                else{
                                    return y.bandwidth ? y.bandwidth() : height - y(d["value"]);
                                }
                            };
                        }
                    }
                    else { //No bandwith

                        if (chartConfig.layout === "vertical") {

                            _x = function (d) {
                                var xStart = getX(d) - width/sumData.length / 2;
                                if (group){
                                    var maxWidth = width/sumData.length;
                                    var barWidth = maxWidth/dataSets.length;
                                    xStart += (barWidth*i);
                                }
                                return xStart;
                            };

                            _y = getY;

                            getHeight = function (d) {
                                return height - getY(d);
                            };

                            getWidth = function (d) {
                                var maxWidth = width/sumData.length;
                                if (group){
                                    return (maxWidth/dataSets.length);
                                }
                                else{
                                    return maxWidth - 5;
                                }
                            };
                        }

                        else if (chartConfig.layout === "horizontal") {

                            _x = function (d) {
                                return 0;
                            };

                            _y = function (d) {
                                if (keyType === "date") {
                                    return y(new Date(d.key)) - height/sumData.length / 2;
                                }
                                else {
                                    return y(d.key) - height/sumData.length / 2;
                                }
                            };

                            getHeight = function (d) {
                                return height/sumData.length-5;
                            };

                            getWidth = function (d) {
                                return x(d["value"]);
                            };
                        }
                    }
                }
            }



          //Create clip path as needed
            if (r){
                if (stackValues){
                    console.log(i);
                    r = 0;
                }
                else{

                    defs.selectAll("*")
                    .data(sumData)
                    .enter()
                    .append("clipPath").attr("id", function(d, n, j){
                        return "round-corner-"+ id + n;
                    })
                    .append("rect")
                    .attr("rx", r)
                    .attr("ry", r)
                    .attr("x", function(d){
                        if (chartConfig.layout === "vertical"){
                            return _x(d);
                        }
                        else if (chartConfig.layout === "horizontal"){
                            return _x(d)-r;
                        }
                    })
                    .attr("y", _y)
                    .attr("height", function(d){
                        if (chartConfig.layout === "vertical"){
                            return getHeight(d) + r;
                        }
                        else if (chartConfig.layout === "horizontal"){
                            return getHeight(d);
                        }
                    })
                    .attr("width", function(d){
                        if (chartConfig.layout === "vertical"){
                            return getWidth(d);
                        }
                        else if (chartConfig.layout === "horizontal"){
                            return getWidth(d)+r;
                        }
                    });
                }
            }



          //Create bars
            g.selectAll("*")
                .data(sumData)
                .enter()
                .append("rect")
                .attr("x", _x)
                .attr("y", _y)
                .attr("height", getHeight)
                .attr("width", getWidth)
                .attr("opacity", fillOpacity)
                .attr("clip-path", function(d, n, j){
                    if (r) return "url(#round-corner-" + id + n + ")";
                    else return "";
                })
                .attr("barID", function(d, n, j){
                    return group ? i : 0;
                });

        }


        var getBarData = function(barID, d){
            var arr = [];
            var dataSet = dataSets[barID];
            for (var j=0; j<dataSet.length; j++){
                if (dataSet[j][xKey]===d.key){
                    arr.push(dataSet[j]);
                }
            }
            return arr;
        };



      //Set bar colors
        var bars = barGroup.selectAll("rect");
        bars.each(function (d, i) {
            let bar = d3.select(this);
            let barID = parseInt(bar.attr("barID"));
            var arr = getBarData(barID, d);
            bar.attr("fill", me.getBarColor(d, barID, arr));
        });



      //Set bar transitions
        var animationSteps = chartConfig.animationSteps;
        if (!isNaN(animationSteps) && animationSteps>50){

          //Persist original position/dimension attributes
            var clips;
            if (r){
                clips = defs.selectAll("rect");
                clips
                    .attr("yInitial", function () {
                        return this.getAttribute("y");
                    })
                    .attr("heightInitial", function () {
                        return this.getAttribute("height");
                    })
                    .attr("widthInitial", function () {
                        return this.getAttribute("width");
                    });
            }
            else{
                bars
                    .attr("yInitial", function () {
                        return this.getAttribute("y");
                    })
                    .attr("heightInitial", function () {
                        return this.getAttribute("height");
                    })
                    .attr("widthInitial", function () {
                        return this.getAttribute("width");
                    });
            }


            if (layout === "vertical"){

                if (clips){
                    clips.attr("y", height).attr("height", r);
                    clips.transition().duration(animationSteps)
                        .attr("y", function () {
                            return parseFloat(this.getAttribute("yInitial")) ;
                        })
                        .attr("height", function () {
                            return parseFloat(this.getAttribute("heightInitial")) ;
                        });
                }
                else{
                    bars.attr("y", height).attr("height", 0);
                    bars.transition().duration(animationSteps)
                        .attr("y", function () {
                            return parseFloat(this.getAttribute("yInitial")) ;
                        })
                        .attr("height", function () {
                            return parseFloat(this.getAttribute("heightInitial")) ;
                        });
                }
            }
            else if(layout === "horizontal"){

                if (clips){
                    clips.attr("width", 0);
                    clips.transition().duration(animationSteps)
                        .attr("width", function () {
                            return parseFloat(this.getAttribute("widthInitial"));
                        });
                }
                else{
                    bars.attr("x", 0).attr("width", 0);
                    bars.transition().duration(animationSteps)
                        .attr("width", function () {
                            return parseFloat(this.getAttribute("widthInitial"));
                        });
                }
            }
        }


        var tooltip;
        if (config.showTooltip===true){
            tooltip = createTooltip();
        }

        var mouseover = function(e, d) {
            if (tooltip){
                let bar = d3.select(this);
                let barID = parseInt(bar.attr("barID"));
                var arr = getBarData(barID, d);
                var label = me.getTooltipLabel(d, barID, arr);
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


        //Create d3 event listeners for bars
        var addMouseEvents = function(){

            if (!animationSteps) animationSteps = 0;
            setTimeout(function(){

                bars.on("mouseover", mouseover);
                bars.on("mousemove", mousemove);
                bars.on("mouseleave", mouseleave);

            }, animationSteps);
        };


        var getSiblings = function(bar){
            var arr = [];
            bars.each(function() {
                arr.push(this);
            });
            return arr;
        };

        bars.on("click", function(e, d){
            // me.onClick(this, getSiblings(this));
            var barID = parseInt(d3.select(this).attr("barID"));
            me.onClick(this, barID, d);
        });

        bars.on("dblclick", function(e, d){
            me.onDblClick(this, getSiblings(this));
        });


        //Render lines
        layers.forEach(function(layer){

            renderLine(layer);
        });

        //Draw grid lines
        if (chartConfig.xGrid || chartConfig.yGrid){
            drawGridlines(plotArea, x, y, axisHeight, axisWidth, chartConfig.xGrid, chartConfig.yGrid);
        }

        addMouseEvents();
    };


  //**************************************************************************
  //** onClick
  //**************************************************************************
    this.onClick = function(bar, bars){};
    this.onDblClick = function(bar, bars){};



  //**************************************************************************
  //** displayHistogramAxis
  //**************************************************************************
    var displayHistogramAxis = function (x, y, axisHeight) {

        if (xAxis) xAxis.selectAll("*").remove();
        if (yAxis) yAxis.selectAll("*").remove();

        xAxis = plotArea
            .append("g")
            .attr("transform", "translate(0," + axisHeight + ")")
            .call(d3.axisBottom(x));

            xAxis
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

        yAxis = plotArea
            .append("g")
            .call(d3.axisLeft(y));
    };


  //**************************************************************************
  //** renderLine
  //**************************************************************************
    var renderLine = function(layer){

        var xKey = layer.xAxis;
        var yKey = layer.yAxis;

        var lineConfig;
        if (layer.line.getConfig) lineConfig = layer.line.getConfig();
        if (!lineConfig) lineConfig = new bluewave.chart.Line().getConfig();

        let lineColor = lineConfig.color;
        let lineStyle = lineConfig.style;
        let lineWidth = lineConfig.width;
        let opacity = lineConfig.opacity;
        let smoothing = lineConfig.smoothing;


        var getX = function(d){
            var xoffset = x.bandwidth()/2;

            if(keyType==="date"){
                return x(new Date(d.key)) + xoffset;
            }else{
                return x(d.key) + xoffset;
            }
        };

        var getY = function(d){
            var v = bluewave.chart.utils.parseFloat(d["value"]);
            return y(v);
        };


        var getLine = function(){
            if (smoothing && smoothing !== "none"){
                return d3.line().x(getX).y(getY).curve(d3[smoothing]);
            }
            return d3.line().x(getX).y(getY);
        };


        var sumData = createKeyValueDataset(layer.data, xKey, yKey);
        let keyType = getType(sumData[0].key);
        if(keyType == "date") keyType = "string";


        plotArea
            .append("path")
            .datum(sumData)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", lineWidth)
            .attr("opacity", opacity)
            .attr("stroke-dasharray", function (d) {
                if (lineStyle === "dashed") return "5, 5";
                else if (lineStyle === "dotted") return "0, 5";
            })
            .attr("stroke-linecap", function (d) {
                if (lineStyle === "dotted") return "round";
            })
            .attr("d", getLine());

    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var checkSVG = bluewave.chart.utils.checkSVG;

    var initChart = bluewave.chart.utils.initChart;
    var drawAxes = bluewave.chart.utils.drawAxes;
    var createTooltip = bluewave.chart.utils.createTooltip;
    var drawGridlines = bluewave.chart.utils.drawGridlines;
    var getType = bluewave.chart.utils.getType;
    var createKeyValueDataset = bluewave.chart.utils.createKeyValueDataset;
    var round = javaxt.dhtml.utils.round;

    init();
};