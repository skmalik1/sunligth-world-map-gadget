// (C) 2011 g/christensen (gchristnsn@gmail.com)

var L_MINUTE_TEXT = "min.";
var L_SIMPLE_TEXT = "Simple";
var L_REALISTIC_TEXT = "Realistic";
var L_SELECT_MAP_TEXT = "Select map:";
var L_UPDATE_EVERY_TEXT = "Update every:";
var L_SHOW_LOCATIONS = "Show location of the Sun and Moon";

var mapImageArray = new Array(
	[L_SIMPLE_TEXT, "simple.png"],
	[L_REALISTIC_TEXT, "realistic.png"]);

var updateEveryArray = new Array(
	["60" + L_MINUTE_TEXT, "60"],
	["30 " + L_MINUTE_TEXT, "30"],
	["15 " + L_MINUTE_TEXT, "15"],
	["5 " + L_MINUTE_TEXT, "50"]);

var ephemerisImgCenter = 7;

// Map dimensions
var mapWidth = 360;
var mapHeight = 180;

// Offset from 180 deg. of the most left longitude of the map grid
// in degrees
var edgeOffset = 9.5;

var shadowImage = "shadow.png";
var moonImage = "moon.png";
var sunImage = "sun.png";

var isDocked = false;
var isVisible;
var timer;

function getImagePath(image, docked)
{
	if (docked == null)
		return "images/" + image;
	else if (docked)
		return "images/docked/" + image;
	else
		return "images/undocked/" + image;
}

function adjustParameters()
{
	// How many degrees in one pixel?
	pixelDegW = 360 / mapWidth;
	pixelDegH = 180 / mapHeight;

	// Map grid origin
	originDegW = (mapWidth / 2) * pixelDegW - edgeOffset;
	originDegH = (mapHeight / 2) * pixelDegH;

	with(document.body.style)
		width = mapWidth + 2, 
		height = mapHeight + 2;

	with(sunlightMapBg.style)
		width = mapWidth + 2, 
		height = mapHeight + 2;

	with(shadow.style)
		width = mapWidth + "px",
		height = mapHeight + "px",
		clip = "rect(0px " + mapWidth + "px " + mapHeight + " 0px)";

	sunlightMapBg.src = getImagePath(theSettings.mapImage, 
			System.Gadget.docked);
}

// Pixel coordinates
function pixelX(deg)
{
	var offset = (deg < originDegW)
		? (originDegW - deg)
		: (360 - deg + originDegW);

	return Math.round(offset / pixelDegW); // in 360 deg. space
}

function pixelY(deg)
{
	return Math.round((originDegH - deg) / pixelDegH);
}

// Latitude and longitude of a pixel
function pixelLambda(x)
{
	var deg = x * pixelDegW;
	return (deg < originDegW)
		? (originDegW - deg)
		: (360 - deg + originDegW); // in 360 deg. space
}

function pixelPhi(y, lambda)
{
	return originDegH - y * pixelDegH;
}

function shadowLine(x1, y1, y2)
{
	var line = document.createElement("img");
	line.src = getImagePath(shadowImage, System.Gadget.docked);
	line.style.position = "absolute";
	line.style.left = x1 + "px";
	line.style.clip = "rect(" + y1 + "px 1px " + y2 + "px 0)";
	shadow.appendChild(line); 
}

function placeImage(path, x, y)
{
	var image = document.createElement("img");
	image.src = getImagePath(path);
	image.style.position = "absolute";
	image.style.left = x + "px";
	image.style.top = y + "px";
	shadow.appendChild(image);
}

function drawEphemeris(image, x, y)
{                
	if (x < 0)
	{
		placeImage(image, x, y);
		placeImage(image, mapWidth + x, y);
	}
	else if (x > mapWidth - ephemerisImgCenter * 2 - 1)
	{
		placeImage(image, x, y);
		placeImage(image, x - mapWidth, y);
	}
	else
		placeImage(image, x, y);
}
          
function drawSunlightMap()
{
	performCalculations(new Date());
	shadow.innerHTML = "";

	var northSun = DECsun >= 0;
	var startFrom = northSun? 0: (mapHeight - 1);
	var pstop = function (y) { return northSun? (y < mapHeight): (y >= 0); };
	var inc = northSun? 1: -1;

	for (var x = 0; x < mapWidth; ++x)
		for (var y = startFrom; pstop(y); y += inc)
		{			
			var lambda = pixelLambda(x);
			var phi = pixelPhi(y) + 0.5 * (northSun? -1: 1);

			var centralAngle = sind(phi) * sind(DECsun) 
							 + cosd(phi) * cosd(DECsun) * cosd(GHAsun - lambda);
			centralAngle = Math.acos(centralAngle);
			 
			if (centralAngle > Math.PI / 2)
			{                                              
				var clipTop = northSun? y: 0;
				var clipBottom = northSun? mapHeight: (y + 1);
                                                             
				// cut off semitransparent pixels on the map edges
				if (x == 0 || x == mapWidth - 1)
				{                         
					if (northSun || DECsun == 0)
						clipBottom -= 1;
					else if (!northSun || DECsun == 0)
						clipTop += 1;
				}
				
				shadowLine(x, clipTop, clipBottom);
				break;
			}    
		}                          
	
	if (theSettings.showLocations == "checked")
	{
		var sunX = pixelX(GHAsun) - ephemerisImgCenter;
		var sunY = pixelY(DECsun) - ephemerisImgCenter; 
		var moonX = pixelX(GHAmoon) - ephemerisImgCenter;
		var moonY = pixelY(DECmoon) - ephemerisImgCenter;
	
		drawEphemeris(moonImage, moonX, moonY);
		drawEphemeris(sunImage, sunX, sunY);
	}
}

function loadMain(afterSettings)
{
	System.Gadget.settingsUI = "settings.html";
   	System.Gadget.visibilityChanged = checkVisibility;
	System.Gadget.onSettingsClosed = settingsClosed;
	System.Gadget.onUndock = checkState;
	System.Gadget.onDock = checkState;

    theSettings = new GetSunlightMapSettings();      
     
	checkState(afterSettings? "redraw": "noredraw");
	
	startTimer(parseInt(theSettings.updateEvery), "drawSunlightMap()");                             
}

function checkVisibility()
{
	isVisible = System.Gadget.visible;
}

function startTimer(interval, timeFunction) 
{
	clearInterval(timer);
	timer = setInterval(timeFunction, interval * 1000);
}

                                                     
function checkState(redraw)
{                           
	if(!System.Gadget.docked) 
	{
		undockedState();

	} 
	else if (System.Gadget.docked)
	{
		dockedState(); 
	}

	if (redraw != "noredraw")
		drawSunlightMap();
}

function undockedState()
{
	mapWidth = 360;
	mapHeight = 180;   

	adjustParameters(); 
}

function dockedState()
{
	mapWidth = 128;
	mapHeight = 64;   

	adjustParameters(); 
}

function loadSettings()
{ 
	theSettings = new GetSunlightMapSettings();	
	
	for(var i = 0; i < mapImageArray.length; i++)
	{
		mapImage.options[i] = new Option(mapImageArray[i][0], mapImageArray[i][1]);
		mapImage.options[i].title = mapImageArray[i][0];
	}
	mapImage.value = theSettings.mapImage;

	for(var i = 0; i < updateEveryArray.length; i++)
	{
		updateEvery.options[i] = new Option(updateEveryArray[i][0], updateEveryArray[i][1]);
		updateEvery.options[i].title = updateEveryArray[i][0];
	}
	updateEvery.value = theSettings.updateEvery;

	showLocations.checked = theSettings.showLocations == "checked";

	System.Gadget.onSettingsClosing = SettingsClosing;
}

function SettingsClosing(event)
{
	if (event.closeAction == event.Action.commit)
	{
		System.Gadget.Settings.write("GadgetViewed","yes");
		SaveSettings();
	}
	else if(event.closeAction == event.Action.cancel)
	{
	}
	event.cancel = false;
}

function settingsClosed()
{
	drawSunlightMap();
	startTimer(parseInt(theSettings.updateEvery), "drawSunlightMap()");	
}

function SaveSettings()
{ 
    theSettings.mapImage = mapImage.value;
	theSettings.updateEvery = updateEvery.value;
	theSettings.showLocations = showLocations.checked? "checked": "unchecked";

	SetSunlightMapSettings(theSettings);
}

function GetSunlightMapSettings()
{
	this.mapImage = System.Gadget.Settings.read("mapImage");
	this.updateEvery = System.Gadget.Settings.read("updateEvery");
	this.showLocations = System.Gadget.Settings.read("showLocations");
            
	if (this.mapImage == "")
	{
		this.mapImage = "simple.png";
	}
                          
	if (this.updateEvery == "")
	{
		this.updateEvery = "15";
	}

	if (this.showLocations == "")
	{
		this.showLocations = "checked";
	}
}

function SetSunlightMapSettings(settings)
{
	System.Gadget.Settings.write("mapImage", settings.mapImage);
	System.Gadget.Settings.write("updateEvery", settings.updateEvery);
	System.Gadget.Settings.write("showLocations", settings.showLocations);
}                  

function settingsClosed(event)
{
	if (event.closeAction == event.Action.commit)
	{
		loadMain(true);
	}    
}
