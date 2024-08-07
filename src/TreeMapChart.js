if(!bluewave) var bluewave={};
if(!bluewave.charts) bluewave.charts={};

//******************************************************************************
//**  TreeMapChart
//******************************************************************************
/**
 *   Chart used to display hierarchical data using nested cells. Provides an
 *   option to render hierarches using voronoi tesselations/partitions or
 *   rectangular cells.
 *
 ******************************************************************************/

bluewave.charts.TreeMapChart = function(parent, config) {

    var me = this;
    var defaultConfig = {
        key: "name",
        value: "value",
        shape: "square", //vs circle

        colors: d3.schemeCategory10,
        keyLabel: true,
        valueLabel: true,
        groupBy: null,
        groupLabel: true,


      /** Used to specify the maximum number of groups to render in the chart.
       *  Only applicable when the groupBy config is defined. This config
       *  is specified as an integer value. Default is null so all groups are
       *  rendered.
       */
        maxGroups: null,

      /** Used to specify the maximum number of items to render in the chart.
       *  When groupBy is defined, maxItems is used to defined the maximum
       *  items to render in a group and the maxGroups is used to defined the
       *  maximum number of groups. This config is specified as an integer
       *  value. Default is null so all groups are rendered.
       */
        maxItems: null,

        showTooltip: false,

        style: {
            keyLabel: {
                "font-size": "14px",
                "color": "#fff"
            },
            valueLabel: {
                "font-size": "11px",
                "color": "#fff"
            },
            groupLabel: {
                "font-size": "16px"
            }
        }
    };
    var svg, plotArea;

    var tooltip;
    var getColor;
    var cells;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        me.setConfig(config);

        initChart(parent, function(s, g){
            svg = s;
            plotArea = g;
        });

    };


  //**************************************************************************
  //** setConfig
  //**************************************************************************
    this.setConfig = function(chartConfig){
        if (!chartConfig) config = defaultConfig;
        else config = merge(chartConfig, defaultConfig);

        if (config.showTooltip===true){
            tooltip = createTooltip();
        }
        else{
            tooltip = false;
        }

        config.maxGroups = parseInt(config.maxGroups+"");
        config.maxItems = parseInt(config.maxItems+"");
    };


  //**************************************************************************
  //** getTooltipLabel
  //**************************************************************************
  /** Called whenever a tooltip is rendered. Override as needed.
   */
    this.getTooltipLabel = function(d, i){
        var label = d.name;
        if (d.group){
            if (d.group.length>0) label += " (" + d.group + ")";
        }
        return label + "<br/>" + me.getValueLabel(d.value);
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
  //** onClick
  //**************************************************************************
  /** Called whenever a user clicks on a cell
   */
    this.onClick = function(cell, data){};


  //**************************************************************************
  //** onDblClick
  //**************************************************************************
  /** Called whenever a user double-clicks on a cell
   */
    this.onDblClick = function(cell, data){};


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        if (plotArea) plotArea.selectAll("*").remove();
        cells = null;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(chartConfig, data, callback){
        me.clear();
        if (arguments.length===0) return;


      //Shift arguments as needed
        if (Array.isArray(chartConfig)) {
            callback = data;
            data = chartConfig;
        }
        else{
            me.setConfig(chartConfig);
        }


      //Render chart and call the callback
        checkSVG(me, function(){
            renderChart(data);
            if (callback) callback();
        });
    };


  //**************************************************************************
  //** getSVG
  //**************************************************************************
    this.getSVG = function(){
        return svg;
    };


  //**************************************************************************
  //** getGroup
  //**************************************************************************
    this.getGroup = function(groupName){
        var arr = [];
        if (cells){
            cells.each(function(n) {
                if (n.data.group===groupName){
                    var cell = d3.select(this).node();
                    arr.push({
                        cell: cell,
                        rect: cell, //legacy, should be deprecated
                        data: n.data
                    });
                }
            });
        }
        return arr;
    };


  //**************************************************************************
  //** getGroups
  //**************************************************************************
    this.getGroups = function(){
        var groups = {};
        if (cells){
            cells.each(function(n) {
                var groupName = n.data.group;
                groups[groupName] = [];
            });
        }
        for (var groupName in groups) {
            if (groups.hasOwnProperty(groupName)){
                groups[groupName] = me.getGroup(groupName);
            }
        }
        return groups;
    };


  //**************************************************************************
  //** getNestedObject
  //**************************************************************************
  /* Used to parse through the data hierarchy (parameter: object) and return
   * the object matching the value (parameter: value) of key (parameter: key)
   */
    var getNestedObject = (object, key, value) => {
        if (!object) return null;
        if (Array.isArray(object)) {
          for (const obj of object) {
            const result = getNestedObject(obj, key, value);
            if (result) {
              return obj;
            }
          }
        }
        else {
          if (object.hasOwnProperty(key) && object[key] === value) {
            return object;
          }
          for (const k of Object.keys(object)) {
            if (typeof object[k] === "object") {
              const o = getNestedObject(object[k], key, value);
              if (o !== null && typeof o !== 'undefined')
                return o;
            }
          }
          return null;
        }
    };


  //**************************************************************************
  //** getDataHierarchy
  //**************************************************************************
  /* Used to update data so it fits into the format for d3.hierarchy
   */
    var getDataHierarchy = function(data){

      //Generate unique list of group names
        var groupNames = new Set();
        var groupBy = config.groupBy;
        if (groupBy){
            groupBy = (config.groupBy + "").trim();
            if (groupBy.length>0){
                data.forEach((d)=>{
                    var group = d[groupBy];
                    groupNames.add(group);
                });
            }
        }



      //Update value fields in the data
        var arr = [];
        data.forEach((d)=>{
            var value = d[config.value];
            var f = bluewave.chart.utils.parseFloat(value);
            if (f==0 || isNaN(f)){

            }
            else{
                d[config.value] = f;
                arr.push(d);
            }
        });
        if (arr.length!==data.length) data = arr;




        var dataHierarchy = {
            children: [],
            name: "all"
        };



        if (groupNames.size>0){
            groupNames.forEach((g)=> {
                dataHierarchy["children"].push({
                    name: g,
                    children: [],
                    colname: "level2"
                });
                var objectToInsertTo = getNestedObject(dataHierarchy["children"], 'name', g);

                data.forEach((d)=>{
                    var key = d[config.key];
                    var groupByValue = d[groupBy];
                    var value = d[config.value];

                    if (g === groupByValue){
                        // check whether record already exists - if he does then accumulate values with pre-existing record
                        var record = getNestedObject(objectToInsertTo["children"],"name", key);
                        if (typeof(record) !== "undefined"){
                            record["value"] += value;
                        }
                        else { // create new record
                            objectToInsertTo["children"].push({
                                name: key,
                                group: groupByValue,
                                colname:"level3",
                                value:value
                            });
                        };
                    };
                });
            });


            var values = {};
            dataHierarchy.children.forEach((d)=>{
                var val = 0;
                d.children.forEach((c)=>{
                    val+=c.value;
                });
                values[d.name] = val;
            });


          //Identify groups to remove
            var del = [];
            for (var key in values) {
                if (values.hasOwnProperty(key)){
                    var value = values[key];
                    if (value==0) del.push(key);
                }
            }


          //Remove empty groups
            while (del.length>0){
                var d = del.shift();
                for (var i=0; i<dataHierarchy.children.length; i++){
                    if (dataHierarchy.children[i].name==d){
                        dataHierarchy.children.splice(i, 1);
                        break;
                    }
                }
            }


          //Sort children by value
            dataHierarchy.children.sort((a, b)=>{
                return values[b.name]-values[a.name];
            });



          //Prune groups as needed
            if (dataHierarchy.children.length>config.maxGroups){
                var arr = [];
                for (var i=0; i<dataHierarchy.children.length; i++){
                    if (i<config.maxGroups-1){
                        arr.push(dataHierarchy.children[i]);
                    }
                    else{
                        var children = [];
                        for (var j=i; j<dataHierarchy.children.length; j++){
                            children.push(...dataHierarchy.children[j].children);
                        }
                        for (var j=0; j<children.length; j++){
                            children[j].group = "Other";
                        }
                        arr.push({
                            name: "Other",
                            children: children,
                            colname: "level2"
                        });
                        break;
                    }
                }
                dataHierarchy.children = arr;
            }



          //Prune items within groups as needed
            dataHierarchy.children.forEach((d)=>{
                if (d.children.length>config.maxItems){

                    var arr = [];
                    for (var i=0; i<d.children.length; i++){
                        if (i<config.maxItems-1){
                            arr.push(d.children[i]);
                        }
                        else{

                            var group, value = 0;
                            for (var j=i; j<d.children.length; j++){
                                group = d.children[j].group;
                                value+=d.children[j].value;
                            }

                            arr.push({
                                name: "Other",
                                group: group,
                                value: value,
                                colname: "level3"
                            });
                            break;
                        }
                    }
                    d.children = arr;
                }
            });


          //Update groupNames
            groupNames = [];
            dataHierarchy.children.forEach((d)=>{
                groupNames.push(d.name);
            });

        }
        else{
            groupNames = null;

            dataHierarchy["children"].push({
                name: "",
                children: [],
                colname: "level2"
            });
            var objectToInsertTo = getNestedObject(dataHierarchy["children"], 'name', "");

            data.forEach((d)=>{
                var key = d[config.key];
                var value = d[config.value];
                var groupByValue = "";

                // check whether record already exists - if he does then accumulate values with pre-existing record
                var record = getNestedObject(objectToInsertTo["children"],"name", key);
                if (typeof(record) !== "undefined"){
                    record["value"] += value;
                }
                else { // create new record
                    objectToInsertTo["children"].push({
                        name: key,
                        group: "",
                        colname:"level3",
                        value: value
                    });
                };

            });



          //Prune items as needed
            if (dataHierarchy.children[0].children.length>config.maxItems){
                var arr = [];
                for (var i=0; i<dataHierarchy.children[0].children.length; i++){
                    if (i<config.maxItems-1){
                        arr.push(dataHierarchy.children[0].children[i]);
                    }
                    else{

                        var value = 0;
                        for (var j=i; j<dataHierarchy.children[0].children.length; j++){
                            value+=dataHierarchy.children[0].children[j].value;
                        }

                        arr.push({
                            name: "Other",
                            group: "",
                            value: value,
                            colname: "level3"
                        });
                        break;
                    }
                }
                dataHierarchy.children[0].children = arr;
            }

        };


      //Compute hierarchy where the size of each leaf is defined by the 'value' field
        var root = d3.hierarchy(dataHierarchy).sum((d) => d.value );
        var leaves = root.leaves();
        var descendants = root.descendants().filter((d) => d.depth==1 );


        return {
            root: root,
            leaves: leaves,
            descendants: descendants,
            groupNames: groupNames,
            children: dataHierarchy["children"]
        };
    };


  //**************************************************************************
  //** renderChart
  //**************************************************************************
    var renderChart = function(data){

      //Convert data into a hierarchical dataset
        data = getDataHierarchy(data);



      //Get group names
        var groupNames = data.groupNames;
        if (typeof(groupNames) === "undefined" || groupNames === null){
            groupNames = [];
        }


      //Create an array of colors, one for each group name
        var colors = config.colors;
        var numColors = groupNames.length;
        if (numColors>colors.length){
            colors = getColorRange(numColors, colors);
        }


      //Create getColor function used to set cell color
        getColor = function(groupName){
            var color = colors[0];
            for (var i=0; i<groupNames.length; i++){
                if (groupNames[i]===groupName){
                    color = colors[i];
                    break;
                }
            }
            return color;
        };


      //Get dimensions of the svg element
        var rect = javaxt.dhtml.utils.getRect(svg.node());


      //Render chart
        if (config.shape==="circle"){
            renderVoronoi(data, rect);
        }
        else{
            renderTiles(data, rect);
        }
    };


  //**************************************************************************
  //** renderTiles
  //**************************************************************************
    var renderTiles = function(data, rect){


      //Calculate group padding using a phantom/temporary element
        var groupPadding = 0;
        if (config.groupLabel && data.descendants.length>1){
            var text = plotArea.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "start")
            .text("Iq");
            setStyle(text, config.style.groupLabel);
            groupPadding = text.node().getBBox().height;
            text.remove();
        }

        plotArea.attr("class", "treemap");



      //Compute treemap
        d3.treemap()
            .size([rect.width, rect.height])
            .paddingTop(groupPadding)
            .paddingInner(0) //Padding between each rectangle
            (data.root);



        // opacity scale
        var opacity = function(currValue, groupName){

            var parsingObject = getNestedObject(data["children"],"name",groupName);
            var values = new Array();
            parsingObject["children"].forEach(d => {
                values.push(d["value"]);
            });

            var calculatedScale = d3.scaleLinear()
            .domain([d3.min(values), d3.max(values)])
            .range([.5, 1]);

            return calculatedScale(currValue);
        };




      //Add cells
        cells =
            plotArea
            .selectAll("rect")
            .data(data.leaves)
            .enter()
            .append("rect")
            .attr('x', (d) => d.x0 )
            .attr('y', (d) => d.y0 )
            .attr('width', (d) => d.x1 - d.x0 )
            .attr('height', (d) => d.y1 - d.y0 )
            .style("stroke", "white")
            .style("fill", (d) => getColor(d.parent.data.name) )
            .style("opacity", (d) => opacity(d.data.value, d.data.group) )
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
            .on("click", function(e, d){
                me.onClick(this, d.data);
            })
            .on("dblclick", function(e, d){
                me.onDblClick(this, d.data);
            });





      //Add labels
        var yOffsets = [];
        var labelPadding = 3;
        if (config.keyLabel){

            cells.each(function(n) {
                var label = me.getKeyLabel(n.data.name, n.data);

              //Get cell dimensions
                var rect = d3.select(this).node();
                var box = rect.getBBox();
                var maxX = box.x+box.width;
                var maxY = box.y+box.height;


              //Create label
                var text = plotArea.append("text")
                .attr("x", box.x+2 )
                .attr("y", box.y )
                .attr("text-anchor", "start")
                .attr("class", "label")
                .text(label);


              //Update label style
                setStyle(text, config.style.keyLabel);


              //Adjust height after setting style
                var t = text.node().getBBox();
                text.attr("y", box.y+(t.height/2)+labelPadding );


              //Get label dimensions
                t = text.node().getBBox();
                var right = t.x+t.width;
                var bottom = t.y+t.height;


                var yOffset = 0;
                if (right>maxX){
                    text.remove();
                }
                else{
                    if (bottom>maxY){
                        text.remove();
                    }
                    else{
                        yOffset = t.y + t.height;
                    }
                }

                yOffsets.push(yOffset);
            });
        };



      //Add values
        if (config.valueLabel){

            cells.each(function(n, i) {
                var yOffset = yOffsets[i];
                if (yOffset===0 && config.keyLabel) return;

                var label = me.getValueLabel(n.data.value, n.data);

              //Get cell dimensions
                var rect = d3.select(this).node();
                var box = rect.getBBox();
                var maxX = box.x+box.width;
                var maxY = box.y+box.height;


              //Create label
                var text = plotArea.append("text")
                .attr("x", box.x+2 )
                .attr("y", box.y )
                .attr("text-anchor", "start")
                .attr("class", "value label")
                .text(label);


              //Update label style
                setStyle(text, config.style.valueLabel);



              //Adjust height after setting style
                var t = text.node().getBBox();
                text.attr("y", yOffset+(t.height/2));


                t = text.node().getBBox();
                var right = t.x+t.width;
                var bottom = t.y+t.height;


                if (right>maxX){
                    text.remove();
                }
                else{
                    if (bottom>maxY){
                        text.remove();
                    }
                }
            });
        };



      //Add group labels
        if (config.groupLabel && groupPadding>0){

            var groupLabels =
            plotArea
            .selectAll("titles")
            .data(data.descendants)
            .enter()
            .append("text")
            .attr("class", "group label")
            .attr("x", (d) => d.x0+1)
            .attr("y", (d) => d.y0+groupPadding-labelPadding)
            .text((d) => d.data.name )
            .attr("fill",  (d) => getColor(d.data.name) );


            var arr = [];
            groupLabels.each(function(n, i) {

              //Update style
                setStyle(this, config.style.groupLabel);

              //Get label dimensions
                var box = this.getBBox();
                var right = box.x+box.width;


              //Get group dimensions
                var maxX = 0;
                n.children.forEach((child)=>{
                    maxX = Math.max(child.x1, maxX);
                });


              //If label is wider than the group, mark for deletion
                if (right>maxX){
                    arr.push(d3.select(this));
                }
            });


          //Remove labels that are too wide
            arr.forEach((groupLabel)=>{
                groupLabel.remove();
            });

        };

    };


  //**************************************************************************
  //** renderVoronoi
  //**************************************************************************
  /** Used to render a Voronoi treemap, clipped to a circle. Requires the
   *  d3-voronoi-treemap plugin. More info here:
   *  https://github.com/Kcnarf/d3-voronoi-treemap
   */
    var renderVoronoi = function(data, rect){


      //Set dimensions
        var width = rect.width;
        var height = rect.height;
        var radius = (Math.min(width, height)/2)-5;
        var center = [width/2, height/2];



      //Create container for the treemap
        var treemapContainer = plotArea.append("g")
        .attr("transform", "translate("+center+")")
        .attr("class", "voronoi treemap");


      //Create polygon for the perimeter circle
        var polygon = getPoints(60, radius);


      //Render outer circle
        treemapContainer.append("path")
        .attr("transform", "translate("+[-radius,-radius]+")")
        .attr("d", "M"+polygon.join(",")+"Z");




      //Compute voronoi treemap, clipped to the outer polygon
        d3.voronoiTreemap().clip(polygon)(data.root);



      //Render cells
        cells =
            treemapContainer.append("g")
            .attr("transform", "translate("+[-radius,-radius]+")")
            .selectAll("path")
            .data(data.leaves)
            .enter()
            .append("path")
            .attr("d", function(d){ return "M"+d.polygon.join(",")+"z"; })
            .style("fill", (d) => getColor(d.parent.data.name))
            .style("stroke", "white")
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
            .on("click", function(e, d){
                me.onClick(this, d.data);
            })
            .on("dblclick", function(e, d){
                me.onDblClick(this, d.data);
            });




      //Create label group and compute centroids as needed
        var labelGroup;
        var centroids;
        if (config.keyLabel || config.valueLabel){

            labelGroup = treemapContainer.append("g")
            .attr("transform", "translate("+[-radius,-radius]+")");

            centroids = [];
            cells.each(function(n) {
                var centroid = d3.polygonCentroid(n.polygon);
                centroids.push(centroid);
            });
        }



      //Add key labels
        var yOffsets = [];
        if (config.keyLabel){

            cells.each(function(n, i) {


              //Create label
                var label = me.getKeyLabel(n.data.name, n.data);
                var centroid = centroids[i];
                var text = labelGroup.append("text")
                .attr("x", centroid[0] )
                .attr("y", centroid[1] )
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("class", "label")
                .text(label);


              //Update label style
                setStyle(text, config.style.keyLabel);


              //Set yOffset
                var yOffset = 0;
                if (intersects(text, n)){
                    text.remove();
                }
                else{
                    var t = text.node().getBBox();
                    yOffset = t.y + t.height + 4; //+4 = extra padding
                }

                yOffsets.push(yOffset);

            });
        }


      //Add value labels
        if (config.valueLabel){

            cells.each(function(n, i) {
                var yOffset = yOffsets[i];
                if (yOffset===0 && config.keyLabel) return;

              //Create label
                var label = me.getValueLabel(n.data.value, n.data);
                var centroid = centroids[i];
                var text = labelGroup.append("text")
                .attr("x", centroid[0] )
                .attr("y", yOffset )
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("class", "value label")
                .text(label);


              //Update label style
                setStyle(text, config.style.valueLabel);

                var t = text.node().getBBox();
                if (t.y<yOffset){
                    text.attr("y", yOffset);
                }

                if (intersects(text, n)){
                    text.remove();
                }

            });
        }

    };


  //**************************************************************************
  //** getPoints
  //**************************************************************************
  /** Returns a array of coordinates representing a circle
   */
    var getPoints = function(numPoints, radius) {

        var increment = (2*Math.PI)/numPoints;
        var points = [];

        for (var a=0, i=0; i<numPoints; i++, a+=increment) {
            points.push(
                [radius + radius*Math.cos(a), radius + radius*Math.sin(a)]
            );
        }

      	return points;
    };


  //**************************************************************************
  //** mouseover
  //**************************************************************************
    var mouseover = function(e, d) {
        if (tooltip){
            var i = cells.nodes().indexOf(this);
            var label = me.getTooltipLabel(d.data, i);
            tooltip.html(label).show();
        }
        d3.select(this).transition().duration(100).attr("opacity", "0.8");
    };


  //**************************************************************************
  //** mousemove
  //**************************************************************************
    var mousemove = function(e) {
        //var e = d3.event;
        if (tooltip) tooltip
        .style('top', (e.clientY) + "px")
        .style('left', (e.clientX + 20) + "px");
    };


  //**************************************************************************
  //** mouseleave
  //**************************************************************************
    var mouseleave = function() {
        if (tooltip) tooltip.hide();
        d3.select(this).transition().duration(100).attr("opacity", "1");
    };


    var intersects = function(text, n){

      //Get label dimensions
        var t = text.node().getBBox();
        var p = [
            [t.x, t.y],
            [t.x+t.width, t.y],
            [t.x+t.width, t.y+t.height],
            [t.x, t.y+t.height],
            [t.x, t.y]
        ];


      //Get intersection between the label and cell
        var clip = bluewave.chart.utils.clipPolygon(n.polygon, p);



      //Remove label if the label is bigger than the cell
        var removeLabel = true;
        if (clip){
            if (clip.length===5){
                var numMatches = 0;
                for (var i=0; i<clip.length; i++){
                    var a = clip[i];
                    var b = p[i];
                    if (a[0]===b[0] && a[1]===b[1]){
                        numMatches++;
                    }
                }
                if (numMatches===5){
                    removeLabel = false;
                }
            }
        }
        else{
            removeLabel = false;
        }
        return removeLabel;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
   var merge = javaxt.dhtml.utils.merge;
   var checkSVG = bluewave.chart.utils.checkSVG;
   var round = javaxt.dhtml.utils.round;
   var initChart = bluewave.chart.utils.initChart;
   var createTooltip = bluewave.chart.utils.createTooltip;
   var setStyle = bluewave.chart.utils.setStyle;
   var getColorRange = bluewave.chart.utils.getColorRange;

   init();
};