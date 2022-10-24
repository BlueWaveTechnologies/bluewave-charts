if(!bluewave) var bluewave={};
if(!bluewave.charts) bluewave.charts={};

//******************************************************************************
//**  TreeMapChart
//******************************************************************************
/**
 *   Panel used to create tree map charts
 *
 ******************************************************************************/

bluewave.charts.TreeMapChart = function(parent, config) {

    var me = this;
    var defaultConfig = {
        key: "name",
        value: "value",
        groupBy: null,
        colors: d3.schemeCategory10,
        keyLabel: true,
        valueLabel: true,
        groupLabel: true,
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
    var groupNames = [];


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
        return label + "<br/>" + d.value;
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
        value = parseFloat(value);
        if (isNaN(value)) return "";
        return round(value, 2);
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
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(chartConfig, data){
        me.clear();
        me.setConfig(chartConfig);

        var parent = svg.node().parentNode;
        onRender(parent, function(){
            renderChart(data);
        });
    };


  //**************************************************************************
  //** getGroup
  //**************************************************************************
    this.getGroup = function(groupName){
        var arr = [];
        plotArea.selectAll("rect").each(function(n) {
            if (n.data.group===groupName){
                arr.push({
                    rect: d3.select(this).node(),
                    data: n.data
                });
            }
        });
        return arr;
    };


  //**************************************************************************
  //** getNestedObject
  //**************************************************************************
  /* Used to parse through the data heirarchy (parameter: object) and return
   * the object matching the value (parameter: value) of key (parameter: key)
   */
    var getNestedObject = (object, key, value) => {
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

        groupNames = [];
        var groupsToUse;
        if (config.groupBy !== null){
          //populate groupNames by filtering through the config-set dataset 'groupBy'
          //column to seperate records into unique values of this column
            data.forEach((d)=>{
                var group = d[config.groupBy];
                groupNames.push(group);
            });

            function onlyUnique(value, index, self) { // returns only unique values from an array
                return self.indexOf(value) === index;
            }


            groupsToUse = groupNames.filter(onlyUnique);
        }

      //Update value fields in the data
        data.forEach((d)=>{
            var value = d[config.value];
            d[config.value] = parseFloat(value);
        });




        var dataHierarchy = {
            "children":[],
            "name":"all"
        };



        if (config.groupBy !== null){

            groupsToUse.forEach((g)=> {
                dataHierarchy["children"].push({"name": g, "children":[], "colname":"level2"});
                var objectToInsertTo = getNestedObject(dataHierarchy["children"], 'name', g);

                data.forEach((d)=>{
                    var userValue = d[config.key];
                    var groupByValue = d[config.groupBy];
                    var value = d[config.value];

                    if (g === groupByValue){
                        // check whether this user already exists - if he does then accumulate values with pre-existing record
                        if (typeof(getNestedObject(objectToInsertTo["children"],"name", userValue)) !== "undefined"){
                            var userRecord = getNestedObject(objectToInsertTo["children"],"name", userValue);
                            userRecord["value"] = userRecord["value"] + value;
                        }
                        else {    // create new user record
                            objectToInsertTo["children"].push({"name": userValue,"group": groupByValue, "colname":"level3","value":value});
                        };
                    };
                });
            });
        }

        else{
            dataHierarchy["children"].push({"name": "", "children":[], "colname":"level2"});
            var objectToInsertTo = getNestedObject(dataHierarchy["children"], 'name', "");

            data.forEach((d)=>{
                var userValue = d[config.key];
                var value = d[config.value];
                var groupByValue = "";
                // check whether this user already exists - if he does then accumulate values with pre-existing record
                if (typeof(getNestedObject(objectToInsertTo["children"],"name", userValue)) !== "undefined"){
                    var userRecord = getNestedObject(objectToInsertTo["children"],"name", userValue);
                    userRecord["value"] = userRecord["value"] + value;
                }

                else {    // create new user record
                    objectToInsertTo["children"].push({"name": userValue,"group": groupByValue, "colname":"level3","value":value});
                };

            });

        };
        return dataHierarchy;
    };


  //**************************************************************************
  //** renderChart
  //**************************************************************************
    var renderChart = function(data){

        var chartConfig = config;


      //Get parent width/height
        var rect = javaxt.dhtml.utils.getRect(svg.node());
        var width = rect.width;
        var height = rect.height;


        data = getDataHierarchy(data);


        // Give the data to this cluster layout:
        var root = d3.hierarchy(data).sum((d) => d.value ); // Here the size of each leave is given in the 'value' field in input data


        var descendants = root.descendants().filter((d) => d.depth==1 );


      //Set group padding
        var groupPadding = 0;
        if (chartConfig.groupLabel && descendants.length>1){
            var text = plotArea.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "start")
            .text("Iq");
            setStyle(text, config.style.groupLabel);
            groupPadding = text.node().getBBox().height;
            text.remove();
        }




        // Use d3.treemap to compute the position of each element of the hierarchy
        d3.treemap()
            .size([width, height])
            .paddingTop(groupPadding)
            .paddingInner(0) //Padding between each rectangle
            (root);

        // color scale
        if (typeof(groupNames) !== "undefined"){
            var color = d3.scaleOrdinal()
                .domain(groupNames)
                .range(chartConfig.colors);
        }
        else{
            var color = d3.scaleOrdinal()
                .range(chartConfig.colors);
        };


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



        var tooltip;
        if (config.showTooltip===true){
            tooltip = createTooltip();
        }

        var mouseover = function(d, i) {
            if (tooltip){
                //let rect = d3.select(this);
                var label = me.getTooltipLabel(d.data, i);
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



      //Add rectangles
        var rectangles =
            plotArea
            .selectAll("rect")
            .data(root.leaves())
            .enter()
            .append("rect")
            .attr('x', (d) => d.x0 )
            .attr('y', (d) => d.y0 )
            .attr('width', (d) => d.x1 - d.x0 )
            .attr('height', (d) => d.y1 - d.y0 )
            .style("stroke", "white")
            .style("fill", (d) => color(d.parent.data.name) )
            .style("opacity", (d) => opacity(d.data.value, d.data.group) )
            .attr("rectID", function(d, i, arr){
                return i;
            })
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
            .on("click", function(d){
                me.onClick(this, d.data);
            })
            .on("dblclick", function(d){
                me.onDblClick(this, d.data);
            });





      //Add labels
        var yOffsets = [];
        var labelPadding = 3;
        if (chartConfig.keyLabel){

            rectangles.each(function(n) {
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
        if (chartConfig.valueLabel){

            rectangles.each(function(n, i) {
                var yOffset = yOffsets[i];
                if (yOffset===0 && chartConfig.keyLabel) return;

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
        if (chartConfig.groupLabel && groupPadding>0){

            var groupLabels =
            plotArea
            .selectAll("titles")
            .data(descendants)
            .enter()
            .append("text")
            .attr("x", (d) => d.x0+1)
            .attr("y", (d) => d.y0+groupPadding-labelPadding)
            .text((d) => d.data.name )
            .attr("fill",  (d) => color(d.data.name) );


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
  //** Utils
  //**************************************************************************
   var merge = javaxt.dhtml.utils.merge;
   var onRender = javaxt.dhtml.utils.onRender;
   var round = javaxt.dhtml.utils.round;
   var initChart = bluewave.chart.utils.initChart;
   var createTooltip = bluewave.chart.utils.createTooltip;
   var setStyle = bluewave.chart.utils.setStyle;

   init();
};