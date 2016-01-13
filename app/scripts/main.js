$(function() {

    var campaignId = 16400,
        adGroupId = 13470,
        region = [] 

    var impsLabel = "impressions", 
        clicksLabel = "clicks"

    var totalPoints = 60, //make sure not less 60
        defaultYaxes = 5

    var totalData = [],
        totalDataIndex = []

    var fetchInterval = 1000*30;

    var updateInterval = 1000;


    function addShowCity(city){ 
      if(region.includes("all")){region = []}
      if(city == "all"){
        region = ["all"]
      }else{
        region.push(city);
      }
      //console.log(region)
      fetchData();
      getLastHourClicksAndImps();
    }

    function getClicksAndImps(){
      $.ajax({
        dataType: "json",
        url: "http://eom.optimix.asia/Report/realtimeImpClick/"+campaignId+"/"+adGroupId+"/V2",
        type: 'GET',
        success: function(data){
          data["effect"] = [];
          for(var i=0;i<5;i++){
            var imp_count = Array(60).fill(0);
            var clicks_count = Array(60).fill(0);
            data["effect"][i] = {}
            $.each(region, function(index, value) {
              data[value][i]["imps"] = eval(data[value][i]["imps"])
              data[value][i]["clicks"] = eval(data[value][i]["clicks"])
              for(var j=0;j<60;j++){ imp_count[j] += data[value][i]["imps"][j]; clicks_count[j] += data[value][i]["clicks"][j];  }
            });
            data["effect"][i]["imps"] = imp_count;
            data["effect"][i]["clicks"] = clicks_count;
            data["effect"][i]["index"] = data["all"][i]["index"]
            //console.log(data)
            checkupSameData($.extend(true, {}, data["effect"][i]))
          }
        },
        error: function(e){
        }
      });
    }

    function checkupSameData(data) {
        if($.inArray(data["index"], totalDataIndex)==-1){
          totalData.push(data)
          totalDataIndex.push(data["index"])
        }
    }

    function fetchData() {
      getClicksAndImps()
      setTimeout(fetchData, fetchInterval);
    }
    
    addShowCity("all")
  

    function formatMaxData(max){ return Math.ceil(max/5)*5 }

    function calculateScope(index){
      var _end_index = (index+totalPoints)/60
      var _end_mod = (index+totalPoints)%60  
      return {"begin_min":Math.floor(index/60),
              "begin_sec":index%60,
              "end_min":_end_mod == 0 ? _end_index -1 : Math.floor(_end_index),
              "end_sec":_end_mod == 0 ? 59 :  _end_mod - 1}   
    } 

    function sliceData(begin_min,begin_sec,end_min,end_sec){
      var _impsData = [], _clicksData = []
      if(!$.isEmptyObject(totalData)&&!$.isEmptyObject(totalData[begin_min])&&!$.isEmptyObject(totalData[end_min])){      
        for(var i=begin_min;i<=end_min;i++){      
            if(i == begin_min){
              for(var j=begin_sec;j<60;j++){ _impsData.push(totalData[i]["imps"][j]);_clicksData.push(totalData[i]["clicks"][j]) }
            }else if(i == end_min){
              for(var j=0;j<=end_sec;j++){ _impsData.push(totalData[i]["imps"][j]);_clicksData.push(totalData[i]["clicks"][j]) }
            }else{
              for(var j=0;j<60;j++){ _impsData.push(totalData[i]["imps"][j]);_clicksData.push(totalData[i]["clicks"][j]) }
            }                  
        }
        return [_impsData,_clicksData]
      }
      return []
    }
   
    function getSerialData(index){     
      var scope = calculateScope(index);
      var data = sliceData(scope["begin_min"],scope["begin_sec"],scope["end_min"],scope["end_sec"]);
      return formatData(data,totalPoints) 
    }

    function formatData(data,length){
      var max_impsData = 0 , max_clicksData = 0 , impsData = [] , clicksData = []
      if(data.length!=0){
        for(var i=0;i < length;i++ ){
          impsData[i] = [i,data[0][i] === undefined ? 0 : data[0][i]]; 
          clicksData[i] = [i,data[1][i] === undefined ? 0 : data[1][i]];
        }
        max_impsData = Math.max(...data[0]); max_clicksData = Math.max(...data[1])     
      }else{
        for(var i=0;i < length;i++ ){impsData[i] = [i,0]; clicksData[i] = [i,0];}    
      }
      return {"impsData":{data:impsData,label:impsLabel},
              "clicksData":{data:clicksData,label:clicksLabel},
              "max_impsData":formatMaxData(max_impsData),
              "max_clicksData":formatMaxData(max_clicksData)}

    }

    function showInfo(item){
      if (item) {
        var x = item.datapoint[0],
          y = item.datapoint[1];
        $("#tooltip").html(y + " " + item.series.label)
          .css({top: item.pageY+5, left: item.pageX+5})
          .fadeIn(200);
      } else {
        $("#tooltip").hide();
      }     
    }
  
    var plot = $.plot("#placeholder",[getSerialData(0)["impsData"]], {   //,getSerialData(0)["clicksData"]
      series: {
        lines: {
          show: true,
          fill: true
        },
        points: {
          show: true
        },
        shadowSize: 0 // Drawing is faster without shadows
      },
      grid: {
        hoverable: true,
        borderColor: "#E2E6EE",
        borderWidth: 1,
        tickColor: "#E2E6EE"
      },
      colors: ["#e52a32", "#cccccc"],
      yaxis: {
        min: 0,
        max: defaultYaxes
      }
    });

    $("<div id='tooltip'></div>").css({
      position: "absolute",
      background: "#F8F8F8",
      padding: "3px 10px",
      display: "none",
      padding: "3px 10px",
      color: "#000",
      opacity: 0.9
    }).appendTo("body");

    $("#placeholder").bind("plothover", function (event, pos, item) {
      showInfo(item)
    })
    
    var series = 0 

    function update() {

      var newScopeData = getSerialData(series);

      plot.setData([newScopeData["impsData"]]);  //,newScopeData["clicksData"]

      if(newScopeData["max_impsData"] > defaultYaxes) {

        defaultYaxes = newScopeData["max_impsData"]
        
        plot.getOptions().yaxes[0].max = defaultYaxes

        plot.setupGrid()

      } 

      plot.draw();

      setTimeout(update, updateInterval);

      series++ ; 
    }

    update();

    //*********************************************************************//
   
    function getLastHourClicksAndImps(){
      $.ajax({
        dataType: "json",
        url: "http://eom.optimix.asia/Report/realtimeMinutes/"+10619+"/"+9703,
        type: 'GET',
        success: function(data){        
          data["effect"] = {};
          var imp_count = Array(60).fill(0);
          var clicks_count = Array(60).fill(0);
          $.each(region, function(index, value) {
              data[value]["imps"] = eval(data[value]["imps"]); data[value]["clicks"] = eval(data[value]["clicks"]);
              for(var j=0;j<60;j++){ imp_count[j] += data[value]["imps"][j]; clicks_count[j] += data[value]["clicks"][j];  }
          });
          data["effect"]["imps"] = imp_count;
          data["effect"]["clicks"] = clicks_count;
          data["effect"]["index"] = data["all"]["index"];
          var ret = getHourSerialData($.extend(true, {}, data["effect"]));
          var hourplot = $.plot("#hourplaceholder",[ret["impsData"]], { 
            series: {
              lines: {
                show: true
              },
              points: {
                show: true
              },
              shadowSize: 0 // Drawing is faster without shadows
            },
            grid: {
              hoverable: true,
              borderColor: "#E2E6EE",
              borderWidth: 1,
              tickColor: "#E2E6EE"
            },
            colors: ["#e52a32"],
            yaxis: {
              min: 0,
              max: ret["max_impsData"]
            }
          });
          $("#hourplaceholder").bind("plothover", function (event, pos, item) {
            showInfo(item)
          })

        },
        error: function(e){
        }
      });
    }

    function getHourSerialData(data){
      return formatData([data["imps"],data["clicks"]],60)
    }

   


  });




