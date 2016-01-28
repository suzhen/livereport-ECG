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
                          fill: false,
                          lineWidth:1
                        },
                        points: {
                          show: true,
                          radius: 1
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
    fetchData();realTimeUpdate(); 
    getLastHourClicksAndImps();updateLastHour();
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
            'clicksData':{data:clicksData,label:clicksLabel,yaxis: 2},
            'max_impsData':formatMaxData(max_impsData),
            'max_clicksData':formatMaxData(max_clicksData)}
  }

  function showInfo(item,id){
    if (item) {
      var y = fNumber(item.datapoint[1]);  var x = item.datapoint[0]; var z = item.dataIndex
      var ht = '';
      if(id == 'placeholder'){
        ht = realTimeBox[x] || 0 
      }else if(id == 'hourplaceholder'){
        ht = lastHourTimeBox[z] || 0
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

  var plotOption = $.extend({},{  yaxes: [ { min: 0,
                                          alignTicksWithAxis: null,
                                          tickDecimals: 0,
                                          position: 'left',
                                          tickFormatter: axesFormatter
                                        }, {
                                          min: 0,
                                          // align if we are to the right
                                          alignTicksWithAxis: null,
                                          tickDecimals: 0,
                                          position: 'right',
                                          tickFormatter: axesFormatter
                                        } ],
                                  xaxis: {
                                    minTickSize: 3,
                                    tickDecimals: 0,
                                    min: 0
                                  }
                              }, baseSetting); 

  var plotInitOption = _.merge($.extend(true, {}, plotOption),{yaxes:[{max:defaultYaxes},{max:defaultYaxes}]})
 
  $.plot('#placeholder',[getSerialData(0)['impsData'],getSerialData(0)['clicksData']], plotInitOption);

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

  function realTimeUpdate() {

    if(totalDataIndex.length != 0 && totalData.length != 0){
      
      var newScopeData = getSerialData(series);
      
      $.plot('#placeholder',[newScopeData['impsData'],newScopeData['clicksData']], plotOption);

      series++ ;

    }

    setTimeout(realTimeUpdate, updateInterval);

  }

 

  //*********************************************************************//


  var lastHourPlotOption = $.extend({},{  yaxes: [ { min: 0,
                                          alignTicksWithAxis: null,
                                          tickDecimals: 0,
                                          position: 'left',
                                          tickFormatter: axesFormatter
                                        }, {
                                          min: 0,
                                          // align if we are to the right
                                          alignTicksWithAxis: null,
                                          tickDecimals: 0,
                                          position: 'right',
                                          tickFormatter: axesFormatter
                                        } ],
                                  xaxis: {
                                    mode: "time",
                                    timezone: "browser"                                
                                  }
                              }, baseSetting); 

  var lastHourInitOption = _.merge($.extend(true, {}, lastHourPlotOption),{yaxes:[{max:defaultYaxes},{max:defaultYaxes}]});
 
  getHourSerialData(null);

  $.plot('#hourplaceholder',[lastHourData['impsData'],lastHourData['clicksData']],lastHourInitOption);

  $('#hourplaceholder').bind('plothover', function (event, pos, item) {
    showInfo(item,$(this).attr('id'))
  })

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
          getHourSerialData($.extend(true, {}, data['effect']));
          $.plot('#hourplaceholder',[lastHourData['impsData'],lastHourData['clicksData']],lastHourPlotOption);
        }
      },
      error: function(e){
        e
      }
    });
  }

  function getHourSerialData(data){
    if(data==null){    
      lastHourData = formatData([],60,'lastHour')
    }else{
      lastHourData = formatData([data['imps'],data['clicks']],60,'lastHour')
    }
  }

  function updateLastHour(){
    if(campaignId!=0&&adGroupId!=0){
      getLastHourClicksAndImps();
    }  
    setTimeout(updateLastHour, lastHourUpdateInterval);
  }

  
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
    return pad(v.toFixed(axis.tickDecimals), 2)+":00"
  }

  var twentyfourplotOption = $.extend({},{
                                        yaxes: [ { min: 0,
                                          alignTicksWithAxis: null,
                                          tickDecimals: 0,
                                          position: 'left',
                                          tickFormatter: axesFormatter
                                        }, {
                                          min: 0,
                                          // align if we are to the right
                                          alignTicksWithAxis: null,
                                          tickDecimals: 0,
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

  var twentyfourplotInitOption = _.merge($.extend(true, {}, twentyfourplotOption),{yaxes:[{max:100},{max:100}]})

  $.plot('#twentyfourplaceholder',[twentyfourData['impsData'],twentyfourData['clicksData']],twentyfourplotInitOption);

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

  //*********************************************************************//

    
  var monitors = ['AD_EXCHANGE','OTV','PREMIUM_NETWORK','DIRECT_PUBLISHER','EXTERNAL_MEDIA'] //'GDN','MOTV_MEDIA','MOSOCIAL_MEDIA'

  var baseMonitorViewSetting = {
                                  series: {
                                    lines: {
                                      show: true,
                                      fill: false
                                    },
                                    points: {
                                      show: false
                                    },
                                    shadowSize: 0 // Drawing is faster without shadows
                                  },
                                  grid: {
                                    hoverable: true,
                                    borderColor: '#E2E6EE',
                                    borderWidth: 1,
                                    tickColor: '#E2E6EE'
                                  },
                                  colors: ['#e52a32', '#336dc6'],
                                  xaxis: {
                                          mode: "time",
                                          timezone: "browser"                                
                                        }
                                }



  function getAllMonitor(){
    
    var data = {"StartDate":"2016/01/22","AD_EXCHANGE":{"impressions":[[21942,40533,24430,35582,39853,18187],[5713,91681,17523,17600,34991,17364,12828,12282,26218,34388,38766,79574,50036,43139,35660,44665,47382,50736,52239,36111,90988,111152,44399,18533],[16356,97750,18289,16480,25817,21389,18997,12646,9635,27900,33804,35293,36016,28969,27309,32889,25578,26252,30511,32894,35038,31961,32328,9554],[6542,120903,7535,7614,11508,10308,11387,9627,8242,22852,37096,30783,12072,16528,14573,22007,7770,6295,19034,24169,16289,18652,20366,11284],[3712,92717,9830,12127,17503,19051,11718,23758,15513,19364,36155,23372,23504,20051,30565,0,14581,180094,161913,169806,170433,167587,151164,132522],[125651,214213,98182,101590,100942,98728,95083,119952,117693,183351,196648,179491,311026,206321,164389,154871,151003,186425,135752,0,113697,307682,298204,202197],[228317,440382,175285,163739,207642,215922,204063,225525,240395,348300,291482]],"clicks":[[107,294,144,255,255,110],[27,707,72,80,181,88,62,82,76,127,100,184,201,230,127,159,173,187,252,204,349,499,153,76],[64,707,93,69,131,108,142,61,46,123,106,175,142,109,155,143,123,147,148,190,179,173,157,63],[32,898,32,29,56,55,91,76,56,98,180,213,94,144,111,139,31,34,102,153,86,107,106,50],[18,683,93,58,137,74,87,156,91,89,129,81,140,145,156,0,82,1070,991,1160,1149,1092,884,767],[864,1441,650,669,699,706,615,677,645,887,1072,1071,1619,1210,1020,880,841,997,810,0,794,1923,1784,1083],[1183,2958,1223,1192,1605,1532,1218,1379,1274,1686,1500]]},"DIRECT_PUBLISHER":{"impressions":[[151,122,114,120,113,106],[119,107,102,105,98,98,97,92,103,113,107,118,108,112,108,103,132,113,107,109,107,128,123,119],[118,108,114,89,90,93,94,96,98,102,94,99,107,122,126,111,111,109,114,115,121,119,114,109],[121,110,52,65,48,36,49,53,50,45,64,110,68,74,72,110,108,66,59,61,74,62,63,77],[145,61,48,41,47,51,49,47,40,56,71,104,88,67,65,0,116,1048,690,597,628,660,708,711],[634,1011,643,501,503,513,472,492,541,624,883,951,848,667,817,939,953,792,510,0,570,1300,1410,1406],[1139,1162,1055,1060,1098,1028,1040,1056,1067,1140,1977]],"clicks":[[191,183,172,189,170,191],[151,127,113,79,91,80,91,91,84,96,134,172,182,165,192,192,196,199,192,190,177,189,185,201],[159,113,101,81,92,79,77,79,82,91,127,157,195,181,179,201,176,199,175,177,184,202,188,184],[149,133,47,40,41,35,47,36,51,54,84,135,125,116,114,128,120,96,113,94,95,96,100,97],[69,62,57,42,33,43,31,38,32,58,100,119,103,80,111,0,108,1540,837,801,876,976,1035,851],[685,545,467,421,412,426,441,457,480,687,1067,1153,1050,991,1062,1186,1146,1170,816,0,756,1897,1853,1623],[1306,1164,989,912,907,867,894,905,945,1346,1935]]},"EXTERNAL_MEDIA":{"impressions":[[172,226,244,210,198,207],[124,122,86,55,48,43,26,47,55,93,120,173,205,218,203,197,308,262,196,184,234,262,253,210],[111,147,86,47,54,27,43,57,94,158,201,163,190,261,259,338,312,242,222,196,266,272,282,211],[130,149,47,41,29,14,16,44,35,56,94,113,94,125,123,158,154,116,135,100,121,109,105,121],[62,66,4,7,7,4,4,5,4,12,20,31,23,13,20,0,27,196,116,115,113,139,153,113],[119,76,95,69,63,50,47,104,112,191,237,278,269,184,188,143,156,129,79,0,69,165,207,272],[186,130,95,113,78,65,68,102,165,220,380]],"clicks":[[147,129,173,152,276,179],[210,33,106,96,97,106,67,97,105,113,149,290,77,35,43,38,31,38,19,67,104,90,92,98],[117,60,105,90,75,99,48,70,95,69,68,215,168,66,54,56,60,66,48,46,31,6,10,69],[79,49,3,0,2,3,1,5,5,7,5,7,7,5,5,7,5,23,21,20,6,5,8,8],[7,76,18,20,24,10,5,16,16,19,26,22,21,20,17,0,41,728,466,584,485,392,355,296],[283,268,248,221,179,195,86,168,235,198,205,226,207,204,234,231,204,218,190,0,151,397,374,336],[279,532,579,464,374,404,197,361,460,511,632]]},"GDN":{"impressions":[[0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0]],"clicks":[[0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0]]},"MOSOCIAL_MEDIA":{"impressions":[[0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0]],"clicks":[[0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,1,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,2,2,1,3,0,4,6,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0,0,1]]},"MOTV_MEDIA":{"impressions":[[0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0]],"clicks":[[0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0]]},"OTV":{"impressions":[[1929,3043,1684,3146,2508,2289],[2228,25008,4063,2100,6672,2477,4203,5706,6252,12713,12992,4908,5922,11343,7442,8549,8630,9017,6284,10003,5557,6958,3853,3469],[3205,19495,5278,3234,4386,3729,4323,10206,7362,5849,6414,4998,6363,7269,6976,6562,7219,11744,6682,6646,4047,8781,6247,5067],[4092,22780,1568,1023,5876,2980,3898,5976,4412,4895,3205,2979,3057,3110,2199,4189,2230,2136,4841,2641,2886,2575,2316,2134],[1688,17338,1697,1176,3482,1489,2960,2108,3850,8695,2417,2538,1938,2587,2413,0,1761,39724,32278,33829,28135,22349,20960,12034],[11631,76359,10998,18391,29098,26877,31057,33589,36665,43426,33160,35201,32935,32159,33175,35243,35480,36883,30856,0,21274,19086,27258,22706],[18511,132423,24443,46801,53178,61113,55740,64135,81306,81036,78151]],"clicks":[[15,41,32,46,31,45],[49,217,27,15,45,12,47,53,43,136,114,47,58,107,96,95,96,104,65,139,70,69,49,133],[59,155,42,32,21,36,39,66,49,76,45,48,51,70,69,72,76,142,74,97,57,125,96,109],[105,171,14,11,29,12,19,19,26,40,29,18,17,31,18,32,11,20,56,23,29,29,18,24],[40,115,7,13,23,6,13,12,25,69,15,14,15,17,21,0,16,360,227,239,253,250,210,154],[104,499,76,62,127,108,128,141,211,393,234,245,228,191,202,269,292,244,273,0,176,177,278,326],[282,942,109,194,225,247,285,330,557,950,623]]},"PREMIUM_NETWORK":{"impressions":[[1477,1411,2962,1294,1307,1160],[279,1,1,0,2,0,0,0,0,4490,4636,6275,2507,1499,1685,2347,2187,2055,1567,1259,558,678,333,247],[84,0,0,0,0,2,0,1,1,4061,4795,5279,3676,1692,1914,2206,2219,1917,1995,1423,543,619,539,238],[98,0,1,0,0,0,0,0,0,2252,1518,2989,2214,1113,845,994,1100,796,829,583,225,230,123,109],[52,1,0,0,1,0,0,0,0,2420,1718,3385,1232,870,966,0,1171,8673,5147,4495,1715,1786,1514,799],[325,2,3,6,1,1,1,2,4,24530,9400,33103,11856,7388,8499,8860,7254,5556,3143,0,1689,3852,2537,2215],[936,20,9,0,3,3,3,4,5,14617,7854]],"clicks":[[4,3,5,3,6,4],[2,0,0,0,0,0,0,0,0,1,1,0,1,7,13,6,5,3,9,3,5,4,1,2],[0,1,0,0,0,0,0,0,0,10,15,16,12,3,8,6,6,5,4,3,6,3,1,2],[1,0,0,0,0,0,0,0,0,1,3,5,2,3,2,1,3,3,1,3,0,0,0,2],[0,0,0,0,0,0,0,0,0,4,2,10,4,3,5,0,2,28,11,21,7,6,3,3],[1,0,0,0,0,0,0,0,0,46,16,69,19,28,21,25,21,18,4,0,3,16,9,21],[3,0,0,0,0,0,0,0,0,21,19]]}}
    
    var days = 0 , hours = 0;
    if(!_.isNull(data)){
      $.each(monitors, function(index, value){
        days = data[value]['impressions'].length;
        // console.log(data[value])
        hours = _.flatten(data[value]['impressions'])
        // console.log(hours)


      })
    }

    var ymd = data['StartDate'].split('/')

    var cDay = new Date(ymd[0],ymd[1]-1,ymd[2])

    // cDay.setFullYear() 

    console.log(cDay)
     
    
    // $.plot('#otvoverview',[],baseMonitorViewSetting);


    // $.ajax({
    //   dataType: 'json',
    //   url: liveUrl + '/ReportTest/getplatform',
    //   type: 'GET',
    //   success: function(data){ 

    //   },
    //   error: function(e){
    //     e
    //   }
    // });

  }

  getAllMonitor()

  











});
