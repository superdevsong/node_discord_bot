const play_dl = require('play-dl');//유튜브나 spotify 검색과 스트리밍을 도와주느 api 
const { joinVoiceChannel ,createAudioPlayer,createAudioResource,AudioPlayerStatus } = require('@discordjs/voice');

async function execute(queue,message, serverQueue) {//음악실행 함수 
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
        play(queue,message.guild, queueContruct.songs[0]);
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

  async function play(queue,guild, song) {
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
  module.exports = execute;