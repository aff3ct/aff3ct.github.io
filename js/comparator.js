const GITLAB="https://gitlab.com/api/v4/projects/10354484/";
const BRANCH="development";

const Curves = {
	max: 10,//Colors are defined for only 10 curves. I'm not responsible for more curves. Sincerely, Me.
	length: 0,//number of displayed curves
	disponibility: [],//index==id! disponibility[id]=1 => available && disponibility[id]=0 => unavailable
	hidden: [],//1 if hidden else 0
	id: [],
	names: [],//names[id]=name_of_the_curve
	values: [],//where values of the curves are
	referenceColors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'], // Do not modify this tab!!! Use it as a reference
	colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'], // muted blue //safety orange // cooked asparagus green // brick red // muted purple // chestnut brown // raspberry yogurt pink // middle gray // curry yellow-green // blue-teal
	colorsOrder: [], // From 0 to 9
	plots: ["ber","fer"/*,"befe","thr"*/],
	PLOTS: {ber: "BER", fer: "FER"},
	plotOrder: [],
	toolTips: [],
	toolTipsSelected: [],
	selectedCodes: [],
	selectedSizes: [],
	selectedModems: [],
	selectedChannels: [],
	files: [],
	initialization() {
		for (let i=0; i<this.max; i++) {
			this.values.push({ber:[],fer:[]});
			this.names.push("curve"+String(i));
			this.id.push(-1);
			this.colorsOrder.push(i);
			this.disponibility.push(1);
			this.plotOrder.push(-1);
			this.toolTipsSelected.push("");
			this.hidden.push(0);
		}
	},
	firstSideAvailable() {
		//return the id of the first free curve according to the disponibility tab, 4 if it's full
		if (this.length<this.max) return String(this.colorsOrder[this.length]);
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
	displayed(i) {
		//return the curve name of the i^(th) displayed curve (% Curves.max), "null" if it's empty 
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
	addInputCurve(a) {
		let i=this.firstSideAvailable();
		this.plotOrder[this.firstIndexAvailable()]=Number(this.firstSideAvailable());
		this.id[i]=a.id;
		this.plots.forEach(x => this.values[i][x]=a[x]);
		if (this.length<this.max) this.length++;
		this.disponibility[i]=0;
		this.hidden[i]=0;
	},
	addCurve(a) {
		let i=this.firstSideAvailable();
		this.plotOrder[this.firstIndexAvailable()]=Number(this.firstSideAvailable());
		this.id[i]=getId(a);
		this.plots.forEach(x => this.values[i][x]={name: this.PLOTS[x], type: "scatter", x: a.contents["Eb/N0"], y: a.contents[this.PLOTS[x]]});
		if (this.length<this.max) this.length++;
		this.disponibility[i]=0;
		this.hidden[i]=0;
		this.updateAddButton(true, "-", i);
	},
	deleteCurve(nb) {
		if (nb<=this.max) {
			if (this.disponibility[nb]==0) {
				let a=this.plotOrder[this.plotOrder.indexOf(Number(nb))];
				let col=this.colors[this.plotOrder.indexOf(Number(nb))];
				let colIndex=this.colorsOrder[this.plotOrder.indexOf(Number(nb))];
				this.colors.splice(this.plotOrder.indexOf(Number(nb)),1);
				this.referenceColors.splice(this.plotOrder.indexOf(Number(nb)),1);
				this.colorsOrder.splice(this.plotOrder.indexOf(Number(nb)),1);
				this.colors.push(col);
				this.referenceColors.push(col);
				this.colorsOrder.push(colIndex);
				this.plotOrder.splice(this.plotOrder.indexOf(Number(nb)),1);
				this.plotOrder.push(-1);
				this.updateAddButton(false, "+", nb);
				this.id[nb]=-1;
				this.hidden[nb];
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
	updateAddButton(bool, string, nb) {
		$('#'+"curve0"+this.id[nb]).prop('disabled', bool);
		$('#'+"curve0"+this.id[nb]).empty();
		$('#'+"curve0"+this.id[nb]).append(string);
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
	hovermode: 'x',
};

const LAYOUT= {
	ber: Object.assign({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Bit Error Rate (BER)'} },LT),
	fer: Object.assign({ yaxis: { type: 'log', autorange: true, hoverformat: '.2e',title: 'Frame Error Rate (FER)'}},LT),
    // befe: Object.assign({yaxis: { autorange: true, hoverformat: '.2e',title: 'BE/FE'}},LT),
    // thr: Object.assign({ yaxis: { autorange: true, hoverformat: '.2e',title: 'Throughput (Mb/s)'}},LT)
};

var GD={};

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
	if (paramVal=="") paramVal="null";
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

function parseFile(hashId, result) {//Return data ready-to-plot
	let ini=parseINIString(result);
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
	// var name=result.metadata.title;
	var coderate=0,framesize=0,infobits=0,codeword=0;
	var BER={x:[],y:[],type:'scatter',name:'BER'};
	var FER={x:[],y:[],type:'scatter',name:'FER'};
	// var BEFE={x:[],y:[],type:'scatter',name:'BE/FE'};
	// var THR={x:[],y:[],type:'scatter',name:'Mb/s'};
	var info={};
	for (var i=0;i<lines.length;i++)
		if (lines[i].startsWith("# * ")&&lines[i+1].indexOf("Type")>-1) {
			info[lines[i].substring(4,lines[i].indexOf("-")).trim()] = lines[i+1].split("=")[1].trim();
		}
	//
	var code=info.Code;
	let modem1=info.Modem;
	let channel1=info.Channel;
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
	//
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
	var o={id:Curves.firstSideAvailable(),ini:ini,info:info,coderate:coderate,framesize:framesize,codeword:codeword,ber:BER,fer:FER,/*befe:BEFE,thr:THR,*/code:code,file:result,filename:hashId,modem:modem1,channel:channel1};
	//console.log("***"+roughSizeOfObject(o));
	return o;
}



function loadDatabase() {//Return String that include the whole file
	let databaseURL = GITLAB + "jobs/artifacts/" + BRANCH + "/raw/database.json?job=deploy-database-json";
	$.ajaxSetup({
		beforeSend: function(xhr){
			if (xhr.overrideMimeType) xhr.overrideMimeType("text/plain");
		},
		isLocal:true
	});
	$.ajax(databaseURL,{error:function(xhr,status,error) {
		logger("**Error loading \"" + databaseURL + "\"\n"+status+" "+error);
	}}).done(function(data) {
		let dataTab=JSON.parse(data);
		Curves.files=orderFiles(dataTab);
		displayCodeTypes();
		displayFrameSizes();
		displayModems();
		displayChannels();
		document.getElementById("loader").style.display = "none";
		document.getElementById("curvesTip").style.display = "block";
		document.getElementById("tips").style.display = "block";
		document.getElementById("selector").style.display = "block";
		document.getElementById("comparator").style.display = "block";
		drawCurvesFromURI();
	});
}

function displaySelector() {
	var selectorTemplate = $('#selectorTemplate').html();
	Mustache.parse(selectorTemplate);
	var selectorRendered=Mustache.render(selectorTemplate, {selectorCurveId: "selector", displayNone: ""});
	$("#comparator #comparatorNext").prepend(selectorRendered);
	var stepSlider = document.getElementById('slider-step');
	noUiSlider.create(stepSlider, {
		start: [0,1],
		connect: true,
		step: 0.01,
		range: {
			'min': [0],
			'max': [1]
		}
	});
	$("#slider-step").append("<div class='my-3'><span id='slider-step-value'></span></div>")
	var stepSliderValueElement = document.getElementById('slider-step-value');
	stepSlider.noUiSlider.on('update', function (values) {
		displayFrameSizes();
		displayCodeTypes();
		stepSliderValueElement.innerHTML = "Values: ";
		stepSliderValueElement.innerHTML += values.join(' - ');
	});
}

function getId(file) {
	return file.hash.value.substring(0,7);
}

function displayFiles(files) {//Display files that can be selected
	$("#accordion").empty();
	Curves.toolTips=[];
	$("#"+Curves.curveId()+"modalsSelector").empty();
	for (var code in files) {
		for (let i=0; i<files[code].length; i++) {
			var a=files[code][i];
			/([a-z0-9A-Z.\-,\/=\s;\+:]+\([0-9,]+\))([a-z0-9A-Z.\-,\/=\s;\+:()]+)/mg.test(a.metadata.title);
			var metadataTitle=a.metadata.title;
			var metadataTitleShort=a.metadata.title;
			var titleEnd="";
			var codeWord="", metadataDoi="", metadataUrl="", metadataCommand="", tooltip="", tooltipParam="";
			if (a.metadata.title.length > 23) {
				if (RegExp.$1=="" || RegExp.$2=="") metadataTitleShort=a.metadata.title.substring(0,22)+'... ';
				else {
					metadataTitleShort=RegExp.$1;
					titleEnd=RegExp.$2;
				}
				let nb=Curves.toolTips.length;
				tooltipParam="id='toolTip"+String(nb)+"' data-tippy-content='"+String(metadataTitle)+"'";
				Curves.toolTips.push('#toolTip'+String(nb));
			}
			if (a.headers.Codec["Codeword size (N_cw)"] > a.headers.Codec["Frame size (N)"])
				codeWord="<b>Codeword</b>: "+a.headers.Codec["Codeword size (N_cw)"]+"<br/>";
			for (var j in a.headers) {
				if (a.headers[j].Type) {
					var tooltip2 = "";
					if (tooltips.get(a.headers[j].Type))
						tooltip2 = " class='tt' data-toggle='tooltip' data-placement='top' data-html='true' title='" + tooltips.get(a.headers[j].Type) + "'";
					if (a.headers[j].Type == "BP_HORIZONTAL_LAYERED") a.headers[j].Type = "BP_HLAYERED";
					if (a.headers[j].Type == "BP_VERTICAL_LAYERED") a.headers[j].Type = "BP_VLAYERED";
					tooltip+="<br/><b>"+j+"</b>: "+"<span" + tooltip2 + ">" + a.headers[j].Type + "</span>";
				}
			}
			if (a.metadata.doi)
				metadataDoi="  <span class='curveIcon'><a href='https://doi.org/"+a.metadata.doi+"' target='_blank' title='DOI' onclick='return trackOutboundLink(\"https://doi.org/"+a.metadata.doi+"\");'><i class='fas fa-book'></i></a></span>";
			if (a.metadata.url)
				metadataUrl="  <span class='curveIcon'><a href='"+a.metadata.url+"' target='_blank' title='URL' onclick='return trackOutboundLink(\""+a.metadata.url+"\");'><i class='fas fa-globe'></i></a></span>";
			if (a.metadata.command)
				metadataCommand="  <span class='curveIcon'><a href='#' data-toggle='modal' data-target='#modalInfoCmd"+"_"+getId(a)+"' title='Command line'><i class='fas fa-laptop'></i></a></span>";
			var filesTemplate = $('#filesTemplate').html();
			Mustache.parse(filesTemplate);
			var filesRendered=Mustache.render(filesTemplate, {
				filesI: String(i),
				sideNumber: Curves.curveId().substring(5,Curves.curveId().length),
				side: Curves.curveId(),
				aId: getId(a),
				tooltip: tooltipParam,
				aTitleShort: metadataTitleShort,
				aTitle: metadataTitle,
				aTitleEnd: titleEnd,
				aFramesize: a.headers.Codec["Frame size (N)"],
				filesCodeword: codeWord,
				aCoderate: a.headers.Codec["Code rate"],
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
			if (a.metadata.command) {
				var cmdSelectorTemplate = $('#cmdSelectorTemplate').html();
				Mustache.parse(cmdSelectorTemplate);
				var fileRendered1=Mustache.render(cmdSelectorTemplate, 	{side: Curves.curveId(),
					aId: getId(a),
					aTitle: metadataTitle,
					aCommand: String(a.metadata.command),
					aFile: String(a.trace),
				});
				$("#curvemodalsSelector").append(fileRendered1);
			}
			addClick(a,code,a.headers.Codec["Frame size (N)"],0);
		}
		$('[data-toggle="tooltip"]').tooltip();
	}
}

function displaySelectedCurve(a) {//Display the current selected curve on the right
	var metadataTitle=a.metadata.title;
	var codeWord="", tooltip1=">", tooltip2="", metadataDoi="", metadataUrl="", metadataCommand="", metadataTitleShort=a.metadata.title, nb=-1, allFunc="";
	//Curves.names.forEach(x => allFunc+="deleteClick('delete', '"+x+"'),");
	if (a.metadata.title.length > 21) {
		nb=Curves.curveId().substring(5, Curves.curveId().length);
		tooltip1="id='TooltipCurve"+nb+"' data-tippy-content='"+String(metadataTitle)+"'>";
		Curves.toolTipsSelected[Number(nb)]='#TooltipCurve'+nb;
		metadataTitleShort=a.metadata.title.substring(0,20)+"... ";
	}
	if (a.headers.Codec["Codeword size (N_cw)"] > a.headers.Codec["Frame size (N)"])
		codeWord="<b>Codeword</b>: "+a.headers.Codec["Codeword size (N_cw)"]+"<br/>";
	for (var j in a.headers) {
		if (a.headers[j].Type) {
			var tooltip = "";
			if (tooltips.get(a.headers[j].Type))
				tooltip = " class='tt' data-toggle='tooltip' data-placement='top' data-html='true' title='" + tooltips.get(a.headers[j].Type) + "'";
			if (a.headers[j].Type == "BP_HORIZONTAL_LAYERED") a.headers[j].Type = "BP_HLAYERED";
			if (a.headers[j].Type == "BP_VERTICAL_LAYERED") a.headers[j].Type = "BP_VLAYERED";
			tooltip2+="<br/><b>"+j+"</b>: "+"<span" + tooltip + ">" + a.headers[j].Type + "</span>";
		}
	}
	if (a.metadata.doi)
		metadataDoi="  <span class='curveIcon'><a href='https://doi.org/"+a.metadata.doi+"' target='_blank' title='DOI' onclick='return trackOutboundLink(\"https://doi.org/"+a.metadata.doi+"\");'><i class='fas fa-book'></i></a></span>"
	if (a.metadata.url)
		metadataUrl="  <span class='curveIcon'><a href='"+a.metadata.url+"' target='_blank' title='URL' onclick='return trackOutboundLink(\""+a.metadata.url+"\");'><i class='fas fa-globe'></i></a></span>"
	if (a.metadata.command)
		metadataCommand="  <span class='curveIcon'><a href='#' data-toggle='modal' data-target='#modalInfoCmd"+Curves.curveId()+"_"+getId(a)+"' title='Command line'><i class='fas fa-laptop'></i></a></span>"
	var selectedTemplate = $('#selectedTemplate').html();
	Mustache.parse(selectedTemplate);
	var selectedRendered=Mustache.render(selectedTemplate, {
		sideNumber: Curves.curveId().substring(5,Curves.curveId().length),
		side: Curves.curveId(),
		//allFunctions: allFunc,
		aId: getId(a),
		aTitle: metadataTitle,
		aTitleShort: metadataTitleShort,
		aFramesize: a.headers.Codec["Frame size (N)"],
		filesCodeword: codeWord,
		aCoderate: a.headers.Codec["Code rate"],
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
	//$('#'+Curves.curveId()+getId(a)).on('click', function() {
		if (a.metadata.command) {
			var cmdSelectedTemplate = $('#cmdSelectedTemplate').html();
			Mustache.parse(cmdSelectedTemplate);
			var fileRendered1=Mustache.render(cmdSelectedTemplate, 	{side: Curves.curveId(),
				aId: getId(a),
				aTitle: metadataTitle,
				aCommand: String(a.metadata.command),
				aFile: String(a.trace),
			});
			$("#"+Curves.curveId()+"modals").append(fileRendered1);
		}
	//});
}

function displayInputCurve(a) {
	var metadataTitle=a.ini.metadata.title;
	var codeWord="", tooltip1=">", tooltip2="", metadataDoi="", metadataUrl="", metadataCommand="", metadataTitleShort=a.ini.metadata.title, nb=-1, allFunc="";
	//Curves.names.forEach(x => allFunc+="deleteClick('delete', '"+x+"'),");
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
		//allFunctions: allFunc,
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

function subAddClick(a, code, framesize, input) {
	let files=Curves.files[code];
	if (Curves.length==0) {
		var deleteAllTemplate = $('#deleteAllTemplate').html();
		Mustache.parse(deleteAllTemplate);
		$("#scurve").prepend(deleteAllTemplate);
		document.getElementById("plotber").style.display = "inline";
		document.getElementById("plotfer").style.display = "inline";
	}
	document.getElementById("tips").style.display = "none";
	const plots=["ber","fer"/*,"befe","thr"*/];
	$("#selector .bers .active").removeClass("active");
	$(this).addClass("active");
	if (Curves.length==Curves.max) console.log("Maximum quantity of curves reached!");
	else {
		if (input==0) {
			displaySelectedCurve(a);
			Curves.addCurve(a);
		}
		else {
			displayInputCurve(a);
			Curves.addInputCurve(a);
		}
		//if (input==0) {
			let cval=[];
			for (let i=0; i<Curves.max; i++) {
				cval.push(encodeURIComponent(findGetParameter("curve"+String(i))));
			}
			var uri  = "/comparator.html?curve0="+cval[0];
			for (let i=1; i<Curves.max; i++) {
				uri=uri+"&curve"+String(i)+"="+cval[i];
			}
			if (input==0) uri = updateURLParameter(uri,Curves.curveId(),a.filename);
			else uri = updateURLParameter(uri,Curves.curveId(),encodeURIComponent(LZString.compressToEncodedURIComponent(a.trace)));
			//window.history.replaceState({},"aff3ct.github.io",uri);
		//}
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
}

// Click listener for curves list
function addClick(a, code, framesize, input) {//Plot the curve
	if (input==1) {
		subAddClick(a, code, framesize, input);
	}
	else {
		$('#'+Curves.curveId()+getId(a)).on('click', function() {
			subAddClick(a, code, framesize, 0);
			// track the click with Google Analytics
			/**ga('send', {
			hitType:       'event',
			eventCategory: 'BER/FER Comparator',
			eventAction:   'click',
			eventLabel:    decodeURIComponent(a.filename)
		});**/
	});
	}
}

function deleteAll() {
	Curves.names.forEach(x => deleteClick('delete', x));
}

function showCurve(idSide) {
	const plots=["ber","fer"];
	Curves.colors.splice(Curves.colors.indexOf(Curves.referenceColors[Curves.plotOrder.indexOf(Number(idSide))]),1);
	let nb=Curves.plotOrder.indexOf(Number(idSide));
	let ind=0;
	for(let i=0; i<=nb; i++) {
		if (Curves.hidden[i]==1 && (i!=Curves.plotOrder.indexOf(Number(idSide)))) {
			ind++;
		}
	}
	nb=nb-ind;
	Curves.colors.splice(nb,0,Curves.referenceColors[Curves.plotOrder.indexOf(Number(idSide))]);
	plots.forEach(function(x) {
		const CURVESBIS=[];
		for (let l=0; l<Curves.max; l++) {
			if (l==Curves.plotOrder.indexOf(Number(idSide))) {
				Curves.hidden[l]=0;
			}
			if ((Curves.plotOrder[l]!=-1) && (Curves.hidden[l]==0)) {
				CURVESBIS.push(Curves.values[Curves.plotOrder[l]][x]);
			}
		}
		Plotly.newPlot(GD[x],CURVESBIS.slice(0,Curves.length),LAYOUT[x],{displaylogo:false});
	});
	$("#scurve"+String(idSide)).fadeTo("fast", 1);
	$("#show"+String(idSide)).remove();
	var hideTemplate = $('#hideTemplate').html();
	Mustache.parse(hideTemplate);
	var hideRendered=Mustache.render(hideTemplate, {
		sideNumber: String(idSide) 
	});
	$("#delete"+String(idSide)).append(hideRendered);
}

function hideCurve(idSide) {
	const plots=["ber","fer"];
	let a=Curves.colors[Curves.colors.indexOf(Curves.referenceColors[Curves.plotOrder.indexOf(Number(idSide))])];
	Curves.colors.splice(Curves.colors.indexOf(Curves.referenceColors[Curves.plotOrder.indexOf(Number(idSide))]),1);
	Curves.colors.push(a);
	plots.forEach(function(x) {
		const CURVESBIS=[];
		for (let l=0; l<Curves.max; l++) {
			if (l==Curves.plotOrder.indexOf(Number(idSide))) {
				Curves.hidden[l]=1;
			}
			if ((Curves.plotOrder[l]!=-1) && (Curves.hidden[l]==0)) {
				CURVESBIS.push(Curves.values[Curves.plotOrder[l]][x]);
			}
		}
		Plotly.newPlot(GD[x],CURVESBIS.slice(0,Curves.length),LAYOUT[x],{displaylogo:false});
	});
	$("#scurve"+String(idSide)).fadeTo("slow", 0.33);
	$("#hide"+String(idSide)).remove();
	var showTemplate = $('#showTemplate').html();
	Mustache.parse(showTemplate);
	var showRendered=Mustache.render(showTemplate, {
		sideNumber: String(idSide) 
	});
	$("#delete"+String(idSide)).append(showRendered);
}

function deleteClick(divId, idSide) {//unplot a curve
	//delete a selected curve
	const plots=["ber","fer"];
	for (let i=0; i<Curves.max; i++) {
		if (Curves.hidden[i]==1) showCurve(i);
	}
	$('#'+Curves.curveId()+Curves.id[Number(idSide.substring(5,idSide.length))]).prop('disabled', false);
	if (Curves.length !== 0) {
		$('#'+Curves.curveId()+Curves.id[Number(idSide.substring(5,idSide.length))]).empty();
		$('#'+Curves.curveId()+Curves.id[Number(idSide.substring(5,idSide.length))]).append("+");
		Curves.deleteCurve(idSide.substring(5, idSide.length));
		if (Curves.length==0) {
			$("#closeAll").remove();
			document.getElementById("tips").style.display = "inline";
			document.getElementById("plotber").style.display = "none";
			document.getElementById("plotfer").style.display = "none";
		}
		let cval=[];
		var uri  = "/comparator.html?curve0=";
		for (let i=0; i<Curves.max; i++) {
			cval.push(encodeURIComponent(findGetParameter("curve"+String(i))));
			if (i==0) uri+=cval[0];
			else uri=uri+"&curve"+String(i)+"="+cval[i];
		}
		uri = updateURLParameter(uri,idSide,"");
		//window.history.replaceState({},"aff3ct.github.io",uri);
		$("#s"+idSide).remove();
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

function loadUniqueFile(fileInput, i) {//Load a file from input
	if (i<fileInput.files.length) {
		var file = fileInput.files[i];
		if (file.type=="text/plain")
		{
			$("#fileDisplayArea").empty();
			if (Curves.length<Curves.max) {
				var reader = new FileReader();
				reader.readAsText(file);
				reader.onloadend = function(e)
				{
					var filename = encodeURIComponent(file);
					let o=parseFile(filename, reader.result);
					addClick(o, file, o.framesize, 1);
					loadUniqueFile(fileInput, i+1);
				};
			}
			else {
				$("#fileDisplayArea").html('<br><br><span class="alert alert-danger" role="alert">Too many curves displayed</span>');
			}
		}
		else
		{
			$("#fileDisplayArea").html('<br><br><span class="alert alert-danger" role="alert">File not supported!</span>');
			loadUniqueFile(fileInput, i+1);
		}
	}
}

window.onload = function() {
	const plots=["ber","fer"/*,"befe","thr"*/];
	var fileInput = document.getElementById('fileInput');
	fileInput.addEventListener('change', function(e)
	{
		loadUniqueFile(fileInput, 0);
	});
}

function applySelections() {
	displayFiles(filters(Curves.files, -1));
}

function updateSelectedCodes(str) {
	if (document.getElementById(str.title).checked == true) {
		Curves.selectedCodes.push(str.title);
	}
	else {
		Curves.selectedCodes.splice(Curves.selectedCodes.indexOf(str.title), 1);
	}
	if (Curves.selectedCodes.length==0) displayAll();
	else {
		displayFrameSizes();
		displayModems();
		displayChannels();
	}
}

function updateSelectedSizes(str) {
	if (document.getElementById(String(str)).checked == true) {
		Curves.selectedSizes.push(str);
	}
	else {
		Curves.selectedSizes.splice(Curves.selectedSizes.indexOf(str), 1);
	}
	if (Curves.selectedSizes.length==0) displayAll();
	else {
		displayCodeTypes();
		displayModems();
		displayChannels();
	}
}

function updateSelectedModems(str) {
	if (document.getElementById(String(str.title)).checked == true) {
		Curves.selectedModems.push(str.title);
	}
	else {
		Curves.selectedModems.splice(Curves.selectedModems.indexOf(str.title), 1);
	}
	if (Curves.selectedModems.length==0) displayAll();
	else {
		displayCodeTypes();
		displayFrameSizes();
		displayChannels();
	}
}

function updateSelectedChannels(str) {
	if (document.getElementById(String(str.title)).checked == true) {
		Curves.selectedChannels.push(str.title);
	}
	else {
		Curves.selectedChannels.splice(Curves.selectedChannels.indexOf(str.title), 1);
	}
	if (Curves.selectedChannels.length==0) displayAll();
	else {
		displayCodeTypes();
		displayFrameSizes();
		displayModems();
	}
}
window.onresize = function() {
	Plotly.Plots.resize(GD.ber);
	Plotly.Plots.resize(GD.fer);
    // Plotly.Plots.resize(GD.befe);
    // Plotly.Plots.resize(GD.thr);
};

function filterByCodeTypes(files) {//files: Array of files ---> Array of files
	let p={};
	if (Curves.selectedCodes.length!=0 && files.length!=0) {
		Curves.selectedCodes.forEach(function(x) { if (files[x]) {
			files[x].forEach(function(y) {
				if (!p[x]) {
					p[x]=[];
				}
				p[x].push(y);
			})}
			//else Curves.selectedCodes.splice(Curves.selectedCodes.indexOf(x),1);
		});
		return p;
	}
	else return files;
}
//files ==> refs 
function filterByFrameSizes(files) {//files: Array of files ---> Array of files
	let p={};
	if (Curves.selectedSizes.length!=0 && files.length!=0) {
		for(var i in files) {
			files[i].forEach(function(x) {
				Curves.selectedSizes.forEach(function(y) {
					if (x.headers.Codec["Frame size (N)"]==y) {
						if (!p[i]) {
							p[i]=[];
						}
						p[i].push(x);
					}
				});
			});
		}
		return p;
	}
	else return files;
}
function filterByCodeRates(files) {//files: Array of files ---> Array of files
	let p={};
	let stepSlider = document.getElementById('slider-step');
	let coderate=stepSlider.noUiSlider.get();
	if (coderate[0]==0 && coderate[1]==1) return files;
	else {
		for(var i in files) {
			files[i].forEach(function(z) {
				if (coderate[0]<=z.headers.Codec["Code rate"] && z.headers.Codec["Code rate"]<=coderate[1]) {
					if (!p[i]) {
						p[i]=[];
					}
					p[i].push(z);
				}
			});
		}
		return p;
	}
}

function filterByModems(files) {//files: Array of files ---> Array of files
	let p={};
	if (Curves.selectedModems.length!=0) {
		for(var i in files) {
			files[i].forEach(function(x) { Curves.selectedModems.forEach(function(y){
				if (x.headers.Modem.Type==y) {
					if (!p[i]) {
						p[i]=[];
					}
					p[i].push(x);
				}
			})});
		}
		return p;
	}
	else return files;
}

function filterByChannels(files) {//files: Array of files ---> Array of files
	let p={};
	if (Curves.selectedChannels.length!=0) {
		for(var i in files) {
			files[i].forEach(function(x) { Curves.selectedChannels.forEach(function(y){
				if (x.headers.Channel.Type==y) {
					if (!p[i]) {
						p[i]=[];
					}
					p[i].push(x);
				}
			})});
		}
		return p;
	}
	else return files;
}

function filters(files, nb) {//nb is the indicator linked to a specific fiter to avoid
	//0: Code type
	//1: Frame size 
	//2: Modem
	//3: Channel
	if (nb==-1) return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(files)))));
	if (nb==0) return filterByFrameSizes(filterByCodeRates(filterByModems(filterByChannels(files))));
	if (nb==1) return filterByCodeTypes(filterByCodeRates(filterByModems(filterByChannels(files))));
	if (nb==2) return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByChannels(files))));
	if (nb==3) return filterByCodeTypes(filterByFrameSizes(filterByCodeRates(filterByModems(files))));
}

function displayAll() {
	displayCodeTypes();
	displayFrameSizes();
	displayModems();
	displayChannels();
}

function displayCheckbox(length, font, endFont, disabled, fonction, i, div) {
	let checkboxTemplate = $('#checkboxTemplate').html();
	Mustache.parse(checkboxTemplate);
	let checkboxRendered=Mustache.render(checkboxTemplate, {
		element: i,
		disabled: disabled,
		startBlackFont: font,
		endBlackFont: endFont,
		length: length,
		function: fonction
	});
	$(div).append(checkboxRendered);
}

function displayCodeTypes() {
	let files=Curves.files;
	let filteredFiles=filters(Curves.files, 0);
	var j=0;
	$(".codetype").empty();
	for (var i in files)
	{
		if (j!=0) $(".codetype").append('<br>');
		let number=0;
		let black='';
		let disabled='';
		let endBlack='';
		let fonction='updateSelectedCodes(';
		if (filteredFiles[i]) {
			//$(".codetype").append('<input type="checkbox" class="form-check-input" id="'+i+'" title="'+i+'" onclick="updateSelectedCodes('+i+')"><label class="form-check-label" for="'+i+'" title="'+i+'"><font color="black">'+i+' ('+filteredFiles[i].length+')'+'</font></label>');
			black='<font color="black">';
			endBlack='</font>';
			number=filteredFiles[i].length;
			displayCheckbox(number, black, endBlack, disabled, fonction, i, ".codetype");
		}
		else if (Curves.selectedCodes.indexOf(i)>-1) {
			//$(".codetype").append('<input type="checkbox" class="form-check-input" id="'+i+'" title="'+i+'" onclick="updateSelectedCodes('+i+')"><label class="form-check-label" for="'+i+'" title="'+i+'"><font color="black">'+i+' (0)'+'</font></label>');
			black='<font color="black">';
			endBlack='</font>';
			displayCheckbox(number, black, endBlack, disabled, fonction, i, ".codetype");
		}
		else {
			//$(".codetype").append('<input type="checkbox" class="form-check-input" id="'+i+'" title="'+i+'" onclick="updateSelectedCodes('+i+')" disabled><label class="form-check-label" for="'+i+'" title="'+i+'">'+i+' (0)'+'</label>');
			disabled='disabled';
			displayCheckbox(number, black, endBlack, disabled, fonction, i, ".codetype");
		}
		j++;
	}
	$(".codetype").off();
	Curves.selectedCodes.forEach(function(x) {
		if (document.getElementById(x)!=null) {
			if (document.getElementById(x).disabled == false) document.getElementById(x).checked = true;
			else document.getElementById(x).checked = false;
		}
	});
}

function displayFrameSizes() {
	let files=filters(Curves.files, 1);
	var p={};
	var j=0;
	for (var code in files) {
		for (var i=0;i<(files[code]).length;i++) {
			var f=files[code][i];
			if (p[f.headers.Codec["Frame size (N)"]]>=0) p[f.headers.Codec["Frame size (N)"]]++;
			else p[f.headers.Codec["Frame size (N)"]]=1;
		}
	}
	$("#selector .size").empty();
	for (var i in p){
		if (j!=0) $(".size").append('<br>');
		let number=p[i];
		let black='<font color="black">';
		let disabled='';
		let endBlack='</font>';
		let fonction='updateSelectedSizes(';
		j++;
		displayCheckbox(number, black, endBlack, disabled, fonction, i, "#selector .size");
		//$("#selector .size").append('<input type="checkbox" class="form-check-input" id="'+i+'" title="'+i+'" onclick="updateSelectedSizes('+i+')"><label class="form-check-label" for="'+i+'" title="'+i+'"><font color="black">'+i+' ('+p[i]+')'+'</font></label>');
	}
	Curves.selectedSizes.forEach(function(x) {
		if (document.getElementById(x)!=null) {
			if (document.getElementById(x).disabled == false) document.getElementById(x).checked = true;
			else document.getElementById(x).checked = false;
		}
	});
	$("#selector .size").off();
}

function displayModems() {
	let files=filters(Curves.files, 2);
	var p={};
	var j=0;
	for (var code in files) {
		for (var i=0;i<(files[code]).length;i++) {
			var f=files[code][i];
			if (p[f.headers.Modem.Type]>=0) p[f.headers.Modem.Type]++;
			else p[f.headers.Modem.Type]=1;
		}
	}
	$("#selector .modem").empty();
	for (var i in p){
		if (j!=0) $(".modem").append('<br>');
		else j++;
		let number=p[i];
		let black='<font color="black">';
		let disabled='';
		let endBlack='</font>';
		let fonction='updateSelectedModems(';
		//$("#selector .modem").append('<input type="checkbox" class="form-check-input" id="'+i+'" title="'+i+'" onclick="updateSelectedModems('+i+')"><label class="form-check-label" for="'+i+'" title="'+i+'"><font color="black">'+i+' ('+p[i]+')'+'</font></label>');	
		displayCheckbox(number, black, endBlack, disabled, fonction, i, "#selector .modem");
	}
	Curves.selectedModems.forEach(function(x) {
		if (document.getElementById(x)!=null) {
			if (document.getElementById(x).disabled == false) document.getElementById(x).checked = true;
			else document.getElementById(x).checked = false;
		}
	});
	$("#selector .modem").off();
}

function displayChannels() {
	let files=filters(Curves.files, 3);
	var p={};
	var j=0;
	for (var code in files) {
		for (var i=0;i<(files[code]).length;i++) {
			var f=files[code][i];
			if (p[f.headers.Channel.Type]>=0) p[f.headers.Channel.Type]++;
			else p[f.headers.Channel.Type]=1;
		}
	}
	$("#selector .channel").empty();
	for (var i in p){
		if (j!=0) $(".channel").append('<br>');
		else j++;
		let number=p[i];
		let black='<font color="black">';
		let disabled='';
		let endBlack='</font>';
		let fonction='updateSelectedChannels(';
		//$("#selector .channel").append('<input type="checkbox" class="form-check-input" id="'+i+'" title="'+i+'" onclick="updateSelectedChannels('+i+')"><label class="form-check-label" for="'+i+'" title="'+i+'"><font color="black">'+i+' ('+p[i]+')'+'</font></label>');
		displayCheckbox(number, black, endBlack, disabled, fonction, i, "#selector .channel");
	}
	Curves.selectedChannels.forEach(function(x) {
		if (document.getElementById(x)!=null) {
			if (document.getElementById(x).disabled == false) document.getElementById(x).checked = true;
			else document.getElementById(x).checked = false;
		}
	});
	$("#selector .channel").off();
}

// files: array of files.
// ordered: files are first sorted by code type, then by wordsize.
function orderFiles(files) {
	var ordered={};
	for (var i in files){
		var f=files[i];
		if (f.headers.Simulation) {
			if (typeof ordered[f.headers.Simulation["Code type (C)"]]=="undefined") ordered[f.headers.Simulation["Code type (C)"]]=[];
			ordered[f.headers.Simulation["Code type (C)"]].push(f);
		}
	}
	for (var i in ordered)
		ordered[i].sort((a,b)=> b.headers.Codec["Frame size (N)"]<a.headers.Codec["Frame size (N)"]);
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

function drawCurvesFromURI() {
	let ordered=Curves.files;
	Curves.names.forEach(function(idSide) {
		let filename=findGetParameter(idSide);
		if (filename) {
			if (filename.slice(0,4)=="NoWw") {
				filename=LZString.decompressFromEncodedURIComponent(filename);
				let file=filename;
				let o=parseFile("My Curve", file);
				addClick(o, file, o.headers.Codec["Frame size (N)"], 1);
			}
			else {
				let f=selectFile(ordered,filename);
				if (f) {
					$("#codetypeselector").val(f.headers.Simulation["Code type (C)"]);
					$(".selector .codetype").trigger("change");
					$("#sizeselector").val(f.headers.Codec["Frame size (N)"]);
					$(".selector .size").trigger("change");
					$("#"+idSide+getId(f)).click();
				}
				else {
					filename=findGetParameter(idSide.substring(0,idSide.length-1)+String(Number(idSide.substring(idSide.length-1,idSide.length))-1));
					if (filename) {
						f=selectFile(ordered,filename);
						if (f) {
							$("#codetypeselector").val(f.headers.Simulation["Code type (C)"]);
							$(".selector .codetype").trigger("change");
							$("#sizeselector").val(f.headers.Codec["Frame size (N)"]);
							$(".selector .size").trigger("change");
							$("#"+idSide+getId(f)).click();
							$("#delete"+idSide.substring(idSide.length-1,idSide.length)+" .close").click();
						}
					}
				}
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
	loadDatabase();
});