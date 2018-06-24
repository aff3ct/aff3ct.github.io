const GITLAB="https://gitlab.inria.fr/api/v4/projects/2913/repository/";
const BRANCH="development";
const KEY="XiqvmusRrQ3iWf2pnYBx";

// axis/legend of the 2 plots
const LT = {
	showlegend:false,
	xaxis:{ zeroline:false, hoverformat: '.e', title: 'Eb/N0 (dB)'},
	margin: {
	l: 100,
	r: 40,
	b: 40,
	t: 40,
	pad: 4
	}
};

const LAYOUT= {
	ber: Object.assign({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Bit Error Rate (BER)'} },LT),
	fer: Object.assign({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Frame Error Rate (FER)'}},LT),
	// befe: Object.assign({yaxis: { autorange: true, hoverformat: '.2e',title: 'BE/FE'}},LT),
	// thr: Object.assign({ yaxis: { autorange: true, hoverformat: '.2e',title: 'Throughput (Mb/s)'}},LT)
}

// The 2 plots displayed in blue and orange
var LEFT={ber:[],fer:[]/*,thr:[],befe:[]*/}, RIGHT={ber:[],fer:[]/*,thr:[],befe:[]*/};
var GD={};

// function replaceQueryParam(param, search, newval) {
//     var regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
//     var query = search.replace(regex, "$1").replace(/&$/, '');
//     return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
// }

function updateURLParameter(url, param, paramVal)
{
	var TheAnchor = null;
	var newAdditionalURL = "";
	var tempArray = url.split("?");
	var baseURL = tempArray[0];
	var additionalURL = tempArray[1];
	var temp = "";

	if (additionalURL)
	{
		var tmpAnchor = additionalURL.split("#");
		var TheParams = tmpAnchor[0];
		    TheAnchor = tmpAnchor[1];
		if(TheAnchor)
			additionalURL = TheParams;

		tempArray = additionalURL.split("&");

		for (var i=0; i<tempArray.length; i++)
		{
			if(tempArray[i].split('=')[0] != param)
			{
				newAdditionalURL += temp + tempArray[i];
				temp = "&";
			}
		}
	}
	else
	{
		var tmpAnchor = baseURL.split("#");
		var TheParams = tmpAnchor[0];
		    TheAnchor = tmpAnchor[1];

		if(TheParams)
			baseURL = TheParams;
	}

	if(TheAnchor)
		paramVal += "#" + TheAnchor;

	var rows_txt = temp + "" + param + "=" + paramVal;
	return baseURL + "?" + newAdditionalURL + rows_txt;
}

function findGetParameter(parameterName) {
	var result = null,
	tmp = [];
	window.location.search
		.substr(1)
		.split("&")
		.forEach(function (item) {
			tmp = item.split("=");
			if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
		});
	return result;
}

// Macro for handling async file loading
function ajaxLoad(url) {
	return $.when(
	$.ajax(url,
		{error:function(xhr,status,error) {
		console.error("**Error "+url+"\n"+status+" "+error);
	}}));
}

// Changes the way the file is loaded/decoded
function setMIME(mime) {
	$.ajaxSetup({
		beforeSend: function(xhr){
			if (xhr.overrideMimeType) xhr.overrideMimeType(mime);
		},
		isLocal:true
	});
}

// Reads and stores one file. Returns the content of the file.
var ID=0;
function loadFile(file) {
	var d=$.Deferred();
	setMIME("text/plain");
	var filename = encodeURIComponent(file);
	ajaxLoad(
		GITLAB+"files/"+filename+"/raw?ref="+BRANCH+"&private_token="+KEY
	).done(function(result) {
		var lines=result.split("\n");
		var name=lines[3];
		var coderate=0,framesize=0,infobits=0,codeword=0;
		var BER={x:[],y:[],type:'scatter',name:'BER'};
		var FER={x:[],y:[],type:'scatter',name:'FER'};
		// var BEFE={x:[],y:[],type:'scatter',name:'BE/FE'};
		// var THR={x:[],y:[],type:'scatter',name:'Mb/s'};
		var info={};
		for (var i=0;i<lines.length;i++)
			if (lines[i].startsWith("# * ")&&lines[i+1].indexOf("Type")>-1)
				info[lines[i].substring(4,lines[i].indexOf("-")).trim()] =
					lines[i+1].split("=")[1].trim();
		var code=info.Code;
		var cmd=lines[1];
		cmd=cmd.replace(/"([^ ,:;]*)"/g, "$1");
		cmd=cmd.replace(/\-\-sim\-pyber\ "([^]*)"/g, "");
		cmd=cmd.replace(/\-\-sim\-pyber\ ([^ ]*)/g, "");
		cmd=cmd.replace(/"\.\.\/conf\/([^ ]*)"/g, "../conf/$1");
		cmd=cmd.replace(/\.\.\/conf\/([^ ]*)/g,"<a target='_blank' href='https://github.com/aff3ct/configuration_files/blob/"+BRANCH+"/$1'>$1</a>");
		cmd=cmd.replace(/\.\/bin\/aff3ct/g,"aff3ct");
		if (typeof code=="undefined") code=info.Codec;
		for (var i=0;i<lines.length;i++)
			if (lines[i].indexOf("=")>-1) {
				var val=lines[i].split("=")[1].trim();
				if (lines[i].indexOf("Code rate")>-1)
					coderate=Math.round(parseFloat(val)*100)/100;
				else if (lines[i].indexOf("Frame size")>-1)
					framesize=parseInt(val,10);
				else if (lines[i].indexOf("Codeword size")>-1)
					codeword=parseInt(val,10);
				else if (lines[i].indexOf("Info. bits")>-1)
					infobits=parseFloat(val);
			}
		if (framesize==0) framesize=codeword;
		if (codeword==0) codeword=framesize;

		if (coderate==0&&framesize!=0&&infobits!=0) coderate=Math.round(infobits/framesize*100)/100;
		for (var i=4;i<lines.length;i++) {
			if (lines[i].startsWith("#")||lines[i].length==0) continue;
			var fields = lines[i].split(/\|/);
			var x=parseFloat(fields[1]);
			if (x=="NaN") continue;
			BER.x.push(x);
			FER.x.push(x);
			// BEFE.x.push(x);
			// THR.x.push(x);
			BER.y.push(parseFloat(fields[5]));
			FER.y.push(parseFloat(fields[6]));
			// BEFE.y.push(parseFloat(fields[3])/parseFloat(fields[4]));
			// THR.y.push(parseFloat(fields[9]));
		}
		var o={id:ID,name:name,info:info,coderate:coderate,framesize:framesize,codeword:codeword,ber:BER,fer:FER,
		       /*befe:BEFE,thr:THR,*/code:code,cmd:cmd,file:result,filename:filename};
		d.resolve(o);
		ID=ID+1;
	});
	return d.promise();
}

// Get the list of files (no dir) of the gitlab repo. Uses multiple requests if number of files exceeds 100.
function loadFileList(page,maxperpage) {
	var dirlist=$.Deferred();
	ajaxLoad(
		GITLAB+"tree?ref="+BRANCH+"&recursive=true&per_page="+maxperpage+"&page="+page+"&private_token="+KEY
		//GITHUB+"git/trees/"+BRANCH+"?recursive=1"
	).done(function(result) {
		var dirs=result.filter(x=>x.type=="blob").map(x=>x.path);
		if (result.length<maxperpage)
			dirlist.resolve(dirs);
		else
			loadFileList(page+1,maxperpage).done(function(d) {
				dirlist.resolve(dirs.concat(d));
			});
	});
	return dirlist.promise();
}

// Click listener for left/right lists
function addClick(a,side) {
	$(side+" .g"+a.id).click(function() {
		document.getElementById("tips").style.display = "none";
		const plots=["ber","fer"/*,"befe","thr"*/];
		$(side+" .bers .active").removeClass("active");
		$(this).addClass("active");
		if (side=='.left') LEFT=a; else RIGHT=a;
		plots.forEach(x => Plotly.newPlot(GD[x],[LEFT[x],RIGHT[x]],LAYOUT[x],{displaylogo:false}));

		var lval = encodeURIComponent(findGetParameter("left"));
		var rval = encodeURIComponent(findGetParameter("right"));
		var uri  = "/comparator.html?left="+lval+"&right="+rval;
		// uri = replaceQueryParam(uri,side.replace(".",""),a.filename);
		uri = updateURLParameter(uri,side.replace(".",""),a.filename);
		window.history.replaceState({},"aff3ct.github.io",uri);

		// track the click with Google Analytics
		ga('send', {
			hitType:       'event',
			eventCategory: 'BER/FER Comparator',
			eventAction:   'click',
			eventLabel:    decodeURIComponent(a.filename)
		});
	});
}

/* Interaction with the form */
function displayCodeTypes(files) {
	$(".codetype").empty();
	var j=0;
	for (var i in files)
	{
		var selected="";
		if (j == 0)
		{
			selected="selected='selected'";
			displayFrameSizes(".left",i,files);
			displayFrameSizes(".right",i,files);
		}
		$(".codetype").append("<option " + selected + ">"+i+"</option>");
		j++;
	}

	$(".codetype").off();
	$(".left .codetype").change(function() { displayFrameSizes(".left",$(this).val(),files); });
	$(".right .codetype").change(function() { displayFrameSizes(".right",$(this).val(),files); });
}

window.onresize = function() {
	Plotly.Plots.resize(GD.ber);
	Plotly.Plots.resize(GD.fer);
	// Plotly.Plots.resize(GD.befe);
	// Plotly.Plots.resize(GD.thr);
};

function displayFrameSizes(side,code,files) {
	var p={};
	var j=0;
	for (var i=0;i<files[code].length;i++) {
		var f=files[code][i];
		p[f.framesize]=true;
	}
	$(side+" .size").empty();
	for (var i in p){
		if (j==0) j=i;
		$(side+" .size").append("<option>"+i+"</option>");
	}
	displayFiles(side,files[code],j);
	$(side+" .size").off();
	$(side+" .size").change(function() {
		displayFiles(side,files[code],$(this).val());
	});
}

function displayFiles(side,files,framesize) {
	var f=files.filter(x=>x.framesize==framesize);
	$(side+ " .bers").empty();
	$("#"+side.replace(".","")+"modals").empty();
	for (var i=0;i<f.length;i++) {
		var a=f[i];
		var s="<li class='g"+a.id+" list-group-item list-group-item-action align-item-start'>"
		s+=a.name+"&nbsp;<div class='text-muted twoColumns'><small><b>Frame size</b>: "+a.framesize+"<br/>";
		if (a.codeword > a.framesize)
			s+="<b>Codeword</b>: "+a.codeword+"<br/>";
		s+="<b>Coderate</b>: "+a.coderate;
		for (var j in a.info)
		{
			var tooltip = "";
			if (tooltips.get(a.info[j]))
				tooltip = " class='tt' data-toggle='tooltip' data-placement='top' data-html='true' title='" + tooltips.get(a.info[j]) + "'";
			s+="<br/><b>"+j+"</b>: "+"<span" + tooltip + ">" + a.info[j] + "</span>";
		}
		s+="</small></div>";
		s+="<div class='curveIcons'>";
		s+="  <span class='curveIcon'><a href='#' data-toggle='modal' data-target='#modalInfoCmd"+side.replace(".","")+i+"' title='Command line'><i class='fas fa-laptop'></i></a></span>"
		s+="  <span class='curveIcon'><a href='#' data-toggle='modal' data-target='#modalInfoFile"+side.replace(".","")+i+"' title='Original output text file'><i class='fas fa-file-alt'></i></a></span>"
		s+="</div>";
		s+="</li>";
		$(side+" .bers").append(s);
		var m="";
		m+="<div class='modal fade' id='modalInfoCmd"+side.replace(".","")+i+"' tabindex='-1' role='dialog' aria-labelledby='exampleModalCenterTitle' aria-hidden='true'>";
		m+="  <div class='modal-dialog modal-dialog-centered modal-lg' role='document'>";
		m+="    <div class='modal-content'>";
		m+="      <div class='modal-header'>";
		m+="        <h5 class='modal-title' id='exampleModalLongTitle'>"+a.name+"</h5>";
		m+="        <button type='button' class='close' data-dismiss='modal' aria-label='Close'>";
		m+="          <span aria-hidden='true'>&times;</span>";
		m+="        </button>";
		m+="      </div>";
		m+="      <div class='modal-body'>";
		m+="        <div class='shell-wrap'>";
		m+="          <p class='shell-top-bar'>AFF3CT command line</p>";
		m+="          <ul class='shell-body'>";
		m+="            <li>"+a.cmd+"</li>";
		m+="          </ul>";
		m+="        </div>";
		m+="        <br>";
		m+="        <p class='text-justify'><b>Be careful</b>, this command is not guarantee to work with the <a target='_blank' href='https://github.com/aff3ct/aff3ct/tree/master'><i>master</i> branch</a> of AFF3CT. To ensure the compatibility, please use the AFF3CT <a target='_blank' href='https://github.com/aff3ct/aff3ct/tree/development'><i>development</i> branch</a>.</p>"
		m+="      </div>";
		m+="    </div>";
		m+="  </div>";
		m+="</div>";
		m+="<div class='modal fade' id='modalInfoFile"+side.replace(".","")+i+"' tabindex='-1' role='dialog' aria-labelledby='exampleModalCenterTitle' aria-hidden='true'>";
		m+="  <div class='modal-dialog modal-dialog-centered modal-lg' role='document'>";
		m+="    <div class='modal-content'>";
		m+="      <div class='modal-header'>";
		m+="        <h5 class='modal-title' id='exampleModalLongTitle'>"+a.name+"</h5>";
		m+="        <button type='button' class='close' data-dismiss='modal' aria-label='Close'>";
		m+="          <span aria-hidden='true'>&times;</span>";
		m+="        </button>";
		m+="      </div>";
		m+="      <div class='modal-body'>";
		m+="        <pre>";
		m+=a.file;
		m+="        </pre>";
		m+="      </div>";
		m+="      <div class='modal-footer'>";
		m+="        <button type='button' class='btn btn-secondary' data-dismiss='modal'>Close</button>";
		m+="      </div>";
		m+="    </div>";
		m+="  </div>";
		m+="</div>";
		$("#"+side.replace(".","")+"modals").append(m);
		addClick(a,side);
	}
	$('[data-toggle="tooltip"]').tooltip();
}

// files: array of files.
// ordered: files are first sorted by code type, then by wordsize.
function orderFiles(files) {
	var ordered={};
	for (var i=0;i<files.length;i++){
		var f=files[i];
		if (typeof ordered[f.code]=="undefined") ordered[f.code]=[];
		ordered[f.code].push(f);
	}
	for (var i in ordered)
		ordered[i].sort((a,b)=> a.coderate<b.coderate);
	return ordered;
}

function selectFile(files,filename)
{
	for (var code in files)
		for (var f=0;f<files[code].length;f++)
			if (decodeURIComponent(files[code][f].filename) == filename)
				return files[code][f];
	return null;
}

function drawCurvesFromURI(files,filename,side)
{
	var f=selectFile(files,filename);
	if (f)
	{
		$("#codetype"+side).val(f.code);
		$("."+side+" .codetype").trigger("change");
		$("#size"+side).val(f.framesize);
		$("."+side+" .size").trigger("change");
		$("."+side+" .g"+f.id).trigger("click");
	}
}

//main
$(document).ready(function() {
	var d3 = Plotly.d3;
	var WIDTH_IN_PERCENT_OF_PARENT = 100,
	HEIGHT_IN_PERCENT_OF_PARENT = 40;
	var plots=["ber","fer"/*,"befe","thr"*/];
	plots.forEach(function(e) {
	GD[e] = d3.select("#plot"+e)
		.append('div')
		.style({
			width: WIDTH_IN_PERCENT_OF_PARENT + '%',
			'margin-left': (100 - WIDTH_IN_PERCENT_OF_PARENT) / 2 + '%',
			height: HEIGHT_IN_PERCENT_OF_PARENT + 'vh',
			'margin-top': (40 - HEIGHT_IN_PERCENT_OF_PARENT) / 2 + 'vh'
		}).node();
	});

	setMIME("application/json");
	loadFileList(1,100).done(function(files) {
	$.when.apply(this,files.map(x=>loadFile(x))).done(
		function() {
			var files=Array.from(arguments).reduce((acc,val)=>acc.concat(val),[]);
			var ordered=orderFiles(files);
			displayCodeTypes(ordered);
			document.getElementById("loader").style.display = "none";
			document.getElementById("tips").style.display = "block";

			var left = findGetParameter("left");
			if (left) drawCurvesFromURI(ordered,left,"left");
			var right = findGetParameter("right");
			if (right) drawCurvesFromURI(ordered,right,"right");
		});
	});
});