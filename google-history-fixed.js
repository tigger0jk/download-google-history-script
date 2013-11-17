/*
 * Google history downloader 
 * (c) 2012, GeekLad  
 * For more information, visit http://geeklad.com/download-google-history
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * Free software (libraries) used within this program are copyrighted
 * by their respectful copyright owners and are subject to their own 
 * licensing agreemnts.
 */
 
 /* Revision History
  * vtTigger0jk.0: 2013-11-16
  *        Fixin for new domain
 
  * v2.1: February 29, 2012
  * 		Added guid, query_guid, video_length, and img_thumbnail
  * 		Special thanks to naka for providing additional code for 
  * 			adding these items
  *
  * v2.0: February 19, 2012
  * 		Major bugfixes to download the entire history.
  * 		Improved the download cancel process, by adding a cancel 
  * 			button that will allow download of the partial history.
  * 		Improved the handling of history timeout by continuing where
  * 			the download left off, after the user logs into their
  * 			Google Web History in another browser window
  * 		Added a continue button for cancelled downloads
  * v1.0: February 11, 2012
  * 		Initial release.
  */

// Create the extractor object
function GoogleHistoryExtractor() {
	// Define object properties
	this.total_pages;
	this.data = new Array();
	this.keywords = {};
	this.links = {};
	this.images = {};
	this.pubDates = {};
	this.current_page = 1;
	this.month_lookup = {
		Jan: "01",
		Feb: "02",
		Mar: "03",
		Apr: "04",
		May: "05",
		Jun: "06",
		Jul: "07",
		Aug: "08",
		Sep: "09",
		Oct: "10",
		Nov: "11",
		Dec: "12",
	}
};

// Method to fetch a page of history, given the starting point
GoogleHistoryExtractor.prototype.getPage = function(start) {
	// Check to see if we've gotten a cancellation request
	if(this.cancellation) {
		this.cancellation = false;
		return;
	}
	
	// Create the http request object
	if (window.XMLHttpRequest) {
		xmlhttp=new XMLHttpRequest();
	}
	else
	{
		xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	
	// Create the callback function
	var downloaderObject = this;
	xmlhttp.onreadystatechange=function() {
		if (xmlhttp.readyState==4 && xmlhttp.status==200) {
			// When we got a valid page, parse it
			downloaderObject.parsePage(xmlhttp.responseText);
		}
		else if (xmlhttp.readyState==4 && xmlhttp.status==0) {
			current_download_message = document.getElementById("extractor_overlay_solid").innerHTML;
			document.getElementById("extractor_overlay_solid").innerHTML ='<div style="position: relative; border:3px solid gray; padding:15px; color: black; width: 400px; background-color: white; margin: auto;"><a href="javascript:void(0);" onclick=\'document.body.removeChild(document.getElementById("extractor_overlay"));document.body.removeChild(document.getElementById("extractor_overlay_solid"));downloader.cancelDownload();return false;\' style="position: absolute; right: 10px; top: 10px;">[x]</a><h1>History Connection Timed Out</h1><div id="extractor_status" style="width: 100%; text-align: left">It appears your connection to your history has timed out.<br><br>To keep downloading your history:<ul style="list-style-type:square; margin-left: 15px;"><li>Click <a href="https://www.google.com/history/" target="_blank">here</a> to log into your Google Account in another window<li>Close the other history window<li>Click the <a href="javascript:void(0);" onclick="document.getElementById(\'extractor_overlay_solid\').innerHTML = current_download_message; downloader.getPage(downloader.getLastDate(true)); return false;">here</a> to continue</li></div>';
		}
	}
	
	// Send the request
	// If it's a string, we're loading the first page
	if(typeof start == "string") {
		var current_date = Date().match(/([^\s]{3,}) (\d{2,}) (\d{4,})/);
		current_date.shift();
		this.current_date = {
			month: this.month_lookup[current_date[1]], 
			day: current_date[0], 
			year: current_date[2],
			month_name: current_date[1]
		};
		xmlhttp.open("GET","https://www.google.com/history/lookup?q=&output=rss&num=1000&start="+start,true);
	}
	// Otherwise we have an object specifying the year, month, and day
	else {
		this.current_date = start;
		xmlhttp.open("GET","https://www.google.com/history/lookup?q=&output=rss&num=1000&yr="+start.year+"&month="+start.month+"&day="+start.day,true);
	}
	xmlhttp.send();
}

// Method to parse an XML result page
GoogleHistoryExtractor.prototype.parsePage = function(new_page) {		
	// Build an array with the items
	items = new_page.match(/<item>(?:(?!<\/item>)[\s\S])+<\/item>/g);
	
	// If we get back no items, we've reached the end of the web history and we're done
	if(items == null) {
		done = true;
	}
	// Otherwise, go ahead and parse the page
	else {
		done = false;
		// Parse each item, and output the results
		for(x=0; x<items.length; x++) {
			// Get the fields
			fields = items[x].match(/<[^\/>]+>([^<]*)<\/[^>]+>/g);
			
			// Remove the XML tags
			headers = new Array();
			for(y=0; y<fields.length; y++) {
				// Save the header fields for assigning the object properties
				headers[y] = fields[y].replace(/<([^\/>\s]+)[^>]*>[^<]*<\/[^>]+>/, "$1").replace(/smh\:/, "");
				
				// Get the field content
				fields[y] = fields[y].replace(/<[^\/>]+>([^<]*)<\/[^>]+>/, "$1");
				
				// For each field, replace html entities
				for(z=0; z < fields.length; z++) {
					fields[z] = fields[z].replace(/&amp;/, "&");
					fields[z] = fields[z].replace(/&quot;/, '"');
					fields[z] = fields[z].replace(/&gt;/, ">");
					fields[z] = fields[z].replace(/&lt;/, "<");
				}
			}
			
			if(fields[3].match(/query/) != null) {
				keywords = fields[0].removeStopWords();
			}
			else {
				keywords = null;
			}
			
			// Save the fields in the data if we have not already saved it
			if(!this.alreadySaved(fields)) {
				this.data[this.data.length] = {
					title: headers.indexOf("title") > -1 ? fields[headers.indexOf("title")] : "",
					link: headers.indexOf("link") > -1 ? fields[headers.indexOf("link")] : "",
					pubDate: headers.indexOf("pubDate") > -1 ? fields[headers.indexOf("pubDate")] : "",
					category: headers.indexOf("category") > -1 ? fields[headers.indexOf("category")] : "",
					description: headers.indexOf("description") > -1 ? fields[headers.indexOf("description")] : "",
					guid: headers.indexOf("guid") > -1 ? fields[headers.indexOf("guid")] : "",
					query_guid: headers.indexOf("query_guid") > -1 ? fields[headers.indexOf("query_guid")] : "",
					video_length: headers.indexOf("video_length") > -1 ? fields[headers.indexOf("video_length")] : "",
					img_thumbnail: headers.indexOf("img_thumbnail") > -1 ? fields[headers.indexOf("img_thumbnail")] : "",
					keywords: keywords
				};
				
				// Save the stats
				if(fields[1] != "")
					this.links[fields[1]] = (this.links[fields[1]] == undefined) ? 1 : parseInt(this.links[fields[1]])+1;
				if(keywords != "")
					if(keywords != null) {
						this.keywords[keywords] = (this.keywords[keywords] == undefined) ? 1 : parseInt(this.keywords[keywords])+1;
					}				
				if(keywords != "")
					if(fields[3] == "images query") {
						this.images[keywords] = (this.images[keywords] == undefined) ? 1 : parseInt(this.images[keywords])+1;
					}
				last_date = this.getLastDate(true);
				// Update the status if we didn't receive a cancellation request
				if(!this.cancellation)
					document.getElementById("extractor_status").innerHTML = "Fetched "+this.data.length+" items.<br>Oldest date loaded: "+last_date.month_name+" "+last_date.day.replace(/^0/, "")+", "+last_date.year;
			}
		}
	}
	
	// If we're done, run the callback
	if(done == true) {
		this.download_incomplete = false;
		this.csvExport("extractor_status");
		return;
	}
	else {	
		// Otherwise Fetch the next page
		this.current_page++
		this.getPage(this.getLastDate());
	}
}

// Method to get the date for the last item selected
GoogleHistoryExtractor.prototype.getLastDate = function(do_not_increment) {
	// If we have no data yet, just return a string with 1 so we start from the beginning
	if(this.data.length == 0)
		return "1";
		
	// Parse the date parameters
	var last_date = this.data[this.data.length-1].pubDate.match(/(\d{2,}) ([^\s]{3,}) (\d{4,})/);
	last_date.shift();
	
	// Check to see if the last date is the same as the curent
	if(
			!do_not_increment
		&& this.current_date.month == this.month_lookup[last_date[1]]
		&& this.current_date.day == last_date[0]
		&& this.current_date.year == last_date[2]
	) {
		// If it is, we need to decrement it by a day, otherwise we will
		// end up in an infinite loop
		// Convert the date into a date object
		var new_date = new Date(last_date[2], parseInt(this.month_lookup[last_date[1]])-1, last_date[0]);
		
		// The subtract one day from it
		new_date = new Date(new_date.getTime() - 1000*60*60*24);
		new_date = new_date.toString().match(/([^\s]{3,}) (\d{2,}) (\d{4,})/);
		new_date.shift();
		
		// Return the corrected date
		return {
			month: this.month_lookup[new_date[0]], 
			day: new_date[1], 
			year: new_date[2],
			month_name: new_date[0]
		};
	}
	return {
		month: this.month_lookup[last_date[1]], 
		day: last_date[0], 
		year: last_date[2],
		month_name: last_date[1]
	};
}

GoogleHistoryExtractor.prototype.cancelDownload = function() {
	this.cancellation = true;
	this.download_incomplete = true;
	if(document.getElementById("extractor_overlay_solid") != null) {
		this.csvExport("extractor_status");
	}
}

// Method to see if an item has already been saved
GoogleHistoryExtractor.prototype.alreadySaved = function(fields) {
	// Check to see if the pubDate exists
	if(typeof this.pubDates[fields[2]] == "undefined") {
		// If it doesn't exist, then make sure it does from now on
		this.pubDates[fields[2]] = true;
		return false;
	}
	return true;
}

// Method to generate stats as well as convert the data array into a csv file, and create the download button
GoogleHistoryExtractor.prototype.csvExport = function(target_id) {
	// Save the current download message if we're not done yet
	if(this.download_incomplete) {
		current_download_message = document.getElementById("extractor_overlay_solid").innerHTML;
	}
			
	// Let's get some interesting statistics
	top_keywords = this.keywords.sort(1);
	top_keywords.length = 10;
	top_links = this.links.sort(1);
	top_links.length = 10;
	top_images = this.images.sort(1);
	top_images.length = 10;
	
	new_content = '<div style="position: relative; border:3px solid gray; padding:15px; color: black; width: 900px; background-color: white; margin: auto;"><h1>Some Interesting Stats on Your Search</h1>'
	new_content += '<div style="margin: auto; text-align: left"><a href="javascript:void(0);" onclick=\'document.body.removeChild(document.getElementById("extractor_overlay"));document.body.removeChild(document.getElementById("extractor_overlay_solid"));downloader.cancelDownload();return false;\' style="position: absolute; right: 10px; top: 10px;">[x]</a><h2>Your Top 10 Searches</h2><br><ul>';
	for(x=0; x < top_keywords.length; x++) {
		new_content += '<li>Searched '+top_keywords[x][1]+' times: '+top_keywords[x][0].htmlEntities();
	}
	new_content += '</ul><br><h2>Your Top 10 Image Searches</h2><ul>';
	for(x=0; x < top_images.length; x++) {
		new_content += '<li>Searched '+top_images[x][1]+' times: '+top_images[x][0].htmlEntities();
	}
	new_content += '</ul><br><h2>Your Top 10 Visited Links</h2><ul>';
	for(x=0; x < top_links.length; x++) {
		new_content += '<li>Visited '+top_links[x][1]+' times: <a href="'+top_links[x][0]+'">'+top_links[x][0].htmlEntities()+'</a>';
	}

	new_content += '</div>';
	// Add a continue button if we're not really done
	if(this.download_incomplete) {
		new_content += '<br><div style="width: 100%; text-align: center; margin: 30px;"><a href="javascript:void(0);" onclick="document.getElementById(\'extractor_overlay_solid\').innerHTML = current_download_message; downloader.getPage(downloader.getLastDate(true)); return false;" class="kd-button" style="color: green;">Click Here to Continue Download</a></div>';
	}
	new_content += '<div id="extractor_status" style="width: 100%; text-align: center; margin: 30px;"></div></div>'
	document.getElementById("extractor_overlay_solid").width = "900px";
	document.getElementById("extractor_overlay_solid").innerHTML = new_content;
	
	output = "title,keywords,link,category,pubDate,description,guid,query_guid,video_length,img_thumbnail\n";
	for(x=0; x < this.data.length; x++) {
		datum = this.data[x];
		output += '"'+datum.title.replace(/"/g, '""')+'",';
		output += (datum.keywords != null) ? '"'+datum.keywords.replace(/"/g, '""')+'",' : ",";
		output += '"'+datum.link.replace(/"/g, '""')+'",';
		output += '"'+datum.category.replace(/"/g, '""')+'",';
		output += '"'+datum.pubDate.replace(/"/g, '""')+'",';
		output += '"'+datum.description.replace(/"/g, '""')+'",';
		output += '"'+datum.guid.replace(/"/g, '""')+'",';
		output += '"'+datum.query_guid.replace(/"/g, '""')+'",';
		output += '"'+datum.video_length.replace(/"/g, '""')+'",';
		output += '"'+datum.img_thumbnail.replace(/"/g, '""')+'"\n';
	}
	
	// Create the download button
	Downloadify.create(target_id,{
		filename: function(){
			return "GoogleHistory.csv";
		},
		data: function(){ 
			return output;
		},
		onComplete: function(){
			document.body.removeChild(document.getElementById("extractor_overlay"));
			document.body.removeChild(document.getElementById("extractor_overlay_solid"));
		},
		onCancel: function(){ 
			document.body.removeChild(document.getElementById("extractor_overlay"));
			document.body.removeChild(document.getElementById("extractor_overlay_solid"));
		},
		transparent: false,
		swf: 'http://geeklad.com/tools/google-history/downloadify.swf',
		downloadImage: 'http://geeklad.com/tools/google-history/download-to-csv.png',
		width: 111,
		height: 29,
		transparent: true,
		append: false
	});
}

// A function for remotely loading a script, blocking until it is loaded, and finally running a callback function
// Got this nifty bit of code from: http://www.schillmania.com/content/entries/2009/defer-script-loading/
function loadScript(sURL,fOnLoad) {
  var rs;
  var oS;

  function scriptOnload() {
    this.onreadystatechange = null;
    this.onload = null;
    window.setTimeout(fOnLoad,20);
  };
  var loadScriptHandler = function() {
    var rs = this.readyState;
    if (rs == 'loaded' || rs == 'complete') {
      scriptOnload();
    }
  };
  var oS = document.createElement('script');
  oS.type = 'text/javascript';
  if (fOnLoad) {
    // hook into both possible events
    oS.onreadystatechange = loadScriptHandler;
    oS.onload = scriptOnload;
  };
  oS.src = sURL;
  document.getElementsByTagName('head')[0].appendChild(oS);
};

// A String method I created to remove stop words
// Stop words obtained from http://www.lextek.com/manuals/onix/stopwords1.html
String.prototype.removeStopWords = function() {
	var x;
	var y;
	var word;
	var stop_word;
	var regex_str;
	var regex;
	var cleansed_string = this.valueOf();
	var stop_words = new Array(
			'a',
			'about',
			'above',
			'across',
			'after',
			'again',
			'against',
			'all',
			'almost',
			'alone',
			'along',
			'already',
			'also',
			'although',
			'always',
			'among',
			'an',
			'and',
			'another',
			'any',
			'anybody',
			'anyone',
			'anything',
			'anywhere',
			'are',
			'area',
			'areas',
			'around',
			'as',
			'ask',
			'asked',
			'asking',
			'asks',
			'at',
			'away',
			'b',
			'back',
			'backed',
			'backing',
			'backs',
			'be',
			'became',
			'because',
			'become',
			'becomes',
			'been',
			'before',
			'began',
			'behind',
			'being',
			'beings',
			'best',
			'better',
			'between',
			'big',
			'both',
			'but',
			'by',
			'c',
			'came',
			'can',
			'cannot',
			'case',
			'cases',
			'certain',
			'certainly',
			'clear',
			'clearly',
			'come',
			'could',
			'd',
			'did',
			'differ',
			'different',
			'differently',
			'do',
			'does',
			'done',
			'down',
			'down',
			'downed',
			'downing',
			'downs',
			'during',
			'e',
			'each',
			'early',
			'either',
			'end',
			'ended',
			'ending',
			'ends',
			'enough',
			'even',
			'evenly',
			'ever',
			'every',
			'everybody',
			'everyone',
			'everything',
			'everywhere',
			'f',
			'face',
			'faces',
			'fact',
			'facts',
			'far',
			'felt',
			'few',
			'find',
			'finds',
			'first',
			'for',
			'four',
			'from',
			'full',
			'fully',
			'further',
			'furthered',
			'furthering',
			'furthers',
			'g',
			'gave',
			'general',
			'generally',
			'get',
			'gets',
			'give',
			'given',
			'gives',
			'go',
			'going',
			'good',
			'goods',
			'got',
			'great',
			'greater',
			'greatest',
			'group',
			'grouped',
			'grouping',
			'groups',
			'h',
			'had',
			'has',
			'have',
			'having',
			'he',
			'her',
			'here',
			'herself',
			'high',
			'high',
			'high',
			'higher',
			'highest',
			'him',
			'himself',
			'his',
			'how',
			'however',
			'i',
			'if',
			'important',
			'in',
			'interest',
			'interested',
			'interesting',
			'interests',
			'into',
			'is',
			'it',
			'its',
			'itself',
			'j',
			'just',
			'k',
			'keep',
			'keeps',
			'kind',
			'knew',
			'know',
			'known',
			'knows',
			'l',
			'large',
			'largely',
			'last',
			'later',
			'latest',
			'least',
			'less',
			'let',
			'lets',
			'like',
			'likely',
			'long',
			'longer',
			'longest',
			'm',
			'made',
			'make',
			'making',
			'man',
			'many',
			'may',
			'me',
			'member',
			'members',
			'men',
			'might',
			'more',
			'most',
			'mostly',
			'mr',
			'mrs',
			'much',
			'must',
			'my',
			'myself',
			'n',
			'necessary',
			'need',
			'needed',
			'needing',
			'needs',
			'never',
			'new',
			'new',
			'newer',
			'newest',
			'next',
			'no',
			'nobody',
			'non',
			'noone',
			'not',
			'nothing',
			'now',
			'nowhere',
			'number',
			'numbers',
			'o',
			'of',
			'off',
			'often',
			'old',
			'older',
			'oldest',
			'on',
			'once',
			'one',
			'only',
			'open',
			'opened',
			'opening',
			'opens',
			'or',
			'order',
			'ordered',
			'ordering',
			'orders',
			'other',
			'others',
			'our',
			'out',
			'over',
			'p',
			'part',
			'parted',
			'parting',
			'parts',
			'per',
			'perhaps',
			'place',
			'places',
			'point',
			'pointed',
			'pointing',
			'points',
			'possible',
			'present',
			'presented',
			'presenting',
			'presents',
			'problem',
			'problems',
			'put',
			'puts',
			'q',
			'quite',
			'r',
			'rather',
			'really',
			'right',
			'right',
			'room',
			'rooms',
			's',
			'said',
			'same',
			'saw',
			'say',
			'says',
			'second',
			'seconds',
			'see',
			'seem',
			'seemed',
			'seeming',
			'seems',
			'sees',
			'several',
			'shall',
			'she',
			'should',
			'show',
			'showed',
			'showing',
			'shows',
			'side',
			'sides',
			'since',
			'small',
			'smaller',
			'smallest',
			'so',
			'some',
			'somebody',
			'someone',
			'something',
			'somewhere',
			'state',
			'states',
			'still',
			'still',
			'such',
			'sure',
			't',
			'take',
			'taken',
			'than',
			'that',
			'the',
			'their',
			'them',
			'then',
			'there',
			'therefore',
			'these',
			'they',
			'thing',
			'things',
			'think',
			'thinks',
			'this',
			'those',
			'though',
			'thought',
			'thoughts',
			'three',
			'through',
			'thus',
			'to',
			'today',
			'together',
			'too',
			'took',
			'toward',
			'turn',
			'turned',
			'turning',
			'turns',
			'two',
			'u',
			'under',
			'until',
			'up',
			'upon',
			'us',
			'use',
			'used',
			'uses',
			'v',
			'very',
			'w',
			'want',
			'wanted',
			'wanting',
			'wants',
			'was',
			'way',
			'ways',
			'we',
			'well',
			'wells',
			'went',
			'were',
			'what',
			'when',
			'where',
			'whether',
			'which',
			'while',
			'who',
			'whole',
			'whose',
			'why',
			'will',
			'with',
			'within',
			'without',
			'work',
			'worked',
			'working',
			'works',
			'would',
			'x',
			'y',
			'year',
			'years',
			'yet',
			'you',
			'young',
			'younger',
			'youngest',
			'your',
			'yours',
			'z'
		)
		
	// Split out all the individual words in the phrase
	words = cleansed_string.match(/[^\s]+|\s+[^\s+]$/g)
	
	// If we got nothing, we have a string with nothing but whitespace.
	// Just go ahead and return it as-is
	if(words == null) {
		return cleansed_string;
	}

	// Review all the words
	for(x=0; x < words.length; x++) {
		// For each word, check all the stop words
		for(y=0; y < stop_words.length; y++) {
			// Get the current word
			word = words[x].replace(/\s+|[^a-z]+/ig, "");	// Trim the word and remove non-alpha
			
			// Get the stop word
			stop_word = stop_words[y];
			
			// If the word matches the stop word, remove it from the keywords
			if(word.toLowerCase() == stop_word) {
				// Build the regex
				regex_str = "^\\s*"+stop_word+"\\s*$";		// Only word
				regex_str += "|^\\s*"+stop_word+"\\s+";		// First word
				regex_str += "|\\s+"+stop_word+"\\s*$";		// Last word
				regex_str += "|\\s+"+stop_word+"\\s+";		// Word somewhere in the middle
				regex = new RegExp(regex_str, "ig");
			
				// Remove the word from the keywords
				cleansed_string = cleansed_string.replace(regex, " ");
			}
		}
	}
	return cleansed_string.replace(/^\s+|\s+$/g, "");
}

String.prototype.htmlEntities = function() {
	return this.valueOf().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Method for obtaining the index of an object/string in an array
// Got this from http://stackoverflow.com/questions/143847/best-way-to-find-an-item-in-a-javascript-array
if (!Array.prototype.indexOf)
  {

       Array.prototype.indexOf = function(searchElement /*, fromIndex */)

    {


    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0)
      return -1;

    var n = 0;
    if (arguments.length > 0)
    {
      n = Number(arguments[1]);
      if (n !== n)
        n = 0;
      else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }

    if (n >= len)
      return -1;

    var k = n >= 0
          ? n
          : Math.max(len - Math.abs(n), 0);

    for (; k < len; k++)
    {
      if (k in t && t[k] === searchElement)
        return k;
    }
    return -1;
  };

}

// A generic object method that takes the object and sorts any properties that have a number value
// The output is an array of arrays that are property/value pairs
Object.prototype.sort = function(desc) {
	var output = new Array();
	var x = 0;
	for(var index in this) {
		if(typeof index == "string" && index.match(/[a-z]+/) != null && typeof this[index] == "number") {
			output[x] = [index, this[index]];
			x++;
		}
	}
	return output.sort(function(a, b) {
		if(desc != null)
			return b[1] - a[1];
		else
			return a[1] - b[1];
	});
}

// Let's make sure we're in the right place first
if (document.location.href.match(/https:\/\/(www\.)?google\.com\/history/) != null) {
	// First load SWFObject, necessary for Downloadify
	/* SWFObject v2.1 <http://code.google.com/p/swfobject/>
		Copyright (c) 2007-2008 Geoff Stearns, Michael Williams, and Bobby van der Sluis
		This software is released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
	*/
	loadScript("http://swfobject.googlecode.com/svn/tags/swfobject_2_2/swfobject.js", function(){
		
		// Next load Downloadify, which allows us to convert our downloaded data into a downloadable CSV, all in the client
		/* Downloadify 0.1 (c) 2009 by Douglas Neiner. Licensed under the MIT license */
		/* See http://github.com/dcneiner/Downloadify for license and more info */
		loadScript("http://geeklad.com/tools/google-history/downloadify.js", function(){		
			// Now that all of the remote JavaScript is loaded, we're ready to perform the download

			// Create the overlay
			document.body.innerHTML+='<div id="extractor_overlay" style="position: fixed; left: 0px; top: 0px; padding: 0px; margin: 0px; border: 0px; width:100%; height:100%; text-align:center; z-index: 1000; background-color: black; opacity: 0.8"></div><div id="extractor_overlay_solid" style="position: absolute; width:100%; top: 100px; left: 0px; width: 100%; background-color: none; text-align:center; opacity: 1; z-index: 1001;"><div style="position: relative; border:3px solid gray; padding:15px; color: black; width: 400px; background-color: white; margin: auto;"><a href="javascript:void(0);" onclick=\'document.body.removeChild(document.getElementById("extractor_overlay"));document.body.removeChild(document.getElementById("extractor_overlay_solid"));downloader.cancelDownload();return false;\' style="position: absolute; right: 10px; top: 10px;">[x]</a><h1>Downloading Google History</h1><br><div style="text-align: left;">This could take a while if you have a long history.  History will be downloaded from the most recent dates to the oldest.  At the bottom of this window, you will see the oldest date that has been downloaded.  Google Web History was first available in early 2005, so your oldest record may go back that far.</div><br><br><a href="javascript:void(0);" onclick="downloader.cancelDownload(); return false;" class="kd-button" style="color: red;">Click Here to Cancel</a><br><br><div id="extractor_status" style="width: 100%; text-align: center">Standby...</div></div></div>';

			// Start the download
			downloader = new GoogleHistoryExtractor();
			downloader.getPage("1");
		});
	});
}
else {
	// Create the overlay with the instructional message
	document.body.innerHTML+='<div id="extractor_overlay" style="position: fixed; left: 0px; top: 0px; padding: 0px; margin: 0px; border: 0px; width:100%; height:100%; text-align:center; z-index: 1000; background-color: black; opacity: 0.8"></div><div id="extractor_overlay_solid" style="position: absolute; width:100%; top: 100px; left: 0px; width: 100%; background-color: none; text-align:center; opacity: 1; z-index: 1001;"><div style="position: relative; border:3px solid gray; padding:15px; color: black; width: 400px; background-color: white; margin: auto;"><a href="javascript:void(0);" onclick=\'document.body.removeChild(document.getElementById("extractor_overlay"));document.body.removeChild(document.getElementById("extractor_overlay_solid"));downloader.cancelDownload();return false;\' style="position: absolute; right: 10px; top: 10px;">[x]</a><h1>Instructions</h1><div id="extractor_status" style="width: 100%; text-align: left">Please visit <a href="https://www.google.com/history/">https://www.google.com/history/</a> and log into your Google Account.  Then click the bookmarklet again.</div></div></div>';	
}
// Add an event handler, to capture the ESC key
if (document.layers) { document.captureEvents(Event.KEYPRESS); }
document.onkeyup = function(e) {
	if(!e)
		e = window.event;
	if(typeof e.keyCode == 'number') {
		//DOM
		e = e.keyCode;
	} else if(typeof e.which == 'number') {
		//NS 4 compatible, including many older browsers
		e = e.which;
	} else if(typeof e.charCode  == 'number') {
		//also NS 6+, Mozilla 0.9+
		e = e.charCode;		
	}
	else return;
	
	if(e == 27) {
		document.body.removeChild(document.getElementById("extractor_overlay"));
		document.body.removeChild(document.getElementById("extractor_overlay_solid"));
		downloader.cancelDownload();
	}
};
