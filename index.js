const Discord = require("discord.js");//discord 모듈 import 
const config = require("./config.json");//설정파일 파싱 
const ytdl = require('ytdl-core');//유튜브 video데이터를 다운받는것을 도와주는 모듈 
const yts = require( 'yt-search' );//유튜브 검색을 도와주는 api 
const { joinVoiceChannel ,createAudioPlayer,createAudioResource,AudioPlayerStatus } = require('@discordjs/voice');
//join
const prefix = "!";
const queue = new Map();

const client = new Discord.Client({intents: ["GUILDS","GUILD_VOICE_STATES","GUILD_MESSAGES"]});//객체를 넘김 넘김으로써 해당 권한을 줄거임




client.on('messageCreate', (message) => {//event 리스너 등록
    // message 작성자가 봇이면 그냥 returnm
    if (message.author.bot) return;
    // message 시작이 prefix가 아니면 return
    if (!message.content.startsWith(prefix)) return;
    const serverQueue = queue.get(message.guild.id);
    const commandBody = message.content.slice(prefix.length);//preifx의 length만큼 자름 
    const args = commandBody.split(' ');//띄어쓰기 단위로 나눠서 배열로 반환
    const command = args.shift().toLowerCase();//shift 배열의 첫번째요소를 잘라서 return함 당연히 현 배열은 첫번째요소가 없음 toLowerCase로 인해 반환할때는 소문자로 반환
    console.log(`commandBody:${commandBody}\nargs:${args}\ncommand:${command}`);
    
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
    const args = message.content.slice(5);

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
    const video = (await yts(args)).videos.slice(0,1);//유튜브 검색후에 video 정보 배열 넘김 
    const songInfo = await ytdl.getInfo(video[0].url);//video url 검색 
    const song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
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
  
  function play(guild, song) {
    const player = createAudioPlayer();
    const serverQueue = queue.get(guild.id);
    serverQueue.player = player;
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
    const resource = createAudioResource(ytdl(song.url));
    
    player.play(resource);
    player.on(AudioPlayerStatus.Idle, () => {
        if(subscription)
        getNextResource(guild,serverQueue,player);
    });
    player.on('error', error => {
      console.error(`Error2: ${error.message} \nError3:${error} `);
      if(subscription)
      getNextResource(guild,serverQueue,player);
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
  function getNextResource(guild,serverQueue,player){//다음곡을 틀어주는 함수
    serverQueue.songs.shift();
    if(!serverQueue.songs[0]){
         serverQueue.connection.destroy();//voicechannel과의 연결을 끊음
        queue.delete(guild.id);//queue에서 현 voicechannel guild.id를 삭제
        
      return;
    }
    const resource = createAudioResource(ytdl(serverQueue.songs[0].url));
    player.play(resource);
  }

client.login(config.BOT_TOKEN);