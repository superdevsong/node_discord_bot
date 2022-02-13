const Discord = require("discord.js");//discord 모듈 import 
const config = require("./config.json");//설정파일 파싱 
const play_dl = require('play-dl');//유튜브나 spotify 검색과 스트리밍을 도와주느 api 

const { joinVoiceChannel ,createAudioPlayer,createAudioResource,AudioPlayerStatus } = require('@discordjs/voice');
//join
const prefix = "!";
const queue = new Map(); // 노래정보를 담을 컬렉션 생성 guild.id와 songinfo를 key 와 value로 넣을 것이다.

const client = new Discord.Client({intents: ["GUILDS","GUILD_VOICE_STATES","GUILD_MESSAGES"]});//객체를 넘김 넘김으로써 해당 권한을 줄거임




client.on('messageCreate', (message) => {//event 리스너 등록 messageCreate는 message가 생성되어있을때 발생하는 이벤트이다.
    // message 작성자가 봇이면 그냥 returnm
    if (message.author.bot) return;
    // message 시작이 prefix가 아니면 return
    if (!message.content.startsWith(prefix)) return;
    const serverQueue = queue.get(message.guild.id);//queue에 message.guild.id가 키로 있다면 리턴 없으면 undefined 초기에는 없을거다.
    //문서상 guild는 채널과 사용자의 독립된 모음이라고 한다. ui에서는 이것을 서버라고 한다고 한다. 디스코드 서버를 말하며 guild.id는 디스코드 서버의 id이다.
    //서버에 초대됨가 동시에 서버의 guild.id를 알수있으며 이를 이용해 맵으로 넣어놨다. 해당함수
    const commandBody = message.content.slice(prefix.length);//preifx의 length만큼 자름 
    const args = commandBody.split(' ');//띄어쓰기 단위로 나눠서 배열로 반환
    const command = args.shift().toLowerCase();//shift 배열의 첫번째요소를 잘라서 return함 당연히 현 배열은 첫번째요소가 없음 toLowerCase로 인해 반환할때는 소문자로 반환
    
    if (command === "ping") {
        message.reply(`pong!`);
    } 

    if (command ==="play") {
        execute(message, serverQueue);
        return;
    } else if (command ==="skip") {
        skip(message, serverQueue);
        return;
    } else if (command ==="stop") {
        stop(message, serverQueue);
        return;
    } else if (command ==="resume") {
        resume(message, serverQueue);
      return;
  } else {
        message.channel.send("You need to enter a valid command!");
    }
});

async function execute(message, serverQueue) {//음악실행 함수 
    let title;
    const args = message.content.slice(6);

    const voiceChannel = message.member.voice.channel;//voice channel context 
    if (!voiceChannel)
      return message.channel.send(
        "You need to be in a voice channel to play music!"// voicechannel 존재여부 
      );
    const permissions = voiceChannel.permissionsFor(message.client.user);//permission확인 
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send(
        "I need the permissions to join and speak in your voice channel!"
      );
    }
    const songURL = await play_dl.yt_validate(args);//video url이 맞는지 검증  
    let video = undefined;
    let songInfo = undefined;
    if(songURL=="search"){
      video = await play_dl.search(args, {
        limit: 1
    });//유튜브 검색후에 video 정보 배열 넘김 
      songInfo = await play_dl.video_info(video[0].url);//video url 검색 
    } else {
      songInfo = await play_dl.video_info(args);
    }
    
    const song = {
          title: songInfo.video_details.title,
          url: songInfo.video_details.url,
     };
  
    if (!serverQueue) {//처음에는 정의 되어 있지않으니 
      const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
        player: null
      };
  
      queue.set(message.guild.id, queueContruct);
  
      queueContruct.songs.push(song);
  
      try {
        var connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        queueContruct.connection = connection;
        play(message.guild, queueContruct.songs[0]);
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(song);
      return message.channel.send(`${song.title} has been added to the queue!`);
    }
  }
  
  function skip(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send(
        "You have to be in a voice channel to stop the music!"
      );
    if (!serverQueue)
      return message.channel.send("There is no song that I could skip!");
      getNextResource(message.guild,serverQueue,serverQueue.player);
  }
  
  function stop(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send(
        "You have to be in a voice channel to stop the music!"
      );
      
    if (!serverQueue)
      return message.channel.send("There is no song that I could stop!");
      
    serverQueue.player.pause();
  }
  function resume(message, serverQueue) {//다시재
    if (!message.member.voice.channel)
      return message.channel.send(
        "You have to be in a voice channel to stop the music!"
      );
      
    if (!serverQueue)
      return message.channel.send("There is no song that I could stop!");
      
    serverQueue.player.unpause();
  }
  
  async function play(guild, song) {
    const player = createAudioPlayer();
    const serverQueue = queue.get(guild.id);
    serverQueue.player = player;
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
    let stream = await play_dl.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
  });
    
    player.play(resource);
    player.on(AudioPlayerStatus.Idle, () => {
        if(subscription)
        getNextResource(guild,serverQueue,player);
    });
    player.on('error', error => {
      console.error(`Error2: ${error.message} \nError3:${error} `);
      
    });
    
    const subscription = serverQueue.connection
      .subscribe(player);
      // .on("finish", () => {
      //   serverQueue.songs.shift();
      //   play(guild, serverQueue.songs[0]);
      // })
      // .on("error", error => console.error(error));
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);

  }
  async function getNextResource(guild,serverQueue,player){//다음곡을 틀어주는 함수
    serverQueue.songs.shift();
    if(!serverQueue.songs[0]){
         serverQueue.connection.destroy();//voicechannel과의 연결을 끊음
        queue.delete(guild.id);//queue에서 현 voicechannel guild.id를 삭제
        
      return;
    }
    let stream = await play_dl.stream(serverQueue.songs[0].url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
  });
    player.play(resource);
  }

client.login(config.BOT_TOKEN);