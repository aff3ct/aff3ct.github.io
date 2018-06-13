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
function ajaxLoad(url) {
  return $.when(
  $.ajax(url,
    {error:function(xhr,status,error) {
    console.error("**Error "+url+"\n"+status+" "+error);
  }}));
}

function addBuilds(branch,maxBuilds) {
  var url="ressources/download_"+branch+".csv";
  ajaxLoad(
    url
  ).done(function(result) {
    var lines=result.split("\n");
    if (lines.length <= 1 || maxBuilds == 0)
      $("#"+branch+"_builds").append('<div class="alert alert-secondary" role="alert">There is no build available to download at this time, please come back later.</div>');
    else
      $("#"+branch+"_builds").append("<hr>");
    var nBuilds=0;
    for (var i=lines.length-1;i>=1;i--) {
      nBuilds++;
      if (nBuilds > maxBuilds)
        break;
      var cols=lines[i].split(";");
      var tag=cols[0].replace(/^"(.*)"$/g, "$1");
      var hash=cols[1].replace(/^"(.*)"$/g, "$1");;
      var date=cols[2].replace(/^"(.*)"$/g, "$1");;
      var message=cols[3].replace(/^"(.*)"$/g, "$1");;
      var author=cols[4].replace(/^"(.*)"$/g, "$1");;
      addBuild(branch,tag,hash,date,message,author);
      $("#"+branch+"_builds").append("<hr>");
    }
  });
}

function addBuild(branch,tag,hash,date,message,author) {
  var build="";
  build+='<div class="row">';
  build+='  <div class="col-md-1">';
  build+='    <a target="_blank" href="https://github.com/aff3ct/aff3ct/releases/tag/'+tag+'" class="badge badge-primary">'+tag+'</a>';
  build+='    <a target="_blank" href="https://github.com/aff3ct/aff3ct/tree/'+hash+'" class="badge badge-secondary">'+hash+'</a>';
  build+='  </div>';
  build+='  <div class="col-md-3">';
  build+='    <i>'+date+'</i>';
  build+='  </div>';
  build+='  <div class="col-md-5">';
  build+='    <div class="btn-group" role="group" aria-label="Button group with nested dropdown">';
  build+='      <div class="btn-group" role="group">';
  build+='        <button id="btnGroupDropWin_'+branch+'_'+ hash+'" type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
  build+='          <i class="fab fa-windows" aria-hidden="true">&nbsp;</i>Windows';
  build+='        </button>';
  build+='        <div class="dropdown-menu" aria-labelledby="btnGroupDropWin_'+branch+'_'+hash+'">';
  build+='          <a class="dropdown-item" href="ressources/builds/aff3ct_'+branch+'_windows_gcc_sse4_2_'+hash+'.zip"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>64-bit SSE4.2</a>';
  build+='        </div>';
  build+='      </div>';
  build+='      <div class="btn-group" role="group">';
  build+='        <button id="btnGroupDropMac_'+branch+'_'+hash+'" type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
  build+='          <i class="fab fa-apple" aria-hidden="true">&nbsp;</i>macOS';
  build+='        </button>';
  build+='        <div class="dropdown-menu" aria-labelledby="btnGroupDropMac_'+branch+'_'+hash+'">';
  build+='          <a class="dropdown-item" href="ressources/builds/aff3ct_'+branch+'_macosx_clang_sse4_2_'+hash+'.zip"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>64-bit SSE4.2</a>';
  build+='        </div>';
  build+='      </div>';
  build+='      <div class="btn-group" role="group">';
  build+='        <button id="btnGroupDropLinux_'+branch+'_'+hash+'" type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
  build+='          <i class="fab fa-linux" aria-hidden="true">&nbsp;</i>Linux';
  build+='        </button>';
  build+='        <div class="dropdown-menu" aria-labelledby="btnGroupDropLinux_'+branch+'_'+hash+'">';
  build+='          <a class="dropdown-item" href="ressources/builds/aff3ct_'+branch+'_linux_gcc_sse4_2_'+hash+'.zip"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>64-bit SSE4.2</a>';
  build+='          <a class="dropdown-item" href="ressources/builds/aff3ct_'+branch+'_linux_gcc_avx2_'+hash+'.zip"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>64-bit AVX2</a>';
  build+='        </div>';
  build+='      </div>';
  build+='    </div>';
  build+='  </div>';
  build+='  <div class="col-md-2">';
  build+=     message;
  build+='  </div>';
  build+='</div>';

  $("#"+branch+"_builds").append(build);
}

//main
$(document).ready(function() {
  setMIME("text/plain");
  addBuilds("development",10);
  addBuilds("master",5);
});