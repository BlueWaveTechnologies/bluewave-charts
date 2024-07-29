if(!bluewave) var bluewave={};
if(!bluewave.charts) bluewave.charts={};

//******************************************************************************
//**  CalendarChart
//******************************************************************************
/**
 *   Chart used to render days in a year and an associated value.
 *
 ******************************************************************************/

bluewave.charts.CalendarChart = function(parent, config) {


    var me = this;
    var defaultConfig = {

      /** If true, will render labels for each row.
       */
        dayLabel: true,

      /** If true, will render a year label for each calendar.
       */
        yearLabel: true,

        date: "date",
        value: "value",

      /** Used to specify the start of the week. Options include "weekday",
       *  "sunday", or "monday".
       */
        weekday: "sunday",


      /** An array of colors used to specify fill colors. Typically lighter
       *  colors represent smaller values and darker colors represent larger
       *  values.
       */
        colors: ["#fff","#ebf5dc","#cbe9a5","#2a671a"],


      /** When coloring cells in the calendar, values are grouped into classes
       *  using Jenks natural breaks. The numClasses config is used to specify
       *  the maximum number of classes (i.e. max number of colors)
       */
        numClasses: 10,


      /** Color for the line used to separate months.
       */
        boundaryColor: "#fff",


      /** If true, will render a tooltip over each cell in the calendar when
       *  a user hovers over the cell. The contents of the tooltip can be
       *  customized by overriding the getTooltipLabel() method.
       */
        showTooltip: false
    };

    var svg, chart, calendarArea;



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
  //** onClick
  //**************************************************************************
    this.onClick = function(el, d){};


  //**************************************************************************
  //** getCell
  //**************************************************************************
  /** Return a DOM element associated with a given date
   */
    this.getCell = function(date){
        date = new Date(date);
        var year = date.getFullYear();
        var month = date.getMonth();
        var day = date.getDate();


        var el = null;
        calendarArea.selectAll("rect").each(function(date) {
            var y = date.getFullYear();
            var m = date.getMonth();
            var d = date.getDate();
            if (y===year && m===month && d===day){
                el = this;
            }
        });

        return el;
    };


  //**************************************************************************
  //** getTooltipLabel
  //**************************************************************************
    this.getTooltipLabel = function(d){
        return d3.utcFormat("%m/%d/%Y")(d.date) + "<br/>" + d3.format(",")(d.value);
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        if (chart) chart.selectAll("*").remove();
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(chartConfig, data){

        me.clear();

        if (arguments.length>1){
            config = merge(chartConfig, defaultConfig);
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
        me.clear();
        if (!config.date || !config.value) return;



        var rect = javaxt.dhtml.utils.getRect(svg.node());
        var width = rect.width;
        var height = rect.height;
        calendarArea = chart.append("g")
        .attr("width", width)
        .attr("height", height);



        var
        weekday = config.weekday,
        formatDay = i => "SMTWTFS"[i]; // given a day number in [0, 6], the day-of-week label

        const countDay = weekday === "sunday" ? i => i : i => (i + 6) % 7;
        const timeWeek = weekday === "sunday" ? d3.utcSunday : d3.utcMonday;
        const weekDays = weekday === "weekday" ? 5 : 7;



      //Group data by day
        var arr = {};
        data.forEach((d)=>{
            var date = new Date(d[config.date]);
            date.setHours(0,0,0,0);

            var key = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
            var value = bluewave.chart.utils.parseFloat(d[config.value]);

            var r = arr[key];
            if (r) r.value += value;
            else arr[key] = {
                date: date,
                value: value
            };
        });
        data = Object.values(arr);


      //Sort array in reverse chronological order
        data.sort(function(a, b){
            return b.date.getTime()-a.date.getTime();
        });


      //Create an array of dates and values
        var dates = [];
        var values = [];
        var years = {};
        var weeks = {};
        data.forEach((d)=>{
            var date = d.date;
            var value = d.value;
            dates.push(date);
            values.push(value);

            var year = date.getUTCFullYear();
            years[year+""] = year;

            var week = timeWeek.count(d3.utcYear(date), date);
            weeks[week+""] = parseInt(week);
        });
        years = Object.values(years);
        years.sort(function(a,b){
            return b - a;
        });


        var numWeeks = 0;
        var range = d3.extent(Object.values(weeks));
        for (var i=0; i<=range[1]; i++) numWeeks++;


      //Compute cellSize and xOffset
        var xOffset = 0;
        var maxWidth = width;
        if (config.dayLabel) xOffset = 15; //width of day labels?
        if (config.yearLabel) xOffset = Math.max(40, xOffset);
        var cellSize = Math.floor((maxWidth-xOffset)/numWeeks);




      //Create color function using natural breaks
        var breaks = getNaturalBreaks(values, config.numClasses);
        var colors = getColorRange(breaks.length+1, config.colors);
        var getColor = function(value){
            for (var i=0; i<breaks.length-1; i++){
                var currBreak = breaks[i];
                var nextBreak = breaks[i+1];
                var color = colors[i];

                if (value>=currBreak && value<nextBreak){
                    return color;
                }
                else{
                    if (value==breaks[breaks.length-1]){
                        return colors[colors.length-1];
                    }
                }
            }
        };


      //Create tooltip
        var tooltip;
        if (config.showTooltip===true){
            tooltip = createTooltip();
        }


        var mouseover = function(e, d) {
            if (tooltip){
                var i = cells.nodes().indexOf(this);
                var label = me.getTooltipLabel({date: d, value: values[i]});
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


      //Create groups for every year
        const groupHeight = cellSize * (weekDays + 2);
        var yearGroup = calendarArea.selectAll("*")
          .data(years)
          .join("g")
            .attr("transform", (d, i) => `translate(${xOffset-0.5},${groupHeight * i + cellSize * 1.5})`);

      //Add year label if option is checked
        if (config.yearLabel){

          //Add year label to every group
              yearGroup.append("text")
              .attr("class", "chart-axis-label")
              .attr("x", -5)
              .attr("y", -5)
              .attr("text-anchor", "end")
              .text(year => year);
        }


      //Add day label if option is checked
        if (config.dayLabel){

          //Add day of week abbreviation on the left side of each group
            yearGroup.append("g")
            .attr("class", "day label")
            .attr("text-anchor", "middle")
            .selectAll("text")
            .data(function(year){
                var arr = d3.range(7);
                arr.forEach(function(d, i){
                    arr[i] = {
                        day: d,
                        year: year
                    };
                });
                return arr;
            })
            .join("text")
                .attr("x", -10)
                .attr("y", function(d){
                    return (countDay(d.day) + 0.5) * cellSize;
                })
                .attr("dy", "0.31em")
                .text(function(d){
                    return formatDay(d.day);
                });
        }


      //Create table and cells
        var cells = yearGroup.append("g")
          .selectAll("*")
          .data(function(year){
              var arr = [];
              dates.forEach(function(date){
                  if (date.getUTCFullYear()===year) arr.push(date);
              });
              return arr;
          })
          .join("rect")
            .attr("width", cellSize - 1)
            .attr("height", cellSize - 1)
            .attr("x", date => timeWeek.count(d3.utcYear(date), date) * cellSize + 0.5)
            .attr("y", date => countDay(date.getUTCDay()) * cellSize + 0.5)
            .attr("fill", function(date, i){
                var value = values[i];
                var color = getColor(value);
                if (color===config.colors[0] && value>0){
                    color = colors[1];
                }
                return color;
            })
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
        .on("click", function(e, d){
            var i = cells.nodes().indexOf(this);
            me.onClick(this, {date: d, value: values[i]});
        });


      //Create month group
        var monthGroup = yearGroup.append("g")
          .selectAll("g")
          .data(function(year){

              var firstDay, lastDate;
              dates.forEach(function(date){
                  if (date.getUTCFullYear()===year){
                      if (!lastDate) lastDate = date;
                      firstDay = date;
                  }
              });

              firstDay = new Date(firstDay.getTime());
              lastDate = new Date(lastDate.getTime());

              firstDay.setMonth(firstDay.getMonth()-1);
              lastDate.setMonth(lastDate.getMonth()+1);
              return d3.utcMonths(firstDay, lastDate);
          })
          .join("g");


      //Add thick line to seperate months in the grid
        monthGroup.filter((d, i) => i).append("path")
            .attr("fill", "none")
            .attr("stroke", config.boundaryColor)
            .attr("stroke-width", 3)
            .attr("d", function(date) {
                const d = Math.max(0, Math.min(weekDays, countDay(date.getUTCDay())));
                const w = timeWeek.count(d3.utcYear(date), date);
                return `${d === 0 ? `M${w * cellSize},0`
                    : d === weekDays ? `M${(w + 1) * cellSize},0`
                    : `M${(w + 1) * cellSize},0V${d * cellSize}H${w * cellSize}`}V${weekDays * cellSize}`;
            });


      //Add month labels
        var renderedMonths = {};
        monthGroup.append("text")
            .attr("class", "month label")
            .attr("x", d => timeWeek.count(d3.utcYear(d), timeWeek.ceil(d)) * cellSize + 2)
            .attr("y", -5)
            .text(function(date){
                var month = d3.utcFormat("%b")(date);
                var year = d3.utcFormat("%Y")(date);
                var key = year+"-"+month;

                var dateInRange = false;
                dates.every(function(d){

                    var m = d3.utcFormat("%b")(d);
                    var y = d3.utcFormat("%Y")(d);
                    var k = y+"-"+m;
                    if (k===key){
                        dateInRange = true;
                        return false;
                    }
                    return true;
                });


                if (dateInRange){
                    if (!renderedMonths[key]){
                        renderedMonths[key]=true;
                        return month;
                    }
                }
            });

    };


   //**************************************************************************
   //** Utils
   //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var checkSVG = bluewave.chart.utils.checkSVG;
    var initChart = bluewave.chart.utils.initChart;
    var createTooltip = bluewave.chart.utils.createTooltip;
    var getColorRange = bluewave.chart.utils.getColorRange;
    var getNaturalBreaks = bluewave.chart.utils.getNaturalBreaks;


    init();

};