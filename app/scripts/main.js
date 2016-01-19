$(function() {
  var campaignId = 0,adGroupId = 0,region = []; 

  var impsLabel = 'impressions', clicksLabel = 'clicks';

  var totalPoints = 60, defaultYaxes = 5; //make sure not less 60

  var totalData = [],totalDataIndex = [],realTimeBox = [], lastHourTimeBox = []

  var fetchInterval = 1000*30;

  var updateInterval = 1000;

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
      totalData.push(data)
      totalDataIndex.push(data['index'])
    }
  }

  function fetchData() {
    getClicksAndImps()
    setTimeout(fetchData, fetchInterval);
  }

  function formatMaxData(max){ return Math.ceil(max/5)*5 }

  function calculateScope(index){
    var _end_index = (index+totalPoints)/60
    var _end_mod = (index+totalPoints)%60  
    return {'begin_min':Math.floor(index/60),
          'begin_sec':index%60,
          'end_min':_end_mod == 0 ? _end_index -1 : Math.floor(_end_index),
          'end_sec':_end_mod == 0 ? 59 :  _end_mod - 1}   
  } 

  function sliceData(begin_min,begin_sec,end_min,end_sec){
    var _impsData = [], _clicksData = []
    if(!$.isEmptyObject(totalData)&&!$.isEmptyObject(totalData[begin_min])&&!$.isEmptyObject(totalData[end_min])){      
      for(var i=begin_min;i<=end_min;i++){      
        if(i == begin_min){
          for(var j=begin_sec;j<60;j++){ _impsData.push(totalData[i]['imps'][j]);_clicksData.push(totalData[i]['clicks'][j]) }
        }else if(i == end_min){
          for( j=0;j<=end_sec;j++){ _impsData.push(totalData[i]['imps'][j]);_clicksData.push(totalData[i]['clicks'][j]) }
        }else{
          for( j=0;j<60;j++){ _impsData.push(totalData[i]['imps'][j]);_clicksData.push(totalData[i]['clicks'][j]) }
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
    var l = 60 - bs + (em - bm - 1) * 60 + es + 1
    if(totalData.length != 0 ){
      for(var i=bs;i<60;i++){ a1.push(formatMin(totalData[bm]["index"]) + ":" + i.toString()) }
      for(var m=bm;m<em-1;m++){
        for(var j=0;j<60;j++){ a2.push(formatMin(totalData[m]["index"]) + ":" + j.toString() )}   
      }
      for(i=0;i<=es;i++){ a3.push(formatMin(totalData[em]["index"]) + ":" +  i.toString())  }
    }   
    realTimeBox = a1.concat(a2).concat(a3);
    return l
  }

  function getSerialData(index){     
    var scope = calculateScope(index);
    var data = sliceData(scope['begin_min'],scope['begin_sec'],scope['end_min'],scope['end_sec']);
    createRollTimeBox(scope['begin_min'],scope['begin_sec'],scope['end_min'],scope['end_sec']) 
    return formatData(data,totalPoints) 
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

  function formatData(data,length){
    var max_impsData = 0 , max_clicksData = 0 , impsData = [] , clicksData = []
    if(data.length!=0){
      for(var i=0;i < length;i++ ){
        impsData[i] = [i,data[0][i] === undefined ? 0 : data[0][i]]; 
        clicksData[i] = [i,data[1][i] === undefined ? 0 : data[1][i]];
      }
      max_impsData = Math.max(...data[0]); max_clicksData = Math.max(...data[1]);    
    }else{
      for(i=0;i < length;i++ ){impsData[i] = [i,0]; clicksData[i] = [i,0];}    
    }
    return {'impsData':{data:impsData,label:impsLabel},
          'clicksData':{data:clicksData,label:clicksLabel},
          'max_impsData':formatMaxData(max_impsData),
          'max_clicksData':formatMaxData(max_clicksData)}
  }

  function showInfo(item,id){
    if (item) {
      var y = fNumber(item.datapoint[1]);  var x = item.datapoint[0];
      var ht = id == 'placeholder' ? realTimeBox[x] : lastHourTimeBox[x]
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
        lastHourTimeBox = []
        for(var i=0;i<60;i++){ lastHourTimeBox.push(formatMin(parseInt(data['all']['index'])+i))}
        var ret = getHourSerialData($.extend(true, {}, data['effect']));
        var hourplot = $.plot('#hourplaceholder',[ret['impsData']], { 
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
            max: ret['max_impsData']
          }
        });
        hourplot;
        $('#hourplaceholder').bind('plothover', function (event, pos, item) {
          showInfo(item,$(this).attr('id'))
        })
      },
      error: function(e){
        e
      }
    });
  }

  function getHourSerialData(data){
    return formatData([data['imps'],data['clicks']],60)
  }

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
