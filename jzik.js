	/*
		jZik javascript sampler, by r043v/dph/m2m -- noferov@gmail.com
		under creative commons 3.0 by-nc-sa license -- http://creativecommons.org/licenses/by-nc-sa/3.0/
		
		this plugin is dedicated to read audio sprites using html5 audio api
		it take only one source sound file, copy it to create some channels and play inside small part of the long source file
		support delay play and repeat, volume or play rate option, and callback on play, stop and repeat event
	*/

	function jzik(sources,samples,channels,onInit)
	{	var zik = new Object({audio:document.createElement('audio'),source:""});
		if(!zik.audio.canPlayType) return false;
		if(sources.ogg !== undefined) if(!!(zik.audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''))) zik.source="ogg";
		if(zik.source == "") if(sources.mp3 !== undefined) if(!!(zik.audio.canPlayType('audio/mpeg;').replace(/no/, ''))) zik.source="mp3";
 		if(zik.source == "") if(sources.wav !== undefined) if(!!(zik.audio.canPlayType('audio/wav; codecs="1"').replace(/no/, ''))) zik.source="wav";
 		if(zik.source == "") if(sources.aac !== undefined) if(!!(zik.audio.canPlayType('audio/mp4; codecs="mp4a.40.2"').replace(/no/, ''))) zik.source="aac";
		if(zik.source == "") return false;

		for(n in samples){ var spl = samples[n]; if(spl.end === undefined){ if(spl.size === undefined) return false; spl.end = spl.start + spl.size; } };

		zik.channelsNb = channels;
		zik.samples = samples;
		zik.channels = [];
		zik.activePlay = [];
		zik.checkTimer = false;
		
		zik.audio.src = sources[zik.source]; zik.audio.autobuffer=true; zik.audio.preload='auto'; zik.audio.loop=false; document.body.appendChild(zik.audio);
		zik.callInit = function(){ if(jzikIsFunction(onInit)) onInit.call(zik); };
		zik.channelsLoaded = 1;
		
		zik.cloneSampleLoaded = function()
		{	if(this.jzloaded || this.readyState < 4) return; this.jzloaded = true; //this.removeEventListener('canplaythrough',zik.cloneSampleLoaded,false);
			if(++zik.channelsLoaded >= zik.channelsNb) zik.callInit();
		};
		
		zik.masterSampleLoaded = function()
		{	if(this.jzloaded || this.readyState < 4) return; this.jzloaded = true; //this.removeEventListener('canplaythrough',zik.masterSampleLoaded,false);
			zik.channels[0] = new Object({isplay:false,isfree:true,audio:zik.audio});
			if(zik.channelsNb == 1) zik.callInit();
			  else
			for(var n=1; n < zik.channelsNb; n++)
			{	zik.channels[n] = new Object({isplay:false,isfree:true,audio:zik.audio.cloneNode(true)});
				var a = zik.channels[n].audio; a.jzloaded = false;
				a.addEventListener('canplaythrough',zik.cloneSampleLoaded,false);
				if(window.opera !== undefined) zik.channels[n].audio.load(); // manual load for call event in opera.
			}
		};
		
		zik.audio.jzloaded = false;
		zik.audio.addEventListener('canplaythrough',zik.masterSampleLoaded,false);
		zik.play = jzikplay; zik.check = function(){ jzikcheck.call(zik); };
		zik.audio.load(); return zik;
	};

	function jzikcheck()
	{	var zik = this;
		for(n in zik.activePlay)
		{	var chn = zik.channels[zik.activePlay[n]]; var opt = chn.opt;
			if(chn.isfree || !chn.isplay) continue;
			if(chn.startTime != 0)
			{	var ctime = new Date(); ctime = ctime.getTime();
				if(chn.startTime <= ctime) { chn.startTime=0; chn.audio.play(); if(jzikIsFunction(opt.onPlay)) opt.onPlay.call(chn); }
			} else {
				if(chn.audio.currentTime >= chn.stopOffset)
				{	chn.audio.pause();
					if(opt.repeat > 0) opt.repeat--;
					if(opt.repeat != 0)
					{	chn.audio.currentTime = chn.startOffset; chn.audio.play();
						if(jzikIsFunction(opt.onRepeat)) opt.onRepeat.call(chn);
					} else {
						if(jzikIsFunction(opt.onEnd)) opt.onEnd.call(chn);
						chn.isplay = false; zik.activePlay.splice(n,1); chn.isfree = true;
					}
				}
			}
		}
		if(zik.activePlay.length <= 0) { clearInterval(zik.checkTimer); zik.checkTimer = false; }
	};
	
	function jzikplay(sample, opts)
	{	var zik = this;
		var opt = { repeat:0,speed:1,volume:1,delay:0,updateTime:20,onPlay:false,onEnd:false,onRepeat:false }; for(i in opts) opt[i] = opts[i];
		var spl = zik.samples[sample]; if(spl === undefined) return false;
		var nchn = 0; while(nchn < zik.channelsNb && (false === zik.channels[nchn].isfree)) nchn++; if(nchn >= zik.channelsNb) return false;
		var chn = zik.channels[nchn];
		chn.isfree = false;
		chn.opt = opt;
		chn.audio.volume = opt.volume;
		chn.audio.loop = false;
		chn.audio.playbackRate = opt.speed;
		chn.startOffset = spl.start; chn.stopOffset = spl.end; if(chn.stopOffset > chn.audio.duration) chn.stopOffset = chn.audio.duration;
		chn.audio.currentTime = spl.start;
		if(opt.delay)
		{	chn.audio.pause(); // firefox autoplay fix
			var ctime = new Date(); ctime = ctime.getTime();
			chn.startTime = ctime+chn.delay;
		} else { chn.startTime = 0; chn.audio.play(); if(jzikIsFunction(opt.onPlay)) opt.onPlay.call(chn); }
		chn.isplay = true; zik.activePlay.push(nchn);
		if(zik.checkTimer === false) zik.checkTimer = setInterval(zik.check,opt.updateTime);
		return true;
	};
	
	function jzikIsFunction(f){ var getType = {}; return f && getType.toString.call(f) == '[object Function]'; }