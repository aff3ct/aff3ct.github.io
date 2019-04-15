const GITLAB="https://gitlab.com/api/v4/projects/10354484/repository/";
const BRANCH="development";


const maxNbCurves=5;//Colors are defined for only 5 curves in this order: Blue,Orange,Green,Red,Purple. I'm not responsible for more than 5 curves. Sincerely, Me.
const CURVES=[];
const curvesNames=[];
let nbChoices=1;
let nbCurves=0;
const INDICES_DISPLAY=[];
const OG=['#1F77B4', '#ff7f0e', '#2ea12e', '#d62728', '#9467bd'];

function initialization() {
	for (let i=0; i<maxNbCurves; i++) {
	CURVES.push({ber:[],fer:[]/*,thr:[],befe:[]*/});
	curvesNames.push("curve"+String(i));
	INDICES_DISPLAY.push(0);
}
}
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
	},
	colorway: OG,
};

const LAYOUT= {
	ber: Object.assign({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Bit Error Rate (BER)'} },LT),
	fer: Object.assign({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Frame Error Rate (FER)'}},LT),
    // befe: Object.assign({yaxis: { autorange: true, hoverformat: '.2e',title: 'BE/FE'}},LT),
    // thr: Object.assign({ yaxis: { autorange: true, hoverformat: '.2e',title: 'Throughput (Mb/s)'}},LT)
};

var GD={};

// function replaceQueryParam(param, search, newval) {
//     var regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
//     var query = search.replace(regex, "$1").replace(/&$/, '');
//     return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
// }

function updateColors(Tab) {
	LT = {
		showlegend:false,
		xaxis:{ zeroline:false, hoverformat: '.e', title: 'Eb/N0 (dB)'},
		margin: {
			l: 100,
			r: 40,
			b: 40,
			t: 40,
			pad: 4
		},
		colorway: TAB,
	};

}

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

function parseINIString(data) {
	var regex = {
		section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
		param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
		comment: /^\s*;.*$/
	};
	var value = {};
	var lines = data.split(/[\r\n]+/);
	var section = null;
	var over = false;
	lines.forEach(function(line){
		if (!over){
			if(regex.comment.test(line)){
				return;
			}else if(regex.param.test(line)){
				var match = line.match(regex.param);
				if(section){
					value[section][match[1]] = match[2];
				}else{
					value[match[1]] = match[2];
				}
			}else if(regex.section.test(line)){
				var match = line.match(regex.section);
				if (match[1] == "trace")
				{
					over = true;
					return;
				}
				value[match[1]] = {};
				section = match[1];
			}else if(line.length == 0 && section){
				section = null;
			};
		}
	});
	return value;
}

// Reads and stores one file. Returns the content of the file.
var ID=0;
var curFile=0;
var nFiles=0;
function loadFile(file) {
	var d=$.Deferred();
	setMIME("text/plain");
	var filename = encodeURIComponent(file);
	ajaxLoad(
		GITLAB+"files/"+filename+"/raw?ref="+BRANCH
		).done(function(result) {
			var ini = parseINIString(result);
			ini.metadata.command=ini.metadata.command.replace(/"([^ ,:;]*)"/g, "$1");
			ini.metadata.command=ini.metadata.command.replace(/\-\-sim\-meta\ "([^]*)"/g, "");
			ini.metadata.command=ini.metadata.command.replace(/\-\-sim\-meta\ ([^ ]*)/g, "");
			ini.metadata.command=ini.metadata.command.replace(/"\.\.\/conf\/([^ ]*)"/g, "../conf/$1");
			ini.metadata.command=ini.metadata.command.replace(/\.\.\/conf\/([^ ]*)/g,"<a target='_blank' href='https://github.com/aff3ct/configuration_files/blob/"+BRANCH+"/$1' onclick='return trackOutboundLink(\"https://github.com/aff3ct/configuration_files/blob/"+BRANCH+"/$1\");'>conf/$1</a>");
			ini.metadata.command=ini.metadata.command.replace(/"conf\/([^ ]*)"/g, "conf/$1");
			ini.metadata.command=ini.metadata.command.replace(/conf\/([^ ]*)/g,"<a target='_blank' href='https://github.com/aff3ct/configuration_files/blob/"+BRANCH+"/$1' onclick='return trackOutboundLink(\"https://github.com/aff3ct/configuration_files/blob/"+BRANCH+"/$1\");'>conf/$1</a>");
			ini.metadata.command=ini.metadata.command.replace(/\.\/bin\/aff3ct/g,"aff3ct");

			var lines=result.split("\n");
			var startLine;
			for (startLine=0;startLine<lines.length;startLine++)
				if (lines[startLine] == "[trace]")
					break;
				lines.splice(0,startLine+1);

	// var name=ini.metadata.title;
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
				lines[i]=lines[i].replace(/\|\|/g,"|");
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
	var o={id:ID,ini:ini,info:info,coderate:coderate,framesize:framesize,codeword:codeword,ber:BER,fer:FER,
		/*befe:BEFE,thr:THR,*/code:code,file:result,filename:filename};
		d.resolve(o);
		ID=ID+1;

	// Progress bar
	curFile=curFile+1
	let percentage=Math.round(((curFile)/nFiles)*100);
	$("#loader .progress-bar").html(percentage+"%");
	$('#loader .progress-bar').attr('aria-valuenow', percentage).css('width',percentage+"%");
});
		return d.promise();
	}

// Get the list of files (no dir) of the gitlab repo. Uses multiple requests if number of files exceeds 100.
function loadFileList(page,maxperpage) {
	var dirlist=$.Deferred();
	ajaxLoad(
		GITLAB+"tree?ref="+BRANCH+"&recursive=true&per_page="+maxperpage+"&page="+page
	//GITHUB+"git/trees/"+BRANCH+"?recursive=1"
	).done(function(result) {
		var dirs=result.filter(x=>x.type=="blob").map(x=>x.path);

		var supported_ext = ["data", "perf", "dat", "txt"];
		dirs = dirs.filter(function(x){
			var filename = encodeURIComponent(x);
			var ext = filename.split('.').pop();
			return supported_ext.indexOf(ext) > -1;
		});

		if (result.length<maxperpage)
			dirlist.resolve(dirs);
		else
			loadFileList(page+1,maxperpage).done(function(d) {
				dirlist.resolve(dirs.concat(d));
			});
	});
	return dirlist.promise();
}

/////////////////////////////////////////////////////////////


function displaySelectors() {
	for(let i=4; i>=0; i--) {
		var selectorTemplate = $('#selectorTemplate').html();
		Mustache.parse(selectorTemplate);
		if (i===0) var selectorRendered=Mustache.render(selectorTemplate, {selectorCurveId: "curve"+String(i), selectorI: String(i), displayNone: ""});
		else var selectorRendered=Mustache.render(selectorTemplate, {selectorCurveId: "curve"+String(i), selectorI: String(i), displayNone: "display:none"});
		$("#comparator #comparatorNext").prepend(selectorRendered);
	}
}


////////////////////////////////////////////////////////////


function displayFiles(side,files,framesize) {
	var f=files.filter(x=>x.framesize==framesize);
	$(side+ " .bers #accordion"+side.substring(6,side.length+1)).empty();
	$("#"+side.replace(".","")+"modals").empty();
	for (var i=0;i<f.length;i++) {
		var a=f[i];
		var metadataTitle=a.ini.metadata.title;
		var codeWord="", metadataDoi="", metadataUrl="", metadataCommand="", tooltip="";
		if (a.ini.metadata.title.length > 23)
			metadataTitle=a.ini.metadata.title.substring(0,22)+'... ';
		if (a.codeword > a.framesize)
			codeWord="<b>Codeword</b>: "+a.codeword+"<br/>";
		for (var j in a.info) {
			var tooltip2 = "";
			if (tooltips.get(a.info[j]))
				tooltip2 = " class='tt' data-toggle='tooltip' data-placement='top' data-html='true' title='" + tooltips.get(a.info[j]) + "'";
			if (a.info[j] == "BP_HORIZONTAL_LAYERED") a.info[j] = "BP_HLAYERED";
			if (a.info[j] == "BP_VERTICAL_LAYERED") a.info[j] = "BP_VLAYERED";
			tooltip+="<br/><b>"+j+"</b>: "+"<span" + tooltip2 + ">" + a.info[j] + "</span>";
		}
		if (a.ini.metadata.doi)
			metadataDoi="  <span class='curveIcon'><a href='https://doi.org/"+a.ini.metadata.doi+"' target='_blank' title='DOI' onclick='return trackOutboundLink(\"https://doi.org/"+a.ini.metadata.doi+"\");'><i class='fas fa-book'></i></a></span>";
		if (a.ini.metadata.url)
			metadataUrl="  <span class='curveIcon'><a href='"+a.ini.metadata.url+"' target='_blank' title='URL' onclick='return trackOutboundLink(\""+a.ini.metadata.url+"\");'><i class='fas fa-globe'></i></a></span>";
		if (a.ini.metadata.command)
			metadataCommand="  <span class='curveIcon'><a href='#' data-toggle='modal' data-target='#modalInfoCmd"+side.replace(".","")+"_"+a.id+"' title='Command line'><i class='fas fa-laptop'></i></a></span>";
		var filesTemplate = $('#filesTemplate').html();
		Mustache.parse(filesTemplate);
		var filesRendered=Mustache.render(filesTemplate, {
			filesI: String(i),
			sideNumber: side.substring(6,side.length+1),
			side: side.substring(1,side.length+1),
			aId: a.id,
			aTitle: metadataTitle,
			aFramesize: a.framesize,
			filesCodeword: codeWord,
			aCoderate: a.coderate,
			filesTooltip: tooltip,
			filesDoi: metadataDoi,
			filesUrl: metadataUrl,
			filesCommand: metadataCommand
		});
		$(side+ " .bers #accordion"+side.substring(6,side.length+1)).append(filesRendered);
		if (a.ini.metadata.command) {
			var filesTemplate1 = $('#filesTemplate1').html();
			Mustache.parse(filesTemplate1);
			var fileRendered1=Mustache.render(filesTemplate1, 	{side: side.substring(1,side.length+1),
				aId: a.id,
				aTitle: metadataTitle,
				aCommand: String(a.ini.metadata.command),
				aFile: String(a.file),
			});
			$("#"+side.replace(".","")+"modals").append(fileRendered1);
		}
		addClick(a,side);
	}
	$('[data-toggle="tooltip"]').tooltip();
}

////////////////////////////////////////////////////////////


function displaySelectedCurve(a,side) {
	document.getElementById("scurve"+side.substring(6,side.length+1)).style.display = "inline";
	$("#scurve"+side.substring(6,side.length+1)).empty();
	var metadataTitle=a.ini.metadata.title;
	var codeWord="", tooltip1=">", tooltip2="", metadataDoi="", metadataUrl="", metadataCommand="";
	if (a.ini.metadata.title.length > 21) {
		tooltip1='data-toggle="tooltip" data-placement="left" title="'+a.ini.metadata.title+'">';
		metadataTitle=a.ini.metadata.title.substring(0,20)+"... ";
	}
	if (a.codeword > a.framesize)
		codeWord="<b>Codeword</b>: "+a.codeword+"<br/>";
	for (var j in a.info)
	{
		var tooltip = "";
		if (tooltips.get(a.info[j]))
			tooltip = " class='tt' data-toggle='tooltip' data-placement='top' data-html='true' title='" + tooltips.get(a.info[j]) + "'";
		if (a.info[j] == "BP_HORIZONTAL_LAYERED") a.info[j] = "BP_HLAYERED";
		if (a.info[j] == "BP_VERTICAL_LAYERED") a.info[j] = "BP_VLAYERED";
		tooltip2+="<br/><b>"+j+"</b>: "+"<span" + tooltip + ">" + a.info[j] + "</span>";
	}
	if (a.ini.metadata.doi)
		metadataDoi="  <span class='curveIcon'><a href='https://doi.org/"+a.ini.metadata.doi+"' target='_blank' title='DOI' onclick='return trackOutboundLink(\"https://doi.org/"+a.ini.metadata.doi+"\");'><i class='fas fa-book'></i></a></span>"
	if (a.ini.metadata.url)
		metadataUrl="  <span class='curveIcon'><a href='"+a.ini.metadata.url+"' target='_blank' title='URL' onclick='return trackOutboundLink(\""+a.ini.metadata.url+"\");'><i class='fas fa-globe'></i></a></span>"
	if (a.ini.metadata.command)
		metadataCommand="  <span class='curveIcon'><a href='#' data-toggle='modal' data-target='#modalInfoCmd"+side.replace(".","")+"_"+a.id+"' title='Command line'><i class='fas fa-laptop'></i></a></span>"
	var selectedTemplate = $('#selectedTemplate').html();
	Mustache.parse(selectedTemplate);
	var selectedRendered=Mustache.render(selectedTemplate, {
		sideNumber: side.substring(6,side.length+1),
		side: side.substring(1,side.length+1),
		aId: a.id,
		aTitle: metadataTitle,
		aFramesize: a.framesize,
		filesCodeword: codeWord,
		aCoderate: a.coderate,
		filesTooltip1: tooltip1,
		filesTooltip2: tooltip2,
		filesDoi: metadataDoi,
		filesUrl: metadataUrl,
		filesCommand: metadataCommand
	});
	$("#scurve"+side.substring(6,side.length+1)).append(selectedRendered);
	if (a.ini.metadata.command) {
		var filesTemplate1 = $('#filesTemplate1').html();
		Mustache.parse(filesTemplate1);
		var fileRendered1=Mustache.render(filesTemplate1, 	{side: side.substring(1,side.length+1),
			aId: a.id,
			aTitle: metadataTitle,
			aCommand: String(a.ini.metadata.command),
			aFile: String(a.file),
		});
		$("#"+side.replace(".","")+"modals").append(fileRendered1);
	}
}




function addClickBranches(x) {
	if (nbChoices===x) {
		if (nbCurves===x-1) {
			nbChoices=x+1;
			nbCurves=x;
			document.getElementById(curvesNames[nbCurves]).style.display = "inline-block";
		}
		else {
			nbChoices=x+1;
			nbCurves=x+1;
			document.getElementById(curvesNames[nbCurves-1]).style.display = "inline-block";
		}
	}
}

// Click listener for curves list
function addClick(a,side) {
	$('#'+side.substring(1,side.length+1)+a.id).on('click', function() {
		console.log("Add: Before: nbChoices="+nbChoices+" nbCurves="+nbCurves);
		if ($("#delete"+String(Number(side.substring(6,side.length+1))-1)).length!==0) {
			document.getElementById("delete"+String(Number(side.substring(6,side.length+1))-1)).style.display = "none";
		}
		displaySelectedCurve(a,side);
		if (nbChoices!==5) document.getElementById(curvesNames[nbChoices-1]).style.display = "none";
		document.getElementById("tips").style.display = "none";
		const plots=["ber","fer"/*,"befe","thr"*/];
		$(side+" .bers .active").removeClass("active");
		$(this).addClass("active");

		let nb=side.substring(6,side.length+1);
		nb=Number(nb);
		CURVES[nb]=a;
		if (nb===maxNbCurves-1) {
			nbCurves=maxNbCurves;
		}
		else {
			addClickBranches(nb+1);
		}
		console.log("Add: After: nbChoices="+nbChoices+" nbCurves="+nbCurves);
		plots.forEach(function(x) {
			const CURVESBIS=[];
			for (let l=0; l<maxNbCurves; l++) {
				CURVESBIS.push(CURVES[l][x]);
			}
	    /**
	    if (nbCurves!==nbChoices) {
		Plotly.newPlot(GD[x],CURVESBIS.slice(0,nbCurves+1),LAYOUT[x],{displaylogo:false});
	    }
	    else {
		Plotly.newPlot(GD[x],CURVESBIS.slice(0,nbCurves),LAYOUT[x],{displaylogo:false});
	}**/
	Plotly.newPlot(GD[x],CURVESBIS.slice(0,nbCurves),LAYOUT[x],{displaylogo:false});
});

		let cval=[];
		for (let i=0; i<maxNbCurves; i++) {
			cval.push(encodeURIComponent(findGetParameter("curve"+String(i))));
		}
		var uri  = "/comparator.html?curve0="+cval[0];
		for (let i=1; i<maxNbCurves; i++) {
			uri=uri+"&curve"+String(i)+"="+cval[i];
		}
		uri = updateURLParameter(uri,side.replace(".",""),a.filename);
		window.history.replaceState({},"aff3ct.github.io",uri);

	// track the click with Google Analytics
	ga('send', {
		hitType:       'event',
		eventCategory: 'BER/FER Comparator',
		eventAction:   'click',
		eventLabel:    decodeURIComponent(a.filename)
	});
	console.log("Add: After: nbChoices="+nbChoices+" nbCurves="+nbCurves);
});
}


function deleteClick(divId, idSide) {
	const plots=["ber","fer"];
	console.log("Delete: Before: nbChoices="+nbChoices+" nbCurves="+nbCurves);
	if ($("#delete"+idSide.substring(5,idSide.length+1)).length!==0) {
		if (Number(idSide.substring(5,idSide.length+1))!==0) {
			document.getElementById("delete"+String(Number(idSide.substring(5,idSide.length+1))-1)).style.display = "inline";
			document.getElementById("delete"+idSide.substring(5,idSide.length+1)).style.display = "none"; 
		}
		else document.getElementById("delete"+idSide.substring(5,idSide.length+1)).style.display = "none";
	}
	if (nbChoices !== 1) {
		if (nbCurves!==5) {
			document.getElementById(curvesNames[nbChoices-1]).style.display = "none";
			document.getElementById(curvesNames[nbChoices-2]).style.display = "inline-block";
		}
		$("#s"+idSide).empty();
		if (Number(idSide.substring(5,idSide.length+1)) >= GD[plots[0]].data.length-1) {
			plots.forEach(x => Plotly.deleteTraces(GD[x], GD[x].data.length-1));
		}
		else {
			plots.forEach(x => Plotly.deleteTraces(GD[x], Number(idSide.substring(5,idSide.length+1))));
		}
		console.log("scurve"+idSide.substring(5,idSide.length+1));
		document.getElementById("scurve"+idSide.substring(5,idSide.length+1)).style.display = "none";
		if (nbCurves===nbChoices) nbCurves-=1;
		else {
			nbCurves-=1;
			nbChoices-=1;
		}
	}
	console.log("Delete: After: nbChoices="+nbChoices+" nbCurves="+nbCurves);
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
			for (let k=0; k<maxNbCurves; k++) {
				displayFrameSizes(".curve"+String(k),i,files);
			}
		}
		$(".codetype").append("<option " + selected + ">"+i+"</option>");
		j++;
	}

	$(".codetype").off();
	for (let k=0; k<maxNbCurves; k++) {
		$(".curve"+String(k)+" .codetype").change(function() { for (let i=0; i<maxNbCurves; i++) displayFrameSizes(".curve"+String(i),$(this).val(),files); });
	}
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
		for(let i=0; i<maxNbCurves; i++) displayFiles(side.substring(0,side.length-1)+String(i),files[code],$(this).val());
	});
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
	for (var code in files) {
		for (var f=0;f<files[code].length;f++) {
			if (decodeURIComponent(files[code][f].filename) == filename) return files[code][f];
			return null;
		}
	}
}

function drawCurvesFromURI(files,filename,side) {
	var f=selectFile(files,filename);
	if (f) {
		$("#codetype"+side).val(f.code);
		$("."+side+" .codetype").trigger("change");
		$("#size"+side).val(f.framesize);
		$("."+side+" .size").trigger("change");
		$("."+side+" .g"+f.id).trigger("click");
	}
}

//main
$(document).ready(function() {
	initialization();
	displaySelectors();
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
		nFiles=files.length;
		$.when.apply(this,files.map(x=>loadFile(x))).done(function() {
			var files=Array.from(arguments).reduce((acc,val)=>acc.concat(val),[]);
			var ordered=orderFiles(files);
			displayCodeTypes(ordered);
			document.getElementById("loader").style.display = "none";
			document.getElementById("curvesTip").style.display = "block";
			document.getElementById("tips").style.display = "block";
			document.getElementById("selector").style.display = "block";
			document.getElementById("comparator").style.display = "block";
			const varSide=[];
			for (let k=0; k<maxNbCurves; k++) {
				varSide.push(findGetParameter("curve"+String(k)));
				if (varSide[k]) drawCurvesFromURI(ordered,varSide[k],"curve"+String(k));
			}
		});
	});
});
