$(function() {
  var campaignId = 0,adGroupId = 0,region = []; 

  var impsLabel = 'impressions', clicksLabel = 'clicks';

  var step = 3, totalPoints = 25, defaultYaxes = 5; //make sure not less 60/step

  var totalData = [],totalDataIndex = [],realTimeBox = [];

  var lastHourData = null, lastHourTimeBox = [],minTimeline = [];

  var baseSetting = {
                      series: {
                        lines: {
                          show: true,
                          fill: false
                        },
                        points: {
                          show: true
                        },
                        shadowSize: 0 // Drawing is faster without shadows
                      },
                      grid: {
                        hoverable: true,
                        borderColor: '#E2E6EE',
                        borderWidth: 1,
                        tickColor: '#E2E6EE'
                      },
                      colors: ['#e52a32', '#336dc6']
                    }

  var twentyfourData = [];

  var fetchInterval = 1000*30;

  var updateInterval = 1000*step;

  var lastHourUpdateInterval = 1000*60;

  var liveUrl = 'http://xapi.optimix.asia'

  $('.chosen-select').chosen();

  $('#showbutton').on('click',function(){
    region = [];totalData = [];totalDataIndex=[];
    campaignId = $('#campaignId').val();
    adGroupId = $('#adGroupId').val(); 
    if (campaignId==''||adGroupId==''){alert('error campaignId or adGroupId')}
    else{addShowCity(['All'])}
  })

  function addShowCity(cities){ 
    if(cities==null||cities.includes('All')||cities.length==0){
      region = ['all']
    }else{
      region = _.map(cities, function(n){return n.toLowerCase()+'shi'})
    }
    fetchData();
    getLastHourClicksAndImps();
    getTodayClicksAndImpsByHour();
  }

  $('#citiesSelect').chosen().change(function(){
    region = [];totalData = [];totalDataIndex=[];
    var cities = $(this).val();
    addShowCity(cities)
  });

  function getClicksAndImps(){
    $.ajax({
      dataType: 'json',
      url: liveUrl + '/Report/realtimeImpClick/'+campaignId+'/'+adGroupId+'/V2',
      type: 'GET',
      success: function(data){
        if(data != null){
          data['effect'] = [];
          for(var i=0;i<5;i++){ //5 mins
            var imp_count = Array(60).fill(0);
            var clicks_count = Array(60).fill(0);
            data['effect'][i] = {}
            $.each(region, function(index, value) {
              data[value][i]['imps'] = eval(data[value][i]['imps']);
              data[value][i]['clicks'] = eval(data[value][i]['clicks']);
              for(var j=0;j<60;j++){ 
                imp_count[j] += data[value][i]['imps'][j]; 
                clicks_count[j] += data[value][i]['clicks'][j]; 
              }
            });
            imp_count = _.chunk(imp_count, step);
            clicks_count = _.chunk(clicks_count, step);
            imp_count = _.map(imp_count,function(n){ var sum = n.join('+'); return eval('('+sum+')') })
            clicks_count = _.map(clicks_count,function(n){ var sum = n.join('+'); return eval('('+sum+')') })       
            data['effect'][i]['imps'] = imp_count;
            data['effect'][i]['clicks'] = clicks_count;
            data['effect'][i]['index'] = data['all'][i]['index'];
            //console.log(data)
            checkupSameData($.extend(true, {}, data['effect'][i]))
          }
        }
      },
      error: function(e){
        e
      }
    });
  }

  function pad(num, n) {
    var len = num.toString().length;
    while(len < n) {
        num = "0" + num;
        len++;
    }
    return num;
  }

  function checkupSameData(data) {
    if($.inArray(data['index'], totalDataIndex)==-1){
      totalData.push(data);
      totalDataIndex.push(data['index']);
    }
  }

  function fetchData() {
    getClicksAndImps()
    setTimeout(fetchData, fetchInterval);
  }

  function formatMaxData(max){   
    if(max<5){ return 5  }
    return Math.ceil(max/5)*5 
  }

  function calculateScope(index){
    var space = 60/step
    var _end_index = (index+totalPoints)/space
    var _end_mod = (index+totalPoints)%space
    return {'begin_min':Math.floor(index/space),
          'begin_sec':index%space,
          'end_min':_end_mod == 0 ? _end_index -1 : Math.floor(_end_index),
          'end_sec':_end_mod == 0 ? space-1 :  _end_mod - 1}   
  } 

  function sliceData(begin_min,begin_sec,end_min,end_sec){
    var _impsData = [], _clicksData = [];
    var space = 60/step;
    if(!$.isEmptyObject(totalData)&&!$.isEmptyObject(totalData[begin_min])&&!$.isEmptyObject(totalData[end_min])){      
      for(var i=begin_min;i<=end_min;i++){      
        if(i == begin_min){
          for(var j=begin_sec;j<space;j++){ _impsData.push(totalData[i]['imps'][j]);_clicksData.push(totalData[i]['clicks'][j]) }
        }else if(i == end_min){
          for( j=0;j<=end_sec;j++){ _impsData.push(totalData[i]['imps'][j]);_clicksData.push(totalData[i]['clicks'][j]) }
        }else{
          for( j=0;j<space;j++){ _impsData.push(totalData[i]['imps'][j]);_clicksData.push(totalData[i]['clicks'][j]) }
        }                  
      }
      return [_impsData,_clicksData]
    }
    return []
  }

  function formatMin(min){
    return Math.floor((min/60)).toString() + ":" + pad((min%60),2)
  }

  function createRollTimeBox(bm,bs,em,es) {
    var a1 = [],a2 = [], a3 = [];
    var space = 60/step;
    if(totalData.length != 0 ){
      for(var i=bs;i<space;i++){ 
        a1.push(formatMin(totalData[bm]["index"]) + ":" + pad(i*step,2))
      }
      for(var m=bm;m<em-1;m++){
        for(var j=0;j<space;j++){ 
          a2.push(formatMin(totalData[m]["index"]) + ":" + pad(j*step,2))
        }   
      }
      for(i=0;i<=es;i++){ 
        a3.push(formatMin(totalData[em]["index"]) + ":" + pad(i*step,2))
      }
    }   
    realTimeBox = a1.concat(a2).concat(a3);
  }

  function getSerialData(index){     
    var scope = calculateScope(index);
    var data = sliceData(scope['begin_min'],scope['begin_sec'],scope['end_min'],scope['end_sec']);
    createRollTimeBox(scope['begin_min'],scope['begin_sec'],scope['end_min'],scope['end_sec']);   
    return formatData(data,totalPoints,'roll') 
  }

  function fNumber(num){    
    var result = [ ], counter = 0;
    num = (num || 0).toString().split('');
    for (var i = num.length - 1; i >= 0; i--) {
      counter++;
      result.unshift(num[i]);
      if (!(counter % 3) && i != 0) { result.unshift(','); }
    }
    return result.join('');
  }    

  function formatData(data,length,type){
    var max_impsData = 0 , max_clicksData = 0 , impsData = [] , clicksData = [];
    function rollPoint(index){
      impsData[index] = [index,data[0][index] === undefined ? 0 : data[0][index]]; 
      clicksData[index] = [index,data[1][index] === undefined ? 0 : data[1][index]];
    }
    function initRollPoint(index){
      impsData[index] = [index,0]; clicksData[index] = [index,0];
    }
    function lastHourPoint(index){
      impsData[index] = [minTimeline[index],data[0][index] === undefined ? 0 : data[0][index]]; 
      clicksData[index] = [minTimeline[index],data[1][index] === undefined ? 0 : data[1][index]];    
    }
    function initLastHourPoint(index){    
      impsData[index] = [minTimeline[index],0]; 
      clicksData[index] = [minTimeline[index],0];  
    }
    if(data.length!=0){
      for(var i=0;i < length;i++ ){     
        type == "roll" ? rollPoint(i) : lastHourPoint(i)
      }
      max_impsData = Math.max(...data[0]); max_clicksData = Math.max(...data[1]);    
    }else{
      if(type=="lastHour"){
        var today = new Date(); var cDay = new Date();
        var y = today.getFullYear() , m = today.getMonth(); var d = today.getDate()
        for(var i=0;i<length;i++){
          cDay = new Date(y,m,d,0,0+i);minTimeline.push(cDay.getTime());
        }
      }
      for(i=0;i < length;i++ ){
        type == "roll" ? initRollPoint(i) : initLastHourPoint(i)
      }    
    }
    return {'impsData':{data:impsData,label:impsLabel},
            'clicksData':{data:clicksData,label:clicksLabel},
            'max_impsData':formatMaxData(max_impsData),
            'max_clicksData':formatMaxData(max_clicksData)}
  }

  function showInfo(item,id){
    if (item) {
      var y = fNumber(item.datapoint[1]);  var x = item.datapoint[0]; var z = item.dataIndex
      var ht = '';
      if(id == 'placeholder'){
        ht = realTimeBox[x]
      }else if(id == 'hourplaceholder'){
        ht = lastHourTimeBox[z]
      }else{
        ht = x+":00"
      }
      $('#tooltip').html(ht + '<br/>' + item.series.label + ":" + ' ' + y)
        .css({top: item.pageY+5, left: item.pageX+5})
        .fadeIn(200);
    } else {
      $('#tooltip').hide();
    }     
  }

  var plot = $.plot('#placeholder',[getSerialData(0)['impsData']], {   //,getSerialData(0)['clicksData']
    series: {
      lines: {
        show: true,
        fill: false
      },
      points: {
        show: true
      },
      shadowSize: 0 // Drawing is faster without shadows
    },
    grid: {
      hoverable: true,
      borderColor: '#E2E6EE',
      borderWidth: 1,
      tickColor: '#E2E6EE'
    },
    colors: ['#e52a32', '#cccccc'],
    yaxis: {
      min: 0,
      max: defaultYaxes
    }
  });

  $('<div id=\'tooltip\'></div>').css({
    position: 'absolute',
    background: '#F8F8F8',
    padding: '3px 10px',
    display: 'none',
    color: '#000',
    opacity: 0.9
  }).appendTo('body');

  $('#placeholder').bind('plothover', function (event, pos, item) {
    showInfo(item,$(this).attr('id'))
  })

  var series = 0; 

  var topPoint = defaultYaxes;

  function update() {

    var newScopeData = getSerialData(series);

    plot.setData([newScopeData['impsData']]);  //,newScopeData['clicksData']

    if(newScopeData['max_impsData'] != topPoint) {

      plot.getOptions().yaxes[0].max = newScopeData['max_impsData']

      plot.setupGrid();

      topPoint = newScopeData['max_impsData'];

    } 

    plot.draw();

    setTimeout(update, updateInterval);

    series++ ; 
  }

  update();

  //*********************************************************************//

  function getLastHourClicksAndImps(){
    $.ajax({
      dataType: 'json',
      url: liveUrl + '/Report/realtimeMinutes/'+campaignId+'/'+adGroupId,
      type: 'GET',
      success: function(data){   
        if(!_.isNull(data)){
          data['effect'] = {};
          var imp_count = Array(60).fill(0);
          var clicks_count = Array(60).fill(0);
          $.each(region, function(index, value) {
            data[value]['imps'] = eval(data[value]['imps']); data[value]['clicks'] = eval(data[value]['clicks']);
            for(var j=0;j<60;j++){ imp_count[j] += data[value]['imps'][j]; clicks_count[j] += data[value]['clicks'][j];  }
          });
          data['effect']['imps'] = imp_count;
          data['effect']['clicks'] = clicks_count;  
          var begin_minutes = parseInt(data['all']['index'])
          //create hover array 
          lastHourTimeBox = []
          for(var i=0;i<60;i++){ lastHourTimeBox.push(formatMin(begin_minutes+i)) }  
          //create xaxis array
          minTimeline = []
          var today = new Date(); var cDay = new Date();
          var hm = lastHourTimeBox[0].split(':');
          var hr = hm[0]; var min = hm[1];
          var y = today.getFullYear(); var m = today.getMonth(); var d = (begin_minutes > 1380 ? today.getDate()-1 : today.getDate())
          for(var i=0;i<60;i++){
            cDay = new Date(y,m,d,hr,parseInt(min)+i);minTimeline.push(cDay.getTime());
          }
          lastHourData = $.extend(true, {}, data['effect'])

          var scopeData = getHourSerialData();
          // console.log(scopeData)

          $.plot('#hourplaceholder',[scopeData['impsData']], { 
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
                        borderColor: '#E2E6EE',
                        borderWidth: 1,
                        tickColor: '#E2E6EE'
                      },
                      colors: ['#e52a32'],
                      yaxis: {
                        min: 0,
                        max: scopeData['max_impsData']
                      },
                      xaxis: {
                        mode: "time",
                        timezone: "browser",
                        // minTickSize: [1, "Minutes"],
                        min: minTimeline[0][0],
                        max: minTimeline[59][0]
                      }
                   });
          
          $('#hourplaceholder').bind('plothover', function (event, pos, item) {
            showInfo(item,$(this).attr('id'))
          })
        }
      },
      error: function(e){
        e
      }
    });
  }


  function getHourSerialData(){
    if(lastHourData==null){    
      return formatData([],60,'lastHour')
    }else{
      return formatData([lastHourData['imps'],lastHourData['clicks']],60,'lastHour')
    }
  }

  function updateLastHour(){
    if(campaignId!=0&&adGroupId!=0){
      getLastHourClicksAndImps();
    }  
    setTimeout(updateLastHour, lastHourUpdateInterval);
  }

  updateLastHour();


  
  //*********************************************************************//

  function initTwentyFourPlotData(){
    var data = {'imps':[],'clicks':[]}
    for(var i=0;i<24;i++){
      data['imps'].push(0);data['clicks'].push(0);
    }
    return data
  }

  formatTwentyFourData(initTwentyFourPlotData(),24);

  function timeFormatter(v, axis){
    return v.toFixed(axis.tickDecimals)+":00"
  }


  var twentyfourplotOption = $.extend({},{
                                        yaxes: [ { min: 0,
                                          alignTicksWithAxis: null,
                                          position: 'left',
                                          tickFormatter: axesFormatter
                                        }, {
                                          min: 0,
                                          // align if we are to the right
                                          alignTicksWithAxis: null,
                                          position: 'right',
                                          tickFormatter: axesFormatter
                                        } ],
                                        xaxis: {
                                          minTickSize: 3,
                                          tickDecimals: 0,
                                          min: 1,
                                          max: 24,
                                          tickFormatter: timeFormatter
                                        },
                                        legend: { position: "nw" }
                                      }, baseSetting); 

  var twentyfourplot = $.plot('#twentyfourplaceholder',[twentyfourData['impsData'],twentyfourData['clicksData']],twentyfourplotOption);

  $('#twentyfourplaceholder').bind('plothover', function (event, pos, item) {
    showInfo(item,$(this).attr('id'))
  })

  function getStepSummation(arr){
    for(var i=1;i<arr.length;i++){
      arr[i] = arr[i-1] + arr[i]
    }
    return arr
  }

  function getTodayClicksAndImpsByHour(){
    $.ajax({
      dataType: 'json',
      url: liveUrl + '/Report/realtimeHours/'+campaignId+'/'+adGroupId,
      type: 'GET',
      success: function(data){   
        if(!_.isNull(data)){
          var hourcount =  data['all']['imps'].length;
          data['effect'] = {};
          var imp_count = Array(hourcount).fill(0);
          var clicks_count = Array(hourcount).fill(0);
          $.each(region, function(index, value) {
            data[value]['imps'] = eval(data[value]['imps']); data[value]['clicks'] = eval(data[value]['clicks']);
            for(var j=0;j<hourcount;j++){ imp_count[j] += data[value]['imps'][j]; clicks_count[j] += data[value]['clicks'][j];  }
          });
          data['effect']['imps'] = getStepSummation(imp_count);
          data['effect']['clicks'] = getStepSummation(clicks_count);
          formatTwentyFourData($.extend(true, {}, data['effect']),hourcount);
          updateTwentyFourPlot();
        }
      },
      error: function(e){
        e
      }
    });
  }

  function formatTwentyFourData(data,length){
    var max_impsData = 0 , max_clicksData = 0 , impsData = [] , clicksData = []; 
    for(var j=1;j<=length;j++){
     impsData.push([j, data['imps'][j-1]]);clicksData.push([j,data['clicks'][j-1]])
    }
    twentyfourData = {'impsData':{data:impsData,label:impsLabel},
                      'clicksData':{data:clicksData,label:clicksLabel,yaxis: 2},
                      'max_impsData':data['imps'][length-1],
                      'max_clicksData':data['clicks'][length-1]}
  }

  function axesFormatter(v, axis) {
    return fNumber(v.toFixed(axis.tickDecimals));
  }

  function updateTwentyFourPlot(){
    $.plot('#twentyfourplaceholder',[twentyfourData['impsData'],twentyfourData['clicksData']], twentyfourplotOption);
  }


  

    
});
