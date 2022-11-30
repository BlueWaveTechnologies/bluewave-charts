if(!bluewave) var bluewave={};
if(!bluewave.chart) bluewave.chart={};
bluewave.chart.utils = {


  //**************************************************************************
  //** initChart
  //**************************************************************************
    initChart: function(parent, callback, scope){
        var svg;
        if (parent instanceof d3.selection){
            svg = parent;
        }
        else if (parent instanceof SVGElement) {
            svg = d3.select(parent);
        }
        else{


            var p = d3.select(parent)
            .append("div")
            .classed("svg-container", true) ;

            var svg = p.append("svg")
                .attr("preserveAspectRatio", "xMidYMid meet")
                .attr("height","100%")
                .attr("width","100%")
                .attr("viewBox", "0 0 600 400")
                .classed("svg-content-responsive", true);


            bluewave.chart.utils.onRender(parent, function(){
                var width = parent.offsetWidth;
                var height = parent.offsetHeight;
                svg.attr("viewBox", `0 0 ${width} ${height}`);
            });

        }

        var g = svg.append("g");
        if (callback) callback.apply(scope,[svg, g]);
    },


  //**************************************************************************
  //** onRender
  //**************************************************************************
  /** Used to check whether DOM element has been added to the document. Calls
   *  a callback if it exists or when it is added.
   */
    onRender: function(el, callback){
        var w = el.offsetWidth;
        if (w===0 || isNaN(w)){
            var timer;

            var checkWidth = function(){
                var w = el.offsetWidth;
                if (w===0 || isNaN(w)){
                    timer = setTimeout(checkWidth, 100);
                }
                else{
                    clearTimeout(timer);
                    if (callback) callback.apply(el, [el]);
                }
            };

            timer = setTimeout(checkWidth, 100);
        }
        else{
            if (callback) callback.apply(el, [el]);
        }
    },


  //**************************************************************************
  //** drawGridlines
  //**************************************************************************
    drawGridlines: function(svg, xScale, yScale, height, width, xGrid, yGrid){

        if(xGrid){
            svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale)
            .tickSize(-height)
            .tickFormat("")
            );
        }

        if(yGrid){
            svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat("")
            );
        }
    },


  //**************************************************************************
  //** drawLabels
  //**************************************************************************
  /** Used to render labels along the x and y axis
   */
    drawLabels: function(svg, showX, showY, height, width, margin, xLabel, yLabel){

      //Add X-axis label
        if(showX){

            var y = height;
            if (margin) y+= margin.bottom - 2;

            svg.append("text")
            .attr("x", width/2)
            .attr("y", y)
            .style("text-anchor", "middle")
            .text(xLabel);
        }


      //Add Y-axis label
        if(showY){

            var x = 0;
            if (margin) x = x - margin.left;

            svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", 0 - (height/2))
            .attr("y", x)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yLabel);
        }

    },



  //**************************************************************************
  //** drawAxes
  //**************************************************************************
  /** Used to render x/y axis on the plotArea
   */
    drawAxes: function(plotArea, axisWidth, axisHeight, xKey, yKey,
        chartData, minData, chartConfig, chartType){

        if (!chartConfig) chartConfig = {};


        var getType = bluewave.chart.utils.getType;
        var getScale = bluewave.chart.utils.getScale;
        var getDateFormat = bluewave.chart.utils.getDateFormat;


      //Get x/y key types
        var xKeys = [];
        var yKeys = [];
        chartData.forEach((d)=>{
            xKeys.push(d[xKey]);
            yKeys.push(d[yKey]);
        });

        var xType = getType(xKeys);
        var yType = getType(yKeys);



      //Special case for bar charts
        if (chartType=="barChart"){
            if (xType == "date") xType = "string";
            if (yType == "date") yType = "string";

            if (xType=="number" || xType=="currency"){

              //Set xMin value
                var layout = chartConfig.layout;
                if (layout==="vertical"){
                    var minX = Number.MAX_VALUE;
                    var maxX = 0;
                    xKeys.forEach((key)=>{
                        var n = bluewave.chart.utils.parseFloat(key);
                        minX = Math.min(n, minX);
                        maxX = Math.max(n, maxX);
                    });
                    chartConfig.xMin = minX;
                }
            }
        }




        var sb = getScale(xKey,xType,[0,axisWidth],chartData,minData,null,chartConfig.xMin,chartConfig.xMax);
        var x = sb.scale;
        var xBand = sb.band;


        var scaleOption = chartConfig.scaling==="logarithmic" ? "logarithmic" : "linear";
        sb = getScale(yKey,yType,[axisHeight,0],chartData,minData,scaleOption);
        var y = sb.scale;
        var yBand = sb.band;



        var labelWidth = 10;
        var domainLength = x.domain().length;
        var widthCheck = domainLength * labelWidth < axisWidth;


//        const formatMillisecond = d3.timeFormat(".%L"),
//            formatSecond = d3.timeFormat(":%S"),
//            formatMinute = d3.timeFormat("%I:%M"),
//            formatHour = d3.timeFormat("%b %d"),
//            formatDay = d3.timeFormat("%b %d"),
//            formatWeek = d3.timeFormat("%b %d"),
//            formatMonth = d3.timeFormat("%B"),
//            formatYear = d3.timeFormat("%Y");
//
//        function multiFormat(date) {
//            return (d3.timeSecond(date) < date ? formatMillisecond
//                : d3.timeMinute(date) < date ? formatSecond
//                    : d3.timeHour(date) < date ? formatMinute
//                        : d3.timeDay(date) < date ? formatHour
//                            : d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
//                                : d3.timeYear(date) < date ? formatMonth
//                                    : formatYear)(date);
//        }

        var tickFilter = function(d, i) {

            let maxLabels = parseInt(axisWidth / labelWidth);

            //Ensure first tick is displayed and every multiple of maxLabels
            if (i === 0) return true;
            return !(i % maxLabels);
        };

        var updateDefaultTicks = function(axis, type){
            var numWholeNumbers;
            var years;
            var days;

            axis
            .selectAll("text").each(function(value, index, nodeList) {
                var label = nodeList[index].textContent;
                if (type === "number") {
                    if (isNaN(numWholeNumbers)){
                        numWholeNumbers = 0;
                        nodeList.forEach(function(n){
                            var wholeNumber = bluewave.chart.utils.parseFloat(n.textContent) % 1 == 0;
                            if (wholeNumber) numWholeNumbers++;
                        });
                    }
                    if (numWholeNumbers==nodeList.length){
                        var format = d3.format(",");
                        nodeList[index].textContent = format(label);
                    }
                }
                else if (type === "date"){

                    if (!years){
                        years = {};
                        days = {};
                        nodeList.forEach(function(n){
                            var date = new Date(n.textContent); //assumes m/d/yyyy
                            var y = date.getFullYear();
                            var d = date.getDate();
                            years[y+""] = true;
                            days[d+""] = true;
                        });
                        years = Object.keys(years);
                        days = Object.keys(days);
                    }

                    if (years.length>1){
                        if (days.length==1){
                            var format = d3.timeFormat("%m/%y");
                            label = format(value);
                        }
                    }
                    else{
                        if (days.length==1){
                            var format = d3.timeFormat("%b");
                            label = format(value);
                        }
                    }

                    if (label.indexOf("0")===0) label = label.substring(1);
                    label = label.replaceAll("/0", "/");
                    nodeList[index].textContent = label;
                }
            });
        };

        var getTickFormat = function(type, pattern){
            var format;
            if (type === "date"){
                format = d3.timeFormat(getDateFormat(pattern));
            }
            else if (type === "number") {
                var numDecimals = 1;
                format = d3.format("." + numDecimals + "f");
            }
            return format;
        };

        var getBoxes = function(axis){
            var boxes = [];
            axis.selectAll("text").each(function(d, i) {
                var box = javaxt.dhtml.utils.getRect(this);
                boxes.push({
                    left: box.x,
                    right: box.x+box.width,
                    top: box.y,
                    bottom: box.y+box.height
                });
            });
            return boxes;
        };


        var foundIntersection = function(boxes, buffer=0){
            var foundIntersection = false;

            boxes.forEach(function(box){
                box.top -= buffer;
                box.left -= buffer;
                box.right += buffer;
                box.bottom += buffer;
            });

            for (var i = 0; i < boxes.length; i++) {
                var box = boxes[i];
                for (var j = 0; j < boxes.length; j++) {
                    if (j === i) continue;
                    var b = boxes[j];
                    if (javaxt.dhtml.utils.intersects(box, b)) {
                        foundIntersection = true;
                        break;
                    }
                }
                if (foundIntersection) break;
            }
            return foundIntersection;
        };



      //Render x-axis
        var xFormat = getTickFormat(xType, chartConfig.xFormat);
        var xTicks;
        if (!(chartConfig.xTicks===true || chartConfig.xTicks===false)){
            xTicks = chartConfig.xTicks;
        }
        var xAxis = plotArea
            .append("g")
            .attr("transform", "translate(0," + axisHeight + ")");

        if (chartConfig.xTicks===false){
            xAxis.call(
                d3.axisBottom(x)
                .ticks(xTicks)
                .tickSize([0,0])
            );

            xAxis.selectAll("text").each(function(d, i) {
                d3.select(this).remove();
            });
            xAxis.selectAll("path").each(function(d, i) {
                d3.select(this).remove();
            });

        }
        else{
            xAxis.call(
                d3.axisBottom(x)
                .ticks(xTicks)
                .tickValues(widthCheck ? null : x.domain().filter(tickFilter))
                .tickFormat(xFormat)
            );

            if (!chartConfig.xFormat) updateDefaultTicks(xAxis, xType);


          //Rotate x-axis labels as needed
            var xBoxes = getBoxes(xAxis);
            var xLabelsIntersect = foundIntersection(xBoxes, 0);

            if (xLabelsIntersect){
                xAxis
                .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");
            }

        }


      //Render y-axis
        var yFormat = getTickFormat(yType, chartConfig.yFormat);
        var yAxis = plotArea
            .append("g");

        if (chartConfig.yTicks===false){


            yAxis.call(scaleOption==="linear" ?
                d3.axisLeft(y)
                    .tickFormat(yFormat)
                    .tickSize([0,0])
                :
                d3.axisLeft(y)
                    .ticks(10, ",")
                    .tickFormat(yFormat)
                    .tickSize([0,0])
            );

            yAxis.selectAll("text").each(function(d, i) {
                d3.select(this).remove();
            });
            yAxis.selectAll("path").each(function(d, i) {
                d3.select(this).remove();
            });

        }
        else{

            yAxis.call(scaleOption==="linear" ?
                d3.axisLeft(y).tickFormat(yFormat)
                :
                d3.axisLeft(y)
                    .ticks(10, ",")
                    .tickFormat(yFormat)
            );

            if (!chartConfig.yFormat) updateDefaultTicks(yAxis, yType);

          //Hide every other y-tick if they're crowded
            var yBoxes = getBoxes(yAxis);
            var yLabelsIntersect = foundIntersection(yBoxes, -1);

            if (yLabelsIntersect) {

                let length = yAxis.selectAll("text").size();

                yAxis
                    .selectAll("text")
                    .attr("visibility", function (text, i) {
                        //Check cardinality to ensure top tick is always displayed
                        if (length%2) {
                            return (i + 1) % 2 === 0 ? "hidden" : "visible";
                        }
                        else return i % 2 === 0 ? "hidden" : "visible";
                    });
            }
        }


      //Calculate margins required to fit the labels
        var xExtents = javaxt.dhtml.utils.getRect(xAxis.node());
        var yExtents = javaxt.dhtml.utils.getRect(yAxis.node());

        var left = Number.MAX_VALUE;
        var right = 0;
        var top = Number.MAX_VALUE;
        var bottom = 0;
        xAxis.selectAll("line").each(function(d, i) {
            var box = javaxt.dhtml.utils.getRect(this);
            left = Math.min(box.x, left);
            right = Math.max(box.x+box.width, right);
        });

        yAxis.selectAll("line").each(function(d, i) {
            var box = javaxt.dhtml.utils.getRect(this);
            top = Math.min(box.y, top);
            bottom = Math.max(box.y+box.height, bottom);
        });

        yAxis.selectAll("path").each(function(d, i) {
            var box = javaxt.dhtml.utils.getRect(this);
            top = Math.min(box.y, top);
            bottom = Math.max(box.y+box.height, bottom);
        });

        var marginLeft = xExtents.left-left; //extra space for the left-most x-axis label
        if (marginLeft<0) marginLeft = 0;

        var marginRight = (xExtents.right-right); //extra space for the right-most x-axis label
        if (marginRight<0) marginRight = 0;


        marginLeft = Math.max(yExtents.width, marginLeft); //extra space for the y-axis labels

        var marginTop = top-yExtents.top; //extra space for the top-most y-axis label
        var marginBottom = xExtents.height;


        var labelOffset = 16;

      //Add x-axis label as needed
        var xLabel = chartConfig.xLabel;
        if (xLabel){

            var t = xAxis.append("text")
            .attr("x", (xExtents.right-xExtents.left)/2)
            .attr("y", marginBottom+labelOffset)
            .attr("class", "chart-axis-label")
            .style("text-anchor", "middle")
            .text(xLabel);

            var r = javaxt.dhtml.utils.getRect(t.node());
            marginBottom+=(r.height+labelOffset);
        }


      //Add y-axis label as needed
        var yLabel = chartConfig.yLabel;
        if (yLabel){

            var t = yAxis.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(yExtents.height/2)) //set vertical position
            .attr("y", -(yExtents.width+labelOffset)) //set horizontal position
            .attr("class", "chart-axis-label")
            .style("text-anchor", "middle")
            .text(yLabel);

            var r = javaxt.dhtml.utils.getRect(t.node());
            marginLeft = Math.max(marginLeft+(r.width+labelOffset), marginLeft);
        }



      //Return axis objects
        return {
            xAxis: xAxis, //d3 svg selection
            yAxis: yAxis, //d3 svg selection
            xBand: xBand,
            yBand: yBand,
            x: x,
            y: y,
            margin: {
                top: marginTop,
                right: marginRight,
                bottom: marginBottom,
                left: marginLeft
            }
        };
    },


  //**************************************************************************
  //** getScale
  //**************************************************************************
    getScale : function(key, type, axisRange, chartData, minData, scaleOption, _minVal, _maxVal){
        let scale;
        let band;

        switch (type) {
            case "string":
                scale = d3
                .scaleBand()
                .domain(
                    chartData.map(function (d) {
                        return d[key];
                    })
                )
                .range(axisRange)
                .padding(0.2);
                break;

            case "date":

                var timeRange = [ new Date(d3.min(chartData, d=>d[key])), new Date(d3.max(chartData, d=>d[key])) ];

                chartData.map((val) => {
                    val[key] = new Date(val[key]);
                    return val;
                });

                scale = d3
                    .scaleTime()
                    .domain(timeRange)
                    .rangeRound(axisRange);

                band = d3
                    .scaleBand()
                    .domain(d3.timeDay.range(...scale.domain()))
                    .rangeRound(axisRange)
                    .padding(0.2);


                break;

            default: //number

                var minVal, maxVal;
                if (!minData){
                    var extent = d3.extent(chartData, function(d) { return bluewave.chart.utils.parseFloat(d[key]); });
                    minVal = 0;
                    maxVal = extent[1];
                }
                else{
                    minVal = d3.min(minData, function(d) { return bluewave.chart.utils.parseFloat(d[key]);} );
                    maxVal = d3.max(chartData, function(d) { return bluewave.chart.utils.parseFloat(d[key]);} );
                }
                if (minVal === maxVal) maxVal = minVal + 1;


                if (!scaleOption) scaleOption = "linear";

                if (scaleOption === "linear"){

                    if (minVal>0) minVal=0;

                    if (!isNaN(_minVal)){
                        minVal = _minVal;
                    }

                    if (!isNaN(_maxVal)){
                        maxVal = _maxVal;
                    }

                    scale = d3.scaleLinear()
                    .domain([minVal, maxVal]);

                }
                else if (scaleOption === "logarithmic"){

                    if(minVal<1) minVal = 1;

                    scale = d3.scaleLog()
                    .domain([minVal, maxVal+1]);

                }

                scale.range(axisRange);


                break;
        }


        return {
            scale,
            band
        };
    },


  //**************************************************************************
  //** extendScale
  //**************************************************************************

    extendScale: function (scaleBandObj, axisRange, scalingFactor, type) {

        var domain = scaleBandObj.scale.domain();
        var scale, band;

        var getType = bluewave.chart.utils.getType;
        if (!type) type = getType(domain[0]);
        if (!scalingFactor) scalingFactor = 1;

        if (type === 'date') {
            let endDate = domain[1];
            let startDate = domain[0];
            let dateinMilliseconds = endDate.getTime();


            let timeDiff = endDate - startDate;
            let timetoAdd = timeDiff * scalingFactor;
            let extendedDate = new Date(dateinMilliseconds + timetoAdd);

            scale = d3
                    .scaleTime()
                    .domain([startDate, extendedDate])
                    .rangeRound(axisRange);

            band = d3
                    .scaleBand()
                    .domain(d3.timeDay.range(...scale.domain()))
                    .rangeRound(axisRange)
                    .padding(0.2);



        } else if (type === 'string') {

            let numExtraTicks = Math.ceil(domain.length * scalingFactor);
            let spaceString = "";
            let ordinalDomain = domain;
            //Hackyest hack in ever - creates space strings of increasing length. Ordinal domain values must be unique
            for(let i=0; i<numExtraTicks; i++){

                spaceString = spaceString + " ";
                ordinalDomain.push(spaceString);
            }

            scale = d3
                    .scaleBand()
                    .domain(ordinalDomain)
                    .range(axisRange)
                    .padding(0.2);


        } else { //Number

            let numDomain = [domain[0], domain[1]*(scalingFactor + 1)]

            scale = d3.scaleLinear()
                    .domain(numDomain)
                    .range(axisRange);
        }


        return {
            scale: scale,
            band: band
        };

    },

  //**************************************************************************
  //** reDrawAxes
  //**************************************************************************
    reDrawAxes: function(svg, xAxis, x, yAxis, y, axisHeight) {


        if (xAxis){
            xAxis.remove();
            xAxis = svg
            .append("g")
            .attr("transform", "translate(0," + axisHeight + ")")
            .call(
                d3.axisBottom(x)
            );

        }

        if (yAxis){
            yAxis.remove()
            yAxis = svg
            .append("g")
            .call(
                d3.axisLeft(y)
            );

        }
    },


  //**************************************************************************
  //** getType
  //**************************************************************************
  /** Returns the data type associated with the given value (e.g. "string",
   *  "date", "number", or "currency").
   *  @param type Either a single object or an array of objects. In the case
   *  of an array, loops through all the entries to check whether all the
   *  entries are the same type.
   */
    getType: function(value) {

        var getType = bluewave.chart.utils.getType;
        var isDate = bluewave.chart.utils.isDate;
        var isNumber = bluewave.chart.utils.isNumber;
        var isCurrency = bluewave.chart.utils.isCurrency;
        var isArray = bluewave.chart.utils.isArray;

        if (isArray(value)){
            var len = value.length;

            var numbers = 0;
            var currencies = 0;
            var dates = 0;
            var strings = 0;
            var noval = 0;
            var other = 0;
            value.forEach(function(val){
                var dataType = getType(val);
                switch (dataType) {
                    case "string":
                        var s = (val + "").trim();
                        if (s.length===0 || s==="null"){
                            noval++;
                        }
                        strings++;
                        break;
                    case "number":
                        numbers++;
                        break;
                    case "currency":
                        currencies++;
                        break;
                    case "date":
                        dates++;
                        break;
                    default:
                        other++;
                        break;
                }
            });


            if (dates===len || dates+noval===len) return "date";
            if (numbers===len || numbers+noval===len) return "number";
            if (currencies===len || currencies+noval===len || currencies+numbers+noval===len) return "currency";
            if (strings===len) return "string";
            return null;
        }
        else {

            switch (typeof value) {
                case "string":
                    if (isNumber(value)){
                        return "number";
                    }
                    else if (isDate(value)){
                        return "date";
                    }
                    else if (isCurrency(value)){ //IMPORTANT: Check after date and number!
                        return "currency";
                    }
                    else{
                        return "string";
                    }
                    break;
                case "number":
                    return "number";
                    break;
                case "object":
                    if (isDate(value)){
                        return "date";
                    }
                    break;
                default:
                    break;
            }

            return null;
        }

    },


  //**************************************************************************
  //** parseFloat
  //**************************************************************************
  /** Returns a floating-point number for a given object. Accepts numbers or
   *  strings representing numeric values (including currencies "R$ -2.530,55")
   */
    parseFloat: function(n){
        if (typeof n === "number") return n;
        if (typeof n === "string"){
            if (bluewave.chart.utils.isDate(n)) return parseFloat(null);
            if (bluewave.chart.utils.isCurrency(n)){
                return bluewave.chart.utils.parseCurrency(n);
            }
        }
        return parseFloat(n);
    },


  //**************************************************************************
  //** parseCurrency
  //**************************************************************************
  /** Returns a floating-point number for a given object. Accepts numbers or
   *  strings representing currencies values (e.g. "R$ -2.530,55", "(67.30)")
   */
    parseCurrency: function(n){

        var words = n.split(" ");
        for (var i=0; i<words.length; i++){
            n = words[i].trim();
            if (bluewave.chart.utils.isCurrency(n)){


                var x = 1;
                if (n.indexOf("-")==0){
                    x=-1;
                }
                if (n.indexOf("(")==0 && n.lastIndexOf(")")==n.length-1){
                    x=-1;
                }


                var dotPos = n.indexOf('.');
                var commaPos = n.indexOf(',');

                if (dotPos < 0)
                    dotPos = 0;

                if (commaPos < 0)
                    commaPos = 0;

                var sep;
                if ((dotPos > commaPos) && dotPos)
                    sep = dotPos;
                else {
                    if ((commaPos > dotPos) && commaPos)
                        sep = commaPos;
                    else
                        sep = false;
                }

                if (sep == false)
                    return parseFloat(n.replace(/[^\d]/g, ""))*x;

                return parseFloat(
                    n.substr(0, sep).replace(/[^\d]/g, "") + '.' +
                    n.substr(sep+1, n.length).replace(/[^0-9]/, "")
                )*x;
            }
        }

        return parseFloat(null);
    },


  //**************************************************************************
  //** isArray
  //**************************************************************************
  /** Used to check whether a given object is an array. Note that this check
   *  does not use the "instanceof Array" approach because of issues with
   *  frames.
   */
    isArray: function(obj){
        return (Object.prototype.toString.call(obj)==='[object Array]');
    },


  //**************************************************************************
  //** isNumber
  //**************************************************************************
  /** Return true if a given object is number or can be parsed into a number
   */
    isNumber: function(n) {
        if (typeof n === "number") return true;
        if (typeof n !== "string") n = ""+n;
        return !isNaN(parseFloat(n)) && !isNaN(n - 0);
    },


  //**************************************************************************
  //** isCurrency
  //**************************************************************************
  /** Return true if a given object can be used to represent a currency
   */
    isCurrency: function(n) {
        if (bluewave.chart.utils.isNumber(n)) return true;
        if (bluewave.chart.utils.isDate(n)) return false;
        if (typeof n !== "string") n = ""+n;



      //Check if the string contains illegal characters by removing all numbers,
      //letters, and currency symbols. If there's anything leftover, then we
      //we have illegal characters in the string
        var t = n.replace(/[-+,.a-zA-Z0-9() ]+/g, "");
        t = t.replace(/[\$\xA2-\xA5\u058F\u060B\u09F2\u09F3\u09FB\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BD\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6]/,"");
        if (t.length>0) return false;





      //Loop through words (e.g. "$654.29 USD" is valid)
        var wordCount = 0;
        var words = n.split(" ");
        for (var i=0; i<words.length; i++){
            var word = words[i].trim();
            if (word.length>0){

                if (word.indexOf("-")==0 || word.indexOf("+")==0){
                    word = word.substring(1).trim();
                }

                if (word.indexOf("(")==0 && word.lastIndexOf(")")==word.length-1){
                    word = word.substring(1,word.length-1).trim();
                }


                var startWithNumber = /^\d/.test(word);
                var endsWithNumber = /[0-9]+$/.test(word);

                if (startWithNumber && endsWithNumber){
                    var t = word.replace(/[^0-9,.]+/g,"");
                    return t===word;
                }
                else{
                    if (startWithNumber || endsWithNumber){


                      //Check if the string contains a number by stripping out
                      //anything that's not a number, decimal, or comma. This
                      //is a pretty weak test but works ok for most cases
                        return bluewave.chart.utils.isNumber(n.replace(/[^0-9.-]+/g,""));

                    }

                }

                wordCount++;
            }

            if (wordCount>3) return false;
        }


        return false;

    },


  //**************************************************************************
  //** isDate
  //**************************************************************************
  /** Return true if a given object can be parsed into a date
   */
    isDate: function(d) {

      //Don't pass numbers to Date.parse (e.g. "3", "1.2")
        if (typeof d === "string" || typeof d === "number"){
            var n = (d+"").replace(/[^-+0-9,.]+/g,"");
            if (d===n){
                return false;
            }
        }

        return !isNaN(Date.parse(d));
    },


  //**************************************************************************
  //** getDateFormat
  //**************************************************************************
  /** Used to convert common date formatting pattern to D3 pattern
   *  @param pattern Date pattern like "YYYY-MM-DD" or "m/d/yy" or "dddd, MMMM D h:mm:ss A"
   */
    getDateFormat: function(pattern){
        var dateFormat = "%m/%d/%Y";
        if (pattern){
            dateFormat = pattern;
            dateFormat = dateFormat.replace("YYYY", "%Y");
            dateFormat = dateFormat.replace("YY", "%y");
            dateFormat = dateFormat.replace("MMMM", "%B");
            dateFormat = dateFormat.replace("MM", "%m");
            dateFormat = dateFormat.replace("M", "%m"); //TODO: replace leading digit
            dateFormat = dateFormat.replace("DD", "%d");
            dateFormat = dateFormat.replace("D", "%d"); //TODO: replace leading digit
            dateFormat = dateFormat.replace("A", "%p");
            dateFormat = dateFormat.replace("dddd", "%A");
            dateFormat = dateFormat.replace("HH", "%H");
            dateFormat = dateFormat.replace("h", "%I");
            dateFormat = dateFormat.replace("mm", "%M");
            dateFormat = dateFormat.replace("ss", "%S");
        }
        return dateFormat;
    },


  //**************************************************************************
  //** mixColors
  //**************************************************************************
  /** Used to mix 2 colors together
   *  @param ratio The mix ratio is a value between 0 and 1
   */
    mixColors: function(color1, color2, ratio){
        if (typeof chroma !== 'undefined'){
            return chroma.mix(color1, color2, ratio, 'rgb').hex();
        }
        else{ //use d3
            var getColor = d3.scaleLinear()
                .domain([0,1])
                .range([color1, color2]);
            return d3.color(getColor(ratio)).formatHex();
        }
    },


  //**************************************************************************
  //** getColorRange
  //**************************************************************************
  /** Returns a range of colors using a given set of colors
   *  @param numColors Number of colors to return
   *  @param colors An array of colors (e.g. ["#f8f8f8", "#6699cc"]). A
   *  minimum of 2 colors are required
   */
    getColorRange: function(numColors, colors){

        if (typeof chroma !== 'undefined'){
            return chroma.scale(colors).colors(numColors);
        }
        else{ //use d3


          //Create domain with a range of -1 to 1
            var domain = [-1];
            var increment = 2/(colors.length-1);
            for (var i=0; i<colors.length-2; i++){
                var previous = domain[domain.length-1];
                domain.push(previous+increment);
            }
            domain.push(1);


          //Create color function
            var getColor = d3.scaleLinear()
                .domain(domain)
                .range(colors);


          //Create colors
            var arr = [];
            for (var i=0; i<numColors; i++){
                var p = i/(numColors-1);
                var x = (p*2)-1;
                var color = d3.color(getColor(x)).formatHex();
                arr.push(color);
            }

            return arr;
        }
    },


  //**************************************************************************
  //** getNaturalBreaks
  //**************************************************************************
  /** Used to classify data using Jenks natural breaks optimization
   *  @param data An array of numbers
   *  @param n_classes Number of classes
   *  @return Array of values or null. Return values are sorted in ascending
   *  order so that the smallest value appears first in the array.
   */
    getNaturalBreaks: function(data, n_classes) {


        // Adjust n_classes to reflect data
        var numDistinctVals = [...new Set(data)].length;
        n_classes = Math.min(n_classes, numDistinctVals-1);


        // Compute the matrices required for Jenks breaks. These matrices
        // can be used for any classing of data with `classes <= n_classes`
        function getMatrices(data, n_classes) {

            // in the original implementation, these matrices are referred to
            // as `LC` and `OP`
            //
            // * lower_class_limits (LC): optimal lower class limits
            // * variance_combinations (OP): optimal variance combinations for all classes
            var lower_class_limits = [],
                variance_combinations = [],
                // loop counters
                i, j,
                // the variance, as computed at each step in the calculation
                variance = 0;

            // Initialize and fill each matrix with zeroes
            for (i = 0; i < data.length + 1; i++) {
                var tmp1 = [], tmp2 = [];
                for (j = 0; j < n_classes + 1; j++) {
                    tmp1.push(0);
                    tmp2.push(0);
                }
                lower_class_limits.push(tmp1);
                variance_combinations.push(tmp2);
            }

            for (i = 1; i < n_classes + 1; i++) {
                lower_class_limits[1][i] = 1;
                variance_combinations[1][i] = 0;
                // in the original implementation, 9999999 is used but
                // since Javascript has `Infinity`, we use that.
                for (j = 2; j < data.length + 1; j++) {
                    variance_combinations[j][i] = Infinity;
                }
            }

            for (var l = 2; l < data.length + 1; l++) {

                // `SZ` originally. this is the sum of the values seen thus
                // far when calculating variance.
                var sum = 0,
                    // `ZSQ` originally. the sum of squares of values seen
                    // thus far
                    sum_squares = 0,
                    // `WT` originally. This is the number of
                    w = 0,
                    // `IV` originally
                    i4 = 0;

                // in several instances, you could say `Math.pow(x, 2)`
                // instead of `x * x`, but this is slower in some browsers
                // introduces an unnecessary concept.
                for (var m = 1; m < l + 1; m++) {

                    // `III` originally
                    var lower_class_limit = l - m + 1,
                        val = data[lower_class_limit - 1];

                    // here we're estimating variance for each potential classing
                    // of the data, for each potential number of classes. `w`
                    // is the number of data points considered so far.
                    w++;

                    // increase the current sum and sum-of-squares
                    sum += val;
                    sum_squares += val * val;

                    // the variance at this point in the sequence is the difference
                    // between the sum of squares and the total x 2, over the number
                    // of samples.
                    variance = sum_squares - (sum * sum) / w;

                    i4 = lower_class_limit - 1;

                    if (i4 !== 0) {
                        for (j = 2; j < n_classes + 1; j++) {
                            // if adding this element to an existing class
                            // will increase its variance beyond the limit, break
                            // the class at this point, setting the lower_class_limit
                            // at this point.
                            if (variance_combinations[l][j] >=
                                (variance + variance_combinations[i4][j - 1])) {
                                lower_class_limits[l][j] = lower_class_limit;
                                variance_combinations[l][j] = variance +
                                    variance_combinations[i4][j - 1];
                            }
                        }
                    }
                }

                lower_class_limits[l][1] = 1;
                variance_combinations[l][1] = variance;
            }

            // return the two matrices. for just providing breaks, only
            // `lower_class_limits` is needed, but variances can be useful to
            // evaluage goodness of fit.
            return {
                lower_class_limits: lower_class_limits,
                variance_combinations: variance_combinations
            };
        }



        // the second part of the jenks recipe: take the calculated matrices
        // and derive an array of n breaks.
        function breaks(data, lower_class_limits, n_classes) {

            var k = data.length - 1,
                kclass = [],
                countNum = n_classes;

            // the calculation of classes will never include the upper and
            // lower bounds, so we need to explicitly set them
            kclass[n_classes] = data[data.length - 1];
            kclass[0] = data[0];

            // the lower_class_limits matrix is used as indexes into itself
            // here: the `k` variable is reused in each iteration.
            while (countNum > 1) {
                kclass[countNum - 1] = data[lower_class_limits[k][countNum] - 2];
                k = lower_class_limits[k][countNum] - 1;
                countNum--;
            }

            return kclass;
        }

        if (n_classes > data.length) {
            return null;
        }

        // sort data in numerical order, since this is expected
        // by the matrices function
        data = data.slice().sort(function (a, b) { return a - b; });

        // get our basic matrices
        var matrices = getMatrices(data, n_classes),
            // we only need lower class limits here
            lower_class_limits = matrices.lower_class_limits;

        // extract n_classes out of the computed matrices
        var arr = [];
        try{
            arr = breaks(data, lower_class_limits, n_classes);
            //arr.unshift(0);
            arr = [...new Set(arr)];
        }
        catch(e){
            console.log(e);
        }
        return arr;
    },


  //**************************************************************************
  //** createTooltip
  //**************************************************************************
    createTooltip: function(){
        var tooltip = bluewave.chart.utils.Tooltip;
        var getHighestElements = javaxt.dhtml.utils.getHighestElements;
        if (!tooltip){
            tooltip = bluewave.chart.utils.Tooltip =
            d3.select(document.body)
            .append("div")
            .style("opacity", 0)
            .style("top", 0)
            .style("left", 0)
            .style("display", "none")
            .attr("class", "tooltip");


            tooltip.show = function(){

              //Get zIndex
                var highestElements = getHighestElements();
                var zIndex = highestElements.zIndex;
                if (!highestElements.contains(tooltip.node())) zIndex++;

              //Update tooltip
                tooltip
                .style("opacity", 1)
                .style("display", "block")
                .style("z-index", zIndex);
            };

            tooltip.hide = function(){
                tooltip
                .style("opacity", 0)
                .style("display", "none");
            };
        }
        return tooltip;
    },


  //**************************************************************************
  //** setStyle
  //**************************************************************************
    setStyle: function(el, style){
        if (el===null || el===0) return;
        if (style===null) return;


        var nodeName = el.nodeName;
        if (!nodeName){
            if (el.node){
                el = el.node();
                nodeName = el.nodeName;
            }
        }


        //el.style = '';
        //el.removeAttribute("style");


        if (typeof style === 'string' || style instanceof String){
            el.setAttribute("class", style);
            //el.className = style;
        }
        else{
            for (var key in style){
                var val = style[key];

                if (nodeName==="text"){
                    if (key==="color") key = "fill";
                }

                el.setAttribute(key, val);
            }
        }

    },


  //**************************************************************************
  //** clipPolygon
  //**************************************************************************
  /** Returns a polygon representing the area of intersection between two
   *  polygons. Assumes the two polygons are convex. Returns null if the two
   *  polygons do not intersect. Credit:
   *  https://observablehq.com/@d3/polygonclip
   *
   *  @param clip An array of points representing a polygon. Example:
   *  [[210, 90], [110, 400], [420, 400], ... ]. The first point should be the
   *  same as the last (i.e. the first and last point are coicident).
   *
   *  @param subject An array of points representing a polygon.
   */
    clipPolygon: function(clip, subject) {

        function lineOrient([px, py], [ax, ay], [bx, by]) {
            return (bx - ax) * (py - ay) < (by - ay) * (px - ax);
        }

        function lineIntersect([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
            const bax = bx - ax, bay = by - ay, dcx = dx - cx, dcy = dy - cy;
            const k = (bax * (cy - ay) - bay * (cx - ax)) / (bay * dcx - bax * dcy);
            return [cx + k * dcx, cy + k * dcy];
        }

        function polygonClosed(points) {
            const [ax, ay] = points[0], [bx, by] = points[points.length - 1];
            return ax === bx && ay === by;
        }

        const closed = polygonClosed(subject);
        const n = clip.length - polygonClosed(clip);
        subject = subject.slice(); // copy before mutate
        for (let i = 0, a = clip[n - 1], b, c, d; i < n; ++i) {
          const input = subject.slice();
          const m = input.length - closed;
          subject.length = 0;
          b = clip[i];
          c = input[m - 1];
          for (let j = 0; j < m; ++j) {
            d = input[j];
            if (lineOrient(d, a, b)) {
              if (!lineOrient(c, a, b)) {
                subject.push(lineIntersect(c, d, a, b));
              }
              subject.push(d);
            } else if (lineOrient(c, a, b)) {
              subject.push(lineIntersect(c, d, a, b));
            }
            c = d;
          }
          if (closed) subject.push(subject[0]);
          a = b;
        }
        return subject.length ? subject : null;
    },


  //**************************************************************************
  //** createKeyValueDataset
  //**************************************************************************
  /** Used to simplify a given dataset into an array key/value pairs
   *  @param data JSON array
   *  @param key Field name that will be used as the key
   *  @param value Field name that will be used as the value. If the value
   *  field is numeric, the field will be converted to a floating point value.
   */
    createKeyValueDataset: function(data, key, value){

      //Create dataset
        var arr = [];
        var values = [];
        data.forEach((d)=>{
            var k = d[key];
            var v = d[value];
            arr.push({
                key: k+"",
                value: v
            });
            values.push(v);
        });


      //Convert values to numbers as needed
        var t = bluewave.chart.utils.getType(values);
        if (t==="number" || t==="currency"){
            arr.forEach((d)=>{
                var v = bluewave.chart.utils.parseFloat(d.value);
                if (isNaN(v)) v = 0; //?
                d.value = v;
            });


          //Combine duplicate keys
            var temp = {};
            arr.forEach((d, idx)=>{
                var v = arr[idx].value;

                if (temp.hasOwnProperty(d.key)){
                    temp[d.key] += v;
                }
                else{
                    temp[d.key] = v;
                }
            });

            arr = [];
            for (var key in temp) {
                if (temp.hasOwnProperty(key)){
                    var val = temp[key];
                    arr.push({
                        key: key,
                        value: val
                    });
                }
            }


        }

        return arr;
    }

};