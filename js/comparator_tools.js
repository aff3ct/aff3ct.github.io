function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds){
			break;
		}
	}
}

function roughSizeOfObject( object ) {
	var objectList = [];
	var stack = [ object ];
	var bytes = 0;

	while ( stack.length ) {
		var value = stack.pop();

		if ( typeof value === 'boolean' ) {
			bytes += 4;
		}
		else if ( typeof value === 'string' ) {
			bytes += value.length * 2;
		}
		else if ( typeof value === 'number' ) {
			bytes += 8;
		}
		else if
			(
				typeof value === 'object'
				&& objectList.indexOf( value ) === -1
				)
		{
			objectList.push( value );

			for( var i in value ) {
				stack.push( value[ i ] );
			}
		}
	}
	return bytes;
}

function updateURLParameter(url, param, paramVal)
{
	let theAnchor = null;
	let newAdditionalURL = "";
	let tempArray = url.split("?");
	let baseURL = tempArray[0];
	let additionalURL = tempArray[1];
	let temp = "";

	if (additionalURL)
	{
		let tmpAnchor = additionalURL.split("#");
		let theParams = tmpAnchor[0];
		theAnchor = tmpAnchor[1];
		if(theAnchor)
			additionalURL = theParams;

		tempArray = additionalURL.split("&");

		for (let i=0; i<tempArray.length; i++)
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
		let tmpAnchor = baseURL.split("#");
		let theParams = tmpAnchor[0];
		theAnchor = tmpAnchor[1];

		if(theParams)
			baseURL = theParams;
	}

	if(theAnchor)
		paramVal += "#" + theAnchor;
	if (paramVal=="") paramVal="null";
	let rows_txt = temp + "" + param + "=" + paramVal;
	return baseURL + "?" + newAdditionalURL + rows_txt;
}

function findGetParameter(parameterName) {
	let result = null,
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

function deepFind(obj, path) {
	for (var i=0, path=path.split('.'), len=path.length; i<len; i++){
		if (obj[path[i]])
			obj = obj[path[i]];
		else
			return null;
	}
	return obj;
}