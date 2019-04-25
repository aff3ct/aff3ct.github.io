const GITLAB="https://gitlab.com/api/v4/projects/10354484/repository/";
const BRANCH="development";

const Curves = {
	max: 5,//Colors are defined for only 5 curves in this order: Blue,Orange,Green,Red,Purple. I'm not responsible for more than 5 curves. Sincerely, Me.
	length: 0,//number of displayed curves
	disponibility: [],//index==id! disponibility[id]=1 => available && disponibility[id]=0 => unavailable
	id: [],
	names: [],//names[id]=name_of_the_curve
	values: [],//where values of the curve are
	colors: ['#1f77b4', '#ff7f0e', '#2ea12e', '#d62728', '#9467bd'], // Blue, Orange, Green, Red, Purple
	colorsOrder: [0, 1, 2, 3, 4], // 0:blue, 1:orange, 2:green, 3:red, 4:purple;
	plots: ["ber","fer"/*,"befe","thr"*/],
	currentFile: "",
	currentFrameSize: "",
	plotOrder: [],
	toolTips: [],
	toolTipsSelected: [],
	initialization() {
		for (let i=0; i<this.max; i++) {
		this.values.push({ber:[],fer:[]/*,thr:[],befe:[]*/});
		this.names.push("curve"+String(i));
		this.id.push(-1);
		this.disponibility.push(1);
		this.plotOrder.push(-1);
		this.toolTipsSelected.push("");
	}
},
	firstSideAvailable() {//return the id of the first free curve according to the disponibility tab, 4 if it's full
	if (this.length<=4) return String(this.colorsOrder[this.length]);
	else return String(this.colorsOrder[this.max-1]);
},
firstIndexAvailable() {
	let i=0;
	let result=-1;
	while (i<this.max) {
		if (this.plotOrder[i]==-1) {
			result=i;
			i=this.max;
		}
		else {
			i++;
		}
	}
	return result;
},
	displayed(i) {//return the curve name of the i^(th) displayed curve (% Curves.max), "null" if it's empty 
	if (this.length==0) {
		return "null";
	}
	i=i%this.max;
	let j=0, k=0;
	while (k<i) {
		if (this.disponibility[j]==0) k++;
		j++;
		j=j%this.max;
	}
	return this.names[(j-1)%this.max];
},
addCurve(a) {
	let i=this.firstSideAvailable();
	this.plotOrder[this.firstIndexAvailable()]=Number(this.firstSideAvailable());
	this.id[i]=a.id;
	this.plots.forEach(x => this.values[i][x]=a[x]);
	if (this.length<this.max) this.length++;
	this.disponibility[i]=0;
},
deleteCurve(nb) {
	if (nb<=this.max) {
		if (this.disponibility[nb]==0) {
			let a=this.plotOrder[this.plotOrder.indexOf(Number(nb))];
			let col=this.colors[this.plotOrder.indexOf(Number(nb))];
			let colIndex=this.colorsOrder[this.plotOrder.indexOf(Number(nb))];
			this.colors.splice(this.plotOrder.indexOf(Number(nb)),1);
			this.colorsOrder.splice(this.plotOrder.indexOf(Number(nb)),1);
			this.colors.push(col);
			this.colorsOrder.push(colIndex);
			this.plotOrder.splice(this.plotOrder.indexOf(Number(nb)),1);
			this.plotOrder.push(-1);
			this.id[nb]=-1;
			this.length--;
			this.values[nb]={ber:[],fer:[]};
			this.disponibility[nb]=1;
		}
		else {
			console.log("Curve"+String(nb)+" is already available.");
		}
	}
	else {
		console.log(String(nb)+" > Curves.max (Curves.max = "+String(this.max));
	}
},
curveId() {
	return "curve"+this.firstSideAvailable();
},
updateAddButtons() {
	Curves.id.forEach(function(x) {
		Curves.names.forEach(function(y) {
			if (x!=-1)	$('#'+y+x).prop('disabled', true);
		});
	});
}
};
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
	colorway: Curves.colors,
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
	curFile=curFile+1;
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

function displaySelector() {
	var selectorTemplate = $('#selectorTemplate').html();
	Mustache.parse(selectorTemplate);
	var selectorRendered=Mustache.render(selectorTemplate, {selectorCurveId: "selector", displayNone: ""});
	$("#comparator #comparatorNext").prepend(selectorRendered);
}

function displayFiles(files,framesize) {
	Curves.currentFile=files;
	Curves.toolTips=[];
	Curves.currentFrameSize=framesize;
	var f=files.filter(x=>x.framesize==framesize);
	$("#selector .bers #accordion").empty();
	$("#"+Curves.curveId()+"modalsSelector").empty();
	for (var i=0;i<f.length;i++) {
		var a=f[i];
		var metadataTitle=a.ini.metadata.title;
		var metadataTitleShort=a.ini.metadata.title;
		var codeWord="", metadataDoi="", metadataUrl="", metadataCommand="", tooltip="", tooltipParam="";
		if (a.ini.metadata.title.length > 23) {
			metadataTitleShort=a.ini.metadata.title.substring(0,22)+'... ';
			let nb=Curves.toolTips.length;
			tooltipParam="id='toolTip"+String(nb)+"' data-tippy-content='"+String(metadataTitle)+"'";
			Curves.toolTips.push('#toolTip'+String(nb));
		}
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
			metadataCommand="  <span class='curveIcon'><a href='#' data-toggle='modal' data-target='#modalInfoCmd"+"_"+a.id+"' title='Command line'><i class='fas fa-laptop'></i></a></span>";
		var filesTemplate = $('#filesTemplate').html();
		Mustache.parse(filesTemplate);
		var filesRendered=Mustache.render(filesTemplate, {
			filesI: String(i),
			sideNumber: Curves.curveId().substring(5,Curves.curveId().length),
			side: Curves.curveId(),
			aId: a.id,
			tooltip: tooltipParam,
			aTitleShort: metadataTitleShort,
			aTitle: metadataTitle,
			aFramesize: a.framesize,
			filesCodeword: codeWord,
			aCoderate: a.coderate,
			filesTooltip: tooltip,
			filesDoi: metadataDoi,
			filesUrl: metadataUrl,
			filesCommand: metadataCommand
		});
		$("#selector .bers #accordion").append(filesRendered);
		tippy(Curves.toolTips[Curves.toolTips.length-1], {
			arrow: true,
			arrowType: 'sharp',
			animation: 'fade',
		});
		Curves.updateAddButtons();
		if (a.ini.metadata.command) {
			var cmdSelectorTemplate = $('#cmdSelectorTemplate').html();
			Mustache.parse(cmdSelectorTemplate);
			var fileRendered1=Mustache.render(cmdSelectorTemplate, 	{side: Curves.curveId(),
				aId: a.id,
				aTitle: metadataTitle,
				aCommand: String(a.ini.metadata.command),
				aFile: String(a.file),
			});
			$("#curvemodalsSelector").append(fileRendered1);
		}
		addClick(a,files,framesize);
	}
	$('[data-toggle="tooltip"]').tooltip();
}

function displaySelectedCurve(a) {
	var metadataTitle=a.ini.metadata.title;
	var codeWord="", tooltip1=">", tooltip2="", metadataDoi="", metadataUrl="", metadataCommand="", metadataTitleShort=a.ini.metadata.title, nb=-1;
	if (a.ini.metadata.title.length > 21) {
		nb=Curves.curveId().substring(5, Curves.curveId().length);
		tooltip1="id='TooltipCurve"+nb+"' data-tippy-content='"+String(metadataTitle)+"'>";
		Curves.toolTipsSelected[Number(nb)]='#TooltipCurve'+nb;
		metadataTitleShort=a.ini.metadata.title.substring(0,20)+"... ";
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
		metadataCommand="  <span class='curveIcon'><a href='#' data-toggle='modal' data-target='#modalInfoCmd"+Curves.curveId()+"_"+a.id+"' title='Command line'><i class='fas fa-laptop'></i></a></span>"
	var selectedTemplate = $('#selectedTemplate').html();
	Mustache.parse(selectedTemplate);
	var selectedRendered=Mustache.render(selectedTemplate, {
		sideNumber: Curves.curveId().substring(5,Curves.curveId().length),
		side: Curves.curveId(),
		aId: a.id,
		aTitle: metadataTitle,
		aTitleShort: metadataTitleShort,
		aFramesize: a.framesize,
		filesCodeword: codeWord,
		aCoderate: a.coderate,
		filesTooltip1: tooltip1,
		filesTooltip2: tooltip2,
		filesDoi: metadataDoi,
		filesUrl: metadataUrl,
		filesCommand: metadataCommand
	});
	$("#scurve #sAccordion").append(selectedRendered);
	tippy(Curves.toolTipsSelected[nb], {
		arrow: true,
		arrowType: 'sharp',
		animation: 'fade',
	});
	if (a.ini.metadata.command) {
		var cmdSelectedTemplate = $('#cmdSelectedTemplate').html();
		Mustache.parse(cmdSelectedTemplate);
		var fileRendered1=Mustache.render(cmdSelectedTemplate, 	{side: Curves.curveId(),
			aId: a.id,
			aTitle: metadataTitle,
			aCommand: String(a.ini.metadata.command),
			aFile: String(a.file),
		});
		$("#"+Curves.curveId()+"modals").append(fileRendered1);
	}
}

// Click listener for curves list
function addClick(a,files,framesize) {
	$('#'+Curves.curveId()+a.id).on('click', function() {
		document.getElementById("tips").style.display = "none";
		const plots=["ber","fer"/*,"befe","thr"*/];
		$("#selector .bers .active").removeClass("active");
		$(this).addClass("active");
		if (Curves.length==5) console.log("Maximum quantity of curves reached!");
		else {
			$('#'+Curves.curveId()+a.id).prop('disabled', true);
			displaySelectedCurve(a);
			let cval=[];
			for (let i=0; i<Curves.max; i++) {
				cval.push(encodeURIComponent(findGetParameter("curve"+String(i))));
			}
			var uri  = "/comparator.html?curve0="+cval[0];
			for (let i=1; i<Curves.max; i++) {
				uri=uri+"&curve"+String(i)+"="+cval[i];
			}
			uri = updateURLParameter(uri,Curves.curveId(),a.filename);
			window.history.replaceState({},"aff3ct.github.io",uri);
			Curves.addCurve(a);
			displayFiles(files,framesize);
			Curves.updateAddButtons();
			plots.forEach(function(x) {
				const CURVESBIS=[];
				for (let l=0; l<Curves.max; l++) {
					if (Curves.plotOrder[l]!=-1) {
						CURVESBIS.push(Curves.values[Curves.plotOrder[l]][x]);
					}
				}
				Plotly.newPlot(GD[x],CURVESBIS.slice(0,Curves.length),LAYOUT[x],{displaylogo:false});
			});
		}
	// track the click with Google Analytics
	ga('send', {
		hitType:       'event',
		eventCategory: 'BER/FER Comparator',
		eventAction:   'click',
		eventLabel:    decodeURIComponent(a.filename)
	});
});
}


function deleteClick(divId, idSide) {
	const plots=["ber","fer"];
	$('#'+Curves.curveId()+Curves.id[Number(idSide.substring(5,idSide.length))]).prop('disabled', false);
	if (Curves.length !== 0) {
		Curves.deleteCurve(idSide.substring(5, idSide.length));
		displayFiles(Curves.currentFile,Curves.currentFrameSize);
		Curves.updateAddButtons();
		$("#ss"+idSide).remove();
		plots.forEach(function(x) {
			const CURVESBIS=[];
			for (let l=0; l<Curves.max; l++) {
				if ((Curves.plotOrder[l]!=-1) && (l!=Curves.plotOrder.indexOf(Number(idSide.substring(5,idSide.length))))) {
					CURVESBIS.push(Curves.values[Curves.plotOrder[l]][x]);
				}
			}
			Plotly.newPlot(GD[x],CURVESBIS.slice(0,Curves.length),LAYOUT[x],{displaylogo:false});
		});
	}
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
			displayFrameSizes(i,files);
		}
		$(".codetype").append("<option " + selected + ">"+i+"</option>");
		j++;
	}

	$(".codetype").off();
	$(".selector .codetype").change(function() {
		displayFrameSizes($(this).val(),files);
	});
}

window.onresize = function() {
	Plotly.Plots.resize(GD.ber);
	Plotly.Plots.resize(GD.fer);
    // Plotly.Plots.resize(GD.befe);
    // Plotly.Plots.resize(GD.thr);
};

function displayFrameSizes(code,files) {
	var p={};
	var j=0;
	for (var i=0;i<(files[code]).length;i++) {
		var f=files[code][i];
		p[f.framesize]=true;
	}
	$("#selector .size").empty();
	for (var i in p){
		if (j==0) j=i;
		$("#selector .size").append("<option>"+i+"</option>");
	}
	displayFiles(files[code],j);
	$("#selector .size").off();
	$("#selector .size").change(function() {
		displayFiles(files[code],$(this).val());
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
		}
	}
	return null;
}

function drawCurvesFromURI(ordered) {
	Curves.names.forEach(function(idSide) {
		let filename=findGetParameter(idSide);
		if (filename) {
			let f=selectFile(ordered,filename);
			if (f) {
				$("#codetypeselector").val(f.code);
				$(".selector .codetype").trigger("change");
				$("#sizeselector").val(f.framesize);
				$(".selector .size").trigger("change");
				console.log("f.id="+f.id);
				console.log("idSide+f.id="+idSide+f.id);
				$(idSide+f.id).trigger("click");
			}
		}
	});
}

//main
$(document).ready(function() {
	Curves.initialization();
	displaySelector();
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
			drawCurvesFromURI(ordered);
		});
	});
});

