$(function() {
  var campaignId = 0,adGroupId = 0,region = []; 

  var impsLabel = 'impressions', clicksLabel = 'clicks';

  var step = 3, totalPoints = 25, defaultYaxes = 50; //make sure not less 60/step

  var totalData = [],totalDataIndex = [],realTimeBox = [];

  var lastHourData = null, lastHourTimeBox = [],minTimeline = [];

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
    getLastDayClicksAndImps();
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

  function formatMaxData(max){ return Math.ceil(max/5)*5 }

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
        a1.push(formatMin(totalData[bm]["index"]) + ":" + pad(i,2))
      }
      for(var m=bm;m<em-1;m++){
        for(var j=0;j<space;j++){ 
          a2.push(formatMin(totalData[m]["index"]) + ":" + pad(j,2))
        }   
      }
      for(i=0;i<=es;i++){ 
        a3.push(formatMin(totalData[em]["index"]) + ":" + pad(i,2))
      }
    }   
    realTimeBox = a1.concat(a2).concat(a3);
  }

  function getSerialData(index){     
    var scope = calculateScope(index);
    var data = sliceData(scope['begin_min'],scope['begin_sec'],scope['end_min'],scope['end_sec']);
    createRollTimeBox(scope['begin_min'],scope['begin_sec'],scope['end_min'],scope['end_sec']);   
    console.log(realTimeBox)
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
      var ht = id == 'placeholder' ? realTimeBox[x] : lastHourTimeBox[z]
      $('#tooltip').html(ht + '<br/>' + y + ' ' + item.series.label)
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
        fill: true
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

  var series = 0 

  function update() {

    var newScopeData = getSerialData(series);

    plot.setData([newScopeData['impsData']]);  //,newScopeData['clicksData']

    if(newScopeData['max_impsData'] > defaultYaxes) {

      defaultYaxes = newScopeData['max_impsData']

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
      dataType: 'json',
      url: liveUrl + '/Report/realtimeMinutes/'+campaignId+'/'+adGroupId,
      type: 'GET',
      success: function(data){       
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

  function getLastDayClicksAndImps(){
    $.ajax({
      dataType: 'json',
      url: liveUrl + '/Report/realtimeHours/'+campaignId+'/'+adGroupId,
      type: 'GET',
      success: function(data){   
        var hourcount =  data['all']['imps'].length;
        data['effect'] = {};
        var imp_count = Array(hourcount).fill(0);
        var clicks_count = Array(hourcount).fill(0);
        $.each(region, function(index, value) {
          data[value]['imps'] = eval(data[value]['imps']); data[value]['clicks'] = eval(data[value]['clicks']);
          for(var j=0;j<hourcount;j++){ imp_count[j] += data[value]['imps'][j]; clicks_count[j] += data[value]['clicks'][j];  }
        });
        data['effect']['imps'] = imp_count;
        data['effect']['clicks'] = clicks_count;
        data['effect']['imps_count'] = eval(imp_count.join('+'));
        data['effect']['clicks_count'] = eval(clicks_count.join('+'));
        var timelineHTML = ''
        for(var i=0;i<data['effect']['imps'].length;i++){
          timelineHTML += '<span class=\'tl_dot tl_dot_'+(i+1)+' '+(i%6 == 0 ? 'on' : '')+'\'>'+
                          '<div class=\'arrow_box '+ (i%2 == 0 ? 'bottom' : 'top') +'\'>' +
                            '<ul>' +
                              '<li><span style=\'color:red;\'>'+(i+1)+':00</span></li>' +
                              '<li><span style=\'font-weight:bold;font-size:10px;\'>'+fNumber(data['effect']['imps'][i])+'</span></li>' +
                            '</ul>' +
                          '</div>' +
                         '</span>'
        }

        $('#tl').html(timelineHTML);
        $('#impsCount').html(fNumber(data['effect']['imps_count']));
        $('#clicksCount').html(fNumber(data['effect']['clicks_count']));

        //****
        $('.tl_dot').each(function(){
          var tar = $(this).find('.arrow_box');
          var isTop = tar.hasClass('top');
          var isRightBox = tar.hasClass('rightBox');
          var isLeftBox = tar.hasClass('leftBox');

          // var top = -80; 
          var widthOffset = ($(this).find('.arrow_box').width()+22-10);
          var heightOffset = ($(this).find('.arrow_box').height()+24+30+5);
          var timelineWidth = $('.timeline').width()*0.0434;
          $(this).find('.arrow_box').css({top:0-heightOffset});
          if(isTop){
            $(this).find('.arrow_box').css({top:-8,left:-timelineWidth});
          }
          if (isRightBox) {
            $(this).find('.arrow_box').css({top:0,left:0-widthOffset});
          }
          if (isLeftBox) {
            $(this).find('.arrow_box').css({left:0-widthOffset+14});
          }
        })
        var timeLine_Dot = {
          init : function (){
            // var _this = this;
            this.bind();
          },
          bind : function(){
            $(document).on('mouseenter','.tl_dot',function(){
              var tar = $(this).find('.arrow_box');
              var isTop = tar.hasClass('top');
              var isRightBox = tar.hasClass('rightBox');
              var isLeftBox = tar.hasClass('leftBox');
              // var top = -80;
              var widthOffset = ($(this).find('.arrow_box').width()+22-10);
              var heightOffset = ($(this).find('.arrow_box').height()+24+30+5);
              var timelineWidth = $('.timeline').width()*0.0434;
              $(this).find('.arrow_box').css('z-index','9999999');
              $(this).find('.arrow_box').css('border-color','red');
              $(this).find('.arrow_box').addClass('hightlight_arr');
              $(this).find('.arrow_box').css({top:0-heightOffset});
              if(isTop){
                $(this).find('.arrow_box').css({top:-8,left:-timelineWidth});
              }
              if (isRightBox) {
                $(this).find('.arrow_box').css({top:0,left:0-widthOffset});
              }
              if (isLeftBox) {
                $(this).find('.arrow_box').css({left:0-widthOffset+14});
              }

            })
            $(document).on('mouseleave','.tl_dot',function(){
              $(this).find('.arrow_box').css('z-index','99999');
              $(this).find('.arrow_box').css('border-color','#ccc');
              $(this).find('.arrow_box').removeClass('hightlight_arr');
            })  
          }
        }
        timeLine_Dot.init()
        //****
      },
      error: function(e){
        e
      }
    });
  }
    
});
