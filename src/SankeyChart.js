if(!bluewave) var bluewave={};
if(!bluewave.charts) bluewave.charts={};

//******************************************************************************
//**  SankeyChart
//******************************************************************************
/**
 *   Panel used to create sankey charts
 *
 ******************************************************************************/

bluewave.charts.SankeyChart = function(parent, config) {

    var me = this;
    var defaultConfig = {

        colors: d3.schemeCategory10,


      /** If true, will render labels for each node and link in the sankey.
       *  Default is false.
       */
        showTooltip: false,

      /** Keyword list used to parse input data.
       */
        keywords: {
            source: "source",
            target: "target",
            value: "value",
            group: "group"
        },

        links: {
            color: "#ccc",
            opacity: 0.3
        }
    };
    var svg, chart, sankeyArea;
    var nodes = [];
    var links = [];
    var getColor;


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
  //** getChart
  //**************************************************************************
    this.getChart = function(){
        return sankeyArea;
    };


  //**************************************************************************
  //** getNodeColor
  //**************************************************************************
  /** Called when a node is rendered. Returns a color for the node. You can
   *  override this method to set a custom color for the node.
   */
    this.getNodeColor = function(d){
        return getColor(d.name.replace(/ .*/, ""));
    };


  //**************************************************************************
  //** getNodeLabel
  //**************************************************************************
  /** Called when a node is rendered. Returns a label for the node. You can
   *  override this method to set a custom label for the node.
   */
    this.getNodeLabel = function(d){
        return d.name;
    };


  //**************************************************************************
  //** getTooltipLabel
  //**************************************************************************
  /** Called whenever a tooltip is rendered. Override as needed.
   */
    this.getTooltipLabel = function(type, d){
        if (type==="link"){
            return d.source.name + " -> " + d.target.name +  "<br/>" + formatNumber(d.value);
        }
        else if (type==="node"){
            return d.name +  "<br/>" + formatNumber(d.value);
        }
    };


  //**************************************************************************
  //** addNode
  //**************************************************************************
    this.addNode = function(name, group){
        if (!name) return;
        var node;
        if (name.name) node = name;
        else node = {
            name: name,
            group: group
        };
        nodes.push(node);
        return node;
    };


  //**************************************************************************
  //** addLink
  //**************************************************************************
    this.addLink = function(source, target, value){
        if (!source || !target) return;
        if (source.name) source = source.name;
        if (target.name) target = target.name;
        var link = {
            source: source,
            target: target,
            value: value
        };
        links.push(link);
        return link;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        clearChart();
        nodes = [];
        links = [];
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(chartConfig, data){
        //me.clear();
        if (arguments.length>1){
            me.setConfig(chartConfig);
        }
        else{
            data = arguments[0];
        }

        if (data){
            me.clear();


            if (isArray(data)){ //csv data from d3.csvParse(csv);

              //Parse data into nodes, links, and groups
                nodes = new Set();
                links = [];
                var groups = {};
                data.forEach((d)=>{

                    var group = d[config.keywords.group];
                    var source = d[config.keywords.source];
                    var target = d[config.keywords.target];
                    var value = parseFloat(d[config.keywords.value]+"");
                    if (isNaN(value)) return;

                    links.push({
                        source: source,
                        target: target,
                        value: value
                    });

                    nodes.add(source);
                    nodes.add(target);

                    var g = groups[group];
                    if (!g) {
                        g = new Set();
                        groups[group] = g;
                    }
                    g.add(source);
                });


              //Create "last" group with orphan nodes
                var lastGroup = new Set();
                nodes.forEach((node)=>{
                    var groupName = null;
                    for (var key in groups) {
                        if (groups.hasOwnProperty(key)){
                            if (groups[key].has(node)){
                                groupName = key;
                                break;
                            }
                        }
                    }
                    if (!groupName) lastGroup.add(node);
                });


              //Add last group to groups
                groups[new Date().getTime()+""] = lastGroup;


              //Create node array
                nodes = [];
                for (var key in groups) {
                    if (groups.hasOwnProperty(key)){
                        groups[key].forEach((node)=>{
                            nodes.push({
                                name: node,
                                group: key
                            });
                        });
                    }
                }
            }
            else{

                if (data.nodes && isArray(data.nodes)){
                    nodes = data.nodes;
                    nodes.forEach((node)=>{
                        node.group = node[config.keywords.group];
                    });
                }
                if (data.links && isArray(data.links)){
                    links = data.links;
                    links.forEach((link)=>{
                        link.source = link[config.keywords.source];
                        link.target = link[config.keywords.target];
                        var value = parseFloat(link[config.keywords.value]+"");
                        if (isNaN(value)) value = 0;
                        link.value = value;
                    });
                }
            }
        }


        checkSVG(me, function(){
            var parent = svg.node().parentNode;
            renderChart(parent);
        });
    };


  //**************************************************************************
  //** getSVG
  //**************************************************************************
    this.getSVG = function(){
        return svg;
    };


  //**************************************************************************
  //** clearChart
  //**************************************************************************
    var clearChart = function(){
        if (chart) chart.selectAll("*").remove();
    };


  //**************************************************************************
  //** renderChart
  //**************************************************************************
    var renderChart = function(parent){
        clearChart();


      //Create an array of colors, one for each group name
        var colors = config.colors;
        getColor = d3.scaleOrdinal(colors);



        var width = parent.offsetWidth;
        var height = parent.offsetHeight;
        sankeyArea = chart.append("g");
        sankeyArea
            .attr("name", "sankey")
            .attr("width", width)
            .attr("height", height);



      //Create sankey
        var sankey = d3
          .sankey()
          .nodeId((d) => d.name)
          .nodeWidth(20)
          .nodePadding(20)
          .iterations([6])
          .size([width, height]);


      //Add nodes and links to the sankey
        let graph = sankey({
            nodes: nodes,
            links: links
        });


        var size = sankey.size();
        var width = size[0];



        var getLinkColor = function(d, opacity){
            var linkColor;
            if (config.links.color==="source"){
                linkColor = d.source.color;
            }
            else{
                linkColor = config.links.color;
            }
            return mixColors(linkColor, "white", 1-opacity);
        };



      //Create tooltip
        var tooltip;
        if (config.showTooltip===true){
            tooltip = createTooltip(config.tooltipClass);
        }

        var mousemove = function(e) {
            if (tooltip) tooltip
            .style('top', (e.pageY) + "px")
            .style('left', (e.pageX + 20) + "px");
        };




      //Add the links
        var linkGroup = sankeyArea.append("g");
        linkGroup.attr("name", "links");

        var link = linkGroup.selectAll("*")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("class", "sankey-link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr('fill', 'none')
        .attr("stroke-width", function (d) {
              return Math.max(d.width, 1);
        })
        .on('mouseover', function(e, d) {
            if (tooltip){
                var label = me.getTooltipLabel("link", d);
                tooltip.html(label).show();
            }
            var opacity = Math.min(1, config.links.opacity*1.3);
            var linkColor = getLinkColor(d, opacity);
            d3.select(this).style("stroke", linkColor);
        })
        .on("mousemove", mousemove)
        .on('mouseleave', function(e, d) {
              if (tooltip) tooltip.hide();
              var linkColor = getLinkColor(d, config.links.opacity);
              d3.select(this).style("stroke", linkColor);
        });



      //Add the nodes
        var nodeGroup = sankeyArea.append("g");
        nodeGroup.attr("name", "nodes");

        var node = nodeGroup.selectAll("*")
          .data(graph.nodes)
          .enter()
          .append("g")
          .attr("class", "sankey-node");


      //Add the rectangles for the nodes
        node
        .append("rect")
        .attr("x", function (d) {
          return d.x0;
        })
        .attr("y", function (d) {
          return d.y0;
        })
        .attr("height", function (d) {
            return Math.max(d.y1 - d.y0, 1);
        })
        .attr("width", sankey.nodeWidth())
        .style("fill", function (d) {
          return (d.color = me.getNodeColor(d));
        })
        .style("stroke", function (d) {
          return d3.rgb(d.color).darker(2);
        })
        .on('mouseover', function(e, d) {
            if (tooltip){
                var label = me.getTooltipLabel("node", d);
                tooltip.html(label).show();
            }
            d3.select(this).transition().duration(100).attr("opacity", "0.8");
        })
        .on("mousemove", mousemove)
        .on('mouseleave', function(e, d) {
            if (tooltip) tooltip.hide();
            d3.select(this).transition().duration(100).attr("opacity", "1");
        });




      //Update link color AFTER node color is set
        link.each(function() {
            var path = d3.select(this);
            path.style("stroke", function (d) {
                return getLinkColor(d, config.links.opacity);
            });
        });



      //Add node labels
        node
          .append("text")
          .attr("x", function (d) {
            return d.x0 - 6;
          })
          .attr("y", function (d) {
            return (d.y1 + d.y0) / 2;
          })
          .attr("dy", "0.35em")
          .attr("text-anchor", "end")
          .text(function (d) {
              return me.getNodeLabel(d);
          })
          .filter(function (d) {
            return d.x0 < width / 2;
          })
          .attr("x", function (d) {
            return d.x1 + 6;
          })
          .attr("text-anchor", "start");
    };


    var formatNumber = d3.format(",.0f"); // zero decimal places


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var isArray = bluewave.chart.utils.isArray;
    var checkSVG = bluewave.chart.utils.checkSVG;
    var initChart = bluewave.chart.utils.initChart;
    var mixColors = bluewave.chart.utils.mixColors;
    var createTooltip = bluewave.chart.utils.createTooltip;

    init();
};