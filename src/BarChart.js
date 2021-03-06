if(!bluewave) var bluewave={};
if(!bluewave.charts) bluewave.charts={};

//******************************************************************************
//**  BarChart
//******************************************************************************
/**
 *   Panel used to create bar charts
 *
 ******************************************************************************/

bluewave.charts.BarChart = function(parent, config) {

    var me = this;
    var defaultConfig = {
        layout: "vertical",
        animationSteps: 1500, //duration in milliseconds
        stackValues: false,
        colors: d3.schemeCategory10
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
    this.getTooltipLabel = function(d, i, arr){
        return d.key + "<br/>" + d.value;
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


        var parent = svg.node().parentNode;
        onRender(parent, function(){
            renderChart(data);
        });
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

        //Get max bar
        var maxData = d3.nest()
            .key(function (d) { return d[xKey]; })
            .rollup(function (d) {
                return d3.sum(d, function (g) {
                    return parseFloat(g[yKey]);
                });
            }).entries(mergedData);


        //To ensure max is found in line data - probably phenomenally inefficient
        if (layers.length > 0) {

            let max = d3.max(maxData, d => parseFloat(d.value));

            layers.forEach(function(l){
                let lineData = l.data;
                let xKey = l.xAxis;
                let yKey = l.yAxis;
                let lineMax = d3.max(lineData, d=>parseFloat(d[yKey]));

                if (lineMax > max){

                    maxData = d3.nest()
                        .key(function (d) { return d[xKey]; })
                        .rollup(function (d) {
                            return d3.sum(d, function (g) {
                                return parseFloat(g[yKey]);
                            });
                        }).entries(lineData);

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


        //Reformat data if "group by" is selected
        var group = chartConfig.group;
        if(group !== null && group !== undefined && group!==""){

            var groupData = d3.nest()
            .key(function(d){return d[group];})
            .entries(data[0]);

            if (!stackValues){
                maxData = d3.nest()
                .key(function (d) { return d[xKey]; })
                .rollup(function (d) {
                    return d3.max(d, function (g) {
                        return parseFloat(g[yKey]);
                    });
                }).entries(mergedData);
            }

            let tempDataSets = [];
            groupData.forEach(function(g){
                tempDataSets.push(g.values);
            });

            dataSets = tempDataSets;

        }
        else{
            stackValues = false;
        }



      //Get x and y values for each data set and format object for rendering
        var arr = [];
        for (let i=0; i<dataSets.length; i++){

            let xAxisN = chartConfig[`xAxis${i+1}`];
            let yAxisN = chartConfig[`yAxis${i+1}`];

            //If axes not picked, skip pushing/rendering this dataset
            if ((!xAxisN || !yAxisN) && !group && barType !== "histogram" && i>0) continue;

            if (chartConfig.hasOwnProperty(`xAxis${i+1}`) && chartConfig.hasOwnProperty(`yAxis${i+1}`)){

                xKey = xAxisN;
                yKey = yAxisN;
            }



            var sumData = d3.nest()
                .key(function(d){return d[xKey];})
                .rollup(function(d){
                    return d3.sum(d,function(g){
                        return g[yKey];
                    });
            }).entries(dataSets[i]);

            arr.push(sumData);
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



        //Mapping object to store accumulated values for stacking
        var keyMap = {};

        for (let i=0; i<dataSets.length; i++){


            var sumData = arr[i];

            let fillOpacity = parseFloat(chartConfig["fillOpacity" + i]);
            if (isNaN(fillOpacity) || fillOpacity<0 || fillOpacity>1) fillOpacity = 1;

            //Only supports vertical layout for now
            if (stackValues){


                let keyType = getType(sumData[0].key);
                if (keyType == "date") keyType = "string";

                let getX = function (d) {

                    if (keyType === "date") {
                        return x(new Date(d.key));
                    } else {
                        return x(d.key);
                    }

                };

                let getY = function (d) {
                    var v = parseFloat(d["value"]);
                    return y(v);
                };


                let getWidth = function (d) {
                    return x.bandwidth ? x.bandwidth() : getX(d);
                };


                plotArea
                    .append("g")
                    .selectAll("mybar")
                    .data(sumData)
                    .enter()
                    .append("rect")
                    .attr("x", getX)
                    .attr("y", function (d) {
                        var key = d.key;
                        var val = d.value;

                        //Check if key exists in keyMap and accumulate value
                        if (!keyMap[key]) keyMap[key] = 0;
                        var v = parseFloat(val);
                        keyMap[key] += v;

                        return y(keyMap[key]);
                    })
                    .attr("height", function (d) {

                        return y.bandwidth
                            ? y.bandwidth()
                            : (height - getY(d));
                    })
                    .attr("width", function (d) {
                        return getWidth(d);
                    })
                    .attr("opacity", fillOpacity)
                    .attr("barID", i);


            };

            //Jump out of loop after stacking is done
            if (stackValues) continue;

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


                plotArea.selectAll("rect")
                    .data(bins)
                    .enter()
                    .append("rect")

                    .attr("x", function (d) {
                        return (layout === "vertical") ? x(d.x0) : 0;
                    })
                    .attr("y", function (d) {
                        return (layout === "vertical") ? frequencyAxis(d.length) : height - x(d.x1)/(width/height) //This is a dumb way of doing this probably
                        // y(d.key) - height/sumData.length / 2;
                    })
                    .attr("width", function (d) {
                        return (layout === "vertical") ? (x(d.x1) - x(d.x0) - 0.5) : frequencyAxis(d.length);
                    })
                    .attr("height", function (d) {
                        return (layout === "vertical") ? height - frequencyAxis(d.length) : (x(d.x1) - x(d.x0))/(width/height) - 0.5;
                    })
                    .attr("opacity", fillOpacity)
                    .attr("barID", i);


            }
            else { //regular bar chart


                let keyType = getType(sumData[0].key);
                if(keyType == "date") keyType = "string";

                var getX = function (d) {

                    if (keyType === "date") {
                        return x(new Date(d.key));
                    } else {
                        return x(d.key);
                    }

                };

                var getY = function(d){
                    var v = parseFloat(d["value"]);
                    return y(v);
                };


                if (y.bandwidth || x.bandwidth) {
                    if (chartConfig.layout === "vertical"){

                        var getWidth = function(d){
                            if(group){
                                return x.bandwidth ? x.bandwidth()/dataSets.length : getX(d);
                            }else{
                                return x.bandwidth ? x.bandwidth() : getX(d);
                            }
                        };


                        plotArea
                            .selectAll("mybar")
                            .data(sumData)
                            .enter()
                            .append("rect")
                            .attr("x", function(d) {
                                var w = getWidth(d);
                                var left = x.bandwidth ? getX(d) : 0;
                                return group ? left+(w*i): getX(d);
                            })
                            .attr("y", getY)
                            .attr("height", function (d) {

                                return y.bandwidth
                                    ? y.bandwidth()
                                    : height - getY(d);
                            })
                            .attr("width", function (d) {
                                return getWidth(d);
                            })
                            .attr("opacity", fillOpacity)
                            .attr("barID", function(d, n, j){
                                // i is external loop incrementor for multiple data sets and grouping
                                // n is for single data set where all bars are rendered on enter()
                                return group ? i : 0;
                            });

                    }
                    else if(chartConfig.layout === "horizontal"){
                        plotArea
                            .selectAll("mybar")
                            .data(sumData)
                            .enter()
                            .append("rect")
                            .attr("x", function (d) {
                                return 0;
                            })
                            .attr("y", function (d) {

                                var w = y.bandwidth ? y.bandwidth()/dataSets.length : height - y(d["key"]);
                                var left = y.bandwidth ? y(d["key"]) : 0;
                                return group ? left+(w*i): y(d["key"]);

                            })
                            .attr("height", function (d) {

                                if(group){
                                    return y.bandwidth ? y.bandwidth()/dataSets.length : height - y(d["value"]);
                                }else{
                                    return y.bandwidth ? y.bandwidth() : height - y(d["value"]);
                                }

                            })
                            .attr("width", function (d) {
                                return x.bandwidth ? x.bandwidth() : x(d["value"]);
                            })
                            .attr("opacity", fillOpacity)
                            .attr("barID", function(d, n, j){
                                // i is external loop incrementor for multiple data sets and grouping
                                // n is for single data set where all bars are rendered on enter()
                                return group ? i : 0;
                            });

                    }
                }
                //No bandwith
                else {

                    if (chartConfig.layout === "vertical") {

                        if(!group){
                        plotArea
                            .selectAll("mybar")
                            .data(sumData)
                            .enter()
                            .append("rect")
                            .attr("x", function (d) {
                                return getX(d) - width/sumData.length / 2;
                            })
                            .attr("y", getY)
                            .attr("height", function (d) {
                                return height - getY(d);
                            })
                            .attr("width", function (d) {
                                return width/sumData.length-5;
                            })
                            .attr("opacity", fillOpacity)
                            .attr("barID", function(d, n, j){
                                // i is external loop incrementor for multiple data sets and grouping
                                // n is for single data set where all bars are rendered on enter()
                                return group ? i : 0;
                            });

                        }

                    }

                    else if (chartConfig.layout === "horizontal") {

                        plotArea
                            .selectAll("mybar")
                            .data(sumData)
                            .enter()
                            .append("rect")
                            .attr("x", function (d) {
                                return 0;
                            })
                            .attr("y", function (d) {
                                if (keyType === "date") {
                                    return y(new Date(d.key)) - height/sumData.length / 2;
                                } else {
                                    return y(d.key) - height/sumData.length / 2;
                                }

                            })
                            .attr("height", function (d) {
                                return height/sumData.length-5;
                            })
                            .attr("width", function (d) {
                                return x(d["value"]);
                            })
                            .attr("opacity", fillOpacity)
                            .attr("barID", function(d, n, j){
                                // i is external loop incrementor for multiple data sets and grouping
                                // n is for single data set where all bars are rendered on enter()
                                return group ? i : 0;
                            });

                    }
                }
            }
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
        var bars = plotArea.selectAll("rect");
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
            bars
                .attr("yInitial", function () {
                    return this.getAttribute("y")
                })
                .attr("heightInitial", function () {
                    return this.getAttribute("height")
                })
                .attr("widthInitial", function () {
                    return this.getAttribute("width")
                });


            if (layout === "vertical"){

                //Set bar height to 0 and position to x-axis
                bars.attr("y", height).attr("height", 0);

                bars.transition().duration(animationSteps)
                    .attr("y", function () {
                        return parseFloat(this.getAttribute("yInitial")) ;
                    })
                    .attr("height", function () {
                        return parseFloat(this.getAttribute("heightInitial")) ;
                    });


            }else if(layout === "horizontal"){

                //Set bar width to 0 and position to y-axis
                bars.attr("x", 0).attr("width", 0);

                bars.transition().duration(animationSteps)
                    .attr("width", function () {
                        return parseFloat(this.getAttribute("widthInitial"));
                    });

            }

        };


        var tooltip;
        if (config.showTooltip===true){
            tooltip = createTooltip();
        }

        var mouseover = function(d) {
            if (tooltip){
                let bar = d3.select(this);
                let barID = parseInt(bar.attr("barID"));
                var arr = getBarData(barID, d);
                var label = me.getTooltipLabel(d, barID, arr);
                tooltip.html(label).show();
            }
            d3.select(this).transition().duration(100).attr("opacity", "0.8");
        };

        var mousemove = function() {
            var e = d3.event;
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

            }, animationSteps)
        };


        var getSiblings = function(bar){
            var arr = [];
            bars.each(function() {
                arr.push(this);
            });
            return arr;
        };

        bars.on("click", function(d){
            // me.onClick(this, getSiblings(this));
            var barID = parseInt(d3.select(this).attr("barID"));
            me.onClick(this, barID, d);
        });

        bars.on("dblclick", function(){
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
            var v = parseFloat(d["value"]);
            return y(v);
        };


        var getLine = function(){
            if (smoothing && smoothing !== "none"){
                return d3.line().x(getX).y(getY).curve(d3[smoothing]);
            }
            return d3.line().x(getX).y(getY);
        };


        var sumData = d3.nest()
            .key(function (d) { return d[xKey]; })
            .rollup(function (d) {
                return d3.sum(d, function (g) {
                    return g[yKey];
                });
            }).entries(layer.data);
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
    var onRender = javaxt.dhtml.utils.onRender;

    var initChart = bluewave.chart.utils.initChart;
    var drawAxes = bluewave.chart.utils.drawAxes;
    var createTooltip = bluewave.chart.utils.createTooltip;
    var drawGridlines = bluewave.chart.utils.drawGridlines;
    var getType = bluewave.chart.utils.getType;


    init();
};