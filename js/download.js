// Changes the way the file is loaded/decoded
function setMIME(mime) {
  $.ajaxSetup({
    beforeSend: function(xhr){
      if (xhr.overrideMimeType) xhr.overrideMimeType(mime);
    },
    isLocal:true
  });
}

// Macro for handling async file loading
function ajaxLoad(url,branch) {
  return $.when(
  $.ajax(url,
    {error:function(xhr,status,error) {
    console.error("**Error "+url+"\n"+status+" "+error);
    $("#"+branch+"_builds").append('<div class="alert alert-secondary" role="alert">There is no build available to download at this time, please come back later.</div>');
  }}));
}

function addBuilds(branch,maxBuilds) {
  var url="download/download_"+branch+".csv";
  ajaxLoad(
    url,
    branch
  ).done(function(result) {
    var lines=result.split("\n");
    if (lines.length >= 1 && lines[lines.length -1] === "")
      lines.splice(lines.length -1, 1);
    if (lines.length <= 1 || maxBuilds == 0)
      $("#"+branch+"_builds").append('<div class="alert alert-secondary" role="alert">There is no build available to download at this time, please come back later.</div>');
    else
      $("#"+branch+"_builds").append("<hr>");
    var nBuilds=0;
    for (var i=lines.length-1;i>=1;i--) {
      nBuilds++;
      if (nBuilds > maxBuilds)
        break;
      var cols=lines[i].split(",");
      var tag=cols[0].replace(/^"(.*)"$/g, "$1");
      var hash=cols[1].replace(/^"(.*)"$/g, "$1");
      var date=cols[2].replace(/^"(.*)"$/g, "$1");
      var message=cols[3].replace(/^"(.*)"$/g, "$1");
      var author=cols[4].replace(/^"(.*)"$/g, "$1");
      var path=cols[5].replace(/^"(.*)"$/g, "$1");
      var buildList=cols[6].replace(/^"(.*)"$/g, "$1").split(";");
      addBuild(branch,tag,hash,date,message,author,path,buildList);
      $("#"+branch+"_builds").append("<hr>");
    }
  });
}

function addLink(branch,hash,path,build)
{
  var sys="";
  if (~build.indexOf("windows")) sys="windows";
  else if (~build.indexOf("macos")) sys="macos";
  else if (~build.indexOf("linux")) sys="linux";
  else sys="other"

  var arch="";
  var name="";
  var simd="";
  if (~build.indexOf("x86")) { name="x86"; arch="x86"; }
  else if (~build.indexOf("x64")) { name="x64"; arch="x64"; }
  else { name="x64"; arch="x64"; }
  name+=" ";
  if (~build.indexOf("avx2")) { name+="AVX2"; simd="avx2"; }
  else if (~build.indexOf("sse4_2")) { name+="SSE4.2"; simd="sse4_2"; }
  else { name="NONAME"; simd="unknown"; }

  var idLink="build_"+sys+"_"+branch+"_"+hash+"_"+arch+"_"+simd;
  var idLinks="builds_"+sys+"_"+branch+"_"+hash;
  var idUnavail="unavailable_builds_"+sys+"_"+branch+"_"+hash;

  var file=path+build;
  var link='<a class="dropdown-item" href="'+file+'" id="'+idLink+'" onclick="return trackOutboundLink(\''+file+'\');"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>'+name+'</a>';

  $("#"+idLinks).append(link);
  $("#"+idUnavail).remove();

  $("#"+idLink).click(function() {
    // track the click with Google Analytics
    ga('send', {
      hitType:       'event',
      eventCategory: 'Download',
      eventAction:   'click',
      eventLabel:    build
    });
  });
}

function addBuild(branch,tag,hash,date,message,author,path,buildsList) {
  var build="";
  build+='<div class="row">';
  build+='  <div class="col-md-1">';
  build+='    <a target="_blank" href="https://github.com/aff3ct/aff3ct/releases/tag/'+tag+'" onclick="return trackOutboundLink(\'https://github.com/aff3ct/aff3ct/releases/tag/'+tag+'\');" class="badge badge-primary">'+tag+'</a>';
  build+='    <a target="_blank" href="https://github.com/aff3ct/aff3ct/tree/'+hash+'" onclick="return trackOutboundLink(\'https://github.com/aff3ct/aff3ct/tree/'+hash+'\');" class="badge badge-secondary">'+hash+'</a>';
  build+='  </div>';
  build+='  <div class="col-md-2">';
  build+='    <i>'+date+'</i>';
  build+='  </div>';
  build+='  <div class="col-md-4">';
  build+=     message;
  build+='  </div>';
  build+='  <div class="col-md-5">';
  build+='    <div class="btn-group" role="group" aria-label="Button group with nested dropdown">';
  build+='      <div class="btn-group" role="group">';
  build+='        <button id="btnGroupDropWin_'+branch+'_'+ hash+'" type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
  build+='          <i class="fab fa-windows" aria-hidden="true">&nbsp;</i>Windows';
  build+='        </button>';
  build+='        <div class="dropdown-menu" aria-labelledby="btnGroupDropWin_'+branch+'_'+hash+'" id="builds_windows_'+branch+'_'+hash+'">';
  build+='          <a class="dropdown-item disabled" href="#" id="unavailable_builds_windows_'+branch+'_'+hash+'"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>Unavailable builds</a>';
  build+='        </div>';
  build+='      </div>';
  build+='      <div class="btn-group" role="group">';
  build+='        <button id="btnGroupDropMac_'+branch+'_'+hash+'" type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
  build+='          <i class="fab fa-apple" aria-hidden="true">&nbsp;</i>macOS';
  build+='        </button>';
  build+='        <div class="dropdown-menu" aria-labelledby="btnGroupDropMac_'+branch+'_'+hash+'" id="builds_macos_'+branch+'_'+hash+'">';
  build+='          <a class="dropdown-item disabled" href="#" id="unavailable_builds_macos_'+branch+'_'+hash+'"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>Unavailable builds</a>';
  build+='        </div>';
  build+='      </div>';
  build+='      <div class="btn-group" role="group">';
  build+='        <button id="btnGroupDropLinux_'+branch+'_'+hash+'" type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
  build+='          <i class="fab fa-linux" aria-hidden="true">&nbsp;</i>Linux';
  build+='        </button>';
  build+='        <div class="dropdown-menu" aria-labelledby="btnGroupDropLinux_'+branch+'_'+hash+'" id="builds_linux_'+branch+'_'+hash+'">';
  build+='          <a class="dropdown-item disabled" href="#" id="unavailable_builds_linux_'+branch+'_'+hash+'"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>Unavailable builds</a>';
  build+='        </div>';
  build+='      </div>';
  build+='    </div>';
  build+='  </div>';
  build+='</div>';

  $("#"+branch+"_builds").append(build);

  for (var i=buildsList.length-1;i>=0;i--) {
    addLink(branch,hash,path,buildsList[i]);
  }
}

//main
$(document).ready(function() {
  setMIME("text/plain");
  addBuilds("development",5);
  addBuilds("master",5);
});