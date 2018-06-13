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

function addLink(branch,hash,sys,compiler,isa,name)
{
  var file='ressources/builds/aff3ct_'+branch+'_'+sys+'_'+compiler+'_'+isa+'_'+hash+'.zip';
  var link='<a class="dropdown-item" href="'+file+'"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>'+name+'</a>';
  var idLink="#builds_"+sys+"_"+branch+"_"+hash;
  var idUnavail="#unavailable_builds_"+sys+"_"+branch+"_"+hash;

  $.get(file)
    .done(function() {
        // exists file
        $(idLink).append(link);
        $(idUnavail).remove();
    }).fail(function() {
        // not exists file
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
  build+='        <div class="dropdown-menu" aria-labelledby="btnGroupDropWin_'+branch+'_'+hash+'" id="builds_windows_'+branch+'_'+hash+'">';
  build+='          <a class="dropdown-item disabled" href="#" id="unavailable_builds_windows_'+branch+'_'+hash+'"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>Unavailable builds</a>';
  build+='        </div>';
  build+='      </div>';
  build+='      <div class="btn-group" role="group">';
  build+='        <button id="btnGroupDropMac_'+branch+'_'+hash+'" type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
  build+='          <i class="fab fa-apple" aria-hidden="true">&nbsp;</i>macOS';
  build+='        </button>';
  build+='        <div class="dropdown-menu" aria-labelledby="btnGroupDropMac_'+branch+'_'+hash+'" id="builds_mac_osx_'+branch+'_'+hash+'">';
  build+='          <a class="dropdown-item disabled" href="#" id="unavailable_builds_mac_osx_'+branch+'_'+hash+'"><i class="fas fa-download" aria-hidden="true">&nbsp;</i>Unavailable builds</a>';
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
  build+='  <div class="col-md-2">';
  build+=     message;
  build+='  </div>';
  build+='</div>';

  $("#"+branch+"_builds").append(build);

  addLink(branch,hash,"windows","gcc"  ,"sse4_2","64-bit SSE4.2");
  addLink(branch,hash,"windows","gcc"  ,"avx2"  ,"64-bit AVX2"  );
  addLink(branch,hash,"mac_osx","clang","sse4_2","64-bit SSE4.2");
  addLink(branch,hash,"mac_osx","clang","avx2"  ,"64-bit AVX2"  );
  addLink(branch,hash,"linux"  ,"gcc"  ,"sse4_2","64-bit SSE4.2");
  addLink(branch,hash,"linux"  ,"gcc"  ,"avx2"  ,"64-bit AVX2"  );
}

//main
$(document).ready(function() {
  setMIME("text/plain");
  addBuilds("development",10);
  addBuilds("master",5);
});